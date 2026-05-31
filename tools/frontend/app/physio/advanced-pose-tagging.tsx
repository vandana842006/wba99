import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  StatusBar,
  PanResponder,
  Animated,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as VideoThumbnails from 'expo-video-thumbnails';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import Svg, { Line, Circle, Text as SvgText, G, Rect, Path, Polygon } from 'react-native-svg';
import { PaymentGateModal } from '../../src/utils/PaymentGateModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Professional Medical Colors
const COLORS = {
  background: '#0A0E1A',
  card: '#141B2D',
  cardLight: '#1A2540',
  accent: '#00BCD4',
  gold: '#FFD700',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  line: '#00E676',
  lineSecondary: '#4ECDC4',
  landmark: '#FF6B6B',
  text: '#FFFFFF',
  textMuted: '#8BA5B5',
  textDim: '#5A6A7A',
  // Body part colors
  head: '#FF6B6B',
  shoulder: '#4ECDC4',
  hip: '#45B7D1',
  knee: '#96CEB4',
  ankle: '#FFEAA7',
  spine: '#DDA0DD',
};

// View types
type ViewType = 'anterior' | 'lateral_left' | 'lateral_right' | 'posterior';
type AnalysisMode = 'tagging' | 'analysis' | 'rotation' | 'com';

// Enhanced anatomical landmarks for each view
const LANDMARKS: Record<ViewType, Array<{id: string; name: string; shortName: string; x: number; y: number; color: string; category: string}>> = {
  anterior: [
    { id: 'head', name: 'Head Center', shortName: 'Head', x: 0.5, y: 0.08, color: COLORS.head, category: 'head' },
    { id: 'tragus_r', name: 'R. Tragus', shortName: 'R.Ear', x: 0.38, y: 0.10, color: COLORS.head, category: 'head' },
    { id: 'tragus_l', name: 'L. Tragus', shortName: 'L.Ear', x: 0.62, y: 0.10, color: COLORS.head, category: 'head' },
    { id: 'acromion_r', name: 'R. Acromion', shortName: 'R.Sh', x: 0.28, y: 0.20, color: COLORS.shoulder, category: 'shoulder' },
    { id: 'acromion_l', name: 'L. Acromion', shortName: 'L.Sh', x: 0.72, y: 0.20, color: COLORS.shoulder, category: 'shoulder' },
    { id: 'asis_r', name: 'R. ASIS', shortName: 'R.ASIS', x: 0.38, y: 0.45, color: COLORS.hip, category: 'hip' },
    { id: 'asis_l', name: 'L. ASIS', shortName: 'L.ASIS', x: 0.62, y: 0.45, color: COLORS.hip, category: 'hip' },
    { id: 'patella_r', name: 'R. Patella', shortName: 'R.Knee', x: 0.40, y: 0.65, color: COLORS.knee, category: 'knee' },
    { id: 'patella_l', name: 'L. Patella', shortName: 'L.Knee', x: 0.60, y: 0.65, color: COLORS.knee, category: 'knee' },
    { id: 'ankle_r', name: 'R. Malleolus', shortName: 'R.Ank', x: 0.42, y: 0.90, color: COLORS.ankle, category: 'ankle' },
    { id: 'ankle_l', name: 'L. Malleolus', shortName: 'L.Ank', x: 0.58, y: 0.90, color: COLORS.ankle, category: 'ankle' },
  ],
  lateral_left: [
    { id: 'tragus', name: 'Tragus', shortName: 'Tragus', x: 0.48, y: 0.10, color: COLORS.head, category: 'head' },
    { id: 'c7', name: 'C7 Vertebra', shortName: 'C7', x: 0.42, y: 0.18, color: COLORS.spine, category: 'spine' },
    { id: 'acromion', name: 'Acromion', shortName: 'Acrom', x: 0.52, y: 0.22, color: COLORS.shoulder, category: 'shoulder' },
    { id: 't12', name: 'T12 Vertebra', shortName: 'T12', x: 0.45, y: 0.38, color: COLORS.spine, category: 'spine' },
    { id: 'asis', name: 'ASIS', shortName: 'ASIS', x: 0.55, y: 0.46, color: COLORS.hip, category: 'hip' },
    { id: 'psis', name: 'PSIS', shortName: 'PSIS', x: 0.42, y: 0.46, color: COLORS.hip, category: 'hip' },
    { id: 'trochanter', name: 'Gr. Trochanter', shortName: 'Gr.Troch', x: 0.50, y: 0.50, color: COLORS.hip, category: 'hip' },
    { id: 'knee', name: 'Knee Joint', shortName: 'Knee', x: 0.48, y: 0.68, color: COLORS.knee, category: 'knee' },
    { id: 'ankle', name: 'Lateral Malleolus', shortName: 'Ankle', x: 0.50, y: 0.92, color: COLORS.ankle, category: 'ankle' },
  ],
  lateral_right: [
    { id: 'tragus', name: 'Tragus', shortName: 'Tragus', x: 0.52, y: 0.10, color: COLORS.head, category: 'head' },
    { id: 'c7', name: 'C7 Vertebra', shortName: 'C7', x: 0.58, y: 0.18, color: COLORS.spine, category: 'spine' },
    { id: 'acromion', name: 'Acromion', shortName: 'Acrom', x: 0.48, y: 0.22, color: COLORS.shoulder, category: 'shoulder' },
    { id: 't12', name: 'T12 Vertebra', shortName: 'T12', x: 0.55, y: 0.38, color: COLORS.spine, category: 'spine' },
    { id: 'asis', name: 'ASIS', shortName: 'ASIS', x: 0.45, y: 0.46, color: COLORS.hip, category: 'hip' },
    { id: 'psis', name: 'PSIS', shortName: 'PSIS', x: 0.58, y: 0.46, color: COLORS.hip, category: 'hip' },
    { id: 'trochanter', name: 'Gr. Trochanter', shortName: 'Gr.Troch', x: 0.50, y: 0.50, color: COLORS.hip, category: 'hip' },
    { id: 'knee', name: 'Knee Joint', shortName: 'Knee', x: 0.52, y: 0.68, color: COLORS.knee, category: 'knee' },
    { id: 'ankle', name: 'Lateral Malleolus', shortName: 'Ankle', x: 0.50, y: 0.92, color: COLORS.ankle, category: 'ankle' },
  ],
  posterior: [
    { id: 'head', name: 'Head', shortName: 'Head', x: 0.50, y: 0.08, color: COLORS.head, category: 'head' },
    { id: 'c7', name: 'C7 Spinous', shortName: 'C7', x: 0.50, y: 0.16, color: COLORS.spine, category: 'spine' },
    { id: 'scapula_r', name: 'R. Inf. Scapula', shortName: 'R.Scap', x: 0.35, y: 0.26, color: COLORS.shoulder, category: 'shoulder' },
    { id: 'scapula_l', name: 'L. Inf. Scapula', shortName: 'L.Scap', x: 0.65, y: 0.26, color: COLORS.shoulder, category: 'shoulder' },
    { id: 't12', name: 'T12', shortName: 'T12', x: 0.50, y: 0.38, color: COLORS.spine, category: 'spine' },
    { id: 'psis_r', name: 'R. PSIS', shortName: 'R.PSIS', x: 0.42, y: 0.46, color: COLORS.hip, category: 'hip' },
    { id: 'psis_l', name: 'L. PSIS', shortName: 'L.PSIS', x: 0.58, y: 0.46, color: COLORS.hip, category: 'hip' },
    { id: 'knee_r', name: 'R. Popliteal', shortName: 'R.Knee', x: 0.40, y: 0.68, color: COLORS.knee, category: 'knee' },
    { id: 'knee_l', name: 'L. Popliteal', shortName: 'L.Knee', x: 0.60, y: 0.68, color: COLORS.knee, category: 'knee' },
    { id: 'heel_r', name: 'R. Calcaneus', shortName: 'R.Heel', x: 0.42, y: 0.92, color: COLORS.ankle, category: 'ankle' },
    { id: 'heel_l', name: 'L. Calcaneus', shortName: 'L.Heel', x: 0.58, y: 0.92, color: COLORS.ankle, category: 'ankle' },
  ],
};

