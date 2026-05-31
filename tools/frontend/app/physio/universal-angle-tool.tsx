import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
  PanResponder,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Svg, { Line, Circle, Text as SvgText, G, Rect, Path, Polygon } from 'react-native-svg';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import { PaymentGateModal } from '../../src/utils/PaymentGateModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// WBA99 PhysioScan Colors - Gold & Purple Theme
const COLORS = {
  bg: '#08031A',
  card: '#130829',
  card2: '#1A0E35',
  purple: '#7C3AED',
  pink: '#E879F9',
  gold: '#D4A017',
  gold2: '#F0C040',
  cyan: '#06B6D4',
  green: '#22C55E',
  red: '#EF4444',
  orange: '#F97316',
  text: '#EEE8FF',
  muted: '#9080B0',
  border: 'rgba(124,58,237,0.2)',
};

// Analysis Mode Types
type AnalysisMode = 'anterior' | 'posterior' | 'lateral' | 'head' | 'trunk' | 'quick';
type ScreenType = 'home' | 'workspace' | 'results';

// Landmark Types for each mode
interface LandmarkConfig {
  id: string;
  name: string;
  shortName: string;
  defaultX: number;
  defaultY: number;
  color: string;
  paired?: string; // For paired landmarks (left/right)
}

// Analysis Modes Configuration
const ANALYSIS_MODES: { [key in AnalysisMode]: { 
  name: string; 
  icon: string; 
  desc: string; 
  landmarks: LandmarkConfig[];
  angles: { name: string; points: string[]; normalRange: [number, number]; unit: string }[];
}} = {
  anterior: {
    name: 'Anterior View',
    icon: '🧍',
    desc: 'Front · Head, shoulders, pelvis, knees',
    landmarks: [
      { id: 'head_center', name: 'Head Center', shortName: 'HC', defaultX: 0.5, defaultY: 0.08, color: COLORS.cyan },
      { id: 'left_ear', name: 'Left Ear', shortName: 'LE', defaultX: 0.42, defaultY: 0.1, color: COLORS.pink },
      { id: 'right_ear', name: 'Right Ear', shortName: 'RE', defaultX: 0.58, defaultY: 0.1, color: COLORS.pink },
      { id: 'left_shoulder', name: 'Left Acromion', shortName: 'LA', defaultX: 0.32, defaultY: 0.2, color: COLORS.gold2 },
      { id: 'right_shoulder', name: 'Right Acromion', shortName: 'RA', defaultX: 0.68, defaultY: 0.2, color: COLORS.gold2 },
      { id: 'sternum', name: 'Sternum', shortName: 'ST', defaultX: 0.5, defaultY: 0.28, color: COLORS.cyan },
      { id: 'left_asis', name: 'Left ASIS', shortName: 'LASIS', defaultX: 0.4, defaultY: 0.48, color: COLORS.green },
      { id: 'right_asis', name: 'Right ASIS', shortName: 'RASIS', defaultX: 0.6, defaultY: 0.48, color: COLORS.green },
      { id: 'pubic_symphysis', name: 'Pubic Symphysis', shortName: 'PS', defaultX: 0.5, defaultY: 0.52, color: COLORS.cyan },
      { id: 'left_knee', name: 'Left Patella', shortName: 'LK', defaultX: 0.42, defaultY: 0.7, color: COLORS.orange },
      { id: 'right_knee', name: 'Right Patella', shortName: 'RK', defaultX: 0.58, defaultY: 0.7, color: COLORS.orange },
      { id: 'left_ankle', name: 'Left Malleolus', shortName: 'LM', defaultX: 0.42, defaultY: 0.92, color: COLORS.red },
      { id: 'right_ankle', name: 'Right Malleolus', shortName: 'RM', defaultX: 0.58, defaultY: 0.92, color: COLORS.red },
    ],
    angles: [
      { name: 'Head Tilt', points: ['left_ear', 'head_center', 'right_ear'], normalRange: [175, 185], unit: '°' },
      { name: 'Shoulder Level', points: ['left_shoulder', 'sternum', 'right_shoulder'], normalRange: [175, 185], unit: '°' },
      { name: 'Pelvic Obliquity', points: ['left_asis', 'pubic_symphysis', 'right_asis'], normalRange: [175, 185], unit: '°' },
      { name: 'Q-Angle Left', points: ['left_asis', 'left_knee', 'left_ankle'], normalRange: [165, 180], unit: '°' },
      { name: 'Q-Angle Right', points: ['right_asis', 'right_knee', 'right_ankle'], normalRange: [165, 180], unit: '°' },
    ],
  },
  posterior: {
    name: 'Posterior View',
    icon: '🔙',
    desc: 'Back · Scoliosis · Shoulder blade',
    landmarks: [
      { id: 'c7', name: 'C7 Spinous', shortName: 'C7', defaultX: 0.5, defaultY: 0.12, color: COLORS.cyan },
      { id: 'left_scapula', name: 'Left Scapula', shortName: 'LS', defaultX: 0.35, defaultY: 0.22, color: COLORS.gold2 },
      { id: 'right_scapula', name: 'Right Scapula', shortName: 'RS', defaultX: 0.65, defaultY: 0.22, color: COLORS.gold2 },
      { id: 't12', name: 'T12 Spinous', shortName: 'T12', defaultX: 0.5, defaultY: 0.38, color: COLORS.cyan },
      { id: 'left_psis', name: 'Left PSIS', shortName: 'LPSIS', defaultX: 0.42, defaultY: 0.48, color: COLORS.green },
      { id: 'right_psis', name: 'Right PSIS', shortName: 'RPSIS', defaultX: 0.58, defaultY: 0.48, color: COLORS.green },
      { id: 's2', name: 'S2', shortName: 'S2', defaultX: 0.5, defaultY: 0.52, color: COLORS.cyan },
      { id: 'left_gt', name: 'Left Greater Trochanter', shortName: 'LGT', defaultX: 0.38, defaultY: 0.55, color: COLORS.orange },
      { id: 'right_gt', name: 'Right Greater Trochanter', shortName: 'RGT', defaultX: 0.62, defaultY: 0.55, color: COLORS.orange },
    ],
    angles: [
      { name: 'Scapular Symmetry', points: ['left_scapula', 'c7', 'right_scapula'], normalRange: [175, 185], unit: '°' },
      { name: 'Spinal Alignment', points: ['c7', 't12', 's2'], normalRange: [175, 185], unit: '°' },
      { name: 'Pelvic Level', points: ['left_psis', 's2', 'right_psis'], normalRange: [175, 185], unit: '°' },
    ],
  },
  lateral: {
    name: 'Lateral View',
    icon: '🚶',
    desc: 'Side · FHP · Kyphosis · Lordosis',
    landmarks: [
      { id: 'ear_tragus', name: 'Ear Tragus', shortName: 'ET', defaultX: 0.55, defaultY: 0.08, color: COLORS.pink },
      { id: 'c7_lat', name: 'C7', shortName: 'C7', defaultX: 0.48, defaultY: 0.15, color: COLORS.cyan },
      { id: 'acromion', name: 'Acromion', shortName: 'AC', defaultX: 0.42, defaultY: 0.2, color: COLORS.gold2 },
      { id: 't12_lat', name: 'T12', shortName: 'T12', defaultX: 0.45, defaultY: 0.38, color: COLORS.cyan },
      { id: 'l5', name: 'L5', shortName: 'L5', defaultX: 0.42, defaultY: 0.48, color: COLORS.cyan },
      { id: 'gt_lat', name: 'Greater Trochanter', shortName: 'GT', defaultX: 0.5, defaultY: 0.52, color: COLORS.green },
      { id: 'knee_lat', name: 'Knee Joint', shortName: 'KJ', defaultX: 0.48, defaultY: 0.7, color: COLORS.orange },
      { id: 'lat_malleolus', name: 'Lateral Malleolus', shortName: 'LM', defaultX: 0.5, defaultY: 0.92, color: COLORS.red },
    ],
    angles: [
      { name: 'CVA (Craniovertebral)', points: ['ear_tragus', 'c7_lat', 'acromion'], normalRange: [48, 56], unit: '°' },
      { name: 'Thoracic Kyphosis', points: ['c7_lat', 't12_lat', 'l5'], normalRange: [20, 40], unit: '°' },
      { name: 'Lumbar Lordosis', points: ['t12_lat', 'l5', 'gt_lat'], normalRange: [40, 60], unit: '°' },
      { name: 'Knee Flexion', points: ['gt_lat', 'knee_lat', 'lat_malleolus'], normalRange: [175, 185], unit: '°' },
    ],
  },
  head: {
    name: 'Head-Neck',
    icon: '🔄',
    desc: 'CVA · FHP · Craniovertebral angle',
    landmarks: [
      { id: 'nasion', name: 'Nasion', shortName: 'NA', defaultX: 0.52, defaultY: 0.15, color: COLORS.pink },
      { id: 'ext_aud', name: 'External Auditory Meatus', shortName: 'EAM', defaultX: 0.58, defaultY: 0.2, color: COLORS.cyan },
      { id: 'c2', name: 'C2 Spinous', shortName: 'C2', defaultX: 0.48, defaultY: 0.28, color: COLORS.gold2 },
      { id: 'c7_head', name: 'C7 Spinous', shortName: 'C7', defaultX: 0.45, defaultY: 0.42, color: COLORS.gold2 },
      { id: 'manubrium', name: 'Manubrium', shortName: 'MN', defaultX: 0.5, defaultY: 0.55, color: COLORS.green },
    ],
    angles: [
      { name: 'CVA', points: ['ext_aud', 'c7_head', 'manubrium'], normalRange: [48, 56], unit: '°' },
      { name: 'Head Flexion', points: ['nasion', 'ext_aud', 'c2'], normalRange: [15, 25], unit: '°' },
    ],
  },
  trunk: {
    name: 'Trunk Symmetry',
    icon: '⚖️',
    desc: 'Scoliosis · Rib cage · Obliquity',
    landmarks: [
      { id: 'c7_trunk', name: 'C7', shortName: 'C7', defaultX: 0.5, defaultY: 0.1, color: COLORS.cyan },
      { id: 'left_rib', name: 'Left Rib Angle', shortName: 'LR', defaultX: 0.35, defaultY: 0.3, color: COLORS.gold2 },
      { id: 'right_rib', name: 'Right Rib Angle', shortName: 'RR', defaultX: 0.65, defaultY: 0.3, color: COLORS.gold2 },
      { id: 't12_trunk', name: 'T12', shortName: 'T12', defaultX: 0.5, defaultY: 0.4, color: COLORS.cyan },
      { id: 'left_iliac', name: 'Left Iliac Crest', shortName: 'LIC', defaultX: 0.38, defaultY: 0.5, color: COLORS.green },
      { id: 'right_iliac', name: 'Right Iliac Crest', shortName: 'RIC', defaultX: 0.62, defaultY: 0.5, color: COLORS.green },
    ],
    angles: [
      { name: 'Rib Cage Symmetry', points: ['left_rib', 'c7_trunk', 'right_rib'], normalRange: [175, 185], unit: '°' },
      { name: 'Trunk Alignment', points: ['c7_trunk', 't12_trunk', 'left_iliac'], normalRange: [170, 190], unit: '°' },
      { name: 'Pelvic Tilt', points: ['left_iliac', 't12_trunk', 'right_iliac'], normalRange: [175, 185], unit: '°' },
    ],
  },
  quick: {
    name: 'Quick Analysis',
    icon: '⚡',
    desc: 'Full body · Instant report',
    landmarks: [
      { id: 'head_q', name: 'Head', shortName: 'H', defaultX: 0.5, defaultY: 0.08, color: COLORS.pink },
      { id: 'left_sh_q', name: 'L Shoulder', shortName: 'LS', defaultX: 0.35, defaultY: 0.2, color: COLORS.gold2 },
      { id: 'right_sh_q', name: 'R Shoulder', shortName: 'RS', defaultX: 0.65, defaultY: 0.2, color: COLORS.gold2 },
      { id: 'spine_mid_q', name: 'Mid Spine', shortName: 'MS', defaultX: 0.5, defaultY: 0.35, color: COLORS.cyan },
      { id: 'left_hip_q', name: 'L Hip', shortName: 'LH', defaultX: 0.4, defaultY: 0.5, color: COLORS.green },
      { id: 'right_hip_q', name: 'R Hip', shortName: 'RH', defaultX: 0.6, defaultY: 0.5, color: COLORS.green },
    ],
    angles: [
      { name: 'Shoulder Level', points: ['left_sh_q', 'head_q', 'right_sh_q'], normalRange: [175, 185], unit: '°' },
      { name: 'Hip Level', points: ['left_hip_q', 'spine_mid_q', 'right_hip_q'], normalRange: [175, 185], unit: '°' },
    ],
  },
};

