import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Accelerometer } from 'expo-sensors';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api, { saveAssessmentReport } from '../../src/utils/api';
import PatientSelector, { Patient } from '../../src/components/PatientSelector';
import { generatePaymentSectionHTML } from '../../src/utils/pdfPaymentSection';

// Payment modal types
interface QRCodeData {
  qr_image_url: string;
  amount: number;
  description: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAUGE_SIZE = SCREEN_WIDTH - 80;

interface Measurement {
  id: string;
  jointName: string;
  angle: number;
  timestamp: Date;
  position: string;
}

const JOINT_PRESETS = [
  { id: 'cervical_flexion', name: 'Cervical Flexion', icon: 'head-outline', range: { min: 0, max: 45 }, normal: '0-45°' },
  { id: 'cervical_extension', name: 'Cervical Extension', icon: 'head-outline', range: { min: 0, max: 45 }, normal: '0-45°' },
  { id: 'cervical_lateral_left', name: 'Cervical Lat. Flex (L)', icon: 'head-outline', range: { min: 0, max: 45 }, normal: '0-45°' },
  { id: 'cervical_lateral_right', name: 'Cervical Lat. Flex (R)', icon: 'head-outline', range: { min: 0, max: 45 }, normal: '0-45°' },
  { id: 'cervical_rotation_left', name: 'Cervical Rotation (L)', icon: 'head-outline', range: { min: 0, max: 60 }, normal: '0-60°' },
  { id: 'cervical_rotation_right', name: 'Cervical Rotation (R)', icon: 'head-outline', range: { min: 0, max: 60 }, normal: '0-60°' },
  { id: 'thoracic', name: 'Thoracic Spine', icon: 'body-outline', range: { min: 0, max: 40 }, normal: '30-40°' },
  { id: 'lumbar', name: 'Lumbar Spine', icon: 'accessibility', range: { min: -30, max: 60 }, normal: '50-60°' },
  { id: 'shoulder', name: 'Shoulder', icon: 'hand-right', range: { min: 0, max: 180 }, normal: '150-180°' },
  { id: 'hip', name: 'Hip Joint', icon: 'man-outline', range: { min: -30, max: 120 }, normal: '100-120°' },
  { id: 'knee', name: 'Knee Joint', icon: 'walk-outline', range: { min: 0, max: 140 }, normal: '130-140°' },
  { id: 'ankle', name: 'Ankle', icon: 'footsteps-outline', range: { min: -20, max: 50 }, normal: '45-50°' },
];

export default function Inclinometer() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [selectedJoint, setSelectedJoint] = useState(JOINT_PRESETS[0]);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [calibrationOffset, setCalibrationOffset] = useState(0);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [sensorAvailable, setSensorAvailable] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [assessmentSaved, setAssessmentSaved] = useState(false);
  
