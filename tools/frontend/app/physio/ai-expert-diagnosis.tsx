import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';

interface DiagnosisResult {
  possibleDiagnoses: {
    condition: string;
    confidence: string;
    description: string;
  }[];
  recommendedTreatment: {
    electrotherapy: string[];
    thermalTherapy: string[];
    rehabilitation: string[];
    taping: string[];
    nutrition: string[];
    supplements: string[];
  };
  redFlags: string[];
  followUp: string;
}

export default function AIExpertDiagnosis() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  // Patient information
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<'male' | 'female' | 'other'>('male');
  
  // Clinical findings
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [duration, setDuration] = useState('');
  const [painLocation, setPainLocation] = useState('');
  const [painIntensity, setPainIntensity] = useState('5');
  const [aggravatingFactors, setAggravatingFactors] = useState('');
  const [relievingFactors, setRelievingFactors] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [previousTreatment, setPreviousTreatment] = useState('');
  
  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'input' | 'result'>('input');

  const generateDiagnosis = async () => {
    if (!chiefComplaint || !symptoms || !painLocation) {
      Alert.alert('Missing Information', 'Please fill in Chief Complaint, Symptoms, and Pain Location at minimum.');
      return;
    }

    setAnalyzing(true);
    
    try {
      const response = await api.post('/ai/expert-diagnosis', {
        patient_name: patientName || 'Unknown',
        patient_age: patientAge,
        patient_gender: patientGender,
        chief_complaint: chiefComplaint,
        symptoms: symptoms,
        duration: duration,
        pain_location: painLocation,
        pain_intensity: painIntensity,
        aggravating_factors: aggravatingFactors,
        relieving_factors: relievingFactors,
        medical_history: medicalHistory,
        previous_treatment: previousTreatment,
      });
      
      setResult(response.data);
      setActiveTab('result');
    } catch (error) {
      console.error('AI Diagnosis error:', error);
      Alert.alert('Error', 'Failed to generate diagnosis. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const generateMockDiagnosis = (): DiagnosisResult => {
    // Generate intelligent mock diagnosis based on symptoms
    const lowerSymptoms = symptoms.toLowerCase();
    const lowerLocation = painLocation.toLowerCase();
    
    let diagnoses = [];
    let treatments: DiagnosisResult['recommendedTreatment'] = {
      electrotherapy: [],
      thermalTherapy: [],
      rehabilitation: [],
      taping: [],
      nutrition: [],
      supplements: [],
    };
    let redFlags: string[] = [];

    // Nerve-related symptoms
    if (lowerSymptoms.includes('tingling') || lowerSymptoms.includes('numbness') || lowerSymptoms.includes('radiating')) {
      diagnoses.push({
        condition: 'Peripheral Neuropathy / Nerve Compression',
        confidence: 'High',
        description: 'Symptoms suggest possible nerve involvement. Tingling and numbness indicate sensory nerve dysfunction.'
      });
      treatments.supplements.push('Vitamin B12 (1000-2000mcg daily) - Essential for nerve health');
      treatments.supplements.push('Alpha Lipoic Acid (600mg) - Neuroprotective');
      treatments.supplements.push('Methylcobalamin - Active form of B12');
      treatments.electrotherapy.push('TENS (Transcutaneous Electrical Nerve Stimulation) - Pain modulation');
      treatments.electrotherapy.push('Interferential Therapy (IFT) - Deep tissue stimulation');
    }

    // Back pain
    if (lowerLocation.includes('back') || lowerLocation.includes('lumbar') || lowerLocation.includes('spine')) {
      diagnoses.push({
        condition: 'Mechanical Low Back Pain / Disc Pathology',
        confidence: 'Moderate-High',
        description: 'Lumbar region involvement suggests mechanical dysfunction or possible disc involvement.'
      });
      treatments.electrotherapy.push('Ultrasound Therapy (1MHz, 1.5W/cm²) - Deep heating');
      treatments.electrotherapy.push('SWD (Short Wave Diathermy) - Deep tissue heating');
      treatments.thermalTherapy.push('Hot pack application (15-20 mins) - Muscle relaxation');
      treatments.taping.push('Kinesiology Tape - Lumbar support, decompression pattern');
      treatments.taping.push('McConnell Taping - Postural correction');
      treatments.rehabilitation.push('Core stabilization exercises');
      treatments.rehabilitation.push('McKenzie Protocol - Extension exercises');
      treatments.rehabilitation.push('Neural mobilization - Sciatic nerve glides');
      redFlags.push('Monitor for saddle anesthesia or bowel/bladder dysfunction');
    }

    // Shoulder pain
    if (lowerLocation.includes('shoulder')) {
      diagnoses.push({
        condition: 'Rotator Cuff Tendinopathy / Impingement Syndrome',
        confidence: 'Moderate',
        description: 'Shoulder symptoms may indicate rotator cuff involvement or subacromial impingement.'
      });
      treatments.electrotherapy.push('LASER Therapy (Class 3B) - Tissue healing');
      treatments.electrotherapy.push('Ultrasound (3MHz, pulsed) - Superficial heating');
      treatments.thermalTherapy.push('Ice application (acute phase) - 10-15 mins');
      treatments.taping.push('Rotator Cuff Support Tape - Facilitation pattern');
      treatments.rehabilitation.push('Pendulum exercises');
      treatments.rehabilitation.push('Rotator cuff strengthening (SITS muscles)');
      treatments.rehabilitation.push('Scapular stabilization exercises');
    }

    // Knee pain
    if (lowerLocation.includes('knee')) {
      diagnoses.push({
        condition: 'Patellofemoral Pain Syndrome / Knee Osteoarthritis',
        confidence: 'Moderate',
        description: 'Knee symptoms may indicate patellofemoral dysfunction or degenerative changes.'
      });
      treatments.electrotherapy.push('IFT (Interferential) - Pain relief');
      treatments.electrotherapy.push('NMES (Neuromuscular Electrical Stimulation) - Quad strengthening');
      treatments.thermalTherapy.push('Contrast bath therapy - Improve circulation');
      treatments.taping.push('McConnell Patellar Taping - Patellar tracking');
      treatments.rehabilitation.push('VMO (Vastus Medialis) strengthening');
      treatments.rehabilitation.push('Hip abductor strengthening');
      treatments.supplements.push('Glucosamine Sulfate (1500mg) - Joint health');
      treatments.supplements.push('Omega-3 Fatty Acids - Anti-inflammatory');
    }

    // Muscle pain/strain
    if (lowerSymptoms.includes('strain') || lowerSymptoms.includes('spasm') || lowerSymptoms.includes('stiff')) {
      diagnoses.push({
        condition: 'Muscle Strain / Myofascial Pain Syndrome',
        confidence: 'Moderate-High',
        description: 'Muscular symptoms suggest possible strain or trigger point involvement.'
      });
      treatments.thermalTherapy.push('Hot pack (chronic) / Cold pack (acute) - Based on stage');
      treatments.electrotherapy.push('EMS (Electrical Muscle Stimulation) - Muscle re-education');
      treatments.rehabilitation.push('Stretching program - Hold 30 seconds');
      treatments.rehabilitation.push('Trigger point release');
      treatments.supplements.push('Magnesium (400-500mg) - Muscle relaxation');
      treatments.supplements.push('Protein supplementation (Protinex/Whey) - Muscle repair');
      treatments.nutrition.push('Electrolyte replacement - ORS/Sports drinks');
    }

    // Default treatments if no specific condition matched
    if (diagnoses.length === 0) {
      diagnoses.push({
        condition: 'Musculoskeletal Pain - Unspecified',
        confidence: 'Low',
        description: 'Further assessment needed. Consider imaging studies if symptoms persist.'
      });
    }

    // Add general recommendations
    treatments.nutrition.push('Anti-inflammatory diet - Reduce processed foods');
    treatments.nutrition.push('Adequate hydration - 2-3L water daily');
    treatments.nutrition.push('Protein intake - 1.2-1.5g/kg body weight');
    
    if (treatments.supplements.length === 0) {
      treatments.supplements.push('Vitamin D3 (1000-2000 IU) - Musculoskeletal health');
      treatments.supplements.push('Calcium (500-1000mg) - Bone health');
    }

    return {
      possibleDiagnoses: diagnoses,
      recommendedTreatment: treatments,
      redFlags: redFlags.length > 0 ? redFlags : ['No immediate red flags identified'],
      followUp: 'Re-evaluate in 2-4 weeks. If no improvement, consider referral for imaging or specialist consultation.'
    };
  };

  const renderInputForm = () => (
    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
      {/* Patient Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Patient Information</Text>
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={patientName}
              onChangeText={setPatientName}
              placeholder="Patient name"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              value={patientAge}
              onChangeText={setPatientAge}
              placeholder="Age"
              keyboardType="numeric"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        </View>
        <View style={styles.genderRow}>
          {['male', 'female', 'other'].map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.genderButton, patientGender === g && styles.genderButtonActive]}
              onPress={() => setPatientGender(g as any)}
            >
              <Text style={[styles.genderText, patientGender === g && styles.genderTextActive]}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Chief Complaint */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Chief Complaint *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={chiefComplaint}
          onChangeText={setChiefComplaint}
          placeholder="Primary reason for visit (e.g., Lower back pain for 2 weeks)"
          placeholderTextColor={theme.colors.textMuted}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Signs & Symptoms */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Signs & Symptoms *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={symptoms}
          onChangeText={setSymptoms}
          placeholder="Describe symptoms: pain, tingling, numbness, stiffness, weakness, swelling, radiating pain, etc."
          placeholderTextColor={theme.colors.textMuted}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Pain Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Pain Details *</Text>
        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          value={painLocation}
          onChangeText={setPainLocation}
          placeholder="e.g., Lower back, right shoulder, left knee"
          placeholderTextColor={theme.colors.textMuted}
        />
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Duration</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="e.g., 2 weeks"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Pain Intensity (0-10)</Text>
            <TextInput
              style={styles.input}
              value={painIntensity}
              onChangeText={setPainIntensity}
              placeholder="0-10"
              keyboardType="numeric"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        </View>
      </View>

      {/* Aggravating & Relieving Factors */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Modifying Factors</Text>
        <Text style={styles.label}>Aggravating Factors</Text>
        <TextInput
          style={styles.input}
          value={aggravatingFactors}
          onChangeText={setAggravatingFactors}
          placeholder="What makes it worse? (e.g., bending, sitting, walking)"
          placeholderTextColor={theme.colors.textMuted}
        />
        <Text style={styles.label}>Relieving Factors</Text>
        <TextInput
          style={styles.input}
          value={relievingFactors}
          onChangeText={setRelievingFactors}
          placeholder="What makes it better? (e.g., rest, heat, medication)"
          placeholderTextColor={theme.colors.textMuted}
        />
      </View>

      {/* Medical History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📜 History</Text>
        <Text style={styles.label}>Past Medical History</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={medicalHistory}
          onChangeText={setMedicalHistory}
          placeholder="Diabetes, hypertension, previous surgeries, injuries, etc."
          placeholderTextColor={theme.colors.textMuted}
          multiline
          numberOfLines={3}
        />
        <Text style={styles.label}>Previous Treatment</Text>
        <TextInput
          style={styles.input}
          value={previousTreatment}
          onChangeText={setPreviousTreatment}
          placeholder="Any previous treatment for this condition?"
          placeholderTextColor={theme.colors.textMuted}
        />
      </View>

      {/* Analyze Button */}
      <TouchableOpacity
        style={[styles.analyzeButton, analyzing && styles.analyzeButtonDisabled]}
        onPress={generateDiagnosis}
        disabled={analyzing}
      >
        {analyzing ? (
          <>
            <ActivityIndicator color={theme.colors.textPrimary} />
            <Text style={styles.analyzeButtonText}>AI Analyzing...</Text>
          </>
        ) : (
          <>
            <MaterialCommunityIcons name="brain" size={24} color={theme.colors.textPrimary} />
            <Text style={styles.analyzeButtonText}>Generate AI Diagnosis</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderResults = () => {
    if (!result) return null;

    return (
      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        {/* Differential Diagnosis */}
        <View style={styles.resultSection}>
          <Text style={styles.resultSectionTitle}>🔍 Differential Diagnosis</Text>
          {result.possibleDiagnoses.map((diagnosis, index) => (
            <View key={index} style={styles.diagnosisCard}>
              <View style={styles.diagnosisHeader}>
                <Text style={styles.diagnosisName}>{diagnosis.condition}</Text>
                <View style={[styles.confidenceBadge, 
                  { backgroundColor: diagnosis.confidence.includes('High') ? theme.colors.success : theme.colors.warning }
                ]}>
                  <Text style={styles.confidenceText}>{diagnosis.confidence}</Text>
                </View>
              </View>
              <Text style={styles.diagnosisDesc}>{diagnosis.description}</Text>
            </View>
          ))}
        </View>

        {/* Red Flags */}
        <View style={styles.resultSection}>
          <Text style={styles.resultSectionTitle}>🚨 Red Flags</Text>
          <View style={styles.redFlagsCard}>
            {result.redFlags.map((flag, index) => (
              <View key={index} style={styles.redFlagItem}>
                <Ionicons name="warning" size={16} color={theme.colors.error} />
                <Text style={styles.redFlagText}>{flag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Treatment Plan */}
        <View style={styles.resultSection}>
          <Text style={styles.resultSectionTitle}>💊 Treatment Recommendations</Text>

          {/* Electrotherapy */}
          {result.recommendedTreatment.electrotherapy.length > 0 && (
            <View style={styles.treatmentCard}>
              <View style={styles.treatmentHeader}>
                <MaterialCommunityIcons name="flash" size={20} color={theme.colors.warning} />
                <Text style={styles.treatmentTitle}>Electrotherapy</Text>
              </View>
              {result.recommendedTreatment.electrotherapy.map((item, i) => (
                <Text key={i} style={styles.treatmentItem}>• {item}</Text>
              ))}
            </View>
          )}

          {/* Thermal Therapy */}
          {result.recommendedTreatment.thermalTherapy.length > 0 && (
            <View style={styles.treatmentCard}>
              <View style={styles.treatmentHeader}>
                <MaterialCommunityIcons name="thermometer" size={20} color={theme.colors.error} />
                <Text style={styles.treatmentTitle}>Hot/Cold Therapy</Text>
              </View>
              {result.recommendedTreatment.thermalTherapy.map((item, i) => (
                <Text key={i} style={styles.treatmentItem}>• {item}</Text>
              ))}
            </View>
          )}

          {/* Rehabilitation */}
          {result.recommendedTreatment.rehabilitation.length > 0 && (
            <View style={styles.treatmentCard}>
              <View style={styles.treatmentHeader}>
                <MaterialCommunityIcons name="human-handsup" size={20} color={theme.colors.success} />
                <Text style={styles.treatmentTitle}>Rehabilitation Exercises</Text>
              </View>
              {result.recommendedTreatment.rehabilitation.map((item, i) => (
                <Text key={i} style={styles.treatmentItem}>• {item}</Text>
              ))}
            </View>
          )}

          {/* Taping */}
          {result.recommendedTreatment.taping.length > 0 && (
            <View style={styles.treatmentCard}>
              <View style={styles.treatmentHeader}>
                <MaterialCommunityIcons name="bandage" size={20} color={theme.colors.accent} />
                <Text style={styles.treatmentTitle}>Taping Techniques</Text>
              </View>
              {result.recommendedTreatment.taping.map((item, i) => (
                <Text key={i} style={styles.treatmentItem}>• {item}</Text>
              ))}
            </View>
          )}

          {/* Nutrition */}
          {result.recommendedTreatment.nutrition.length > 0 && (
            <View style={styles.treatmentCard}>
              <View style={styles.treatmentHeader}>
                <MaterialCommunityIcons name="food-apple" size={20} color={theme.colors.success} />
                <Text style={styles.treatmentTitle}>Nutrition & Hydration</Text>
              </View>
              {result.recommendedTreatment.nutrition.map((item, i) => (
                <Text key={i} style={styles.treatmentItem}>• {item}</Text>
              ))}
            </View>
          )}

          {/* Supplements */}
          {result.recommendedTreatment.supplements.length > 0 && (
            <View style={styles.treatmentCard}>
              <View style={styles.treatmentHeader}>
                <MaterialCommunityIcons name="pill" size={20} color="#9C27B0" />
                <Text style={styles.treatmentTitle}>Supplements & Micronutrients</Text>
              </View>
              {result.recommendedTreatment.supplements.map((item, i) => (
                <Text key={i} style={styles.treatmentItem}>• {item}</Text>
              ))}
            </View>
          )}
        </View>

        {/* Follow Up */}
        <View style={styles.resultSection}>
          <Text style={styles.resultSectionTitle}>📅 Follow Up</Text>
          <View style={styles.followUpCard}>
            <Text style={styles.followUpText}>{result.followUp}</Text>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Ionicons name="information-circle" size={20} color={theme.colors.warning} />
          <Text style={styles.disclaimerText}>
            This AI-generated diagnosis is for reference only. Always use clinical judgment and consider further investigations before finalizing treatment.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.newAssessmentButton}
          onPress={() => {
            setResult(null);
            setActiveTab('input');
          }}
        >
          <Ionicons name="refresh" size={20} color={theme.colors.textPrimary} />
          <Text style={styles.newAssessmentText}>New Assessment</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <MaterialCommunityIcons name="brain" size={28} color={theme.colors.accent} />
            <Text style={styles.headerTitle}>AI Expert Diagnosis</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'input' && styles.tabActive]}
            onPress={() => setActiveTab('input')}
          >
            <Ionicons name="clipboard" size={18} color={activeTab === 'input' ? theme.colors.accent : theme.colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'input' && styles.tabTextActive]}>Patient Input</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'result' && styles.tabActive]}
            onPress={() => result && setActiveTab('result')}
            disabled={!result}
          >
            <Ionicons name="medical" size={18} color={activeTab === 'result' ? theme.colors.accent : theme.colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'result' && styles.tabTextActive]}>Diagnosis</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'input' ? renderInputForm() : renderResults()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder },
  backButton: { padding: theme.spacing.xs },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  headerTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  
  tabContainer: { flexDirection: 'row', padding: theme.spacing.sm, gap: theme.spacing.sm },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.card },
  tabActive: { backgroundColor: theme.colors.accent + '20', borderWidth: 1, borderColor: theme.colors.accent },
  tabText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  tabTextActive: { color: theme.colors.accent, fontWeight: theme.fontWeight.bold },
  
  formContainer: { flex: 1, padding: theme.spacing.md },
  section: { marginBottom: theme.spacing.lg },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  label: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: 4, marginTop: theme.spacing.sm },
  input: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.cardBorder },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  halfInput: { flex: 1 },
  
  genderRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  genderButton: { flex: 1, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.card, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.cardBorder },
  genderButtonActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  genderText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm },
  genderTextActive: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },
  
  analyzeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.accent, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.lg },
  analyzeButtonDisabled: { opacity: 0.7 },
  analyzeButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  
  // Results styles
  resultSection: { marginBottom: theme.spacing.lg },
  resultSectionTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  
  diagnosisCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.cardBorder },
  diagnosisHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xs },
  diagnosisName: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.accent, flex: 1 },
  confidenceBadge: { paddingHorizontal: theme.spacing.sm, paddingVertical: 2, borderRadius: theme.borderRadius.sm },
  confidenceText: { fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  diagnosisDesc: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 20 },
  
  redFlagsCard: { backgroundColor: theme.colors.error + '15', borderRadius: theme.borderRadius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.error + '30' },
  redFlagItem: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs },
  redFlagText: { fontSize: theme.fontSize.sm, color: theme.colors.error, flex: 1 },
  
  treatmentCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.cardBorder },
  treatmentHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  treatmentTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  treatmentItem: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 22, marginLeft: theme.spacing.sm },
  
  followUpCard: { backgroundColor: theme.colors.success + '15', borderRadius: theme.borderRadius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.success + '30' },
  followUpText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 22 },
  
  disclaimerCard: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, backgroundColor: theme.colors.warning + '15', borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginTop: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.warning + '30' },
  disclaimerText: { flex: 1, fontSize: theme.fontSize.xs, color: theme.colors.warning, lineHeight: 18 },
  
  newAssessmentButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.accent, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.lg },
  newAssessmentText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
});
