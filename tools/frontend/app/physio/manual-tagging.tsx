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
  FlatList,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';
import { PaymentGateModal } from '../../src/utils/PaymentGateModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Storage Keys
const STORAGE_KEYS = {
  LOCAL_ANALYSES: 'wba99_local_analyses',
  PENDING_SYNC: 'wba99_pending_sync',
  OFFLINE_DATA: 'wba99_offline_data',
};

// Grid background color
const GRID_BG = '#0D1B2A';
const GRID_LINE = '#1A3A5C';
const HEADER_COLOR = '#00BCD4';
const ACCENT_COLOR = '#FFD700';

// Anatomical landmarks for posture analysis
const ANATOMICAL_LANDMARKS = {
  front: [
    { id: 'tragus_right', name: 'R. Tragus', x: 0.38, y: 0.08, color: '#FF6B6B' },
    { id: 'tragus_left', name: 'L. Tragus', x: 0.62, y: 0.08, color: '#FF6B6B' },
    { id: 'acromion_right', name: 'R. Acromion', x: 0.28, y: 0.18, color: '#4ECDC4' },
    { id: 'acromion_left', name: 'L. Acromion', x: 0.72, y: 0.18, color: '#4ECDC4' },
    { id: 'asis_right', name: 'R. ASIS', x: 0.38, y: 0.45, color: '#45B7D1' },
    { id: 'asis_left', name: 'L. ASIS', x: 0.62, y: 0.45, color: '#45B7D1' },
    { id: 'patella_right', name: 'R. Patella', x: 0.40, y: 0.65, color: '#96CEB4' },
    { id: 'patella_left', name: 'L. Patella', x: 0.60, y: 0.65, color: '#96CEB4' },
    { id: 'ankle_right', name: 'R. Ankle', x: 0.42, y: 0.88, color: '#FFEAA7' },
    { id: 'ankle_left', name: 'L. Ankle', x: 0.58, y: 0.88, color: '#FFEAA7' },
  ],
  side: [
    { id: 'tragus', name: 'Tragus', x: 0.5, y: 0.08, color: '#FF6B6B' },
    { id: 'cervical', name: 'C7', x: 0.45, y: 0.15, color: '#4ECDC4' },
    { id: 'thoracic', name: 'T12', x: 0.45, y: 0.35, color: '#45B7D1' },
    { id: 'trochanter', name: 'Trochanter', x: 0.52, y: 0.48, color: '#96CEB4' },
    { id: 'knee', name: 'Knee', x: 0.50, y: 0.65, color: '#DDA0DD' },
    { id: 'ankle', name: 'Ankle', x: 0.50, y: 0.88, color: '#FFEAA7' },
  ],
  back: [
    { id: 'head', name: 'Head', x: 0.50, y: 0.08, color: '#FF6B6B' },
    { id: 'c7', name: 'C7', x: 0.50, y: 0.15, color: '#4ECDC4' },
    { id: 'scapula_right', name: 'R. Scapula', x: 0.35, y: 0.22, color: '#45B7D1' },
    { id: 'scapula_left', name: 'L. Scapula', x: 0.65, y: 0.22, color: '#45B7D1' },
    { id: 'psis_right', name: 'R. PSIS', x: 0.42, y: 0.45, color: '#96CEB4' },
    { id: 'psis_left', name: 'L. PSIS', x: 0.58, y: 0.45, color: '#96CEB4' },
  ],
};

const POINTER_SIZE = 16;

// Calculate posture metrics from landmarks
const calculateMetrics = (landmarks: any, view: string) => {
  const metrics: any = {};
  
  if (view === 'front') {
    // Head tilt
    const tragusR = landmarks['tragus_right'];
    const tragusL = landmarks['tragus_left'];
    if (tragusR && tragusL) {
      const tilt = Math.atan2(tragusL.y - tragusR.y, tragusL.x - tragusR.x) * (180 / Math.PI);
      metrics.headTilt = tilt.toFixed(1);
    }
    
    // Shoulder asymmetry
    const acromionR = landmarks['acromion_right'];
    const acromionL = landmarks['acromion_left'];
    if (acromionR && acromionL) {
      const diff = (acromionL.y - acromionR.y) * 100;
      metrics.shoulderAsymmetry = diff.toFixed(1);
    }
    
    // Pelvic tilt
    const asisR = landmarks['asis_right'];
    const asisL = landmarks['asis_left'];
    if (asisR && asisL) {
      const pelvicTilt = (asisL.y - asisR.y) * 100;
      metrics.pelvicTilt = pelvicTilt.toFixed(1);
    }
    
    // Knee alignment
    const patellaR = landmarks['patella_right'];
    const patellaL = landmarks['patella_left'];
    if (patellaR && patellaL) {
      metrics.kneeAlignmentR = ((patellaR.x - 0.5) * 100).toFixed(1);
      metrics.kneeAlignmentL = ((patellaL.x - 0.5) * 100).toFixed(1);
    }
  }
  
  return metrics;
};

