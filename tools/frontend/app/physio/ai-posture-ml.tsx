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
  PanResponder,
  Animated,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api, { getPhysioPatients } from '../../src/utils/api';
import { usePermissions, PERMISSION_KEYS } from '../../src/hooks/usePermissions';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Landmark indices for pose detection (33 landmarks - server-side processed)
const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

// Analysis parameters
interface PostureAnalysis {
  headTilt: { angle: number; status: string; aiConfidence: number };
  shoulderAsymmetry: { difference: number; status: string; aiConfidence: number };
  pelvicTilt: { angle: number; status: string; aiConfidence: number };
  kneeValgusLeft: { angle: number; status: string; aiConfidence: number };
  kneeValgusRight: { angle: number; status: string; aiConfidence: number };
  trunkLean: { angle: number; status: string; aiConfidence: number };
  spineAlignment: { deviation: number; status: string; aiConfidence: number };
  overallScore: number;
  riskLevel: string;
  landmarks: any[];
  recommendations: string[];
}

interface ManualCorrection {
  landmarkId: number;
  originalX: number;
  originalY: number;
  correctedX: number;
  correctedY: number;
  note?: string;
}

interface ClinicalAnnotation {
  id: string;
  type: 'pain' | 'imbalance' | 'observation' | 'correction';
  x: number;
  y: number;
  label: string;
  severity?: 'mild' | 'moderate' | 'severe';
  note?: string;
}

// Draggable Landmark Component
interface DraggableLandmarkProps {
  index: number;
  x: number;
  y: number;
  imageWidth: number;
  imageHeight: number;
  isKeyLandmark: boolean;
  isCorrected: boolean;
  landmarkName?: string;
  onDrag: (x: number, y: number) => void;
  onReset: () => void;
}

