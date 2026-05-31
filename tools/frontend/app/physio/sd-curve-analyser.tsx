import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import { PaymentGateModal } from '../../src/utils/PaymentGateModal';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Standard SD Curve pulse durations in milliseconds
const PULSE_DURATIONS = [
  0.01, 0.03, 0.05, 0.1, 0.3, 0.5, 1, 3, 5, 10, 30, 50, 100, 300, 500, 1000
];

// Sample normal curve values (mA)
const NORMAL_CURVE_SAMPLE = [
  50, 45, 40, 35, 25, 20, 15, 10, 8, 6, 5, 4.5, 4, 3.8, 3.6, 3.5
];

type TabType = 'patient' | 'sddata' | 'curve' | 'ai' | 'report';

interface PatientData {
  name: string;
  patientId: string;
  age: string;
  gender: string;
  diagnosis: string;
  muscleTested: string;
  nerve: string;
  side: string;
  date: string;
  referredBy: string;
  history: string;
}

interface SDValues {
  normal: number[];
  denervated: number[];
  partial: number[];
}

export default function SDCurveAnalyserScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('patient');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);

  // Patient data
  const [patientData, setPatientData] = useState<PatientData>({
    name: '',
    patientId: '',
    age: '',
    gender: 'Male',
    diagnosis: '',
    muscleTested: '',
    nerve: '',
    side: 'Right',
    date: new Date().toISOString().split('T')[0],
    referredBy: '',
    history: '',
  });

  // SD Curve values
  const [sdValues, setSDValues] = useState<SDValues>({
    normal: [...NORMAL_CURVE_SAMPLE],
    denervated: Array(16).fill(0),
    partial: Array(16).fill(0),
  });

  // Computed values
  const [computedValues, setComputedValues] = useState({
    rheobaseNormal: 0,
    rheobaseDenervated: 0,
    chronaxieNormal: 0,
    chronaxieDenervated: 0,
  });

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'patient', label: 'Patient', icon: 'person' },
    { id: 'sddata', label: 'SD Data', icon: 'list' },
    { id: 'curve', label: 'Curve', icon: 'analytics' },
    { id: 'ai', label: 'AI Analysis', icon: 'bulb' },
    { id: 'report', label: 'Report', icon: 'document-text' },
  ];

  const updatePatientField = (field: keyof PatientData, value: string) => {
    setPatientData(prev => ({ ...prev, [field]: value }));
  };

  const updateSDValue = (type: keyof SDValues, index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    setSDValues(prev => {
      const newValues = { ...prev };
      newValues[type] = [...prev[type]];
      newValues[type][index] = numValue;
      return newValues;
    });
  };

  // Calculate Rheobase (current at longest pulse duration - 1000ms)
  const calculateRheobase = (values: number[]) => {
    return values[values.length - 1] || 0;
  };

  // Calculate Chronaxie (pulse duration at 2x rheobase)
  const calculateChronaxie = (values: number[]) => {
    const rheobase = calculateRheobase(values);
    const targetCurrent = rheobase * 2;
    
    for (let i = 0; i < values.length; i++) {
      if (values[i] <= targetCurrent) {
        return PULSE_DURATIONS[i];
      }
    }
    return PULSE_DURATIONS[0];
  };

  const computeParameters = () => {
    const computed = {
      rheobaseNormal: calculateRheobase(sdValues.normal),
      rheobaseDenervated: calculateRheobase(sdValues.denervated),
      chronaxieNormal: calculateChronaxie(sdValues.normal),
      chronaxieDenervated: calculateChronaxie(sdValues.denervated),
    };
    setComputedValues(computed);
    return computed;
  };

  const runAIAnalysis = async () => {
    if (!patientData.name || !patientData.muscleTested) {
      Alert.alert('Missing Data', 'Please fill in patient details and muscle tested.');
      return;
    }

    setAnalyzing(true);
    const computed = computeParameters();

    try {
      const response = await fetch(`${API_URL}/api/sd-curve/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient: patientData,
          sdValues,
          computed,
          pulseDurations: PULSE_DURATIONS,
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setAiAnalysis(data.analysis);
      setActiveTab('ai');
    } catch (error) {
      console.error('AI Analysis error:', error);
      // Fallback to local analysis if API fails
      const localAnalysis = generateLocalAnalysis(computed);
      setAiAnalysis(localAnalysis);
      setActiveTab('ai');
    } finally {
      setAnalyzing(false);
    }
  };

  const generateLocalAnalysis = (computed: typeof computedValues) => {
    const { rheobaseNormal, rheobaseDenervated, chronaxieNormal, chronaxieDenervated } = computed;
    
    let nerveStatus = 'Normal innervation';
    let prognosis = 'Good';
    let reinnervation = 'Not applicable';
    
    if (chronaxieDenervated > 10) {
      nerveStatus = 'Complete denervation';
      prognosis = 'Requires extended treatment';
      reinnervation = 'No signs of reinnervation detected';
    } else if (chronaxieDenervated > 1) {
      nerveStatus = 'Partial denervation';
      prognosis = 'Moderate - improvement expected with treatment';
      reinnervation = 'Early signs of reinnervation present';
    }

    return `
**CLINICAL INTERPRETATION**

**Patient:** ${patientData.name}
**Muscle Tested:** ${patientData.muscleTested}
**Nerve:** ${patientData.nerve}
**Side:** ${patientData.side}

**COMPUTED PARAMETERS:**
• Rheobase (Normal): ${rheobaseNormal.toFixed(2)} mA
• Rheobase (Denervated): ${rheobaseDenervated.toFixed(2)} mA
• Chronaxie (Normal): ${chronaxieNormal} ms
• Chronaxie (Denervated): ${chronaxieDenervated} ms

**NERVE STATUS:** ${nerveStatus}

**CHRONAXIE SIGNIFICANCE:**
${chronaxieDenervated > 10 ? 
  'Chronaxie > 10ms indicates complete loss of nerve conduction. The muscle is responding only to long-duration pulses characteristic of denervated tissue.' :
  chronaxieDenervated > 1 ?
  'Chronaxie between 1-10ms suggests partial denervation with some intact nerve fibers. Mixed innervation pattern observed.' :
  'Chronaxie < 1ms indicates normal nerve conduction. Muscle shows healthy excitability characteristics.'}

**PROGNOSIS:** ${prognosis}

**REINNERVATION STATUS:** ${reinnervation}

**RECOMMENDED ELECTROTHERAPY PARAMETERS:**
${chronaxieDenervated > 10 ?
  `• Pulse Duration: 100-300 ms (exponential waveform)
• Frequency: 1-3 Hz (interrupted galvanic)
• Intensity: Start at ${rheobaseDenervated + 2} mA, adjust for visible contraction
• Treatment Time: 15-20 minutes
• Sessions: Daily for 4-6 weeks` :
  chronaxieDenervated > 1 ?
  `• Pulse Duration: 10-50 ms (triangular waveform)
• Frequency: 5-10 Hz
• Intensity: ${rheobaseDenervated + 1} mA threshold
• Treatment Time: 10-15 minutes
• Sessions: 3-5 times per week` :
  `• Muscle appears normally innervated
• Standard NMES parameters appropriate if strengthening needed
• Pulse Duration: 0.1-0.3 ms
• Frequency: 35-50 Hz`}

**FOLLOW-UP:**
Repeat SD curve testing in 2-4 weeks to monitor nerve recovery and adjust treatment parameters accordingly.
    `.trim();
  };

  const generatePDFReport = async () => {
    setShowPaymentModal(true);
  };

  const createAndSharePDF = async () => {
    setLoading(true);
    const computed = computeParameters();

    try {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>WBA99 SD Curve Analysis Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #1E88E5; padding-bottom: 15px; margin-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #1E88E5; }
    .subtitle { color: #666; font-size: 14px; }
    .section { margin-bottom: 20px; }
    .section-title { background: #1E88E5; color: white; padding: 8px 15px; font-size: 14px; font-weight: bold; }
    .section-content { padding: 15px; border: 1px solid #ddd; border-top: none; }
    .row { display: flex; margin-bottom: 8px; }
    .label { font-weight: bold; width: 150px; color: #333; }
    .value { flex: 1; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 11px; }
    th { background: #f5f5f5; }
    .analysis { background: #f9f9f9; padding: 15px; border-radius: 5px; white-space: pre-wrap; font-size: 12px; line-height: 1.6; }
    .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #666; }
    .qr-section { text-align: center; margin: 20px 0; padding: 15px; background: #fff3e0; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">WBA99</div>
    <div class="subtitle">Strength-Duration Curve Analysis Report</div>
    <div style="font-size: 12px; color: #888; margin-top: 5px;">Generated: ${new Date().toLocaleString()}</div>
  </div>

  <div class="section">
    <div class="section-title">PATIENT INFORMATION</div>
    <div class="section-content">
      <div class="row"><span class="label">Name:</span><span class="value">${patientData.name}</span></div>
      <div class="row"><span class="label">Patient ID:</span><span class="value">${patientData.patientId}</span></div>
      <div class="row"><span class="label">Age/Gender:</span><span class="value">${patientData.age} / ${patientData.gender}</span></div>
      <div class="row"><span class="label">Diagnosis:</span><span class="value">${patientData.diagnosis}</span></div>
      <div class="row"><span class="label">Muscle Tested:</span><span class="value">${patientData.muscleTested}</span></div>
      <div class="row"><span class="label">Nerve:</span><span class="value">${patientData.nerve}</span></div>
      <div class="row"><span class="label">Side:</span><span class="value">${patientData.side}</span></div>
      <div class="row"><span class="label">Date:</span><span class="value">${patientData.date}</span></div>
      <div class="row"><span class="label">Referred By:</span><span class="value">${patientData.referredBy}</span></div>
      <div class="row"><span class="label">History:</span><span class="value">${patientData.history}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">SD CURVE DATA (mA)</div>
    <div class="section-content">
      <table>
        <tr>
          <th>Duration (ms)</th>
          ${PULSE_DURATIONS.map(d => `<th>${d}</th>`).join('')}
        </tr>
        <tr style="background: #e8f5e9;">
          <td><strong>Normal</strong></td>
          ${sdValues.normal.map(v => `<td>${v.toFixed(1)}</td>`).join('')}
        </tr>
        <tr style="background: #ffebee;">
          <td><strong>Denervated</strong></td>
          ${sdValues.denervated.map(v => `<td>${v.toFixed(1)}</td>`).join('')}
        </tr>
        <tr style="background: #fff8e1;">
          <td><strong>Partial</strong></td>
          ${sdValues.partial.map(v => `<td>${v.toFixed(1)}</td>`).join('')}
        </tr>
      </table>
    </div>
  </div>

  <div class="section">
    <div class="section-title">COMPUTED PARAMETERS</div>
    <div class="section-content">
      <div class="row"><span class="label">Rheobase (Normal):</span><span class="value">${computed.rheobaseNormal.toFixed(2)} mA</span></div>
      <div class="row"><span class="label">Rheobase (Denervated):</span><span class="value">${computed.rheobaseDenervated.toFixed(2)} mA</span></div>
      <div class="row"><span class="label">Chronaxie (Normal):</span><span class="value">${computed.chronaxieNormal} ms</span></div>
      <div class="row"><span class="label">Chronaxie (Denervated):</span><span class="value">${computed.chronaxieDenervated} ms</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">AI CLINICAL INTERPRETATION</div>
    <div class="section-content">
      <div class="analysis">${aiAnalysis || 'AI analysis not performed. Click "Run AI Analysis" to generate interpretation.'}</div>
    </div>
  </div>

  <div class="qr-section">
    <p><strong>Scan QR Code for Verification</strong></p>
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=WBA99-SD-${patientData.patientId}-${Date.now()}" width="100" height="100" />
    <p style="font-size: 10px; margin-top: 5px;">Report ID: WBA99-SD-${patientData.patientId}-${Date.now()}</p>
  </div>

  <div class="footer">
    <p>WBA99 MSK Analysis Platform | Professional Electrotherapy Assessment</p>
    <p>This report was generated using WBA99 SD Curve AI Analyser</p>
    <p>Physiotherapist: ${currentUser?.name || 'WBA99 System'}</p>
  </div>
</body>
</html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share SD Curve Report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Success', 'PDF generated successfully!');
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert('Error', 'Failed to generate PDF report');
    } finally {
      setLoading(false);
    }
  };

  const renderPatientTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Patient Information</Text>
        
        <View style={styles.formRow}>
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={patientData.name}
              onChangeText={(v) => updatePatientField('name', v)}
              placeholder="Enter patient name"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formField, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.fieldLabel}>Patient ID</Text>
            <TextInput
              style={styles.input}
              value={patientData.patientId}
              onChangeText={(v) => updatePatientField('patientId', v)}
              placeholder="ID"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
          <View style={[styles.formField, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Age</Text>
            <TextInput
              style={styles.input}
              value={patientData.age}
              onChangeText={(v) => updatePatientField('age', v)}
              placeholder="Age"
              keyboardType="numeric"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.buttonGroup}>
              {['Male', 'Female', 'Other'].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderBtn, patientData.gender === g && styles.genderBtnActive]}
                  onPress={() => updatePatientField('gender', g)}
                >
                  <Text style={[styles.genderBtnText, patientData.gender === g && styles.genderBtnTextActive]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Diagnosis</Text>
            <TextInput
              style={styles.input}
              value={patientData.diagnosis}
              onChangeText={(v) => updatePatientField('diagnosis', v)}
              placeholder="Enter diagnosis"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formField, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.fieldLabel}>Muscle Tested *</Text>
            <TextInput
              style={styles.input}
              value={patientData.muscleTested}
              onChangeText={(v) => updatePatientField('muscleTested', v)}
              placeholder="e.g., Tibialis Anterior"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
          <View style={[styles.formField, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Nerve</Text>
            <TextInput
              style={styles.input}
              value={patientData.nerve}
              onChangeText={(v) => updatePatientField('nerve', v)}
              placeholder="e.g., Peroneal"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formField, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.fieldLabel}>Side</Text>
            <View style={styles.buttonGroup}>
              {['Left', 'Right', 'Bilateral'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.genderBtn, patientData.side === s && styles.genderBtnActive]}
                  onPress={() => updatePatientField('side', s)}
                >
                  <Text style={[styles.genderBtnText, patientData.side === s && styles.genderBtnTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={[styles.formField, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TextInput
              style={styles.input}
              value={patientData.date}
              onChangeText={(v) => updatePatientField('date', v)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Referred By</Text>
            <TextInput
              style={styles.input}
              value={patientData.referredBy}
              onChangeText={(v) => updatePatientField('referredBy', v)}
              placeholder="Referring physician"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Clinical History</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={patientData.history}
              onChangeText={(v) => updatePatientField('history', v)}
              placeholder="Enter relevant clinical history..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* OK Button to proceed to SD Data tab */}
        <TouchableOpacity
          style={styles.okButton}
          onPress={() => setActiveTab('sddata')}
        >
          <Text style={styles.okButtonText}>OK - Proceed to SD Data</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderSDDataTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.verticalTableContainer}>
        <Text style={styles.sectionTitle}>SD Curve Data Entry (mA)</Text>
        <Text style={styles.tableNote}>Enter current values at each pulse duration. Normal curve is pre-filled as reference.</Text>
        
        {/* Vertical Card-based Layout */}
        {PULSE_DURATIONS.map((duration, i) => (
          <View key={i} style={styles.durationCard}>
            {/* Duration Header */}
            <View style={styles.durationHeader}>
              <Text style={styles.durationText}>{duration < 1 ? duration : duration >= 1000 ? '1000' : duration}</Text>
              <Text style={styles.durationUnit}>ms</Text>
            </View>
            
            {/* Values Row */}
            <View style={styles.valuesRow}>
              {/* Normal */}
              <View style={styles.valueColumn}>
                <Text style={[styles.valueLabel, { color: '#4CAF50' }]}>Normal</Text>
                <TextInput
                  style={[styles.valueInput, { borderColor: '#4CAF50' }]}
                  value={sdValues.normal[i].toString()}
                  onChangeText={(val) => updateSDValue('normal', i, val)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              
              {/* Denervated */}
              <View style={styles.valueColumn}>
                <Text style={[styles.valueLabel, { color: '#F44336' }]}>Denervated</Text>
                <TextInput
                  style={[styles.valueInput, { borderColor: '#F44336' }]}
                  value={sdValues.denervated[i] > 0 ? sdValues.denervated[i].toString() : ''}
                  onChangeText={(val) => updateSDValue('denervated', i, val)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              
              {/* Partial */}
              <View style={styles.valueColumn}>
                <Text style={[styles.valueLabel, { color: '#FFC107' }]}>Partial</Text>
                <TextInput
                  style={[styles.valueInput, { borderColor: '#FFC107' }]}
                  value={sdValues.partial[i] > 0 ? sdValues.partial[i].toString() : ''}
                  onChangeText={(val) => updateSDValue('partial', i, val)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.computeBtn} onPress={computeParameters}>
          <MaterialCommunityIcons name="calculator" size={20} color="#fff" />
          <Text style={styles.computeBtnText}>Compute Parameters</Text>
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );

  const renderCurveTab = () => {
    // Calculate values locally without triggering state updates
    const computed = {
      rheobaseNormal: calculateRheobase(sdValues.normal),
      rheobaseDenervated: calculateRheobase(sdValues.denervated),
      chronaxieNormal: calculateChronaxie(sdValues.normal),
      chronaxieDenervated: calculateChronaxie(sdValues.denervated),
    };
    
    // Generate SVG curve points
    const maxCurrent = Math.max(
      ...sdValues.normal,
      ...sdValues.denervated.filter(v => v > 0),
      ...sdValues.partial.filter(v => v > 0),
      60
    );

    const graphWidth = SCREEN_WIDTH - 60;
    const graphHeight = 300;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const plotWidth = graphWidth - padding.left - padding.right;
    const plotHeight = graphHeight - padding.top - padding.bottom;

    const xScale = (index: number) => padding.left + (index / (PULSE_DURATIONS.length - 1)) * plotWidth;
    const yScale = (value: number) => padding.top + plotHeight - (value / maxCurrent) * plotHeight;

    const createPath = (values: number[]) => {
      const validPoints = values.map((v, i) => ({ x: xScale(i), y: yScale(v), valid: v > 0 }));
      const filtered = validPoints.filter(p => p.valid || values === sdValues.normal);
      if (filtered.length < 2) return '';
      
      return filtered.map((p, i) => 
        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
      ).join(' ');
    };

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Strength-Duration Curve</Text>
        
        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Normal</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.legendText}>Denervated</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FFC107' }]} />
            <Text style={styles.legendText}>Partial</Text>
          </View>
        </View>

        {/* SVG Graph */}
        <View style={styles.graphContainer}>
          <View style={{ width: graphWidth, height: graphHeight }}>
            {/* Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <Text
                key={i}
                style={[styles.axisLabel, {
                  position: 'absolute',
                  left: 5,
                  top: padding.top + plotHeight * (1 - ratio) - 8,
                }]}
              >
                {(maxCurrent * ratio).toFixed(0)}
              </Text>
            ))}
            
            {/* X-axis labels */}
            {[0, 4, 8, 12, 15].map((i) => (
              <Text
                key={i}
                style={[styles.axisLabel, {
                  position: 'absolute',
                  left: xScale(i) - 15,
                  top: graphHeight - 15,
                }]}
              >
                {PULSE_DURATIONS[i]}
              </Text>
            ))}

            {/* Grid lines */}
            {[0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: padding.left,
                  top: padding.top + plotHeight * (1 - ratio),
                  width: plotWidth,
                  height: 1,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                }}
              />
            ))}

            {/* Curve visualization using Views */}
            {sdValues.normal.map((v, i) => i < sdValues.normal.length - 1 && (
              <View
                key={`normal-${i}`}
                style={{
                  position: 'absolute',
                  left: xScale(i),
                  top: Math.min(yScale(v), yScale(sdValues.normal[i + 1])),
                  width: Math.sqrt(
                    Math.pow(xScale(i + 1) - xScale(i), 2) +
                    Math.pow(yScale(sdValues.normal[i + 1]) - yScale(v), 2)
                  ),
                  height: 3,
                  backgroundColor: '#4CAF50',
                  transform: [{
                    rotate: `${Math.atan2(
                      yScale(sdValues.normal[i + 1]) - yScale(v),
                      xScale(i + 1) - xScale(i)
                    ) * 180 / Math.PI}deg`
                  }],
                  transformOrigin: 'left center',
                }}
              />
            ))}

            {/* Denervated curve */}
            {sdValues.denervated.map((v, i) => v > 0 && i < sdValues.denervated.length - 1 && sdValues.denervated[i + 1] > 0 && (
              <View
                key={`denerv-${i}`}
                style={{
                  position: 'absolute',
                  left: xScale(i),
                  top: Math.min(yScale(v), yScale(sdValues.denervated[i + 1])),
                  width: Math.sqrt(
                    Math.pow(xScale(i + 1) - xScale(i), 2) +
                    Math.pow(yScale(sdValues.denervated[i + 1]) - yScale(v), 2)
                  ),
                  height: 3,
                  backgroundColor: '#F44336',
                  transform: [{
                    rotate: `${Math.atan2(
                      yScale(sdValues.denervated[i + 1]) - yScale(v),
                      xScale(i + 1) - xScale(i)
                    ) * 180 / Math.PI}deg`
                  }],
                  transformOrigin: 'left center',
                }}
              />
            ))}

            {/* Data points */}
            {sdValues.normal.map((v, i) => (
              <View
                key={`dot-n-${i}`}
                style={{
                  position: 'absolute',
                  left: xScale(i) - 4,
                  top: yScale(v) - 4,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#4CAF50',
                }}
              />
            ))}

            {sdValues.denervated.map((v, i) => v > 0 && (
              <View
                key={`dot-d-${i}`}
                style={{
                  position: 'absolute',
                  left: xScale(i) - 4,
                  top: yScale(v) - 4,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#F44336',
                }}
              />
            ))}

            {/* Axis titles */}
            <Text style={[styles.axisTitle, { position: 'absolute', left: graphWidth / 2 - 40, bottom: 0 }]}>
              Duration (ms)
            </Text>
          </View>
        </View>

        {/* Computed Parameters */}
        <View style={styles.parametersCard}>
          <Text style={styles.parametersTitle}>Computed Parameters</Text>
          <View style={styles.paramRow}>
            <View style={styles.paramItem}>
              <Text style={styles.paramLabel}>Rheobase (Normal)</Text>
              <Text style={[styles.paramValue, { color: '#4CAF50' }]}>{computed.rheobaseNormal.toFixed(2)} mA</Text>
            </View>
            <View style={styles.paramItem}>
              <Text style={styles.paramLabel}>Rheobase (Denervated)</Text>
              <Text style={[styles.paramValue, { color: '#F44336' }]}>{computed.rheobaseDenervated.toFixed(2)} mA</Text>
            </View>
          </View>
          <View style={styles.paramRow}>
            <View style={styles.paramItem}>
              <Text style={styles.paramLabel}>Chronaxie (Normal)</Text>
              <Text style={[styles.paramValue, { color: '#4CAF50' }]}>{computed.chronaxieNormal} ms</Text>
            </View>
            <View style={styles.paramItem}>
              <Text style={styles.paramLabel}>Chronaxie (Denervated)</Text>
              <Text style={[styles.paramValue, { color: '#F44336' }]}>{computed.chronaxieDenervated} ms</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderAITab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.aiHeader}>
        <MaterialCommunityIcons name="robot" size={40} color={theme.colors.accent} />
        <Text style={styles.aiTitle}>AI Clinical Analysis</Text>
        <Text style={styles.aiSubtitle}>Powered by Claude AI</Text>
      </View>

      <TouchableOpacity
        style={[styles.analyzeBtn, analyzing && styles.analyzeBtnDisabled]}
        onPress={runAIAnalysis}
        disabled={analyzing}
      >
        {analyzing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MaterialCommunityIcons name="brain" size={24} color="#fff" />
            <Text style={styles.analyzeBtnText}>Run AI Analysis</Text>
          </>
        )}
      </TouchableOpacity>

      {aiAnalysis ? (
        <View style={styles.analysisContainer}>
          <Text style={styles.analysisText}>{aiAnalysis}</Text>
        </View>
      ) : (
        <View style={styles.noAnalysis}>
          <MaterialCommunityIcons name="file-document-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.noAnalysisText}>
            Click "Run AI Analysis" to generate a comprehensive clinical interpretation based on the SD curve data.
          </Text>
        </View>
      )}
    </ScrollView>
  );

  const renderReportTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.reportPreview}>
        <View style={styles.reportHeader}>
          <Text style={styles.reportLogo}>WBA99</Text>
          <Text style={styles.reportTitle}>SD Curve Analysis Report</Text>
        </View>

        <View style={styles.reportSection}>
          <Text style={styles.reportSectionTitle}>Patient Details</Text>
          <Text style={styles.reportText}>Name: {patientData.name || 'Not entered'}</Text>
          <Text style={styles.reportText}>Muscle: {patientData.muscleTested || 'Not entered'}</Text>
          <Text style={styles.reportText}>Nerve: {patientData.nerve || 'Not entered'}</Text>
          <Text style={styles.reportText}>Date: {patientData.date}</Text>
        </View>

        <View style={styles.reportSection}>
          <Text style={styles.reportSectionTitle}>Computed Parameters</Text>
          <Text style={styles.reportText}>Rheobase (N): {computedValues.rheobaseNormal.toFixed(2)} mA</Text>
          <Text style={styles.reportText}>Rheobase (D): {computedValues.rheobaseDenervated.toFixed(2)} mA</Text>
          <Text style={styles.reportText}>Chronaxie (N): {computedValues.chronaxieNormal} ms</Text>
          <Text style={styles.reportText}>Chronaxie (D): {computedValues.chronaxieDenervated} ms</Text>
        </View>

        {aiAnalysis && (
          <View style={styles.reportSection}>
            <Text style={styles.reportSectionTitle}>AI Interpretation</Text>
            <Text style={styles.reportText} numberOfLines={8}>{aiAnalysis.substring(0, 500)}...</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.generatePdfBtn}
        onPress={generatePDFReport}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="download" size={24} color="#fff" />
            <Text style={styles.generatePdfBtnText}>Generate & Share PDF Report</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.paymentNote}>
        * PDF generation requires payment confirmation
      </Text>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SD Curve AI Analyser</Text>
        <TouchableOpacity onPress={runAIAnalysis}>
          <MaterialCommunityIcons name="brain" size={24} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.id ? theme.colors.accent : theme.colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'patient' && renderPatientTab()}
      {activeTab === 'sddata' && renderSDDataTab()}
      {activeTab === 'curve' && renderCurveTab()}
      {activeTab === 'ai' && renderAITab()}
      {activeTab === 'report' && renderReportTab()}

      {/* Payment Modal */}
      <PaymentGateModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentConfirmed={createAndSharePDF}
        reportType="report"
        title="SD Curve Analysis Report"
        patientName={patientData.name}
        reportName="SD Curve Analysis Report"
        analysisData={{
          muscle: patientData.muscleTested,
          nerve: patientData.nerve,
          chronaxie: computedValues.chronaxieDenervated,
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    gap: 2,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.accent,
  },
  tabText: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  tabTextActive: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  formSection: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  formRow: {
    marginBottom: theme.spacing.md,
  },
  formField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  genderBtnActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  genderBtnText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  genderBtnTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  tableContainer: {
    padding: theme.spacing.sm,
  },
  tableNote: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  table: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primaryLight,
  },
  tableDataRow: {
    flexDirection: 'row',
  },
  tableCell: {
    padding: theme.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: theme.colors.cardBorder,
  },
  headerCell: {
    backgroundColor: theme.colors.primaryLight,
  },
  headerText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  cellLabel: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  inputCell: {
    padding: 2,
  },
  tableInput: {
    width: '100%',
    height: 30,
    textAlign: 'center',
    color: theme.colors.textPrimary,
    fontSize: 11,
  },
  computeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  computeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: theme.fontSize.md,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  graphContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  axisLabel: {
    fontSize: 9,
    color: theme.colors.textMuted,
  },
  axisTitle: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  parametersCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  parametersTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  paramRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  paramItem: {
    flex: 1,
    alignItems: 'center',
  },
  paramLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  paramValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  aiHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  aiTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
  },
  aiSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C4DFF',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  analyzeBtnDisabled: {
    opacity: 0.6,
  },
  analyzeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: theme.fontSize.md,
  },
  analysisContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  analysisText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  noAnalysis: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
  },
  noAnalysisText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  reportPreview: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  reportHeader: {
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#1E88E5',
    paddingBottom: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  reportLogo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E88E5',
  },
  reportTitle: {
    fontSize: theme.fontSize.sm,
    color: '#666',
  },
  reportSection: {
    marginBottom: theme.spacing.md,
  },
  reportSectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: theme.spacing.xs,
  },
  reportText: {
    fontSize: theme.fontSize.xs,
    color: '#666',
    marginBottom: 2,
  },
  generatePdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E88E5',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  generatePdfBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: theme.fontSize.md,
  },
  paymentNote: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  okButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadius.lg,
    marginTop: 20,
    marginBottom: 30,
    gap: 10,
  },
  okButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // New vertical layout styles for SD Data entry
  verticalTableContainer: {
    paddingHorizontal: 12,
  },
  durationCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  durationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  durationText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.accent,
  },
  durationUnit: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  valuesRow: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
  },
  valueColumn: {
    flex: 1,
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueInput: {
    width: '100%',
    height: 44,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderRadius: 8,
    textAlign: 'center',
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