// Connecting lines for each view
const CONNECTIONS: Record<ViewType, Array<{from: string; to: string; type: 'measurement' | 'plumb' | 'reference'}>> = {
  anterior: [
    { from: 'tragus_r', to: 'tragus_l', type: 'measurement' },
    { from: 'acromion_r', to: 'acromion_l', type: 'measurement' },
    { from: 'asis_r', to: 'asis_l', type: 'measurement' },
    { from: 'patella_r', to: 'patella_l', type: 'measurement' },
    { from: 'ankle_r', to: 'ankle_l', type: 'measurement' },
    { from: 'head', to: 'asis_r', type: 'reference' },
    { from: 'head', to: 'asis_l', type: 'reference' },
  ],
  lateral_left: [
    { from: 'tragus', to: 'c7', type: 'measurement' },
    { from: 'c7', to: 'acromion', type: 'reference' },
    { from: 'c7', to: 't12', type: 'measurement' },
    { from: 't12', to: 'trochanter', type: 'measurement' },
    { from: 'asis', to: 'psis', type: 'measurement' },
    { from: 'trochanter', to: 'knee', type: 'measurement' },
    { from: 'knee', to: 'ankle', type: 'measurement' },
    { from: 'tragus', to: 'ankle', type: 'plumb' },
  ],
  lateral_right: [
    { from: 'tragus', to: 'c7', type: 'measurement' },
    { from: 'c7', to: 'acromion', type: 'reference' },
    { from: 'c7', to: 't12', type: 'measurement' },
    { from: 't12', to: 'trochanter', type: 'measurement' },
    { from: 'asis', to: 'psis', type: 'measurement' },
    { from: 'trochanter', to: 'knee', type: 'measurement' },
    { from: 'knee', to: 'ankle', type: 'measurement' },
    { from: 'tragus', to: 'ankle', type: 'plumb' },
  ],
  posterior: [
    { from: 'head', to: 'c7', type: 'measurement' },
    { from: 'c7', to: 't12', type: 'measurement' },
    { from: 'scapula_r', to: 'scapula_l', type: 'measurement' },
    { from: 't12', to: 'psis_r', type: 'reference' },
    { from: 't12', to: 'psis_l', type: 'reference' },
    { from: 'psis_r', to: 'psis_l', type: 'measurement' },
    { from: 'knee_r', to: 'knee_l', type: 'measurement' },
    { from: 'heel_r', to: 'heel_l', type: 'measurement' },
  ],
};

// Calculate angle between two points relative to vertical
const calculateAngle = (p1: {x: number; y: number}, p2: {x: number; y: number}): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const angle = Math.atan2(dx, -dy) * (180 / Math.PI);
  return Math.round(angle * 10) / 10;
};

// Calculate CVA (Craniovertebral Angle) for lateral view
const calculateCVA = (tragus: {x: number; y: number}, c7: {x: number; y: number}): number => {
  const dx = tragus.x - c7.x;
  const dy = c7.y - tragus.y;
  const angle = Math.atan2(dx, dy) * (180 / Math.PI);
  return Math.round((90 - Math.abs(angle)) * 10) / 10;
};

// Calculate forward displacement in cm (normalized)
const calculateForwardDisplacement = (point: {x: number; y: number}, reference: {x: number; y: number}, scale: number = 100): number => {
  const displacement = (point.x - reference.x) * scale;
  return Math.round(displacement * 10) / 10;
};

// Get alignment status based on angle
const getAlignmentStatus = (angle: number, threshold: number = 3): { status: string; color: string } => {
  const absAngle = Math.abs(angle);
  if (absAngle <= threshold) return { status: 'Aligned', color: COLORS.success };
  if (absAngle <= threshold * 2) return { status: 'Mild', color: COLORS.warning };
  return { status: 'Significant', color: COLORS.error };
};

// Draggable landmark component
interface DraggableLandmarkProps {
  landmark: {id: string; name: string; shortName: string; x: number; y: number; color: string; category: string};
  position: {x: number; y: number};
  imageWidth: number;
  imageHeight: number;
  onPositionChange: (id: string, x: number, y: number) => void;
  selected: boolean;
  onSelect: (id: string) => void;
  showLabels: boolean;
}

const DraggableLandmark: React.FC<DraggableLandmarkProps> = ({
  landmark, position, imageWidth, imageHeight, onPositionChange, selected, onSelect, showLabels
}) => {
  const pan = useRef(new Animated.ValueXY({
    x: position.x * imageWidth - 12,
    y: position.y * imageHeight - 12,
  })).current;

  useEffect(() => {
    pan.setValue({
      x: position.x * imageWidth - 12,
      y: position.y * imageHeight - 12,
    });
  }, [position, imageWidth, imageHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        onSelect(landmark.id);
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        const newX = Math.max(0, Math.min((pan.x as any)._value + 12, imageWidth)) / imageWidth;
        const newY = Math.max(0, Math.min((pan.y as any)._value + 12, imageHeight)) / imageHeight;
        onPositionChange(landmark.id, newX, newY);
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.landmark,
        {
          transform: pan.getTranslateTransform(),
          borderColor: selected ? COLORS.gold : landmark.color,
          backgroundColor: selected ? COLORS.gold + '40' : landmark.color + '30',
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={[styles.landmarkInner, { backgroundColor: landmark.color }]} />
      {showLabels && (
        <View style={[styles.landmarkLabel, { backgroundColor: landmark.color }]}>
          <Text style={styles.landmarkLabelText}>{landmark.shortName}</Text>
        </View>
      )}
    </Animated.View>
  );
};

// Rotation Dial Component
interface RotationDialProps {
  label: string;
  value: number;
  color: string;
  size?: number;
}

const RotationDial: React.FC<RotationDialProps> = ({ label, value, color, size = 60 }) => {
  const rotation = value;
  const radius = size / 2 - 5;
  const center = size / 2;
  
  // Calculate the endpoint of the indicator line
  const angle = (rotation * Math.PI) / 180;
  const x2 = center + Math.sin(angle) * (radius - 5);
  const y2 = center - Math.cos(angle) * (radius - 5);

  return (
    <View style={[styles.dialContainer, { width: size + 40, height: size + 25 }]}>
      <Svg width={size} height={size} style={styles.dialSvg}>
        {/* Background circle */}
        <Circle cx={center} cy={center} r={radius} fill={COLORS.cardLight} stroke={COLORS.textDim} strokeWidth={1} />
        
        {/* Quadrant markers */}
        <Line x1={center} y1={5} x2={center} y2={15} stroke={COLORS.textMuted} strokeWidth={1} />
        <Line x1={size - 5} y1={center} x2={size - 15} y2={center} stroke={COLORS.textMuted} strokeWidth={1} />
        <Line x1={center} y1={size - 5} x2={center} y2={size - 15} stroke={COLORS.textMuted} strokeWidth={1} />
        <Line x1={5} y1={center} x2={15} y2={center} stroke={COLORS.textMuted} strokeWidth={1} />
        
        {/* L, R, F, B labels */}
        <SvgText x={center} y={12} fontSize={8} fill={COLORS.textMuted} textAnchor="middle">F</SvgText>
        <SvgText x={size - 8} y={center + 3} fontSize={8} fill={COLORS.textMuted} textAnchor="middle">R</SvgText>
        <SvgText x={center} y={size - 5} fontSize={8} fill={COLORS.textMuted} textAnchor="middle">B</SvgText>
        <SvgText x={8} y={center + 3} fontSize={8} fill={COLORS.textMuted} textAnchor="middle">L</SvgText>
        
        {/* Indicator line */}
        <Line x1={center} y1={center} x2={x2} y2={y2} stroke={color} strokeWidth={3} />
        
        {/* Center dot */}
        <Circle cx={center} cy={center} r={4} fill={color} />
      </Svg>
      <Text style={styles.dialLabel}>{label}</Text>
      <Text style={[styles.dialValue, { color }]}>{Math.abs(value).toFixed(1)}{value < 0 ? 'L' : value > 0 ? 'R' : ''}</Text>
    </View>
  );
};

// Center of Mass Diagram Component
interface CenterOfMassProps {
  x: number; // -1 to 1 (left to right)
  y: number; // -1 to 1 (back to front)
  size?: number;
}

const CenterOfMassDiagram: React.FC<CenterOfMassProps> = ({ x, y, size = 120 }) => {
  const center = size / 2;
  const dotX = center + (x * (size / 2 - 10));
  const dotY = center - (y * (size / 2 - 10));

  return (
    <View style={[styles.comContainer, { width: size, height: size + 40 }]}>
      <Text style={styles.comTitle}>Center of Mass</Text>
      <Svg width={size} height={size}>
        {/* Background quadrants */}
        <Rect x={0} y={0} width={center} height={center} fill="#1A2540" stroke={COLORS.textDim} strokeWidth={0.5} />
        <Rect x={center} y={0} width={center} height={center} fill="#1A2540" stroke={COLORS.textDim} strokeWidth={0.5} />
        <Rect x={0} y={center} width={center} height={center} fill="#152030" stroke={COLORS.textDim} strokeWidth={0.5} />
        <Rect x={center} y={center} width={center} height={center} fill="#152030" stroke={COLORS.textDim} strokeWidth={0.5} />
        
        {/* Grid lines */}
        <Line x1={center} y1={0} x2={center} y2={size} stroke={COLORS.accent} strokeWidth={1} strokeDasharray="3,3" />
        <Line x1={0} y1={center} x2={size} y2={center} stroke={COLORS.accent} strokeWidth={1} strokeDasharray="3,3" />
        
        {/* Labels */}
        <SvgText x={center / 2} y={12} fontSize={8} fill={COLORS.textMuted} textAnchor="middle">Left Front</SvgText>
        <SvgText x={center + center / 2} y={12} fontSize={8} fill={COLORS.textMuted} textAnchor="middle">Right Front</SvgText>
        <SvgText x={center / 2} y={size - 5} fontSize={8} fill={COLORS.textMuted} textAnchor="middle">Left Back</SvgText>
        <SvgText x={center + center / 2} y={size - 5} fontSize={8} fill={COLORS.textMuted} textAnchor="middle">Right Back</SvgText>
        
        {/* Center point marker */}
        <Circle cx={dotX} cy={dotY} r={8} fill={COLORS.accent} />
        <Circle cx={dotX} cy={dotY} r={4} fill="#fff" />
      </Svg>
      <View style={styles.comValues}>
        <Text style={styles.comValueText}>{Math.abs(x * 5).toFixed(1)} cm {x < 0 ? 'Left' : x > 0 ? 'Right' : ''}</Text>
        <Text style={styles.comValueText}>{Math.abs(y * 3).toFixed(1)} cm {y > 0 ? 'Front' : y < 0 ? 'Back' : ''}</Text>
      </View>
    </View>
  );
};

// Measurement Row Component
interface MeasurementRowProps {
  icon: string;
  label: string;
  angle: number;
  displacement: string;
  color: string;
}

const MeasurementRow: React.FC<MeasurementRowProps> = ({ icon, label, angle, displacement, color }) => {
  const status = getAlignmentStatus(angle);
  const progress = Math.max(10, 100 - Math.abs(angle) * 10);
  
  return (
    <View style={styles.measurementRow}>
      <View style={styles.measurementMember}>
        <Text style={styles.measurementIcon}>{icon}</Text>
        <Text style={styles.measurementLabel}>{label}</Text>
      </View>
      <View style={styles.measurementAlignment}>
        <Text style={[styles.measurementStatus, { color: status.color }]}>
          {status.status} {Math.abs(angle).toFixed(1)}
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: status.color }]} />
        </View>
      </View>
      <Text style={[styles.measurementValue, { color }]}>{displacement}</Text>
    </View>
  );
};