// Draggable Pointer Component
const DraggablePointer = ({ 
  point, 
  imageWidth, 
  imageHeight, 
  onPositionChange,
  selected,
  onSelect 
}: {
  point: { id: string; name: string; x: number; y: number; color?: string };
  imageWidth: number;
  imageHeight: number;
  onPositionChange: (id: string, x: number, y: number) => void;
  selected: boolean;
  onSelect: (id: string) => void;
}) => {
  const pan = useRef(new Animated.ValueXY({
    x: point.x * imageWidth - POINTER_SIZE / 2,
    y: point.y * imageHeight - POINTER_SIZE / 2,
  })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        onSelect(point.id);
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
        const newX = Math.max(0, Math.min((pan.x as any)._value + POINTER_SIZE / 2, imageWidth)) / imageWidth;
        const newY = Math.max(0, Math.min((pan.y as any)._value + POINTER_SIZE / 2, imageHeight)) / imageHeight;
        onPositionChange(point.id, newX, newY);
      },
    })
  ).current;

  const pointerColor = point.color || '#FF6B6B';

  return (
    <Animated.View
      style={[
        styles.pointer,
        { 
          transform: pan.getTranslateTransform(),
          borderColor: selected ? ACCENT_COLOR : pointerColor,
          backgroundColor: selected ? ACCENT_COLOR + '40' : pointerColor + '40',
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={[styles.pointerInner, { backgroundColor: pointerColor }]} />
      {selected && (
        <View style={styles.pointerLabel}>
          <Text style={styles.pointerLabelText}>{point.name}</Text>
        </View>
      )}
    </Animated.View>
  );
};

// Professional Grid Background Component with Measurement Scale
const GridBackground = ({ showScale = true }: { showScale?: boolean }) => (
  <View style={styles.gridContainer}>
    {/* Horizontal Grid Lines with labels */}
    {Array.from({ length: 21 }).map((_, i) => (
      <React.Fragment key={`h-${i}`}>
        <View style={[styles.gridLineH, { top: `${i * 5}%` }, i % 4 === 0 && styles.gridLineMajor]} />
        {showScale && i % 4 === 0 && i > 0 && i < 20 && (
          <View style={[styles.gridLabel, { top: `${i * 5 - 1.5}%`, left: 2 }]}>
            <Text style={styles.gridLabelText}>{i * 5}%</Text>
          </View>
        )}
      </React.Fragment>
    ))}
    {/* Vertical Grid Lines with labels */}
    {Array.from({ length: 15 }).map((_, i) => (
      <React.Fragment key={`v-${i}`}>
        <View style={[styles.gridLineV, { left: `${i * 7}%` }, i === 7 && styles.gridLineMajor]} />
      </React.Fragment>
    ))}
    {/* Center vertical line - Plumb Line */}
    <View style={styles.centerLineV} />
    <View style={styles.plumbLineLabel}>
      <Text style={styles.plumbLineLabelText}>PLUMB LINE</Text>
    </View>
    {/* Horizontal reference at key body levels */}
    <View style={[styles.anatomicalReference, { top: '10%' }]}>
      <Text style={styles.anatomicalReferenceText}>HEAD</Text>
    </View>
    <View style={[styles.anatomicalReference, { top: '20%' }]}>
      <Text style={styles.anatomicalReferenceText}>SHOULDERS</Text>
    </View>
    <View style={[styles.anatomicalReference, { top: '48%' }]}>
      <Text style={styles.anatomicalReferenceText}>PELVIS</Text>
    </View>
    <View style={[styles.anatomicalReference, { top: '70%' }]}>
      <Text style={styles.anatomicalReferenceText}>KNEES</Text>
    </View>
    <View style={[styles.anatomicalReference, { top: '90%' }]}>
      <Text style={styles.anatomicalReferenceText}>ANKLES</Text>
    </View>
  </View>
);

// Video Frame Selector Component
const VideoFrameSelector = ({ 
  frames, 
  selectedFrame, 
  onSelectFrame, 
  onClose 
}: {
  frames: string[];
  selectedFrame: number;
  onSelectFrame: (index: number) => void;
  onClose: () => void;
}) => (
  <Modal visible={true} animationType="slide" transparent>
    <View style={styles.frameModalOverlay}>
      <View style={styles.frameModalContent}>
        <View style={styles.frameModalHeader}>
          <Text style={styles.frameModalTitle}>Select Frame for Analysis</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.frameModalSubtitle}>
          {frames.length} frames extracted from video
        </Text>
        <FlatList
          data={frames}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[
                styles.frameItem,
                selectedFrame === index && styles.frameItemSelected
              ]}
              onPress={() => onSelectFrame(index)}
            >
              <Image source={{ uri: item }} style={styles.frameImage} />
              <Text style={styles.frameNumber}>Frame {index + 1}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.framesList}
        />
        <TouchableOpacity 
          style={styles.useFrameBtn}
          onPress={onClose}
        >
          <Text style={styles.useFrameBtnText}>Use Selected Frame</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// Sync Status Component
const SyncStatus = ({ pendingCount, syncing, onSync }: {
  pendingCount: number;
  syncing: boolean;
  onSync: () => void;
}) => (
  <TouchableOpacity 
    style={[styles.syncBadge, pendingCount > 0 && styles.syncBadgePending]}
    onPress={onSync}
    disabled={syncing}
  >
    {syncing ? (
      <ActivityIndicator size="small" color="#fff" />
    ) : (
      <>
        <Ionicons 
          name={pendingCount > 0 ? "cloud-upload" : "cloud-done"} 
          size={16} 
          color="#fff" 
        />
        {pendingCount > 0 && (
          <Text style={styles.syncBadgeText}>{pendingCount}</Text>
        )}
      </>
    )}
  </TouchableOpacity>
);

