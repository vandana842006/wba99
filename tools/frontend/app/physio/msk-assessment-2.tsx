import React, { useState, useEffect } from 'react';
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
  Modal,
  Image,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../src/utils/theme';
import api, { getPhysioPatients, saveAssessmentReport, getAssessmentReports } from '../../src/utils/api';
import { useStore } from '../../src/store/useStore';
import { useCredits, FEATURE_KEYS } from '../../src/hooks/useCredits';

// MSK Test Categories organized by position
const MSK_CATEGORIES = [
  {
    id: 'standing',
    name: 'STANDING MEASURES',
    icon: 'body-outline',
    color: '#2196F3',
    tests: [
      { id: 'knee_to_wall', name: 'Knee to Wall', unit: 'cm', reference: '>10 Cms', bilateral: true },
      { id: 'foot_posture', name: 'Foot Posture', unit: '', reference: 'Flat/Normal/High Arch', bilateral: true },
      { id: 'single_leg_standing', name: 'Single Leg Standing (Eyes Closed)', unit: 'sec', reference: '> 30 Sec', bilateral: true },
      { id: 'lumbar_flexion', name: 'Lumbar Flexion (> +5.0cms)', unit: 'cm', reference: 'L1-S1 change cm', bilateral: false },
      { id: 'lumbar_extension', name: 'Lumbar Extension (> -2.0cms)', unit: 'cm', reference: 'L1-S1 change cm', bilateral: false },
      { id: 'lumbar_side_flexion', name: 'Lumbar Side Flexion (+/- 3.0cms)', unit: 'cm', reference: 'cm +/- distance from floor', bilateral: true },
      { id: 'lumbar_quadrant', name: 'Lumbar Quadrant', unit: '', reference: '+/-ve', bilateral: true },
      { id: 'shoulder_abduction', name: 'Shoulder Abduction', unit: '', reference: 'Full/Restricted/SC APkinesis', bilateral: true },
      { id: 'hawkins_kennedy', name: 'Hawkins Kennedy', unit: '', reference: 'Pain/No pain', bilateral: true },
      { id: 'obriens_test', name: "O'Brien's Test", unit: '', reference: 'Pain, Weakness', bilateral: true },
      { id: 'empty_can', name: 'Empty Can', unit: '', reference: 'Pain, Weakness', bilateral: true },
    ]
  },
  {
    id: 'floor',
    name: 'FLOOR',
    icon: 'fitness-outline',
    color: '#4CAF50',
    tests: [
      { id: 'combined_elevation', name: 'Combined Elevation', unit: 'cm', reference: 'cm from floor', bilateral: false },
    ]
  },
  {
    id: 'seated',
    name: 'SEATED',
    icon: 'accessibility-outline',
    color: '#FF9800',
    tests: [
      { id: 'thoracic_rotation', name: 'Thoracic Rotation', unit: '', reference: 'Normal/Sx/Cms', bilateral: true },
      { id: 'slump_test', name: 'Slump Test', unit: '', reference: 'Degree KE, symmetry, +/-', bilateral: true },
      { id: 'thomas_test', name: 'Thomas Test', unit: '', reference: '+/-', bilateral: true },
      { id: 'knee_flexion_seated', name: 'A. Knee Flexion', unit: '°', reference: '(>80)Degrees', bilateral: true },
      { id: 'hip_flexion_seated', name: 'B. Hip Flexion', unit: '°', reference: '< 5° Degrees', bilateral: true },
    ]
  },
  {
    id: 'supine',
    name: 'SUPINE',
    icon: 'bed-outline',
    color: '#9C27B0',
    tests: [
      { id: 'leg_length', name: 'Leg Length (ASIS to Medial Condyl / Medial Malleoli)', unit: 'cm', reference: '> 2 Cm', bilateral: true },
      { id: 'shoulder_er_90', name: 'Shoulder ER at 90°', unit: '°', reference: '>90°', bilateral: true },
      { id: 'shoulder_ir_90', name: 'Shoulder IR at 90°', unit: '°', reference: '>90°', bilateral: true },
      { id: 'active_knee_extension', name: 'Active Knee Extension (90/90)', unit: '°', reference: '≥ 160°', bilateral: true },
      { id: 'hip_quadrant', name: 'Hip Quadrant', unit: '', reference: 'Sx reproduction', bilateral: true },
    ]
  },
  {
    id: 'side_lying',
    name: 'SIDE LYING',
    icon: 'remove-outline',
    color: '#00BCD4',
    tests: [
      { id: 'mtp_extension', name: '1st MTP Extension (Ankle Neutral)', unit: '°', reference: 'Degrees', bilateral: true },
    ]
  },
  {
    id: 'prone',
    name: 'PRONE',
    icon: 'body-outline',
    color: '#E91E63',
    tests: [
      { id: 'hip_ir_0', name: 'Hip IR 0°', unit: '°', reference: '≥ 30°', bilateral: true },
      { id: 'hip_er_0', name: 'Hip ER 0°', unit: '°', reference: '≥ 45°', bilateral: true },
      { id: 'prone_knee_flexion', name: 'Prone Knee Flexion Test', unit: '', reference: 'Judgement', bilateral: true },
      { id: 'forced_ankle_pf', name: 'Forced Ankle PF (Ankle Impingement Test)', unit: '', reference: 'Sx reproduction', bilateral: true },
    ]
  },
  {
    id: 'strength',
    name: 'STRENGTH',
    icon: 'barbell-outline',
    color: '#FF5722',
    tests: [
      { id: 'single_leg_bridge', name: 'Single Leg Bridge (90/90)', unit: 'sec', reference: 'Level 1=<60sec, Level 2=60-90sec, Level 3=>90sec', bilateral: true },
      { id: 'rc_strength_test', name: 'RC Strength Test (IR & ER- 45/45)', unit: '', reference: 'MMT', bilateral: true },
      { id: 'plank', name: 'Plank', unit: 'sec', reference: '180 Sec', bilateral: false },
      { id: 'side_plank', name: 'Side Plank', unit: 'sec', reference: '80 sec', bilateral: true },
      { id: 'slhb_test', name: 'SLHB Test (Box Height: 60 Cm, Knee Angle: 20 Degrees)', unit: 'reps', reference: '> 30 Rep', bilateral: true },
    ]
  },
  {
    id: 'functional',
    name: 'FUNCTIONAL TESTS',
    icon: 'walk-outline',
    color: '#673AB7',
    tests: [
      { id: 'prone_hold', name: 'Prone Hold (4 Point Elbow)', unit: 'sec', reference: '5=120sec, 4=90-119sec, 3=60-89sec, 2=30-59sec, 1=<30sec', bilateral: false },
      { id: 'side_bridge_hand', name: 'Side Bridge (Hand)', unit: 'sec', reference: '5=120sec, 4=90-119sec, 3=60-89sec, 2=30-59sec, 1=<30sec', bilateral: true },
      { id: 'squat_broomstick', name: 'Squat Broomstick', unit: 'cm', reference: '5=0-10cm, 4=11-15cm, 3=16-20cm, 2=21-25cm, 1=>25cm', bilateral: false },
      { id: 'overhead_squat', name: 'Overhead Squat', unit: 'cm', reference: '5=0-10cm, 4=11-20cm, 3=21-30cm, 2=31-40cm, 1=>40cm', bilateral: false },
      { id: 'sl_squats', name: 'SL Squats', unit: 'reps', reference: '5=≥5, 4=4, 3=3, 2=2, 1=1', bilateral: true },
      { id: 'lunge_walk', name: 'Lunge Walk (L & R) (5 Reps)', unit: 'score', reference: '5=5, 4=4, 3=3, 2=2, 1=1', bilateral: false },
      { id: 'chin_ups', name: 'Chin Ups', unit: 'reps', reference: '5=>10, 4=8-9, 3=6-7, 2=4-5, 1=0-3', bilateral: false },
      { id: 'push_ups', name: 'Push Ups', unit: 'reps', reference: '5=>30, 4=25-30, 3=20-24, 2=15-19, 1=<15', bilateral: false },
      { id: 'bb_bench_pulls', name: 'BB Bench Pulls @ 50% BW', unit: 'reps', reference: '5=>10, 4=8-9, 3=6-7, 2=4-5, 1=0-3', bilateral: false },
      { id: 'glute_stability', name: 'Glute Stability', unit: 'sec', reference: '5=120, 4=90-119, 3=60-89, 2=30-59, 1=<30', bilateral: true },
      { id: 'sl_calf_raises', name: 'SL Calf Raises', unit: 'reps', reference: '5=30, 4=25-29, 3=20-24, 2=15-19, 1=10-15', bilateral: true },
      { id: 'standing_broad_jump', name: 'Standing Broad Jump', unit: 'm', reference: '5=>2.47m, 4=2.33-2.46, 3=2.20-2.32, 2=2.05-2.19, 1=1.91-2.04', bilateral: true },
      { id: 'single_leg_forward_hop', name: 'Single Leg Forward Hop', unit: 'm', reference: '5=≥1.99m, 4=1.85-1.98, 3=1.70-1.84, 2=1.55-1.69, 1=1.40-1.54', bilateral: true },
    ]
  },
  {
    id: 'ybt',
    name: 'Y-BALANCE TEST',
    icon: 'analytics-outline',
    color: '#795548',
    tests: [
      { id: 'ybt_anterior_r', name: 'YBT Anterior (Right)', unit: 'cm', reference: 'ryt anterior', bilateral: false },
      { id: 'ybt_pm_r', name: 'YBT Posteromedial (Right)', unit: 'cm', reference: 'rpm', bilateral: false },
      { id: 'ybt_pl_r', name: 'YBT Posterolateral (Right)', unit: 'cm', reference: 'rpl', bilateral: false },
      { id: 'ybt_anterior_l', name: 'YBT Anterior (Left)', unit: 'cm', reference: 'la', bilateral: false },
      { id: 'ybt_pm_l', name: 'YBT Posteromedial (Left)', unit: 'cm', reference: 'lpm', bilateral: false },
      { id: 'ybt_pl_l', name: 'YBT Posterolateral (Left)', unit: 'cm', reference: 'pl', bilateral: false },
    ]
  },
  {
    id: 'special_tests',
    name: 'SPECIAL TESTS',
    icon: 'medical-outline',
    color: '#F44336',
    tests: [
      { id: 'apprehension_test', name: 'Apprehension Test', unit: '', reference: '+/-ve', bilateral: true },
      { id: 'sulcus_sign', name: 'Sulcus Sign', unit: '', reference: '+/-ve', bilateral: true },
      { id: 'anterior_drawer_shoulder', name: 'Anterior Drawer (Shoulder)', unit: '', reference: '+/-ve', bilateral: true },
      { id: 'speeds_test', name: "Speed's Test", unit: '', reference: '+/-ve', bilateral: true },
      { id: 'yergasons_test', name: "Yergason's Test", unit: '', reference: '+/-ve', bilateral: true },
      { id: 'mcmurray_test', name: "McMurray's Test", unit: '', reference: '+/-ve Med/Lat', bilateral: true },
      { id: 'anterior_drawer_knee', name: 'Anterior Drawer (Knee)', unit: '', reference: '+/-ve', bilateral: true },
      { id: 'posterior_drawer_knee', name: 'Posterior Drawer (Knee)', unit: '', reference: '+/-ve', bilateral: true },
      { id: 'lachman_test', name: "Lachman's Test", unit: '', reference: '+/-ve', bilateral: true },
      { id: 'varus_valgus_stress', name: 'Varus/Valgus Stress', unit: '', reference: '+/-ve', bilateral: true },
      { id: 'faber_test', name: 'FABER Test', unit: '', reference: '+/-ve', bilateral: true },
      { id: 'faddir_test', name: 'FADDIR Test', unit: '', reference: '+/-ve', bilateral: true },
      { id: 'log_roll_test', name: 'Log Roll Test', unit: '', reference: '+/-ve', bilateral: true },
      { id: 'scour_test', name: 'Scour Test', unit: '', reference: '+/-ve', bilateral: true },
      { id: 'ober_test', name: "Ober's Test", unit: '', reference: '+/-ve', bilateral: true },
    ]
  },
];

