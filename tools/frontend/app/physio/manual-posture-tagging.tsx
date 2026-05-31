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
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import Svg, { Line, Circle, Text as SvgText, G, Path } from 'react-native-svg';
import { PaymentGateModal } from '../../src/utils/PaymentGateModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Colors
const COLORS = {
  background: '#0A0E1A',
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
};

// Marker size - VERY SMALL as requested
const MARKER_SIZE = 12; // Small pink dot
const MARKER_INNER = 6;

// View types
type ViewType = 'front' | 'back' | 'left' | 'right';

// Landmark type
interface Landmark {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
}

// Angle measurement (3 points)
interface AngleMeasurement {
  id: string;
  name: string;
  pointA: { x: number; y: number };
  pointB: { x: number; y: number }; // Vertex
  pointC: { x: number; y: number };
  angle: number;
  color: string;
}

// Small Draggable Marker Component
interface DraggableMarkerProps {
  id: string;
  position: { x: number; y: number };
  color: string;
  label: string;
  number?: number;
  imageWidth: number;
  imageHeight: number;
  onPositionChange: (id: string, x: number, y: number) => void;
  selected: boolean;
  onSelect: (id: string) => void;
}

const DraggableMarker: React.FC<DraggableMarkerProps> = ({
  id, position, color, label, number, imageWidth, imageHeight, onPositionChange, selected, onSelect
}) => {
  const pan = useRef(new Animated.ValueXY({
    x: position.x * imageWidth - MARKER_SIZE / 2,
    y: position.y * imageHeight - MARKER_SIZE / 2,
  })).current;

  useEffect(() => {
    pan.setValue({
      x: position.x * imageWidth - MARKER_SIZE / 2,
      y: position.y * imageHeight - MARKER_SIZE / 2,
    });
  }, [position, imageWidth, imageHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        onSelect(id);
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
        const newX = Math.max(0, Math.min((pan.x as any)._value + MARKER_SIZE / 2, imageWidth)) / imageWidth;
        const newY = Math.max(0, Math.min((pan.y as any)._value + MARKER_SIZE / 2, imageHeight)) / imageHeight;
        onPositionChange(id, newX, newY);
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.marker,
        {
          width: MARKER_SIZE,
          height: MARKER_SIZE,
          borderRadius: MARKER_SIZE / 2,
          backgroundColor: selected ? COLORS.gold : color,
          borderColor: selected ? '#fff' : color,
          transform: pan.getTranslateTransform(),
        },
      ]}
      {...panResponder.panHandlers}
    >
      {number !== undefined && (
        <Text style={styles.markerNumber}>{number}</Text>
      )}
    </Animated.View>
  );
};

// Draggable Rotation Dial Component
interface RotationDialProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  color: string;
  size?: number;
}

const RotationDial: React.FC<RotationDialProps> = ({ label, value, onChange, color, size = 70 }) => {
  const center = size / 2;
  const radius = size / 2 - 8;
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        // Calculate angle from touch position
        const touchX = gestureState.moveX;
        const touchY = gestureState.moveY;
        // This is simplified - in real implementation you'd need layout coordinates
        const dx = gestureState.dx;
        const dy = gestureState.dy;
        const angleChange = (dx / 2) % 360;
        const newValue = Math.max(-180, Math.min(180, value + angleChange));
        onChange(Math.round(newValue * 10) / 10);
      },
    })
  ).current;

  const angle = (value * Math.PI) / 180;
  const indicatorX = center + Math.sin(angle) * (radius - 5);
  const indicatorY = center - Math.cos(angle) * (radius - 5);

  return (
    <View style={[styles.dialContainer, { width: size + 30 }]} {...panResponder.panHandlers}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle cx={center} cy={center} r={radius} fill={COLORS.card} stroke={COLORS.accent} strokeWidth={2} />
        
        {/* Quadrant markers */}
        <Line x1={center} y1={8} x2={center} y2={18} stroke="#666" strokeWidth={1} />
        <Line x1={size - 8} y1={center} x2={size - 18} y2={center} stroke="#666" strokeWidth={1} />
        <Line x1={center} y1={size - 8} x2={center} y2={size - 18} stroke="#666" strokeWidth={1} />
        <Line x1={8} y1={center} x2={18} y2={center} stroke="#666" strokeWidth={1} />
        
        {/* Indicator line */}
        <Line x1={center} y1={center} x2={indicatorX} y2={indicatorY} stroke={color} strokeWidth={3} strokeLinecap="round" />
        
        {/* Center dot */}
        <Circle cx={center} cy={center} r={5} fill={color} />
      </Svg>
      <Text style={styles.dialLabel}>{label}</Text>
      <Text style={[styles.dialValue, { color }]}>{Math.abs(value).toFixed(1)}{value < 0 ? 'L' : value > 0 ? 'R' : ''}</Text>
    </View>
  );
};

