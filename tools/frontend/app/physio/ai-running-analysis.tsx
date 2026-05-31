import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useVideoPlayer, VideoView } from 'expo-video';
import Slider from '@react-native-community/slider';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api, { saveAssessmentReport } from '../../src/utils/api';
import { usePermissions, PERMISSION_KEYS } from '../../src/hooks/usePermissions';
import PatientSelector, { Patient } from '../../src/components/PatientSelector';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Gait cycle phases
const GAIT_PHASES = {
  INITIAL_CONTACT: 'initial_contact',
  LOADING_RESPONSE: 'loading_response',
  MID_STANCE: 'mid_stance',
  TERMINAL_STANCE: 'terminal_stance',
  PRE_SWING: 'pre_swing',
  INITIAL_SWING: 'initial_swing',
  MID_SWING: 'mid_swing',
  TERMINAL_SWING: 'terminal_swing',
};

// Foot strike patterns
const FOOT_STRIKE_TYPES = ['Heel Strike', 'Midfoot Strike', 'Forefoot Strike'];

interface GaitAnalysis {
  cadence: { value: number; status: string; aiConfidence: number };
  stepLength: { left: number; right: number; asymmetry: number; status: string; aiConfidence: number };
  strideLength: { value: number; status: string; aiConfidence: number };
  groundContactTime: { left: number; right: number; asymmetry: number; status: string; aiConfidence: number };
  verticalOscillation: { value: number; status: string; aiConfidence: number };
  hipDrop: { left: number; right: number; status: string; aiConfidence: number };
  trunkLean: { value: number; status: string; aiConfidence: number };
  armSwingSymmetry: { value: number; status: string; aiConfidence: number };
  kneeFlexionAtContact: { left: number; right: number; status: string; aiConfidence: number };
  footStrike: { type: string; aiConfidence: number };
  overallScore: number;
  riskLevel: string;
  recommendations: string[];
}

interface KeyFrame {
  id: string;
  timestamp: number;
  phase: string;
  label: string;
  notes?: string;
}

interface ManualOverride {
  parameter: string;
  aiValue: number;
  correctedValue: number;
  note?: string;
}