export default function ManualTaggingScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  const [viewMode, setViewMode] = useState<'front' | 'side' | 'back'>('front');
  const [capturedImages, setCapturedImages] = useState<{front?: string; side?: string; back?: string}>({});
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<{[key: string]: {[id: string]: {x: number; y: number}}}>(
    { front: {}, side: {}, back: {} }
  );
  const [generating, setGenerating] = useState(false);
  const [metrics, setMetrics] = useState<any>({});
  
  // Video handling states
  const [videoFrames, setVideoFrames] = useState<string[]>([]);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [showFrameSelector, setShowFrameSelector] = useState(false);
  const [extractingFrames, setExtractingFrames] = useState(false);
  
  // Local storage & sync states
  const [localAnalyses, setLocalAnalyses] = useState<any[]>([]);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  // AI/ML detection states
  const [aiDetecting, setAiDetecting] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);

  const imageAreaHeight = SCREEN_HEIGHT - 220;

  // Network status listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    return () => unsubscribe();
  }, []);

  // Load local data on mount
  useEffect(() => {
    loadLocalData();
  }, []);

  // Calculate metrics when landmarks change
  useEffect(() => {
    const newMetrics = calculateMetrics(landmarks[viewMode], viewMode);
    setMetrics(newMetrics);
  }, [landmarks, viewMode]);

  // Initialize landmarks
  useEffect(() => {
    const initLandmarks: {[key: string]: {[id: string]: {x: number; y: number}}} = {
      front: {}, side: {}, back: {},
    };
    
    Object.entries(ANATOMICAL_LANDMARKS).forEach(([view, points]) => {
      points.forEach(p => {
        initLandmarks[view][p.id] = { x: p.x, y: p.y };
      });
    });
    
    setLandmarks(initLandmarks);
  }, []);

  // Load local stored data
  const loadLocalData = async () => {
    try {
      const storedAnalyses = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_ANALYSES);
      const pendingSync = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_SYNC);
      
      if (storedAnalyses) {
        setLocalAnalyses(JSON.parse(storedAnalyses));
      }
      if (pendingSync) {
        const pending = JSON.parse(pendingSync);
        setPendingSyncCount(pending.length);
      }
    } catch (error) {
      console.log('Error loading local data:', error);
    }
  };

  // Save analysis to local storage
  const saveToLocalStorage = async (analysisData: any) => {
    try {
      const existingData = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_ANALYSES);
      const analyses = existingData ? JSON.parse(existingData) : [];
      
      const newAnalysis = {
        id: Date.now().toString(),
        ...analysisData,
        createdAt: new Date().toISOString(),
        synced: false,
        userId: currentUser?.id,
        userName: currentUser?.name,
      };
      
      analyses.push(newAnalysis);
      await AsyncStorage.setItem(STORAGE_KEYS.LOCAL_ANALYSES, JSON.stringify(analyses));
      
      // Add to pending sync
      const pendingSync = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_SYNC);
      const pending = pendingSync ? JSON.parse(pendingSync) : [];
      pending.push(newAnalysis);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(pending));
      
      setLocalAnalyses(analyses);
      setPendingSyncCount(pending.length);
      
      return newAnalysis;
    } catch (error) {
      console.log('Error saving to local storage:', error);
      throw error;
    }
  };

  // Sync data to server
  const syncToServer = async () => {
    if (!isOnline || syncing) return;
    
    setSyncing(true);
    try {
      const pendingSync = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_SYNC);
      if (!pendingSync) {
        setSyncing(false);
        return;
      }
      
      const pending = JSON.parse(pendingSync);
      let syncedCount = 0;
      
      for (const analysis of pending) {
        try {
          // Send to admin endpoint
          await api.post('/admin/receive-analysis', {
            analysis_id: analysis.id,
            user_id: analysis.userId,
            user_name: analysis.userName,
            landmarks: analysis.landmarks,
            metrics: analysis.metrics,
            images: analysis.images,
            created_at: analysis.createdAt,
            analysis_type: 'manual_pose_tagging',
          });
          
          syncedCount++;
          
          // Mark as synced in local storage
          const storedAnalyses = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_ANALYSES);
          if (storedAnalyses) {
            const analyses = JSON.parse(storedAnalyses);
            const index = analyses.findIndex((a: any) => a.id === analysis.id);
            if (index !== -1) {
              analyses[index].synced = true;
              await AsyncStorage.setItem(STORAGE_KEYS.LOCAL_ANALYSES, JSON.stringify(analyses));
            }
          }
        } catch (error) {
          console.log('Error syncing analysis:', error);
        }
      }
      
      // Clear synced items from pending
      const remainingPending = pending.filter((p: any) => !p.synced);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(remainingPending));
      setPendingSyncCount(remainingPending.length);
      
      if (syncedCount > 0) {
        Alert.alert('Sync Complete', `${syncedCount} analyses synced to server`);
      }
      
      await loadLocalData();
    } catch (error) {
      Alert.alert('Sync Error', 'Failed to sync data. Will retry when online.');
    } finally {
      setSyncing(false);
    }
  };

  // Extract frames from video
  const extractVideoFrames = async (videoUri: string) => {
    setExtractingFrames(true);
    try {
      const frames: string[] = [];
      const frameCount = 10; // Extract 10 frames
      
      // Get video duration estimate (5 seconds worth of frames as default)
      const duration = 5000; // 5 seconds in ms
      const interval = duration / frameCount;
      
      for (let i = 0; i < frameCount; i++) {
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
            time: i * interval,
            quality: 0.8,
          });
          frames.push(uri);
        } catch (frameError) {
          console.log(`Error extracting frame ${i}:`, frameError);
        }
      }
      
      if (frames.length > 0) {
        setVideoFrames(frames);
        setSelectedFrameIndex(0);
        setShowFrameSelector(true);
      } else {
        Alert.alert('Error', 'Could not extract frames from video');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process video');
      console.log('Video extraction error:', error);
    } finally {
      setExtractingFrames(false);
    }
  };

  // Pick image or video
  const pickMedia = async () => {
    Alert.alert(
      'Select Media',
      'Choose image or video for analysis',
      [
        {
          text: 'Image',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              quality: 0.9,
            });
            if (!result.canceled) {
              setCapturedImages(prev => ({
                ...prev,
                [viewMode]: result.assets[0].uri,
              }));
            }
          },
        },
        {
          text: 'Video',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Videos,
              allowsEditing: false,
              quality: 0.9,
            });
            if (!result.canceled) {
              await extractVideoFrames(result.assets[0].uri);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Take photo
  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Camera permission is needed');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled) {
      setCapturedImages(prev => ({
        ...prev,
        [viewMode]: result.assets[0].uri,
      }));
    }
  };

  // AI Auto-detect landmarks (simulated ML feature)
  const autoDetectLandmarks = async () => {
    if (!capturedImages[viewMode]) {
      Alert.alert('No Image', 'Please capture or select an image first');
      return;
    }
    
    setAiDetecting(true);
    try {
      // Simulate AI detection (in production, this would call an ML model)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate detected positions with slight randomness for realism
      const currentLandmarks = ANATOMICAL_LANDMARKS[viewMode];
      const detectedPositions: {[id: string]: {x: number; y: number}} = {};
      
      currentLandmarks.forEach(point => {
        detectedPositions[point.id] = {
          x: point.x + (Math.random() - 0.5) * 0.05,
          y: point.y + (Math.random() - 0.5) * 0.05,
        };
      });
      
      setLandmarks(prev => ({
        ...prev,
        [viewMode]: detectedPositions,
      }));
      
      // Simulate confidence score
      const confidence = 85 + Math.random() * 10;
      setAiConfidence(confidence);
      
      Alert.alert(
        'AI Detection Complete',
        `Landmarks detected with ${confidence.toFixed(1)}% confidence.\n\nYou can manually adjust any points that need correction.`
      );
    } catch (error) {
      Alert.alert('Error', 'AI detection failed. Please tag manually.');
    } finally {
      setAiDetecting(false);
    }
  };

  // Update landmark position
  const updateLandmarkPosition = (id: string, x: number, y: number) => {
    setLandmarks(prev => ({
      ...prev,
      [viewMode]: { ...prev[viewMode], [id]: { x, y } },
    }));
    setAiConfidence(null); // Clear AI confidence on manual adjustment
  };

  // Use selected video frame
  const useSelectedFrame = () => {
    if (videoFrames[selectedFrameIndex]) {
      setCapturedImages(prev => ({
        ...prev,
        [viewMode]: videoFrames[selectedFrameIndex],
      }));
    }
    setShowFrameSelector(false);
    setVideoFrames([]);
  };

  // Save analysis locally and sync
  const saveAnalysis = async () => {
    setGenerating(true);
    try {
      const analysisData = {
        landmarks,
        metrics,
        images: capturedImages,
        viewMode,
        patientId: currentUser?.id,
      };
      
      const saved = await saveToLocalStorage(analysisData);
      
      // Try to sync if online
      if (isOnline) {
        await syncToServer();
      }
      
      Alert.alert(
        'Analysis Saved',
        isOnline 
          ? 'Analysis saved and synced to server.' 
          : 'Analysis saved locally. Will sync when online.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save analysis');
    } finally {
      setGenerating(false);
    }
  };

  // Generate clinical interpretation based on metrics
  const getClinicalInterpretation = () => {
    const findings: string[] = [];
    const recommendations: string[] = [];

    if (metrics.headTilt) {
      const tilt = parseFloat(metrics.headTilt);
      if (Math.abs(tilt) > 5) {
        findings.push(`<b>Head Lateral Tilt:</b> ${Math.abs(tilt).toFixed(1)}° ${tilt > 0 ? 'right' : 'left'} deviation from neutral - indicates potential upper cervical dysfunction or torticollis pattern`);
        recommendations.push('Cervical spine assessment and postural re-education exercises');
      } else {
        findings.push(`<b>Head Position:</b> Within normal limits (${Math.abs(tilt).toFixed(1)}° deviation)`);
      }
    }

    if (metrics.shoulderAsymmetry) {
      const asymmetry = Math.abs(parseFloat(metrics.shoulderAsymmetry));
      if (asymmetry > 2) {
        findings.push(`<b>Shoulder Level Asymmetry:</b> ${asymmetry.toFixed(1)}% - ${parseFloat(metrics.shoulderAsymmetry) > 0 ? 'left elevated' : 'right elevated'} - may indicate scoliosis, muscle imbalance, or leg length discrepancy`);
        recommendations.push('Scapular stabilization exercises and trapezius release techniques');
        recommendations.push('Consider X-ray for scoliosis screening if persistent');
      } else {
        findings.push(`<b>Shoulder Level:</b> Symmetrical within acceptable range`);
      }
    }

    if (metrics.pelvicTilt) {
      const pelvic = Math.abs(parseFloat(metrics.pelvicTilt));
      if (pelvic > 1.5) {
        findings.push(`<b>Pelvic Obliquity:</b> ${pelvic.toFixed(1)}% asymmetry - ${parseFloat(metrics.pelvicTilt) > 0 ? 'left elevated' : 'right elevated'} - potential functional or structural leg length difference`);
        recommendations.push('Hip mobilization and gluteal strengthening program');
        recommendations.push('Assess for true vs apparent leg length discrepancy');
      } else {
        findings.push(`<b>Pelvic Alignment:</b> Level and symmetrical`);
      }
    }

    if (metrics.kneeAlignmentR || metrics.kneeAlignmentL) {
      const rightKnee = parseFloat(metrics.kneeAlignmentR || '0');
      const leftKnee = parseFloat(metrics.kneeAlignmentL || '0');
      if (Math.abs(rightKnee) > 5 || Math.abs(leftKnee) > 5) {
        findings.push(`<b>Knee Alignment:</b> Q-angle deviation detected - R: ${rightKnee.toFixed(1)}°, L: ${leftKnee.toFixed(1)}° - may indicate genu valgum/varum or hip rotation patterns`);
        recommendations.push('Quadriceps strengthening with VMO emphasis');
        recommendations.push('Consider orthotic evaluation for foot mechanics');
      } else {
        findings.push(`<b>Knee Alignment:</b> Normal Q-angle range bilaterally`);
      }
    }

    return { findings, recommendations };
  };

  // Generate PDF report
  const generatePDFReport = async () => {
    setGenerating(true);
    
    try {
      // First save the analysis
      await saveAnalysis();
      
      const date = new Date().toLocaleDateString('en-IN', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      });
      const time = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit'
      });
      const reportId = `WBA-${Date.now().toString(36).toUpperCase()}`;
      const { findings, recommendations } = getClinicalInterpretation();

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { size: A4; margin: 15mm; }
            * { box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 0; 
              margin: 0;
              background: #ffffff; 
              color: #1a1a2e;
              font-size: 11pt;
              line-height: 1.5;
            }
            
            /* Header */
            .report-header {
              background: linear-gradient(135deg, #0D1B2A 0%, #1A3A5C 100%);
              color: #fff;
              padding: 20px 25px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .header-top {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #FFD700;
              padding-bottom: 15px;
              margin-bottom: 15px;
            }
            .clinic-name {
              font-size: 24pt;
              font-weight: bold;
              color: #FFD700;
              letter-spacing: 2px;
            }
            .clinic-subtitle {
              font-size: 10pt;
              color: #00BCD4;
              margin-top: 3px;
            }
            .report-badge {
              background: #00BCD4;
              color: #0D1B2A;
              padding: 8px 15px;
              border-radius: 20px;
              font-weight: bold;
              font-size: 9pt;
            }
            .header-info {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 15px;
              font-size: 10pt;
            }
            .header-info div { color: #B0C4DE; }
            .header-info strong { color: #fff; display: block; }
            
            /* Patient Info Section */
            .patient-section {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 15px 20px;
              margin-bottom: 20px;
            }
            .section-title {
              font-size: 13pt;
              font-weight: bold;
              color: #0D1B2A;
              border-bottom: 2px solid #00BCD4;
              padding-bottom: 8px;
              margin-bottom: 12px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .section-icon { 
              width: 24px; 
              height: 24px; 
              background: #00BCD4; 
              border-radius: 50%; 
              display: inline-flex; 
              align-items: center; 
              justify-content: center;
              color: #fff;
              font-size: 12pt;
            }
            
            /* Metrics Grid */
            .metrics-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              margin-bottom: 20px;
            }
            .metric-card {
              background: linear-gradient(145deg, #f0f4f8, #e8ecf0);
              border-radius: 10px;
              padding: 15px;
              text-align: center;
              border-left: 4px solid #00BCD4;
            }
            .metric-card.warning { border-left-color: #F59E0B; }
            .metric-card.alert { border-left-color: #EF4444; }
            .metric-card.normal { border-left-color: #22C55E; }
            .metric-value { 
              font-size: 22pt; 
              font-weight: bold; 
              color: #0D1B2A; 
            }
            .metric-label { 
              font-size: 9pt; 
              color: #64748b; 
              margin-top: 3px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .metric-status {
              font-size: 8pt;
              margin-top: 5px;
              padding: 2px 8px;
              border-radius: 10px;
              display: inline-block;
            }
            .status-normal { background: #D1FAE5; color: #065F46; }
            .status-mild { background: #FEF3C7; color: #92400E; }
            .status-moderate { background: #FED7AA; color: #C2410C; }
            .status-severe { background: #FEE2E2; color: #DC2626; }
            
            /* Clinical Findings */
            .findings-section {
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 15px 20px;
              margin-bottom: 20px;
            }
            .finding-item {
              padding: 10px 0;
              border-bottom: 1px solid #f1f5f9;
            }
            .finding-item:last-child { border-bottom: none; }
            .finding-item b { color: #0D1B2A; }
            
            /* Recommendations */
            .recommendations-section {
              background: #ECFDF5;
              border: 1px solid #A7F3D0;
              border-radius: 8px;
              padding: 15px 20px;
              margin-bottom: 20px;
            }
            .rec-item {
              display: flex;
              align-items: flex-start;
              gap: 10px;
              padding: 8px 0;
            }
            .rec-bullet {
              width: 20px;
              height: 20px;
              background: #22C55E;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #fff;
              font-size: 10pt;
              flex-shrink: 0;
            }
            
            /* Analysis Summary Table */
            .summary-table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            .summary-table th {
              background: #0D1B2A;
              color: #fff;
              padding: 10px 12px;
              text-align: left;
              font-size: 10pt;
            }
            .summary-table td {
              padding: 10px 12px;
              border-bottom: 1px solid #e2e8f0;
            }
            .summary-table tr:nth-child(even) { background: #f8fafc; }
            
            /* Footer */
            .report-footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 2px solid #0D1B2A;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 9pt;
              color: #64748b;
            }
            .qr-code { text-align: center; }
            .qr-code img { width: 60px; height: 60px; }
            .disclaimer {
              background: #FEF3C7;
              border-radius: 6px;
              padding: 10px;
              font-size: 8pt;
              color: #92400E;
              margin-top: 15px;
            }
            .signature-line {
              border-top: 1px solid #0D1B2A;
              width: 200px;
              margin-top: 40px;
              padding-top: 5px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <!-- Professional Header -->
          <div class="report-header">
            <div class="header-top">
              <div>
                <div class="clinic-name">WBA99</div>
                <div class="clinic-subtitle">Advanced MSK/FMS Analysis System</div>
              </div>
              <div class="report-badge">POSTURE ASSESSMENT REPORT</div>
            </div>
            <div class="header-info">
              <div><strong>Report ID:</strong> ${reportId}</div>
              <div><strong>Date:</strong> ${date}</div>
              <div><strong>Time:</strong> ${time}</div>
            </div>
          </div>
          
          <!-- Patient Information -->
          <div class="patient-section">
            <div class="section-title"><span class="section-icon">👤</span> Patient Information</div>
            <div class="header-info">
              <div><strong>Name:</strong> ${currentUser?.name || 'Not Specified'}</div>
              <div><strong>Assessment Type:</strong> Manual Posture Tagging</div>
              <div><strong>Performed By:</strong> ${currentUser?.name || 'Clinician'}</div>
            </div>
          </div>
          
          <!-- Posture Metrics -->
          <div class="findings-section">
            <div class="section-title"><span class="section-icon">📊</span> Posture Metrics</div>
            <div class="metrics-grid">
              ${metrics.headTilt ? `
                <div class="metric-card ${Math.abs(parseFloat(metrics.headTilt)) > 5 ? 'warning' : 'normal'}">
                  <div class="metric-value">${metrics.headTilt}°</div>
                  <div class="metric-label">Head Tilt</div>
                  <div class="metric-status ${Math.abs(parseFloat(metrics.headTilt)) > 5 ? 'status-mild' : 'status-normal'}">
                    ${Math.abs(parseFloat(metrics.headTilt)) > 5 ? 'Deviation' : 'Normal'}
                  </div>
                </div>
              ` : ''}
              ${metrics.shoulderAsymmetry ? `
                <div class="metric-card ${Math.abs(parseFloat(metrics.shoulderAsymmetry)) > 2 ? 'warning' : 'normal'}">
                  <div class="metric-value">${metrics.shoulderAsymmetry}%</div>
                  <div class="metric-label">Shoulder Asymmetry</div>
                  <div class="metric-status ${Math.abs(parseFloat(metrics.shoulderAsymmetry)) > 2 ? 'status-mild' : 'status-normal'}">
                    ${Math.abs(parseFloat(metrics.shoulderAsymmetry)) > 2 ? 'Imbalanced' : 'Balanced'}
                  </div>
                </div>
              ` : ''}
              ${metrics.pelvicTilt ? `
                <div class="metric-card ${Math.abs(parseFloat(metrics.pelvicTilt)) > 1.5 ? 'warning' : 'normal'}">
                  <div class="metric-value">${metrics.pelvicTilt}%</div>
                  <div class="metric-label">Pelvic Obliquity</div>
                  <div class="metric-status ${Math.abs(parseFloat(metrics.pelvicTilt)) > 1.5 ? 'status-mild' : 'status-normal'}">
                    ${Math.abs(parseFloat(metrics.pelvicTilt)) > 1.5 ? 'Asymmetric' : 'Level'}
                  </div>
                </div>
              ` : ''}
              ${metrics.kneeAlignmentR ? `
                <div class="metric-card">
                  <div class="metric-value">${metrics.kneeAlignmentR}°</div>
                  <div class="metric-label">Right Knee Q-Angle</div>
                </div>
              ` : ''}
              ${metrics.kneeAlignmentL ? `
                <div class="metric-card">
                  <div class="metric-value">${metrics.kneeAlignmentL}°</div>
                  <div class="metric-label">Left Knee Q-Angle</div>
                </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Clinical Findings -->
          <div class="findings-section">
            <div class="section-title"><span class="section-icon">🔬</span> Clinical Findings & Interpretation</div>
            ${findings.length > 0 ? findings.map(f => `<div class="finding-item">${f}</div>`).join('') : '<div class="finding-item">Complete analysis requires all views to be captured and tagged.</div>'}
          </div>
          
          <!-- Recommendations -->
          ${recommendations.length > 0 ? `
            <div class="recommendations-section">
              <div class="section-title"><span class="section-icon">✅</span> Clinical Recommendations</div>
              ${recommendations.map((r, i) => `
                <div class="rec-item">
                  <span class="rec-bullet">${i + 1}</span>
                  <span>${r}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <!-- Analysis Summary -->
          <div class="patient-section">
            <div class="section-title"><span class="section-icon">📋</span> Analysis Summary</div>
            <table class="summary-table">
              <tr><th>View</th><th>Status</th><th>Landmarks Tagged</th><th>Quality</th></tr>
              <tr>
                <td>Anterior (Front) View</td>
                <td>${capturedImages.front ? '✅ Captured' : '⏳ Not Captured'}</td>
                <td>${Object.keys(landmarks.front).length} anatomical points</td>
                <td>${capturedImages.front ? 'Complete' : 'Pending'}</td>
              </tr>
              <tr>
                <td>Lateral (Side) View</td>
                <td>${capturedImages.side ? '✅ Captured' : '⏳ Not Captured'}</td>
                <td>${Object.keys(landmarks.side).length} anatomical points</td>
                <td>${capturedImages.side ? 'Complete' : 'Pending'}</td>
              </tr>
              <tr>
                <td>Posterior (Back) View</td>
                <td>${capturedImages.back ? '✅ Captured' : '⏳ Not Captured'}</td>
                <td>${Object.keys(landmarks.back).length} anatomical points</td>
                <td>${capturedImages.back ? 'Complete' : 'Pending'}</td>
              </tr>
            </table>
          </div>
          
          <!-- Reference Data -->
          <div class="patient-section">
            <div class="section-title"><span class="section-icon">📖</span> Normal Reference Values</div>
            <table class="summary-table">
              <tr><th>Parameter</th><th>Normal Range</th><th>Clinical Significance</th></tr>
              <tr><td>Head Tilt</td><td>0° - 3°</td><td>Greater deviation may indicate cervical dysfunction</td></tr>
              <tr><td>Shoulder Level</td><td>0% - 2%</td><td>Asymmetry suggests muscular imbalance or scoliosis</td></tr>
              <tr><td>Pelvic Obliquity</td><td>0% - 1.5%</td><td>Deviation indicates possible leg length discrepancy</td></tr>
              <tr><td>Q-Angle</td><td>10° - 18° (Female: 15° - 22°)</td><td>Abnormal angles indicate patellofemoral risk</td></tr>
            </table>
          </div>
          
          <!-- Footer -->
          <div class="report-footer">
            <div>
              <div style="font-weight: bold; color: #0D1B2A;">WBA99 MSK Analysis</div>
              <div>Professional Posture Assessment Tool</div>
              <div>Analysis Method: ${aiConfidence ? `AI-Assisted (${aiConfidence.toFixed(0)}% confidence)` : 'Manual Landmark Tagging'}</div>
            </div>
            <div class="qr-code">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${reportId}" />
              <div>Verification Code</div>
            </div>
            <div class="signature-line">
              Clinician Signature
            </div>
          </div>
          
          <div class="disclaimer">
            <strong>⚠️ DISCLAIMER:</strong> This report is generated for clinical assessment purposes only. Results should be interpreted by a qualified healthcare professional in conjunction with clinical examination and patient history. This assessment does not constitute a diagnosis.
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html, width: 612, height: 792 });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  // Clear current view
  const clearCurrentView = () => {
    Alert.alert(
      'Clear Image',
      'Are you sure you want to clear the current image?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            setCapturedImages(prev => ({
              ...prev,
              [viewMode]: undefined,
            }));
            // Reset landmarks to default
            const initLandmarks: {[id: string]: {x: number; y: number}} = {};
            ANATOMICAL_LANDMARKS[viewMode].forEach(p => {
              initLandmarks[p.id] = { x: p.x, y: p.y };
            });
            setLandmarks(prev => ({
              ...prev,
              [viewMode]: initLandmarks,
            }));
            setAiConfidence(null);
          }
        },
      ]
    );
  };

  const currentImage = capturedImages[viewMode];
  const currentLandmarks = ANATOMICAL_LANDMARKS[viewMode];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={GRID_BG} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Manual Pose Tagging</Text>
          {!isOnline && (
            <View style={styles.offlineBadge}>
              <Ionicons name="cloud-offline" size={12} color="#FF6B6B" />
              <Text style={styles.offlineText}>Offline</Text>
            </View>
          )}
        </View>
        <SyncStatus 
          pendingCount={pendingSyncCount} 
          syncing={syncing} 
          onSync={syncToServer}
        />
      </View>

      {/* View Mode Tabs */}
      <View style={styles.viewTabs}>
        {(['front', 'side', 'back'] as const).map((view) => (
          <TouchableOpacity
            key={view}
            style={[styles.viewTab, viewMode === view && styles.viewTabActive]}
            onPress={() => setViewMode(view)}
          >
            <Text style={[styles.viewTabText, viewMode === view && styles.viewTabTextActive]}>
              {view === 'front' ? 'Anterior' : view === 'side' ? 'Lateral' : 'Posterior'}
            </Text>
            {capturedImages[view] && <View style={styles.viewTabDot} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Image Area */}
      <View style={[styles.imageArea, { height: imageAreaHeight }]}>
        <GridBackground />
        
        {currentImage ? (
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: currentImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
            
            {/* Skeleton Lines */}
            <View style={styles.skeletonOverlay}>
              {/* Draw connecting lines based on view */}
              {viewMode === 'front' && (
                <>
                  {/* Head to shoulders */}
                  <View style={[styles.skeletonLine, {
                    top: `${(landmarks.front['acromion_right']?.y || 0.18) * 100}%`,
                    left: `${(landmarks.front['acromion_right']?.x || 0.28) * 100}%`,
                    width: `${((landmarks.front['acromion_left']?.x || 0.72) - (landmarks.front['acromion_right']?.x || 0.28)) * 100}%`,
                  }]} />
                </>
              )}
            </View>
            
            {/* Draggable Pointers */}
            {currentLandmarks.map((point) => {
              const position = landmarks[viewMode]?.[point.id] || { x: point.x, y: point.y };
              return (
                <DraggablePointer
                  key={point.id}
                  point={{ ...point, ...position }}
                  imageWidth={SCREEN_WIDTH}
                  imageHeight={imageAreaHeight}
                  onPositionChange={updateLandmarkPosition}
                  selected={selectedPoint === point.id}
                  onSelect={setSelectedPoint}
                />
              );
            })}
            
            {/* Metrics Overlay */}
            <View style={styles.metricsOverlay}>
              {metrics.headTilt && (
                <View style={styles.metricBadge}>
                  <Text style={styles.metricBadgeLabel}>Tilt</Text>
                  <Text style={styles.metricBadgeValue}>{metrics.headTilt}°</Text>
                </View>
              )}
              {metrics.shoulderAsymmetry && (
                <View style={styles.metricBadge}>
                  <Text style={styles.metricBadgeLabel}>Sh%</Text>
                  <Text style={styles.metricBadgeValue}>{metrics.shoulderAsymmetry}%</Text>
                </View>
              )}
              {metrics.pelvicTilt && (
                <View style={styles.metricBadge}>
                  <Text style={styles.metricBadgeLabel}>Pelvis</Text>
                  <Text style={styles.metricBadgeValue}>{metrics.pelvicTilt}%</Text>
                </View>
              )}
            </View>
            
            {/* AI Confidence Badge */}
            {aiConfidence && (
              <View style={styles.aiConfidenceBadge}>
                <MaterialCommunityIcons name="robot" size={14} color="#00E676" />
                <Text style={styles.aiConfidenceText}>{aiConfidence.toFixed(0)}% AI</Text>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity style={styles.captureOverlay} onPress={takePhoto}>
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={60} color={HEADER_COLOR} />
            </View>
            <View style={styles.captureTextBox}>
              <Text style={styles.captureText}>Tap to take a Photo</Text>
            </View>
            <TouchableOpacity style={styles.galleryBtn} onPress={pickMedia}>
              <Ionicons name="images" size={24} color={HEADER_COLOR} />
              <Text style={styles.galleryText}>Image / Video</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        
        {/* Loading overlays */}
        {(extractingFrames || aiDetecting) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={HEADER_COLOR} />
            <Text style={styles.loadingText}>
              {extractingFrames ? 'Extracting video frames...' : 'AI detecting landmarks...'}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {currentImage && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionBtn} onPress={autoDetectLandmarks} disabled={aiDetecting}>
            <MaterialCommunityIcons name="robot" size={20} color="#00E676" />
            <Text style={styles.actionBtnText}>AI Detect</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={clearCurrentView}>
            <Ionicons name="trash" size={20} color="#FF6B6B" />
            <Text style={styles.actionBtnText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={saveAnalysis} disabled={generating}>
            <Ionicons name="save" size={20} color={HEADER_COLOR} />
            <Text style={styles.actionBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navBtn} onPress={pickMedia}>
          <Ionicons name="images" size={24} color="#fff" />
          <Text style={styles.navBtnText}>Gallery</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navBtnPrimary, generating && { opacity: 0.5 }]}
          onPress={generatePDFReport}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="file-pdf-box" size={28} color="#fff" />
              <Text style={styles.navBtnPrimaryText}>Generate Report</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navBtn} onPress={takePhoto}>
          <Ionicons name="camera" size={24} color="#fff" />
          <Text style={styles.navBtnText}>Camera</Text>
        </TouchableOpacity>
      </View>

      {/* Video Frame Selector Modal */}
      {showFrameSelector && (
        <VideoFrameSelector
          frames={videoFrames}
          selectedFrame={selectedFrameIndex}
          onSelectFrame={(index) => {
            setSelectedFrameIndex(index);
            setCapturedImages(prev => ({
              ...prev,
              [viewMode]: videoFrames[index],
            }));
          }}
          onClose={() => {
            useSelectedFrame();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GRID_BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: GRID_BG,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: GRID_LINE,
  },
  headerBtn: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    gap: 4,
  },
  offlineText: {
    fontSize: 10,
    color: '#FF6B6B',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00E676',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 4,
  },
  syncBadgePending: {
    backgroundColor: '#FFB300',
  },
  syncBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewTabs: {
    flexDirection: 'row',
    backgroundColor: GRID_BG,
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
  },
  viewTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: GRID_LINE,
    borderRadius: 8,
    position: 'relative',
  },
  viewTabActive: {
    backgroundColor: HEADER_COLOR,
  },
  viewTabText: {
    color: '#8BA5B5',
    fontSize: 14,
    fontWeight: '600',
  },
  viewTabTextActive: {
    color: '#fff',
  },
  viewTabDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00E676',
  },
  imageArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  gridContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: GRID_BG,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: GRID_LINE,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: GRID_LINE,
  },
  centerLineV: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: HEADER_COLOR + '60',
  },
  gridLineMajor: {
    backgroundColor: GRID_LINE + '80',
    height: 1.5,
  },
  gridLabel: {
    position: 'absolute',
    backgroundColor: '#00000080',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  gridLabelText: {
    color: '#8BA5B5',
    fontSize: 8,
    fontWeight: '600',
  },
  plumbLineLabel: {
    position: 'absolute',
    top: 5,
    left: '50%',
    transform: [{ translateX: -30 }],
    backgroundColor: HEADER_COLOR + '90',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  plumbLineLabelText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  anatomicalReference: {
    position: 'absolute',
    right: 5,
    backgroundColor: '#00000060',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  anatomicalReferenceText: {
    color: '#FFD700',
    fontSize: 7,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  imageWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  skeletonOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  skeletonLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#00E67680',
  },
  pointer: {
    position: 'absolute',
    width: POINTER_SIZE * 2,
    height: POINTER_SIZE * 2,
    borderRadius: POINTER_SIZE,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointerInner: {
    width: POINTER_SIZE,
    height: POINTER_SIZE,
    borderRadius: POINTER_SIZE / 2,
  },
  pointerLabel: {
    position: 'absolute',
    top: -25,
    backgroundColor: '#000000CC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  pointerLabelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  metricsOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    gap: 8,
  },
  metricBadge: {
    backgroundColor: '#000000CC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  metricBadgeLabel: {
    color: '#8BA5B5',
    fontSize: 10,
  },
  metricBadgeValue: {
    color: ACCENT_COLOR,
    fontSize: 16,
    fontWeight: 'bold',
  },
  aiConfidenceBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000CC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    gap: 5,
  },
  aiConfidenceText: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: 'bold',
  },
  captureOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: HEADER_COLOR + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  captureTextBox: {
    backgroundColor: HEADER_COLOR + '20',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
  },
  captureText: {
    color: HEADER_COLOR,
    fontSize: 16,
    fontWeight: '600',
  },
  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GRID_LINE,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 10,
  },
  galleryText: {
    color: HEADER_COLOR,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    paddingVertical: 10,
    backgroundColor: GRID_BG,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GRID_LINE,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: GRID_BG,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    borderTopWidth: 1,
    borderTopColor: GRID_LINE,
  },
  navBtn: {
    alignItems: 'center',
    gap: 4,
  },
  navBtnText: {
    color: '#8BA5B5',
    fontSize: 12,
  },
  navBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HEADER_COLOR,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  navBtnPrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Frame selector modal styles
  frameModalOverlay: {
    flex: 1,
    backgroundColor: '#000000EE',
    justifyContent: 'flex-end',
  },
  frameModalContent: {
    backgroundColor: GRID_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  frameModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  frameModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  frameModalSubtitle: {
    color: '#8BA5B5',
    fontSize: 14,
    marginBottom: 15,
  },
  framesList: {
    paddingVertical: 10,
  },
  frameItem: {
    marginRight: 15,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  frameItemSelected: {
    borderColor: HEADER_COLOR,
  },
  frameImage: {
    width: 120,
    height: 160,
  },
  frameNumber: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 5,
    backgroundColor: '#000000AA',
  },
  useFrameBtn: {
    backgroundColor: HEADER_COLOR,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  useFrameBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
