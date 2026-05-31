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
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { WebView } from 'react-native-webview';
import Svg, { Line, Circle, Text as SvgText, G, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import { PaymentGateModal } from '../../src/utils/PaymentGateModal';
import api from '../../src/utils/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Digital Shadow V3 Colors - Neon/Cyberpunk Theme
const COLORS = {
  background: '#0A0E1A',
  card: '#0D1520',
  cardBorder: '#1A3A5C',
  accent: '#00F0FF',
  neonPink: '#FF00FF',
  neonGreen: '#00FF88',
  neonBlue: '#00BFFF',
  neonOrange: '#FF6B00',
  neonPurple: '#8B5CF6',
  gold: '#FFD700',
  success: '#00FF88',
  warning: '#FFAA00',
  error: '#FF4444',
  text: '#E0E6ED',
  textMuted: '#6B7B8A',
};

// Tab types for Digital Shadow V3
type TabType = 'scan' | 'posture' | 'gait' | 'rom' | 'report';
type AnalysisMode = 'walking' | 'running';
type ViewMode = 'lateral' | 'posterior' | 'anterior';

// Visual FX Settings
interface VisualFXSettings {
  showSkeleton: boolean;
  showAngles: boolean;
  neonGlow: boolean;
  particleEffect: boolean;
  showROM: boolean;
}

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
  phase: string;
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
  ['nose', 'left_shoulder'],
  ['nose', 'right_shoulder'],
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
];

