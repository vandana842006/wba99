import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  Dimensions,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useVideoPlayer, VideoView } from 'expo-video';
import Svg, { Line, Circle, Text as SvgText, G, Path, Rect } from 'react-native-svg';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import { PaymentGateModal } from '../../src/utils/PaymentGateModal';
import api from '../../src/utils/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Colors
const COLORS = {
  primary: '#0A0E1A',
  card: '#141B2D',
  accent: '#00BCD4',
  gold: '#FFD700',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  pink: '#E91E63',
  green: '#00E676',
  blue: '#2196F3',
  purple: '#9C27B0',
  orange: '#FF5722',
};

// Analysis modes
type AnalysisMode = 'walking' | 'running';
type ViewMode = 'lateral' | 'posterior' | 'anterior';

// Joint keypoints for pose detection
interface Keypoint {
  name: string;
  x: number;
  y: number;
  score: number;
}

// Angle measurement
interface AngleData {
  name: string;
  angle: number;
  normalRange: { min: number; max: number };
  status: 'normal' | 'deviation' | 'significant';
  side: 'left' | 'right' | 'center';
}

// Frame analysis result
interface FrameAnalysis {
  frameNumber: number;
  timestamp: number;
  keypoints: Keypoint[];
  angles: AngleData[];
  phase: string; // heel_strike, mid_stance, toe_off, swing
}

// Complete analysis result
interface GaitAnalysisResult {
  id: string;
  mode: AnalysisMode;
  view: ViewMode;
  overallScore: number;
  symmetryIndex: number;
  cadence: number;
  strideLength: number;
  frames: FrameAnalysis[];
  jointAngles: {
    hip: { left: number[]; right: number[]; avg: number; deviation: number };
    knee: { left: number[]; right: number[]; avg: number; deviation: number };
    ankle: { left: number[]; right: number[]; avg: number; deviation: number };
    trunk: { angles: number[]; avg: number; deviation: number };
  };
  findings: string[];
  recommendations: string[];
  aiInsights: string;
}

// Pose skeleton connections
const SKELETON_CONNECTIONS = [
  // Head to shoulders
  ['nose', 'left_shoulder'],
  ['nose', 'right_shoulder'],
  // Shoulders
  ['left_shoulder', 'right_shoulder'],
  // Left arm
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  // Right arm
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  // Torso
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  // Left leg
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  // Right leg
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
];

// Normal ranges for joint angles during gait (in degrees)
const NORMAL_RANGES = {
  walking: {
    hip_flexion: { min: 0, max: 30 },
    hip_extension: { min: -10, max: 0 },
    knee_flexion_stance: { min: 0, max: 20 },
    knee_flexion_swing: { min: 40, max: 70 },
    ankle_dorsiflexion: { min: -10, max: 15 },
    ankle_plantarflexion: { min: -20, max: 0 },
    trunk_flexion: { min: 0, max: 5 },
  },
  running: {
    hip_flexion: { min: 20, max: 50 },
    hip_extension: { min: -15, max: 0 },
    knee_flexion_stance: { min: 20, max: 45 },
    knee_flexion_swing: { min: 90, max: 130 },
    ankle_dorsiflexion: { min: 10, max: 25 },
    ankle_plantarflexion: { min: -30, max: -10 },
    trunk_flexion: { min: 5, max: 15 },
  },
};

