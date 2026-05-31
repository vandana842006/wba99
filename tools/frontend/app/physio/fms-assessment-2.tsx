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
import { useStore } from '../../src/store/useStore';
import api, { getPhysioPatients, saveAssessmentReport, getAssessmentReports } from '../../src/utils/api';
import PatientSelector, { Patient } from '../../src/components/PatientSelector';
import { generatePaymentSectionHTML } from '../../src/utils/pdfPaymentSection';

// FMS Tests based on the standard Functional Movement Screen
const FMS_TESTS = [
  {
    id: 'deep_squat',
    name: 'Deep Squat',
    description: 'Assess bilateral, symmetrical mobility of hips, knees, and ankles',
    bilateral: false,
    criteria: {
      3: 'Upper torso parallel with tibia or toward vertical, Femur below horizontal, Knees aligned over feet, Dowel aligned over feet',
      2: 'Upper torso parallel with tibia, Femur below horizontal, Knees aligned over feet, Dowel aligned over feet (with heel lift)',
      1: 'Tibia and upper torso not parallel, Femur not below horizontal, Knees not aligned over feet, Lumbar flexion noted',
      0: 'Pain during movement',
    },
    icon: 'body-outline',
    color: '#2196F3',
  },
  {
    id: 'hurdle_step',
    name: 'Hurdle Step',
    description: 'Assess bilateral mobility and stability of hips, knees, and ankles',
    bilateral: true,
    criteria: {
      3: 'Hips, knees, and ankles remain aligned in sagittal plane, Minimal movement noted in lumbar spine, Dowel remains parallel with hurdle',
      2: 'Alignment is lost between hips, knees, and ankles, Movement noted in lumbar spine, Dowel does not remain parallel with hurdle',
      1: 'Contact between foot and hurdle, Loss of balance noted',
      0: 'Pain during movement',
    },
    icon: 'walk-outline',
    color: '#4CAF50',
  },
  {
    id: 'inline_lunge',
    name: 'Inline Lunge',
    description: 'Assess hip and trunk mobility and stability, quad flexibility, and ankle and knee stability',
    bilateral: true,
    criteria: {
      3: 'Dowel contacts maintained, Dowel remains vertical, No torso movement noted, Dowel and feet remain in sagittal plane, Knee touches behind heel',
      2: 'Dowel contacts not maintained, Dowel does not remain vertical, Movement noted in torso, Dowel and feet do not remain in sagittal plane',
      1: 'Loss of balance noted',
      0: 'Pain during movement',
    },
    icon: 'fitness-outline',
    color: '#FF9800',
  },
  {
    id: 'shoulder_mobility',
    name: 'Shoulder Mobility',
    description: 'Assess bilateral shoulder ROM and scapular mobility',
    bilateral: true,
    criteria: {
      3: 'Fists are within one hand length',
      2: 'Fists are within one and a half hand lengths',
      1: 'Fists are not within one and a half hand lengths',
      0: 'Pain during movement',
    },
    icon: 'hand-left-outline',
    color: '#9C27B0',
    hasClearingTest: true,
    clearingTestName: 'Impingement Clearing Test',
  },
  {
    id: 'active_slr',
    name: 'Active Straight Leg Raise',
    description: 'Assess active hamstring and gastroc-soleus flexibility while maintaining stable pelvis',
    bilateral: true,
    criteria: {
      3: 'Vertical line of malleolus resides between mid-thigh and ASIS',
      2: 'Vertical line of malleolus resides between mid-thigh and mid-patella (joint line)',
      1: 'Vertical line of malleolus resides below mid-patella (joint line)',
      0: 'Pain during movement',
    },
    icon: 'resize-outline',
    color: '#E91E63',
  },
  {
    id: 'trunk_stability_pushup',
    name: 'Trunk Stability Push-Up',
    description: 'Assess trunk stability in sagittal plane while performing symmetric upper extremity motion',
    bilateral: false,
    criteria: {
      3: 'Males: thumbs aligned with top of head. Females: thumbs aligned with chin',
      2: 'Males: thumbs aligned with chin. Females: thumbs aligned with clavicle',
      1: 'Males: unable with thumbs aligned with chin. Females: unable with thumbs aligned with clavicle',
      0: 'Pain during movement',
    },
    icon: 'barbell-outline',
    color: '#FF5722',
    hasClearingTest: true,
    clearingTestName: 'Extension Clearing Test',
  },
  {
    id: 'rotary_stability',
    name: 'Rotary Stability',
    description: 'Assess multi-plane trunk stability during combined upper and lower extremity motion',
    bilateral: true,
    criteria: {
      3: 'Performs unilateral repetition, keeping spine parallel to board, knee and elbow touch in line over the board',
      2: 'Performs diagonal repetition, keeping spine parallel to board, knee and elbow touch in line over the board',
      1: 'Inability to perform diagonal repetition',
      0: 'Pain during movement',
    },
    icon: 'sync-outline',
    color: '#795548',
    hasClearingTest: true,
    clearingTestName: 'Flexion Clearing Test',
  },
];