  const animatedAngle = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchQRCode();
  }, []);

  // Use a ref to store calibration offset to avoid re-initializing accelerometer
  const calibrationOffsetRef = useRef(calibrationOffset);
  calibrationOffsetRef.current = calibrationOffset;

  useEffect(() => {
    let isMounted = true;
    let localSubscription: any = null;

    const initAccelerometer = async () => {
      try {
        // First check if accelerometer is available
        const isAvailable = await Accelerometer.isAvailableAsync();
        
        if (!isAvailable) {
          console.log('Accelerometer not available on this device');
          if (isMounted) {
            setSensorAvailable(false);
            simulateAngleDemo(localSubscription);
          }
          return;
        }

        // Request permissions on mobile (Android 12+ and iOS)
        try {
          const { status } = await Accelerometer.requestPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(
              'Permission Required',
              'Please grant motion sensor permission to use the inclinometer feature.\n\nGo to Settings > Apps > WBA99 MSK Analysis > Permissions > Sensors',
              [{ text: 'OK' }]
            );
            if (isMounted) {
              setSensorAvailable(false);
              simulateAngleDemo(localSubscription);
            }
            return;
          }
        } catch (permError) {
          // Permission API might not be available on all platforms
          console.log('Permission request not supported:', permError);
        }

        // Set update interval (100ms = 10 Hz for smooth readings)
        Accelerometer.setUpdateInterval(100);
        
        // Start listening to accelerometer data
        localSubscription = Accelerometer.addListener((data) => {
          if (!isMounted) return;
          
          // Calculate pitch angle from accelerometer data
          // Using atan2 for more accurate angle calculation
          const pitch = Math.atan2(data.y, Math.sqrt(data.x * data.x + data.z * data.z));
          const angleInDegrees = Math.round((pitch * 180) / Math.PI - calibrationOffsetRef.current);
          setCurrentAngle(angleInDegrees);
        });

        if (isMounted) {
          setSubscription(localSubscription);
          setSensorAvailable(true);
        }
        
        console.log('Accelerometer started successfully');
      } catch (error) {
        console.log('Accelerometer initialization error:', error);
        if (isMounted) {
          setSensorAvailable(false);
          simulateAngleDemo(localSubscription);
        }
      }
    };

    const simulateAngleDemo = (existingSub: any) => {
      // Demo mode for web preview - simulate angle changes
      let demoAngle = 0;
      let direction = 1;
      const interval = setInterval(() => {
        if (!isMounted) return;
        demoAngle += direction * 2;
        if (demoAngle > 45) direction = -1;
        if (demoAngle < -45) direction = 1;
        setCurrentAngle(demoAngle - calibrationOffsetRef.current);
      }, 100);
      localSubscription = { remove: () => clearInterval(interval) };
      if (isMounted) {
        setSubscription(localSubscription);
      }
    };

    initAccelerometer();

    return () => {
      isMounted = false;
      if (localSubscription) {
        localSubscription.remove();
      }
    };
  }, []); // Empty dependency array - only initialize once

  useEffect(() => {
    Animated.timing(animatedAngle, {
      toValue: currentAngle,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [currentAngle]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const calibrate = async () => {
    // Set current position as zero using ref for immediate effect
    const newOffset = currentAngle + calibrationOffset;
    setCalibrationOffset(newOffset);
    calibrationOffsetRef.current = newOffset;
    setIsCalibrated(true);
    
    if (sensorAvailable) {
      Alert.alert('Calibrated!', 'Position set as 0°\n\nHold device steady and tap Save to record measurements.');
    } else {
      Alert.alert('Demo Mode', 'Position set as 0° (simulated)');
    }
  };

  const saveMeasurement = () => {
    const newMeasurement: Measurement = {
      id: Date.now().toString(),
      jointName: selectedJoint.name,
      angle: currentAngle,
      timestamp: new Date(),
      position: currentAngle >= 0 ? 'Extension/Flexion' : 'Flexion/Extension',
    };
    setMeasurements(prev => [newMeasurement, ...prev]);
    Alert.alert('Saved!', `${selectedJoint.name}: ${currentAngle}°`);
  };

  const clearMeasurements = () => {
    Alert.alert(
      'Clear All?',
      'This will delete all saved measurements.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => setMeasurements([]) },
      ]
    );
  };

  const getAngleColor = () => {
    const absAngle = Math.abs(currentAngle);
    if (absAngle < 15) return theme.colors.success;
    if (absAngle < 45) return theme.colors.warning;
    return theme.colors.error;
  };

  const getAngleStatus = () => {
    const absAngle = Math.abs(currentAngle);
    if (absAngle < 15) return 'Neutral';
    if (currentAngle > 0) return 'Extension';
    return 'Flexion';
  };

  // Save assessment to backend
  const saveAssessment = async () => {
    if (!selectedPatient) {
      Alert.alert('Required', 'Please select a patient first');
      return;
    }

    if (measurements.length === 0) {
      Alert.alert('Required', 'Please record at least one measurement');
      return;
    }

    setSavingAssessment(true);
    try {
      const avgAngle = measurements.reduce((sum, m) => sum + m.angle, 0) / measurements.length;
      
      const assessmentData = {
        patient_id: selectedPatient.id,
        patient_name: selectedPatient.name,
        physio_id: currentUser?.id || '',
        physio_name: currentUser?.name || '',
        assessment_type: 'inclinometer',
        data: {
          measurements,
          selected_joint: selectedJoint,
          average_angle: avgAngle,
        },
        ai_analysis: null,
        recommendations: [],
        total_score: measurements.length,
        percentage: Math.min(100, measurements.length * 10),
        risk_level: Math.abs(avgAngle) > 30 ? 'high' : Math.abs(avgAngle) > 15 ? 'medium' : 'low',
      };

      await saveAssessmentReport(assessmentData);
      setAssessmentSaved(true);
      Alert.alert('Success', 'Inclinometer assessment saved successfully!');
    } catch (error) {
      console.error('Error saving assessment:', error);
      Alert.alert('Error', 'Failed to save assessment');
    } finally {
      setSavingAssessment(false);
    }
  };

  const fetchQRCode = async () => {
    try {
      const response = await api.get('/qr-codes/active');
      setQrCode(response.data.qr_image_url);
    } catch (error) {
      console.log('No active QR code found');
    }
  };

  const pickPaymentScreenshot = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setPaymentScreenshot(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const submitPaymentProof = async () => {
    if (!paymentScreenshot) {
      Alert.alert('Required', 'Please upload payment screenshot');
      return;
    }

    setSubmittingPayment(true);
    try {
      await api.post('/payment-proofs', {
        physio_id: currentUser?.id,
        report_type: 'inclinometer',
        screenshot_url: paymentScreenshot,
        amount: 500,
      });
      
      setPaymentVerified(true);
      setShowPaymentModal(false);
      Alert.alert('Success', 'Payment verified! Generating your report...', [
        { text: 'OK', onPress: () => generatePDFReport() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit payment proof');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleGenerateReport = () => {
    if (measurements.length === 0) {
      Alert.alert('No Data', 'Please save at least one measurement first.');
      return;
    }
    
    if (paymentVerified || !qrCode) {
      // Already paid or no QR code set - generate directly
      generatePDFReport();
    } else {
      // Show payment modal first
      setShowPaymentModal(true);
    }
  };

  const generatePDFReport = async () => {
    if (measurements.length === 0) {
      Alert.alert('No Data', 'Please save at least one measurement first.');
      return;
    }

    const currentDate = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const reportId = `WBA99-INC-${Date.now().toString(36).toUpperCase()}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #fff; color: #333; }
    .page { width: 210mm; min-height: 297mm; padding: 20mm; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #00BCD4; padding-bottom: 15px; margin-bottom: 25px; }
    .logo { display: flex; align-items: center; gap: 15px; }
    .logo-circle { width: 60px; height: 60px; background: linear-gradient(135deg, #00BCD4, #0097A7); border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; color: white; }
    .logo-text { font-size: 14px; font-weight: bold; }
    .logo-sub { font-size: 8px; }
    .title { font-size: 24px; color: #00838F; }
    .subtitle { font-size: 12px; color: #666; }
    .meta { text-align: right; font-size: 10px; color: #666; }
    .section { background: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
    .section-title { font-size: 14px; font-weight: bold; color: #00838F; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #e0f7fa; color: #00838F; font-size: 11px; }
    td { font-size: 11px; }
    .angle { font-size: 16px; font-weight: bold; color: #00BCD4; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
    .summary-item { background: white; border-radius: 8px; padding: 15px; text-align: center; border: 1px solid #e0e0e0; }
    .summary-value { font-size: 24px; font-weight: bold; color: #00BCD4; }
    .summary-label { font-size: 10px; color: #666; margin-top: 5px; }
    .footer { position: absolute; bottom: 20mm; left: 20mm; right: 20mm; display: flex; justify-content: space-between; font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo">
        <div class="logo-circle">
          <span class="logo-text">WBA99</span>
          <span class="logo-sub">INCL</span>
        </div>
        <div>
          <div class="title">Inclinometer Report</div>
          <div class="subtitle">Range of Motion Assessment</div>
        </div>
      </div>
      <div class="meta">
        <p><strong>Report ID:</strong> ${reportId}</p>
        <p><strong>Date:</strong> ${currentDate}</p>
        <p><strong>Measurements:</strong> ${measurements.length}</p>
      </div>
    </div>

    <div class="section">
      <div class="section-title">📊 MEASUREMENT SUMMARY</div>
      <div class="summary">
        <div class="summary-item">
          <div class="summary-value">${measurements.length}</div>
          <div class="summary-label">Total Measurements</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${Math.max(...measurements.map(m => m.angle))}°</div>
          <div class="summary-label">Maximum Angle</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${Math.min(...measurements.map(m => m.angle))}°</div>
          <div class="summary-label">Minimum Angle</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">📏 DETAILED MEASUREMENTS</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Joint</th>
            <th>Angle</th>
            <th>Position</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${measurements.map((m, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><strong>${m.jointName}</strong></td>
              <td class="angle">${m.angle}°</td>
              <td>${m.position}</td>
              <td>${new Date(m.timestamp).toLocaleTimeString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">📋 REFERENCE RANGES</div>
      <table>
        <thead>
          <tr>
            <th>Joint</th>
            <th>Normal ROM</th>
            <th>Min Range</th>
            <th>Max Range</th>
          </tr>
        </thead>
        <tbody>
          ${JOINT_PRESETS.map(j => `
            <tr>
              <td><strong>${j.name}</strong></td>
              <td>${j.normal}</td>
              <td>${j.range.min}°</td>
              <td>${j.range.max}°</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <span>WBA99 Expert Analysis India</span>
      <span>Confidential Medical Report</span>
      <span>www.wba99.com</span>
    </div>
    
    ${generatePaymentSectionHTML('#00BCD4')}
  </div>
</body>
</html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  const rotateStyle = {
    transform: [
      {
        rotate: animatedAngle.interpolate({
          inputRange: [-90, 90],
          outputRange: ['-90deg', '90deg'],
        }),
      },
    ],
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Inclinometer</Text>
          <TouchableOpacity onPress={handleGenerateReport} style={styles.pdfButton}>
            <Ionicons name="document-text" size={24} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="angle-acute" size={32} color={theme.colors.accent} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Digital Inclinometer</Text>
            <Text style={styles.infoText}>
              {sensorAvailable 
                ? 'Measure joint angles and range of motion using device sensors'
                : 'Demo Mode - Use on physical device for actual measurements'}
            </Text>
          </View>
        </View>

        {!sensorAvailable && (
          <View style={styles.demoNotice}>
            <Ionicons name="information-circle" size={20} color={theme.colors.warning} />
            <Text style={styles.demoNoticeText}>
              Accelerometer not available. Running in demo mode with simulated angles.
            </Text>
          </View>
        )}

        {/* Patient Selector */}
        <PatientSelector
          physioId={currentUser?.id || ''}
          selectedPatient={selectedPatient}
          onSelectPatient={setSelectedPatient}
          label="Select Patient"
          placeholder="Tap to select a patient"
        />

        {/* Joint Selector */}
        <Text style={styles.sectionLabel}>Select Joint</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.jointScroll}>
          {JOINT_PRESETS.map((joint) => (
            <TouchableOpacity
              key={joint.id}
              style={[
                styles.jointButton,
                selectedJoint.id === joint.id && styles.jointButtonSelected,
              ]}
              onPress={() => setSelectedJoint(joint)}
            >
              <Ionicons
                name={joint.icon as any}
                size={24}
                color={selectedJoint.id === joint.id ? theme.colors.textPrimary : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.jointButtonText,
                  selectedJoint.id === joint.id && styles.jointButtonTextSelected,
                ]}
              >
                {joint.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Main Gauge */}
        <View style={styles.gaugeContainer}>
          {/* Background arc */}
          <View style={styles.gaugeBackground}>
            {/* Tick marks */}
            {[-90, -60, -30, 0, 30, 60, 90].map((angle) => (
              <View
                key={angle}
                style={[
                  styles.tickMark,
                  { transform: [{ rotate: `${angle}deg` }] },
                ]}
              >
                <View style={styles.tickLine} />
                <Text style={styles.tickLabel}>{angle}°</Text>
              </View>
            ))}
            
            {/* Needle */}
            <Animated.View style={[styles.needle, rotateStyle]}>
              <View style={styles.needleBody} />
              <View style={styles.needleTip} />
            </Animated.View>
            
            {/* Center circle */}
            <View style={styles.gaugeCenter}>
              <Animated.View style={[styles.recordingIndicator, { transform: [{ scale: pulseAnim }] }]}>
                {isRecording && <View style={styles.recordingDot} />}
              </Animated.View>
            </View>
          </View>

          {/* Digital Display */}
          <View style={styles.digitalDisplay}>
            <Text style={[styles.angleValue, { color: getAngleColor() }]}>
              {currentAngle}°
            </Text>
            <Text style={styles.angleStatus}>{getAngleStatus()}</Text>
          </View>

          {/* Calibration status */}
          <View style={styles.calibrationStatus}>
            <Ionicons
              name={isCalibrated ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={isCalibrated ? theme.colors.success : theme.colors.textMuted}
            />
            <Text style={[styles.calibrationText, { color: isCalibrated ? theme.colors.success : theme.colors.textMuted }]}>
              {isCalibrated ? 'Calibrated' : 'Not calibrated'}
            </Text>
          </View>
        </View>

        {/* Control Buttons */}
        <View style={styles.controlButtons}>
          <TouchableOpacity style={styles.controlButton} onPress={calibrate}>
            <Ionicons name="sync" size={24} color={theme.colors.textPrimary} />
            <Text style={styles.controlButtonText}>Zero</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: getAngleColor() }]}
            onPress={saveMeasurement}
          >
            <Ionicons name="save" size={28} color={theme.colors.textPrimary} />
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, isRecording && styles.recordingButton]}
            onPress={() => setIsRecording(!isRecording)}
          >
            <Ionicons name={isRecording ? 'pause' : 'play'} size={24} color={theme.colors.textPrimary} />
            <Text style={styles.controlButtonText}>{isRecording ? 'Stop' : 'Record'}</Text>
          </TouchableOpacity>
        </View>

        {/* Joint Info */}
        <View style={styles.jointInfoCard}>
          <Text style={styles.jointInfoTitle}>{selectedJoint.name}</Text>
          <View style={styles.jointInfoRow}>
            <View style={styles.jointInfoItem}>
              <Text style={styles.jointInfoLabel}>Normal ROM</Text>
              <Text style={styles.jointInfoValue}>{selectedJoint.normal}</Text>
            </View>
            <View style={styles.jointInfoItem}>
              <Text style={styles.jointInfoLabel}>Range</Text>
              <Text style={styles.jointInfoValue}>{selectedJoint.range.min}° to {selectedJoint.range.max}°</Text>
            </View>
          </View>
        </View>

        {/* Saved Measurements */}
        {measurements.length > 0 && (
          <View style={styles.measurementsSection}>
            <View style={styles.measurementsHeader}>
              <Text style={styles.sectionTitle}>Saved Measurements</Text>
              <TouchableOpacity onPress={clearMeasurements}>
                <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
            
            {measurements.slice(0, 5).map((m, index) => (
              <View key={m.id} style={styles.measurementItem}>
                <View style={styles.measurementIndex}>
                  <Text style={styles.measurementIndexText}>{index + 1}</Text>
                </View>
                <View style={styles.measurementInfo}>
                  <Text style={styles.measurementJoint}>{m.jointName}</Text>
                  <Text style={styles.measurementTime}>
                    {new Date(m.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={styles.measurementAngle}>{m.angle}°</Text>
              </View>
            ))}
            
            {measurements.length > 5 && (
              <Text style={styles.moreText}>+{measurements.length - 5} more measurements</Text>
            )}
          </View>
        )}

        {/* Quick Guide */}
        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>📖 How to Use</Text>
          <Text style={styles.guideStep}>1. Select the joint you're measuring</Text>
          <Text style={styles.guideStep}>2. Place device along the body segment</Text>
          <Text style={styles.guideStep}>3. Tap "Zero" to calibrate starting position</Text>
          <Text style={styles.guideStep}>4. Move through range of motion</Text>
          <Text style={styles.guideStep}>5. Tap "Save" to record the angle</Text>
        </View>

        {/* Payment Modal */}
        <Modal visible={showPaymentModal} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Payment Required</Text>
                <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Scan the QR code below to make payment, then upload screenshot to generate your report
              </Text>

              {qrCode && (
                <Image source={{ uri: qrCode }} style={styles.qrImage} />
              )}

              <TouchableOpacity style={styles.screenshotButton} onPress={pickPaymentScreenshot}>
                {paymentScreenshot ? (
                  <Image source={{ uri: paymentScreenshot }} style={styles.screenshotPreview} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={32} color={theme.colors.accent} />
                    <Text style={styles.screenshotButtonText}>Upload Payment Screenshot</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitPaymentButton, !paymentScreenshot && styles.buttonDisabled]}
                onPress={submitPaymentProof}
                disabled={!paymentScreenshot || submittingPayment}
              >
                {submittingPayment ? (
                  <ActivityIndicator color={theme.colors.textPrimary} />
                ) : (
                  <Text style={styles.submitPaymentButtonText}>Submit & Generate Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  scrollContent: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  backButton: { padding: theme.spacing.xs },
  headerTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  pdfButton: { padding: theme.spacing.xs },

  infoCard: { flexDirection: 'row', backgroundColor: theme.colors.accent + '20', borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.lg, gap: theme.spacing.md, alignItems: 'center' },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  infoText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 4 },

  demoNotice: { flexDirection: 'row', backgroundColor: theme.colors.warning + '20', borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.lg, gap: theme.spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.warning },
  demoNoticeText: { flex: 1, fontSize: theme.fontSize.sm, color: theme.colors.warning },

  sectionLabel: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  jointScroll: { marginBottom: theme.spacing.lg },
  jointButton: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginRight: theme.spacing.sm, alignItems: 'center', minWidth: 90, borderWidth: 1, borderColor: theme.colors.cardBorder },
  jointButtonSelected: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  jointButtonText: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: theme.spacing.xs, textAlign: 'center' },
  jointButtonTextSelected: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },

  gaugeContainer: { alignItems: 'center', marginBottom: theme.spacing.lg },
  gaugeBackground: { width: GAUGE_SIZE, height: GAUGE_SIZE / 2 + 30, borderTopLeftRadius: GAUGE_SIZE / 2, borderTopRightRadius: GAUGE_SIZE / 2, backgroundColor: theme.colors.card, borderWidth: 2, borderColor: theme.colors.cardBorder, borderBottomWidth: 0, position: 'relative', overflow: 'hidden', justifyContent: 'flex-end', alignItems: 'center' },
  
  tickMark: { position: 'absolute', bottom: 0, left: GAUGE_SIZE / 2 - 1, width: 2, height: GAUGE_SIZE / 2, alignItems: 'center', transformOrigin: 'bottom center' },
  tickLine: { width: 2, height: 15, backgroundColor: theme.colors.textMuted },
  tickLabel: { fontSize: 10, color: theme.colors.textMuted, marginTop: 2 },

  needle: { position: 'absolute', bottom: 0, left: GAUGE_SIZE / 2 - 3, width: 6, height: GAUGE_SIZE / 2 - 20, alignItems: 'center', transformOrigin: 'bottom center' },
  needleBody: { width: 4, height: '80%', backgroundColor: theme.colors.accent, borderRadius: 2 },
  needleTip: { width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 20, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: theme.colors.accent, marginTop: -2 },

  gaugeCenter: { position: 'absolute', bottom: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, borderWidth: 3, borderColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center' },
  recordingIndicator: { width: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.error + '30', justifyContent: 'center', alignItems: 'center' },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.error },

  digitalDisplay: { marginTop: theme.spacing.lg, alignItems: 'center' },
  angleValue: { fontSize: 64, fontWeight: theme.fontWeight.bold },
  angleStatus: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },

  calibrationStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: theme.spacing.sm },
  calibrationText: { fontSize: theme.fontSize.sm },

  controlButtons: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  controlButton: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center', minWidth: 80, borderWidth: 1, borderColor: theme.colors.cardBorder },
  controlButtonText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 4 },
  saveButton: { borderRadius: 40, padding: theme.spacing.lg, alignItems: 'center', width: 80, height: 80, justifyContent: 'center' },
  saveButtonText: { fontSize: theme.fontSize.sm, color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold, marginTop: 4 },
  recordingButton: { backgroundColor: theme.colors.error + '30', borderColor: theme.colors.error },

  jointInfoCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, marginBottom: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.cardBorder },
  jointInfoTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  jointInfoRow: { flexDirection: 'row', justifyContent: 'space-around' },
  jointInfoItem: { alignItems: 'center' },
  jointInfoLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted },
  jointInfoValue: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.accent, marginTop: 4 },

  measurementsSection: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.cardBorder },
  measurementsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  measurementItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm, padding: theme.spacing.sm, marginBottom: theme.spacing.xs },
  measurementIndex: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.sm },
  measurementIndexText: { fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  measurementInfo: { flex: 1 },
  measurementJoint: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.textPrimary },
  measurementTime: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted },
  measurementAngle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.accent },
  moreText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing.sm },

  guideCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.cardBorder },
  guideTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  guideStep: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs, paddingLeft: theme.spacing.sm },

  // Payment Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: theme.spacing.md },
  modalContent: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, width: '100%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  modalTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  modalSubtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.md, textAlign: 'center' },
  qrImage: { width: 200, height: 200, alignSelf: 'center', marginBottom: theme.spacing.md, borderRadius: theme.borderRadius.md },
  screenshotButton: { borderWidth: 2, borderColor: theme.colors.cardBorder, borderStyle: 'dashed', borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.md, minHeight: 100 },
  screenshotButtonText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  screenshotPreview: { width: 150, height: 100, borderRadius: theme.borderRadius.sm },
  submitPaymentButton: { backgroundColor: theme.colors.success, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center' },
  submitPaymentButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  buttonDisabled: { opacity: 0.5 },
});