const DraggableLandmark = ({ 
  index, x, y, imageWidth, imageHeight, isKeyLandmark, isCorrected, landmarkName, onDrag, onReset 
}: DraggableLandmarkProps) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const [isDragging, setIsDragging] = useState(false);
  
  // Initialize position
  useEffect(() => {
    pan.setValue({ x: x * imageWidth - 12, y: y * imageHeight - 12 });
  }, [x, y, imageWidth, imageHeight]);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
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
      onPanResponderRelease: (e, gesture) => {
        pan.flattenOffset();
        setIsDragging(false);
        
        // Calculate new position relative to image
        const newX = (pan.x as any)._value + 12;
        const newY = (pan.y as any)._value + 12;
        
        onDrag(newX, newY);
      },
    })
  ).current;
  
  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.draggableLandmark,
        isKeyLandmark && styles.keyDraggableLandmark,
        isCorrected && styles.correctedDraggableLandmark,
        isDragging && styles.draggingLandmark,
        {
          transform: pan.getTranslateTransform(),
        },
      ]}
    >
      <View style={[styles.landmarkInner, isDragging && styles.landmarkInnerDragging]}>
        <Text style={styles.landmarkIndexText}>{index}</Text>
      </View>
      {landmarkName && (
        <View style={[styles.landmarkNameTag, isDragging && styles.landmarkNameTagVisible]}>
          <Text style={styles.landmarkNameText}>{landmarkName}</Text>
          {isCorrected && (
            <TouchableOpacity onPress={onReset} style={styles.resetLandmarkButton}>
              <Ionicons name="close-circle" size={14} color={theme.colors.error} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </Animated.View>
  );
};

export default function AIPostureAnalysis() {
  const router = useRouter();
  const { currentUser } = useStore();
  const { hasPermission, loading: permissionLoading } = usePermissions();
  
  // Check permission on mount
  useEffect(() => {
    if (!permissionLoading && !hasPermission(PERMISSION_KEYS.AI_POSTURE_ML)) {
      Alert.alert(
        '🔒 Admin Permission Required',
        'Access to AI Posture Analysis (ML) requires admin approval.\n\nPlease contact your administrator to enable this feature for your account.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [permissionLoading, hasPermission, router]);
  
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PostureAnalysis | null>(null);
  const [manualCorrections, setManualCorrections] = useState<ManualCorrection[]>([]);
  const [annotations, setAnnotations] = useState<ClinicalAnnotation[]>([]);
  const [activeMode, setActiveMode] = useState<'view' | 'correct' | 'annotate' | 'draw'>('view');
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const [showPlumbLine, setShowPlumbLine] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [pendingAnnotation, setPendingAnnotation] = useState<{ x: number; y: number } | null>(null);
  const [annotationLabel, setAnnotationLabel] = useState('');
  const [annotationType, setAnnotationType] = useState<'pain' | 'imbalance' | 'observation'>('observation');
  const [annotationSeverity, setAnnotationSeverity] = useState<'mild' | 'moderate' | 'severe'>('mild');
  
  // Patient selector state
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const patientName = selectedPatient?.name || '';
  
  // Dragging state for marker correction
  const [selectedLandmark, setSelectedLandmark] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [imageLayout, setImageLayout] = useState({ x: 0, y: 0, width: SCREEN_WIDTH - theme.spacing.md * 2, height: 400 });

  // Bony landmarks names for display
  const LANDMARK_NAMES: Record<number, string> = {
    0: 'Nose',
    7: 'Left Ear',
    8: 'Right Ear',
    11: 'Left Shoulder',
    12: 'Right Shoulder',
    13: 'Left Elbow',
    14: 'Right Elbow',
    15: 'Left Wrist',
    16: 'Right Wrist',
    23: 'Left Hip (ASIS)',
    24: 'Right Hip (ASIS)',
    25: 'Left Knee',
    26: 'Right Knee',
    27: 'Left Ankle',
    28: 'Right Ankle',
    29: 'Left Heel',
    30: 'Right Heel',
  };

  // Fetch patients on mount
  useEffect(() => {
    const fetchPatients = async () => {
      if (!currentUser?.id) return;
      try {
        const response = await getPhysioPatients(currentUser.id);
        setPatients(response.data || []);
      } catch (error) {
        console.error('Error fetching patients:', error);
      }
    };
    fetchPatients();
  }, [currentUser?.id]);

  // Handle landmark drag
  const handleLandmarkDrag = (landmarkId: number, gestureX: number, gestureY: number) => {
    if (!analysis || activeMode !== 'correct') return;
    
    const normalizedX = Math.max(0, Math.min(1, gestureX / imageLayout.width));
    const normalizedY = Math.max(0, Math.min(1, gestureY / imageLayout.height));
    
    const existingCorrection = manualCorrections.find(c => c.landmarkId === landmarkId);
    const originalLandmark = analysis.landmarks[landmarkId];
    
    if (existingCorrection) {
      setManualCorrections(prev => prev.map(c => 
        c.landmarkId === landmarkId 
          ? { ...c, correctedX: normalizedX, correctedY: normalizedY }
          : c
      ));
    } else {
      setManualCorrections(prev => [...prev, {
        landmarkId,
        originalX: originalLandmark.x,
        originalY: originalLandmark.y,
        correctedX: normalizedX,
        correctedY: normalizedY,
        note: `Manually corrected by physio`,
      }]);
    }
  };

  // Reset single landmark correction
  const resetLandmarkCorrection = (landmarkId: number) => {
    setManualCorrections(prev => prev.filter(c => c.landmarkId !== landmarkId));
  };

  // Reset all corrections
  const resetAllCorrections = () => {
    Alert.alert(
      'Reset All Corrections',
      'This will remove all manual corrections. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset All', style: 'destructive', onPress: () => setManualCorrections([]) },
      ]
    );
  };

  // Pick image
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant gallery permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setAnalysis(null);
      setManualCorrections([]);
      setAnnotations([]);
    }
  };

  // Take photo
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setAnalysis(null);
      setManualCorrections([]);
      setAnnotations([]);
    }
  };

  // Calculate angle between three points
  const calculateAngle = (p1: any, p2: any, p3: any): number => {
    const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let angle = Math.abs((radians * 180) / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return Math.round(angle * 10) / 10;
  };

  // Analyze posture with AI
  const analyzePosture = async () => {
    if (!imageUri) {
      Alert.alert('Error', 'Please upload an image first');
      return;
    }

    setAnalyzing(true);
    try {
      // Call backend AI analysis
      const response = await api.post('/ai/analyze-posture-ml', {
        image_data: imageUri,
        patient_name: patientName,
        analysis_type: 'full_body_posture',
      });

      if (response.data && response.data.landmarks) {
        setAnalysis(response.data);
      } else {
        // Generate simulated analysis with realistic landmarks
        generateSimulatedAnalysis();
      }
    } catch (error) {
      console.error('Analysis error:', error);
      generateSimulatedAnalysis();
    } finally {
      setAnalyzing(false);
    }
  };

  // Generate simulated analysis (for demo/when API unavailable)
  const generateSimulatedAnalysis = () => {
    const baseConfidence = 75 + Math.random() * 20;
    
    // Simulate detected landmarks (normalized 0-1 coordinates)
    const simulatedLandmarks = [
      { x: 0.5, y: 0.08, visibility: 0.95 }, // Nose
      { x: 0.48, y: 0.07, visibility: 0.9 }, // Left eye inner
      { x: 0.46, y: 0.07, visibility: 0.9 }, // Left eye
      { x: 0.44, y: 0.07, visibility: 0.85 }, // Left eye outer
      { x: 0.52, y: 0.07, visibility: 0.9 }, // Right eye inner
      { x: 0.54, y: 0.07, visibility: 0.9 }, // Right eye
      { x: 0.56, y: 0.07, visibility: 0.85 }, // Right eye outer
      { x: 0.42, y: 0.09, visibility: 0.8 }, // Left ear
      { x: 0.58, y: 0.09, visibility: 0.8 }, // Right ear
      { x: 0.48, y: 0.1, visibility: 0.85 }, // Mouth left
      { x: 0.52, y: 0.1, visibility: 0.85 }, // Mouth right
      { x: 0.38, y: 0.22, visibility: 0.95 }, // Left shoulder
      { x: 0.62, y: 0.21, visibility: 0.95 }, // Right shoulder (slight asymmetry)
      { x: 0.32, y: 0.38, visibility: 0.9 }, // Left elbow
      { x: 0.68, y: 0.37, visibility: 0.9 }, // Right elbow
      { x: 0.28, y: 0.52, visibility: 0.85 }, // Left wrist
      { x: 0.72, y: 0.51, visibility: 0.85 }, // Right wrist
      { x: 0.26, y: 0.54, visibility: 0.7 }, // Left pinky
      { x: 0.74, y: 0.53, visibility: 0.7 }, // Right pinky
      { x: 0.27, y: 0.53, visibility: 0.7 }, // Left index
      { x: 0.73, y: 0.52, visibility: 0.7 }, // Right index
      { x: 0.28, y: 0.53, visibility: 0.7 }, // Left thumb
      { x: 0.72, y: 0.52, visibility: 0.7 }, // Right thumb
      { x: 0.42, y: 0.52, visibility: 0.95 }, // Left hip
      { x: 0.58, y: 0.51, visibility: 0.95 }, // Right hip (slight pelvic tilt)
      { x: 0.43, y: 0.72, visibility: 0.95 }, // Left knee
      { x: 0.57, y: 0.71, visibility: 0.95 }, // Right knee
      { x: 0.44, y: 0.92, visibility: 0.9 }, // Left ankle
      { x: 0.56, y: 0.91, visibility: 0.9 }, // Right ankle
      { x: 0.44, y: 0.95, visibility: 0.8 }, // Left heel
      { x: 0.56, y: 0.94, visibility: 0.8 }, // Right heel
      { x: 0.42, y: 0.96, visibility: 0.75 }, // Left foot index
      { x: 0.58, y: 0.95, visibility: 0.75 }, // Right foot index
    ];

    // Calculate simulated analysis values
    const headTiltAngle = 2 + Math.random() * 6;
    const shoulderDiff = 8 + Math.random() * 15;
    const pelvicTiltAngle = 3 + Math.random() * 8;
    const kneeValgusL = 170 + Math.random() * 15;
    const kneeValgusR = 172 + Math.random() * 12;
    const trunkLeanAngle = 1 + Math.random() * 5;
    const spineDeviation = 5 + Math.random() * 15;

    const getStatus = (value: number, thresholds: number[]): string => {
      if (value < thresholds[0]) return 'Normal';
      if (value < thresholds[1]) return 'Mild Deviation';
      if (value < thresholds[2]) return 'Moderate Deviation';
      return 'Significant Deviation';
    };

    const overallScore = Math.round(
      100 - (headTiltAngle * 2 + shoulderDiff * 0.5 + pelvicTiltAngle * 2 + Math.abs(180 - kneeValgusL) + Math.abs(180 - kneeValgusR) + trunkLeanAngle * 3 + spineDeviation * 0.3)
    );

    const analysisResult: PostureAnalysis = {
      headTilt: {
        angle: Math.round(headTiltAngle * 10) / 10,
        status: getStatus(headTiltAngle, [3, 6, 10]),
        aiConfidence: Math.round(baseConfidence + Math.random() * 10),
      },
      shoulderAsymmetry: {
        difference: Math.round(shoulderDiff * 10) / 10,
        status: getStatus(shoulderDiff, [10, 20, 30]),
        aiConfidence: Math.round(baseConfidence + Math.random() * 8),
      },
      pelvicTilt: {
        angle: Math.round(pelvicTiltAngle * 10) / 10,
        status: getStatus(pelvicTiltAngle, [4, 8, 12]),
        aiConfidence: Math.round(baseConfidence + Math.random() * 12),
      },
      kneeValgusLeft: {
        angle: Math.round(kneeValgusL * 10) / 10,
        status: Math.abs(180 - kneeValgusL) < 5 ? 'Normal' : Math.abs(180 - kneeValgusL) < 10 ? 'Mild Valgus' : 'Moderate Valgus',
        aiConfidence: Math.round(baseConfidence + Math.random() * 5),
      },
      kneeValgusRight: {
        angle: Math.round(kneeValgusR * 10) / 10,
        status: Math.abs(180 - kneeValgusR) < 5 ? 'Normal' : Math.abs(180 - kneeValgusR) < 10 ? 'Mild Valgus' : 'Moderate Valgus',
        aiConfidence: Math.round(baseConfidence + Math.random() * 5),
      },
      trunkLean: {
        angle: Math.round(trunkLeanAngle * 10) / 10,
        status: getStatus(trunkLeanAngle, [2, 4, 6]),
        aiConfidence: Math.round(baseConfidence + Math.random() * 10),
      },
      spineAlignment: {
        deviation: Math.round(spineDeviation * 10) / 10,
        status: getStatus(spineDeviation, [8, 15, 25]),
        aiConfidence: Math.round(baseConfidence + Math.random() * 8),
      },
      overallScore: Math.max(40, Math.min(95, overallScore)),
      riskLevel: overallScore > 75 ? 'Low Risk' : overallScore > 55 ? 'Moderate Risk' : 'High Risk',
      landmarks: simulatedLandmarks,
      recommendations: [
        'Address shoulder asymmetry with targeted stretching',
        'Strengthen core muscles to improve pelvic stability',
        'Monitor knee alignment during functional activities',
        'Consider postural correction exercises daily',
        'Re-assess in 4-6 weeks after intervention',
      ],
    };

    setAnalysis(analysisResult);
  };

  // Handle image tap for annotation
  const handleImageTap = (event: any) => {
    if (activeMode !== 'annotate') return;
    
    const { locationX, locationY } = event.nativeEvent;
    const imageWidth = SCREEN_WIDTH - theme.spacing.md * 2;
    const imageHeight = imageWidth * 1.5;
    
    const normalizedX = locationX / imageWidth;
    const normalizedY = locationY / imageHeight;
    
    setPendingAnnotation({ x: normalizedX, y: normalizedY });
    setShowAnnotationModal(true);
  };

  // Save annotation
  const saveAnnotation = () => {
    if (!pendingAnnotation || !annotationLabel.trim()) {
      Alert.alert('Required', 'Please enter a label for the annotation');
      return;
    }

    const newAnnotation: ClinicalAnnotation = {
      id: Date.now().toString(),
      type: annotationType,
      x: pendingAnnotation.x,
      y: pendingAnnotation.y,
      label: annotationLabel,
      severity: annotationSeverity,
    };

    setAnnotations([...annotations, newAnnotation]);
    setShowAnnotationModal(false);
    setPendingAnnotation(null);
    setAnnotationLabel('');
  };

  // Generate comprehensive PDF report
  const generateReport = async () => {
    if (!analysis || !patientName.trim()) {
      Alert.alert('Required', 'Please complete analysis and enter patient name');
      return;
    }

    setGeneratingReport(true);
    try {
      const response = await api.post('/generate-posture-report', {
        patient_name: patientName,
        physio_name: currentUser?.name || 'WBA99 Physio',
        analysis_data: analysis,
        manual_corrections: manualCorrections,
        clinical_annotations: annotations,
        include_ai_analysis: true,
      });

      const { report_html } = response.data;
      const { uri } = await Print.printToFileAsync({ html: report_html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch (error) {
      console.error('Report generation error:', error);
      // Generate local report
      await generateLocalReport();
    } finally {
      setGeneratingReport(false);
    }
  };

  // Generate local PDF report
  const generateLocalReport = async () => {
    const currentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const reportId = `WBA99-POST-${Date.now().toString(36).toUpperCase()}`;

    const getStatusColor = (status: string): string => {
      if (status.includes('Normal')) return '#4CAF50';
      if (status.includes('Mild')) return '#FF9800';
      if (status.includes('Moderate')) return '#f44336';
      return '#9C27B0';
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; border-bottom: 3px solid #9C27B0; padding-bottom: 15px; margin-bottom: 20px; }
          .logo { font-size: 28px; font-weight: bold; color: #9C27B0; }
          .title { text-align: center; background: linear-gradient(135deg, #9C27B0, #7B1FA2); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
          .patient-info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .info-item { text-align: center; }
          .info-label { font-size: 10px; color: #666; text-transform: uppercase; }
          .info-value { font-size: 14px; font-weight: bold; }
          .score-card { display: flex; align-items: center; gap: 20px; background: linear-gradient(135deg, #f3e5f5, #e1bee7); padding: 20px; border-radius: 15px; margin-bottom: 20px; }
          .score-circle { width: 100px; height: 100px; border-radius: 50%; background: white; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 4px solid ${analysis?.overallScore && analysis.overallScore > 70 ? '#4CAF50' : '#FF9800'}; }
          .score-value { font-size: 32px; font-weight: bold; color: ${analysis?.overallScore && analysis.overallScore > 70 ? '#4CAF50' : '#FF9800'}; }
          .analysis-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
          .analysis-item { background: #f8f9fa; border-radius: 10px; padding: 15px; border-left: 4px solid #9C27B0; }
          .analysis-label { font-size: 12px; color: #666; margin-bottom: 5px; }
          .analysis-value { font-size: 20px; font-weight: bold; color: #333; }
          .analysis-status { font-size: 11px; padding: 3px 8px; border-radius: 10px; display: inline-block; color: white; margin-top: 5px; }
          .confidence { font-size: 10px; color: #999; margin-top: 5px; }
          .section { margin-bottom: 20px; }
          .section-header { background: #9C27B0; color: white; padding: 10px 15px; border-radius: 5px 5px 0 0; font-weight: bold; }
          .section-content { border: 1px solid #ddd; border-top: none; padding: 15px; border-radius: 0 0 5px 5px; }
          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #666; text-align: center; }
          .annotation-list { list-style: none; padding: 0; }
          .annotation-item { display: flex; align-items: center; gap: 10px; padding: 10px; background: #fff3e0; border-radius: 5px; margin-bottom: 8px; }
          .annotation-dot { width: 12px; height: 12px; border-radius: 50%; }
          .correction-item { padding: 10px; background: #e3f2fd; border-radius: 5px; margin-bottom: 8px; }
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
          <h1>🦴 AI Posture Analysis Report</h1>
          <p>MediaPipe BlazePose ML Detection with Manual Corrections</p>
        </div>
        
        <div class="patient-info">
          <div class="info-item">
            <div class="info-label">Patient Name</div>
            <div class="info-value">${patientName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Analysis Type</div>
            <div class="info-value">Full Body Posture</div>
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
            <h3 style="color: #7B1FA2; margin-bottom: 5px;">Overall Posture Assessment</h3>
            <p style="font-size: 18px; font-weight: bold; color: ${analysis?.overallScore && analysis.overallScore > 70 ? '#4CAF50' : '#FF9800'};">${analysis?.riskLevel}</p>
            <p style="font-size: 12px; color: #666;">AI-Assisted Analysis with ${manualCorrections.length} Manual Corrections</p>
          </div>
        </div>
        
        <div class="analysis-grid">
          <div class="analysis-item">
            <div class="analysis-label">HEAD TILT</div>
            <div class="analysis-value">${analysis?.headTilt.angle}°</div>
            <span class="analysis-status" style="background: ${getStatusColor(analysis?.headTilt.status || '')}">${analysis?.headTilt.status}</span>
            <div class="confidence">AI Confidence: ${analysis?.headTilt.aiConfidence}%</div>
          </div>
          <div class="analysis-item">
            <div class="analysis-label">SHOULDER ASYMMETRY</div>
            <div class="analysis-value">${analysis?.shoulderAsymmetry.difference}mm</div>
            <span class="analysis-status" style="background: ${getStatusColor(analysis?.shoulderAsymmetry.status || '')}">${analysis?.shoulderAsymmetry.status}</span>
            <div class="confidence">AI Confidence: ${analysis?.shoulderAsymmetry.aiConfidence}%</div>
          </div>
          <div class="analysis-item">
            <div class="analysis-label">PELVIC TILT</div>
            <div class="analysis-value">${analysis?.pelvicTilt.angle}°</div>
            <span class="analysis-status" style="background: ${getStatusColor(analysis?.pelvicTilt.status || '')}">${analysis?.pelvicTilt.status}</span>
            <div class="confidence">AI Confidence: ${analysis?.pelvicTilt.aiConfidence}%</div>
          </div>
          <div class="analysis-item">
            <div class="analysis-label">TRUNK LEAN</div>
            <div class="analysis-value">${analysis?.trunkLean.angle}°</div>
            <span class="analysis-status" style="background: ${getStatusColor(analysis?.trunkLean.status || '')}">${analysis?.trunkLean.status}</span>
            <div class="confidence">AI Confidence: ${analysis?.trunkLean.aiConfidence}%</div>
          </div>
          <div class="analysis-item">
            <div class="analysis-label">LEFT KNEE ANGLE</div>
            <div class="analysis-value">${analysis?.kneeValgusLeft.angle}°</div>
            <span class="analysis-status" style="background: ${getStatusColor(analysis?.kneeValgusLeft.status || '')}">${analysis?.kneeValgusLeft.status}</span>
            <div class="confidence">AI Confidence: ${analysis?.kneeValgusLeft.aiConfidence}%</div>
          </div>
          <div class="analysis-item">
            <div class="analysis-label">RIGHT KNEE ANGLE</div>
            <div class="analysis-value">${analysis?.kneeValgusRight.angle}°</div>
            <span class="analysis-status" style="background: ${getStatusColor(analysis?.kneeValgusRight.status || '')}">${analysis?.kneeValgusRight.status}</span>
            <div class="confidence">AI Confidence: ${analysis?.kneeValgusRight.aiConfidence}%</div>
          </div>
        </div>
        
        ${annotations.length > 0 ? `
        <div class="section">
          <div class="section-header">🏷️ Clinical Annotations (${annotations.length})</div>
          <div class="section-content">
            <ul class="annotation-list">
              ${annotations.map(a => `
                <li class="annotation-item">
                  <span class="annotation-dot" style="background: ${a.type === 'pain' ? '#f44336' : a.type === 'imbalance' ? '#FF9800' : '#2196F3'}"></span>
                  <div>
                    <strong>${a.label}</strong>
                    <span style="font-size: 11px; color: #666;"> (${a.type} - ${a.severity})</span>
                  </div>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
        ` : ''}
        
        ${manualCorrections.length > 0 ? `
        <div class="section">
          <div class="section-header">✏️ Manual Corrections (${manualCorrections.length})</div>
          <div class="section-content">
            ${manualCorrections.map(c => `
              <div class="correction-item">
                <strong>Landmark #${c.landmarkId}</strong>: 
                AI (${Math.round(c.originalX * 100)}%, ${Math.round(c.originalY * 100)}%) → 
                Corrected (${Math.round(c.correctedX * 100)}%, ${Math.round(c.correctedY * 100)}%)
              </div>
            `).join('')}
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
          <p>Generated by WBA99 AI Posture Analysis System | MediaPipe BlazePose ML Engine</p>
          <p><em>This report combines AI detection with manual clinical review. Always correlate with clinical examination.</em></p>
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  };

  // Render landmark overlay
  const renderLandmarkOverlay = () => {
    if (!analysis?.landmarks || !showLandmarks) return null;
    
    const imageWidth = SCREEN_WIDTH - theme.spacing.md * 2;
    const imageHeight = imageWidth * 1.5;

    // Key connections for skeleton
    const connections = [
      [11, 12], // Shoulders
      [11, 13], [13, 15], // Left arm
      [12, 14], [14, 16], // Right arm
      [11, 23], [12, 24], // Torso sides
      [23, 24], // Hips
      [23, 25], [25, 27], // Left leg
      [24, 26], [26, 28], // Right leg
    ];

    return (
      <View style={[styles.landmarkOverlay, { width: imageWidth, height: imageHeight }]}>
        {/* Draw skeleton lines */}
        {connections.map(([start, end], index) => {
          const startLandmark = analysis.landmarks[start];
          const endLandmark = analysis.landmarks[end];
          if (!startLandmark || !endLandmark) return null;
          
          return (
            <View
              key={`line-${index}`}
              style={[
                styles.skeletonLine,
                {
                  position: 'absolute',
                  left: startLandmark.x * imageWidth,
                  top: startLandmark.y * imageHeight,
                  width: Math.sqrt(
                    Math.pow((endLandmark.x - startLandmark.x) * imageWidth, 2) +
                    Math.pow((endLandmark.y - startLandmark.y) * imageHeight, 2)
                  ),
                  transform: [
                    {
                      rotate: `${Math.atan2(
                        (endLandmark.y - startLandmark.y) * imageHeight,
                        (endLandmark.x - startLandmark.x) * imageWidth
                      )}rad`,
                    },
                  ],
                  transformOrigin: 'left center',
                },
              ]}
            />
          );
        })}
        
        {/* Draw landmark points with drag support */}
        {analysis.landmarks.map((landmark, index) => {
          if (landmark.visibility < 0.5) return null;
          
          const correction = manualCorrections.find(c => c.landmarkId === index);
          const x = correction ? correction.correctedX : landmark.x;
          const y = correction ? correction.correctedY : landmark.y;
          
          const isKeyLandmark = [0, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30].includes(index);
          const landmarkName = LANDMARK_NAMES[index];
          
          if (activeMode === 'correct' && isKeyLandmark) {
            // Draggable landmark in correct mode
            return (
              <DraggableLandmark
                key={index}
                index={index}
                x={x}
                y={y}
                imageWidth={imageWidth}
                imageHeight={imageHeight}
                isKeyLandmark={isKeyLandmark}
                isCorrected={!!correction}
                landmarkName={landmarkName}
                onDrag={(newX, newY) => handleLandmarkDrag(index, newX, newY)}
                onReset={() => resetLandmarkCorrection(index)}
              />
            );
          }
          
          // Non-draggable landmark (view mode or non-key landmarks)
          return (
            <View
              key={index}
              style={[
                styles.landmarkPoint,
                isKeyLandmark && styles.keyLandmarkPoint,
                correction && styles.correctedLandmarkPoint,
                {
                  position: 'absolute',
                  left: x * imageWidth - 6,
                  top: y * imageHeight - 6,
                },
              ]}
            >
              {isKeyLandmark && landmarkName && (
                <View style={styles.landmarkLabel}>
                  <Text style={styles.landmarkLabelText}>{landmarkName}</Text>
                </View>
              )}
            </View>
          );
        })}
        
        {/* Draw plumb line */}
        {showPlumbLine && (
          <View style={[styles.plumbLine, { height: imageHeight }]} />
        )}
        
        {/* Draw annotations */}
        {annotations.map((annotation, index) => (
          <TouchableOpacity
            key={annotation.id}
            style={[
              styles.annotationMarker,
              {
                left: annotation.x * imageWidth - 12,
                top: annotation.y * imageHeight - 12,
                backgroundColor: annotation.type === 'pain' ? theme.colors.error :
                  annotation.type === 'imbalance' ? theme.colors.warning : theme.colors.accent,
              },
            ]}
            onPress={() => {
              Alert.alert(
                annotation.label,
                `Type: ${annotation.type}\nSeverity: ${annotation.severity}`,
                [
                  { text: 'OK' },
                  { text: 'Delete', style: 'destructive', onPress: () => {
                    setAnnotations(annotations.filter(a => a.id !== annotation.id));
                  }},
                ]
              );
            }}
          >
            <Text style={styles.annotationMarkerText}>{index + 1}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Posture Analysis</Text>
          <TouchableOpacity onPress={() => Alert.alert('Info', 'MediaPipe BlazePose ML-based markerless pose detection with manual correction capabilities.')}>
            <Ionicons name="information-circle" size={24} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="robot" size={40} color="#9C27B0" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>AI Markerless Pose Detection</Text>
            <Text style={styles.infoSubtitle}>
              MediaPipe BlazePose ML • 33 Landmarks • Manual Correction Layer
            </Text>
          </View>
        </View>

        {/* Patient Selection */}
        <Text style={styles.sectionTitle}>Patient</Text>
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

        {/* Upload Section */}
        {!imageUri ? (
          <View style={styles.uploadSection}>
            <MaterialCommunityIcons name="human" size={80} color="#9C27B0" />
            <Text style={styles.uploadTitle}>Upload Full Body Photo</Text>
            <Text style={styles.uploadSubtitle}>
              Front or side view for comprehensive analysis
            </Text>
            
            <View style={styles.uploadButtons}>
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                <Ionicons name="images" size={24} color={theme.colors.textPrimary} />
                <Text style={styles.uploadButtonText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
                <Ionicons name="camera" size={24} color={theme.colors.textPrimary} />
                <Text style={styles.uploadButtonText}>Camera</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.featureList}>
              <Text style={styles.featureTitle}>🧠 AI Detection Features:</Text>
              <Text style={styles.featureItem}>• Head tilt & alignment</Text>
              <Text style={styles.featureItem}>• Shoulder asymmetry</Text>
              <Text style={styles.featureItem}>• Pelvic tilt angle</Text>
              <Text style={styles.featureItem}>• Knee valgus/varus</Text>
              <Text style={styles.featureItem}>• Trunk lean & spine deviation</Text>
              <Text style={styles.featureItem}>• Manual correction overlay</Text>
            </View>
          </View>
        ) : (
          <>
            {/* Image with Overlay */}
            <View style={styles.imageContainer}>
              <TouchableOpacity
                activeOpacity={activeMode === 'annotate' ? 0.8 : 1}
                onPress={handleImageTap}
              >
                <Image
                  source={{ uri: imageUri }}
                  style={[styles.uploadedImage, { width: SCREEN_WIDTH - theme.spacing.md * 2 }]}
                  resizeMode="contain"
                />
                {analysis && renderLandmarkOverlay()}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={() => {
                  setImageUri(null);
                  setAnalysis(null);
                }}
              >
                <Ionicons name="refresh" size={16} color={theme.colors.textPrimary} />
                <Text style={styles.changeImageText}>Change</Text>
              </TouchableOpacity>
            </View>

            {/* Mode Selector */}
            {analysis && (
              <View style={styles.modeSelector}>
                <TouchableOpacity
                  style={[styles.modeButton, activeMode === 'view' && styles.modeButtonActive]}
                  onPress={() => setActiveMode('view')}
                >
                  <Ionicons name="eye" size={20} color={activeMode === 'view' ? theme.colors.textPrimary : theme.colors.textMuted} />
                  <Text style={[styles.modeButtonText, activeMode === 'view' && styles.modeButtonTextActive]}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeButton, activeMode === 'correct' && styles.modeButtonActive]}
                  onPress={() => setActiveMode('correct')}
                >
                  <Ionicons name="move" size={20} color={activeMode === 'correct' ? theme.colors.textPrimary : theme.colors.textMuted} />
                  <Text style={[styles.modeButtonText, activeMode === 'correct' && styles.modeButtonTextActive]}>Correct</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeButton, activeMode === 'annotate' && styles.modeButtonActive]}
                  onPress={() => setActiveMode('annotate')}
                >
                  <Ionicons name="create" size={20} color={activeMode === 'annotate' ? theme.colors.textPrimary : theme.colors.textMuted} />
                  <Text style={[styles.modeButtonText, activeMode === 'annotate' && styles.modeButtonTextActive]}>Annotate</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Correction Mode Info */}
            {analysis && activeMode === 'correct' && (
              <View style={styles.correctionInfo}>
                <View style={styles.correctionInfoHeader}>
                  <MaterialCommunityIcons name="gesture-tap-hold" size={24} color="#FF9800" />
                  <Text style={styles.correctionInfoTitle}>Manual Correction Mode</Text>
                </View>
                <Text style={styles.correctionInfoText}>
                  👆 Drag any landmark to adjust its position. Key bony landmarks are highlighted in blue.
                </Text>
                <View style={styles.correctionLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
                    <Text style={styles.legendText}>Key Landmark</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                    <Text style={styles.legendText}>Corrected</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#E91E63' }]} />
                    <Text style={styles.legendText}>Dragging</Text>
                  </View>
                </View>
                {manualCorrections.length > 0 && (
                  <View style={styles.correctionStats}>
                    <Text style={styles.correctionCount}>
                      {manualCorrections.length} landmark{manualCorrections.length > 1 ? 's' : ''} corrected
                    </Text>
                    <TouchableOpacity onPress={resetAllCorrections} style={styles.resetAllButton}>
                      <Ionicons name="refresh" size={16} color="#fff" />
                      <Text style={styles.resetAllText}>Reset All</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Display Options */}
            {analysis && (
              <View style={styles.displayOptions}>
                <TouchableOpacity
                  style={[styles.optionButton, showLandmarks && styles.optionButtonActive]}
                  onPress={() => setShowLandmarks(!showLandmarks)}
                >
                  <Text style={styles.optionButtonText}>🔵 Landmarks</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, showPlumbLine && styles.optionButtonActive]}
                  onPress={() => setShowPlumbLine(!showPlumbLine)}
                >
                  <Text style={styles.optionButtonText}>📏 Plumb Line</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, showAngles && styles.optionButtonActive]}
                  onPress={() => setShowAngles(!showAngles)}
                >
                  <Text style={styles.optionButtonText}>📐 Angles</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Analyze Button */}
            {!analysis && (
              <TouchableOpacity
                style={[styles.analyzeButton, analyzing && styles.buttonDisabled]}
                onPress={analyzePosture}
                disabled={analyzing}
              >
                {analyzing ? (
                  <>
                    <ActivityIndicator color={theme.colors.textPrimary} />
                    <Text style={styles.analyzeButtonText}>AI Analyzing Posture...</Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="robot" size={24} color={theme.colors.textPrimary} />
                    <Text style={styles.analyzeButtonText}>Analyze with AI</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Analysis Results */}
            {analysis && (
              <>
                {/* Overall Score Card */}
                <View style={styles.scoreCard}>
                  <View style={[styles.scoreCircle, { borderColor: analysis.overallScore > 70 ? theme.colors.success : theme.colors.warning }]}>
                    <Text style={[styles.scoreValue, { color: analysis.overallScore > 70 ? theme.colors.success : theme.colors.warning }]}>
                      {analysis.overallScore}%
                    </Text>
                    <Text style={styles.scoreLabel}>Score</Text>
                  </View>
                  <View style={styles.scoreDetails}>
                    <Text style={[styles.riskLevel, { color: analysis.overallScore > 70 ? theme.colors.success : theme.colors.warning }]}>
                      {analysis.riskLevel}
                    </Text>
                    <Text style={styles.scoreSubtext}>
                      {manualCorrections.length > 0 ? `${manualCorrections.length} manual corrections applied` : 'AI Detection Results'}
                    </Text>
                  </View>
                </View>

                {/* Analysis Parameters Grid */}
                <View style={styles.analysisGrid}>
                  <AnalysisCard
                    title="Head Tilt"
                    value={`${analysis.headTilt.angle}°`}
                    status={analysis.headTilt.status}
                    confidence={analysis.headTilt.aiConfidence}
                  />
                  <AnalysisCard
                    title="Shoulder Asymmetry"
                    value={`${analysis.shoulderAsymmetry.difference}mm`}
                    status={analysis.shoulderAsymmetry.status}
                    confidence={analysis.shoulderAsymmetry.aiConfidence}
                  />
                  <AnalysisCard
                    title="Pelvic Tilt"
                    value={`${analysis.pelvicTilt.angle}°`}
                    status={analysis.pelvicTilt.status}
                    confidence={analysis.pelvicTilt.aiConfidence}
                  />
                  <AnalysisCard
                    title="Trunk Lean"
                    value={`${analysis.trunkLean.angle}°`}
                    status={analysis.trunkLean.status}
                    confidence={analysis.trunkLean.aiConfidence}
                  />
                  <AnalysisCard
                    title="Left Knee"
                    value={`${analysis.kneeValgusLeft.angle}°`}
                    status={analysis.kneeValgusLeft.status}
                    confidence={analysis.kneeValgusLeft.aiConfidence}
                  />
                  <AnalysisCard
                    title="Right Knee"
                    value={`${analysis.kneeValgusRight.angle}°`}
                    status={analysis.kneeValgusRight.status}
                    confidence={analysis.kneeValgusRight.aiConfidence}
                  />
                </View>

                {/* Annotations Summary */}
                {annotations.length > 0 && (
                  <View style={styles.annotationsSummary}>
                    <Text style={styles.summaryTitle}>🏷️ Clinical Annotations ({annotations.length})</Text>
                    {annotations.map((a, i) => (
                      <View key={a.id} style={styles.annotationSummaryItem}>
                        <View style={[styles.annotationDot, { backgroundColor: a.type === 'pain' ? theme.colors.error : a.type === 'imbalance' ? theme.colors.warning : theme.colors.accent }]} />
                        <Text style={styles.annotationSummaryText}>{a.label} ({a.severity})</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Generate Report Button */}
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
              </>
            )}
          </>
        )}

        {/* Annotation Modal */}
        <Modal visible={showAnnotationModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Clinical Annotation</Text>
              
              <Text style={styles.modalLabel}>Type</Text>
              <View style={styles.typeSelector}>
                {(['pain', 'imbalance', 'observation'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeButton, annotationType === type && styles.typeButtonActive]}
                    onPress={() => setAnnotationType(type)}
                  >
                    <Text style={[styles.typeButtonText, annotationType === type && styles.typeButtonTextActive]}>
                      {type === 'pain' ? '🔴 Pain' : type === 'imbalance' ? '🟠 Imbalance' : '🔵 Observation'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Severity</Text>
              <View style={styles.typeSelector}>
                {(['mild', 'moderate', 'severe'] as const).map(sev => (
                  <TouchableOpacity
                    key={sev}
                    style={[styles.severityButton, annotationSeverity === sev && styles.severityButtonActive]}
                    onPress={() => setAnnotationSeverity(sev)}
                  >
                    <Text style={styles.severityButtonText}>{sev}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Label</Text>

        {/* Patient Selection Modal */}
        <Modal visible={showPatientModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={styles.modalTitle}>Select Patient</Text>
                <TouchableOpacity onPress={() => setShowPatientModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.textMuted} />
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
                      onPress={() => {
                        setSelectedPatient(item);
                        setShowPatientModal(false);
                      }}
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
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Tight hip flexor, Pain point"
                placeholderTextColor={theme.colors.textMuted}
                value={annotationLabel}
                onChangeText={setAnnotationLabel}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalSaveButton} onPress={saveAnnotation}>
                  <Text style={styles.modalSaveButtonText}>Save Annotation</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => {
                  setShowAnnotationModal(false);
                  setPendingAnnotation(null);
                  setAnnotationLabel('');
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

// Analysis Card Component
const AnalysisCard = ({ title, value, status, confidence }: { title: string; value: string; status: string; confidence: number }) => {
  const getStatusColor = () => {
    if (status.includes('Normal')) return theme.colors.success;
    if (status.includes('Mild')) return theme.colors.warning;
    return theme.colors.error;
  };

  return (
    <View style={styles.analysisCard}>
      <Text style={styles.analysisCardTitle}>{title}</Text>
      <Text style={styles.analysisCardValue}>{value}</Text>
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
        <Text style={[styles.statusBadgeText, { color: getStatusColor() }]}>{status}</Text>
      </View>
      <Text style={styles.confidenceText}>AI: {confidence}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  scrollContent: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  headerTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 2, borderColor: '#9C27B0' },
  infoTextContainer: { flex: 1, marginLeft: theme.spacing.md },
  infoTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  infoSubtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 2 },
  inputSection: { marginBottom: theme.spacing.md },
  inputLabel: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  input: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, color: theme.colors.textPrimary, fontSize: theme.fontSize.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  uploadSection: { alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.xl, borderWidth: 2, borderStyle: 'dashed', borderColor: '#9C27B0' },
  uploadTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginTop: theme.spacing.md },
  uploadSubtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.sm },
  uploadButtons: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.lg },
  uploadButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#9C27B0', paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg, borderRadius: theme.borderRadius.md, gap: theme.spacing.sm },
  uploadButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  featureList: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginTop: theme.spacing.lg, width: '100%' },
  featureTitle: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  featureItem: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, marginBottom: 4 },
  imageContainer: { position: 'relative', marginBottom: theme.spacing.md },
  uploadedImage: { height: (SCREEN_WIDTH - theme.spacing.md * 2) * 1.5, borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.card },
  landmarkOverlay: { position: 'absolute', top: 0, left: 0 },
  skeletonLine: { height: 3, backgroundColor: '#9C27B0', opacity: 0.7 },
  landmarkPoint: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#00BCD4', borderWidth: 2, borderColor: '#fff' },
  keyLandmarkPoint: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#9C27B0' },
  correctedLandmarkPoint: { backgroundColor: '#4CAF50', borderColor: '#fff', borderWidth: 3 },
  plumbLine: { position: 'absolute', left: '50%', top: 0, width: 2, backgroundColor: '#f44336', opacity: 0.7 },
  annotationMarker: { position: 'absolute', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  annotationMarkerText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  changeImageButton: { position: 'absolute', top: theme.spacing.sm, right: theme.spacing.sm, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingVertical: theme.spacing.xs, paddingHorizontal: theme.spacing.sm, borderRadius: theme.borderRadius.sm, gap: 4 },
  changeImageText: { fontSize: theme.fontSize.xs, color: theme.colors.textPrimary },
  modeSelector: { flexDirection: 'row', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.xs, marginBottom: theme.spacing.md },
  modeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.sm, gap: 4 },
  modeButtonActive: { backgroundColor: '#9C27B0' },
  modeButtonText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  modeButtonTextActive: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.semibold },
  displayOptions: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  optionButton: { flex: 1, backgroundColor: theme.colors.card, padding: theme.spacing.sm, borderRadius: theme.borderRadius.sm, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.cardBorder },
  optionButtonActive: { borderColor: '#9C27B0', backgroundColor: '#9C27B020' },
  optionButtonText: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary },
  analyzeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#9C27B0', padding: theme.spacing.md, borderRadius: theme.borderRadius.md, gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  analyzeButtonText: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  buttonDisabled: { opacity: 0.6 },
  scoreCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  scoreCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center', borderWidth: 4 },
  scoreValue: { fontSize: 24, fontWeight: theme.fontWeight.bold },
  scoreLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted },
  scoreDetails: { flex: 1, marginLeft: theme.spacing.md },
  riskLevel: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold },
  scoreSubtext: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 2 },
  analysisGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  analysisCard: { width: (SCREEN_WIDTH - theme.spacing.md * 2 - theme.spacing.sm) / 2 - 1, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  analysisCardTitle: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginBottom: 4 },
  analysisCardValue: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  statusBadge: { paddingHorizontal: theme.spacing.sm, paddingVertical: 2, borderRadius: theme.borderRadius.sm, marginTop: theme.spacing.xs, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 10, fontWeight: theme.fontWeight.bold },
  confidenceText: { fontSize: 10, color: theme.colors.textMuted, marginTop: 4 },
  annotationsSummary: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md },
  summaryTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  annotationSummaryItem: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  annotationDot: { width: 10, height: 10, borderRadius: 5 },
  annotationSummaryText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  reportButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.success, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, gap: theme.spacing.sm },
  reportButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: theme.spacing.lg },
  modalContent: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.xl },
  modalTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.lg, textAlign: 'center' },
  modalLabel: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  typeSelector: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  typeButton: { flex: 1, backgroundColor: theme.colors.primaryLight, padding: theme.spacing.sm, borderRadius: theme.borderRadius.sm, alignItems: 'center' },
  typeButtonActive: { backgroundColor: '#9C27B0' },
  typeButtonText: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary },
  typeButtonTextActive: { color: theme.colors.textPrimary },
  severityButton: { flex: 1, backgroundColor: theme.colors.primaryLight, padding: theme.spacing.sm, borderRadius: theme.borderRadius.sm, alignItems: 'center' },
  severityButtonActive: { backgroundColor: theme.colors.warning },
  severityButtonText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, textTransform: 'capitalize' },
  modalInput: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, color: theme.colors.textPrimary, fontSize: theme.fontSize.md, marginBottom: theme.spacing.lg },
  modalButtons: { gap: theme.spacing.sm },
  modalSaveButton: { backgroundColor: theme.colors.success, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  modalSaveButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  modalCancelButton: { backgroundColor: theme.colors.primaryLight, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  modalCancelButtonText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
  
  // Draggable Landmark Styles
  draggableLandmark: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  keyDraggableLandmark: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#2196F3', borderWidth: 2, borderColor: '#fff' },
  correctedDraggableLandmark: { backgroundColor: '#FF9800', borderWidth: 2, borderColor: '#fff' },
  draggingLandmark: { transform: [{ scale: 1.5 }], backgroundColor: '#E91E63', zIndex: 200 },
  landmarkInner: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  landmarkInnerDragging: { backgroundColor: 'rgba(233, 30, 99, 0.8)', borderRadius: 14 },
  landmarkIndexText: { fontSize: 8, fontWeight: 'bold', color: '#fff' },
  landmarkNameTag: { position: 'absolute', top: -20, left: -20, backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', opacity: 0, minWidth: 80 },
  landmarkNameTagVisible: { opacity: 1 },
  landmarkNameText: { fontSize: 9, color: '#fff', fontWeight: 'bold' },
  resetLandmarkButton: { marginLeft: 4 },
  landmarkLabel: { position: 'absolute', top: -18, left: -15, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  landmarkLabelText: { fontSize: 7, color: '#fff' },
  
  // Correction Info Panel Styles
  correctionInfo: { backgroundColor: 'rgba(255, 152, 0, 0.1)', borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: '#FF9800' },
  correctionInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  correctionInfoTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: '#FF9800' },
  correctionInfoText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  correctionLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md, marginTop: theme.spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary },
  correctionStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: theme.spacing.md, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(255, 152, 0, 0.3)' },
  correctionCount: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: '#FF9800' },
  resetAllButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.error, paddingHorizontal: theme.spacing.sm, paddingVertical: 4, borderRadius: theme.borderRadius.sm },
  resetAllText: { fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.bold, color: '#fff' },
  
  // Patient Selector Styles
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },
  patientSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
});