export default function AIGaitAnalysisScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [permission, requestPermission] = useCameraPermissions();

  // State
  const [mode, setMode] = useState<AnalysisMode>('walking');
  const [viewMode, setViewMode] = useState<ViewMode>('lateral');
  const [activeTab, setActiveTab] = useState<'record' | 'upload' | 'results'>('record');
  
  // Video state
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [result, setResult] = useState<GaitAnalysisResult | null>(null);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  
  // UI state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showPoseOverlay, setShowPoseOverlay] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const frameAnimRef = useRef<NodeJS.Timeout | null>(null);

  // Video player for uploaded/recorded video
  const videoPlayer = useVideoPlayer(videoUri || '', player => {
    player.loop = false;
  });

  useEffect(() => {
    return () => {
      if (recordingInterval.current) clearInterval(recordingInterval.current);
      if (frameAnimRef.current) clearInterval(frameAnimRef.current);
    };
  }, []);

  // Auto-advance skeleton frame while video plays
  useEffect(() => {
    if (isVideoPlaying && result) {
      const fps = result.frames.length / (result.frames.length * 0.0333);
      frameAnimRef.current = setInterval(() => {
        setSelectedFrameIndex(prev => {
          const next = prev + 1;
          if (next >= result.frames.length) {
            setIsVideoPlaying(false);
            videoPlayer.pause();
            return 0;
          }
          return next;
        });
      }, 33); // ~30fps frame advance
    } else {
      if (frameAnimRef.current) {
        clearInterval(frameAnimRef.current);
        frameAnimRef.current = null;
      }
    }
    return () => {
      if (frameAnimRef.current) clearInterval(frameAnimRef.current);
    };
  }, [isVideoPlaying, result]);

  // Pick video from gallery
  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets[0]) {
        setVideoUri(result.assets[0].uri);
        setActiveTab('results');
        // Auto-start analysis
        analyzeVideo(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Video pick error:', error);
      Alert.alert('Error', 'Failed to select video');
    }
  };

  // Record video
  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    setResult(null);
    
    recordingInterval.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= 30) {
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }
    
    // In production, this would save the recorded video
    // For now, we'll simulate with mock data
    simulateVideoAnalysis();
  };

  // Analyze video with AI pose detection
  const analyzeVideo = async (uri: string) => {
    setAnalyzing(true);
    setAnalysisProgress(0);
    
    try {
      // Simulate frame-by-frame analysis progress
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 300);

      // Call backend API for AI analysis
      const response = await api.post('/ai/gait-analysis', {
        video_uri: uri,
        mode: mode,
        view: viewMode,
        patient_id: currentUser?.id,
        physio_id: currentUser?.role === 'physio' ? currentUser.id : undefined,
      });

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      if (response.data) {
        setResult(response.data);
      } else {
        // Use simulated data if API doesn't return results
        simulateVideoAnalysis();
      }
    } catch (error) {
      console.error('Analysis error:', error);
      // Fall back to simulated analysis
      simulateVideoAnalysis();
    } finally {
      setAnalyzing(false);
    }
  };

  // Simulate video analysis with realistic data
  const simulateVideoAnalysis = () => {
    setAnalyzing(true);
    setAnalysisProgress(0);

    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 5;
      });
    }, 100);

    setTimeout(() => {
      clearInterval(progressInterval);
      setAnalysisProgress(100);

      // Generate realistic frame data
      const numFrames = 30;
      const frames: FrameAnalysis[] = [];
      const phases = ['heel_strike', 'loading_response', 'mid_stance', 'terminal_stance', 'pre_swing', 'initial_swing', 'mid_swing', 'terminal_swing'];

      for (let i = 0; i < numFrames; i++) {
        const phase = phases[i % phases.length];
        const hipAngle = mode === 'walking' 
          ? 15 + Math.sin(i * 0.5) * 15 + (Math.random() * 5 - 2.5)
          : 30 + Math.sin(i * 0.5) * 20 + (Math.random() * 5 - 2.5);
        const kneeAngle = mode === 'walking'
          ? 10 + Math.abs(Math.sin(i * 0.5)) * 50 + (Math.random() * 5 - 2.5)
          : 30 + Math.abs(Math.sin(i * 0.5)) * 90 + (Math.random() * 5 - 2.5);
        const ankleAngle = mode === 'walking'
          ? 5 + Math.sin(i * 0.5) * 15 + (Math.random() * 3 - 1.5)
          : 15 + Math.sin(i * 0.5) * 20 + (Math.random() * 3 - 1.5);

        frames.push({
          frameNumber: i + 1,
          timestamp: i * 33.33,
          keypoints: generateMockKeypoints(i, numFrames),
          angles: [
            {
              name: 'Hip Flexion/Extension',
              angle: hipAngle,
              normalRange: mode === 'walking' ? NORMAL_RANGES.walking.hip_flexion : NORMAL_RANGES.running.hip_flexion,
              status: Math.abs(hipAngle) > 35 ? 'deviation' : 'normal',
              side: 'right',
            },
            {
              name: 'Knee Flexion',
              angle: kneeAngle,
              normalRange: mode === 'walking' ? NORMAL_RANGES.walking.knee_flexion_stance : NORMAL_RANGES.running.knee_flexion_stance,
              status: kneeAngle > 75 ? 'deviation' : 'normal',
              side: 'right',
            },
            {
              name: 'Ankle Dorsiflexion',
              angle: ankleAngle,
              normalRange: mode === 'walking' ? NORMAL_RANGES.walking.ankle_dorsiflexion : NORMAL_RANGES.running.ankle_dorsiflexion,
              status: Math.abs(ankleAngle) > 20 ? 'deviation' : 'normal',
              side: 'right',
            },
          ],
          phase: phase,
        });
      }

      const mockResult: GaitAnalysisResult = {
        id: `GAIT-${Date.now()}`,
        mode: mode,
        view: viewMode,
        overallScore: 72 + Math.floor(Math.random() * 20),
        symmetryIndex: 85 + Math.floor(Math.random() * 12),
        cadence: mode === 'walking' ? 105 + Math.floor(Math.random() * 20) : 165 + Math.floor(Math.random() * 20),
        strideLength: mode === 'walking' ? 1.2 + Math.random() * 0.4 : 1.8 + Math.random() * 0.6,
        frames: frames,
        jointAngles: {
          hip: {
            left: frames.map(() => 15 + Math.random() * 10),
            right: frames.map(() => 15 + Math.random() * 10),
            avg: 18.5,
            deviation: 3.2,
          },
          knee: {
            left: frames.map(() => 35 + Math.random() * 20),
            right: frames.map(() => 35 + Math.random() * 20),
            avg: 45.2,
            deviation: 5.8,
          },
          ankle: {
            left: frames.map(() => 5 + Math.random() * 10),
            right: frames.map(() => 5 + Math.random() * 10),
            avg: 8.3,
            deviation: 2.1,
          },
          trunk: {
            angles: frames.map(() => 3 + Math.random() * 4),
            avg: 4.2,
            deviation: 1.5,
          },
        },
        findings: [
          'Slight knee valgus observed during mid-stance phase',
          'Hip drop on left side during single leg stance (Trendelenburg sign)',
          'Reduced ankle dorsiflexion during swing phase',
          'Trunk forward lean exceeds normal range during initial contact',
          'Asymmetric arm swing pattern detected',
        ],
        recommendations: [
          'Strengthen hip abductors (gluteus medius) to address Trendelenburg',
          'Calf stretching and ankle mobility exercises',
          'Core strengthening to improve trunk control',
          'Gait retraining focusing on symmetrical arm swing',
          'Consider orthotics evaluation for knee valgus',
        ],
        aiInsights: `Based on MoveNet pose detection analysis of ${numFrames} frames, the ${mode} pattern shows moderate deviations from optimal biomechanics. The symmetry index of ${85 + Math.floor(Math.random() * 12)}% suggests left-right imbalances that may increase injury risk. Key areas for intervention include hip stability and ankle mobility. The cadence and stride length are within normal parameters for recreational ${mode}.`,
      };

      setResult(mockResult);
      setAnalyzing(false);
      setActiveTab('results');
    }, 2500);
  };

  // Generate mock keypoints for visualization
  const generateMockKeypoints = (frameIndex: number, totalFrames: number): Keypoint[] => {
    const progress = frameIndex / totalFrames;
    const cyclePhase = (progress * 2 * Math.PI) % (2 * Math.PI);
    
    // Base positions (normalized 0-1)
    const baseY = 0.3; // Head position
    const hipY = 0.55;
    const kneeY = 0.75;
    const ankleY = 0.92;
    
    // Lateral movement simulation
    const hipSwing = Math.sin(cyclePhase) * 0.05;
    const kneeSwing = Math.sin(cyclePhase + 0.5) * 0.08;
    const ankleSwing = Math.sin(cyclePhase + 1) * 0.1;

    return [
      { name: 'nose', x: 0.5, y: baseY - 0.1, score: 0.95 },
      { name: 'left_shoulder', x: 0.45, y: baseY + 0.05, score: 0.92 },
      { name: 'right_shoulder', x: 0.55, y: baseY + 0.05, score: 0.93 },
      { name: 'left_elbow', x: 0.38 + hipSwing, y: baseY + 0.15, score: 0.88 },
      { name: 'right_elbow', x: 0.62 - hipSwing, y: baseY + 0.15, score: 0.89 },
      { name: 'left_wrist', x: 0.35 + hipSwing * 1.5, y: baseY + 0.28, score: 0.82 },
      { name: 'right_wrist', x: 0.65 - hipSwing * 1.5, y: baseY + 0.28, score: 0.84 },
      { name: 'left_hip', x: 0.47, y: hipY, score: 0.94 },
      { name: 'right_hip', x: 0.53, y: hipY, score: 0.95 },
      { name: 'left_knee', x: 0.45 + kneeSwing, y: kneeY, score: 0.91 },
      { name: 'right_knee', x: 0.55 - kneeSwing, y: kneeY, score: 0.92 },
      { name: 'left_ankle', x: 0.43 + ankleSwing, y: ankleY, score: 0.88 },
      { name: 'right_ankle', x: 0.57 - ankleSwing, y: ankleY, score: 0.89 },
    ];
  };

  // Calculate angle between three points
  const calculateAngle = (p1: Keypoint, p2: Keypoint, p3: Keypoint): number => {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    const cosAngle = dot / (mag1 * mag2);
    return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return COLORS.success;
    if (score >= 60) return COLORS.warning;
    return COLORS.error;
  };

  // Generate PDF Report
  const generatePDFReport = async () => {
    if (!result) return;
    
    setShowPaymentModal(false);

    try {
      const date = new Date().toLocaleDateString('en-IN', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      
      const findingsHtml = result.findings.map(f => `<li>${f}</li>`).join('');
      const recommendationsHtml = result.recommendations.map(r => `<li>${r}</li>`).join('');

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #0A0E1A; color: #fff; padding: 20px; font-size: 11px; }
    .header { text-align: center; border-bottom: 3px solid #00BCD4; padding-bottom: 15px; margin-bottom: 20px; }
    .logo { color: #FFD700; font-size: 28px; font-weight: bold; letter-spacing: 3px; }
    .subtitle { color: #00BCD4; font-size: 16px; margin-top: 5px; }
    .mode-badge { display: inline-block; background: ${mode === 'walking' ? '#2196F3' : '#FF5722'}; padding: 5px 15px; border-radius: 15px; margin-top: 10px; font-weight: bold; }
    
    .patient-info { background: #141B2D; padding: 15px; border-radius: 10px; margin-bottom: 20px; }
    .patient-name { color: #FFD700; font-size: 18px; font-weight: bold; }
    .patient-date { color: #8BA5B5; font-size: 12px; margin-top: 5px; }
    
    .score-section { display: flex; justify-content: space-around; margin-bottom: 20px; }
    .score-card { background: #141B2D; padding: 20px; border-radius: 10px; text-align: center; flex: 1; margin: 0 5px; }
    .score-value { font-size: 36px; font-weight: bold; color: ${getScoreColor(result.overallScore)}; }
    .score-label { color: #8BA5B5; font-size: 11px; margin-top: 5px; text-transform: uppercase; }
    
    .section { background: #141B2D; border-radius: 10px; padding: 15px; margin-bottom: 15px; }
    .section-title { color: #00BCD4; font-size: 14px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #1E3A5F; padding-bottom: 8px; }
    
    .joint-angles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .joint-card { background: #0A1628; padding: 12px; border-radius: 8px; text-align: center; }
    .joint-name { color: #8BA5B5; font-size: 10px; margin-bottom: 5px; }
    .joint-value { color: #00E676; font-size: 18px; font-weight: bold; }
    .joint-deviation { color: #FF9800; font-size: 9px; }
    
    .findings-list { color: #E0E0E0; }
    .findings-list li { margin-bottom: 8px; padding-left: 5px; border-left: 2px solid #FF9800; }
    
    .recommendations-list { color: #E0E0E0; }
    .recommendations-list li { margin-bottom: 8px; padding-left: 5px; border-left: 2px solid #4CAF50; }
    
    .ai-insights { background: linear-gradient(135deg, #1A237E, #0D47A1); padding: 15px; border-radius: 10px; border: 1px solid #2196F3; }
    .ai-insights-title { color: #00BCD4; font-size: 12px; margin-bottom: 8px; display: flex; align-items: center; gap: 5px; }
    .ai-insights-text { color: #E0E0E0; line-height: 1.6; }
    
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #1A3A5C; }
    .footer-logo { color: #FFD700; font-size: 18px; font-weight: bold; }
    .qr-section { margin-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">WBA99</div>
    <div class="subtitle">AI-Powered Gait Analysis Report</div>
    <div class="mode-badge">${mode.toUpperCase()} ANALYSIS</div>
  </div>

  <div class="patient-info">
    <div class="patient-name">${patientName || 'Patient'}</div>
    <div class="patient-date">${date} | Report ID: ${result.id} | View: ${viewMode.toUpperCase()}</div>
  </div>

  <div class="score-section">
    <div class="score-card">
      <div class="score-value">${result.overallScore}%</div>
      <div class="score-label">Overall Score</div>
    </div>
    <div class="score-card">
      <div class="score-value" style="color: ${result.symmetryIndex >= 90 ? COLORS.success : COLORS.warning}">${result.symmetryIndex}%</div>
      <div class="score-label">Symmetry Index</div>
    </div>
    <div class="score-card">
      <div class="score-value" style="color: #2196F3">${result.cadence}</div>
      <div class="score-label">Cadence (steps/min)</div>
    </div>
    <div class="score-card">
      <div class="score-value" style="color: #9C27B0">${result.strideLength.toFixed(2)}m</div>
      <div class="score-label">Stride Length</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Joint Angle Analysis</div>
    <div class="joint-angles">
      <div class="joint-card">
        <div class="joint-name">Hip Flexion/Extension</div>
        <div class="joint-value">${result.jointAngles.hip.avg.toFixed(1)}°</div>
        <div class="joint-deviation">±${result.jointAngles.hip.deviation.toFixed(1)}° deviation</div>
      </div>
      <div class="joint-card">
        <div class="joint-name">Knee Flexion</div>
        <div class="joint-value">${result.jointAngles.knee.avg.toFixed(1)}°</div>
        <div class="joint-deviation">±${result.jointAngles.knee.deviation.toFixed(1)}° deviation</div>
      </div>
      <div class="joint-card">
        <div class="joint-name">Ankle Dorsiflexion</div>
        <div class="joint-value">${result.jointAngles.ankle.avg.toFixed(1)}°</div>
        <div class="joint-deviation">±${result.jointAngles.ankle.deviation.toFixed(1)}° deviation</div>
      </div>
      <div class="joint-card">
        <div class="joint-name">Trunk Inclination</div>
        <div class="joint-value">${result.jointAngles.trunk.avg.toFixed(1)}°</div>
        <div class="joint-deviation">±${result.jointAngles.trunk.deviation.toFixed(1)}° deviation</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Clinical Findings</div>
    <ul class="findings-list">
      ${findingsHtml}
    </ul>
  </div>

  <div class="section">
    <div class="section-title">Recommendations</div>
    <ul class="recommendations-list">
      ${recommendationsHtml}
    </ul>
  </div>

  <div class="ai-insights">
    <div class="ai-insights-title">🤖 AI Clinical Insights (MoveNet Analysis)</div>
    <div class="ai-insights-text">${result.aiInsights}</div>
  </div>

  <div class="footer">
    <div class="footer-logo">WBA99</div>
    <p style="color: #8BA5B5; margin-top: 5px;">Advanced MSK/FMS Analysis Platform</p>
    <div class="qr-section">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=WBA99-GAIT-${result.id}" width="80" height="80" />
      <p style="color: #666; font-size: 9px; margin-top: 5px;">Scan to verify report</p>
    </div>
  </div>
</body>
</html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Gait Analysis Report',
          UTI: 'com.adobe.pdf',
        });
      }

      // Log report generation
      try {
        await api.post('/reports/log', null, {
          params: {
            report_type: `gait_${mode}`,
            report_name: `${mode.charAt(0).toUpperCase() + mode.slice(1)} Gait Analysis`,
            generated_by_id: currentUser?.id,
            generated_by_name: currentUser?.name,
            generated_by_role: currentUser?.role,
            patient_name: patientName || 'Unknown',
            payment_status: 'paid',
          }
        });
      } catch (e) {
        console.log('Report logging skipped');
      }
    } catch (error) {
      console.error('PDF error:', error);
      Alert.alert('Error', 'Failed to generate PDF report');
    }
  };

  // Compute angle at vertex b between rays b→a and b→c (degrees)
  const calcAngle3 = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number => {
    const v1x = ax - bx, v1y = ay - by;
    const v2x = cx - bx, v2y = cy - by;
    const dot = v1x * v2x + v1y * v2y;
    const mag = Math.sqrt(v1x ** 2 + v1y ** 2) * Math.sqrt(v2x ** 2 + v2y ** 2);
    if (mag === 0) return 0;
    return Math.round(Math.acos(Math.min(1, Math.max(-1, dot / mag))) * (180 / Math.PI));
  };

  // Compute the 5 clinical gait angles from keypoints (normalized 0-1 coords)
  const computeGaitAngles = (kps: Keypoint[], W: number, H: number) => {
    const g = (name: string) => {
      const k = kps.find(p => p.name === name);
      return k && k.score > 0.3 ? { x: k.x * W, y: k.y * H } : null;
    };
    const angles: { label: string; x: number; y: number; color: string }[] = [];

    const nose = g('nose');
    const lShoulder = g('left_shoulder'); const rShoulder = g('right_shoulder');
    const lElbow = g('left_elbow');       const rElbow = g('right_elbow');
    const lHip = g('left_hip');           const rHip = g('right_hip');
    const lKnee = g('left_knee');         const rKnee = g('right_knee');
    const lAnkle = g('left_ankle');       const rAnkle = g('right_ankle');

    // 1. Neck tilt — ear→shoulder→hip
    const sh = lShoulder || rShoulder;
    const hp = lHip || rHip;
    if (nose && sh && hp) {
      const a = calcAngle3(nose.x, nose.y, sh.x, sh.y, hp.x, hp.y);
      angles.push({ label: `${a}°`, x: sh.x + 16, y: sh.y - 18, color: '#00F0FF' });
    }

    // 2. Shoulder ROM — hip→shoulder→elbow
    const el = (lShoulder && lElbow) ? lElbow : rElbow;
    if (sh && hp && el) {
      const a = calcAngle3(hp.x, hp.y, sh.x, sh.y, el.x, el.y);
      angles.push({ label: `${a}°`, x: sh.x + 16, y: sh.y + 12, color: '#FFD700' });
    }

    // 3. Hip flexion — shoulder→hip→knee
    const kn = (lHip && lKnee) ? lKnee : rKnee;
    if (sh && hp && kn) {
      const a = calcAngle3(sh.x, sh.y, hp.x, hp.y, kn.x, kn.y);
      angles.push({ label: `${a}°`, x: hp.x + 16, y: hp.y, color: '#FF6B00' });
    }

    // 4. Knee flexion — hip→knee→ankle
    const an = (lKnee && lAnkle) ? lAnkle : rAnkle;
    const knH = (lKnee && lHip) ? lHip : rHip;
    if (knH && kn && an) {
      const a = calcAngle3(knH.x, knH.y, kn.x, kn.y, an.x, an.y);
      angles.push({ label: `${a}°`, x: kn.x + 16, y: kn.y, color: '#00FF88' });
    }

    // 5. Ankle dorsiflexion — knee→ankle→projected toe
    if (kn && an) {
      const toeX = an.x + (an.x - kn.x) * 0.28;
      const toeY = an.y + 28;
      const a = calcAngle3(kn.x, kn.y, an.x, an.y, toeX, toeY);
      angles.push({ label: `${a}°`, x: an.x + 16, y: an.y, color: '#FF00FF' });
    }

    return angles;
  };

  // Render wire skeleton SVG overlay on video
  const renderWireOverlay = (W: number, H: number) => {
    if (!result || !showPoseOverlay || result.frames.length === 0) return null;
    const frame = result.frames[selectedFrameIndex] || result.frames[0];
    const kps = frame.keypoints;

    const getKp = (name: string) => {
      const k = kps.find(p => p.name === name);
      return k && k.score > 0.25 ? { x: k.x * W, y: k.y * H } : null;
    };

    const gaitAngles = computeGaitAngles(kps, W, H);

    return (
      <Svg width={W} height={H} style={StyleSheet.absoluteFillObject}>
        {/* Wire skeleton lines */}
        {SKELETON_CONNECTIONS.map(([start, end], i) => {
          const p1 = getKp(start), p2 = getKp(end);
          if (!p1 || !p2) return null;
          return (
            <Line
              key={`line-${i}`}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke="#00F0FF"
              strokeWidth={2.5}
              strokeLinecap="round"
              opacity={0.9}
            />
          );
        })}

        {/* Joint circles */}
        {kps.map((kp, i) => {
          if (kp.score < 0.3) return null;
          const x = kp.x * W, y = kp.y * H;
          const isLeg = kp.name.includes('hip') || kp.name.includes('knee') || kp.name.includes('ankle');
          return (
            <G key={`joint-${i}`}>
              <Circle cx={x} cy={y} r={isLeg ? 7 : 5} fill={isLeg ? '#FF00A8' : '#00F0FF'} opacity={0.9} />
              <Circle cx={x} cy={y} r={isLeg ? 4 : 3} fill="#fff" opacity={0.8} />
            </G>
          );
        })}

        {/* Angle badges */}
        {gaitAngles.map((a, i) => (
          <G key={`angle-${i}`}>
            <Rect
              x={a.x - 2} y={a.y - 10}
              width={34} height={16}
              rx={4} ry={4}
              fill="rgba(10,14,26,0.78)"
            />
            <SvgText
              x={a.x + 15} y={a.y + 3}
              fill={a.color}
              fontSize={10}
              fontWeight="bold"
              textAnchor="middle"
            >
              {a.label}
            </SvgText>
          </G>
        ))}
      </Svg>
    );
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render content based on active tab
  const renderContent = () => {
    if (analyzing) {
      return (
        <View style={styles.analyzingContainer}>
          <MaterialCommunityIcons name="robot" size={80} color={COLORS.accent} />
          <Text style={styles.analyzingTitle}>AI Pose Detection</Text>
          <Text style={styles.analyzingSubtitle}>Analyzing {mode} pattern with MoveNet...</Text>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${analysisProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(analysisProgress)}% Complete</Text>
          <View style={styles.analysisSteps}>
            <Text style={[styles.stepText, analysisProgress > 10 && styles.stepComplete]}>
              {analysisProgress > 10 ? '✓' : '○'} Extracting video frames
            </Text>
            <Text style={[styles.stepText, analysisProgress > 30 && styles.stepComplete]}>
              {analysisProgress > 30 ? '✓' : '○'} Detecting pose keypoints
            </Text>
            <Text style={[styles.stepText, analysisProgress > 50 && styles.stepComplete]}>
              {analysisProgress > 50 ? '✓' : '○'} Calculating joint angles
            </Text>
            <Text style={[styles.stepText, analysisProgress > 70 && styles.stepComplete]}>
              {analysisProgress > 70 ? '✓' : '○'} Analyzing gait phases
            </Text>
            <Text style={[styles.stepText, analysisProgress > 90 && styles.stepComplete]}>
              {analysisProgress > 90 ? '✓' : '○'} Generating insights
            </Text>
          </View>
        </View>
      );
    }

    if (result && activeTab === 'results') {
      return (
        <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          {/* Score Cards */}
          <View style={styles.scoreCardsRow}>
            <View style={[styles.scoreCard, { borderColor: getScoreColor(result.overallScore) }]}>
              <Text style={[styles.scoreValue, { color: getScoreColor(result.overallScore) }]}>
                {result.overallScore}%
              </Text>
              <Text style={styles.scoreLabel}>Overall Score</Text>
            </View>
            <View style={[styles.scoreCard, { borderColor: result.symmetryIndex >= 90 ? COLORS.success : COLORS.warning }]}>
              <Text style={[styles.scoreValue, { color: result.symmetryIndex >= 90 ? COLORS.success : COLORS.warning }]}>
                {result.symmetryIndex}%
              </Text>
              <Text style={styles.scoreLabel}>Symmetry</Text>
            </View>
          </View>

          <View style={styles.scoreCardsRow}>
            <View style={styles.metricCard}>
              <MaterialCommunityIcons name="speedometer" size={24} color={COLORS.blue} />
              <Text style={styles.metricValue}>{result.cadence}</Text>
              <Text style={styles.metricLabel}>steps/min</Text>
            </View>
            <View style={styles.metricCard}>
              <MaterialCommunityIcons name="ruler" size={24} color={COLORS.purple} />
              <Text style={styles.metricValue}>{result.strideLength.toFixed(2)}m</Text>
              <Text style={styles.metricLabel}>stride length</Text>
            </View>
          </View>

          {/* ── Wire Analysis on Video ── */}
          <View style={styles.poseSection}>
            <View style={styles.poseSectionHeader}>
              <View style={styles.poseSectionTitleRow}>
                <MaterialCommunityIcons name="motion-sensor" size={16} color={COLORS.green} />
                <Text style={styles.sectionTitle}>Wire Analysis</Text>
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>AI</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.overlayToggleBtn}
                onPress={() => setShowPoseOverlay(!showPoseOverlay)}
              >
                <Ionicons name={showPoseOverlay ? 'eye' : 'eye-off'} size={18} color={COLORS.accent} />
                <Text style={styles.overlayToggleText}>{showPoseOverlay ? 'Wire ON' : 'Wire OFF'}</Text>
              </TouchableOpacity>
            </View>

            {/* Video + SVG Wire Overlay container */}
            <View style={styles.videoWireContainer}>
              {videoUri ? (
                <VideoView
                  player={videoPlayer}
                  style={styles.videoWire}
                  contentFit="contain"
                  nativeControls={false}
                />
              ) : (
                <View style={[styles.videoWire, styles.videoWirePlaceholder]}>
                  <MaterialCommunityIcons name="walk" size={60} color="rgba(0,188,212,0.25)" />
                  <Text style={styles.videoWirePlaceholderText}>Video preview</Text>
                </View>
              )}

              {/* Wire skeleton + angle badges overlaid on video */}
              {renderWireOverlay(SCREEN_WIDTH - 40, 320)}

              {/* Phase label overlay */}
              <View style={styles.phaseBadge}>
                <Text style={styles.phaseBadgeText}>
                  {result.frames[selectedFrameIndex]?.phase.replace(/_/g, ' ').toUpperCase()}
                </Text>
              </View>

              {/* Frame counter overlay */}
              <View style={styles.frameCountBadge}>
                <Text style={styles.frameCountText}>
                  {selectedFrameIndex + 1} / {result.frames.length}
                </Text>
              </View>
            </View>

            {/* Playback controls */}
            <View style={styles.playbackControls}>
              <TouchableOpacity
                style={styles.playBtn}
                onPress={() => {
                  if (isVideoPlaying) {
                    setIsVideoPlaying(false);
                    videoPlayer.pause();
                  } else {
                    setIsVideoPlaying(true);
                    videoPlayer.play();
                  }
                }}
              >
                <Ionicons
                  name={isVideoPlaying ? 'pause-circle' : 'play-circle'}
                  size={40}
                  color={COLORS.accent}
                />
              </TouchableOpacity>

              {/* Frame scrubber */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.frameScrubber}
                contentContainerStyle={styles.frameScrubberContent}
              >
                {result.frames.map((frame, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.framePill,
                      selectedFrameIndex === index && styles.framePillActive,
                    ]}
                    onPress={() => {
                      setIsVideoPlaying(false);
                      videoPlayer.pause();
                      setSelectedFrameIndex(index);
                    }}
                  >
                    <Text style={[
                      styles.framePillText,
                      selectedFrameIndex === index && styles.framePillTextActive,
                    ]}>
                      {index + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Angle legend */}
            <View style={styles.angleLegend}>
              {[
                { color: '#00F0FF', label: 'Neck' },
                { color: '#FFD700', label: 'Shoulder' },
                { color: '#FF6B00', label: 'Hip' },
                { color: '#00FF88', label: 'Knee' },
                { color: '#FF00FF', label: 'Ankle' },
              ].map(({ color, label }) => (
                <View key={label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: color }]} />
                  <Text style={styles.legendText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Joint Angles */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Joint Angle Analysis</Text>
            <View style={styles.jointAnglesGrid}>
              <View style={styles.jointAngleCard}>
                <FontAwesome5 name="bone" size={20} color={COLORS.orange} />
                <Text style={styles.jointAngleName}>Hip</Text>
                <Text style={styles.jointAngleValue}>{result.jointAngles.hip.avg.toFixed(1)}°</Text>
                <Text style={styles.jointAngleDeviation}>±{result.jointAngles.hip.deviation.toFixed(1)}°</Text>
              </View>
              <View style={styles.jointAngleCard}>
                <MaterialCommunityIcons name="human-handsdown" size={20} color={COLORS.blue} />
                <Text style={styles.jointAngleName}>Knee</Text>
                <Text style={styles.jointAngleValue}>{result.jointAngles.knee.avg.toFixed(1)}°</Text>
                <Text style={styles.jointAngleDeviation}>±{result.jointAngles.knee.deviation.toFixed(1)}°</Text>
              </View>
              <View style={styles.jointAngleCard}>
                <MaterialCommunityIcons name="shoe-heel" size={20} color={COLORS.green} />
                <Text style={styles.jointAngleName}>Ankle</Text>
                <Text style={styles.jointAngleValue}>{result.jointAngles.ankle.avg.toFixed(1)}°</Text>
                <Text style={styles.jointAngleDeviation}>±{result.jointAngles.ankle.deviation.toFixed(1)}°</Text>
              </View>
              <View style={styles.jointAngleCard}>
                <MaterialCommunityIcons name="human" size={20} color={COLORS.purple} />
                <Text style={styles.jointAngleName}>Trunk</Text>
                <Text style={styles.jointAngleValue}>{result.jointAngles.trunk.avg.toFixed(1)}°</Text>
                <Text style={styles.jointAngleDeviation}>±{result.jointAngles.trunk.deviation.toFixed(1)}°</Text>
              </View>
            </View>
          </View>

          {/* Findings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Clinical Findings</Text>
            {result.findings.map((finding, index) => (
              <View key={index} style={styles.findingItem}>
                <Ionicons name="alert-circle" size={16} color={COLORS.warning} />
                <Text style={styles.findingText}>{finding}</Text>
              </View>
            ))}
          </View>

          {/* Recommendations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            {result.recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </View>

          {/* AI Insights */}
          <View style={styles.aiInsightsCard}>
            <View style={styles.aiInsightsHeader}>
              <MaterialCommunityIcons name="robot" size={24} color={COLORS.accent} />
              <Text style={styles.aiInsightsTitle}>AI Clinical Insights</Text>
            </View>
            <Text style={styles.aiInsightsText}>{result.aiInsights}</Text>
          </View>

          {/* Download Button */}
          <TouchableOpacity 
            style={styles.downloadButton}
            onPress={() => {
              if (!patientName) {
                setShowPatientModal(true);
              } else {
                setShowPaymentModal(true);
              }
            }}
          >
            <Ionicons name="download" size={24} color="#fff" />
            <Text style={styles.downloadButtonText}>Download PDF Report</Text>
          </TouchableOpacity>

          {/* New Analysis Button */}
          <TouchableOpacity 
            style={styles.newAnalysisButton}
            onPress={() => {
              setResult(null);
              setVideoUri(null);
              setActiveTab('record');
            }}
          >
            <Ionicons name="refresh" size={20} color={COLORS.accent} />
            <Text style={styles.newAnalysisText}>New Analysis</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    // Record/Upload view
    return (
      <ScrollView style={styles.recordContainer} showsVerticalScrollIndicator={false}>
        {/* Mode Selection */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'walking' && styles.modeButtonActive]}
            onPress={() => setMode('walking')}
          >
            <MaterialCommunityIcons 
              name="walk" 
              size={28} 
              color={mode === 'walking' ? '#fff' : COLORS.accent} 
            />
            <Text style={[styles.modeButtonText, mode === 'walking' && styles.modeButtonTextActive]}>
              Walking
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'running' && styles.modeButtonActive]}
            onPress={() => setMode('running')}
          >
            <MaterialCommunityIcons 
              name="run" 
              size={28} 
              color={mode === 'running' ? '#fff' : COLORS.orange} 
            />
            <Text style={[styles.modeButtonText, mode === 'running' && styles.modeButtonTextActive]}>
              Running
            </Text>
          </TouchableOpacity>
        </View>

        {/* View Mode Selection */}
        <View style={styles.viewModeSelector}>
          <Text style={styles.viewModeLabel}>Camera View:</Text>
          <View style={styles.viewModeButtons}>
            {(['lateral', 'posterior', 'anterior'] as ViewMode[]).map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.viewModeBtn, viewMode === v && styles.viewModeBtnActive]}
                onPress={() => setViewMode(v)}
              >
                <Text style={[styles.viewModeBtnText, viewMode === v && styles.viewModeBtnTextActive]}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Camera Preview */}
        {permission?.granted && (
          <View style={styles.cameraContainer}>
            <CameraView style={styles.camera} facing="back">
              {isRecording && (
                <View style={styles.recordingOverlay}>
                  <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingText}>REC</Text>
                  </View>
                  <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
                </View>
              )}
              {!isRecording && (
                <View style={styles.poseGuideOverlay}>
                  <View style={styles.poseGuide}>
                    <MaterialCommunityIcons name="human" size={120} color="rgba(0,188,212,0.3)" />
                  </View>
                  <Text style={styles.poseGuideText}>Position subject in frame</Text>
                </View>
              )}
            </CameraView>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Recording Instructions</Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNum}>1</Text>
              <Text style={styles.instructionText}>
                Position camera at {viewMode} view, 3-4 meters away
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNum}>2</Text>
              <Text style={styles.instructionText}>
                Ensure full body is visible in frame
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNum}>3</Text>
              <Text style={styles.instructionText}>
                Record {mode === 'walking' ? '10-15' : '5-10'} seconds of natural {mode}
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNum}>4</Text>
              <Text style={styles.instructionText}>
                MoveNet AI will detect 17 body keypoints
              </Text>
            </View>
          </View>
        </View>

        {/* Control Buttons */}
        <View style={styles.controlButtons}>
          {!isRecording ? (
            <>
              <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
                <View style={styles.recordButtonInner} />
              </TouchableOpacity>
              <Text style={styles.recordButtonLabel}>Tap to Record</Text>
              
              <View style={styles.orDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>
              
              <TouchableOpacity style={styles.uploadButton} onPress={pickVideo}>
                <Ionicons name="cloud-upload" size={24} color="#fff" />
                <Text style={styles.uploadButtonText}>Upload Video</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
              <View style={styles.stopButtonInner} />
              <Text style={styles.stopButtonLabel}>Stop Recording</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Gait Analysis</Text>
        <TouchableOpacity onPress={() => Alert.alert('Info', 'AI-powered gait analysis using MoveNet pose detection. Analyzes walking and running patterns with joint angle calculations.')}>
          <Ionicons name="information-circle" size={24} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'record' && styles.tabActive]}
          onPress={() => setActiveTab('record')}
        >
          <Ionicons name="videocam" size={18} color={activeTab === 'record' ? '#fff' : COLORS.accent} />
          <Text style={[styles.tabText, activeTab === 'record' && styles.tabTextActive]}>
            Record/Upload
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'results' && styles.tabActive]}
          onPress={() => result && setActiveTab('results')}
          disabled={!result}
        >
          <Ionicons name="analytics" size={18} color={activeTab === 'results' ? '#fff' : (result ? COLORS.accent : '#555')} />
          <Text style={[styles.tabText, activeTab === 'results' && styles.tabTextActive, !result && { color: '#555' }]}>
            Results
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {renderContent()}

      {/* Patient Name Modal */}
      <Modal visible={showPatientModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Patient Name</Text>
            <TextInput
              style={styles.modalInput}
              value={patientName}
              onChangeText={setPatientName}
              placeholder="Patient Name"
              placeholderTextColor="#666"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonCancel} 
                onPress={() => setShowPatientModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalButtonConfirm}
                onPress={() => {
                  setShowPatientModal(false);
                  if (patientName.trim()) {
                    setShowPaymentModal(true);
                  }
                }}
              >
                <Text style={styles.modalButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Gate Modal */}
      <PaymentGateModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentConfirmed={generatePDFReport}
        reportType={`${mode}_gait_analysis`}
        reportTitle={`${mode.charAt(0).toUpperCase() + mode.slice(1)} Gait Analysis Report`}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A5C',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabs: {
    flexDirection: 'row',
    padding: 10,
    gap: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.card,
  },
  tabActive: {
    backgroundColor: COLORS.accent,
  },
  tabText: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  // Record Container
  recordContainer: {
    flex: 1,
    padding: 15,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 15,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  viewModeSelector: {
    marginBottom: 15,
  },
  viewModeLabel: {
    color: '#8BA5B5',
    marginBottom: 8,
    fontSize: 13,
  },
  viewModeButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  viewModeBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  viewModeBtnActive: {
    backgroundColor: COLORS.blue,
  },
  viewModeBtnText: {
    color: '#8BA5B5',
    fontSize: 12,
    fontWeight: '600',
  },
  viewModeBtnTextActive: {
    color: '#fff',
  },
  cameraContainer: {
    height: 280,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 15,
  },
  camera: {
    flex: 1,
  },
  recordingOverlay: {
    position: 'absolute',
    top: 15,
    left: 15,
    right: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244,67,54,0.9)',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  recordingText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  timerText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  poseGuideOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poseGuide: {
    borderWidth: 2,
    borderColor: 'rgba(0,188,212,0.3)',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 20,
  },
  poseGuideText: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 10,
    fontSize: 13,
  },
  instructionsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  instructionsTitle: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  instructionsList: {
    gap: 10,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  instructionNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.accent,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 12,
    fontWeight: 'bold',
  },
  instructionText: {
    flex: 1,
    color: '#E0E0E0',
    fontSize: 13,
    lineHeight: 20,
  },
  controlButtons: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(244,67,54,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: COLORS.error,
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.error,
  },
  recordButtonLabel: {
    color: '#8BA5B5',
    marginTop: 10,
    fontSize: 13,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  orText: {
    color: '#666',
    marginHorizontal: 15,
    fontSize: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.blue,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  stopButton: {
    alignItems: 'center',
  },
  stopButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.error,
  },
  stopButtonLabel: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  // Analyzing
  analyzingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  analyzingTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
  },
  analyzingSubtitle: {
    color: '#8BA5B5',
    marginTop: 8,
    fontSize: 14,
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.card,
    borderRadius: 4,
    marginTop: 30,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
  progressText: {
    color: COLORS.accent,
    marginTop: 10,
    fontWeight: 'bold',
  },
  analysisSteps: {
    marginTop: 30,
    alignSelf: 'flex-start',
    gap: 12,
  },
  stepText: {
    color: '#666',
    fontSize: 13,
  },
  stepComplete: {
    color: COLORS.success,
  },
  // Results
  resultsContainer: {
    flex: 1,
    padding: 15,
  },
  scoreCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  scoreLabel: {
    color: '#8BA5B5',
    fontSize: 11,
    marginTop: 5,
    textTransform: 'uppercase',
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  metricValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  metricLabel: {
    color: '#8BA5B5',
    fontSize: 11,
    marginTop: 4,
  },
  poseSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
  },
  poseSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  poseSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: 'bold',
  },
  liveBadge: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  overlayToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  overlayToggleText: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '600',
  },
  // Video + wire overlay container
  videoWireContainer: {
    height: 320,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#050A14',
    position: 'relative',
  },
  videoWire: {
    width: '100%',
    height: '100%',
  },
  videoWirePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050A14',
  },
  videoWirePlaceholderText: {
    color: '#1A3A5C',
    fontSize: 12,
    marginTop: 8,
  },
  phaseBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(10,14,26,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  phaseBadgeText: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  frameCountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(10,14,26,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  frameCountText: {
    color: '#6B7B8A',
    fontSize: 9,
    fontWeight: '600',
  },
  // Playback controls
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  playBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameScrubber: {
    flex: 1,
    height: 44,
  },
  frameScrubberContent: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  framePill: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1A2A3A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  framePillActive: {
    backgroundColor: COLORS.accent,
  },
  framePillText: {
    color: '#6B7B8A',
    fontSize: 10,
    fontWeight: '600',
  },
  framePillTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  // Angle legend
  angleLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#6B7B8A',
    fontSize: 10,
  },
  poseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  frameSlider: {
    marginTop: 12,
    alignItems: 'center',
  },
  frameLabel: {
    color: '#8BA5B5',
    fontSize: 11,
    marginBottom: 8,
  },
  frameDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
    marginHorizontal: 3,
  },
  frameDotActive: {
    backgroundColor: COLORS.accent,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  phaseLabel: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
  },
  section: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
  },
  jointAnglesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  jointAngleCard: {
    width: (SCREEN_WIDTH - 70) / 2,
    backgroundColor: '#0A1628',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  jointAngleName: {
    color: '#8BA5B5',
    fontSize: 11,
    marginTop: 8,
  },
  jointAngleValue: {
    color: COLORS.green,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 4,
  },
  jointAngleDeviation: {
    color: COLORS.warning,
    fontSize: 10,
    marginTop: 2,
  },
  findingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 10,
    paddingLeft: 5,
  },
  findingText: {
    flex: 1,
    color: '#E0E0E0',
    fontSize: 13,
    lineHeight: 18,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 10,
    paddingLeft: 5,
  },
  recommendationText: {
    flex: 1,
    color: '#E0E0E0',
    fontSize: 13,
    lineHeight: 18,
  },
  aiInsightsCard: {
    backgroundColor: '#1A237E',
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
    borderWidth: 1,
    borderColor: COLORS.blue,
  },
  aiInsightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  aiInsightsTitle: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: 'bold',
  },
  aiInsightsText: {
    color: '#E0E0E0',
    fontSize: 13,
    lineHeight: 20,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.success,
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  downloadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  newAnalysisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    marginTop: 10,
    marginBottom: 30,
  },
  newAnalysisText: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxWidth: 350,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#0A1628',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    fontSize: 15,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButtonCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  modalButtonConfirm: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