// Calculate angle between 3 points (B is vertex)
const calculate3PointAngle = (
  A: { x: number; y: number },
  B: { x: number; y: number },
  C: { x: number; y: number }
): number => {
  const BA = { x: A.x - B.x, y: A.y - B.y };
  const BC = { x: C.x - B.x, y: C.y - B.y };
  
  const dotProduct = BA.x * BC.x + BA.y * BC.y;
  const magnitudeBA = Math.sqrt(BA.x * BA.x + BA.y * BA.y);
  const magnitudeBC = Math.sqrt(BC.x * BC.x + BC.y * BC.y);
  
  if (magnitudeBA === 0 || magnitudeBC === 0) return 0;
  
  const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
  const angleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  const angleDeg = angleRad * (180 / Math.PI);
  
  return Math.round(angleDeg * 10) / 10;
};

export default function ManualPostureTaggingScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  const [currentView, setCurrentView] = useState<ViewType>('front');
  const [image, setImage] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [angleMeasurements, setAngleMeasurements] = useState<AngleMeasurement[]>([]);
  const [selectedLandmark, setSelectedLandmark] = useState<string | null>(null);
  const [selectedAngle, setSelectedAngle] = useState<string | null>(null);
  const [isTaggingMode, setIsTaggingMode] = useState(false);
  const [isAngleMode, setIsAngleMode] = useState(false);
  const [anglePoints, setAnglePoints] = useState<Array<{ x: number; y: number }>>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [zoom, setZoom] = useState(100);
  
  // Report data - manual entry
  const [reportData, setReportData] = useState({
    headAngle: 0,
    shoulderAngle: 0,
    pelvicAngle: 0,
    kneeAngle: 0,
    cva: 50,
    headRotation: 0,
    shoulderRotation: 0,
    hipRotation: 0,
    kneeRotation: 0,
    notes: '',
  });

  const imageHeight = SCREEN_HEIGHT - 380;
  const imageWidth = SCREEN_WIDTH - 20;

  const patients = [
    { id: '1', name: 'Mike Johnson' },
    { id: '2', name: 'Sarah Smith' },
    { id: '3', name: 'John Doe' },
    { id: '4', name: 'Emily Brown' },
  ];

  // Pick image from gallery
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setLandmarks([]);
      setAngleMeasurements([]);
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.granted) {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
      if (!result.canceled) {
        setImage(result.assets[0].uri);
        setLandmarks([]);
        setAngleMeasurements([]);
      }
    }
  };

  // Add landmark on tap
  const handleImageTap = (evt: any) => {
    if (!image) return;
    
    const { locationX, locationY } = evt.nativeEvent;
    const x = locationX / imageWidth;
    const y = locationY / imageHeight;
    
    if (isAngleMode) {
      // Adding points for angle measurement
      const newPoints = [...anglePoints, { x, y }];
      setAnglePoints(newPoints);
      
      if (newPoints.length === 3) {
        // Calculate and save the angle
        const angle = calculate3PointAngle(newPoints[0], newPoints[1], newPoints[2]);
        const newAngle: AngleMeasurement = {
          id: `angle-${Date.now()}`,
          name: `Angle ${angleMeasurements.length + 1}`,
          pointA: newPoints[0],
          pointB: newPoints[1],
          pointC: newPoints[2],
          angle,
          color: [COLORS.green, COLORS.blue, COLORS.purple, COLORS.gold][angleMeasurements.length % 4],
        };
        setAngleMeasurements([...angleMeasurements, newAngle]);
        setAnglePoints([]);
        setIsAngleMode(false);
      }
    } else if (isTaggingMode) {
      // Adding landmark
      const newLandmark: Landmark = {
        id: `landmark-${Date.now()}`,
        name: `Point ${landmarks.length + 1}`,
        x,
        y,
        color: COLORS.pink,
      };
      setLandmarks([...landmarks, newLandmark]);
      setIsTaggingMode(false);
    }
  };

  // Update landmark position
  const updateLandmarkPosition = (id: string, x: number, y: number) => {
    setLandmarks(prev => prev.map(l => l.id === id ? { ...l, x, y } : l));
    
    // Update any angle measurements that use this landmark
    // This would be implemented if landmarks are linked to angles
  };

  // Update angle point position
  const updateAnglePoint = (angleId: string, pointKey: 'pointA' | 'pointB' | 'pointC', x: number, y: number) => {
    setAngleMeasurements(prev => prev.map(a => {
      if (a.id === angleId) {
        const updated = { ...a, [pointKey]: { x, y } };
        updated.angle = calculate3PointAngle(updated.pointA, updated.pointB, updated.pointC);
        return updated;
      }
      return a;
    }));
  };

  // Delete landmark
  const deleteLandmark = (id: string) => {
    setLandmarks(prev => prev.filter(l => l.id !== id));
    setSelectedLandmark(null);
  };

  // Delete angle measurement
  const deleteAngle = (id: string) => {
    setAngleMeasurements(prev => prev.filter(a => a.id !== id));
    setSelectedAngle(null);
  };

  // Clear all
  const clearAll = () => {
    Alert.alert('Clear All', 'Remove all landmarks and measurements?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => {
        setLandmarks([]);
        setAngleMeasurements([]);
        setSelectedLandmark(null);
        setSelectedAngle(null);
      }},
    ]);
  };

  // Generate PDF report
  const generateReport = async () => {
    setShowPaymentModal(false);
    setGenerating(true);
    
    try {
      const date = new Date().toLocaleDateString('en-IN', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
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
    .logo { color: #FFD700; font-size: 28px; font-weight: bold; letter-spacing: 3px; }
    .subtitle { color: #00BCD4; font-size: 16px; margin-top: 5px; }
    
    .patient-info { background: #141B2D; padding: 15px; border-radius: 10px; margin-bottom: 20px; }
    .patient-name { color: #FFD700; font-size: 18px; font-weight: bold; }
    .patient-date { color: #8BA5B5; font-size: 12px; margin-top: 5px; }
    
    .section { background: #141B2D; border-radius: 10px; padding: 15px; margin-bottom: 15px; }
    .section-title { color: #00BCD4; font-size: 14px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
    
    .measurement-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #1A3A5C; }
    .measurement-label { color: #8BA5B5; }
    .measurement-value { color: #FFD700; font-weight: bold; }
    
    .angles-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .angle-card { background: #0A1628; padding: 15px; border-radius: 8px; text-align: center; }
    .angle-value { color: #00E676; font-size: 24px; font-weight: bold; }
    .angle-name { color: #8BA5B5; font-size: 11px; margin-top: 5px; }
    
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #1A3A5C; }
    .footer-logo { color: #FFD700; font-size: 18px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">WBA99</div>
    <div class="subtitle">Manual Posture Analysis Report</div>
  </div>

  <div class="patient-info">
    <div class="patient-name">${patientName || 'Patient'}</div>
    <div class="patient-date">${date} | View: ${currentView.toUpperCase()} | Report ID: ${reportId}</div>
  </div>

  <div class="section">
    <div class="section-title">Frontal View Assessment</div>
    <div class="measurement-row">
      <span class="measurement-label">Head Tilt</span>
      <span class="measurement-value">${reportData.headAngle.toFixed(1)}°</span>
    </div>
    <div class="measurement-row">
      <span class="measurement-label">Shoulder Tilt</span>
      <span class="measurement-value">${reportData.shoulderAngle.toFixed(1)}°</span>
    </div>
    <div class="measurement-row">
      <span class="measurement-label">Pelvic Tilt</span>
      <span class="measurement-value">${reportData.pelvicAngle.toFixed(1)}°</span>
    </div>
    <div class="measurement-row">
      <span class="measurement-label">Knee Alignment</span>
      <span class="measurement-value">${reportData.kneeAngle.toFixed(1)}°</span>
    </div>
    <div class="measurement-row">
      <span class="measurement-label">CVA (Craniovertebral Angle)</span>
      <span class="measurement-value">${reportData.cva.toFixed(1)}°</span>
    </div>
  </div>

  ${angleMeasurements.length > 0 ? `
  <div class="section">
    <div class="section-title">Custom Angle Measurements (${angleMeasurements.length})</div>
    <div class="angles-grid">
      ${angleMeasurements.map((a, i) => `
        <div class="angle-card">
          <div class="angle-value">${a.angle.toFixed(1)}°</div>
          <div class="angle-name">${a.name}</div>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Landmarks Placed (${landmarks.length})</div>
    ${landmarks.map((l, i) => `
      <div class="measurement-row">
        <span class="measurement-label">${i + 1}. ${l.name}</span>
        <span class="measurement-value">X: ${(l.x * 100).toFixed(1)}% Y: ${(l.y * 100).toFixed(1)}%</span>
      </div>
    `).join('')}
  </div>

  ${reportData.notes ? `
  <div class="section">
    <div class="section-title">Clinical Notes</div>
    <p style="color: #8BA5B5; line-height: 1.6;">${reportData.notes}</p>
  </div>
  ` : ''}

  <div class="footer">
    <div class="footer-logo">WBA99 MSK ANALYSIS</div>
    <p style="color: #8BA5B5; font-size: 10px; margin-top: 10px;">Professional Manual Posture Assessment System</p>
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

  // Render SVG overlay with lines and angles
  const renderOverlay = () => {
    return (
      <Svg style={StyleSheet.absoluteFill} width={imageWidth} height={imageHeight}>
        {/* Angle measurements - draw lines between 3 points */}
        {angleMeasurements.map((angle) => (
          <G key={angle.id}>
            {/* Line A to B */}
            <Line
              x1={angle.pointA.x * imageWidth}
              y1={angle.pointA.y * imageHeight}
              x2={angle.pointB.x * imageWidth}
              y2={angle.pointB.y * imageHeight}
              stroke={angle.color}
              strokeWidth={2}
            />
            {/* Line B to C */}
            <Line
              x1={angle.pointB.x * imageWidth}
              y1={angle.pointB.y * imageHeight}
              x2={angle.pointC.x * imageWidth}
              y2={angle.pointC.y * imageHeight}
              stroke={angle.color}
              strokeWidth={2}
            />
            {/* Angle label at vertex (B) */}
            <Circle
              cx={angle.pointB.x * imageWidth}
              cy={angle.pointB.y * imageHeight}
              r={20}
              fill={COLORS.card + 'CC'}
              stroke={angle.color}
              strokeWidth={1}
            />
            <SvgText
              x={angle.pointB.x * imageWidth}
              y={angle.pointB.y * imageHeight + 4}
              fontSize={10}
              fontWeight="bold"
              fill={angle.color}
              textAnchor="middle"
            >
              {angle.angle.toFixed(1)}°
            </SvgText>
          </G>
        ))}

        {/* Temporary angle points being placed */}
        {anglePoints.map((point, index) => (
          <G key={`temp-${index}`}>
            <Circle
              cx={point.x * imageWidth}
              cy={point.y * imageHeight}
              r={8}
              fill={COLORS.green}
              stroke="#fff"
              strokeWidth={1}
            />
            <SvgText
              x={point.x * imageWidth}
              y={point.y * imageHeight + 4}
              fontSize={10}
              fontWeight="bold"
              fill="#fff"
              textAnchor="middle"
            >
              {['A', 'B', 'C'][index]}
            </SvgText>
          </G>
        ))}
      </Svg>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manual Posture Tagging</Text>
        <TouchableOpacity onPress={() => setShowAnalysis(true)} style={styles.infoBtn}>
          <Ionicons name="information-circle" size={24} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      {/* Patient Selector */}
      <TouchableOpacity style={styles.patientSelector} onPress={() => setShowPatientPicker(true)}>
        <Ionicons name="person" size={20} color={COLORS.accent} />
        <Text style={styles.patientName}>{patientName || 'Select Patient'}</Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.accent} />
      </TouchableOpacity>

      {/* View Tabs */}
      <View style={styles.viewTabs}>
        {(['front', 'back', 'left', 'right'] as ViewType[]).map((view) => (
          <TouchableOpacity
            key={view}
            style={[styles.viewTab, currentView === view && styles.viewTabActive]}
            onPress={() => setCurrentView(view)}
          >
            <Text style={[styles.viewTabText, currentView === view && styles.viewTabTextActive]}>
              {view === 'left' ? 'Left Side' : view === 'right' ? 'Right Side' : view.charAt(0).toUpperCase() + view.slice(1)}
            </Text>
            {currentView === view && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Image Area */}
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        {image ? (
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={handleImageTap}
            style={styles.imageWrapper}
          >
            <Image
              source={{ uri: image }}
              style={[styles.image, { transform: [{ scale: zoom / 100 }] }]}
              resizeMode="contain"
            />
            
            {/* SVG Overlay for lines */}
            {renderOverlay()}
            
            {/* Draggable Landmarks */}
            {landmarks.map((landmark, index) => (
              <DraggableMarker
                key={landmark.id}
                id={landmark.id}
                position={{ x: landmark.x, y: landmark.y }}
                color={landmark.color}
                label={landmark.name}
                number={index + 1}
                imageWidth={imageWidth}
                imageHeight={imageHeight}
                onPositionChange={updateLandmarkPosition}
                selected={selectedLandmark === landmark.id}
                onSelect={setSelectedLandmark}
              />
            ))}

            {/* Angle point markers (draggable) */}
            {angleMeasurements.map((angle) => (
              <React.Fragment key={angle.id}>
                <DraggableMarker
                  id={`${angle.id}-A`}
                  position={angle.pointA}
                  color={angle.color}
                  label="A"
                  imageWidth={imageWidth}
                  imageHeight={imageHeight}
                  onPositionChange={(id, x, y) => updateAnglePoint(angle.id, 'pointA', x, y)}
                  selected={selectedAngle === `${angle.id}-A`}
                  onSelect={setSelectedAngle}
                />
                <DraggableMarker
                  id={`${angle.id}-B`}
                  position={angle.pointB}
                  color={angle.color}
                  label="B"
                  imageWidth={imageWidth}
                  imageHeight={imageHeight}
                  onPositionChange={(id, x, y) => updateAnglePoint(angle.id, 'pointB', x, y)}
                  selected={selectedAngle === `${angle.id}-B`}
                  onSelect={setSelectedAngle}
                />
                <DraggableMarker
                  id={`${angle.id}-C`}
                  position={angle.pointC}
                  color={angle.color}
                  label="C"
                  imageWidth={imageWidth}
                  imageHeight={imageHeight}
                  onPositionChange={(id, x, y) => updateAnglePoint(angle.id, 'pointC', x, y)}
                  selected={selectedAngle === `${angle.id}-C`}
                  onSelect={setSelectedAngle}
                />
              </React.Fragment>
            ))}

            {/* Mode indicator */}
            {isTaggingMode && (
              <View style={styles.modeIndicator}>
                <Text style={styles.modeText}>Tap to place landmark</Text>
              </View>
            )}
            {isAngleMode && (
              <View style={[styles.modeIndicator, { backgroundColor: COLORS.green + 'CC' }]}>
                <Text style={styles.modeText}>
                  Tap to place point {['A', 'B (vertex)', 'C'][anglePoints.length]} ({anglePoints.length}/3)
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="image" size={60} color={COLORS.accent} />
            <Text style={styles.placeholderText}>Upload an image to start tagging</Text>
          </View>
        )}
      </View>

      {/* Zoom Controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity style={styles.zoomBtn} onPress={() => setZoom(Math.max(50, zoom - 10))}>
          <Ionicons name="remove" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.zoomText}>{zoom}%</Text>
        <TouchableOpacity style={styles.zoomBtn} onPress={() => setZoom(Math.min(200, zoom + 10))}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomBtn} onPress={() => setZoom(100)}>
          <Ionicons name="refresh" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionBtn} onPress={pickImage}>
          <Ionicons name="images" size={22} color={COLORS.accent} />
          <Text style={styles.actionBtnText}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={takePhoto}>
          <Ionicons name="camera" size={22} color={COLORS.accent} />
          <Text style={styles.actionBtnText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.tagBtn, isTaggingMode && styles.activeBtn]} 
          onPress={() => { setIsTaggingMode(!isTaggingMode); setIsAngleMode(false); setAnglePoints([]); }}
        >
          <MaterialCommunityIcons name="map-marker-plus" size={22} color={isTaggingMode ? '#000' : COLORS.pink} />
          <Text style={[styles.actionBtnText, isTaggingMode && { color: '#000' }]}>Tag Point</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.angleBtn, isAngleMode && styles.activeAngleBtn]} 
          onPress={() => { setIsAngleMode(!isAngleMode); setIsTaggingMode(false); setAnglePoints([]); }}
        >
          <MaterialCommunityIcons name="angle-acute" size={22} color={isAngleMode ? '#000' : COLORS.green} />
          <Text style={[styles.actionBtnText, isAngleMode && { color: '#000' }]}>3-Point Angle</Text>
        </TouchableOpacity>
      </View>

      {/* Placed Items */}
      <View style={styles.placedItems}>
        <Text style={styles.placedTitle}>Placed Landmarks ({landmarks.length})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {landmarks.map((l, i) => (
            <TouchableOpacity 
              key={l.id} 
              style={[styles.placedItem, selectedLandmark === l.id && styles.placedItemSelected]}
              onPress={() => setSelectedLandmark(l.id)}
              onLongPress={() => deleteLandmark(l.id)}
            >
              <View style={[styles.placedDot, { backgroundColor: l.color }]} />
              <Text style={styles.placedText}>{i + 1}. {l.name}</Text>
            </TouchableOpacity>
          ))}
          {angleMeasurements.map((a, i) => (
            <TouchableOpacity 
              key={a.id} 
              style={[styles.placedItem, { borderColor: a.color }]}
              onLongPress={() => deleteAngle(a.id)}
            >
              <MaterialCommunityIcons name="angle-acute" size={14} color={a.color} />
              <Text style={[styles.placedText, { color: a.color }]}>{a.angle.toFixed(1)}°</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
          <Ionicons name="trash" size={18} color={COLORS.error} />
          <Text style={[styles.bottomBtnText, { color: COLORS.error }]}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.analyzeBtn} 
          onPress={() => setShowAnalysis(true)}
        >
          <MaterialCommunityIcons name="chart-box" size={18} color="#000" />
          <Text style={styles.analyzeBtnText}>Analysis</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.reportBtn} 
          onPress={() => setShowPaymentModal(true)}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              <MaterialCommunityIcons name="file-pdf-box" size={18} color="#000" />
              <Text style={styles.reportBtnText}>PDF Report</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Clinical Analysis Modal */}
      <Modal visible={showAnalysis} animationType="slide">
        <SafeAreaView style={styles.analysisModal}>
          <View style={styles.analysisHeader}>
            <TouchableOpacity onPress={() => setShowAnalysis(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.analysisTitle}>Clinical Analysis</Text>
            <TouchableOpacity style={styles.pdfBtn} onPress={() => { setShowAnalysis(false); setShowPaymentModal(true); }}>
              <MaterialCommunityIcons name="file-pdf-box" size={18} color="#000" />
              <Text style={styles.pdfBtnText}>PDF</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.analysisContent}>
            {/* Summary Badges */}
            <View style={styles.summaryBadges}>
              <View style={styles.badge}>
                <Text style={styles.badgeIcon}>👤</Text>
                <Text style={styles.badgeText}>Head {reportData.headAngle.toFixed(1)}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeIcon}>🦴</Text>
                <Text style={styles.badgeText}>Shoulders {reportData.shoulderAngle.toFixed(1)}</Text>
              </View>
              <View style={[styles.badge, { borderColor: COLORS.green }]}>
                <Text style={styles.badgeIcon}>🔄</Text>
                <Text style={[styles.badgeText, { color: COLORS.green }]}>CVA {reportData.cva.toFixed(1)}</Text>
              </View>
            </View>

            {/* Frontal View Assessment - Manual Entry */}
            <View style={styles.assessmentSection}>
              <Text style={styles.sectionTitle}>FRONTAL VIEW ASSESSMENT</Text>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Head Tilt (°)</Text>
                <TextInput
                  style={styles.angleInput}
                  value={reportData.headAngle.toString()}
                  onChangeText={(t) => setReportData(prev => ({ ...prev, headAngle: parseFloat(t) || 0 }))}
                  keyboardType="numeric"
                  placeholderTextColor="#666"
                />
              </View>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Shoulder Tilt (°)</Text>
                <TextInput
                  style={styles.angleInput}
                  value={reportData.shoulderAngle.toString()}
                  onChangeText={(t) => setReportData(prev => ({ ...prev, shoulderAngle: parseFloat(t) || 0 }))}
                  keyboardType="numeric"
                  placeholderTextColor="#666"
                />
              </View>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Pelvic Tilt (°)</Text>
                <TextInput
                  style={styles.angleInput}
                  value={reportData.pelvicAngle.toString()}
                  onChangeText={(t) => setReportData(prev => ({ ...prev, pelvicAngle: parseFloat(t) || 0 }))}
                  keyboardType="numeric"
                  placeholderTextColor="#666"
                />
              </View>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>CVA (°)</Text>
                <TextInput
                  style={styles.angleInput}
                  value={reportData.cva.toString()}
                  onChangeText={(t) => setReportData(prev => ({ ...prev, cva: parseFloat(t) || 0 }))}
                  keyboardType="numeric"
                  placeholderTextColor="#666"
                />
              </View>
            </View>

            {/* Rotation View - Draggable Dials */}
            <View style={styles.rotationSection}>
              <Text style={styles.sectionTitle}>ROTATION VIEW (Drag to adjust)</Text>
              <View style={styles.dialsContainer}>
                <RotationDial
                  label="Head"
                  value={reportData.headRotation}
                  onChange={(v) => setReportData(prev => ({ ...prev, headRotation: v }))}
                  color={COLORS.error}
                />
                <RotationDial
                  label="Shoulder"
                  value={reportData.shoulderRotation}
                  onChange={(v) => setReportData(prev => ({ ...prev, shoulderRotation: v }))}
                  color={COLORS.green}
                />
                <RotationDial
                  label="Hip"
                  value={reportData.hipRotation}
                  onChange={(v) => setReportData(prev => ({ ...prev, hipRotation: v }))}
                  color={COLORS.accent}
                />
                <RotationDial
                  label="Knee"
                  value={reportData.kneeRotation}
                  onChange={(v) => setReportData(prev => ({ ...prev, kneeRotation: v }))}
                  color={COLORS.blue}
                />
              </View>
            </View>

            {/* Custom Angles from Image */}
            {angleMeasurements.length > 0 && (
              <View style={styles.customAnglesSection}>
                <Text style={styles.sectionTitle}>CUSTOM ANGLE MEASUREMENTS ({angleMeasurements.length})</Text>
                <View style={styles.anglesGrid}>
                  {angleMeasurements.map((a, i) => (
                    <View key={a.id} style={[styles.angleCard, { borderColor: a.color }]}>
                      <Text style={[styles.angleValue, { color: a.color }]}>{a.angle.toFixed(1)}°</Text>
                      <Text style={styles.angleName}>{a.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Clinical Notes */}
            <View style={styles.notesSection}>
              <Text style={styles.sectionTitle}>CLINICAL NOTES</Text>
              <TextInput
                style={styles.notesInput}
                value={reportData.notes}
                onChangeText={(t) => setReportData(prev => ({ ...prev, notes: t }))}
                placeholder="Enter clinical observations..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Patient Picker Modal */}
      <Modal visible={showPatientPicker} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Select Patient</Text>
            {patients.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.pickerItem}
                onPress={() => { setPatientName(p.name); setShowPatientPicker(false); }}
              >
                <Ionicons name="person" size={20} color={COLORS.accent} />
                <Text style={styles.pickerItemText}>{p.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.pickerCancel} onPress={() => setShowPatientPicker(false)}>
              <Text style={styles.pickerCancelText}>Cancel</Text>
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
        title="Generate PDF Report"
        patientName={patientName}
        reportName="Posture Analysis Report"
        analysisData={{
          viewType: currentView,
          landmarks: landmarks.length,
          angles: angleMeasurements.length,
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
    paddingBottom: 10,
  },
  headerBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoBtn: {
    padding: 8,
  },
  patientSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 15,
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  patientName: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  viewTabs: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  viewTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    position: 'relative',
  },
  viewTabActive: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
  },
  viewTabText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  viewTabTextActive: {
    color: '#fff',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.green,
  },
  imageContainer: {
    marginHorizontal: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.accent + '40',
    borderStyle: 'dashed',
    overflow: 'hidden',
    backgroundColor: COLORS.card,
  },
  imageWrapper: {
    flex: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: COLORS.accent,
    marginTop: 15,
    fontSize: 14,
  },
  marker: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  markerNumber: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  modeIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: COLORS.pink + 'CC',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 15,
  },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tagBtn: {
    borderWidth: 2,
    borderColor: COLORS.pink,
  },
  activeBtn: {
    backgroundColor: COLORS.pink,
  },
  angleBtn: {
    borderWidth: 2,
    borderColor: COLORS.green,
  },
  activeAngleBtn: {
    backgroundColor: COLORS.green,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  placedItems: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  placedTitle: {
    color: COLORS.pink,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  placedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.pink,
    gap: 5,
  },
  placedItemSelected: {
    backgroundColor: COLORS.pink + '30',
  },
  placedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  placedText: {
    color: '#fff',
    fontSize: 11,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
    gap: 10,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.error,
    gap: 6,
  },
  bottomBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  analyzeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  analyzeBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: 'bold',
  },
  reportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gold,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  reportBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: 'bold',
  },
  // Analysis Modal Styles
  analysisModal: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1A3A5C',
  },
  analysisTitle: {
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
    borderRadius: 8,
    gap: 5,
  },
  pdfBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  analysisContent: {
    padding: 15,
  },
  summaryBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gold,
    gap: 6,
  },
  badgeIcon: {
    fontSize: 14,
  },
  badgeText: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '600',
  },
  assessmentSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1A3A5C',
    paddingBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1A3A5C',
  },
  inputLabel: {
    color: '#fff',
    fontSize: 14,
  },
  angleInput: {
    backgroundColor: COLORS.background,
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.gold + '50',
  },
  rotationSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  dialsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 15,
  },
  dialContainer: {
    alignItems: 'center',
  },
  dialLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 5,
  },
  dialValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  customAnglesSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  anglesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  angleCard: {
    width: '48%',
    backgroundColor: COLORS.background,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
  },
  angleValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  angleName: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 5,
  },
  notesSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  notesInput: {
    backgroundColor: COLORS.background,
    color: '#fff',
    fontSize: 14,
    padding: 12,
    borderRadius: 8,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  // Picker Modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    width: '80%',
  },
  pickerTitle: {
    color: COLORS.gold,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1A3A5C',
    gap: 10,
  },
  pickerItemText: {
    color: '#fff',
    fontSize: 15,
  },
  pickerCancel: {
    marginTop: 15,
    padding: 12,
    alignItems: 'center',
    backgroundColor: COLORS.error + '30',
    borderRadius: 8,
  },
  pickerCancelText: {
    color: COLORS.error,
    fontWeight: '600',
  },
});