// Calculate angle between 3 points
const calculateAngle = (p1: {x: number, y: number}, p2: {x: number, y: number}, p3: {x: number, y: number}): number => {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.round((Math.acos(cos) * 180 / Math.PI) * 10) / 10;
};

// Get status from angle
const getAngleStatus = (angle: number, normalRange: [number, number]): 'good' | 'warn' | 'bad' => {
  const [min, max] = normalRange;
  if (angle >= min && angle <= max) return 'good';
  const deviation = Math.min(Math.abs(angle - min), Math.abs(angle - max));
  if (deviation <= 10) return 'warn';
  return 'bad';
};

// Draggable Landmark Component
const DraggableLandmark: React.FC<{
  landmark: LandmarkConfig;
  position: { x: number; y: number };
  imageWidth: number;
  imageHeight: number;
  onDrag: (x: number, y: number) => void;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ landmark, position, imageWidth, imageHeight, onDrag, isSelected, onSelect }) => {
  const pan = useRef(new Animated.ValueXY({
    x: position.x * imageWidth - 14,
    y: position.y * imageHeight - 14,
  })).current;

  useEffect(() => {
    pan.setValue({
      x: position.x * imageWidth - 14,
      y: position.y * imageHeight - 14,
    });
  }, [position.x, position.y, imageWidth, imageHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        onSelect();
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        const newX = Math.max(0, Math.min(1, ((pan.x as any)._value + 14) / imageWidth));
        const newY = Math.max(0, Math.min(1, ((pan.y as any)._value + 14) / imageHeight));
        onDrag(newX, newY);
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.landmark,
        {
          backgroundColor: isSelected ? '#fff' : landmark.color,
          borderColor: isSelected ? landmark.color : 'rgba(255,255,255,0.5)',
          borderWidth: isSelected ? 3 : 2,
          transform: pan.getTranslateTransform(),
          // Using boxShadow for web compatibility
          boxShadow: `0px 0px ${isSelected ? 12 : 6}px ${landmark.color}`,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Text style={[styles.landmarkText, { color: isSelected ? landmark.color : '#fff' }]}>
        {landmark.shortName}
      </Text>
    </Animated.View>
  );
};

export default function PhysioScanLandmarkAnalyzer() {
  const router = useRouter();
  const { currentUser } = useStore();

  // Screen state
  const [screen, setScreen] = useState<ScreenType>('home');
  const [selectedMode, setSelectedMode] = useState<AnalysisMode | null>(null);

  // Image state
  const [image, setImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  // Landmark positions state
  const [landmarkPositions, setLandmarkPositions] = useState<{ [id: string]: { x: number; y: number } }>({});
  const [selectedLandmark, setSelectedLandmark] = useState<string | null>(null);

  // Analysis results
  const [analysisResults, setAnalysisResults] = useState<{
    angles: { name: string; value: number; status: 'good' | 'warn' | 'bad'; normalRange: [number, number] }[];
    overallScore: number;
    grade: string;
  } | null>(null);

  // UI state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Image dimensions
  const imageContainerHeight = SCREEN_HEIGHT - 200;
  const imageWidth = SCREEN_WIDTH;
  const imageHeight = imageContainerHeight;

  // Start analysis mode
  const startMode = (mode: AnalysisMode) => {
    setSelectedMode(mode);
    setScreen('workspace');
    
    // Initialize landmark positions
    const config = ANALYSIS_MODES[mode];
    const positions: { [id: string]: { x: number; y: number } } = {};
    config.landmarks.forEach(lm => {
      positions[lm.id] = { x: lm.defaultX, y: lm.defaultY };
    });
    setLandmarkPositions(positions);
  };

  // Pick image
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });
      if (!result.canceled && result.assets[0]) {
        setImageLoading(true);
        setImage(result.assets[0].uri);
        setImageLoading(false);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  // Take photo
  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.granted) {
        const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
        if (!result.canceled && result.assets[0]) {
          setImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to access camera');
    }
  };

  // Update landmark position
  const updateLandmarkPosition = (id: string, x: number, y: number) => {
    setLandmarkPositions(prev => ({ ...prev, [id]: { x, y } }));
  };

  // Run analysis
  const runAnalysis = () => {
    if (!selectedMode || !image) {
      Alert.alert('Error', 'Please upload an image first');
      return;
    }

    const config = ANALYSIS_MODES[selectedMode];
    const results: { name: string; value: number; status: 'good' | 'warn' | 'bad'; normalRange: [number, number] }[] = [];

    config.angles.forEach(angleConfig => {
      const [p1Id, p2Id, p3Id] = angleConfig.points;
      const p1 = landmarkPositions[p1Id];
      const p2 = landmarkPositions[p2Id];
      const p3 = landmarkPositions[p3Id];

      if (p1 && p2 && p3) {
        const angle = calculateAngle(p1, p2, p3);
        const status = getAngleStatus(angle, angleConfig.normalRange);
        results.push({
          name: angleConfig.name,
          value: angle,
          status,
          normalRange: angleConfig.normalRange,
        });
      }
    });

    // Calculate overall score
    const goodCount = results.filter(r => r.status === 'good').length;
    const warnCount = results.filter(r => r.status === 'warn').length;
    const score = Math.round((goodCount * 100 + warnCount * 50) / results.length);
    
    let grade = 'Poor';
    if (score >= 90) grade = 'Excellent';
    else if (score >= 75) grade = 'Good';
    else if (score >= 60) grade = 'Fair';

    setAnalysisResults({
      angles: results,
      overallScore: score,
      grade,
    });
    setScreen('results');
  };

  // Clear all landmarks
  const clearLandmarks = () => {
    if (!selectedMode) return;
    const config = ANALYSIS_MODES[selectedMode];
    const positions: { [id: string]: { x: number; y: number } } = {};
    config.landmarks.forEach(lm => {
      positions[lm.id] = { x: lm.defaultX, y: lm.defaultY };
    });
    setLandmarkPositions(positions);
    setSelectedLandmark(null);
  };

  // Go back to home
  const goHome = () => {
    setScreen('home');
    setSelectedMode(null);
    setImage(null);
    setLandmarkPositions({});
    setAnalysisResults(null);
  };

  // Generate PDF Report
  const generatePDFReport = async () => {
    if (!analysisResults || !selectedMode) return;

    setGenerating(true);
    try {
      const date = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
      const config = ANALYSIS_MODES[selectedMode];
      const reportId = `WBA99-${Date.now().toString(36).toUpperCase()}`;

      const angleRows = analysisResults.angles.map(angle => `
        <tr style="background:${angle.status === 'good' ? '#F0FDF4' : angle.status === 'warn' ? '#FEF3C7' : '#FEE2E2'}">
          <td style="padding:10px;border-bottom:1px solid #E0D0FF;font-weight:700">${angle.name}</td>
          <td style="padding:10px;border-bottom:1px solid #E0D0FF;font-family:monospace;font-weight:800;color:${angle.status === 'good' ? '#16A34A' : angle.status === 'warn' ? '#D97706' : '#DC2626'}">${angle.value}°</td>
          <td style="padding:10px;border-bottom:1px solid #E0D0FF;color:#666">${angle.normalRange[0]}° - ${angle.normalRange[1]}°</td>
          <td style="padding:10px;border-bottom:1px solid #E0D0FF">
            <span style="background:${angle.status === 'good' ? '#DCFCE7' : angle.status === 'warn' ? '#FEF3C7' : '#FEE2E2'};color:${angle.status === 'good' ? '#16A34A' : angle.status === 'warn' ? '#D97706' : '#DC2626'};padding:3px 10px;border-radius:100px;font-weight:700;font-size:11px">${angle.status.toUpperCase()}</span>
          </td>
        </tr>
      `).join('');

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1A1F2E; background: #fff; }
    .header { background: linear-gradient(135deg, #1A0040, #3B0D82); color: #fff; padding: 20px; display: flex; align-items: center; justify-content: space-between; }
    .logo { display: flex; align-items: center; gap: 12px; }
    .coin { width: 45px; height: 45px; border-radius: 50%; background: linear-gradient(135deg, #D4A017, #F0C040); display: flex; align-items: center; justify-content: center; }
    .coin-in { font-weight: 900; color: #5C2E0A; font-size: 12px; }
    .brand-name { font-size: 20px; font-weight: 900; color: #F0C040; }
    .brand-sub { font-size: 11px; color: rgba(255,255,255,0.6); }
    .patient-bar { background: #F0EBF8; padding: 15px 20px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; border-bottom: 2px solid #DDD0F0; }
    .field-label { font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .field-value { font-size: 14px; font-weight: 700; color: #1A1F2E; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
    .score-section { padding: 20px; display: flex; align-items: center; gap: 20px; border-bottom: 1px solid #EEE; }
    .score-ring { width: 100px; height: 100px; border-radius: 50%; background: conic-gradient(${analysisResults.overallScore >= 75 ? '#16A34A' : analysisResults.overallScore >= 50 ? '#D97706' : '#DC2626'} ${analysisResults.overallScore * 3.6}deg, #E5E7EB 0deg); display: flex; align-items: center; justify-content: center; }
    .score-inner { width: 80px; height: 80px; border-radius: 50%; background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .score-value { font-size: 28px; font-weight: 900; color: ${analysisResults.overallScore >= 75 ? '#16A34A' : analysisResults.overallScore >= 50 ? '#D97706' : '#DC2626'}; }
    .score-label { font-size: 10px; color: #888; }
    .grade { font-size: 24px; font-weight: 900; color: ${analysisResults.overallScore >= 75 ? '#16A34A' : analysisResults.overallScore >= 50 ? '#D97706' : '#DC2626'}; }
    .section-title { font-size: 12px; letter-spacing: 2px; font-weight: 800; color: #4C1D95; text-transform: uppercase; padding: 15px 20px 10px; border-top: 1px solid #EEE; }
    table { width: calc(100% - 40px); margin: 0 20px 20px; border-collapse: collapse; border: 1px solid #E0D0FF; border-radius: 8px; overflow: hidden; }
    th { background: linear-gradient(135deg, #D4A017, #F0C040); padding: 10px; text-align: left; font-size: 11px; font-weight: 800; color: #1A0A00; text-transform: uppercase; }
    .footer { background: #F0EBF8; padding: 15px 20px; display: flex; align-items: center; justify-content: space-between; border-top: 2px solid #DDD0F0; margin-top: 20px; }
    .footer-brand { font-size: 16px; font-weight: 900; color: #4C1D95; }
    .footer-note { font-size: 10px; color: #888; text-align: center; max-width: 300px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="coin"><span class="coin-in">W99</span></div>
      <div>
        <div class="brand-name">WBA99 PhysioScan</div>
        <div class="brand-sub">Landmark Angle Analyzer</div>
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:rgba(255,255,255,0.5)">${date}</div>
      <div style="font-size:14px;font-weight:700;color:#FFD966">${config.name}</div>
    </div>
  </div>

  <div class="patient-bar">
    <div><div class="field-label">Patient Name</div><div class="field-value">${patientName || 'Not Specified'}</div></div>
    <div><div class="field-label">Report ID</div><div class="field-value">${reportId}</div></div>
    <div><div class="field-label">Analysis Mode</div><div class="field-value">${config.name}</div></div>
    <div><div class="field-label">Assessor</div><div class="field-value">${currentUser?.name || 'Physiotherapist'}</div></div>
  </div>

  <div class="score-section">
    <div class="score-ring">
      <div class="score-inner">
        <div class="score-value">${analysisResults.overallScore}%</div>
        <div class="score-label">SCORE</div>
      </div>
    </div>
    <div>
      <div class="grade">${analysisResults.grade} Posture</div>
      <div style="font-size:13px;color:#555;margin-top:5px">${analysisResults.angles.filter(a => a.status === 'good').length} of ${analysisResults.angles.length} measurements within normal range</div>
    </div>
  </div>

  <div class="section-title">Clinical Assessment Results</div>
  <table>
    <thead>
      <tr>
        <th>Measurement</th>
        <th>Value</th>
        <th>Normal Range</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${angleRows}
    </tbody>
  </table>

  <div class="section-title">Recommendations</div>
  <div style="padding:0 20px 20px;font-size:13px;color:#555;line-height:1.7">
    ${analysisResults.angles.filter(a => a.status !== 'good').map(a => 
      `<p style="margin-bottom:8px">• <strong>${a.name}</strong>: Current value (${a.value}°) is outside normal range. Consider targeted exercises and postural correction.</p>`
    ).join('')}
    ${analysisResults.angles.filter(a => a.status !== 'good').length === 0 ? '<p>All measurements are within normal range. Maintain current posture and continue regular assessments.</p>' : ''}
  </div>

  <div class="footer">
    <div class="footer-brand">WBA99 PhysioScan AI</div>
    <div class="footer-note">This report is generated using AI-assisted analysis. Always consult with a qualified healthcare professional for clinical decisions.</div>
  </div>
</body>
</html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert('Error', 'Failed to generate PDF report');
    } finally {
      setGenerating(false);
      setShowPaymentModal(false);
    }
  };

  // Render Home Screen
  const renderHomeScreen = () => (
    <ScrollView style={styles.homeScroll} showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <View style={styles.pulse} />
          <Text style={styles.heroBadgeText}>WBA99 · Medical Grade · AI Powered</Text>
        </View>

        <View style={styles.heroLogo}>
          <View style={styles.coin}>
            <View style={styles.coinInner}>
              <Text style={styles.coinText}>W99</Text>
            </View>
          </View>
          <View>
            <Text style={styles.brandName}>WBA99</Text>
            <Text style={styles.brandSub}>PhysioScan AI</Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>
          Bony Landmark{'\n'}<Text style={styles.heroTitleAccent}>Angle Analyzer</Text>
        </Text>
        <Text style={styles.heroDesc}>
          Clinical-grade postural analysis · Drag landmarks · Medical angle values · Causes, consequences & rehab protocol · Professional PDF report
        </Text>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>14</Text>
            <Text style={styles.statLabel}>Landmarks</Text>
          </View>
          <View style={[styles.stat, styles.statBorder]}>
            <Text style={styles.statValue}>7+</Text>
            <Text style={styles.statLabel}>Angles</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>6</Text>
            <Text style={styles.statLabel}>Regions</Text>
          </View>
        </View>
      </View>

      {/* Mode Selection */}
      <View style={styles.modeSection}>
        <View style={styles.modeLabelRow}>
          <Text style={styles.modeLabel}>Select Analysis Mode</Text>
          <View style={styles.modeLine} />
        </View>

        <View style={styles.modeGrid}>
          {(Object.keys(ANALYSIS_MODES) as AnalysisMode[]).map((mode) => {
            const config = ANALYSIS_MODES[mode];
            return (
              <TouchableOpacity
                key={mode}
                style={styles.modeCard}
                onPress={() => startMode(mode)}
                activeOpacity={0.8}
              >
                <Text style={styles.modeIcon}>{config.icon}</Text>
                <Text style={styles.modeName}>{config.name}</Text>
                <Text style={styles.modeDesc}>{config.desc}</Text>
                {mode === 'anterior' && (
                  <View style={styles.modeTag}>
                    <Text style={styles.modeTagText}>Most used</Text>
                  </View>
                )}
                {mode === 'quick' && (
                  <View style={[styles.modeTag, styles.modeTagOrange]}>
                    <Text style={[styles.modeTagText, styles.modeTagTextOrange]}>Fast</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  // Render Workspace Screen
  const renderWorkspaceScreen = () => {
    const config = selectedMode ? ANALYSIS_MODES[selectedMode] : null;
    
    return (
      <View style={styles.workspaceContainer}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.tbBack} onPress={goHome}>
            <Ionicons name="arrow-back" size={18} color={COLORS.pink} />
          </TouchableOpacity>
          <Text style={styles.tbTitle}>{config?.name || 'Analysis'}</Text>
          <TouchableOpacity style={styles.tbDel} onPress={clearLandmarks}>
            <Text style={styles.tbDelText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tbAnalyse} onPress={runAnalysis}>
            <Text style={styles.tbAnalyseText}>Analyse</Text>
          </TouchableOpacity>
        </View>

        {/* Canvas Area */}
        <View style={styles.canvasArea}>
          {!image ? (
            <View style={styles.uploadPlaceholder}>
              <Text style={styles.uphIcon}>📷</Text>
              <Text style={styles.uphTitle}>Upload Patient Photo</Text>
              <Text style={styles.uphSub}>Take or select a photo to begin landmark placement</Text>
              <View style={styles.uphButtons}>
                <TouchableOpacity style={styles.uphBtn} onPress={pickImage}>
                  <Ionicons name="images" size={20} color="#fff" />
                  <Text style={styles.uphBtnText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.uphBtn, styles.uphBtnCamera]} onPress={takePhoto}>
                  <Ionicons name="camera" size={20} color="#fff" />
                  <Text style={styles.uphBtnText}>Camera</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.imageWrapper}>
              {imageLoading && (
                <View style={styles.imageLoading}>
                  <ActivityIndicator size="large" color={COLORS.gold2} />
                </View>
              )}
              <Image
                source={{ uri: image }}
                style={[styles.bgImage, { height: imageHeight }]}
                resizeMode="contain"
              />
              
              {/* SVG Lines connecting landmarks */}
              {config && (
                <Svg style={[styles.svgOverlay, { height: imageHeight }]} width={imageWidth} height={imageHeight}>
                  {config.angles.map((angleConfig, idx) => {
                    const [p1Id, p2Id, p3Id] = angleConfig.points;
                    const p1 = landmarkPositions[p1Id];
                    const p2 = landmarkPositions[p2Id];
                    const p3 = landmarkPositions[p3Id];
                    if (!p1 || !p2 || !p3) return null;

                    return (
                      <G key={idx}>
                        <Line
                          x1={p1.x * imageWidth}
                          y1={p1.y * imageHeight}
                          x2={p2.x * imageWidth}
                          y2={p2.y * imageHeight}
                          stroke={COLORS.gold2}
                          strokeWidth={2}
                          strokeDasharray="5,3"
                        />
                        <Line
                          x1={p2.x * imageWidth}
                          y1={p2.y * imageHeight}
                          x2={p3.x * imageWidth}
                          y2={p3.y * imageHeight}
                          stroke={COLORS.gold2}
                          strokeWidth={2}
                          strokeDasharray="5,3"
                        />
                      </G>
                    );
                  })}
                </Svg>
              )}

              {/* Draggable Landmarks */}
              {config?.landmarks.map(lm => (
                <DraggableLandmark
                  key={lm.id}
                  landmark={lm}
                  position={landmarkPositions[lm.id] || { x: lm.defaultX, y: lm.defaultY }}
                  imageWidth={imageWidth}
                  imageHeight={imageHeight}
                  onDrag={(x, y) => updateLandmarkPosition(lm.id, x, y)}
                  isSelected={selectedLandmark === lm.id}
                  onSelect={() => setSelectedLandmark(lm.id)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Bottom Bar with Landmark List */}
        {image && config && (
          <ScrollView 
            horizontal 
            style={styles.btmBar} 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.btmBarContent}
          >
            {config.landmarks.map(lm => (
              <TouchableOpacity 
                key={lm.id} 
                style={[styles.btmItem, selectedLandmark === lm.id && styles.btmItemSelected]}
                onPress={() => setSelectedLandmark(lm.id)}
              >
                <View style={[styles.btmDot, { backgroundColor: lm.color }]} />
                <Text style={styles.btmLabel}>{lm.shortName}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  // Render Results Screen
  const renderResultsScreen = () => {
    if (!analysisResults || !selectedMode) return null;
    const config = ANALYSIS_MODES[selectedMode];

    return (
      <View style={styles.resultsContainer}>
        {/* Top Bar */}
        <View style={styles.rpBar}>
          <TouchableOpacity style={styles.tbBack} onPress={() => setScreen('workspace')}>
            <Ionicons name="arrow-back" size={18} color={COLORS.pink} />
          </TouchableOpacity>
          <Text style={styles.rpTitle}>Analysis Results</Text>
          <TouchableOpacity 
            style={styles.rpPdf}
            onPress={() => {
              if (!patientName) setShowPatientModal(true);
              else setShowPaymentModal(true);
            }}
          >
            <Text style={styles.rpPdfText}>PDF</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.resultsScroll} showsVerticalScrollIndicator={false}>
          {/* Score Hero */}
          <View style={styles.scoreHero}>
            <View style={styles.ringWrap}>
              <View style={[styles.scoreRing, { 
                borderColor: analysisResults.overallScore >= 75 ? COLORS.green : 
                             analysisResults.overallScore >= 50 ? COLORS.orange : COLORS.red 
              }]}>
                <Text style={[styles.ringPct, {
                  color: analysisResults.overallScore >= 75 ? COLORS.green : 
                         analysisResults.overallScore >= 50 ? COLORS.orange : COLORS.red
                }]}>{analysisResults.overallScore}%</Text>
                <Text style={styles.ringLbl}>SCORE</Text>
              </View>
            </View>
            <View style={styles.scoreInfo}>
              <Text style={[styles.scoreGrade, {
                color: analysisResults.overallScore >= 75 ? COLORS.green : 
                       analysisResults.overallScore >= 50 ? COLORS.orange : COLORS.red
              }]}>{analysisResults.grade} Posture</Text>
              <Text style={styles.scoreSub}>
                {analysisResults.angles.filter(a => a.status === 'good').length} of {analysisResults.angles.length} measurements within normal range
              </Text>
            </View>
          </View>

          {/* Area Pills */}
          <View style={styles.areaRow}>
            {analysisResults.angles.map((angle, idx) => (
              <View 
                key={idx} 
                style={[
                  styles.areaPill,
                  angle.status === 'good' && styles.areaPillGood,
                  angle.status === 'warn' && styles.areaPillWarn,
                  angle.status === 'bad' && styles.areaPillBad,
                ]}
              >
                <Text style={[
                  styles.areaPillText,
                  { color: angle.status === 'good' ? COLORS.green : angle.status === 'warn' ? COLORS.orange : COLORS.red }
                ]}>
                  {angle.name}
                </Text>
              </View>
            ))}
          </View>

          {/* Clinical Assessment Table */}
          <View style={styles.caSection}>
            <View style={styles.caTitleRow}>
              <Text style={styles.caTitle}>Clinical Assessment</Text>
              <View style={styles.caTitleLine} />
            </View>

            <View style={styles.caTable}>
              <View style={styles.caHeader}>
                <Text style={styles.caHeaderCell}>Region</Text>
                <Text style={styles.caHeaderCell}>Value</Text>
                <Text style={styles.caHeaderCell}>Normal</Text>
                <Text style={styles.caHeaderCell}>Status</Text>
              </View>
              
              {analysisResults.angles.map((angle, idx) => (
                <View key={idx} style={[styles.caRow, idx % 2 === 1 && styles.caRowAlt]}>
                  <Text style={styles.caCellName}>{angle.name}</Text>
                  <Text style={[styles.caCellValue, {
                    color: angle.status === 'good' ? COLORS.green : 
                           angle.status === 'warn' ? COLORS.orange : COLORS.red
                  }]}>{angle.value}°</Text>
                  <Text style={styles.caCellNormal}>{angle.normalRange[0]}°-{angle.normalRange[1]}°</Text>
                  <View style={[
                    styles.statusBadge,
                    angle.status === 'good' && styles.statusBadgeGood,
                    angle.status === 'warn' && styles.statusBadgeWarn,
                    angle.status === 'bad' && styles.statusBadgeBad,
                  ]}>
                    <Text style={[styles.statusBadgeText, {
                      color: angle.status === 'good' ? COLORS.green : 
                             angle.status === 'warn' ? COLORS.orange : COLORS.red
                    }]}>{angle.status.toUpperCase()}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Bottom Actions */}
          <View style={styles.bottomBtns}>
            <TouchableOpacity style={styles.btnNew} onPress={goHome}>
              <Text style={styles.btnNewText}>New Analysis</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.btnExport}
              onPress={() => {
                if (!patientName) setShowPatientModal(true);
                else setShowPaymentModal(true);
              }}
            >
              <Text style={styles.btnExportText}>Export PDF</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {screen === 'home' && renderHomeScreen()}
      {screen === 'workspace' && renderWorkspaceScreen()}
      {screen === 'results' && renderResultsScreen()}

      {/* Patient Name Modal */}
      <Modal visible={showPatientModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Patient Information</Text>
            <TextInput
              style={styles.modalInput}
              value={patientName}
              onChangeText={setPatientName}
              placeholder="Enter patient name"
              placeholderTextColor={COLORS.muted}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.mBtnOut} onPress={() => setShowPatientModal(false)}>
                <Text style={styles.mBtnOutText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.mBtnFill}
                onPress={() => {
                  setShowPatientModal(false);
                  if (patientName.trim()) setShowPaymentModal(true);
                }}
              >
                <Text style={styles.mBtnFillText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Gate */}
      <PaymentGateModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentConfirmed={generatePDFReport}
        reportType="landmark_analysis"
        title="Landmark Analysis Report"
        patientName={patientName}
        reportName={selectedMode ? ANALYSIS_MODES[selectedMode].name : 'Analysis'}
        analysisData={{
          mode: selectedMode,
          score: analysisResults?.overallScore,
          grade: analysisResults?.grade,
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  // Home Screen
  homeScroll: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 28,
    alignItems: 'center',
    backgroundColor: 'rgba(124,58,237,0.08)',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
    borderRadius: 100,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  pulse: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.pink,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.pink,
    letterSpacing: 0.5,
  },
  heroLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  coin: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 0px 18px rgba(255, 215, 0, 0.5)',
  },
  coinInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5E3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
  },
  brandName: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.gold2,
    letterSpacing: -1,
  },
  brandSub: {
    fontSize: 10,
    letterSpacing: 2.5,
    color: COLORS.gold,
    opacity: 0.6,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 5,
  },
  heroTitleAccent: {
    color: COLORS.pink,
  },
  heroDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    paddingHorizontal: 10,
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  stat: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  statBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.gold2,
    fontFamily: 'monospace',
  },
  statLabel: {
    fontSize: 9,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  modeSection: {
    paddingHorizontal: 18,
    paddingBottom: 32,
  },
  modeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  modeLabel: {
    fontSize: 10,
    letterSpacing: 2.5,
    fontWeight: '700',
    color: COLORS.purple,
    textTransform: 'uppercase',
  },
  modeLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.purple,
    opacity: 0.2,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  modeCard: {
    width: (SCREEN_WIDTH - 36 - 9) / 2,
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.22)',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
  },
  modeIcon: {
    fontSize: 30,
    marginBottom: 9,
  },
  modeName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 3,
    textAlign: 'center',
  },
  modeDesc: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.42)',
    textAlign: 'center',
    lineHeight: 14,
  },
  modeTag: {
    position: 'absolute',
    top: 7,
    right: 7,
    backgroundColor: 'rgba(34,197,94,0.18)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 100,
  },
  modeTagText: {
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.green,
  },
  modeTagOrange: {
    backgroundColor: 'rgba(249,115,22,0.2)',
  },
  modeTagTextOrange: {
    color: COLORS.orange,
  },
  // Workspace
  workspaceContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 11,
    backgroundColor: 'rgba(8,3,26,0.96)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124,58,237,0.22)',
    gap: 8,
  },
  tbBack: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tbTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.pink,
  },
  tbDel: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  tbDelText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.red,
  },
  tbAnalyse: {
    backgroundColor: COLORS.purple,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  tbAnalyseText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  canvasArea: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    padding: 24,
  },
  uphIcon: {
    fontSize: 48,
    opacity: 0.3,
  },
  uphTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 15,
  },
  uphSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.32)',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
  uphButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  uphBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.purple,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 11,
  },
  uphBtnCamera: {
    backgroundColor: COLORS.green,
  },
  uphBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  imageWrapper: {
    flex: 1,
    width: '100%',
  },
  bgImage: {
    width: '100%',
  },
  imageLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  landmark: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  landmarkText: {
    fontSize: 8,
    fontWeight: '800',
  },
  btmBar: {
    backgroundColor: 'rgba(8,3,26,0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(124,58,237,0.18)',
    paddingVertical: 8,
  },
  btmBarContent: {
    paddingHorizontal: 10,
    gap: 6,
    flexDirection: 'row',
  },
  btmItem: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  btmItemSelected: {
    backgroundColor: 'rgba(124,58,237,0.2)',
  },
  btmDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  btmLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
  },
  // Results
  resultsContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  rpBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 11,
    backgroundColor: 'rgba(8,3,26,0.96)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124,58,237,0.2)',
    gap: 8,
  },
  rpTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.pink,
  },
  rpPdf: {
    backgroundColor: COLORS.gold,
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  rpPdfText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A0A00',
  },
  resultsScroll: {
    flex: 1,
  },
  scoreHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    backgroundColor: 'rgba(124,58,237,0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124,58,237,0.12)',
  },
  ringWrap: {
    width: 88,
    height: 88,
  },
  scoreRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  ringLbl: {
    fontSize: 8,
    color: COLORS.muted,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreGrade: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 3,
  },
  scoreSub: {
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 16,
  },
  areaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    padding: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124,58,237,0.1)',
  },
  areaPill: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 100,
    borderWidth: 1,
  },
  areaPillGood: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderColor: 'rgba(34,197,94,0.22)',
  },
  areaPillWarn: {
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderColor: 'rgba(249,115,22,0.22)',
  },
  areaPillBad: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.18)',
  },
  areaPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  caSection: {
    padding: 12,
  },
  caTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  caTitle: {
    fontSize: 10,
    letterSpacing: 2.5,
    fontWeight: '800',
    color: COLORS.gold,
    textTransform: 'uppercase',
  },
  caTitleLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gold,
    opacity: 0.2,
  },
  caTable: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  caHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.gold,
  },
  caHeaderCell: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    fontSize: 9,
    fontWeight: '800',
    color: '#1A0A00',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  caRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(124,58,237,0.12)',
  },
  caRowAlt: {
    backgroundColor: 'rgba(124,58,237,0.04)',
  },
  caCellName: {
    flex: 1.2,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  caCellValue: {
    flex: 0.8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  caCellNormal: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 10,
    color: COLORS.muted,
  },
  statusBadge: {
    flex: 0.8,
    marginRight: 8,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 100,
    alignItems: 'center',
  },
  statusBadgeGood: {
    backgroundColor: 'rgba(34,197,94,0.18)',
  },
  statusBadgeWarn: {
    backgroundColor: 'rgba(249,115,22,0.18)',
  },
  statusBadgeBad: {
    backgroundColor: 'rgba(239,68,68,0.18)',
  },
  statusBadgeText: {
    fontSize: 8,
    fontWeight: '700',
  },
  bottomBtns: {
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 10,
  },
  btnNew: {
    flex: 1,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.4)',
    borderRadius: 11,
    alignItems: 'center',
  },
  btnNewText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.pink,
  },
  btnExport: {
    flex: 1,
    paddingVertical: 13,
    backgroundColor: COLORS.gold,
    borderRadius: 11,
    alignItems: 'center',
  },
  btnExportText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A0A00',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.25)',
    borderRadius: 18,
    width: '100%',
    maxWidth: 390,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.gold2,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    padding: 13,
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 16,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  mBtnOut: {
    flex: 1,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    alignItems: 'center',
  },
  mBtnOutText: {
    color: COLORS.muted,
    fontSize: 14,
  },
  mBtnFill: {
    flex: 1,
    paddingVertical: 11,
    backgroundColor: COLORS.gold,
    borderRadius: 9,
    alignItems: 'center',
  },
  mBtnFillText: {
    color: '#1A0A00',
    fontSize: 14,
    fontWeight: '800',
  },
});