// Main component
export default function AdvancedPoseTaggingScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  const [currentView, setCurrentView] = useState<ViewType>('lateral_left');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('tagging');
  const [images, setImages] = useState<Record<ViewType, string | null>>({
    anterior: null,
    lateral_left: null,
    lateral_right: null,
    posterior: null,
  });
  const [landmarks, setLandmarks] = useState<Record<ViewType, Record<string, {x: number; y: number}>>>({
    anterior: {},
    lateral_left: {},
    lateral_right: {},
    posterior: {},
  });
  const [selectedLandmark, setSelectedLandmark] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showPlumbLine, setShowPlumbLine] = useState(true);
  const [showConnections, setShowConnections] = useState(true);
  const [showAnalysisReport, setShowAnalysisReport] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [videoFrames, setVideoFrames] = useState<string[]>([]);
  const [showFrameSelector, setShowFrameSelector] = useState(false);
  const [patientName, setPatientName] = useState('Patient');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [aiDetectionPercent, setAiDetectionPercent] = useState(94);

  const imageHeight = SCREEN_HEIGHT - 350;

  // Initialize landmarks with default positions
  useEffect(() => {
    const initLandmarks: Record<ViewType, Record<string, {x: number; y: number}>> = {
      anterior: {},
      lateral_left: {},
      lateral_right: {},
      posterior: {},
    };
    
    Object.entries(LANDMARKS).forEach(([view, viewLandmarks]) => {
      viewLandmarks.forEach(l => {
        initLandmarks[view as ViewType][l.id] = { x: l.x, y: l.y };
      });
    });
    
    setLandmarks(initLandmarks);
  }, []);

  // Calculate all metrics
  const calculateMetrics = useCallback(() => {
    const metrics: any = {
      anterior: {
        headTilt: 0, headDisplacement: 0,
        shoulderTilt: 0, shoulderDisplacement: 0,
        pelvicTilt: 0, pelvicDisplacement: 0,
        kneeTilt: 0, kneeDisplacement: 0,
        ankleTilt: 0,
      },
      lateral_left: { cva: 50, headForward: 0, shoulderForward: 0, hipForward: 0, kneeForward: 0 },
      lateral_right: { cva: 50, headForward: 0, shoulderForward: 0, hipForward: 0, kneeForward: 0 },
      posterior: { headTilt: 0, scapulaTilt: 0, psisTilt: 0, kneeTilt: 0, heelTilt: 0 },
      rotation: { head: 0, shoulder: 0, hip: 0, knee: 0, ankle: 0 },
      centerOfMass: { x: 0, y: 0 },
    };

    // Anterior view metrics
    if (landmarks.anterior.tragus_r && landmarks.anterior.tragus_l) {
      metrics.anterior.headTilt = calculateAngle(landmarks.anterior.tragus_r, landmarks.anterior.tragus_l);
      metrics.anterior.headDisplacement = ((landmarks.anterior.tragus_r.y - landmarks.anterior.tragus_l.y) * 10).toFixed(1);
    }
    if (landmarks.anterior.acromion_r && landmarks.anterior.acromion_l) {
      metrics.anterior.shoulderTilt = calculateAngle(landmarks.anterior.acromion_r, landmarks.anterior.acromion_l);
      metrics.anterior.shoulderDisplacement = ((landmarks.anterior.acromion_r.y - landmarks.anterior.acromion_l.y) * 10).toFixed(1);
    }
    if (landmarks.anterior.asis_r && landmarks.anterior.asis_l) {
      metrics.anterior.pelvicTilt = calculateAngle(landmarks.anterior.asis_r, landmarks.anterior.asis_l);
      metrics.anterior.pelvicDisplacement = ((landmarks.anterior.asis_r.y - landmarks.anterior.asis_l.y) * 10).toFixed(1);
    }
    if (landmarks.anterior.patella_r && landmarks.anterior.patella_l) {
      metrics.anterior.kneeTilt = calculateAngle(landmarks.anterior.patella_r, landmarks.anterior.patella_l);
    }

    // Lateral view metrics (CVA and forward displacement)
    if (landmarks.lateral_left.tragus && landmarks.lateral_left.c7) {
      metrics.lateral_left.cva = calculateCVA(landmarks.lateral_left.tragus, landmarks.lateral_left.c7);
    }
    if (landmarks.lateral_left.tragus && landmarks.lateral_left.ankle) {
      metrics.lateral_left.headForward = calculateForwardDisplacement(landmarks.lateral_left.tragus, landmarks.lateral_left.ankle);
    }
    if (landmarks.lateral_left.acromion && landmarks.lateral_left.ankle) {
      metrics.lateral_left.shoulderForward = calculateForwardDisplacement(landmarks.lateral_left.acromion, landmarks.lateral_left.ankle);
    }
    if (landmarks.lateral_left.trochanter && landmarks.lateral_left.ankle) {
      metrics.lateral_left.hipForward = calculateForwardDisplacement(landmarks.lateral_left.trochanter, landmarks.lateral_left.ankle);
    }

    if (landmarks.lateral_right.tragus && landmarks.lateral_right.c7) {
      metrics.lateral_right.cva = calculateCVA(landmarks.lateral_right.tragus, landmarks.lateral_right.c7);
    }

    // Posterior view metrics
    if (landmarks.posterior.scapula_r && landmarks.posterior.scapula_l) {
      metrics.posterior.scapulaTilt = calculateAngle(landmarks.posterior.scapula_r, landmarks.posterior.scapula_l);
    }
    if (landmarks.posterior.psis_r && landmarks.posterior.psis_l) {
      metrics.posterior.psisTilt = calculateAngle(landmarks.posterior.psis_r, landmarks.posterior.psis_l);
    }

    // Calculate rotation values (simulated based on landmark positions)
    metrics.rotation.head = metrics.anterior.headTilt * 1.2;
    metrics.rotation.shoulder = metrics.anterior.shoulderTilt * 0.8;
    metrics.rotation.hip = metrics.anterior.pelvicTilt * 0.6;
    metrics.rotation.knee = metrics.anterior.kneeTilt * 0.4;
    
    // Calculate center of mass
    const avgX = (metrics.lateral_left.headForward + metrics.lateral_left.shoulderForward + metrics.lateral_left.hipForward) / 30;
    const avgY = (metrics.anterior.shoulderTilt + metrics.anterior.pelvicTilt) / 20;
    metrics.centerOfMass = { x: avgX, y: avgY };

    return metrics;
  }, [landmarks]);

  const metrics = calculateMetrics();

  // Pick image or video
  const pickMedia = async () => {
    Alert.alert(
      'Select Media',
      'Choose image or video for analysis',
      [
        {
          text: 'Photo',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.9,
            });
            if (!result.canceled) {
              setImages(prev => ({ ...prev, [currentView]: result.assets[0].uri }));
            }
          },
        },
        {
          text: 'Video',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Videos,
              quality: 0.9,
            });
            if (!result.canceled) {
              await extractVideoFrames(result.assets[0].uri);
            }
          },
        },
        {
          text: 'Camera',
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (permission.granted) {
              const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
              if (!result.canceled) {
                setImages(prev => ({ ...prev, [currentView]: result.assets[0].uri }));
              }
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Extract frames from video
  const extractVideoFrames = async (videoUri: string) => {
    try {
      const frames: string[] = [];
      for (let i = 0; i < 10; i++) {
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
            time: i * 500,
            quality: 0.8,
          });
          frames.push(uri);
        } catch (e) {
          console.log('Frame error:', e);
        }
      }
      if (frames.length > 0) {
        setVideoFrames(frames);
        setShowFrameSelector(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to extract frames');
    }
  };

  // Update landmark position
  const updateLandmarkPosition = (id: string, x: number, y: number) => {
    setLandmarks(prev => ({
      ...prev,
      [currentView]: { ...prev[currentView], [id]: { x, y } },
    }));
  };

  // Render connecting lines and angle displays using SVG
  const renderOverlay = () => {
    const currentLandmarks = landmarks[currentView];
    const currentConnections = CONNECTIONS[currentView];
    const viewLandmarks = LANDMARKS[currentView];

    return (
      <Svg style={StyleSheet.absoluteFill} width={SCREEN_WIDTH} height={imageHeight}>
        {/* Grid */}
        {showGrid && (
          <G>
            {Array.from({ length: 20 }).map((_, i) => (
              <Line
                key={`h-${i}`}
                x1={0}
                y1={(i * imageHeight) / 20}
                x2={SCREEN_WIDTH}
                y2={(i * imageHeight) / 20}
                stroke="#1A3A5C"
                strokeWidth={0.5}
              />
            ))}
            {Array.from({ length: 15 }).map((_, i) => (
              <Line
                key={`v-${i}`}
                x1={(i * SCREEN_WIDTH) / 15}
                y1={0}
                x2={(i * SCREEN_WIDTH) / 15}
                y2={imageHeight}
                stroke="#1A3A5C"
                strokeWidth={0.5}
              />
            ))}
            {/* Center plumb line */}
            <Line
              x1={SCREEN_WIDTH / 2}
              y1={0}
              x2={SCREEN_WIDTH / 2}
              y2={imageHeight}
              stroke={COLORS.accent}
              strokeWidth={1}
              strokeDasharray="5,5"
            />
          </G>
        )}

        {/* Plumb line for lateral views */}
        {showPlumbLine && (currentView === 'lateral_left' || currentView === 'lateral_right') && currentLandmarks.ankle && (
          <G>
            <Line
              x1={currentLandmarks.ankle.x * SCREEN_WIDTH}
              y1={0}
              x2={currentLandmarks.ankle.x * SCREEN_WIDTH}
              y2={imageHeight}
              stroke={COLORS.line}
              strokeWidth={2}
              strokeDasharray="10,5"
            />
            {/* Plumb line label */}
            <Rect
              x={currentLandmarks.ankle.x * SCREEN_WIDTH - 40}
              y={5}
              width={80}
              height={20}
              fill={COLORS.card}
              rx={4}
            />
            <SvgText
              x={currentLandmarks.ankle.x * SCREEN_WIDTH}
              y={19}
              fontSize={10}
              fill={COLORS.line}
              textAnchor="middle"
            >
              Plumb Line
            </SvgText>
          </G>
        )}

        {/* Connecting lines */}
        {showConnections && currentConnections.map((conn, index) => {
          const p1 = currentLandmarks[conn.from];
          const p2 = currentLandmarks[conn.to];
          if (!p1 || !p2) return null;
          
          const lineColor = conn.type === 'plumb' ? COLORS.gold : 
                           conn.type === 'measurement' ? COLORS.line : 
                           COLORS.lineSecondary;
          const lineWidth = conn.type === 'plumb' ? 2.5 : 2;
          const dashArray = conn.type === 'reference' ? '5,3' : 'none';
          
          return (
            <G key={`line-${index}`}>
              <Line
                x1={p1.x * SCREEN_WIDTH}
                y1={p1.y * imageHeight}
                x2={p2.x * SCREEN_WIDTH}
                y2={p2.y * imageHeight}
                stroke={lineColor}
                strokeWidth={lineWidth}
                strokeDasharray={dashArray}
              />
              {/* Angle label for measurement lines */}
              {conn.type === 'measurement' && (
                <G>
                  <Rect
                    x={(p1.x + p2.x) / 2 * SCREEN_WIDTH - 20}
                    y={(p1.y + p2.y) / 2 * imageHeight - 10}
                    width={40}
                    height={18}
                    fill={COLORS.card + 'E0'}
                    rx={4}
                  />
                  <SvgText
                    x={(p1.x + p2.x) / 2 * SCREEN_WIDTH}
                    y={(p1.y + p2.y) / 2 * imageHeight + 3}
                    fontSize={10}
                    fontWeight="bold"
                    fill={lineColor}
                    textAnchor="middle"
                  >
                    {Math.abs(calculateAngle(p1, p2)).toFixed(1)}
                  </SvgText>
                </G>
              )}
            </G>
          );
        })}

        {/* CVA angle display for lateral views */}
        {(currentView === 'lateral_left' || currentView === 'lateral_right') && 
         currentLandmarks.tragus && currentLandmarks.c7 && (
          <G>
            {/* CVA angle arc */}
            <Rect
              x={10}
              y={10}
              width={90}
              height={50}
              fill={COLORS.card}
              rx={8}
              stroke={COLORS.warning}
              strokeWidth={1}
            />
            <SvgText x={55} y={28} fontSize={10} fill={COLORS.textMuted} textAnchor="middle">CVA</SvgText>
            <SvgText
              x={55}
              y={48}
              fontSize={18}
              fontWeight="bold"
              fill={metrics[currentView]?.cva > 45 ? COLORS.success : COLORS.warning}
              textAnchor="middle"
            >
              {metrics[currentView]?.cva || 0}
            </SvgText>
          </G>
        )}

        {/* Frontal view angle displays */}
        {currentView === 'anterior' && (
          <G>
            <Rect x={10} y={10} width={100} height={70} fill={COLORS.card} rx={8} stroke={COLORS.accent} strokeWidth={1} />
            <SvgText x={60} y={28} fontSize={10} fill={COLORS.textMuted} textAnchor="middle">Frontal View</SvgText>
            <SvgText x={60} y={45} fontSize={11} fill={COLORS.head} textAnchor="middle">Head: {metrics.anterior.headTilt.toFixed(1)}</SvgText>
            <SvgText x={60} y={60} fontSize={11} fill={COLORS.shoulder} textAnchor="middle">Sh: {metrics.anterior.shoulderTilt.toFixed(1)}</SvgText>
            <SvgText x={60} y={75} fontSize={11} fill={COLORS.hip} textAnchor="middle">Hip: {metrics.anterior.pelvicTilt.toFixed(1)}</SvgText>
          </G>
        )}
      </Svg>
    );
  };

  // Show payment modal before generating report
  const handleGenerateReport = () => {
    setShowPaymentModal(true);
  };

  // Generate comprehensive PDF report after payment confirmed
  const generateReport = async () => {
    setShowPaymentModal(false);
    setGenerating(true);
    try {
      const date = new Date().toLocaleDateString('en-IN', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      const allMetrics = calculateMetrics();
      const reportId = `WBA99-${Date.now().toString(36).toUpperCase()}`;

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #0A0E1A; color: #fff; padding: 20px; }
    .header { text-align: center; border-bottom: 3px solid #00BCD4; padding-bottom: 20px; margin-bottom: 20px; }
    .logo { color: #FFD700; font-size: 32px; font-weight: bold; letter-spacing: 3px; }
    .subtitle { color: #00BCD4; font-size: 18px; margin-top: 5px; font-weight: 600; }
    .report-info { color: #8BA5B5; font-size: 12px; margin-top: 10px; }
    
    .patient-info { background: #141B2D; padding: 15px; border-radius: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; }
    .patient-info-left, .patient-info-right { flex: 1; }
    .patient-info h3 { color: #00BCD4; margin-bottom: 10px; font-size: 14px; }
    .patient-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
    .patient-label { color: #8BA5B5; font-size: 12px; }
    .patient-value { color: #fff; font-weight: bold; font-size: 12px; }
    
    .summary-badges { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; justify-content: center; }
    .badge { padding: 10px 18px; border-radius: 25px; font-size: 13px; font-weight: bold; }
    .badge-green { background: #4CAF5020; color: #4CAF50; border: 2px solid #4CAF50; }
    .badge-yellow { background: #FF980020; color: #FF9800; border: 2px solid #FF9800; }
    .badge-red { background: #F4433620; color: #F44336; border: 2px solid #F44336; }
    
    .section { background: #141B2D; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
    .section-title { color: #00BCD4; font-size: 14px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid #1A3A5C; padding-bottom: 10px; }
    
    .assessment-table { width: 100%; border-collapse: collapse; }
    .assessment-table th { background: linear-gradient(135deg, #FFD700, #FFA000); color: #000; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
    .assessment-table td { padding: 12px; border-bottom: 1px solid #1A3A5C; font-size: 12px; }
    .member-cell { display: flex; align-items: center; gap: 10px; }
    .member-icon { font-size: 18px; }
    .alignment-status { font-weight: bold; }
    .progress-bar { height: 8px; background: #1A3A5C; border-radius: 4px; overflow: hidden; margin-top: 5px; width: 100px; }
    .progress-fill { height: 100%; border-radius: 4px; }
    
    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .metric-card { background: #0A0E1A; padding: 15px; border-radius: 10px; text-align: center; border: 1px solid #1A3A5C; }
    .metric-value { font-size: 28px; font-weight: bold; color: #FFD700; }
    .metric-label { font-size: 10px; color: #8BA5B5; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px; }
    .metric-status { font-size: 9px; margin-top: 5px; padding: 3px 8px; border-radius: 10px; display: inline-block; }
    
    .rotation-section { display: flex; justify-content: space-around; flex-wrap: wrap; gap: 15px; padding: 15px 0; }
    .rotation-item { text-align: center; }
    .rotation-dial { width: 60px; height: 60px; border-radius: 50%; border: 2px solid #8BA5B5; background: #1A2540; margin: 0 auto 8px; position: relative; }
    .rotation-label { font-size: 11px; color: #8BA5B5; }
    .rotation-value { font-size: 12px; font-weight: bold; color: #00BCD4; }
    
    .com-section { display: flex; align-items: center; gap: 30px; padding: 15px; }
    .com-diagram { width: 120px; height: 120px; background: #1A2540; border-radius: 8px; position: relative; }
    .com-quadrant { width: 50%; height: 50%; position: absolute; border: 0.5px solid #2A3A5C; }
    .com-quadrant.tl { top: 0; left: 0; }
    .com-quadrant.tr { top: 0; right: 0; }
    .com-quadrant.bl { bottom: 0; left: 0; background: #152030; }
    .com-quadrant.br { bottom: 0; right: 0; background: #152030; }
    .com-dot { width: 16px; height: 16px; background: #00BCD4; border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); border: 3px solid #fff; }
    .com-values { flex: 1; }
    .com-values p { margin: 5px 0; font-size: 14px; color: #8BA5B5; }
    .com-values span { color: #00BCD4; font-weight: bold; }
    
    .recommendations { background: #00BCD410; border: 1px solid #00BCD4; border-radius: 10px; padding: 15px; margin-top: 20px; }
    .recommendations h4 { color: #00BCD4; margin-bottom: 12px; font-size: 14px; }
    .recommendations ul { padding-left: 20px; }
    .recommendations li { color: #8BA5B5; margin-bottom: 8px; font-size: 12px; line-height: 1.5; }
    
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #1A3A5C; }
    .footer-logo { color: #FFD700; font-size: 20px; font-weight: bold; letter-spacing: 3px; }
    .footer-text { color: #8BA5B5; font-size: 10px; margin-top: 5px; }
    .qr-section { margin-top: 15px; display: flex; justify-content: center; align-items: center; gap: 15px; }
    .qr-section img { width: 80px; height: 80px; }
    .verification-text { text-align: left; }
    .verification-text p { font-size: 10px; color: #8BA5B5; margin: 2px 0; }
    .verification-text .report-id { color: #00BCD4; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">WBA99</div>
    <div class="subtitle">Clinical Posture Analysis Report</div>
    <div class="report-info">Generated on ${date} at ${time} | Report ID: ${reportId}</div>
  </div>

  <div class="patient-info">
    <div class="patient-info-left">
      <h3>Patient Information</h3>
      <div class="patient-row">
        <span class="patient-label">Name:</span>
        <span class="patient-value">${patientName || currentUser?.name || 'N/A'}</span>
      </div>
      <div class="patient-row">
        <span class="patient-label">Date:</span>
        <span class="patient-value">${date}</span>
      </div>
    </div>
    <div class="patient-info-right">
      <h3>Assessment Details</h3>
      <div class="patient-row">
        <span class="patient-label">Assessed By:</span>
        <span class="patient-value">${currentUser?.name || 'WBA99 System'}</span>
      </div>
      <div class="patient-row">
        <span class="patient-label">Views Captured:</span>
        <span class="patient-value">${Object.values(images).filter(Boolean).length}/4</span>
      </div>
    </div>
  </div>

  <div class="summary-badges">
    <span class="badge ${Math.abs(allMetrics.anterior?.headTilt || 0) < 3 ? 'badge-green' : Math.abs(allMetrics.anterior?.headTilt || 0) < 6 ? 'badge-yellow' : 'badge-red'}">Head ${(allMetrics.anterior?.headTilt || 0).toFixed(1)}</span>
    <span class="badge ${Math.abs(allMetrics.anterior?.shoulderTilt || 0) < 3 ? 'badge-green' : Math.abs(allMetrics.anterior?.shoulderTilt || 0) < 6 ? 'badge-yellow' : 'badge-red'}">Shoulders ${(allMetrics.anterior?.shoulderTilt || 0).toFixed(1)}</span>
    <span class="badge ${Math.abs(allMetrics.anterior?.pelvicTilt || 0) < 3 ? 'badge-green' : Math.abs(allMetrics.anterior?.pelvicTilt || 0) < 6 ? 'badge-yellow' : 'badge-red'}">Pelvis ${(allMetrics.anterior?.pelvicTilt || 0).toFixed(1)}</span>
    <span class="badge ${(allMetrics.lateral_left?.cva || 50) > 45 ? 'badge-green' : (allMetrics.lateral_left?.cva || 50) > 40 ? 'badge-yellow' : 'badge-red'}">CVA ${(allMetrics.lateral_left?.cva || 0).toFixed(1)}</span>
  </div>

  <div class="section">
    <div class="section-title">Frontal View Assessment</div>
    <table class="assessment-table">
      <thead>
        <tr>
          <th>Body Segment</th>
          <th>Alignment Status</th>
          <th>Deviation</th>
          <th>Displacement</th>
          <th>Clinical Notes</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><div class="member-cell"><span class="member-icon">&#128100;</span>Head</div></td>
          <td>
            <span class="alignment-status" style="color: ${Math.abs(allMetrics.anterior?.headTilt || 0) < 3 ? '#4CAF50' : '#FF9800'}">${Math.abs(allMetrics.anterior?.headTilt || 0) < 3 ? 'Aligned' : 'Tilted'}</span>
            <div class="progress-bar"><div class="progress-fill" style="width: ${100 - Math.abs(allMetrics.anterior?.headTilt || 0) * 10}%; background: linear-gradient(90deg, #4CAF50, #F44336);"></div></div>
          </td>
          <td>${(allMetrics.anterior?.headTilt || 0).toFixed(1)}</td>
          <td>R ${allMetrics.anterior?.headDisplacement || 0} cm</td>
          <td style="color: #8BA5B5; font-size: 11px;">${Math.abs(allMetrics.anterior?.headTilt || 0) < 3 ? 'Within normal limits' : 'Monitor for cervical strain'}</td>
        </tr>
        <tr>
          <td><div class="member-cell"><span class="member-icon">&#129463;</span>Shoulders</div></td>
          <td>
            <span class="alignment-status" style="color: ${Math.abs(allMetrics.anterior?.shoulderTilt || 0) < 3 ? '#4CAF50' : '#FF9800'}">${Math.abs(allMetrics.anterior?.shoulderTilt || 0) < 3 ? 'Level' : 'Elevated'}</span>
            <div class="progress-bar"><div class="progress-fill" style="width: ${100 - Math.abs(allMetrics.anterior?.shoulderTilt || 0) * 10}%; background: linear-gradient(90deg, #4CAF50, #F44336);"></div></div>
          </td>
          <td>${(allMetrics.anterior?.shoulderTilt || 0).toFixed(1)}</td>
          <td>R ${allMetrics.anterior?.shoulderDisplacement || 0} cm</td>
          <td style="color: #8BA5B5; font-size: 11px;">${Math.abs(allMetrics.anterior?.shoulderTilt || 0) < 3 ? 'Symmetrical' : 'Check for muscle imbalance'}</td>
        </tr>
        <tr>
          <td><div class="member-cell"><span class="member-icon">&#129463;</span>Pelvis (ASIS)</div></td>
          <td>
            <span class="alignment-status" style="color: ${Math.abs(allMetrics.anterior?.pelvicTilt || 0) < 3 ? '#4CAF50' : '#FF9800'}">${Math.abs(allMetrics.anterior?.pelvicTilt || 0) < 3 ? 'Neutral' : 'Tilted'}</span>
            <div class="progress-bar"><div class="progress-fill" style="width: ${100 - Math.abs(allMetrics.anterior?.pelvicTilt || 0) * 10}%; background: linear-gradient(90deg, #4CAF50, #F44336);"></div></div>
          </td>
          <td>${(allMetrics.anterior?.pelvicTilt || 0).toFixed(1)}</td>
          <td>R ${allMetrics.anterior?.pelvicDisplacement || 0} cm</td>
          <td style="color: #8BA5B5; font-size: 11px;">${Math.abs(allMetrics.anterior?.pelvicTilt || 0) < 3 ? 'Good pelvic alignment' : 'Assess hip flexor balance'}</td>
        </tr>
        <tr>
          <td><div class="member-cell"><span class="member-icon">&#129461;</span>Knees</div></td>
          <td>
            <span class="alignment-status" style="color: ${Math.abs(allMetrics.anterior?.kneeTilt || 0) < 3 ? '#4CAF50' : '#FF9800'}">${Math.abs(allMetrics.anterior?.kneeTilt || 0) < 3 ? 'Aligned' : 'Asymmetric'}</span>
            <div class="progress-bar"><div class="progress-fill" style="width: ${100 - Math.abs(allMetrics.anterior?.kneeTilt || 0) * 10}%; background: linear-gradient(90deg, #4CAF50, #F44336);"></div></div>
          </td>
          <td>${(allMetrics.anterior?.kneeTilt || 0).toFixed(1)}</td>
          <td>-</td>
          <td style="color: #8BA5B5; font-size: 11px;">${Math.abs(allMetrics.anterior?.kneeTilt || 0) < 3 ? 'Bilateral symmetry' : 'Check leg length'}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Lateral View Metrics</div>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value">${(allMetrics.lateral_left?.cva || 0).toFixed(1)}</div>
        <div class="metric-label">CVA (Left)</div>
        <span class="metric-status" style="background: ${(allMetrics.lateral_left?.cva || 50) > 45 ? '#4CAF5020' : '#F4433620'}; color: ${(allMetrics.lateral_left?.cva || 50) > 45 ? '#4CAF50' : '#F44336'}">
          ${(allMetrics.lateral_left?.cva || 50) > 45 ? 'Normal' : 'Forward Head'}
        </span>
      </div>
      <div class="metric-card">
        <div class="metric-value">${(allMetrics.lateral_left?.headForward || 0).toFixed(1)}</div>
        <div class="metric-label">Head Forward (cm)</div>
        <span class="metric-status" style="background: ${Math.abs(allMetrics.lateral_left?.headForward || 0) < 3 ? '#4CAF5020' : '#FF980020'}; color: ${Math.abs(allMetrics.lateral_left?.headForward || 0) < 3 ? '#4CAF50' : '#FF9800'}">
          ${Math.abs(allMetrics.lateral_left?.headForward || 0) < 3 ? 'Ideal' : 'Protracted'}
        </span>
      </div>
      <div class="metric-card">
        <div class="metric-value">${(allMetrics.lateral_left?.shoulderForward || 0).toFixed(1)}</div>
        <div class="metric-label">Shoulder Fwd (cm)</div>
        <span class="metric-status" style="background: ${Math.abs(allMetrics.lateral_left?.shoulderForward || 0) < 2 ? '#4CAF5020' : '#FF980020'}; color: ${Math.abs(allMetrics.lateral_left?.shoulderForward || 0) < 2 ? '#4CAF50' : '#FF9800'}">
          ${Math.abs(allMetrics.lateral_left?.shoulderForward || 0) < 2 ? 'Aligned' : 'Rounded'}
        </span>
      </div>
      <div class="metric-card">
        <div class="metric-value">${(allMetrics.lateral_left?.hipForward || 0).toFixed(1)}</div>
        <div class="metric-label">Hip Position (cm)</div>
        <span class="metric-status" style="background: ${Math.abs(allMetrics.lateral_left?.hipForward || 0) < 2 ? '#4CAF5020' : '#FF980020'}; color: ${Math.abs(allMetrics.lateral_left?.hipForward || 0) < 2 ? '#4CAF50' : '#FF9800'}">
          ${Math.abs(allMetrics.lateral_left?.hipForward || 0) < 2 ? 'Neutral' : 'Shifted'}
        </span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Rotation Analysis</div>
    <div class="rotation-section">
      <div class="rotation-item">
        <div class="rotation-dial"></div>
        <div class="rotation-label">Head Rotation</div>
        <div class="rotation-value">${(allMetrics.rotation?.head || 0).toFixed(1)}${allMetrics.rotation?.head < 0 ? ' L' : allMetrics.rotation?.head > 0 ? ' R' : ''}</div>
      </div>
      <div class="rotation-item">
        <div class="rotation-dial"></div>
        <div class="rotation-label">Shoulder Rotation</div>
        <div class="rotation-value">${(allMetrics.rotation?.shoulder || 0).toFixed(1)}${allMetrics.rotation?.shoulder < 0 ? ' L' : allMetrics.rotation?.shoulder > 0 ? ' R' : ''}</div>
      </div>
      <div class="rotation-item">
        <div class="rotation-dial"></div>
        <div class="rotation-label">Hip Rotation</div>
        <div class="rotation-value">${(allMetrics.rotation?.hip || 0).toFixed(1)}${allMetrics.rotation?.hip < 0 ? ' L' : allMetrics.rotation?.hip > 0 ? ' R' : ''}</div>
      </div>
      <div class="rotation-item">
        <div class="rotation-dial"></div>
        <div class="rotation-label">Knee Rotation</div>
        <div class="rotation-value">${(allMetrics.rotation?.knee || 0).toFixed(1)}${allMetrics.rotation?.knee < 0 ? ' L' : allMetrics.rotation?.knee > 0 ? ' R' : ''}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Center of Mass Analysis</div>
    <div class="com-section">
      <div class="com-diagram">
        <div class="com-quadrant tl"></div>
        <div class="com-quadrant tr"></div>
        <div class="com-quadrant bl"></div>
        <div class="com-quadrant br"></div>
        <div class="com-dot" style="left: calc(50% + ${(allMetrics.centerOfMass?.x || 0) * 40}px); top: calc(50% - ${(allMetrics.centerOfMass?.y || 0) * 40}px);"></div>
      </div>
      <div class="com-values">
        <p><strong>Medial-Lateral:</strong> <span>${Math.abs((allMetrics.centerOfMass?.x || 0) * 5).toFixed(1)} cm ${(allMetrics.centerOfMass?.x || 0) < 0 ? 'Left' : (allMetrics.centerOfMass?.x || 0) > 0 ? 'Right' : 'Center'}</span></p>
        <p><strong>Anterior-Posterior:</strong> <span>${Math.abs((allMetrics.centerOfMass?.y || 0) * 3).toFixed(1)} cm ${(allMetrics.centerOfMass?.y || 0) > 0 ? 'Forward' : (allMetrics.centerOfMass?.y || 0) < 0 ? 'Backward' : 'Center'}</span></p>
        <p><strong>Balance Status:</strong> <span style="color: ${Math.abs(allMetrics.centerOfMass?.x || 0) < 0.3 && Math.abs(allMetrics.centerOfMass?.y || 0) < 0.3 ? '#4CAF50' : '#FF9800'}">${Math.abs(allMetrics.centerOfMass?.x || 0) < 0.3 && Math.abs(allMetrics.centerOfMass?.y || 0) < 0.3 ? 'Well Balanced' : 'Compensation Pattern Detected'}</span></p>
      </div>
    </div>
  </div>

  <div class="recommendations">
    <h4>Clinical Recommendations</h4>
    <ul>
      ${(allMetrics.lateral_left?.cva || 50) < 45 ? '<li><strong>Forward Head Posture:</strong> Cervical retraction exercises, chin tucks, and upper thoracic extension stretches are recommended. Consider ergonomic workstation assessment.</li>' : ''}
      ${Math.abs(allMetrics.anterior?.shoulderTilt || 0) >= 3 ? '<li><strong>Shoulder Asymmetry:</strong> Evaluate for upper trapezius and levator scapulae imbalance. Consider unilateral strengthening and stretching protocol.</li>' : ''}
      ${Math.abs(allMetrics.anterior?.pelvicTilt || 0) >= 3 ? '<li><strong>Pelvic Tilt:</strong> Assess hip flexor and extensor muscle balance. Core stabilization exercises and hip mobility work recommended.</li>' : ''}
      ${Math.abs(allMetrics.rotation?.shoulder || 0) >= 3 ? '<li><strong>Rotational Pattern:</strong> Address rotational compensation with thoracic mobility exercises and unilateral movement patterns.</li>' : ''}
      <li><strong>General Recommendations:</strong> Regular postural assessment every 4-6 weeks to track progress. Maintain ergonomic workspace setup and incorporate postural breaks during prolonged sitting.</li>
      <li><strong>Follow-up:</strong> Re-assessment recommended in 4-6 weeks to evaluate intervention effectiveness.</li>
    </ul>
  </div>

  <div class="footer">
    <div class="footer-logo">WBA99 MSK ANALYSIS</div>
    <div class="footer-text">Professional Clinical Posture Assessment System</div>
    <div class="qr-section">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://wba99.com/verify/${reportId}" />
      <div class="verification-text">
        <p class="report-id">Report ID: ${reportId}</p>
        <p>Scan QR code to verify authenticity</p>
        <p>Generated: ${date} ${time}</p>
      </div>
    </div>
    <div class="footer-text" style="margin-top: 15px;">&copy; 2026 WBA99 - All Rights Reserved | www.wba99.com</div>
  </div>
</body>
</html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert('Error', 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const currentViewLandmarks = LANDMARKS[currentView];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Advanced Posture Analysis</Text>
          <Text style={styles.headerSubtitle}>
            {currentView === 'anterior' ? 'Frontal View' :
             currentView === 'lateral_left' ? 'Lateral Left' :
             currentView === 'lateral_right' ? 'Lateral Right' : 'Posterior View'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.analyzeBtn}
          onPress={() => setShowAnalysisReport(true)}
        >
          <Text style={styles.analyzeBtnText}>Report</Text>
        </TouchableOpacity>
      </View>

      {/* View Tabs */}
      <View style={styles.viewTabs}>
        {(['anterior', 'lateral_left', 'lateral_right', 'posterior'] as ViewType[]).map((view) => (
          <TouchableOpacity
            key={view}
            style={[styles.viewTab, currentView === view && styles.viewTabActive]}
            onPress={() => setCurrentView(view)}
          >
            <Text style={[styles.viewTabText, currentView === view && styles.viewTabTextActive]}>
              {view === 'anterior' ? 'FRONT' :
               view === 'lateral_left' ? 'LAT-L' :
               view === 'lateral_right' ? 'LAT-R' : 'BACK'}
            </Text>
            {images[view] && <View style={styles.viewTabDot} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Metrics Bar */}
      <View style={styles.quickMetrics}>
        <View style={styles.quickMetricItem}>
          <Text style={[styles.quickMetricValue, { color: Math.abs(metrics.anterior?.headTilt || 0) < 3 ? COLORS.success : COLORS.warning }]}>
            {(metrics.anterior?.headTilt || 0).toFixed(1)}
          </Text>
          <Text style={styles.quickMetricLabel}>Head</Text>
        </View>
        <View style={styles.quickMetricItem}>
          <Text style={[styles.quickMetricValue, { color: Math.abs(metrics.anterior?.shoulderTilt || 0) < 3 ? COLORS.success : COLORS.warning }]}>
            {(metrics.anterior?.shoulderTilt || 0).toFixed(1)}
          </Text>
          <Text style={styles.quickMetricLabel}>Shoulder</Text>
        </View>
        <View style={styles.quickMetricItem}>
          <Text style={[styles.quickMetricValue, { color: Math.abs(metrics.anterior?.pelvicTilt || 0) < 3 ? COLORS.success : COLORS.warning }]}>
            {(metrics.anterior?.pelvicTilt || 0).toFixed(1)}
          </Text>
          <Text style={styles.quickMetricLabel}>Pelvis</Text>
        </View>
        <View style={styles.quickMetricItem}>
          <Text style={[styles.quickMetricValue, { color: (metrics.lateral_left?.cva || 50) > 45 ? COLORS.success : COLORS.warning }]}>
            {(metrics.lateral_left?.cva || 0).toFixed(1)}
          </Text>
          <Text style={styles.quickMetricLabel}>CVA</Text>
        </View>
      </View>

      {/* Image Area */}
      <View style={[styles.imageArea, { height: imageHeight }]}>
        {images[currentView] ? (
          <>
            <Image
              source={{ uri: images[currentView]! }}
              style={styles.fullImage}
              resizeMode="contain"
            />
            
            {/* SVG Overlay for lines and angles */}
            {renderOverlay()}
            
            {/* Draggable landmarks */}
            {currentViewLandmarks.map((landmark) => {
              const position = landmarks[currentView][landmark.id] || { x: landmark.x, y: landmark.y };
              return (
                <DraggableLandmark
                  key={landmark.id}
                  landmark={landmark}
                  position={position}
                  imageWidth={SCREEN_WIDTH}
                  imageHeight={imageHeight}
                  onPositionChange={updateLandmarkPosition}
                  selected={selectedLandmark === landmark.id}
                  onSelect={setSelectedLandmark}
                  showLabels={showLabels}
                />
              );
            })}
          </>
        ) : (
          <TouchableOpacity style={styles.captureArea} onPress={pickMedia}>
            <View style={styles.cameraIconContainer}>
              <Ionicons name="camera" size={50} color={COLORS.accent} />
            </View>
            <Text style={styles.captureText}>Capture {currentView.replace('_', ' ').toUpperCase()} View</Text>
            <View style={styles.mediaOptions}>
              <View style={styles.mediaOption}>
                <Ionicons name="image" size={24} color={COLORS.accent} />
                <Text style={styles.mediaOptionText}>Gallery</Text>
              </View>
              <View style={styles.mediaOption}>
                <Ionicons name="videocam" size={24} color={COLORS.accent} />
                <Text style={styles.mediaOptionText}>Video</Text>
              </View>
              <View style={styles.mediaOption}>
                <Ionicons name="camera" size={24} color={COLORS.accent} />
                <Text style={styles.mediaOptionText}>Camera</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom Tools */}
      <View style={styles.bottomTools}>
        <TouchableOpacity 
          style={[styles.tool, showGrid && styles.toolActive]} 
          onPress={() => setShowGrid(!showGrid)}
        >
          <MaterialCommunityIcons name="grid" size={22} color={showGrid ? COLORS.accent : '#fff'} />
          <Text style={styles.toolText}>Grid</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tool, showPlumbLine && styles.toolActive]} 
          onPress={() => setShowPlumbLine(!showPlumbLine)}
        >
          <MaterialCommunityIcons name="arrow-down-bold" size={22} color={showPlumbLine ? COLORS.accent : '#fff'} />
          <Text style={styles.toolText}>Plumb</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tool, styles.toolPrimary]}
          onPress={pickMedia}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tool, showLabels && styles.toolActive]} 
          onPress={() => setShowLabels(!showLabels)}
        >
          <MaterialCommunityIcons name="tag" size={22} color={showLabels ? COLORS.accent : '#fff'} />
          <Text style={styles.toolText}>Labels</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tool, showConnections && styles.toolActive]} 
          onPress={() => setShowConnections(!showConnections)}
        >
          <MaterialCommunityIcons name="vector-line" size={22} color={showConnections ? COLORS.accent : '#fff'} />
          <Text style={styles.toolText}>Lines</Text>
        </TouchableOpacity>
      </View>

      {/* Analysis Report Modal */}
      <Modal visible={showAnalysisReport} animationType="slide">
        <SafeAreaView style={styles.reportModal}>
          <View style={styles.reportHeader}>
            <TouchableOpacity onPress={() => setShowAnalysisReport(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.reportTitle}>Clinical Analysis</Text>
            <TouchableOpacity style={styles.pdfBtn} onPress={handleGenerateReport} disabled={generating}>
              {generating ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <MaterialCommunityIcons name="file-pdf-box" size={18} color="#000" />
                  <Text style={styles.pdfBtnText}>PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.reportContent}>
            {/* Summary Badges */}
            <View style={styles.summaryBadges}>
              {[
                { label: 'Head', value: metrics.anterior?.headTilt || 0, icon: '👤' },
                { label: 'Shoulders', value: metrics.anterior?.shoulderTilt || 0, icon: '🦴' },
                { label: 'Pelvis', value: metrics.anterior?.pelvicTilt || 0, icon: '🦴' },
                { label: 'CVA', value: metrics.lateral_left?.cva || 50, icon: '🔄', isCVA: true },
              ].map((item, idx) => {
                const status = item.isCVA 
                  ? (item.value > 45 ? COLORS.success : item.value > 40 ? COLORS.warning : COLORS.error)
                  : getAlignmentStatus(item.value).color;
                return (
                  <View key={idx} style={[styles.summaryBadge, { borderColor: status }]}>
                    <Text style={styles.summaryBadgeIcon}>{item.icon}</Text>
                    <Text style={styles.summaryBadgeText}>{item.label} {item.value.toFixed(1)}</Text>
                  </View>
                );
              })}
            </View>

            {/* Clinical Assessment Section */}
            <View style={styles.assessmentSection}>
              <Text style={styles.sectionTitle}>FRONTAL VIEW ASSESSMENT</Text>
              
              <View style={styles.assessmentHeader}>
                <Text style={[styles.assessmentHeaderText, { flex: 1 }]}>SEGMENT</Text>
                <Text style={[styles.assessmentHeaderText, { flex: 1.2 }]}>ALIGNMENT</Text>
                <Text style={[styles.assessmentHeaderText, { flex: 0.8 }]}>DEVIATION</Text>
              </View>

              <MeasurementRow icon="👤" label="Head" angle={metrics.anterior?.headTilt || 0} displacement={`${metrics.anterior?.headDisplacement || 0} cm`} color={COLORS.head} />
              <MeasurementRow icon="🦴" label="Shoulders" angle={metrics.anterior?.shoulderTilt || 0} displacement={`${metrics.anterior?.shoulderDisplacement || 0} cm`} color={COLORS.shoulder} />
              <MeasurementRow icon="🦴" label="Pelvis" angle={metrics.anterior?.pelvicTilt || 0} displacement={`${metrics.anterior?.pelvicDisplacement || 0} cm`} color={COLORS.hip} />
              <MeasurementRow icon="🦵" label="Knees" angle={metrics.anterior?.kneeTilt || 0} displacement="-" color={COLORS.knee} />
            </View>

            {/* Rotation View Section */}
            <View style={styles.rotationSection}>
              <Text style={styles.sectionTitle}>ROTATION VIEW</Text>
              <View style={styles.rotationDials}>
                <RotationDial label="Head" value={metrics.rotation?.head || 0} color={COLORS.head} />
                <RotationDial label="Shoulder" value={metrics.rotation?.shoulder || 0} color={COLORS.shoulder} />
                <RotationDial label="Hip" value={metrics.rotation?.hip || 0} color={COLORS.hip} />
                <RotationDial label="Knee" value={metrics.rotation?.knee || 0} color={COLORS.knee} />
              </View>
            </View>

            {/* Center of Mass Section */}
            <View style={styles.comSection}>
              <Text style={styles.sectionTitle}>CENTER OF MASS</Text>
              <CenterOfMassDiagram x={metrics.centerOfMass?.x || 0} y={metrics.centerOfMass?.y || 0} />
            </View>

            {/* Action Buttons */}
            <View style={styles.reportActions}>
              <TouchableOpacity 
                style={styles.newAnalysisBtn}
                onPress={() => {
                  setShowAnalysisReport(false);
                  setImages({ anterior: null, lateral_left: null, lateral_right: null, posterior: null });
                }}
              >
                <Ionicons name="refresh" size={18} color={COLORS.gold} />
                <Text style={styles.newAnalysisBtnText}>New Analysis</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.exportPdfBtn}
                onPress={handleGenerateReport}
                disabled={generating}
              >
                {generating ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="file-pdf-box" size={18} color="#000" />
                    <Text style={styles.exportPdfBtnText}>Export PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Video Frame Selector */}
      <Modal visible={showFrameSelector} animationType="slide" transparent>
        <View style={styles.frameModalOverlay}>
          <View style={styles.frameModalContent}>
            <Text style={styles.frameModalTitle}>Select Frame for Analysis</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {videoFrames.map((frame, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.frameItem}
                  onPress={() => {
                    setImages(prev => ({ ...prev, [currentView]: frame }));
                    setShowFrameSelector(false);
                    setVideoFrames([]);
                  }}
                >
                  <Image source={{ uri: frame }} style={styles.frameImage} />
                  <Text style={styles.frameNumber}>Frame {index + 1}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.frameCloseBtn}
              onPress={() => {
                setShowFrameSelector(false);
                setVideoFrames([]);
              }}
            >
              <Text style={styles.frameCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payment Gate Modal */}
      <PaymentGateModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentConfirmed={generateReport}
        reportType="report"
        title="Download Full PDF Report"
        patientName={patientName}
        reportName="Advanced Posture Analysis"
        analysisData={{
          viewType: currentView,
          views: Object.keys(images).filter(k => images[k as ViewType]),
          landmarksPlaced: Object.values(landmarks[currentView]).filter(l => l.x > 0).length,
          timestamp: new Date().toISOString(),
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    paddingHorizontal: 15,
    paddingBottom: 8,
    backgroundColor: COLORS.background,
  },
  headerBtn: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.gold,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.accent,
    marginTop: 2,
  },
  analyzeBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  analyzeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  viewTabs: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  viewTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 6,
    position: 'relative',
  },
  viewTabActive: {
    backgroundColor: COLORS.accent,
  },
  viewTabText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  viewTabTextActive: {
    color: '#fff',
  },
  viewTabDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  quickMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: COLORS.card,
    marginHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  quickMetricItem: {
    alignItems: 'center',
  },
  quickMetricValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  quickMetricLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  imageArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: COLORS.background,
    marginHorizontal: 5,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  captureArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    margin: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.accent + '40',
    borderStyle: 'dashed',
  },
  cameraIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  captureText: {
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 15,
  },
  mediaOptions: {
    flexDirection: 'row',
    gap: 25,
  },
  mediaOption: {
    alignItems: 'center',
    gap: 4,
  },
  mediaOptionText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  landmark: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  landmarkInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  landmarkLabel: {
    position: 'absolute',
    top: -20,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 35,
  },
  landmarkLabelText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bottomTools: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    borderTopWidth: 1,
    borderTopColor: '#1A3A5C',
  },
  tool: {
    alignItems: 'center',
    gap: 3,
    padding: 6,
    minWidth: 50,
  },
  toolActive: {
    backgroundColor: COLORS.accent + '20',
    borderRadius: 8,
  },
  toolPrimary: {
    backgroundColor: COLORS.accent,
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
  },
  toolText: {
    color: COLORS.textMuted,
    fontSize: 9,
  },
  // Report Modal Styles
  reportModal: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1A3A5C',
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.gold,
  },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 5,
  },
  pdfBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  reportContent: {
    padding: 12,
  },
  summaryBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
    justifyContent: 'center',
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
  },
  summaryBadgeIcon: {
    fontSize: 12,
  },
  summaryBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  assessmentSection: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
  },
  sectionTitle: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A3A5C',
  },
  assessmentHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.gold,
    padding: 10,
  },
  assessmentHeaderText: {
    color: '#000',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1A3A5C',
  },
  measurementMember: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  measurementIcon: {
    fontSize: 16,
  },
  measurementLabel: {
    color: '#fff',
    fontSize: 11,
  },
  measurementAlignment: {
    flex: 1.2,
  },
  measurementStatus: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 5,
    backgroundColor: '#1A3A5C',
    borderRadius: 3,
    marginTop: 4,
    overflow: 'hidden',
    width: 80,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  measurementValue: {
    flex: 0.8,
    fontSize: 11,
    textAlign: 'right',
  },
  rotationSection: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },
  rotationDials: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  dialContainer: {
    alignItems: 'center',
  },
  dialSvg: {
    marginBottom: 5,
  },
  dialLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  dialValue: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  comSection: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  comContainer: {
    alignItems: 'center',
  },
  comTitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  comValues: {
    marginTop: 8,
    alignItems: 'center',
  },
  comValueText: {
    fontSize: 10,
    color: COLORS.accent,
    marginTop: 2,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  newAnalysisBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gold,
    gap: 6,
  },
  newAnalysisBtnText: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: 'bold',
  },
  exportPdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gold,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  exportPdfBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: 'bold',
  },
  // Frame selector modal
  frameModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  frameModalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  frameModalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  frameItem: {
    marginRight: 12,
    alignItems: 'center',
  },
  frameImage: {
    width: 90,
    height: 130,
    borderRadius: 8,
  },
  frameNumber: {
    color: '#fff',
    fontSize: 11,
    marginTop: 5,
  },
  frameCloseBtn: {
    marginTop: 15,
    padding: 12,
    backgroundColor: COLORS.error,
    borderRadius: 8,
    alignItems: 'center',
  },
  frameCloseBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
