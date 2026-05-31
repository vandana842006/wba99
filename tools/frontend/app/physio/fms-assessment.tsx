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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';

// Payment state types
interface PaymentState {
  showPaymentModal: boolean;
  qrCode: string | null;
  paymentScreenshot: string | null;
  paymentVerified: boolean;
  submittingPayment: boolean;
}

// FMS 7 Movement Patterns
const FMS_TESTS = [
  {
    id: 'deep_squat',
    name: 'Deep Squat',
    icon: 'human-handsdown',
    description: 'Assesses bilateral, symmetrical mobility of hips, knees, and ankles',
    instructions: [
      'Stand with feet shoulder-width apart',
      'Hold dowel overhead with arms extended',
      'Squat as deep as possible',
      'Keep heels on floor, dowel over feet',
    ],
    scoring: {
      3: 'Upper torso parallel with tibia, femur below horizontal, knees over feet, dowel aligned over feet',
      2: 'With heel lift - Upper torso parallel with tibia, femur below horizontal, knees over feet',
      1: 'Tibia and torso not parallel, femur not below horizontal, knees not tracking over feet',
      0: 'Pain during movement',
    },
  },
  {
    id: 'hurdle_step',
    name: 'Hurdle Step',
    icon: 'run',
    description: 'Assesses bilateral mobility and stability of hips, knees, and ankles',
    instructions: [
      'Stand with feet together, toes touching hurdle',
      'Hold dowel across shoulders',
      'Step over hurdle, touch heel to floor',
      'Return to starting position',
    ],
    scoring: {
      3: 'Hips, knees, ankles aligned in sagittal plane, minimal movement in lumbar spine, dowel and hurdle remain parallel',
      2: 'Alignment lost between hips, knees, ankles, movement in lumbar spine, dowel and hurdle do not remain parallel',
      1: 'Contact between foot and hurdle, loss of balance',
      0: 'Pain during movement',
    },
  },
  {
    id: 'inline_lunge',
    name: 'In-Line Lunge',
    icon: 'human',
    description: 'Assesses hip and trunk mobility and stability, ankle and knee stability',
    instructions: [
      'Place dowel behind back (touching head, thoracic, sacrum)',
      'Place front foot on board, rear knee behind front heel',
      'Lower rear knee to touch board behind front heel',
      'Return to starting position',
    ],
    scoring: {
      3: 'Dowel contacts maintained, no torso movement, dowel and feet remain in sagittal plane, knee touches behind heel',
      2: 'Dowel contacts not maintained, movement in torso, dowel and feet do not remain in sagittal plane',
      1: 'Loss of balance',
      0: 'Pain during movement',
    },
  },
  {
    id: 'shoulder_mobility',
    name: 'Shoulder Mobility',
    icon: 'arm-flex',
    description: 'Assesses bilateral shoulder range of motion, scapular mobility, thoracic extension',
    instructions: [
      'Make fists with thumbs inside',
      'One arm reaches over shoulder, down back',
      'Other arm reaches behind back, up',
      'Measure distance between fists',
    ],
    scoring: {
      3: 'Fists within one hand length',
      2: 'Fists within one and a half hand lengths',
      1: 'Fists not within one and a half hand lengths',
      0: 'Pain during movement',
    },
    clearingTest: 'Impingement Clearing Test',
  },
  {
    id: 'active_straight_leg_raise',
    name: 'Active Straight Leg Raise',
    icon: 'yoga',
    description: 'Assesses active hamstring and gastro-soleus flexibility, hip mobility',
    instructions: [
      'Lie supine with arms at sides, palms up',
      'Legs extended, feet together',
      'Raise test leg with ankle dorsiflexed',
      'Keep opposite leg flat on floor',
    ],
    scoring: {
      3: 'Vertical line of malleolus resides between mid-thigh and ASIS',
      2: 'Vertical line of malleolus resides between mid-thigh and mid-patella',
      1: 'Vertical line of malleolus resides below mid-patella',
      0: 'Pain during movement',
    },
  },
  {
    id: 'trunk_stability_pushup',
    name: 'Trunk Stability Push-Up',
    icon: 'human-handsup',
    description: 'Assesses trunk stability in sagittal plane during symmetric upper extremity movement',
    instructions: [
      'Lie prone with hands at appropriate width',
      'Men: thumbs at forehead level, Women: thumbs at chin level',
      'Perform push-up with body as unit',
      'No lag in lumbar spine',
    ],
    scoring: {
      3: 'Males: 1 rep with thumbs at forehead, Females: 1 rep with thumbs at chin',
      2: 'Males: 1 rep with thumbs at chin, Females: 1 rep with thumbs at clavicle',
      1: 'Unable to perform 1 rep with modified position',
      0: 'Pain during movement',
    },
    clearingTest: 'Extension Clearing Test',
  },
  {
    id: 'rotary_stability',
    name: 'Rotary Stability',
    icon: 'rotate-3d-variant',
    description: 'Assesses multi-plane trunk stability during combined upper and lower extremity movement',
    instructions: [
      'Assume quadruped position over board',
      'Extend same side arm and leg',
      'Touch elbow to knee over board',
      'Return to starting position',
    ],
    scoring: {
      3: 'Performs unilateral repetition (same side arm/leg), keeping spine parallel to board',
      2: 'Performs diagonal repetition (opposite arm/leg), keeping spine parallel to board',
      1: 'Unable to perform diagonal repetition',
      0: 'Pain during movement',
    },
    clearingTest: 'Flexion Clearing Test',
  },
];