interface TestScore {
  left?: number;
  right?: number;
  score?: number;
  clearingTest?: 'positive' | 'negative';
  comments?: string;
}

export default function FMSAssessment2() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [assessorName, setAssessorName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-IN'));
  const [scores, setScores] = useState<Record<string, TestScore>>({});
  const [notes, setNotes] = useState('');
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [expandedTest, setExpandedTest] = useState<string | null>('deep_squat');

  // Patient selector state
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const patientName = selectedPatient?.name || '';

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

  // Load previous FMS assessment for selected patient
  const loadPreviousAssessment = async (patientId: string) => {
    if (!currentUser?.id) return;
    
    setLoadingPreviousAssessment(true);
    setPreviousAssessment(null);
    
    try {
      const response = await getAssessmentReports({
        patient_id: patientId,
        assessment_type: 'fms',
      });
      
      const reports = response.data || [];
      if (reports.length > 0) {
        const latestReport = reports[0];
        setPreviousAssessment(latestReport);
        
        // Load the data into the form
        if (latestReport.report_data) {
          const data = latestReport.report_data;
          
          // Load test scores
          if (data.scores) {
            setScores(data.scores);
          }
          
          // Load clearing tests
          if (data.clearingTests) {
            setClearingTests(data.clearingTests);
          }
          
          // Load notes
          if (data.notes) {
            setNotes(data.notes);
          }
          
          Alert.alert(
            '📋 Previous Assessment Loaded',
            `Found FMS assessment from ${new Date(latestReport.created_at).toLocaleDateString()}. You can review or update the data.`,
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
    setAssessmentSaved(false);
    
    if (patient?.id) {
      loadPreviousAssessment(patient.id);
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
        patient_id: patientName,
        report_type: 'fms2',
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
      Alert.alert('Required', 'Please enter patient name');
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

  const updateScore = (testId: string, side: 'left' | 'right' | 'score', value: number) => {
    setScores(prev => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        [side]: value,
      }
    }));
  };

  const updateClearingTest = (testId: string, result: 'positive' | 'negative') => {
    setScores(prev => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        clearingTest: result,
      }
    }));
  };

  const updateComments = (testId: string, comments: string) => {
    setScores(prev => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        comments,
      }
    }));
  };

  const getTestScore = (testId: string): number => {
    const test = FMS_TESTS.find(t => t.id === testId);
    const testScore = scores[testId];
    
    if (!testScore) return 0;
    
    // If clearing test is positive, score is 0
    if (test?.hasClearingTest && testScore.clearingTest === 'positive') return 0;
    
    if (test?.bilateral) {
      // For bilateral tests, take the lower score
      const left = testScore.left ?? 0;
      const right = testScore.right ?? 0;
      return Math.min(left, right);
    }
    
    return testScore.score ?? 0;
  };

  const getTotalScore = (): number => {
    return FMS_TESTS.reduce((total, test) => total + getTestScore(test.id), 0);
  };

  const getRiskLevel = (score: number) => {
    if (score >= 17) return { level: 'LOW', color: '#4CAF50' };
    if (score >= 14) return { level: 'MODERATE', color: '#FF9800' };
    return { level: 'HIGH', color: '#f44336' };
  };

  // Save assessment to backend
  const saveAssessment = async () => {
    if (!selectedPatient) {
      Alert.alert('Required', 'Please select a patient first');
      return;
    }

    setSavingAssessment(true);
    try {
      const totalScore = getTotalScore();
      const maxScore = FMS_TESTS.length * 3;
      const percentage = Math.round((totalScore / maxScore) * 100);
      const risk = getRiskLevel(totalScore);

      const assessmentData = {
        patient_id: selectedPatient.id,
        patient_name: selectedPatient.name,
        physio_id: currentUser?.id || '',
        physio_name: currentUser?.name || '',
        assessment_type: 'fms',
        data: {
          scores,
          notes,
          assessor_name: assessorName,
          patient_age: patientAge,
          date,
          total_score: totalScore,
          max_score: maxScore,
        },
        ai_analysis: null,
        recommendations: [],
        total_score: totalScore,
        percentage,
        risk_level: risk.level.toLowerCase(),
      };

      await saveAssessmentReport(assessmentData);
      setAssessmentSaved(true);
      Alert.alert('Success', 'FMS Assessment saved successfully!');
    } catch (error) {
      console.error('Error saving assessment:', error);
      Alert.alert('Error', 'Failed to save assessment');
    } finally {
      setSavingAssessment(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score === 3) return '#4CAF50';
    if (score === 2) return '#FF9800';
    if (score === 1) return '#f44336';
    return '#9e9e9e';
  };

  const generatePDFReport = async () => {
    if (!patientName.trim()) {
      Alert.alert('Required', 'Please enter patient name');
      return;
    }
    
    setGeneratingPDF(true);
    const totalScore = getTotalScore();
    const risk = getRiskLevel(totalScore);
    const reportId = `WBA99-FMS2-${Date.now().toString(36).toUpperCase()}`;
    const currentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    // Fetch physio settings for logo
    let physioSettings = { logo_url: '', clinic_name: '', clinic_phone: '', clinic_address: '' };
    try {
      const res = await api.get(`/users/${currentUser?.id}/profile-settings`);
      physioSettings = res.data || physioSettings;
    } catch (e) {
      console.log('Could not fetch physio settings');
    }

    // Logo HTML
    const logoHTML = physioSettings.logo_url && physioSettings.logo_url.startsWith('data:image')
      ? `<img src="${physioSettings.logo_url}" style="max-height: 50px; max-width: 180px;" />`
      : `<div style="font-size: 20px; font-weight: bold; color: #9C27B0;">WBA99</div>`;

    // Clinic info
    const clinicInfo = physioSettings.clinic_name 
      ? `<div style="font-size: 10px; color: #666;">${physioSettings.clinic_name}${physioSettings.clinic_phone ? ' | ' + physioSettings.clinic_phone : ''}</div>`
      : '';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 10mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #333; }
    
    .header { text-align: center; padding: 15px; background: linear-gradient(135deg, #9C27B0, #7B1FA2); color: white; margin-bottom: 15px; border-radius: 8px; }
    .header h1 { font-size: 18px; margin-bottom: 5px; }
    .header p { font-size: 11px; opacity: 0.9; }
    
    .info-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 15px; }
    .info-box { background: #f5f5f5; padding: 10px; border-radius: 5px; text-align: center; }
    .info-label { font-size: 9px; color: #666; margin-bottom: 3px; }
    .info-value { font-size: 12px; font-weight: bold; }
    
    .score-summary { display: flex; justify-content: center; gap: 30px; margin: 20px 0; }
    .score-box { text-align: center; padding: 20px 30px; border-radius: 10px; }
    .score-box.total { background: linear-gradient(135deg, #9C27B0, #7B1FA2); color: white; }
    .score-box.risk { border: 3px solid ${risk.color}; background: ${risk.color}15; }
    .score-value { font-size: 36px; font-weight: bold; }
    .score-label { font-size: 11px; margin-top: 5px; }
    
    .test-section { margin-bottom: 15px; }
    .test-header { background: #9C27B0; color: white; padding: 8px 12px; font-size: 12px; font-weight: bold; border-radius: 5px 5px 0 0; }
    
    table { width: 100%; border-collapse: collapse; }
    th { background: #f5f5f5; padding: 8px; text-align: center; border: 1px solid #ddd; font-size: 10px; }
    td { padding: 8px; border: 1px solid #ddd; text-align: center; }
    .test-name { text-align: left; font-weight: bold; }
    
    .score-cell { font-size: 14px; font-weight: bold; }
    .score-3 { background: #e8f5e9; color: #2e7d32; }
    .score-2 { background: #fff3e0; color: #ef6c00; }
    .score-1 { background: #ffebee; color: #c62828; }
    .score-0 { background: #f5f5f5; color: #666; }
    
    .clearing-positive { background: #ffebee; color: #c62828; }
    .clearing-negative { background: #e8f5e9; color: #2e7d32; }
    
    .criteria-section { margin-top: 20px; }
    .criteria-box { background: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 10px; }
    .criteria-title { font-weight: bold; color: #9C27B0; margin-bottom: 5px; }
    .criteria-item { padding: 3px 0; font-size: 9px; }
    
    .footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 2px solid #9C27B0; font-size: 9px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px;">
      ${logoHTML}
      <div style="text-align: center;">
        <h1 style="font-size: 16px; margin: 0;">🏃 FUNCTIONAL MOVEMENT SCREEN (FMS)</h1>
        <p style="font-size: 10px; margin: 5px 0 0 0;">WBA99 Comprehensive Movement Assessment Report</p>
        ${clinicInfo}
      </div>
      <div style="text-align: right; font-size: 9px; color: white;">
        <div>Report ID: ${reportId}</div>
        <div>${currentDate}</div>
      </div>
    </div>
  </div>
  
  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">PATIENT NAME</div>
      <div class="info-value">${patientName || '___________'}</div>
    </div>
    <div class="info-box">
      <div class="info-label">AGE</div>
      <div class="info-value">${patientAge || '___'}</div>
    </div>
    <div class="info-box">
      <div class="info-label">DATE</div>
      <div class="info-value">${currentDate}</div>
    </div>
    <div class="info-box">
      <div class="info-label">ASSESSOR</div>
      <div class="info-value">${assessorName || '___________'}</div>
    </div>
    <div class="info-box">
      <div class="info-label">REPORT ID</div>
      <div class="info-value">${reportId}</div>
    </div>
  </div>
  
  <div class="score-summary">
    <div class="score-box total">
      <div class="score-value">${totalScore}</div>
      <div class="score-label">TOTAL SCORE (out of 21)</div>
    </div>
    <div class="score-box risk">
      <div class="score-value" style="color: ${risk.color}">${risk.level}</div>
      <div class="score-label">INJURY RISK LEVEL</div>
    </div>
  </div>
  
  <div class="test-section">
    <div class="test-header">📋 FMS TEST RESULTS</div>
    <table>
      <thead>
        <tr>
          <th style="width: 25%;">TEST</th>
          <th style="width: 12%;">LEFT</th>
          <th style="width: 12%;">RIGHT</th>
          <th style="width: 12%;">FINAL</th>
          <th style="width: 15%;">CLEARING</th>
          <th style="width: 24%;">COMMENTS</th>
        </tr>
      </thead>
      <tbody>
        ${FMS_TESTS.map(test => {
          const testScore = scores[test.id] || {};
          const finalScore = getTestScore(test.id);
          const scoreClass = `score-${finalScore}`;
          
          return `
            <tr>
              <td class="test-name">${test.name}</td>
              <td class="score-cell ${test.bilateral ? `score-${testScore.left || 0}` : 'score-0'}">${test.bilateral ? (testScore.left ?? '-') : '-'}</td>
              <td class="score-cell ${test.bilateral ? `score-${testScore.right || 0}` : 'score-0'}">${test.bilateral ? (testScore.right ?? '-') : '-'}</td>
              <td class="score-cell ${scoreClass}">${!test.bilateral ? (testScore.score ?? '-') : finalScore}</td>
              <td class="${testScore.clearingTest === 'positive' ? 'clearing-positive' : testScore.clearingTest === 'negative' ? 'clearing-negative' : ''}">
                ${test.hasClearingTest ? (testScore.clearingTest === 'positive' ? '+ POSITIVE' : testScore.clearingTest === 'negative' ? '- NEGATIVE' : '-') : 'N/A'}
              </td>
              <td style="font-size: 9px; text-align: left;">${testScore.comments || '-'}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>
  
  <div class="criteria-section">
    <div class="test-header">📖 SCORING CRITERIA REFERENCE</div>
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px;">
      ${FMS_TESTS.map(test => `
        <div class="criteria-box">
          <div class="criteria-title">${test.name}</div>
          ${Object.entries(test.criteria).map(([score, desc]) => `
            <div class="criteria-item"><strong>${score}:</strong> ${desc}</div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  </div>
  
  ${notes ? `
    <div style="margin-top: 15px; background: #fff3e0; padding: 15px; border-radius: 8px; border-left: 4px solid #FF9800;">
      <div style="font-weight: bold; color: #e65100; margin-bottom: 5px;">📝 Clinical Notes</div>
      <p>${notes}</p>
    </div>
  ` : ''}
  
  <!-- AI Biomechanics Analysis Section -->
  <div style="background: linear-gradient(135deg, #1a237e, #311b92); border-radius: 12px; padding: 20px; margin-top: 15px; color: white; page-break-inside: avoid;">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
      <span style="font-size: 20px;">🔬</span>
      <span style="font-size: 16px; font-weight: bold;">AI Functional Movement Analysis</span>
      <span style="background: #00e676; color: #1a237e; padding: 3px 10px; border-radius: 15px; font-size: 9px; font-weight: bold; margin-left: auto;">AI POWERED</span>
    </div>
    <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; margin-bottom: 10px;">
      <div style="font-size: 11px; font-weight: bold; margin-bottom: 6px;">📊 Movement Pattern Assessment</div>
      <div style="font-size: 10px; opacity: 0.9;">FMS identifies functional limitations and asymmetries that may increase injury risk. AI analysis provides personalized corrective exercise recommendations.</div>
    </div>
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
      <div style="background: rgba(255,255,255,0.1); border-radius: 6px; padding: 8px; text-align: center;">
        <div style="font-size: 14px; margin-bottom: 3px;">🏃</div>
        <div style="font-size: 8px; font-weight: bold;">Mobility</div>
      </div>
      <div style="background: rgba(255,255,255,0.1); border-radius: 6px; padding: 8px; text-align: center;">
        <div style="font-size: 14px; margin-bottom: 3px;">💪</div>
        <div style="font-size: 8px; font-weight: bold;">Stability</div>
      </div>
      <div style="background: rgba(255,255,255,0.1); border-radius: 6px; padding: 8px; text-align: center;">
        <div style="font-size: 14px; margin-bottom: 3px;">⚖️</div>
        <div style="font-size: 8px; font-weight: bold;">Symmetry</div>
      </div>
      <div style="background: rgba(255,255,255,0.1); border-radius: 6px; padding: 8px; text-align: center;">
        <div style="font-size: 14px; margin-bottom: 3px;">🎯</div>
        <div style="font-size: 8px; font-weight: bold;">Control</div>
      </div>
    </div>
  </div>
  
  <!-- DOs and DON'Ts Section -->
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
    <div style="background: linear-gradient(135deg, #e8f5e9, #c8e6c9); border-radius: 10px; padding: 15px; border-left: 4px solid #4CAF50;">
      <div style="font-size: 14px; font-weight: bold; color: #2e7d32; margin-bottom: 10px;">✅ DOs - Corrective Actions</div>
      <ul style="margin: 0; padding-left: 15px; font-size: 10px; color: #333;">
        <li style="margin-bottom: 5px;">Focus on corrective exercises for patterns scoring 1 or 2</li>
        <li style="margin-bottom: 5px;">Address asymmetries before adding load or intensity</li>
        <li style="margin-bottom: 5px;">Progress mobility work before stability training</li>
        <li style="margin-bottom: 5px;">Perform daily movement prep and activation</li>
        <li style="margin-bottom: 5px;">Re-test after 4-6 weeks of corrective work</li>
        <li style="margin-bottom: 5px;">Maintain proper breathing during all movements</li>
      </ul>
    </div>
    <div style="background: linear-gradient(135deg, #ffebee, #ffcdd2); border-radius: 10px; padding: 15px; border-left: 4px solid #f44336;">
      <div style="font-size: 14px; font-weight: bold; color: #c62828; margin-bottom: 10px;">❌ DON'Ts - Avoid These</div>
      <ul style="margin: 0; padding-left: 15px; font-size: 10px; color: #333;">
        <li style="margin-bottom: 5px;">Don't load dysfunctional movement patterns</li>
        <li style="margin-bottom: 5px;">Avoid high-intensity training with score of 0 (pain)</li>
        <li style="margin-bottom: 5px;">Don't ignore clearing test positive results</li>
        <li style="margin-bottom: 5px;">Avoid compensation patterns during exercises</li>
        <li style="margin-bottom: 5px;">Don't skip warm-up and mobility work</li>
        <li style="margin-bottom: 5px;">Avoid rushing through corrective progressions</li>
      </ul>
    </div>
  </div>
  
  <div style="margin-top: 20px; display: flex; justify-content: space-between;">
    <div><p>Therapist Signature: ___________________</p></div>
    <div><p>Date: ___________________</p></div>
  </div>
  
  ${generatePaymentSectionHTML('#FF5722')}
  
  <div class="footer">
    <p><strong>Disclaimer:</strong> FMS is a screening tool, not a diagnostic tool. Scores of 1 indicate dysfunction that should be addressed. Pain (score of 0) requires medical evaluation.</p>
    <p style="margin-top: 5px;">Generated by WBA99 FMS Assessment System | © 2025 WBA99 Expert Analysis India | www.wba99.com</p>
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

  const ScoreButton = ({ value, selected, onPress, color }: { value: number; selected: boolean; onPress: () => void; color: string }) => (
    <TouchableOpacity
      style={[styles.scoreButton, selected && { backgroundColor: color, borderColor: color }]}
      onPress={onPress}
    >
      <Text style={[styles.scoreButtonText, selected && { color: 'white' }]}>{value}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>FMS Assessment 2</Text>
          <TouchableOpacity onPress={generatePDFReport} disabled={generatingPDF}>
            {generatingPDF ? (
              <ActivityIndicator size="small" color="#9C27B0" />
            ) : (
              <Ionicons name="document-text" size={24} color="#9C27B0" />
            )}
          </TouchableOpacity>
        </View>

        {/* Version Switcher */}
        <View style={styles.versionSwitcher}>
          <TouchableOpacity 
            style={styles.versionTab}
            onPress={() => router.push('/physio/fms-assessment')}
          >
            <Text style={styles.versionTabText}>FMS Standard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.versionTab, styles.versionTabActive]}>
            <Text style={[styles.versionTabText, styles.versionTabTextActive]}>FMS Extended</Text>
          </TouchableOpacity>
        </View>

        {/* Patient Info */}
        <View style={styles.patientSection}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputContainer}>
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
            </View>
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

        {/* Score Summary */}
        <View style={styles.scoreSummary}>
          <View style={[styles.totalScoreCard, { backgroundColor: '#9C27B0' }]}>
            <Text style={styles.totalScoreValue}>{getTotalScore()}</Text>
            <Text style={styles.totalScoreLabel}>/ 21</Text>
          </View>
          <View style={[styles.riskCard, { borderColor: getRiskLevel(getTotalScore()).color }]}>
            <Text style={[styles.riskValue, { color: getRiskLevel(getTotalScore()).color }]}>
              {getRiskLevel(getTotalScore()).level}
            </Text>
            <Text style={styles.riskLabel}>Injury Risk</Text>
          </View>
        </View>

        {/* Scoring Guide */}
        <View style={styles.scoringGuide}>
          {[3, 2, 1, 0].map(score => (
            <View key={score} style={styles.guideItem}>
              <View style={[styles.guideCircle, { backgroundColor: getScoreColor(score) }]}>
                <Text style={styles.guideScore}>{score}</Text>
              </View>
              <Text style={styles.guideText}>
                {score === 3 ? 'Optimal' : score === 2 ? 'Acceptable' : score === 1 ? 'Dysfunction' : 'Pain'}
              </Text>
            </View>
          ))}
        </View>

        {/* FMS Tests */}
        {FMS_TESTS.map(test => (
          <View key={test.id} style={styles.testCard}>
            <TouchableOpacity
              style={[styles.testHeader, { borderLeftColor: test.color }]}
              onPress={() => setExpandedTest(expandedTest === test.id ? null : test.id)}
            >
              <View style={styles.testTitleRow}>
                <Ionicons name={test.icon as any} size={20} color={test.color} />
                <View>
                  <Text style={styles.testName}>{test.name}</Text>
                  <Text style={styles.testDesc}>{test.description}</Text>
                </View>
              </View>
              <View style={styles.testScoreBadge}>
                <Text style={[styles.testScoreText, { color: getScoreColor(getTestScore(test.id)) }]}>
                  {getTestScore(test.id)}/3
                </Text>
                <Ionicons 
                  name={expandedTest === test.id ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={theme.colors.textMuted} 
                />
              </View>
            </TouchableOpacity>

            {expandedTest === test.id && (
              <View style={styles.testContent}>
                {test.bilateral ? (
                  <View style={styles.bilateralScoring}>
                    {['left', 'right'].map(side => (
                      <View key={side} style={styles.sideScoring}>
                        <Text style={styles.sideLabel}>{side.toUpperCase()}</Text>
                        <View style={styles.scoreButtons}>
                          {[0, 1, 2, 3].map(score => (
                            <ScoreButton
                              key={score}
                              value={score}
                              selected={scores[test.id]?.[side as 'left' | 'right'] === score}
                              onPress={() => updateScore(test.id, side as 'left' | 'right', score)}
                              color={getScoreColor(score)}
                            />
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.singleScoring}>
                    <Text style={styles.sideLabel}>SCORE</Text>
                    <View style={styles.scoreButtons}>
                      {[0, 1, 2, 3].map(score => (
                        <ScoreButton
                          key={score}
                          value={score}
                          selected={scores[test.id]?.score === score}
                          onPress={() => updateScore(test.id, 'score', score)}
                          color={getScoreColor(score)}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {test.hasClearingTest && (
                  <View style={styles.clearingTest}>
                    <Text style={styles.clearingLabel}>{test.clearingTestName}</Text>
                    <View style={styles.clearingButtons}>
                      <TouchableOpacity
                        style={[
                          styles.clearingButton,
                          scores[test.id]?.clearingTest === 'negative' && styles.clearingNegative
                        ]}
                        onPress={() => updateClearingTest(test.id, 'negative')}
                      >
                        <Text style={styles.clearingButtonText}>- Negative</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.clearingButton,
                          scores[test.id]?.clearingTest === 'positive' && styles.clearingPositive
                        ]}
                        onPress={() => updateClearingTest(test.id, 'positive')}
                      >
                        <Text style={styles.clearingButtonText}>+ Positive</Text>
                      </TouchableOpacity>
                    </View>
                    {scores[test.id]?.clearingTest === 'positive' && (
                      <Text style={styles.clearingWarning}>⚠️ Positive clearing test = Final score of 0</Text>
                    )}
                  </View>
                )}

                <TextInput
                  style={styles.commentInput}
                  value={scores[test.id]?.comments || ''}
                  onChangeText={(v) => updateComments(test.id, v)}
                  placeholder="Add observations/comments..."
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                />

                {/* Criteria Reference */}
                <View style={styles.criteriaBox}>
                  <Text style={styles.criteriaTitle}>Scoring Criteria:</Text>
                  {Object.entries(test.criteria).map(([score, desc]) => (
                    <Text key={score} style={styles.criteriaItem}>
                      <Text style={{ fontWeight: 'bold', color: getScoreColor(parseInt(score)) }}>{score}: </Text>
                      {desc}
                    </Text>
                  ))}
                </View>
              </View>
            )}
          </View>
        ))}

        {/* Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Additional Notes</Text>
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
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="document-text" size={24} color="white" />
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
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name={assessmentSaved ? "checkmark-circle" : "save"} size={24} color="white" />
              <Text style={styles.saveButtonText}>
                {assessmentSaved ? 'Assessment Saved' : 'Save Assessment'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Payment Modal */}
        <Modal visible={showPaymentModal} animationType="slide" transparent={true}>
          <View style={styles.paymentModalOverlay}>
            <View style={styles.paymentModalContent}>
              <View style={styles.paymentModalHeader}>
                <Text style={styles.paymentModalTitle}>Payment Required</Text>
                <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.paymentModalSubtitle}>
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
              
              {patients.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 20 }}>
                  <Ionicons name="people-outline" size={48} color={theme.colors.textMuted} />
                  <Text style={{ color: theme.colors.textMuted, marginTop: 12 }}>No patients found</Text>
                  <TouchableOpacity 
                    style={{ marginTop: 12, backgroundColor: theme.colors.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
                    onPress={() => { setShowPatientModal(false); router.push('/physio/add-patient'); }}
                  >
                    <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>Add Patient</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={patients}
                  keyExtractor={(item) => item.id}
                  style={{ maxHeight: 300 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        backgroundColor: selectedPatient?.id === item.id ? theme.colors.accent + '20' : 'transparent',
                        borderRadius: 8,
                        marginBottom: 8,
                      }}
                      onPress={() => handlePatientSelect(item)}
                    >
                      <Ionicons name="person" size={24} color={theme.colors.accent} />
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>{item.name}</Text>
                        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{item.email}</Text>
                      </View>
                      {selectedPatient?.id === item.id && (
                        <Ionicons name="checkmark-circle" size={24} color={theme.colors.accent} />
                      )}
                    </TouchableOpacity>
                  )}
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
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  backButton: { padding: theme.spacing.xs },
  headerTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  
  versionSwitcher: { flexDirection: 'row', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: 4, marginBottom: theme.spacing.md },
  versionTab: { flex: 1, paddingVertical: theme.spacing.sm, alignItems: 'center', borderRadius: theme.borderRadius.sm },
  versionTabActive: { backgroundColor: '#9C27B0' },
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
  
  scoreSummary: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.lg, marginBottom: theme.spacing.md },
  totalScoreCard: {
    padding: theme.spacing.lg, borderRadius: theme.borderRadius.lg,
    alignItems: 'center', minWidth: 100,
  },
  totalScoreValue: { fontSize: 36, fontWeight: 'bold', color: 'white' },
  totalScoreLabel: { fontSize: theme.fontSize.md, color: 'rgba(255,255,255,0.8)' },
  riskCard: {
    padding: theme.spacing.lg, borderRadius: theme.borderRadius.lg,
    alignItems: 'center', minWidth: 100, borderWidth: 3, backgroundColor: theme.colors.card,
  },
  riskValue: { fontSize: 24, fontWeight: 'bold' },
  riskLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  
  scoringGuide: {
    flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.md,
    marginBottom: theme.spacing.md, padding: theme.spacing.sm,
    backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md,
  },
  guideItem: { alignItems: 'center', gap: 4 },
  guideCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  guideScore: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  guideText: { fontSize: 10, color: theme.colors.textMuted },
  
  testCard: {
    backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm, overflow: 'hidden',
    borderWidth: 1, borderColor: theme.colors.cardBorder,
  },
  testHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: theme.spacing.md, borderLeftWidth: 4,
  },
  testTitleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flex: 1 },
  testName: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  testDesc: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: 2 },
  testScoreBadge: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  testScoreText: { fontSize: theme.fontSize.lg, fontWeight: 'bold' },
  
  testContent: { padding: theme.spacing.md, paddingTop: 0 },
  
  bilateralScoring: { flexDirection: 'row', gap: theme.spacing.md },
  sideScoring: { flex: 1 },
  singleScoring: { marginBottom: theme.spacing.sm },
  sideLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginBottom: 8, fontWeight: 'bold' },
  scoreButtons: { flexDirection: 'row', gap: theme.spacing.xs },
  scoreButton: {
    flex: 1, padding: theme.spacing.sm, borderRadius: theme.borderRadius.sm,
    alignItems: 'center', borderWidth: 2, borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.primaryLight,
  },
  scoreButtonText: { fontSize: theme.fontSize.lg, fontWeight: 'bold', color: theme.colors.textPrimary },
  
  clearingTest: { marginTop: theme.spacing.md, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.cardBorder },
  clearingLabel: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.colors.textSecondary, marginBottom: 8 },
  clearingButtons: { flexDirection: 'row', gap: theme.spacing.sm },
  clearingButton: {
    flex: 1, padding: theme.spacing.sm, borderRadius: theme.borderRadius.sm,
    alignItems: 'center', backgroundColor: theme.colors.primaryLight,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
  },
  clearingButtonText: { fontSize: theme.fontSize.sm, color: theme.colors.textPrimary },
  clearingNegative: { backgroundColor: '#e8f5e9', borderColor: '#4CAF50' },
  clearingPositive: { backgroundColor: '#ffebee', borderColor: '#f44336' },
  clearingWarning: { fontSize: theme.fontSize.xs, color: '#f44336', marginTop: 8, textAlign: 'center' },
  
  commentInput: {
    backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm, color: theme.colors.textPrimary, fontSize: theme.fontSize.sm,
    borderWidth: 1, borderColor: theme.colors.cardBorder, marginTop: theme.spacing.sm,
    minHeight: 60, textAlignVertical: 'top',
  },
  
  criteriaBox: {
    backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm, marginTop: theme.spacing.sm,
  },
  criteriaTitle: { fontSize: theme.fontSize.xs, fontWeight: 'bold', color: '#9C27B0', marginBottom: 4 },
  criteriaItem: { fontSize: 10, color: theme.colors.textSecondary, marginBottom: 2 },
  
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
    backgroundColor: '#9C27B0', padding: theme.spacing.md, borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg, gap: theme.spacing.sm,
  },
  buttonDisabled: { opacity: 0.7 },
  generateButtonText: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: 'white' },
  
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2196F3', padding: theme.spacing.md, borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm, gap: theme.spacing.sm,
  },
  saveButtonText: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: 'white' },

  // Payment Modal Styles
  paymentModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg,
  },
  paymentModalContent: {
    backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.xl, width: '100%', maxWidth: 400,
  },
  paymentModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md,
  },
  paymentModalTitle: {
    fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary,
  },
  paymentModalSubtitle: {
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