interface Measurement {
  left?: string;
  right?: string;
  value?: string;
  comments?: string;
}

export default function MSKAssessment2() {
  const router = useRouter();
  const { currentUser } = useStore();
  const { silentDeduct, isExempt, getBalance } = useCredits();
  const [assessorName, setAssessorName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('standing');
  const [measurements, setMeasurements] = useState<Record<string, Measurement>>({});
  const [notes, setNotes] = useState('');
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [userCredits, setUserCredits] = useState<number | null>(null);
  
  // Patient selector state
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const patientName = selectedPatient?.name || '';
  
  // History fields
  const [injuryHistory, setInjuryHistory] = useState('');
  const [pastInjury, setPastInjury] = useState('');
  const [matchesPlayed, setMatchesPlayed] = useState('');
  const [missedMatches, setMissedMatches] = useState('');
  const [specialty, setSpecialty] = useState('');

  // Payment states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [assessmentSaved, setAssessmentSaved] = useState(false);
  const [loadingPreviousAssessment, setLoadingPreviousAssessment] = useState(false);
  const [previousAssessment, setPreviousAssessment] = useState<any | null>(null);

  useEffect(() => {
    fetchQRCode();
    fetchUserCredits();
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    if (!currentUser?.id) return;
    try {
      const response = await getPhysioPatients(currentUser.id);
      setPatients(response.data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  // Load previous MSK assessment for selected patient
  const loadPreviousAssessment = async (patientId: string) => {
    if (!currentUser?.id) return;
    
    setLoadingPreviousAssessment(true);
    setPreviousAssessment(null);
    
    try {
      const response = await getAssessmentReports({
        patient_id: patientId,
        assessment_type: 'msk',
      });
      
      const reports = response.data || [];
      if (reports.length > 0) {
        // Get the most recent MSK assessment
        const latestReport = reports[0];
        setPreviousAssessment(latestReport);
        
        // Load the data into the form
        if (latestReport.report_data) {
          const data = latestReport.report_data;
          
          // Load test results
          if (data.testResults) {
            setTestResults(data.testResults);
          }
          
          // Load history fields
          if (data.injuryHistory) setInjuryHistory(data.injuryHistory);
          if (data.pastInjury) setPastInjury(data.pastInjury);
          if (data.matchesPlayed) setMatchesPlayed(data.matchesPlayed);
          if (data.missedMatches) setMissedMatches(data.missedMatches);
          if (data.specialty) setSpecialty(data.specialty);
          
          Alert.alert(
            '📋 Previous Assessment Loaded',
            `Found MSK assessment from ${new Date(latestReport.created_at).toLocaleDateString()}. You can review or update the data.`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error loading previous assessment:', error);
    } finally {
      setLoadingPreviousAssessment(false);
    }
  };

  // Handle patient selection
  const handlePatientSelect = (patient: any) => {
    setSelectedPatient(patient);
    setShowPatientModal(false);
    setAssessmentSaved(false); // Reset saved state
    
    // Load previous assessment for this patient
    if (patient?.id) {
      loadPreviousAssessment(patient.id);
    }
  };

  const fetchUserCredits = async () => {
    const balance = await getBalance();
    setUserCredits(balance);
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
        patient_id: patientName,
        report_type: 'msk',
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
    if (!patientName.trim()) {
      Alert.alert('Required', 'Please select a patient');
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

  // Save assessment to backend
  const saveAssessment = async () => {
    if (!selectedPatient) {
      Alert.alert('Required', 'Please select a patient first');
      return;
    }

    setSavingAssessment(true);
    try {
      // Calculate completion percentage
      const allTests = MSK_CATEGORIES.flatMap(cat => cat.tests);
      const completedTests = allTests.filter(test => {
        const m = measurements[test.id];
        if (test.bilateral) {
          return m?.left || m?.right;
        }
        return m?.value;
      });
      const percentage = Math.round((completedTests.length / allTests.length) * 100);

      // Prepare assessment data
      const assessmentData = {
        patient_id: selectedPatient.id,
        patient_name: selectedPatient.name,
        physio_id: currentUser?.id || '',
        physio_name: currentUser?.name || '',
        assessment_type: 'msk',
        data: {
          measurements,
          notes,
          assessor_name: assessorName,
          patient_age: patientAge,
          injury_history: injuryHistory,
          past_injury: pastInjury,
          matches_played: matchesPlayed,
          missed_matches: missedMatches,
          specialty,
        },
        ai_analysis: null, // Will be populated when AI analysis is added
        recommendations: [],
        total_score: completedTests.length,
        percentage,
        risk_level: percentage < 50 ? 'high' : percentage < 80 ? 'medium' : 'low',
      };

      await saveAssessmentReport(assessmentData);
      setAssessmentSaved(true);
      Alert.alert('Success', 'Assessment saved successfully! It will now appear in the patient\'s dashboard.');
    } catch (error) {
      console.error('Error saving assessment:', error);
      Alert.alert('Error', 'Failed to save assessment. Please try again.');
    } finally {
      setSavingAssessment(false);
    }
  };

  const updateMeasurement = (testId: string, field: 'left' | 'right' | 'value' | 'comments', value: string) => {
    setMeasurements(prev => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        [field]: value
      }
    }));
  };

  const getCompletedCount = (categoryId: string) => {
    const category = MSK_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return 0;
    return category.tests.filter(test => {
      const m = measurements[test.id];
      if (!m) return false;
      if (test.bilateral) {
        return m.left || m.right;
      }
      return m.value;
    }).length;
  };

  const getTotalCompletion = () => {
    let completed = 0;
    let total = 0;
    MSK_CATEGORIES.forEach(cat => {
      cat.tests.forEach(test => {
        total++;
        const m = measurements[test.id];
        if (m) {
          if (test.bilateral && (m.left || m.right)) completed++;
          else if (!test.bilateral && m.value) completed++;
        }
      });
    });
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const generatePDFReport = async () => {
    if (!patientName.trim()) {
      Alert.alert('Required', 'Please enter patient name');
      return;
    }
    
    // Deduct credits for PDF report generation (if not exempt)
    if (!isExempt()) {
      const deductSuccess = await silentDeduct(FEATURE_KEYS.MSK_ASSESSMENT);
      if (!deductSuccess) {
        return; // User was shown insufficient credits alert
      }
      // Refresh credits display
      fetchUserCredits();
    }
    
    setGeneratingPDF(true);
    
    // Fetch physio settings for logo
    let physioSettings = { logo_url: '', clinic_name: '', clinic_phone: '', clinic_address: '' };
    try {
      const res = await api.get(`/users/${currentUser?.id}/profile-settings`);
      physioSettings = res.data;
    } catch (e) { console.log('No physio settings'); }

    // Fetch payment settings for QR
    let paymentSettings = { upi_id: '', qr_code_image: '', account_holder_name: '' };
    try {
      const res = await api.get('/payment/settings');
      paymentSettings = res.data;
    } catch (e) { console.log('No payment settings'); }

    const reportId = `WBA99-MSK2-${Date.now().toString(36).toUpperCase()}`;
    const currentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const completion = getTotalCompletion();

    // Logo HTML
    const logoHTML = physioSettings.logo_url && physioSettings.logo_url.startsWith('data:image')
      ? `<img src="${physioSettings.logo_url}" style="max-height: 50px; max-width: 180px;" />`
      : physioSettings.clinic_name 
        ? `<div style="font-size: 18px; font-weight: bold; color: #fff;">${physioSettings.clinic_name}</div>`
        : `<div style="font-size: 18px; font-weight: bold; color: #00d9ff;">WBA99</div>`;

    // Payment QR HTML
    const paymentHTML = (paymentSettings.upi_id || paymentSettings.qr_code_image) ? `
      <div style="margin-top: 15px; padding: 15px; background: linear-gradient(135deg, #fff8e1, #ffecb3); border: 2px solid #ffc107; border-radius: 10px; page-break-inside: avoid;">
        <h3 style="color: #f57f17; margin-bottom: 10px; font-size: 12px;">💳 Payment Information</h3>
        <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
          ${paymentSettings.qr_code_image ? `
            <div style="text-align: center;">
              <img src="${paymentSettings.qr_code_image}" style="width: 100px; height: 100px; border: 2px solid #ddd; border-radius: 8px;" />
              <p style="font-size: 8px; color: #666; margin-top: 5px;">Scan to Pay</p>
            </div>
          ` : ''}
          <div>
            ${paymentSettings.upi_id ? `<p style="margin: 3px 0; font-size: 11px;"><strong>UPI ID:</strong> ${paymentSettings.upi_id}</p>` : ''}
            ${paymentSettings.account_holder_name ? `<p style="margin: 3px 0; font-size: 11px;"><strong>Pay to:</strong> ${paymentSettings.account_holder_name}</p>` : ''}
            <p style="font-size: 9px; color: #666; margin-top: 8px; font-style: italic;">Scan QR code or use UPI ID for payment</p>
          </div>
        </div>
      </div>
    ` : '';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 10mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 9px; color: #333; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    
    .header { text-align: center; padding: 15px; background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; margin-bottom: 10px; border-radius: 8px; }
    .header h1 { font-size: 16px; margin-bottom: 5px; margin-top: 10px; }
    .header .clinic-info { font-size: 9px; opacity: 0.8; margin-top: 5px; }
    
    .patient-info { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 10px; background: #f5f5f5; border-radius: 5px; flex-wrap: wrap; }
    .patient-info div { text-align: center; min-width: 80px; margin: 3px; }
    .patient-info label { font-size: 8px; color: #666; text-transform: uppercase; }
    .patient-info span { display: block; font-weight: bold; font-size: 10px; }
    
    .section { margin-bottom: 10px; }
    .section-title { background: linear-gradient(135deg, #c62828, #b71c1c); color: white; padding: 6px 10px; font-size: 10px; font-weight: bold; border-radius: 4px 4px 0 0; }
    
    table { width: 100%; border-collapse: collapse; font-size: 8px; }
    th { background: #f5f5f5; padding: 5px; text-align: left; border: 1px solid #ddd; font-weight: bold; }
    td { padding: 5px; border: 1px solid #ddd; }
    .bilateral-cell { display: flex; gap: 5px; }
    .side-label { font-size: 7px; color: #666; }
    
    .footer { text-align: center; font-size: 8px; color: #666; margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd; }
    .footer .brand { color: #00d9ff; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    ${logoHTML}
    <h1>🦴 MSK Screening Assessment Form (Detailed)</h1>
    <p>Comprehensive Musculoskeletal Analysis Report</p>
    ${physioSettings.clinic_phone || physioSettings.clinic_address ? `
      <div class="clinic-info">${physioSettings.clinic_phone || ''} ${physioSettings.clinic_phone && physioSettings.clinic_address ? '|' : ''} ${physioSettings.clinic_address || ''}</div>
    ` : ''}
  </div>
  
  <div class="patient-info">
    <div><label>Patient Name</label><span>${patientName || '___________'}</span></div>
    <div><label>Age</label><span>${patientAge || '___'}</span></div>
    <div><label>Date</label><span>${currentDate}</span></div>
    <div><label>Assessor</label><span>${assessorName || currentUser?.name || '___________'}</span></div>
    <div><label>Completion</label><span>${completion}%</span></div>
    <div><label>Report ID</label><span style="font-size: 8px;">${reportId}</span></div>
  </div>
  
  ${MSK_CATEGORIES.map(category => `
    <div class="section">
      <div class="section-title">${category.name}</div>
      <table>
        <thead>
          <tr>
            <th style="width: 30%;">Test</th>
            <th style="width: 15%;">Left</th>
            <th style="width: 15%;">Right</th>
            <th style="width: 20%;">Comments</th>
            <th style="width: 20%;">Reference</th>
          </tr>
        </thead>
        <tbody>
          ${category.tests.map(test => {
            const m = measurements[test.id] || {};
            return `
              <tr>
                <td><strong>${test.name}</strong></td>
                <td>${test.bilateral ? (m.left || '-') + (test.unit ? ' ' + test.unit : '') : (m.value || '-') + (test.unit ? ' ' + test.unit : '')}</td>
                <td>${test.bilateral ? (m.right || '-') + (test.unit ? ' ' + test.unit : '') : '-'}</td>
                <td>${m.comments || '-'}</td>
                <td style="font-size: 7px; color: #666;">${test.reference}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `).join('')}
  
  ${injuryHistory || pastInjury ? `
    <div class="section">
      <div class="section-title">HISTORY & BACKGROUND</div>
      <table>
        <tr><td><strong>Injury History:</strong> ${injuryHistory || '-'}</td></tr>
        <tr><td><strong>Past Injury:</strong> ${pastInjury || '-'}</td></tr>
        <tr><td><strong>Matches Played:</strong> ${matchesPlayed || '-'}</td></tr>
        <tr><td><strong>Missed Matches:</strong> ${missedMatches || '-'}</td></tr>
        <tr><td><strong>Specialty:</strong> ${specialty || '-'}</td></tr>
      </table>
    </div>
  ` : ''}
  
  ${notes ? `
    <div class="section">
      <div class="section-title">CLINICAL NOTES & RECOMMENDATIONS</div>
      <p style="padding: 10px; background: #fff3e0; border-radius: 5px;">${notes}</p>
    </div>
  ` : ''}

  ${paymentHTML}
  
  <div style="margin-top: 20px; display: flex; justify-content: space-between;">
    <div><p style="font-size: 8px;">Signature: ___________________</p></div>
    <div><p style="font-size: 8px;">Date: ___________________</p></div>
  </div>
  
  <div class="footer">
    <p>Generated by <span class="brand">WBA99</span> MSK Assessment System | Report ID: ${reportId}</p>
    <p>This report is for professional use only. Consult a qualified healthcare provider for medical advice.</p>
    <p>© ${new Date().getFullYear()} WBA99 Expert Analysis India</p>
  </div>
</body>
</html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>MSK Assessment 2</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {userCredits !== null && userCredits >= 0 && (
              <View style={{ marginRight: 12, backgroundColor: theme.colors.accent + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ color: theme.colors.accent, fontWeight: '600', fontSize: 12 }}>💰 {userCredits}</Text>
              </View>
            )}
            <TouchableOpacity onPress={handleGenerateReport} disabled={generatingPDF}>
              {generatingPDF ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Ionicons name="document-text" size={24} color={theme.colors.accent} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Version Switcher */}
        <View style={styles.versionSwitcher}>
          <TouchableOpacity 
            style={styles.versionTab}
            onPress={() => router.push('/assessment/msk')}
          >
            <Text style={styles.versionTabText}>MSK Standard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.versionTab, styles.versionTabActive]}>
            <Text style={[styles.versionTabText, styles.versionTabTextActive]}>MSK Detailed</Text>
          </TouchableOpacity>
        </View>

        {/* Patient Info */}
        <View style={styles.patientSection}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          
          {/* Patient Selector */}
          <Text style={styles.inputLabel}>Select Patient *</Text>
          <TouchableOpacity style={styles.patientSelector} onPress={() => setShowPatientModal(true)}>
            {selectedPatient ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name="person" size={24} color={theme.colors.accent} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 16, fontWeight: '600' }}>{selectedPatient.name}</Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{selectedPatient.email}</Text>
                </View>
                <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name="person-add" size={24} color={theme.colors.textMuted} />
                <Text style={{ marginLeft: 12, color: theme.colors.textMuted, flex: 1 }}>Select a patient</Text>
                <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
              </View>
            )}
          </TouchableOpacity>

          {/* Loading Previous Assessment Indicator */}
          {loadingPreviousAssessment && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.accent + '20', padding: 12, borderRadius: 8, marginTop: 8 }}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={{ marginLeft: 8, color: theme.colors.accent, fontSize: 14 }}>Loading previous assessment...</Text>
            </View>
          )}

          {/* Previous Assessment Info */}
          {previousAssessment && !loadingPreviousAssessment && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.success + '20', padding: 12, borderRadius: 8, marginTop: 8 }}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={{ color: theme.colors.success, fontSize: 14, fontWeight: '600' }}>Previous Assessment Loaded</Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  From {new Date(previousAssessment.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}
          
          <View style={styles.inputRow}>
            <View style={[styles.inputContainer, { flex: 0.3 }]}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.input}
                value={patientAge}
                onChangeText={setPatientAge}
                placeholder="Age"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Assessor Name</Text>
              <TextInput
                style={styles.input}
                value={assessorName}
                onChangeText={setAssessorName}
                placeholder="Enter assessor name"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          </View>
        </View>

        {/* Completion Progress */}
        <View style={styles.progressCard}>
          <Text style={styles.progressLabel}>Overall Completion</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${getTotalCompletion()}%` }]} />
          </View>
          <Text style={styles.progressPercent}>{getTotalCompletion()}%</Text>
        </View>

        {/* Test Categories */}
        {MSK_CATEGORIES.map(category => (
          <View key={category.id} style={styles.categoryCard}>
            <TouchableOpacity
              style={[styles.categoryHeader, { borderLeftColor: category.color }]}
              onPress={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
            >
              <View style={styles.categoryTitleRow}>
                <Ionicons name={category.icon as any} size={20} color={category.color} />
                <Text style={styles.categoryTitle}>{category.name}</Text>
              </View>
              <View style={styles.categoryMeta}>
                <Text style={styles.categoryCount}>
                  {getCompletedCount(category.id)}/{category.tests.length}
                </Text>
                <Ionicons 
                  name={expandedCategory === category.id ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={theme.colors.textMuted} 
                />
              </View>
            </TouchableOpacity>

            {expandedCategory === category.id && (
              <View style={styles.testsContainer}>
                {category.tests.map(test => (
                  <View key={test.id} style={styles.testCard}>
                    <Text style={styles.testName}>{test.name}</Text>
                    <Text style={styles.testReference}>Ref: {test.reference}</Text>
                    
                    {test.bilateral ? (
                      <View style={styles.bilateralInputs}>
                        <View style={styles.sideInput}>
                          <Text style={styles.sideLabel}>LEFT</Text>
                          <TextInput
                            style={styles.measureInput}
                            value={measurements[test.id]?.left || ''}
                            onChangeText={(v) => updateMeasurement(test.id, 'left', v)}
                            placeholder={test.unit || '-'}
                            placeholderTextColor={theme.colors.textMuted}
                            keyboardType={test.unit === '°' || test.unit === 'cm' || test.unit === 'sec' ? 'numeric' : 'default'}
                          />
                        </View>
                        <View style={styles.sideInput}>
                          <Text style={styles.sideLabel}>RIGHT</Text>
                          <TextInput
                            style={styles.measureInput}
                            value={measurements[test.id]?.right || ''}
                            onChangeText={(v) => updateMeasurement(test.id, 'right', v)}
                            placeholder={test.unit || '-'}
                            placeholderTextColor={theme.colors.textMuted}
                            keyboardType={test.unit === '°' || test.unit === 'cm' || test.unit === 'sec' ? 'numeric' : 'default'}
                          />
                        </View>
                      </View>
                    ) : (
                      <TextInput
                        style={styles.singleInput}
                        value={measurements[test.id]?.value || ''}
                        onChangeText={(v) => updateMeasurement(test.id, 'value', v)}
                        placeholder={`Enter ${test.unit || 'value'}`}
                        placeholderTextColor={theme.colors.textMuted}
                        keyboardType={test.unit === '°' || test.unit === 'cm' || test.unit === 'sec' ? 'numeric' : 'default'}
                      />
                    )}
                    
                    <TextInput
                      style={styles.commentInput}
                      value={measurements[test.id]?.comments || ''}
                      onChangeText={(v) => updateMeasurement(test.id, 'comments', v)}
                      placeholder="Comments (optional)"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* History Section */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>History</Text>
          <View style={styles.historyGrid}>
            <View style={styles.historyItem}>
              <Text style={styles.historyLabel}>Injury History</Text>
              <TextInput
                style={styles.historyInput}
                value={injuryHistory}
                onChangeText={setInjuryHistory}
                placeholder="Yes/No + Details"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <View style={styles.historyItem}>
              <Text style={styles.historyLabel}>Past Injury</Text>
              <TextInput
                style={styles.historyInput}
                value={pastInjury}
                onChangeText={setPastInjury}
                placeholder="Details"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <View style={styles.historyItem}>
              <Text style={styles.historyLabel}>Matches Played</Text>
              <TextInput
                style={styles.historyInput}
                value={matchesPlayed}
                onChangeText={setMatchesPlayed}
                placeholder="Number"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.historyItem}>
              <Text style={styles.historyLabel}>Missed Matches</Text>
              <TextInput
                style={styles.historyInput}
                value={missedMatches}
                onChangeText={setMissedMatches}
                placeholder="Number"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Clinical Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Enter clinical observations..."
            placeholderTextColor={theme.colors.textMuted}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Generate PDF Button */}
        <TouchableOpacity
          style={[styles.generateButton, generatingPDF && styles.buttonDisabled]}
          onPress={handleGenerateReport}
          disabled={generatingPDF}
        >
          {generatingPDF ? (
            <ActivityIndicator color={theme.colors.textPrimary} />
          ) : (
            <>
              <Ionicons name="document-text" size={24} color={theme.colors.textPrimary} />
              <Text style={styles.generateButtonText}>
                {paymentVerified ? 'Generate PDF Report' : 'Pay & Generate Report'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Save Assessment Button */}
        <TouchableOpacity
          style={[styles.saveButton, (savingAssessment || assessmentSaved) && styles.buttonDisabled]}
          onPress={saveAssessment}
          disabled={savingAssessment || assessmentSaved}
        >
          {savingAssessment ? (
            <ActivityIndicator color={theme.colors.textPrimary} />
          ) : (
            <>
              <Ionicons name={assessmentSaved ? "checkmark-circle" : "save"} size={24} color={theme.colors.textPrimary} />
              <Text style={styles.saveButtonText}>
                {assessmentSaved ? 'Assessment Saved' : 'Save Assessment'}
              </Text>
            </>
          )}
        </TouchableOpacity>

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

        {/* Patient Selection Modal */}
        <Modal visible={showPatientModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Patient</Text>
                <TouchableOpacity onPress={() => setShowPatientModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>
              
              {/* Search Bar */}
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                backgroundColor: theme.colors.primaryLight, 
                borderRadius: 8, 
                paddingHorizontal: 12, 
                marginBottom: 12 
              }}>
                <Ionicons name="search" size={20} color={theme.colors.textMuted} />
                <TextInput
                  style={{ 
                    flex: 1, 
                    paddingVertical: 10, 
                    paddingHorizontal: 8, 
                    color: theme.colors.textPrimary 
                  }}
                  placeholder="Search patients..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={patientSearchQuery}
                  onChangeText={setPatientSearchQuery}
                />
                {patientSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setPatientSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Add Patient Button */}
              <TouchableOpacity 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: theme.colors.accent, 
                  paddingVertical: 10, 
                  borderRadius: 8, 
                  marginBottom: 12,
                  gap: 8 
                }}
                onPress={() => { setShowPatientModal(false); router.push('/physio/add-patient'); }}
              >
                <Ionicons name="add-circle" size={20} color={theme.colors.primary} />
                <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Add New Patient</Text>
              </TouchableOpacity>
              
              {patients.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 20 }}>
                  <Ionicons name="people-outline" size={48} color={theme.colors.textMuted} />
                  <Text style={{ color: theme.colors.textMuted, marginTop: 12 }}>No patients found</Text>
                </View>
              ) : (
                <FlatList
                  data={patients
                    .filter(p => 
                      patientSearchQuery.length === 0 || 
                      p.name?.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
                      p.email?.toLowerCase().includes(patientSearchQuery.toLowerCase())
                    )
                    .sort((a, b) => {
                      // Sort by created_at descending (newest first)
                      const dateA = new Date(a.created_at || 0).getTime();
                      const dateB = new Date(b.created_at || 0).getTime();
                      return dateB - dateA;
                    })
                  }
                  keyExtractor={(item) => item.id}
                  style={{ maxHeight: 350 }}
                  showsVerticalScrollIndicator={true}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        backgroundColor: selectedPatient?.id === item.id ? theme.colors.accent + '20' : 'transparent',
                        borderRadius: 8,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: selectedPatient?.id === item.id ? theme.colors.accent : theme.colors.cardBorder,
                      }}
                      onPress={() => handlePatientSelect(item)}
                    >
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: theme.colors.accent + '30',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Text style={{ color: theme.colors.accent, fontWeight: 'bold' }}>
                          {item.name?.charAt(0)?.toUpperCase() || 'P'}
                        </Text>
                      </View>
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>{item.name}</Text>
                        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{item.email}</Text>
                        {index === 0 && (
                          <View style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            marginTop: 4 
                          }}>
                            <Text style={{ 
                              color: theme.colors.success, 
                              fontSize: 10, 
                              backgroundColor: theme.colors.success + '20',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}>NEW</Text>
                          </View>
                        )}
                      </View>
                      {selectedPatient?.id === item.id && (
                        <Ionicons name="checkmark-circle" size={24} color={theme.colors.accent} />
                      )}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={{ alignItems: 'center', padding: 20 }}>
                      <Text style={{ color: theme.colors.textMuted }}>No patients match your search</Text>
                    </View>
                  }
                />
              )}
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  backButton: { padding: theme.spacing.xs },
  headerTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  
  versionSwitcher: { flexDirection: 'row', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: 4, marginBottom: theme.spacing.md },
  versionTab: { flex: 1, paddingVertical: theme.spacing.sm, alignItems: 'center', borderRadius: theme.borderRadius.sm },
  versionTabActive: { backgroundColor: '#c62828' },
  versionTabText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  versionTabTextActive: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },
  
  patientSection: {
    backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md, marginBottom: theme.spacing.md,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
  },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  inputRow: { flexDirection: 'row', gap: theme.spacing.sm },
  inputContainer: { flex: 1, marginBottom: theme.spacing.sm },
  inputLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm, color: theme.colors.textPrimary, fontSize: theme.fontSize.md,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
  },
  
  progressCard: {
    backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md, marginBottom: theme.spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
  },
  progressLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  progressBar: { flex: 1, height: 8, backgroundColor: theme.colors.primaryLight, borderRadius: 4 },
  progressFill: { height: '100%', backgroundColor: '#c62828', borderRadius: 4 },
  progressPercent: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: '#c62828' },
  
  categoryCard: {
    backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm, overflow: 'hidden',
    borderWidth: 1, borderColor: theme.colors.cardBorder,
  },
  categoryHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: theme.spacing.md, borderLeftWidth: 4,
  },
  categoryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  categoryTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  categoryMeta: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  categoryCount: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  
  testsContainer: { padding: theme.spacing.md, paddingTop: 0 },
  testCard: {
    backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm, marginBottom: theme.spacing.sm,
  },
  testName: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  testReference: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginBottom: theme.spacing.xs },
  
  bilateralInputs: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  sideInput: { flex: 1 },
  sideLabel: { fontSize: 10, color: theme.colors.textMuted, marginBottom: 2 },
  measureInput: {
    backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.xs, color: theme.colors.textPrimary, fontSize: theme.fontSize.sm,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
  },
  singleInput: {
    backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.xs, color: theme.colors.textPrimary, fontSize: theme.fontSize.sm,
    borderWidth: 1, borderColor: theme.colors.cardBorder, marginTop: theme.spacing.xs,
  },
  commentInput: {
    backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.xs, color: theme.colors.textPrimary, fontSize: theme.fontSize.xs,
    borderWidth: 1, borderColor: theme.colors.cardBorder, marginTop: theme.spacing.xs,
  },
  
  historySection: {
    backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md, marginTop: theme.spacing.md,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
  },
  historyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  historyItem: { width: '48%' },
  historyLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, marginBottom: 4 },
  historyInput: {
    backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm, color: theme.colors.textPrimary, fontSize: theme.fontSize.sm,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
  },
  
  notesSection: {
    backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md, marginTop: theme.spacing.md,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
  },
  notesInput: {
    backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm, color: theme.colors.textPrimary, fontSize: theme.fontSize.sm,
    borderWidth: 1, borderColor: theme.colors.cardBorder, minHeight: 100, textAlignVertical: 'top',
  },
  
  generateButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#c62828', padding: theme.spacing.md, borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg, gap: theme.spacing.sm,
  },
  buttonDisabled: { opacity: 0.7 },
  generateButtonText: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2196F3', padding: theme.spacing.md, borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm, gap: theme.spacing.sm,
  },
  saveButtonText: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },

  // Payment Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.xl, width: '100%', maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.lg, textAlign: 'center',
  },
  qrImage: {
    width: 200, height: 200, alignSelf: 'center', marginBottom: theme.spacing.lg, borderRadius: theme.borderRadius.md,
  },
  screenshotButton: {
    backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.xl,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.colors.cardBorder,
    borderStyle: 'dashed', marginBottom: theme.spacing.md,
  },
  screenshotButtonText: {
    fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginTop: theme.spacing.sm,
  },
  screenshotPreview: {
    width: 150, height: 150, borderRadius: theme.borderRadius.md,
  },
  submitPaymentButton: {
    backgroundColor: theme.colors.success, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center',
  },
  submitPaymentButtonText: {
    fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary,
  },
  patientSelector: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
  },
});