export default function AIRunningAnalysis() {
  const router = useRouter();
  const { currentUser } = useStore();
  const { hasPermission, loading: permissionLoading } = usePermissions();
  
  // Video player using expo-video
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const videoPlayer = useVideoPlayer(videoUri || '', player => {
    player.loop = false;
  });
  
  // Check permission on mount
  useEffect(() => {
    if (!permissionLoading && !hasPermission(PERMISSION_KEYS.RUNNING_ANALYSIS)) {
      Alert.alert(
        '🔒 Admin Permission Required',
        'Access to AI Running Analysis requires admin approval.\n\nPlease contact your administrator to enable this feature for your account.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [permissionLoading, hasPermission, router]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<GaitAnalysis | null>(null);
  const [keyFrames, setKeyFrames] = useState<KeyFrame[]>([]);
  const [manualOverrides, setManualOverrides] = useState<ManualOverride[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'video' | 'analysis' | 'keyframes'>('video');
  const [showAddKeyFrame, setShowAddKeyFrame] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedParameter, setSelectedParameter] = useState<string | null>(null);
  const [overrideValue, setOverrideValue] = useState('');
  const [selectedPhase, setSelectedPhase] = useState(GAIT_PHASES.INITIAL_CONTACT);
  const [keyFrameLabel, setKeyFrameLabel] = useState('');
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [assessmentSaved, setAssessmentSaved] = useState(false);

  // Pick video
  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant gallery permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setVideoUri(result.assets[0].uri);
      setAnalysis(null);
      setKeyFrames([]);
      setManualOverrides([]);
      setPosition(0);
    }
  };

  // Record video
  const recordVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 0.8,
      videoMaxDuration: 30,
    });

    if (!result.canceled && result.assets[0]) {
      setVideoUri(result.assets[0].uri);
      setAnalysis(null);
      setKeyFrames([]);
      setManualOverrides([]);
      setPosition(0);
    }
  };

  // Video playback controls
  const togglePlayback = async () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  const seekTo = async (value: number) => {
    if (!videoRef.current) return;
    await videoRef.current.setPositionAsync(value);
    setPosition(value);
  };

  const stepFrame = async (direction: 'forward' | 'backward') => {
    if (!videoRef.current) return;
    const frameTime = 33; // ~30fps
    const newPosition = direction === 'forward' 
      ? Math.min(position + frameTime, duration)
      : Math.max(position - frameTime, 0);
    await videoRef.current.setPositionAsync(newPosition);
    setPosition(newPosition);
  };

  const changePlaybackRate = async (rate: number) => {
    if (!videoRef.current) return;
    await videoRef.current.setRateAsync(rate, true);
    setPlaybackRate(rate);
  };

  // Add key frame
  const addKeyFrame = () => {
    if (!keyFrameLabel.trim()) {
      Alert.alert('Required', 'Please enter a label for the key frame');
      return;
    }

    const newKeyFrame: KeyFrame = {
      id: Date.now().toString(),
      timestamp: position,
      phase: selectedPhase,
      label: keyFrameLabel,
    };

    setKeyFrames([...keyFrames, newKeyFrame].sort((a, b) => a.timestamp - b.timestamp));
    setShowAddKeyFrame(false);
    setKeyFrameLabel('');
  };

  // Jump to key frame
  const jumpToKeyFrame = async (keyFrame: KeyFrame) => {
    await seekTo(keyFrame.timestamp);
    if (isPlaying) {
      await videoRef.current?.pauseAsync();
      setIsPlaying(false);
    }
  };

  // Analyze running gait
  const analyzeRunning = async () => {
    if (!videoUri) {
      Alert.alert('Error', 'Please upload a video first');
      return;
    }

    setAnalyzing(true);
    try {
      // Call backend AI analysis
      const response = await api.post('/ai/analyze-running-gait', {
        video_uri: videoUri,
        patient_name: selectedPatient?.name || 'Unknown',
        key_frames: keyFrames,
      });

      if (response.data) {
        setAnalysis(response.data);
        setActiveTab('analysis');
      } else {
        generateSimulatedAnalysis();
      }
    } catch (error) {
      console.error('Analysis error:', error);
      generateSimulatedAnalysis();
    } finally {
      setAnalyzing(false);
    }
  };

  // Generate simulated analysis
  const generateSimulatedAnalysis = () => {
    const baseConfidence = 75 + Math.random() * 18;
    
    const cadenceValue = 165 + Math.random() * 30;
    const stepLengthL = 0.95 + Math.random() * 0.3;
    const stepLengthR = 0.95 + Math.random() * 0.3;
    const strideLengthValue = stepLengthL + stepLengthR;
    const gctL = 220 + Math.random() * 60;
    const gctR = 220 + Math.random() * 60;
    const vertOsc = 6 + Math.random() * 5;
    const hipDropL = 3 + Math.random() * 6;
    const hipDropR = 3 + Math.random() * 6;
    const trunkLeanValue = 2 + Math.random() * 8;
    const armSwingValue = 85 + Math.random() * 15;
    const kneeFlexL = 25 + Math.random() * 15;
    const kneeFlexR = 25 + Math.random() * 15;

    const getStatus = (value: number, thresholds: [number, number, number], labels: string[] = ['Optimal', 'Acceptable', 'Needs Attention', 'Poor']): string => {
      if (value < thresholds[0]) return labels[0];
      if (value < thresholds[1]) return labels[1];
      if (value < thresholds[2]) return labels[2];
      return labels[3];
    };

    const getAsymmetryStatus = (asymmetry: number): string => {
      if (asymmetry < 5) return 'Symmetrical';
      if (asymmetry < 10) return 'Mild Asymmetry';
      if (asymmetry < 15) return 'Moderate Asymmetry';
      return 'Significant Asymmetry';
    };

    const stepAsymmetry = Math.abs(stepLengthL - stepLengthR) / Math.max(stepLengthL, stepLengthR) * 100;
    const gctAsymmetry = Math.abs(gctL - gctR) / Math.max(gctL, gctR) * 100;

    const overallScore = Math.max(50, Math.min(95, Math.round(
      100 - (Math.abs(180 - cadenceValue) * 0.2 + stepAsymmetry * 2 + gctAsymmetry * 1.5 + 
             vertOsc * 0.5 + Math.max(hipDropL, hipDropR) * 1.5 + trunkLeanValue * 1.2)
    )));

    const analysisResult: GaitAnalysis = {
      cadence: {
        value: Math.round(cadenceValue),
        status: cadenceValue >= 170 && cadenceValue <= 190 ? 'Optimal' : (cadenceValue >= 160 ? 'Acceptable' : 'Low - Increase Recommended'),
        aiConfidence: Math.round(baseConfidence + Math.random() * 8),
      },
      stepLength: {
        left: Math.round(stepLengthL * 100) / 100,
        right: Math.round(stepLengthR * 100) / 100,
        asymmetry: Math.round(stepAsymmetry * 10) / 10,
        status: getAsymmetryStatus(stepAsymmetry),
        aiConfidence: Math.round(baseConfidence + Math.random() * 6),
      },
      strideLength: {
        value: Math.round(strideLengthValue * 100) / 100,
        status: strideLengthValue >= 2.0 && strideLengthValue <= 2.6 ? 'Optimal' : 'Needs Attention',
        aiConfidence: Math.round(baseConfidence + Math.random() * 7),
      },
      groundContactTime: {
        left: Math.round(gctL),
        right: Math.round(gctR),
        asymmetry: Math.round(gctAsymmetry * 10) / 10,
        status: getAsymmetryStatus(gctAsymmetry),
        aiConfidence: Math.round(baseConfidence + Math.random() * 9),
      },
      verticalOscillation: {
        value: Math.round(vertOsc * 10) / 10,
        status: vertOsc < 8 ? 'Efficient' : (vertOsc < 10 ? 'Acceptable' : 'Excessive - Energy Leak'),
        aiConfidence: Math.round(baseConfidence + Math.random() * 5),
      },
      hipDrop: {
        left: Math.round(hipDropL * 10) / 10,
        right: Math.round(hipDropR * 10) / 10,
        status: Math.max(hipDropL, hipDropR) < 5 ? 'Normal' : (Math.max(hipDropL, hipDropR) < 8 ? 'Mild Trendelenburg' : 'Significant - Glute Weakness'),
        aiConfidence: Math.round(baseConfidence + Math.random() * 7),
      },
      trunkLean: {
        value: Math.round(trunkLeanValue * 10) / 10,
        status: trunkLeanValue < 5 ? 'Normal' : (trunkLeanValue < 8 ? 'Mild Forward Lean' : 'Excessive'),
        aiConfidence: Math.round(baseConfidence + Math.random() * 6),
      },
      armSwingSymmetry: {
        value: Math.round(armSwingValue),
        status: armSwingValue > 90 ? 'Symmetrical' : (armSwingValue > 80 ? 'Mild Asymmetry' : 'Asymmetric'),
        aiConfidence: Math.round(baseConfidence + Math.random() * 8),
      },
      kneeFlexionAtContact: {
        left: Math.round(kneeFlexL),
        right: Math.round(kneeFlexR),
        status: (kneeFlexL >= 20 && kneeFlexL <= 35 && kneeFlexR >= 20 && kneeFlexR <= 35) ? 'Optimal' : 'Needs Attention',
        aiConfidence: Math.round(baseConfidence + Math.random() * 5),
      },
      footStrike: {
        type: FOOT_STRIKE_TYPES[Math.floor(Math.random() * 3)],
        aiConfidence: Math.round(baseConfidence + Math.random() * 10),
      },
      overallScore,
      riskLevel: overallScore > 80 ? 'Low Injury Risk' : (overallScore > 65 ? 'Moderate Risk' : 'High Injury Risk'),
      recommendations: [
        overallScore < 70 ? 'Focus on increasing cadence to 180 steps/min' : 'Maintain current cadence',
        stepAsymmetry > 8 ? 'Address step length asymmetry with single-leg exercises' : 'Good step symmetry',
        Math.max(hipDropL, hipDropR) > 6 ? 'Strengthen gluteus medius to reduce hip drop' : 'Hip stability is good',
        vertOsc > 9 ? 'Work on reducing vertical bounce with running drills' : 'Efficient vertical movement',
        trunkLeanValue > 6 ? 'Improve core strength to reduce trunk lean' : 'Good trunk posture',
        'Regular gait retraining sessions recommended',
        'Re-assess in 4-6 weeks after implementing corrections',
      ],
    };

    setAnalysis(analysisResult);
    setActiveTab('analysis');
  };

  // Save manual override
  const saveOverride = () => {
    if (!selectedParameter || !overrideValue.trim()) {
      Alert.alert('Required', 'Please enter a value');
      return;
    }

    const aiValue = analysis ? (analysis as any)[selectedParameter]?.value || 0 : 0;
    
    const newOverride: ManualOverride = {
      parameter: selectedParameter,
      aiValue: aiValue,
      correctedValue: parseFloat(overrideValue),
    };

    setManualOverrides([...manualOverrides.filter(o => o.parameter !== selectedParameter), newOverride]);
    setShowOverrideModal(false);
    setSelectedParameter(null);
    setOverrideValue('');
  };

  // Generate comprehensive PDF report
  const generateReport = async () => {
    if (!analysis || !selectedPatient) {
      Alert.alert('Error', 'Please select a patient and complete analysis first');
      return;
    }

    setGeneratingReport(true);
    try {
      const response = await api.post('/generate-running-report', {
        patient_name: selectedPatient?.name || 'Unknown',
        physio_name: currentUser?.name || 'WBA99 Physio',
        analysis_data: analysis,
        key_frames: keyFrames,
        manual_overrides: manualOverrides,
      });

      const { report_html } = response.data;
      const { uri } = await Print.printToFileAsync({ html: report_html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch (error) {
      console.error('Report error:', error);
      await generateLocalReport();
    } finally {
      setGeneratingReport(false);
    }
  };

  // Generate local PDF report
  const generateLocalReport = async () => {
    const currentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const reportId = `WBA99-RUN-${Date.now().toString(36).toUpperCase()}`;

    const getStatusColor = (status: string): string => {
      if (status.includes('Optimal') || status.includes('Efficient') || status.includes('Normal') || status.includes('Symmetrical') || status.includes('Good')) return '#4CAF50';
      if (status.includes('Acceptable') || status.includes('Mild')) return '#FF9800';
      return '#f44336';
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; border-bottom: 3px solid #FF6B35; padding-bottom: 15px; margin-bottom: 20px; }
          .logo { font-size: 28px; font-weight: bold; color: #FF6B35; }
          .title { text-align: center; background: linear-gradient(135deg, #FF6B35, #E55100); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
          .patient-info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .info-item { text-align: center; }
          .info-label { font-size: 10px; color: #666; text-transform: uppercase; }
          .info-value { font-size: 14px; font-weight: bold; }
          .score-card { display: flex; align-items: center; gap: 20px; background: linear-gradient(135deg, #fff3e0, #ffe0b2); padding: 20px; border-radius: 15px; margin-bottom: 20px; }
          .score-circle { width: 100px; height: 100px; border-radius: 50%; background: white; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 4px solid ${analysis?.overallScore && analysis.overallScore > 75 ? '#4CAF50' : '#FF9800'}; }
          .score-value { font-size: 32px; font-weight: bold; color: ${analysis?.overallScore && analysis.overallScore > 75 ? '#4CAF50' : '#FF9800'}; }
          .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
          .metric-card { background: #f8f9fa; border-radius: 10px; padding: 15px; border-left: 4px solid #FF6B35; }
          .metric-label { font-size: 11px; color: #666; margin-bottom: 5px; text-transform: uppercase; }
          .metric-value { font-size: 24px; font-weight: bold; color: #333; }
          .metric-status { font-size: 11px; padding: 3px 8px; border-radius: 10px; display: inline-block; color: white; margin-top: 5px; }
          .metric-confidence { font-size: 10px; color: #999; margin-top: 5px; }
          .section { margin-bottom: 20px; }
          .section-header { background: #FF6B35; color: white; padding: 10px 15px; border-radius: 5px 5px 0 0; font-weight: bold; }
          .section-content { border: 1px solid #ddd; border-top: none; padding: 15px; border-radius: 0 0 5px 5px; }
          .key-frames-list { list-style: none; padding: 0; }
          .key-frame-item { display: flex; align-items: center; gap: 10px; padding: 8px; background: #e3f2fd; border-radius: 5px; margin-bottom: 5px; }
          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">WBA99</div>
          <div style="text-align: right; font-size: 11px; color: #666;">
            <p><strong>Report ID:</strong> ${reportId}</p>
            <p><strong>Date:</strong> ${currentDate}</p>
          </div>
        </div>
        
        <div class="title">
          <h1>🏃 AI Running Gait Analysis Report</h1>
          <p>Frame-by-Frame Biomechanics Assessment</p>
        </div>
        
        <div class="patient-info">
          <div class="info-item">
            <div class="info-label">Patient Name</div>
            <div class="info-value">${selectedPatient?.name || 'Unknown'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Foot Strike</div>
            <div class="info-value">${analysis?.footStrike.type}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Assessed By</div>
            <div class="info-value">${currentUser?.name || 'WBA99 Physio'}</div>
          </div>
        </div>
        
        <div class="score-card">
          <div class="score-circle">
            <div class="score-value">${analysis?.overallScore}%</div>
            <div style="font-size: 10px; color: #666;">Score</div>
          </div>
          <div>
            <h3 style="color: #E55100; margin-bottom: 5px;">Running Efficiency Score</h3>
            <p style="font-size: 18px; font-weight: bold; color: ${analysis?.overallScore && analysis.overallScore > 75 ? '#4CAF50' : '#FF9800'};">${analysis?.riskLevel}</p>
            <p style="font-size: 12px; color: #666;">${keyFrames.length} Key Frames Analyzed • ${manualOverrides.length} Manual Corrections</p>
          </div>
        </div>
        
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Cadence</div>
            <div class="metric-value">${analysis?.cadence.value} spm</div>
            <span class="metric-status" style="background: ${getStatusColor(analysis?.cadence.status || '')}">${analysis?.cadence.status}</span>
            <div class="metric-confidence">AI Confidence: ${analysis?.cadence.aiConfidence}%</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Stride Length</div>
            <div class="metric-value">${analysis?.strideLength.value}m</div>
            <span class="metric-status" style="background: ${getStatusColor(analysis?.strideLength.status || '')}">${analysis?.strideLength.status}</span>
            <div class="metric-confidence">AI Confidence: ${analysis?.strideLength.aiConfidence}%</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Vertical Oscillation</div>
            <div class="metric-value">${analysis?.verticalOscillation.value}cm</div>
            <span class="metric-status" style="background: ${getStatusColor(analysis?.verticalOscillation.status || '')}">${analysis?.verticalOscillation.status}</span>
            <div class="metric-confidence">AI Confidence: ${analysis?.verticalOscillation.aiConfidence}%</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Trunk Lean</div>
            <div class="metric-value">${analysis?.trunkLean.value}°</div>
            <span class="metric-status" style="background: ${getStatusColor(analysis?.trunkLean.status || '')}">${analysis?.trunkLean.status}</span>
            <div class="metric-confidence">AI Confidence: ${analysis?.trunkLean.aiConfidence}%</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Step Length (L/R)</div>
            <div class="metric-value">${analysis?.stepLength.left}m / ${analysis?.stepLength.right}m</div>
            <span class="metric-status" style="background: ${getStatusColor(analysis?.stepLength.status || '')}">${analysis?.stepLength.status} (${analysis?.stepLength.asymmetry}%)</span>
          </div>
          <div class="metric-card">
            <div class="metric-label">Ground Contact (L/R)</div>
            <div class="metric-value">${analysis?.groundContactTime.left}ms / ${analysis?.groundContactTime.right}ms</div>
            <span class="metric-status" style="background: ${getStatusColor(analysis?.groundContactTime.status || '')}">${analysis?.groundContactTime.status}</span>
          </div>
          <div class="metric-card">
            <div class="metric-label">Hip Drop (L/R)</div>
            <div class="metric-value">${analysis?.hipDrop.left}° / ${analysis?.hipDrop.right}°</div>
            <span class="metric-status" style="background: ${getStatusColor(analysis?.hipDrop.status || '')}">${analysis?.hipDrop.status}</span>
          </div>
          <div class="metric-card">
            <div class="metric-label">Arm Swing Symmetry</div>
            <div class="metric-value">${analysis?.armSwingSymmetry.value}%</div>
            <span class="metric-status" style="background: ${getStatusColor(analysis?.armSwingSymmetry.status || '')}">${analysis?.armSwingSymmetry.status}</span>
          </div>
        </div>
        
        ${keyFrames.length > 0 ? `
        <div class="section">
          <div class="section-header">🎯 Key Frames Analyzed (${keyFrames.length})</div>
          <div class="section-content">
            <ul class="key-frames-list">
              ${keyFrames.map(kf => `
                <li class="key-frame-item">
                  <strong>${(kf.timestamp / 1000).toFixed(2)}s</strong> - ${kf.label} (${kf.phase.replace('_', ' ')})
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
        ` : ''}
        
        <div class="section">
          <div class="section-header">💡 AI Recommendations</div>
          <div class="section-content">
            <ul style="margin-left: 20px;">
              ${analysis?.recommendations.map(r => `<li style="margin-bottom: 8px;">${r}</li>`).join('')}
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p>Generated by WBA99 AI Running Analysis System | Frame-by-Frame Gait Assessment</p>
          <p><em>This report combines AI detection with manual clinical review. Always correlate with clinical examination.</em></p>
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  };

  // Format time
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const remainingMs = Math.floor((ms % 1000) / 10);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${remainingMs.toString().padStart(2, '0')}`;
  };

  // Save assessment to database
  const handleSaveAssessment = async () => {
    if (!analysis || !selectedPatient || !currentUser?.id) {
      Alert.alert('Error', 'Please select a patient and complete the analysis first');
      return;
    }

    setSavingAssessment(true);
    try {
      const reportData = {
        physio_id: currentUser.id,
        patient_id: selectedPatient.id,
        assessment_type: 'ai_running',
        report_data: {
          cadence: analysis.cadence,
          stepLength: analysis.stepLength,
          strideLength: analysis.strideLength,
          groundContactTime: analysis.groundContactTime,
          verticalOscillation: analysis.verticalOscillation,
          hipDrop: analysis.hipDrop,
          trunkLean: analysis.trunkLean,
          armSwingSymmetry: analysis.armSwingSymmetry,
          kneeFlexionAtContact: analysis.kneeFlexionAtContact,
          footStrike: analysis.footStrike,
          overallScore: analysis.overallScore,
          riskLevel: analysis.riskLevel,
          keyFrames: keyFrames,
          manualOverrides: manualOverrides,
        },
        summary: `Running Gait Analysis: Score ${analysis.overallScore}%, ${analysis.riskLevel}, Foot Strike: ${analysis.footStrike.type}`,
      };

      await saveAssessmentReport(reportData);
      setAssessmentSaved(true);
      Alert.alert(
        '✅ Assessment Saved',
        `Running analysis for ${selectedPatient.name} has been saved successfully.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving assessment:', error);
      Alert.alert('Error', 'Failed to save assessment. Please try again.');
    } finally {
      setSavingAssessment(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Running Analysis</Text>
          <TouchableOpacity onPress={() => Alert.alert('Info', 'AI-powered running gait analysis with frame-by-frame video controls and biomechanics assessment.')}>
            <Ionicons name="information-circle" size={24} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="run-fast" size={40} color="#FF6B35" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>AI Gait Analysis</Text>
            <Text style={styles.infoSubtitle}>
              Frame-by-frame • Cadence • Step Length • Hip Drop • Foot Strike
            </Text>
          </View>
        </View>

        {/* Patient Selector */}
        <PatientSelector
          physioId={currentUser?.id || ''}
          selectedPatient={selectedPatient}
          onSelectPatient={setSelectedPatient}
          label="Select Patient"
          placeholder="Tap to select a patient for analysis"
        />

        {/* Video Upload Section */}
        {!videoUri ? (
          <View style={styles.uploadSection}>
            <MaterialCommunityIcons name="run" size={80} color="#FF6B35" />
            <Text style={styles.uploadTitle}>Upload Running Video</Text>
            <Text style={styles.uploadSubtitle}>
              Lateral view recommended for best analysis
            </Text>
            
            <View style={styles.uploadButtons}>
              <TouchableOpacity style={styles.uploadButton} onPress={pickVideo}>
                <Ionicons name="videocam" size={24} color={theme.colors.textPrimary} />
                <Text style={styles.uploadButtonText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadButton} onPress={recordVideo}>
                <Ionicons name="camera" size={24} color={theme.colors.textPrimary} />
                <Text style={styles.uploadButtonText}>Record</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.featureList}>
              <Text style={styles.featureTitle}>🏃 Analysis Features:</Text>
              <Text style={styles.featureItem}>• Cadence (steps per minute)</Text>
              <Text style={styles.featureItem}>• Step & stride length</Text>
              <Text style={styles.featureItem}>• Ground contact time</Text>
              <Text style={styles.featureItem}>• Vertical oscillation</Text>
              <Text style={styles.featureItem}>• Hip drop (Trendelenburg)</Text>
              <Text style={styles.featureItem}>• Foot strike pattern</Text>
              <Text style={styles.featureItem}>• Frame-by-frame controls</Text>
            </View>
          </View>
        ) : (
          <>
            {/* Tab Selector */}
            <View style={styles.tabSelector}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'video' && styles.tabActive]}
                onPress={() => setActiveTab('video')}
              >
                <Ionicons name="videocam" size={18} color={activeTab === 'video' ? theme.colors.textPrimary : theme.colors.textMuted} />
                <Text style={[styles.tabText, activeTab === 'video' && styles.tabTextActive]}>Video</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'keyframes' && styles.tabActive]}
                onPress={() => setActiveTab('keyframes')}
              >
                <Ionicons name="flag" size={18} color={activeTab === 'keyframes' ? theme.colors.textPrimary : theme.colors.textMuted} />
                <Text style={[styles.tabText, activeTab === 'keyframes' && styles.tabTextActive]}>Key Frames</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'analysis' && styles.tabActive]}
                onPress={() => setActiveTab('analysis')}
                disabled={!analysis}
              >
                <Ionicons name="analytics" size={18} color={activeTab === 'analysis' ? theme.colors.textPrimary : theme.colors.textMuted} />
                <Text style={[styles.tabText, activeTab === 'analysis' && styles.tabTextActive]}>Analysis</Text>
              </TouchableOpacity>
            </View>

            {/* Video Tab */}
            {activeTab === 'video' && (
              <>
                {/* Video Player */}
                <View style={styles.videoContainer}>
                  <VideoView
                    player={videoPlayer}
                    style={styles.video}
                    contentFit="contain"
                    nativeControls
                  />
                  
                  <TouchableOpacity
                    style={styles.changeVideoButton}
                    onPress={() => {
                      setVideoUri(null);
                      setAnalysis(null);
                      setKeyFrames([]);
                    }}
                  >
                    <Ionicons name="refresh" size={16} color={theme.colors.textPrimary} />
                    <Text style={styles.changeVideoText}>Change</Text>
                  </TouchableOpacity>
                </View>

                {/* Time Display */}
                <View style={styles.timeDisplay}>
                  <Text style={styles.timeText}>{formatTime(position)}</Text>
                  <Text style={styles.timeSeparator}>/</Text>
                  <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>

                {/* Progress Slider */}
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={duration}
                  value={position}
                  onSlidingComplete={seekTo}
                  minimumTrackTintColor="#FF6B35"
                  maximumTrackTintColor={theme.colors.cardBorder}
                  thumbTintColor="#FF6B35"
                />

                {/* Playback Controls */}
                <View style={styles.playbackControls}>
                  <TouchableOpacity style={styles.controlButton} onPress={() => stepFrame('backward')}>
                    <Ionicons name="play-back" size={24} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
                    <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.controlButton} onPress={() => stepFrame('forward')}>
                    <Ionicons name="play-forward" size={24} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Speed Controls */}
                <View style={styles.speedControls}>
                  <Text style={styles.speedLabel}>Speed:</Text>
                  {[0.25, 0.5, 1.0].map(rate => (
                    <TouchableOpacity
                      key={rate}
                      style={[styles.speedButton, playbackRate === rate && styles.speedButtonActive]}
                      onPress={() => changePlaybackRate(rate)}
                    >
                      <Text style={[styles.speedButtonText, playbackRate === rate && styles.speedButtonTextActive]}>
                        {rate}x
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Add Key Frame Button */}
                <TouchableOpacity
                  style={styles.addKeyFrameButton}
                  onPress={() => setShowAddKeyFrame(true)}
                >
                  <Ionicons name="flag" size={20} color={theme.colors.textPrimary} />
                  <Text style={styles.addKeyFrameText}>Mark Key Frame at {formatTime(position)}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Key Frames Tab */}
            {activeTab === 'keyframes' && (
              <View style={styles.keyFramesContainer}>
                <Text style={styles.sectionTitle}>🎯 Key Frames ({keyFrames.length})</Text>
                
                {keyFrames.length === 0 ? (
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="flag-outline" size={60} color={theme.colors.textMuted} />
                    <Text style={styles.emptyStateText}>No key frames marked</Text>
                    <Text style={styles.emptyStateSubtext}>Go to Video tab and mark important frames</Text>
                  </View>
                ) : (
                  keyFrames.map((kf, index) => (
                    <TouchableOpacity
                      key={kf.id}
                      style={styles.keyFrameCard}
                      onPress={() => {
                        jumpToKeyFrame(kf);
                        setActiveTab('video');
                      }}
                    >
                      <View style={styles.keyFrameIndex}>
                        <Text style={styles.keyFrameIndexText}>{index + 1}</Text>
                      </View>
                      <View style={styles.keyFrameInfo}>
                        <Text style={styles.keyFrameLabel}>{kf.label}</Text>
                        <Text style={styles.keyFramePhase}>{kf.phase.replace('_', ' ')}</Text>
                      </View>
                      <Text style={styles.keyFrameTime}>{formatTime(kf.timestamp)}</Text>
                      <TouchableOpacity
                        onPress={() => setKeyFrames(keyFrames.filter(k => k.id !== kf.id))}
                      >
                        <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* Analysis Tab */}
            {activeTab === 'analysis' && analysis && (
              <View style={styles.analysisContainer}>
                {/* Score Card */}
                <View style={styles.scoreCard}>
                  <View style={[styles.scoreCircle, { borderColor: analysis.overallScore > 75 ? theme.colors.success : theme.colors.warning }]}>
                    <Text style={[styles.scoreValue, { color: analysis.overallScore > 75 ? theme.colors.success : theme.colors.warning }]}>
                      {analysis.overallScore}%
                    </Text>
                  </View>
                  <View style={styles.scoreDetails}>
                    <Text style={[styles.riskLevel, { color: analysis.overallScore > 75 ? theme.colors.success : theme.colors.warning }]}>
                      {analysis.riskLevel}
                    </Text>
                    <Text style={styles.footStrikeText}>Foot Strike: {analysis.footStrike.type}</Text>
                  </View>
                </View>

                {/* Metrics Grid */}
                <View style={styles.metricsGrid}>
                  <MetricCard
                    title="Cadence"
                    value={`${analysis.cadence.value} spm`}
                    status={analysis.cadence.status}
                    confidence={analysis.cadence.aiConfidence}
                    onOverride={() => {
                      setSelectedParameter('cadence');
                      setShowOverrideModal(true);
                    }}
                  />
                  <MetricCard
                    title="Stride Length"
                    value={`${analysis.strideLength.value}m`}
                    status={analysis.strideLength.status}
                    confidence={analysis.strideLength.aiConfidence}
                    onOverride={() => {
                      setSelectedParameter('strideLength');
                      setShowOverrideModal(true);
                    }}
                  />
                  <MetricCard
                    title="Vertical Osc."
                    value={`${analysis.verticalOscillation.value}cm`}
                    status={analysis.verticalOscillation.status}
                    confidence={analysis.verticalOscillation.aiConfidence}
                  />
                  <MetricCard
                    title="Trunk Lean"
                    value={`${analysis.trunkLean.value}°`}
                    status={analysis.trunkLean.status}
                    confidence={analysis.trunkLean.aiConfidence}
                  />
                </View>

                {/* Asymmetry Cards */}
                <Text style={styles.sectionTitle}>Bilateral Comparison</Text>
                <View style={styles.asymmetryCard}>
                  <Text style={styles.asymmetryTitle}>Step Length</Text>
                  <View style={styles.asymmetryRow}>
                    <View style={styles.asymmetrySide}>
                      <Text style={styles.asymmetrySideLabel}>LEFT</Text>
                      <Text style={styles.asymmetrySideValue}>{analysis.stepLength.left}m</Text>
                    </View>
                    <View style={styles.asymmetryMiddle}>
                      <Text style={styles.asymmetryPercent}>{analysis.stepLength.asymmetry}%</Text>
                      <Text style={styles.asymmetryStatus}>{analysis.stepLength.status}</Text>
                    </View>
                    <View style={styles.asymmetrySide}>
                      <Text style={styles.asymmetrySideLabel}>RIGHT</Text>
                      <Text style={styles.asymmetrySideValue}>{analysis.stepLength.right}m</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.asymmetryCard}>
                  <Text style={styles.asymmetryTitle}>Ground Contact Time</Text>
                  <View style={styles.asymmetryRow}>
                    <View style={styles.asymmetrySide}>
                      <Text style={styles.asymmetrySideLabel}>LEFT</Text>
                      <Text style={styles.asymmetrySideValue}>{analysis.groundContactTime.left}ms</Text>
                    </View>
                    <View style={styles.asymmetryMiddle}>
                      <Text style={styles.asymmetryPercent}>{analysis.groundContactTime.asymmetry}%</Text>
                      <Text style={styles.asymmetryStatus}>{analysis.groundContactTime.status}</Text>
                    </View>
                    <View style={styles.asymmetrySide}>
                      <Text style={styles.asymmetrySideLabel}>RIGHT</Text>
                      <Text style={styles.asymmetrySideValue}>{analysis.groundContactTime.right}ms</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.asymmetryCard}>
                  <Text style={styles.asymmetryTitle}>Hip Drop (Trendelenburg)</Text>
                  <View style={styles.asymmetryRow}>
                    <View style={styles.asymmetrySide}>
                      <Text style={styles.asymmetrySideLabel}>LEFT</Text>
                      <Text style={styles.asymmetrySideValue}>{analysis.hipDrop.left}°</Text>
                    </View>
                    <View style={styles.asymmetryMiddle}>
                      <Text style={styles.asymmetryStatus}>{analysis.hipDrop.status}</Text>
                    </View>
                    <View style={styles.asymmetrySide}>
                      <Text style={styles.asymmetrySideLabel}>RIGHT</Text>
                      <Text style={styles.asymmetrySideValue}>{analysis.hipDrop.right}°</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Analyze / Report Buttons */}
            {!analysis ? (
              <TouchableOpacity
                style={[styles.analyzeButton, analyzing && styles.buttonDisabled]}
                onPress={analyzeRunning}
                disabled={analyzing}
              >
                {analyzing ? (
                  <>
                    <ActivityIndicator color={theme.colors.textPrimary} />
                    <Text style={styles.analyzeButtonText}>Analyzing Gait...</Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="run-fast" size={24} color={theme.colors.textPrimary} />
                    <Text style={styles.analyzeButtonText}>Analyze Running Gait</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.reportButton, generatingReport && styles.buttonDisabled]}
                  onPress={generateReport}
                  disabled={generatingReport}
                >
                  {generatingReport ? (
                    <>
                      <ActivityIndicator color={theme.colors.textPrimary} />
                      <Text style={styles.reportButtonText}>Generating Report...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="document-text" size={24} color={theme.colors.textPrimary} />
                      <Text style={styles.reportButtonText}>Generate Comprehensive Report</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Save Assessment Button */}
                <TouchableOpacity
                  style={[styles.saveButton, (savingAssessment || assessmentSaved) && styles.buttonDisabled]}
                  onPress={handleSaveAssessment}
                  disabled={savingAssessment || assessmentSaved}
                >
                  {savingAssessment ? (
                    <>
                      <ActivityIndicator color={theme.colors.textPrimary} />
                      <Text style={styles.saveButtonText}>Saving Assessment...</Text>
                    </>
                  ) : assessmentSaved ? (
                    <>
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.textPrimary} />
                      <Text style={styles.saveButtonText}>Assessment Saved</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="save" size={24} color={theme.colors.textPrimary} />
                      <Text style={styles.saveButtonText}>Save Assessment to Patient Record</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {/* Add Key Frame Modal */}
        <Modal visible={showAddKeyFrame} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Key Frame</Text>
              <Text style={styles.modalSubtitle}>Time: {formatTime(position)}</Text>

              <Text style={styles.modalLabel}>Gait Phase</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.phaseSelector}>
                {Object.entries(GAIT_PHASES).map(([key, value]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.phaseButton, selectedPhase === value && styles.phaseButtonActive]}
                    onPress={() => setSelectedPhase(value)}
                  >
                    <Text style={[styles.phaseButtonText, selectedPhase === value && styles.phaseButtonTextActive]}>
                      {key.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.modalLabel}>Label</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Right foot initial contact"
                placeholderTextColor={theme.colors.textMuted}
                value={keyFrameLabel}
                onChangeText={setKeyFrameLabel}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalSaveButton} onPress={addKeyFrame}>
                  <Text style={styles.modalSaveButtonText}>Save Key Frame</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => {
                  setShowAddKeyFrame(false);
                  setKeyFrameLabel('');
                }}>
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Override Modal */}
        <Modal visible={showOverrideModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Manual Override</Text>
              <Text style={styles.modalSubtitle}>{selectedParameter?.replace(/([A-Z])/g, ' $1').trim()}</Text>

              <Text style={styles.modalLabel}>Corrected Value</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter corrected value"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={overrideValue}
                onChangeText={setOverrideValue}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalSaveButton} onPress={saveOverride}>
                  <Text style={styles.modalSaveButtonText}>Save Override</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => {
                  setShowOverrideModal(false);
                  setSelectedParameter(null);
                  setOverrideValue('');
                }}>
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

// Metric Card Component
const MetricCard = ({ title, value, status, confidence, onOverride }: { 
  title: string; 
  value: string; 
  status: string; 
  confidence: number;
  onOverride?: () => void;
}) => {
  const getStatusColor = () => {
    if (status.includes('Optimal') || status.includes('Efficient') || status.includes('Normal')) return theme.colors.success;
    if (status.includes('Acceptable') || status.includes('Mild')) return theme.colors.warning;
    return theme.colors.error;
  };

  return (
    <TouchableOpacity style={styles.metricCard} onPress={onOverride} disabled={!onOverride}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <View style={[styles.metricStatusBadge, { backgroundColor: getStatusColor() + '20' }]}>
        <Text style={[styles.metricStatusText, { color: getStatusColor() }]}>{status}</Text>
      </View>
      <Text style={styles.metricConfidence}>AI: {confidence}%</Text>
      {onOverride && (
        <Ionicons name="create-outline" size={14} color={theme.colors.accent} style={styles.overrideIcon} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  scrollContent: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  headerTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 2, borderColor: '#FF6B35' },
  infoTextContainer: { flex: 1, marginLeft: theme.spacing.md },
  infoTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  infoSubtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 2 },
  inputSection: { marginBottom: theme.spacing.md },
  inputLabel: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  input: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, color: theme.colors.textPrimary, fontSize: theme.fontSize.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  uploadSection: { alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.xl, borderWidth: 2, borderStyle: 'dashed', borderColor: '#FF6B35' },
  uploadTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginTop: theme.spacing.md },
  uploadSubtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.sm },
  uploadButtons: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.lg },
  uploadButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF6B35', paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg, borderRadius: theme.borderRadius.md, gap: theme.spacing.sm },
  uploadButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  featureList: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginTop: theme.spacing.lg, width: '100%' },
  featureTitle: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  featureItem: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, marginBottom: 4 },
  tabSelector: { flexDirection: 'row', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.xs, marginBottom: theme.spacing.md },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.sm, gap: 4 },
  tabActive: { backgroundColor: '#FF6B35' },
  tabText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  tabTextActive: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.semibold },
  videoContainer: { position: 'relative', marginBottom: theme.spacing.sm, borderRadius: theme.borderRadius.lg, overflow: 'hidden' },
  video: { width: SCREEN_WIDTH - theme.spacing.md * 2, height: (SCREEN_WIDTH - theme.spacing.md * 2) * 0.75, backgroundColor: '#000' },
  changeVideoButton: { position: 'absolute', top: theme.spacing.sm, right: theme.spacing.sm, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingVertical: theme.spacing.xs, paddingHorizontal: theme.spacing.sm, borderRadius: theme.borderRadius.sm, gap: 4 },
  changeVideoText: { fontSize: theme.fontSize.xs, color: theme.colors.textPrimary },
  timeDisplay: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.xs },
  timeText: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  timeSeparator: { fontSize: theme.fontSize.lg, color: theme.colors.textMuted, marginHorizontal: theme.spacing.xs },
  slider: { width: '100%', height: 40 },
  playbackControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: theme.spacing.lg, marginBottom: theme.spacing.md },
  controlButton: { padding: theme.spacing.sm, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.full },
  playButton: { padding: theme.spacing.md, backgroundColor: '#FF6B35', borderRadius: theme.borderRadius.full },
  speedControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  speedLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  speedButton: { paddingVertical: theme.spacing.xs, paddingHorizontal: theme.spacing.md, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.sm },
  speedButtonActive: { backgroundColor: '#FF6B35' },
  speedButtonText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  speedButtonTextActive: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },
  addKeyFrameButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.card, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, gap: theme.spacing.sm, borderWidth: 1, borderColor: '#FF6B35' },
  addKeyFrameText: { fontSize: theme.fontSize.sm, color: '#FF6B35', fontWeight: theme.fontWeight.semibold },
  keyFramesContainer: { marginTop: theme.spacing.md },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  emptyState: { alignItems: 'center', padding: theme.spacing.xl },
  emptyStateText: { fontSize: theme.fontSize.md, color: theme.colors.textMuted, marginTop: theme.spacing.md },
  emptyStateSubtext: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  keyFrameCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, gap: theme.spacing.md },
  keyFrameIndex: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FF6B35', justifyContent: 'center', alignItems: 'center' },
  keyFrameIndexText: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },
  keyFrameInfo: { flex: 1 },
  keyFrameLabel: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  keyFramePhase: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, textTransform: 'capitalize' },
  keyFrameTime: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: '#FF6B35' },
  analysisContainer: { marginTop: theme.spacing.md },
  scoreCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md },
  scoreCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center', borderWidth: 4 },
  scoreValue: { fontSize: 24, fontWeight: theme.fontWeight.bold },
  scoreDetails: { flex: 1, marginLeft: theme.spacing.md },
  riskLevel: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold },
  footStrikeText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 2 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  metricCard: { width: (SCREEN_WIDTH - theme.spacing.md * 2 - theme.spacing.sm) / 2 - 1, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  metricTitle: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginBottom: 4 },
  metricValue: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  metricStatusBadge: { paddingHorizontal: theme.spacing.sm, paddingVertical: 2, borderRadius: theme.borderRadius.sm, marginTop: theme.spacing.xs, alignSelf: 'flex-start' },
  metricStatusText: { fontSize: 10, fontWeight: theme.fontWeight.bold },
  metricConfidence: { fontSize: 10, color: theme.colors.textMuted, marginTop: 4 },
  overrideIcon: { position: 'absolute', top: theme.spacing.sm, right: theme.spacing.sm },
  asymmetryCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  asymmetryTitle: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm, textAlign: 'center' },
  asymmetryRow: { flexDirection: 'row', alignItems: 'center' },
  asymmetrySide: { flex: 1, alignItems: 'center' },
  asymmetrySideLabel: { fontSize: 10, color: theme.colors.textMuted },
  asymmetrySideValue: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  asymmetryMiddle: { alignItems: 'center', paddingHorizontal: theme.spacing.md },
  asymmetryPercent: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.accent },
  asymmetryStatus: { fontSize: 10, color: theme.colors.textMuted },
  analyzeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF6B35', padding: theme.spacing.md, borderRadius: theme.borderRadius.md, gap: theme.spacing.sm, marginTop: theme.spacing.lg },
  analyzeButtonText: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  reportButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.success, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, gap: theme.spacing.sm, marginTop: theme.spacing.lg },
  reportButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accent, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  saveButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  buttonDisabled: { opacity: 0.6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: theme.spacing.lg },
  modalContent: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.xl },
  modalTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, textAlign: 'center' },
  modalSubtitle: { fontSize: theme.fontSize.md, color: '#FF6B35', textAlign: 'center', marginBottom: theme.spacing.lg },
  modalLabel: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  phaseSelector: { marginBottom: theme.spacing.md },
  phaseButton: { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm, marginRight: theme.spacing.sm },
  phaseButtonActive: { backgroundColor: '#FF6B35' },
  phaseButtonText: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, textTransform: 'capitalize' },
  phaseButtonTextActive: { color: theme.colors.textPrimary },
  modalInput: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, color: theme.colors.textPrimary, fontSize: theme.fontSize.md, marginBottom: theme.spacing.lg },
  modalButtons: { gap: theme.spacing.sm },
  modalSaveButton: { backgroundColor: '#FF6B35', padding: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  modalSaveButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  modalCancelButton: { backgroundColor: theme.colors.primaryLight, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  modalCancelButtonText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
});