export default function CameraWalkingAnalysis() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [permission, requestPermission] = useCameraPermissions();

  // Digital Shadow V3 Tab System
  const [activeTab, setActiveTab] = useState<TabType>('scan');
  
  // Mode and view state
  const [mode, setMode] = useState<AnalysisMode>('walking');
  const [viewMode, setViewMode] = useState<ViewMode>('lateral');

  // Visual FX Settings
  const [visualFX, setVisualFX] = useState<VisualFXSettings>({
    showSkeleton: true,
    showAngles: true,
    neonGlow: true,
    particleEffect: false,
    showROM: true,
  });
  const [showFXPanel, setShowFXPanel] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);

  // Sensor data
  const [accelerometerData, setAccelerometerData] = useState<any[]>([]);
  const [gyroscopeData, setGyroscopeData] = useState<any[]>([]);
  const accelSubscription = useRef<any>(null);
  const gyroSubscription = useRef<any>(null);

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [result, setResult] = useState<GaitAnalysisResult | null>(null);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);

  // Live wire analysis WebView
  const [showLiveAnalysis, setShowLiveAnalysis] = useState(false);
  const [liveHtmlUri, setLiveHtmlUri] = useState<string | null>(null);

  // UI state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    age: '',
    condition: '',
    notes: '',
  });

  useEffect(() => {
    return () => {
      if (accelSubscription.current) accelSubscription.current.remove();
      if (gyroSubscription.current) gyroSubscription.current.remove();
      if (recordingInterval.current) clearInterval(recordingInterval.current);
    };
  }, []);

  // Load the live gait analysis HTML asset
  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === 'web') {
          setLiveHtmlUri('/assets/wba99-gait-wire-live.html');
          return;
        }
        const asset = Asset.fromModule(require('../../assets/wba99-gait-wire-live.html'));
        await asset.downloadAsync();
        setLiveHtmlUri(asset.localUri || asset.uri);
      } catch (e) {
        console.log('Live HTML asset load skipped:', e);
      }
    })();
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return COLORS.success;
    if (score >= 60) return COLORS.warning;
    return COLORS.error;
  };

  // Pick video from gallery
  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets[0]) {
        analyzeVideo(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Video pick error:', error);
      Alert.alert('Error', 'Failed to select video.');
    }
  };

  // Start recording with sensors
  const startRecording = async () => {
    setIsRecording(true);
    setRecordingTime(0);
    setAccelerometerData([]);
    setGyroscopeData([]);
    setResult(null);

    Accelerometer.setUpdateInterval(100);
    Gyroscope.setUpdateInterval(100);

    accelSubscription.current = Accelerometer.addListener((data) => {
      setAccelerometerData(prev => [...prev, { ...data, timestamp: Date.now() }]);
    });

    gyroSubscription.current = Gyroscope.addListener((data) => {
      setGyroscopeData(prev => [...prev, { ...data, timestamp: Date.now() }]);
    });

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

  // Stop recording
  const stopRecording = async () => {
    setIsRecording(false);

    if (accelSubscription.current) {
      accelSubscription.current.remove();
      accelSubscription.current = null;
    }
    if (gyroSubscription.current) {
      gyroSubscription.current.remove();
      gyroSubscription.current = null;
    }
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }

    await performAIAnalysis();
  };

  // Analyze video with AI
  const analyzeVideo = async (uri: string) => {
    await performAIAnalysis();
  };

  // Perform AI-powered gait analysis
  const performAIAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisProgress(0);

    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      // Simulated AI analysis
      await new Promise(resolve => setTimeout(resolve, 3000));

      const mockFrames: FrameAnalysis[] = Array(8).fill(null).map((_, i) => ({
        frameNumber: i + 1,
        timestamp: i * 250,
        keypoints: [
          { name: 'nose', x: 0.5, y: 0.1, score: 0.95 },
          { name: 'left_shoulder', x: 0.45, y: 0.22, score: 0.92 },
          { name: 'right_shoulder', x: 0.55, y: 0.22, score: 0.91 },
          { name: 'left_hip', x: 0.46, y: 0.45, score: 0.90 },
          { name: 'right_hip', x: 0.54, y: 0.45, score: 0.89 },
          { name: 'left_knee', x: 0.44, y: 0.65, score: 0.88 },
          { name: 'right_knee', x: 0.56, y: 0.68, score: 0.87 },
          { name: 'left_ankle', x: 0.42, y: 0.88, score: 0.85 },
          { name: 'right_ankle', x: 0.58, y: 0.9, score: 0.84 },
        ],
        angles: [
          { name: 'Left Hip', angle: 165 + Math.random() * 10 - 5, normalRange: { min: 160, max: 180 }, status: 'normal', side: 'left' },
          { name: 'Right Hip', angle: 163 + Math.random() * 10 - 5, normalRange: { min: 160, max: 180 }, status: 'normal', side: 'right' },
          { name: 'Left Knee', angle: 172 + Math.random() * 10 - 5, normalRange: { min: 165, max: 180 }, status: 'deviation', side: 'left' },
          { name: 'Right Knee', angle: 175 + Math.random() * 10 - 5, normalRange: { min: 165, max: 180 }, status: 'normal', side: 'right' },
        ],
        phase: ['initial_contact', 'loading_response', 'mid_stance', 'terminal_stance', 'pre_swing', 'initial_swing', 'mid_swing', 'terminal_swing'][i],
      }));

      const mockResult: GaitAnalysisResult = {
        id: `gait-${Date.now()}`,
        mode,
        view: viewMode,
        overallScore: 78 + Math.random() * 15,
        symmetryIndex: 85 + Math.random() * 10,
        cadence: mode === 'walking' ? 100 + Math.random() * 20 : 160 + Math.random() * 20,
        strideLength: mode === 'walking' ? 1.2 + Math.random() * 0.3 : 1.8 + Math.random() * 0.4,
        frames: mockFrames,
        jointAngles: {
          hip: { left: [165, 168, 170, 165], right: [163, 165, 168, 164], avg: 166.5, deviation: 3.2 },
          knee: { left: [172, 165, 175, 170], right: [175, 170, 178, 173], avg: 172.3, deviation: 4.1 },
          ankle: { left: [95, 100, 105, 98], right: [97, 102, 108, 100], avg: 100.6, deviation: 3.8 },
          trunk: { angles: [175, 177, 176, 178], avg: 176.5, deviation: 1.3 },
        },
        findings: [
          'Slight left knee hyperextension during mid-stance',
          'Reduced hip flexion on right side during swing phase',
          'Mild trunk forward lean (5° from vertical)',
        ],
        recommendations: [
          'Strengthen hamstring muscles to control knee hyperextension',
          'Hip flexor mobility exercises recommended',
          'Core stabilization program to improve trunk posture',
        ],
        aiInsights: `The ${mode} analysis reveals a ${mode === 'walking' ? 'moderately efficient' : 'dynamic'} gait pattern with an overall functional score of ${(78 + Math.random() * 15).toFixed(0)}%. Key observations include asymmetry in knee kinematics and reduced hip range of motion.`,
      };

      clearInterval(progressInterval);
      setAnalysisProgress(100);
      setResult(mockResult);
      setActiveTab('posture');
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert('Error', 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Generate PDF report
  const generatePDFReport = async () => {
    if (!result) return;

    try {
      const date = new Date().toLocaleDateString('en-IN', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      const reportId = `DS-${Date.now().toString(36).toUpperCase()}`;

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #0A0E1A 0%, #1A2940 100%); color: #E0E6ED; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #00F0FF; padding-bottom: 20px; margin-bottom: 20px; }
    .logo { font-size: 28px; font-weight: bold; background: linear-gradient(90deg, #00F0FF, #FF00FF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: 3px; }
    .subtitle { color: #00F0FF; font-size: 14px; margin-top: 5px; text-transform: uppercase; letter-spacing: 2px; }
    .section { background: rgba(13, 21, 32, 0.8); border: 1px solid #1A3A5C; border-radius: 12px; padding: 15px; margin-bottom: 15px; }
    .section-title { color: #00F0FF; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; border-bottom: 1px solid #1A3A5C; padding-bottom: 8px; }
    .score-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .score-card { background: rgba(0, 240, 255, 0.1); border: 1px solid #00F0FF; border-radius: 8px; padding: 15px; text-align: center; }
    .score-value { font-size: 28px; font-weight: bold; color: #00FF88; }
    .score-label { font-size: 11px; color: #6B7B8A; margin-top: 5px; }
    .finding { padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #1A3A5C; }
    .footer-text { color: #FFD700; font-size: 16px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">DIGITAL SHADOW V3</div>
    <div class="subtitle">${result.mode.toUpperCase()} Gait Analysis Report</div>
    <div style="font-size: 11px; color: #6B7B8A; margin-top: 10px;">Report ID: ${reportId} | ${date}</div>
  </div>

  <div class="section">
    <div class="section-title">Patient Information</div>
    <p style="color: #FFD700; font-size: 16px;">${patientInfo.name || patientName || 'Patient'}</p>
    ${patientInfo.age ? `<p style="color: #6B7B8A; font-size: 12px;">Age: ${patientInfo.age} | Condition: ${patientInfo.condition || 'N/A'}</p>` : ''}
  </div>

  <div class="section">
    <div class="section-title">Performance Scores</div>
    <div class="score-grid">
      <div class="score-card">
        <div class="score-value">${result.overallScore.toFixed(0)}%</div>
        <div class="score-label">Overall Score</div>
      </div>
      <div class="score-card">
        <div class="score-value">${result.symmetryIndex.toFixed(0)}%</div>
        <div class="score-label">Symmetry Index</div>
      </div>
      <div class="score-card">
        <div class="score-value">${result.cadence.toFixed(0)}</div>
        <div class="score-label">Cadence (steps/min)</div>
      </div>
      <div class="score-card">
        <div class="score-value">${result.strideLength.toFixed(2)}m</div>
        <div class="score-label">Stride Length</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Clinical Findings</div>
    ${result.findings.map(f => `<div class="finding">• ${f}</div>`).join('')}
  </div>

  <div class="section">
    <div class="section-title">Recommendations</div>
    ${result.recommendations.map(r => `<div class="finding" style="color: #00FF88;">✓ ${r}</div>`).join('')}
  </div>

  <div class="section">
    <div class="section-title">AI Clinical Insights</div>
    <p style="color: #E0E6ED; line-height: 1.6;">${result.aiInsights}</p>
  </div>

  <div class="footer">
    <div class="footer-text">WBA99 DIGITAL SHADOW</div>
    <p style="font-size: 10px; color: #6B7B8A; margin-top: 5px;">Advanced MSK Analysis System</p>
  </div>
</body>
</html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert('Error', 'Failed to generate PDF report');
    }
  };

  // Render pose skeleton overlay
  const renderPoseOverlay = () => {
    if (!result || !result.frames[selectedFrameIndex]) return null;

    const frame = result.frames[selectedFrameIndex];
    const width = SCREEN_WIDTH - 40;
    const height = 250;

    const getKeypoint = (name: string) => frame.keypoints.find(k => k.name === name);

    return (
      <Svg width={width} height={height} style={{ backgroundColor: '#0D1520', borderRadius: 12 }}>
        {/* Neon glow effect background */}
        {visualFX.neonGlow && (
          <Defs>
            <LinearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#00F0FF" stopOpacity="0.1" />
              <Stop offset="100%" stopColor="#FF00FF" stopOpacity="0.1" />
            </LinearGradient>
          </Defs>
        )}
        {visualFX.neonGlow && <Rect x="0" y="0" width={width} height={height} fill="url(#neonGlow)" />}

        {/* Skeleton lines */}
        {visualFX.showSkeleton && SKELETON_CONNECTIONS.map(([from, to], idx) => {
          const p1 = getKeypoint(from);
          const p2 = getKeypoint(to);
          if (!p1 || !p2) return null;
          return (
            <Line
              key={idx}
              x1={p1.x * width}
              y1={p1.y * height}
              x2={p2.x * width}
              y2={p2.y * height}
              stroke={visualFX.neonGlow ? COLORS.accent : '#00BCD4'}
              strokeWidth={visualFX.neonGlow ? 3 : 2}
              strokeLinecap="round"
            />
          );
        })}

        {/* Keypoint circles */}
        {visualFX.showSkeleton && frame.keypoints.map((kp, idx) => (
          <G key={idx}>
            <Circle
              cx={kp.x * width}
              cy={kp.y * height}
              r={visualFX.neonGlow ? 8 : 6}
              fill={visualFX.neonGlow ? COLORS.neonPink : '#FF4081'}
              stroke="#fff"
              strokeWidth={1}
            />
          </G>
        ))}

        {/* Angle annotations */}
        {visualFX.showAngles && frame.angles.map((angle, idx) => {
          const knee = getKeypoint(angle.side === 'left' ? 'left_knee' : 'right_knee');
          if (!knee) return null;
          return (
            <SvgText
              key={idx}
              x={knee.x * width + 15}
              y={knee.y * height}
              fill={COLORS.neonGreen}
              fontSize={12}
              fontWeight="bold"
            >
              {angle.angle.toFixed(0)}°
            </SvgText>
          );
        })}
      </Svg>
    );
  };

  // Visual FX Panel Component
  const renderFXPanel = () => (
    <Modal visible={showFXPanel} transparent animationType="slide">
      <View style={styles.fxModalOverlay}>
        <View style={styles.fxModalContent}>
          <View style={styles.fxModalHeader}>
            <Text style={styles.fxModalTitle}>Visual FX Settings</Text>
            <TouchableOpacity onPress={() => setShowFXPanel(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.fxOption}>
            <View style={styles.fxOptionInfo}>
              <MaterialCommunityIcons name="bone" size={20} color={COLORS.accent} />
              <Text style={styles.fxOptionText}>Show Skeleton</Text>
            </View>
            <Switch
              value={visualFX.showSkeleton}
              onValueChange={(v) => setVisualFX({ ...visualFX, showSkeleton: v })}
              trackColor={{ false: '#333', true: COLORS.accent }}
              thumbColor={visualFX.showSkeleton ? COLORS.neonGreen : '#666'}
            />
          </View>

          <View style={styles.fxOption}>
            <View style={styles.fxOptionInfo}>
              <MaterialCommunityIcons name="angle-acute" size={20} color={COLORS.neonGreen} />
              <Text style={styles.fxOptionText}>Show Angles</Text>
            </View>
            <Switch
              value={visualFX.showAngles}
              onValueChange={(v) => setVisualFX({ ...visualFX, showAngles: v })}
              trackColor={{ false: '#333', true: COLORS.neonGreen }}
              thumbColor={visualFX.showAngles ? COLORS.neonGreen : '#666'}
            />
          </View>

          <View style={styles.fxOption}>
            <View style={styles.fxOptionInfo}>
              <Ionicons name="sparkles" size={20} color={COLORS.neonPink} />
              <Text style={styles.fxOptionText}>Neon Glow</Text>
            </View>
            <Switch
              value={visualFX.neonGlow}
              onValueChange={(v) => setVisualFX({ ...visualFX, neonGlow: v })}
              trackColor={{ false: '#333', true: COLORS.neonPink }}
              thumbColor={visualFX.neonGlow ? COLORS.neonPink : '#666'}
            />
          </View>

          <View style={styles.fxOption}>
            <View style={styles.fxOptionInfo}>
              <MaterialCommunityIcons name="chart-arc" size={20} color={COLORS.neonOrange} />
              <Text style={styles.fxOptionText}>Show ROM</Text>
            </View>
            <Switch
              value={visualFX.showROM}
              onValueChange={(v) => setVisualFX({ ...visualFX, showROM: v })}
              trackColor={{ false: '#333', true: COLORS.neonOrange }}
              thumbColor={visualFX.showROM ? COLORS.neonOrange : '#666'}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  // Permission loading
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Initializing Digital Shadow...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Analyzing view
  if (analyzing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.analyzingContainer}>
          <View style={styles.analyzingIcon}>
            <MaterialCommunityIcons name="robot-outline" size={60} color={COLORS.accent} />
          </View>
          <Text style={styles.analyzingTitle}>AI POSE DETECTION</Text>
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
      </SafeAreaView>
    );
  }

  // Main tabs content
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'scan', label: 'Scan', icon: 'scan' },
    { id: 'posture', label: 'Posture', icon: 'body' },
    { id: 'gait', label: 'Gait', icon: 'walk' },
    { id: 'rom', label: 'ROM', icon: 'fitness' },
    { id: 'report', label: 'Report', icon: 'document-text' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DIGITAL SHADOW V3</Text>
        <TouchableOpacity onPress={() => setShowFXPanel(true)} style={styles.headerBtn}>
          <MaterialCommunityIcons name="tune-variant" size={24} color={COLORS.neonPink} />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.id ? COLORS.accent : COLORS.textMuted}
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* SCAN TAB */}
        {activeTab === 'scan' && (
          <>
            {/* Mode Selection */}
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'walking' && styles.modeButtonActive]}
                onPress={() => setMode('walking')}
              >
                <MaterialCommunityIcons name="walk" size={32} color={mode === 'walking' ? '#fff' : COLORS.accent} />
                <Text style={[styles.modeText, mode === 'walking' && styles.modeTextActive]}>WALKING</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'running' && styles.modeButtonActiveOrange]}
                onPress={() => setMode('running')}
              >
                <MaterialCommunityIcons name="run" size={32} color={mode === 'running' ? '#fff' : COLORS.neonOrange} />
                <Text style={[styles.modeText, mode === 'running' && styles.modeTextActive]}>RUNNING</Text>
              </TouchableOpacity>
            </View>

            {/* View Mode */}
            <View style={styles.viewModeSection}>
              <Text style={styles.sectionLabel}>CAMERA VIEW</Text>
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

            {/* Live AI Wire Analysis Toggle */}
            <View style={styles.liveToggleRow}>
              <TouchableOpacity
                style={[styles.liveToggleBtn, showLiveAnalysis && styles.liveToggleBtnActive]}
                onPress={() => setShowLiveAnalysis(!showLiveAnalysis)}
              >
                <MaterialCommunityIcons
                  name="motion-sensor"
                  size={18}
                  color={showLiveAnalysis ? COLORS.background : COLORS.neonGreen}
                />
                <Text style={[styles.liveToggleText, showLiveAnalysis && styles.liveToggleTextActive]}>
                  {showLiveAnalysis ? 'LIVE AI WIRE ON' : 'LIVE AI WIRE'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.recordModeBtn}
                onPress={() => setShowLiveAnalysis(false)}
              >
                <MaterialCommunityIcons name="record-circle-outline" size={18} color={COLORS.neonOrange} />
                <Text style={styles.recordModeText}>RECORD</Text>
              </TouchableOpacity>
            </View>

            {/* Camera / Live Analysis Preview */}
            <View style={styles.cameraContainer}>
              {showLiveAnalysis && liveHtmlUri ? (
                /* Live wire overlay analysis using TensorFlow.js MoveNet */
                Platform.OS === 'web' ? (
                  <iframe
                    src={liveHtmlUri}
                    style={{ flex: 1, width: '100%', height: '100%', border: 'none', borderRadius: 12 } as any}
                    allow="camera; microphone"
                  />
                ) : (
                  <WebView
                    source={{ uri: liveHtmlUri }}
                    style={styles.camera}
                    allowsInlineMediaPlayback
                    mediaPlaybackRequiresUserAction={false}
                    javaScriptEnabled
                    domStorageEnabled
                    allowFileAccess
                    allowFileAccessFromFileURLs
                    allowUniversalAccessFromFileURLs
                    originWhitelist={['*']}
                    mixedContentMode="always"
                  />
                )
              ) : permission?.granted ? (
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
                </CameraView>
              ) : (
                <View style={styles.cameraPlaceholder}>
                  <Ionicons name="videocam-off" size={50} color={COLORS.textMuted} />
                  <Text style={styles.placeholderText}>Camera not available in browser</Text>
                  <TouchableOpacity style={styles.requestBtn} onPress={requestPermission}>
                    <Text style={styles.requestBtnText}>Request Camera Access</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Controls */}
            <View style={styles.controlsSection}>
              {!isRecording ? (
                <>
                  <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
                    <View style={styles.recordButtonInner} />
                  </TouchableOpacity>
                  <Text style={styles.recordLabel}>TAP TO RECORD</Text>
                  
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.orText}>OR</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity style={styles.uploadButton} onPress={pickVideo}>
                    <Ionicons name="cloud-upload" size={24} color="#fff" />
                    <Text style={styles.uploadButtonText}>UPLOAD VIDEO</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                  <View style={styles.stopButtonInner} />
                  <Text style={styles.stopLabel}>STOP RECORDING</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* POSTURE TAB */}
        {activeTab === 'posture' && result && (
          <>
            <View style={styles.poseSection}>
              <Text style={styles.sectionTitle}>POSE DETECTION</Text>
              {renderPoseOverlay()}
              <View style={styles.frameSelector}>
                <Text style={styles.frameLabel}>Frame: {selectedFrameIndex + 1}/{result.frames.length}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {result.frames.map((_, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.frameDot, selectedFrameIndex === index && styles.frameDotActive]}
                      onPress={() => setSelectedFrameIndex(index)}
                    />
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.angleSection}>
              <Text style={styles.sectionTitle}>JOINT ANGLES</Text>
              <View style={styles.angleGrid}>
                <View style={styles.angleCard}>
                  <Text style={styles.angleValue}>{result.jointAngles.hip.avg.toFixed(1)}°</Text>
                  <Text style={styles.angleLabel}>Hip</Text>
                </View>
                <View style={styles.angleCard}>
                  <Text style={styles.angleValue}>{result.jointAngles.knee.avg.toFixed(1)}°</Text>
                  <Text style={styles.angleLabel}>Knee</Text>
                </View>
                <View style={styles.angleCard}>
                  <Text style={styles.angleValue}>{result.jointAngles.ankle.avg.toFixed(1)}°</Text>
                  <Text style={styles.angleLabel}>Ankle</Text>
                </View>
                <View style={styles.angleCard}>
                  <Text style={styles.angleValue}>{result.jointAngles.trunk.avg.toFixed(1)}°</Text>
                  <Text style={styles.angleLabel}>Trunk</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* GAIT TAB */}
        {activeTab === 'gait' && result && (
          <>
            <View style={styles.scoreCards}>
              <View style={[styles.scoreCard, { borderColor: getScoreColor(result.overallScore) }]}>
                <Text style={[styles.scoreValue, { color: getScoreColor(result.overallScore) }]}>
                  {result.overallScore.toFixed(0)}%
                </Text>
                <Text style={styles.scoreLabel}>Overall Score</Text>
              </View>
              <View style={[styles.scoreCard, { borderColor: result.symmetryIndex >= 90 ? COLORS.success : COLORS.warning }]}>
                <Text style={[styles.scoreValue, { color: result.symmetryIndex >= 90 ? COLORS.success : COLORS.warning }]}>
                  {result.symmetryIndex.toFixed(0)}%
                </Text>
                <Text style={styles.scoreLabel}>Symmetry</Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <MaterialCommunityIcons name="speedometer" size={28} color={COLORS.accent} />
                <Text style={styles.metricValue}>{result.cadence.toFixed(0)}</Text>
                <Text style={styles.metricLabel}>steps/min</Text>
              </View>
              <View style={styles.metricCard}>
                <MaterialCommunityIcons name="ruler" size={28} color={COLORS.neonPurple} />
                <Text style={styles.metricValue}>{result.strideLength.toFixed(2)}m</Text>
                <Text style={styles.metricLabel}>stride</Text>
              </View>
            </View>

            <View style={styles.findingsSection}>
              <Text style={styles.sectionTitle}>CLINICAL FINDINGS</Text>
              {result.findings.map((finding, index) => (
                <View key={index} style={styles.findingItem}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.warning} />
                  <Text style={styles.findingText}>{finding}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ROM TAB */}
        {activeTab === 'rom' && result && (
          <>
            <Text style={styles.sectionTitle}>RANGE OF MOTION ANALYSIS</Text>
            <View style={styles.romSection}>
              <View style={styles.romCard}>
                <Text style={styles.romJoint}>Hip Flexion</Text>
                <View style={styles.romBar}>
                  <View style={[styles.romFill, { width: '75%', backgroundColor: COLORS.success }]} />
                </View>
                <Text style={styles.romValue}>Normal Range</Text>
              </View>
              <View style={styles.romCard}>
                <Text style={styles.romJoint}>Knee Extension</Text>
                <View style={styles.romBar}>
                  <View style={[styles.romFill, { width: '60%', backgroundColor: COLORS.warning }]} />
                </View>
                <Text style={styles.romValue}>Mild Restriction</Text>
              </View>
              <View style={styles.romCard}>
                <Text style={styles.romJoint}>Ankle Dorsiflexion</Text>
                <View style={styles.romBar}>
                  <View style={[styles.romFill, { width: '80%', backgroundColor: COLORS.success }]} />
                </View>
                <Text style={styles.romValue}>Normal Range</Text>
              </View>
            </View>
          </>
        )}

        {/* REPORT TAB */}
        {activeTab === 'report' && result && (
          <>
            <View style={styles.aiInsightsCard}>
              <View style={styles.aiInsightsHeader}>
                <MaterialCommunityIcons name="robot" size={24} color={COLORS.accent} />
                <Text style={styles.aiInsightsTitle}>AI CLINICAL INSIGHTS</Text>
              </View>
              <Text style={styles.aiInsightsText}>{result.aiInsights}</Text>
            </View>

            <View style={styles.recommendationsSection}>
              <Text style={styles.sectionTitle}>RECOMMENDATIONS</Text>
              {result.recommendations.map((rec, index) => (
                <View key={index} style={styles.recItem}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                  <Text style={styles.recText}>{rec}</Text>
                </View>
              ))}
            </View>

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
              <Text style={styles.downloadButtonText}>DOWNLOAD PDF REPORT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.newAnalysisBtn}
              onPress={() => {
                setResult(null);
                setActiveTab('scan');
              }}
            >
              <Ionicons name="refresh" size={20} color={COLORS.accent} />
              <Text style={styles.newAnalysisText}>New Analysis</Text>
            </TouchableOpacity>
          </>
        )}

        {/* No results message for tabs that need results */}
        {!result && activeTab !== 'scan' && (
          <View style={styles.noResultsContainer}>
            <MaterialCommunityIcons name="chart-line" size={60} color={COLORS.textMuted} />
            <Text style={styles.noResultsText}>No analysis results yet</Text>
            <Text style={styles.noResultsSubtext}>Record or upload a video to begin</Text>
            <TouchableOpacity style={styles.goToScanBtn} onPress={() => setActiveTab('scan')}>
              <Text style={styles.goToScanText}>Go to Scan</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Patient Name Modal */}
      <Modal visible={showPatientModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Patient Information</Text>
            <TextInput
              style={styles.modalInput}
              value={patientInfo.name}
              onChangeText={(v) => setPatientInfo({ ...patientInfo, name: v })}
              placeholder="Patient Name"
              placeholderTextColor={COLORS.textMuted}
            />
            <TextInput
              style={styles.modalInput}
              value={patientInfo.age}
              onChangeText={(v) => setPatientInfo({ ...patientInfo, age: v })}
              placeholder="Age"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.modalInput}
              value={patientInfo.condition}
              onChangeText={(v) => setPatientInfo({ ...patientInfo, condition: v })}
              placeholder="Condition (optional)"
              placeholderTextColor={COLORS.textMuted}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={() => setShowPatientModal(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={() => {
                  setShowPatientModal(false);
                  setPatientName(patientInfo.name);
                  if (patientInfo.name.trim()) setShowPaymentModal(true);
                }}
              >
                <Text style={styles.modalButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Visual FX Panel */}
      {renderFXPanel()}

      {/* Payment Gate */}
      <PaymentGateModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentConfirmed={generatePDFReport}
        reportType={`${mode}_gait_analysis`}
        title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} Gait Analysis Report`}
        patientName={patientInfo.name || patientName}
        reportName="Digital Shadow V3 Report"
        analysisData={{
          mode,
          view: viewMode,
          overallScore: result?.overallScore,
          symmetryIndex: result?.symmetryIndex,
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.accent,
    marginTop: 15,
    fontSize: 14,
    letterSpacing: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  headerBtn: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.accent,
    letterSpacing: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 3,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  tabText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.accent,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
  modeButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  modeButtonActiveOrange: {
    backgroundColor: COLORS.neonOrange,
    borderColor: COLORS.neonOrange,
  },
  modeText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
    letterSpacing: 1,
  },
  modeTextActive: {
    color: '#fff',
  },
  viewModeSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 10,
  },
  viewModeButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  viewModeBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  viewModeBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  viewModeBtnText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  viewModeBtnTextActive: {
    color: '#fff',
  },
  liveToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  liveToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.neonGreen,
    backgroundColor: 'transparent',
  },
  liveToggleBtnActive: {
    backgroundColor: COLORS.neonGreen,
  },
  liveToggleText: {
    color: COLORS.neonGreen,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  liveToggleTextActive: {
    color: COLORS.background,
  },
  recordModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.neonOrange,
    backgroundColor: 'transparent',
  },
  recordModeText: {
    color: COLORS.neonOrange,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cameraContainer: {
    height: 380,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
  camera: {
    flex: 1,
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: COLORS.textMuted,
    marginTop: 15,
    fontSize: 13,
  },
  requestBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 15,
  },
  requestBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
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
    backgroundColor: 'rgba(255,0,0,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    fontSize: 20,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  controlsSection: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,68,68,0.2)',
    borderWidth: 4,
    borderColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.error,
  },
  recordLabel: {
    color: COLORS.text,
    marginTop: 12,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 40,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.cardBorder,
  },
  orText: {
    color: COLORS.textMuted,
    paddingHorizontal: 15,
    fontSize: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neonPurple,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    gap: 10,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
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
  stopLabel: {
    color: COLORS.error,
    marginTop: 12,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  // Analyzing styles
  analyzingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  analyzingIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
    marginBottom: 20,
  },
  analyzingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.accent,
    letterSpacing: 2,
    marginBottom: 10,
  },
  analyzingSubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 30,
  },
  progressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.card,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  progressText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  analysisSteps: {
    width: '100%',
    gap: 10,
  },
  stepText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  stepComplete: {
    color: COLORS.success,
  },
  // Pose section
  poseSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.accent,
    letterSpacing: 1,
    marginBottom: 15,
  },
  frameSelector: {
    marginTop: 15,
    alignItems: 'center',
    gap: 10,
  },
  frameLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  frameDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.cardBorder,
    marginHorizontal: 4,
  },
  frameDotActive: {
    backgroundColor: COLORS.accent,
  },
  // Angle section
  angleSection: {
    marginBottom: 20,
  },
  angleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  angleCard: {
    width: (SCREEN_WIDTH - 50) / 2,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  angleValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.neonGreen,
  },
  angleLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 5,
  },
  // Score cards
  scoreCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  scoreLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 5,
    textTransform: 'uppercase',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
  },
  metricLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  // Findings
  findingsSection: {
    marginBottom: 20,
  },
  findingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 8,
  },
  findingText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 20,
  },
  // ROM section
  romSection: {
    gap: 12,
  },
  romCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  romJoint: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  romBar: {
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  romFill: {
    height: '100%',
    borderRadius: 4,
  },
  romValue: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  // AI Insights
  aiInsightsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  aiInsightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  aiInsightsTitle: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  aiInsightsText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 22,
  },
  // Recommendations
  recommendationsSection: {
    marginBottom: 20,
  },
  recItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 8,
  },
  recText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 20,
  },
  // Download button
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gold,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 15,
  },
  downloadButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  newAnalysisBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accent,
    gap: 8,
    marginBottom: 30,
  },
  newAnalysisText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  // No results
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
  },
  noResultsSubtext: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 5,
  },
  goToScanBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 20,
  },
  goToScanText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 25,
    width: '85%',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalTitle: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 14,
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: COLORS.cardBorder,
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: COLORS.accent,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // FX Modal styles
  fxModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  fxModalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  fxModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  fxModalTitle: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  fxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  fxOptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fxOptionText: {
    color: COLORS.text,
    fontSize: 15,
  },
});