export default function FMSAssessmentScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  const [patientName, setPatientName] = useState('');
  const [scores, setScores] = useState<Record<string, { left: number; right: number }>>({});
  const [clearingTests, setClearingTests] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [generatingAIReport, setGeneratingAIReport] = useState(false);

  // Payment states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    fetchQRCode();
  }, []);

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
        report_type: 'fms',
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

  const setScore = (testId: string, side: 'left' | 'right', score: number) => {
    setScores(prev => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        [side]: score,
      },
    }));
  };

  const getTestScore = (testId: string): number => {
    const testScores = scores[testId];
    if (!testScores) return 0;
    // FMS uses the lower score between left and right
    const left = testScores.left ?? 0;
    const right = testScores.right ?? 0;
    return Math.min(left, right);
  };

  const getTotalScore = (): number => {
    return FMS_TESTS.reduce((total, test) => total + getTestScore(test.id), 0);
  };

  const getScoreColor = (score: number): string => {
    if (score === 3) return theme.colors.success;
    if (score === 2) return theme.colors.warning;
    if (score === 1) return '#FF9800';
    return theme.colors.error;
  };

  const getRiskLevel = (total: number): { level: string; color: string } => {
    if (total >= 18) return { level: 'Low Risk', color: theme.colors.success };
    if (total >= 14) return { level: 'Moderate Risk', color: theme.colors.warning };
    return { level: 'High Risk', color: theme.colors.error };
  };

  const generatePDFReport = async () => {
    if (!patientName.trim()) {
      Alert.alert('Required', 'Please enter patient name');
      return;
    }

    setGeneratingPDF(true);
    const totalScore = getTotalScore();
    const risk = getRiskLevel(totalScore);
    const reportId = `WBA99-FMS-${Date.now().toString(36).toUpperCase()}`;
    const currentDate = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const currentTime = new Date().toLocaleTimeString();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; background: #fff; color: #333; line-height: 1.4; }
    
    .page { 
      width: 210mm; min-height: 297mm; padding: 15mm;
      page-break-after: always; position: relative; background: #fff;
    }
    .page:last-child { page-break-after: auto; }
    
    /* Header - Purple theme for FMS */
    .report-header {
      display: flex; justify-content: space-between; align-items: center;
      padding-bottom: 15px; border-bottom: 3px solid #9C27B0; margin-bottom: 20px;
    }
    .logo-section { display: flex; align-items: center; gap: 15px; }
    .logo-circle {
      width: 60px; height: 60px;
      background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%);
      border-radius: 50%; display: flex; flex-direction: column;
      justify-content: center; align-items: center; border: 3px solid #9C27B0;
    }
    .logo-text { color: white; font-size: 14px; font-weight: bold; }
    .logo-sub { color: rgba(255,255,255,0.8); font-size: 8px; }
    .company-info h1 { font-size: 22px; color: #7B1FA2; margin-bottom: 2px; }
    .company-info p { font-size: 10px; color: #666; }
    .report-meta { text-align: right; font-size: 10px; color: #666; }
    
    .page-title {
      background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%);
      color: white; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .page-title h2 { font-size: 18px; }
    .page-title .badge { background: #fff; color: #7B1FA2; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    
    .patient-info {
      background: #f3e5f5; border: 1px solid #9C27B0; border-radius: 8px;
      padding: 15px; margin-bottom: 20px;
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;
    }
    .info-item label { font-size: 10px; color: #666; display: block; margin-bottom: 3px; }
    .info-item span { font-size: 12px; font-weight: bold; color: #333; }
    
    /* Score Display */
    .score-container { display: flex; justify-content: center; gap: 30px; margin: 20px 0; }
    .score-card {
      text-align: center; padding: 25px 35px; border-radius: 15px; min-width: 140px;
    }
    .score-card.total {
      background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%);
      color: white; border: 3px solid #7B1FA2;
    }
    .score-card.risk { border: 3px solid; }
    .score-value { font-size: 48px; font-weight: bold; }
    .score-label { font-size: 11px; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px; }
    .score-max { font-size: 14px; opacity: 0.8; }
    
    /* FMS Scoring Guide */
    .scoring-guide {
      display: flex; justify-content: center; gap: 15px; margin: 20px 0;
    }
    .guide-item { display: flex; align-items: center; gap: 8px; font-size: 11px; }
    .guide-circle { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px; }
    
    .section { margin-bottom: 20px; }
    .section-header {
      background: linear-gradient(90deg, #9C27B0 0%, #BA68C8 100%);
      color: white; padding: 10px 15px; border-radius: 5px 5px 0 0;
      font-size: 14px; font-weight: bold;
    }
    .section-content {
      border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;
      padding: 15px; background: #fff;
    }
    
    /* Test Cards */
    .test-card {
      background: #f8f9fa; border-radius: 10px; padding: 15px; margin-bottom: 12px;
      border-left: 5px solid; display: flex; justify-content: space-between; align-items: center;
    }
    .test-info { flex: 1; }
    .test-name { font-weight: bold; font-size: 13px; color: #333; }
    .test-type { font-size: 10px; color: #666; margin-top: 3px; }
    .test-scores-container { display: flex; gap: 15px; align-items: center; }
    .side-score { text-align: center; min-width: 50px; }
    .side-label { font-size: 9px; color: #666; text-transform: uppercase; }
    .side-value { font-size: 22px; font-weight: bold; }
    .final-score-badge {
      padding: 10px 15px; border-radius: 10px; text-align: center;
      font-weight: bold; min-width: 60px;
    }
    .asymmetry-tag { background: #ffebee; color: #c62828; font-size: 9px; padding: 2px 8px; border-radius: 10px; margin-top: 5px; display: inline-block; }
    
    /* Movement Pattern Categories */
    .pattern-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .pattern-card { background: #f3e5f5; border-radius: 10px; padding: 15px; text-align: center; border: 2px solid #CE93D8; }
    .pattern-name { font-size: 11px; color: #7B1FA2; font-weight: bold; margin-bottom: 8px; }
    .pattern-score { font-size: 28px; font-weight: bold; color: #9C27B0; }
    .pattern-max { font-size: 10px; color: #666; }
    
    /* Risk Chart */
    .risk-chart { display: flex; justify-content: center; margin: 20px 0; }
    .risk-bar { display: flex; border-radius: 25px; overflow: hidden; width: 100%; height: 30px; }
    .risk-segment { display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold; }
    .risk-indicator { position: relative; margin-top: 10px; }
    .risk-pointer { width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 15px solid #333; }
    
    /* Recommendations */
    .rec-card { display: flex; gap: 12px; padding: 12px; background: #f3e5f5; border-radius: 8px; margin: 8px 0; border-left: 4px solid #9C27B0; }
    .rec-icon { width: 30px; height: 30px; background: #9C27B0; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
    .rec-content { flex: 1; }
    .rec-title { font-weight: bold; font-size: 12px; color: #7B1FA2; }
    .rec-detail { font-size: 11px; color: #666; margin-top: 3px; }
    
    /* Notes Section */
    .notes-box { background: #fff3e0; border: 1px dashed #FF9800; border-radius: 8px; padding: 15px; margin-top: 15px; }
    .notes-title { font-size: 12px; font-weight: bold; color: #e65100; margin-bottom: 8px; }
    .note-item { font-size: 11px; padding: 5px 0; border-bottom: 1px solid #ffe0b2; }
    
    .report-footer {
      position: absolute; bottom: 15mm; left: 15mm; right: 15mm;
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 10px; border-top: 1px solid #ddd; font-size: 9px; color: #666;
    }
    .footer-center { text-align: center; flex: 1; }
  </style>
</head>
<body>
  <!-- PAGE 1: Overview & Scoring -->
  <div class="page">
    <div class="report-header">
      <div class="logo-section">
        <div class="logo-circle">
          <span class="logo-text">WBA99</span>
          <span class="logo-sub">FMS</span>
        </div>
        <div class="company-info">
          <h1>Functional Movement Screen Report</h1>
          <p>Comprehensive Movement Assessment</p>
        </div>
      </div>
      <div class="report-meta">
        <p><strong>Report ID:</strong> ${reportId}</p>
        <p><strong>Date:</strong> ${currentDate}</p>
        <p><strong>Time:</strong> ${currentTime}</p>
      </div>
    </div>
    
    <div class="page-title">
      <h2>🏃 FUNCTIONAL MOVEMENT SCREEN (FMS)</h2>
      <span class="badge">7-TEST ASSESSMENT</span>
    </div>
    
    <div class="patient-info">
      <div class="info-item">
        <label>Patient Name</label>
        <span>${patientName}</span>
      </div>
      <div class="info-item">
        <label>Assessment Date</label>
        <span>${currentDate}</span>
      </div>
      <div class="info-item">
        <label>Assessed By</label>
        <span>${currentUser?.name || '_______________________'}</span>
      </div>
    </div>
    
    <div class="score-container">
      <div class="score-card total">
        <div class="score-value">${totalScore}</div>
        <div class="score-max">/ 21</div>
        <div class="score-label">Total FMS Score</div>
      </div>
      <div class="score-card risk" style="border-color: ${risk.color}; background: ${risk.color}10;">
        <div class="score-value" style="color: ${risk.color};">${risk.level}</div>
        <div class="score-label" style="color: ${risk.color};">Injury Risk Level</div>
      </div>
    </div>
    
    <div class="scoring-guide">
      <div class="guide-item"><div class="guide-circle" style="background: #4CAF50;">3</div> Optimal</div>
      <div class="guide-item"><div class="guide-circle" style="background: #FF9800;">2</div> Acceptable</div>
      <div class="guide-item"><div class="guide-circle" style="background: #f44336;">1</div> Dysfunction</div>
      <div class="guide-item"><div class="guide-circle" style="background: #333;">0</div> Pain</div>
    </div>
    
    <div class="section">
      <div class="section-header">📊 MOVEMENT PATTERN CATEGORIES</div>
      <div class="section-content">
        <div class="pattern-grid">
          <div class="pattern-card">
            <div class="pattern-name">MOBILITY</div>
            <div class="pattern-score">${(getTestScore('shoulder_mobility') + getTestScore('active_slr'))}</div>
            <div class="pattern-max">/ 6</div>
          </div>
          <div class="pattern-card">
            <div class="pattern-name">STABILITY</div>
            <div class="pattern-score">${(getTestScore('trunk_stability') + getTestScore('rotary_stability'))}</div>
            <div class="pattern-max">/ 6</div>
          </div>
          <div class="pattern-card">
            <div class="pattern-name">FUNCTIONAL</div>
            <div class="pattern-score">${(getTestScore('deep_squat') + getTestScore('hurdle_step') + getTestScore('inline_lunge'))}</div>
            <div class="pattern-max">/ 9</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-header">📋 INDIVIDUAL TEST SCORES - OVERVIEW</div>
      <div class="section-content">
        ${FMS_TESTS.slice(0, 4).map(test => {
          const testScores = scores[test.id] || { left: 0, right: 0 };
          const finalScore = getTestScore(test.id);
          const hasAsymmetry = Math.abs((testScores.left || 0) - (testScores.right || 0)) >= 2;
          const borderColor = getScoreColor(finalScore);
          
          return `
          <div class="test-card" style="border-left-color: ${borderColor}">
            <div class="test-info">
              <div class="test-name">${test.name}</div>
              <div class="test-type">${test.bilateral ? 'Bilateral Test' : 'Single Test'}</div>
              ${hasAsymmetry ? '<span class="asymmetry-tag">⚠️ Asymmetry</span>' : ''}
            </div>
            <div class="test-scores-container">
              ${test.bilateral ? `
                <div class="side-score">
                  <div class="side-label">Left</div>
                  <div class="side-value" style="color: ${getScoreColor(testScores.left || 0)}">${testScores.left || 0}</div>
                </div>
                <div class="side-score">
                  <div class="side-label">Right</div>
                  <div class="side-value" style="color: ${getScoreColor(testScores.right || 0)}">${testScores.right || 0}</div>
                </div>
              ` : ''}
              <div class="final-score-badge" style="background: ${borderColor}; color: white;">
                ${finalScore}/3
              </div>
            </div>
          </div>
          `;
        }).join('')}
      </div>
    </div>
    
    <div class="report-footer">
      <span>WBA99 Expert Analysis India</span>
      <span class="footer-center">Page 1 of 2 | Confidential Medical Report</span>
      <span>www.wba99.com</span>
    </div>
  </div>
  
  <!-- PAGE 2: Detailed Results & Recommendations -->
  <div class="page">
    <div class="report-header">
      <div class="logo-section">
        <div class="logo-circle">
          <span class="logo-text">WBA99</span>
          <span class="logo-sub">FMS</span>
        </div>
        <div class="company-info">
          <h1>Functional Movement Screen Report</h1>
          <p>Detailed Results & Recommendations</p>
        </div>
      </div>
      <div class="report-meta"><p><strong>Report ID:</strong> ${reportId}</p></div>
    </div>
    
    <div class="page-title">
      <h2>📋 DETAILED RESULTS & RECOMMENDATIONS</h2>
      <span class="badge">PAGE 2/2</span>
    </div>
    
    <div class="section">
      <div class="section-header">📋 REMAINING TEST SCORES</div>
      <div class="section-content">
        ${FMS_TESTS.slice(4).map(test => {
          const testScores = scores[test.id] || { left: 0, right: 0 };
          const finalScore = getTestScore(test.id);
          const hasAsymmetry = Math.abs((testScores.left || 0) - (testScores.right || 0)) >= 2;
          const borderColor = getScoreColor(finalScore);
          
          return `
          <div class="test-card" style="border-left-color: ${borderColor}">
            <div class="test-info">
              <div class="test-name">${test.name}</div>
              <div class="test-type">${test.bilateral ? 'Bilateral Test' : 'Single Test'}</div>
              ${hasAsymmetry ? '<span class="asymmetry-tag">⚠️ Asymmetry</span>' : ''}
            </div>
            <div class="test-scores-container">
              ${test.bilateral ? `
                <div class="side-score">
                  <div class="side-label">Left</div>
                  <div class="side-value" style="color: ${getScoreColor(testScores.left || 0)}">${testScores.left || 0}</div>
                </div>
                <div class="side-score">
                  <div class="side-label">Right</div>
                  <div class="side-value" style="color: ${getScoreColor(testScores.right || 0)}">${testScores.right || 0}</div>
                </div>
              ` : ''}
              <div class="final-score-badge" style="background: ${borderColor}; color: white;">
                ${finalScore}/3
              </div>
            </div>
          </div>
          `;
        }).join('')}
      </div>
    </div>
    
    <div class="section">
      <div class="section-header">💡 CLINICAL RECOMMENDATIONS</div>
      <div class="section-content">
        ${totalScore < 14 ? `
          <div class="rec-card" style="border-left-color: #f44336;">
            <div class="rec-icon" style="background: #f44336;">!</div>
            <div class="rec-content">
              <div class="rec-title">HIGH PRIORITY - Movement Dysfunction Present</div>
              <div class="rec-detail">Address fundamental movement dysfunctions before engaging in high-intensity training. Score indicates elevated injury risk.</div>
            </div>
          </div>
        ` : ''}
        ${totalScore < 18 ? `
          <div class="rec-card">
            <div class="rec-icon">📋</div>
            <div class="rec-content">
              <div class="rec-title">Corrective Exercise Focus</div>
              <div class="rec-detail">Implement corrective exercises for tests scored 1 or 2. Focus on mobility and stability limitations.</div>
            </div>
          </div>
        ` : ''}
        ${Object.entries(scores).some(([_, s]) => Math.abs((s.left || 0) - (s.right || 0)) >= 2) ? `
          <div class="rec-card" style="border-left-color: #FF9800;">
            <div class="rec-icon" style="background: #FF9800;">⚖️</div>
            <div class="rec-content">
              <div class="rec-title">Address Asymmetries</div>
              <div class="rec-detail">Significant asymmetries detected. Incorporate unilateral corrective exercises to improve bilateral balance.</div>
            </div>
          </div>
        ` : ''}
        <div class="rec-card">
          <div class="rec-icon">🔄</div>
          <div class="rec-content">
            <div class="rec-title">Re-Assessment Schedule</div>
            <div class="rec-detail">Re-test in 4-6 weeks after corrective exercise program to track progress and adjust training.</div>
          </div>
        </div>
        <div class="rec-card">
          <div class="rec-icon">📊</div>
          <div class="rec-content">
            <div class="rec-title">Progress Monitoring</div>
            <div class="rec-detail">Document improvements in individual test scores and overall movement quality over time.</div>
          </div>
        </div>
      </div>
    </div>
    
    ${Object.values(notes).some(n => n) ? `
      <div class="notes-box">
        <div class="notes-title">📝 Clinical Notes</div>
        ${FMS_TESTS.filter(t => notes[t.id]).map(t => `
          <div class="note-item"><strong>${t.name}:</strong> ${notes[t.id]}</div>
        `).join('')}
      </div>
    ` : ''}
    
    <div style="background: #f8f9fa; border-radius: 10px; padding: 15px; margin-top: 20px; text-align: center;">
      <p style="font-size: 11px; color: #666;">
        <strong>Disclaimer:</strong> The FMS is a screening tool, not a diagnostic tool. 
        Consult a healthcare professional for injuries or persistent pain.
      </p>
      <p style="font-size: 10px; color: #999; margin-top: 5px;">
        Generated by WBA99 FMS Assessment System | © 2025 WBA99 Expert Analysis India
      </p>
    </div>
    
    <div class="report-footer">
      <span>WBA99 Expert Analysis India</span>
      <span class="footer-center">Page 2 of 2 | Confidential Medical Report</span>
      <span>www.wba99.com</span>
    </div>
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

  // Generate AI-Enhanced Comprehensive Report
  const generateAIEnhancedReport = async () => {
    if (!patientName.trim()) {
      Alert.alert('Required', 'Please enter patient name');
      return;
    }

    setGeneratingAIReport(true);
    try {
      // Prepare assessment data
      const assessmentData: Record<string, number> = {};
      FMS_TESTS.forEach(test => {
        assessmentData[test.id] = getTestScore(test.id);
      });

      // Call backend for AI-enhanced report
      const response = await api.post('/generate-comprehensive-report', {
        assessment_id: `fms-${Date.now()}`,
        assessment_type: 'fms',
        patient_name: patientName,
        physio_name: currentUser?.name || 'WBA99 Physio',
        physio_clinic: 'WBA99 Sports Physiotherapy',
        assessment_data: assessmentData,
        total_score: getTotalScore(),
        max_score: 21,
        percentage: Math.round((getTotalScore() / 21) * 100),
        include_ai_analysis: true
      });

      const { report_html, report_id } = response.data;

      // Generate PDF from HTML
      const { uri } = await Print.printToFileAsync({
        html: report_html,
        base64: false
      });

      // Share the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `FMS AI Report - ${patientName}`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Success', `AI Report generated: ${report_id}`);
      }
    } catch (error) {
      console.error('AI Report error:', error);
      Alert.alert('Error', 'Failed to generate AI report. Please try again.');
    } finally {
      setGeneratingAIReport(false);
    }
  };

  const totalScore = getTotalScore();
  const risk = getRiskLevel(totalScore);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>FMS Assessment</Text>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>7 Tests</Text>
          </View>
        </View>

        {/* Version Switcher */}
        <View style={styles.versionSwitcher}>
          <TouchableOpacity style={[styles.versionTab, styles.versionTabActive]}>
            <Text style={[styles.versionTabText, styles.versionTabTextActive]}>FMS Standard</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.versionTab}
            onPress={() => router.push('/physio/fms-assessment-2')}
          >
            <Text style={styles.versionTabText}>FMS Extended</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>Functional Movement Screen - 7 Movement Patterns</Text>

        {/* Patient Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter patient name"
            placeholderTextColor={theme.colors.textMuted}
            value={patientName}
            onChangeText={setPatientName}
          />
        </View>

        {/* Score Summary */}
        <View style={styles.scoreSummary}>
          <View style={[styles.scoreBox, { backgroundColor: '#8B4513' }]}>
            <Text style={styles.scoreValue}>{totalScore}</Text>
            <Text style={styles.scoreLabel}>Total /21</Text>
          </View>
          <View style={[styles.scoreBox, { backgroundColor: risk.color + '30', borderColor: risk.color, borderWidth: 2 }]}>
            <Text style={[styles.riskText, { color: risk.color }]}>{risk.level}</Text>
            <Text style={styles.scoreLabel}>Risk Level</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(totalScore / 21) * 100}%`, backgroundColor: risk.color }]} />
          </View>
          <Text style={styles.progressText}>{Math.round((totalScore / 21) * 100)}% Complete</Text>
        </View>

        {/* FMS Tests */}
        <Text style={styles.sectionTitle}>Movement Tests</Text>
        {FMS_TESTS.map((test, index) => {
          const testScores = scores[test.id] || { left: 0, right: 0 };
          const finalScore = getTestScore(test.id);
          const hasAsymmetry = Math.abs((testScores.left || 0) - (testScores.right || 0)) >= 2;

          return (
            <View key={test.id} style={[styles.testCard, { borderLeftColor: getScoreColor(finalScore) }]}>
              <TouchableOpacity 
                style={styles.testHeader}
                onPress={() => setActiveTest(activeTest === test.id ? null : test.id)}
              >
                <View style={styles.testInfo}>
                  <View style={styles.testNumber}>
                    <Text style={styles.testNumberText}>{index + 1}</Text>
                  </View>
                  <View>
                    <Text style={styles.testName}>{test.name}</Text>
                    <Text style={styles.testDesc}>{test.description}</Text>
                  </View>
                </View>
                <View style={[styles.finalScoreBadge, { backgroundColor: getScoreColor(finalScore) }]}>
                  <Text style={styles.finalScoreText}>{finalScore}</Text>
                </View>
              </TouchableOpacity>

              {/* Instructions Button */}
              <TouchableOpacity 
                style={styles.instructionsButton}
                onPress={() => setShowInstructions(test.id)}
              >
                <Ionicons name="help-circle-outline" size={18} color={theme.colors.accent} />
                <Text style={styles.instructionsButtonText}>View Instructions & Scoring</Text>
              </TouchableOpacity>

              {/* Scoring Section */}
              <View style={styles.scoringSection}>
                {/* Left Side */}
                <View style={styles.sideScoring}>
                  <Text style={styles.sideLabel}>LEFT</Text>
                  <View style={styles.scoreButtons}>
                    {[0, 1, 2, 3].map(score => (
                      <TouchableOpacity
                        key={score}
                        style={[
                          styles.scoreButton,
                          testScores.left === score && { backgroundColor: getScoreColor(score) }
                        ]}
                        onPress={() => setScore(test.id, 'left', score)}
                      >
                        <Text style={[
                          styles.scoreButtonText,
                          testScores.left === score && styles.scoreButtonTextActive
                        ]}>
                          {score}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Right Side */}
                <View style={styles.sideScoring}>
                  <Text style={styles.sideLabel}>RIGHT</Text>
                  <View style={styles.scoreButtons}>
                    {[0, 1, 2, 3].map(score => (
                      <TouchableOpacity
                        key={score}
                        style={[
                          styles.scoreButton,
                          testScores.right === score && { backgroundColor: getScoreColor(score) }
                        ]}
                        onPress={() => setScore(test.id, 'right', score)}
                      >
                        <Text style={[
                          styles.scoreButtonText,
                          testScores.right === score && styles.scoreButtonTextActive
                        ]}>
                          {score}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Asymmetry Warning */}
              {hasAsymmetry && (
                <View style={styles.asymmetryWarning}>
                  <Ionicons name="warning" size={16} color={theme.colors.warning} />
                  <Text style={styles.asymmetryText}>Significant asymmetry detected</Text>
                </View>
              )}

              {/* Clearing Test */}
              {test.clearingTest && (
                <View style={styles.clearingTest}>
                  <Text style={styles.clearingLabel}>{test.clearingTest}</Text>
                  <View style={styles.clearingButtons}>
                    <TouchableOpacity
                      style={[styles.clearingBtn, clearingTests[test.id] === false && styles.clearingBtnNegative]}
                      onPress={() => setClearingTests(prev => ({ ...prev, [test.id]: false }))}
                    >
                      <Text style={styles.clearingBtnText}>Negative</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.clearingBtn, clearingTests[test.id] === true && styles.clearingBtnPositive]}
                      onPress={() => setClearingTests(prev => ({ ...prev, [test.id]: true }))}
                    >
                      <Text style={styles.clearingBtnText}>Positive</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Notes */}
              <TextInput
                style={styles.notesInput}
                placeholder="Add notes..."
                placeholderTextColor={theme.colors.textMuted}
                value={notes[test.id] || ''}
                onChangeText={(text) => setNotes(prev => ({ ...prev, [test.id]: text }))}
              />
            </View>
          );
        })}

        {/* Generate PDF Button */}
        <TouchableOpacity
          style={[styles.pdfButton, generatingPDF && styles.buttonDisabled]}
          onPress={handleGenerateReport}
          disabled={generatingPDF}
        >
          {generatingPDF ? (
            <ActivityIndicator color={theme.colors.textPrimary} />
          ) : (
            <>
              <Ionicons name="document-text" size={24} color={theme.colors.textPrimary} />
              <Text style={styles.pdfButtonText}>
                {paymentVerified ? 'Generate FMS Report' : 'Pay & Generate Report'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* AI-Enhanced Comprehensive Report Button */}
        <TouchableOpacity
          style={[styles.aiReportButton, generatingAIReport && styles.buttonDisabled]}
          onPress={generateAIEnhancedReport}
          disabled={generatingAIReport}
        >
          {generatingAIReport ? (
            <>
              <ActivityIndicator color={theme.colors.textPrimary} />
              <Text style={styles.aiReportButtonText}>Generating AI Analysis...</Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="robot" size={24} color={theme.colors.textPrimary} />
              <Text style={styles.aiReportButtonText}>🧠 AI-Enhanced Comprehensive Report</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.aiReportHint}>
          Includes: Biomechanics • Kinetic Chain • Rehab Plan • Mobility • Stretching • Strengthening • Release • Consequences
        </Text>

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

        {/* Instructions Modal */}
        <Modal visible={!!showInstructions} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {showInstructions && (() => {
                const test = FMS_TESTS.find(t => t.id === showInstructions);
                if (!test) return null;
                return (
                  <>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>{test.name}</Text>
                      <TouchableOpacity onPress={() => setShowInstructions(null)}>
                        <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                      </TouchableOpacity>
                    </View>
                    
                    <ScrollView style={styles.modalScroll}>
                      <Text style={styles.modalSectionTitle}>Instructions</Text>
                      {test.instructions.map((inst, i) => (
                        <Text key={i} style={styles.modalInstruction}>• {inst}</Text>
                      ))}

                      <Text style={styles.modalSectionTitle}>Scoring Criteria</Text>
                      {Object.entries(test.scoring).reverse().map(([score, desc]) => (
                        <View key={score} style={[styles.scoringCriteria, { borderLeftColor: getScoreColor(parseInt(score)) }]}>
                          <Text style={[styles.scoringScore, { color: getScoreColor(parseInt(score)) }]}>{score}</Text>
                          <Text style={styles.scoringDesc}>{desc}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </>
                );
              })()}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  headerTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  aiBadge: { backgroundColor: '#FF6B35', paddingHorizontal: theme.spacing.sm, paddingVertical: 4, borderRadius: theme.borderRadius.sm },
  aiBadgeText: { color: theme.colors.textPrimary, fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.bold },
  versionSwitcher: { flexDirection: 'row', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: 4, marginBottom: theme.spacing.md },
  versionTab: { flex: 1, paddingVertical: theme.spacing.sm, alignItems: 'center', borderRadius: theme.borderRadius.sm },
  versionTabActive: { backgroundColor: '#8B4513' },
  versionTabText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  versionTabTextActive: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },
  subtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.lg },
  section: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md, marginTop: theme.spacing.md },
  input: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, color: theme.colors.textPrimary, fontSize: theme.fontSize.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  scoreSummary: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.lg, marginBottom: theme.spacing.md },
  scoreBox: { alignItems: 'center', padding: theme.spacing.lg, borderRadius: theme.borderRadius.lg, minWidth: 120 },
  scoreValue: { fontSize: 36, fontWeight: 'bold', color: theme.colors.textPrimary },
  scoreLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textPrimary, marginTop: theme.spacing.xs },
  riskText: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold },
  progressContainer: { marginBottom: theme.spacing.lg },
  progressBar: { height: 8, backgroundColor: theme.colors.cardBorder, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.xs },
  testCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderLeftWidth: 4 },
  testHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  testInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: theme.spacing.sm },
  testNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center' },
  testNumberText: { color: theme.colors.textPrimary, fontWeight: 'bold', fontSize: theme.fontSize.sm },
  testName: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  testDesc: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, maxWidth: 200 },
  finalScoreBadge: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  finalScoreText: { color: theme.colors.textPrimary, fontWeight: 'bold', fontSize: theme.fontSize.lg },
  instructionsButton: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.sm },
  instructionsButtonText: { fontSize: theme.fontSize.xs, color: theme.colors.accent },
  scoringSection: { flexDirection: 'row', justifyContent: 'space-around', marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.cardBorder },
  sideScoring: { alignItems: 'center' },
  sideLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, fontWeight: theme.fontWeight.bold },
  scoreButtons: { flexDirection: 'row', gap: theme.spacing.sm },
  scoreButton: { width: 36, height: 36, borderRadius: 8, backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.cardBorder },
  scoreButtonText: { fontSize: theme.fontSize.md, color: theme.colors.textMuted, fontWeight: theme.fontWeight.bold },
  scoreButtonTextActive: { color: theme.colors.textPrimary },
  asymmetryWarning: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.warning + '20', padding: theme.spacing.sm, borderRadius: theme.borderRadius.sm, marginTop: theme.spacing.sm },
  asymmetryText: { fontSize: theme.fontSize.xs, color: theme.colors.warning },
  clearingTest: { marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.cardBorder },
  clearingLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  clearingButtons: { flexDirection: 'row', gap: theme.spacing.md },
  clearingBtn: { flex: 1, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.sm, backgroundColor: theme.colors.primaryLight, alignItems: 'center' },
  clearingBtnNegative: { backgroundColor: theme.colors.success + '30' },
  clearingBtnPositive: { backgroundColor: theme.colors.error + '30' },
  clearingBtnText: { fontSize: theme.fontSize.sm, color: theme.colors.textPrimary },
  notesInput: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm, padding: theme.spacing.sm, color: theme.colors.textPrimary, fontSize: theme.fontSize.sm, marginTop: theme.spacing.md },
  pdfButton: { flexDirection: 'row', backgroundColor: theme.colors.success, borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.lg },
  pdfButtonText: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  buttonDisabled: { opacity: 0.7 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: theme.spacing.lg, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  modalTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  modalScroll: { maxHeight: 400 },
  modalSectionTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.accent, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm },
  modalInstruction: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs, lineHeight: 20 },
  scoringCriteria: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md, padding: theme.spacing.sm, marginBottom: theme.spacing.sm, borderLeftWidth: 4, backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm },
  scoringScore: { fontSize: theme.fontSize.xl, fontWeight: 'bold', width: 30 },
  scoringDesc: { flex: 1, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 18 },
  
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
  aiReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9C27B0',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  aiReportButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  aiReportHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    lineHeight: 16,
  },
});
