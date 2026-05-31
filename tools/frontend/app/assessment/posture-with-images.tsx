import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { theme } from '../../src/utils/theme';
import { createAssessment, getUsers } from '../../src/utils/api';
import { useStore, User } from '../../src/store/useStore';

interface ScoreItem {
  key: string;
  label: string;
  description: string;
}

interface PostureImage {
  uri: string;
  base64?: string;
}

type ViewType = 'anterior' | 'posterior' | 'lateral_left' | 'lateral_right';

const POSTURE_ITEMS: ScoreItem[] = [
  { key: 'head_alignment', label: 'Head Alignment', description: 'Forward head position assessment' },
  { key: 'shoulder_level', label: 'Shoulder Level', description: 'Shoulder symmetry and position' },
  { key: 'spine_curvature', label: 'Spine Curvature', description: 'Natural spine alignment' },
  { key: 'hip_level', label: 'Hip Level', description: 'Pelvic tilt and symmetry' },
  { key: 'knee_alignment', label: 'Knee Alignment', description: 'Knee valgus/varus assessment' },
  { key: 'overall_balance', label: 'Overall Balance', description: 'General posture balance' },
];

const VIEW_CONFIG: { type: ViewType; label: string; icon: string; instruction: string }[] = [
  { type: 'anterior', label: 'Anterior (Front)', icon: 'body', instruction: 'Stand facing the camera with feet shoulder-width apart' },
  { type: 'posterior', label: 'Posterior (Back)', icon: 'body-outline', instruction: 'Stand with back to camera, arms relaxed at sides' },
  { type: 'lateral_right', label: 'Lateral Right', icon: 'arrow-forward', instruction: 'Stand sideways with right side facing camera' },
  { type: 'lateral_left', label: 'Lateral Left', icon: 'arrow-back', instruction: 'Stand sideways with left side facing camera' },
];

export default function PostureAssessmentWithImages() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [permission, requestPermission] = useCameraPermissions();
  
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<User[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  
  // Image states
  const [images, setImages] = useState<Record<ViewType, PostureImage | null>>({
    anterior: null,
    posterior: null,
    lateral_left: null,
    lateral_right: null,
  });
  const [showCamera, setShowCamera] = useState(false);
  const [currentCaptureView, setCurrentCaptureView] = useState<ViewType | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const cameraRef = React.useRef<any>(null);

  const isPhysio = currentUser?.role === 'physio';

  useEffect(() => {
    if (isPhysio && currentUser) {
      const fetchPatients = async () => {
        try {
          const response = await getUsers('patient');
          setPatients(response.data);
        } catch (error) {
          console.error('Error fetching patients:', error);
        }
      };
      fetchPatients();
    } else if (currentUser) {
      setSelectedPatient(currentUser.id);
    }
  }, [currentUser]);

  const handleScoreChange = (key: string, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  };

  const calculateTotalScore = () => {
    return Object.values(scores).reduce((sum, val) => sum + val, 0);
  };

  const getCompletedImagesCount = () => {
    return Object.values(images).filter(img => img !== null).length;
  };

  const pickImage = async (viewType: ViewType) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImages(prev => ({
        ...prev,
        [viewType]: {
          uri: result.assets[0].uri,
          base64: result.assets[0].base64,
        }
      }));
    }
  };

  const openCamera = (viewType: ViewType) => {
    if (!permission?.granted) {
      requestPermission();
      return;
    }
    setCurrentCaptureView(viewType);
    setShowCamera(true);
  };

  const captureImage = async () => {
    if (cameraRef.current && currentCaptureView) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
        });
        
        setImages(prev => ({
          ...prev,
          [currentCaptureView]: {
            uri: photo.uri,
            base64: photo.base64,
          }
        }));
        setShowCamera(false);
        setCurrentCaptureView(null);
      } catch (error) {
        console.error('Error capturing image:', error);
        Alert.alert('Error', 'Failed to capture image');
      }
    }
  };

  const removeImage = (viewType: ViewType) => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => setImages(prev => ({ ...prev, [viewType]: null }))
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!selectedPatient) {
      Alert.alert('Error', 'Please select a patient');
      return;
    }

    const missingScores = POSTURE_ITEMS.filter((item) => scores[item.key] === undefined);
    if (missingScores.length > 0) {
      Alert.alert('Error', 'Please fill in all assessment scores');
      return;
    }

    if (getCompletedImagesCount() < 4) {
      Alert.alert(
        'Missing Images',
        `You have only captured ${getCompletedImagesCount()} of 4 views. Do you want to continue anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => submitAssessment() },
        ]
      );
      return;
    }

    submitAssessment();
  };

  const submitAssessment = async () => {
    setLoading(true);
    try {
      // Prepare image data
      const imageData: Record<string, string> = {};
      Object.entries(images).forEach(([view, img]) => {
        if (img?.base64) {
          imageData[`image_${view}`] = img.base64;
        }
      });

      const response = await createAssessment({
        patient_id: selectedPatient!,
        physio_id: isPhysio ? currentUser?.id : undefined,
        assessment_type: 'posture',
        data: { 
          ...scores, 
          notes,
          images: imageData,
          images_captured: getCompletedImagesCount(),
        },
      });

      Alert.alert('Success', 'Posture assessment saved with images!', [
        {
          text: 'View Result',
          onPress: () => router.replace(`/assessment/result?id=${response.data.id}`),
        },
      ]);
    } catch (error) {
      console.error('Error saving assessment:', error);
      Alert.alert('Error', 'Failed to save assessment');
    } finally {
      setLoading(false);
    }
  };

  const ImageUploadCard = ({ config }: { config: typeof VIEW_CONFIG[0] }) => {
    const image = images[config.type];
    
    return (
      <View style={styles.imageCard}>
        <View style={styles.imageCardHeader}>
          <Ionicons name={config.icon as any} size={20} color={theme.colors.accent} />
          <Text style={styles.imageCardTitle}>{config.label}</Text>
          {image && (
            <TouchableOpacity onPress={() => removeImage(config.type)}>
              <Ionicons name="close-circle" size={22} color={theme.colors.error} />
            </TouchableOpacity>
          )}
        </View>
        
        {image ? (
          <TouchableOpacity 
            onPress={() => {
              setPreviewImage(image.uri);
              setShowImagePreview(true);
            }}
          >
            <Image source={{ uri: image.uri }} style={styles.capturedImage} />
            <View style={styles.imageOverlay}>
              <Ionicons name="expand" size={20} color={theme.colors.textPrimary} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.imageUploadArea}>
            <Text style={styles.imageInstruction}>{config.instruction}</Text>
            <View style={styles.imageButtons}>
              <TouchableOpacity 
                style={styles.imageButton}
                onPress={() => openCamera(config.type)}
              >
                <Ionicons name="camera" size={24} color={theme.colors.textPrimary} />
                <Text style={styles.imageButtonText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.imageButton, styles.imageButtonSecondary]}
                onPress={() => pickImage(config.type)}
              >
                <Ionicons name="images" size={24} color={theme.colors.accent} />
                <Text style={[styles.imageButtonText, { color: theme.colors.accent }]}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const ScoreSelector = ({ item }: { item: ScoreItem }) => {
    const currentScore = scores[item.key];

    return (
      <View style={styles.scoreCard}>
        <View style={styles.scoreHeader}>
          <Text style={styles.scoreLabel}>{item.label}</Text>
          <Text style={styles.scoreValue}>
            {currentScore !== undefined ? currentScore : '-'}/10
          </Text>
        </View>
        <Text style={styles.scoreDescription}>{item.description}</Text>
        <View style={styles.scoreButtons}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.scoreButton,
                currentScore === num && styles.scoreButtonActive,
                num <= 3 && styles.scoreButtonLow,
                num >= 4 && num <= 6 && styles.scoreButtonMid,
                num >= 7 && styles.scoreButtonHigh,
                currentScore === num && num <= 3 && styles.scoreButtonLowActive,
                currentScore === num && num >= 4 && num <= 6 && styles.scoreButtonMidActive,
                currentScore === num && num >= 7 && styles.scoreButtonHighActive,
              ]}
              onPress={() => handleScoreChange(item.key, num)}
            >
              <Text
                style={[
                  styles.scoreButtonText,
                  currentScore === num && styles.scoreButtonTextActive,
                ]}
              >
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Camera Modal
  if (showCamera && currentCaptureView) {
    const currentConfig = VIEW_CONFIG.find(v => v.type === currentCaptureView);
    
    return (
      <View style={styles.cameraContainer}>
        <CameraView 
          ref={cameraRef}
          style={styles.camera} 
          facing="back"
        >
          {/* Camera Overlay */}
          <SafeAreaView style={styles.cameraOverlay}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity onPress={() => setShowCamera(false)}>
                <Ionicons name="close" size={32} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.cameraTitle}>{currentConfig?.label}</Text>
              <View style={{ width: 32 }} />
            </View>
            
            <View style={styles.cameraGuide}>
              <View style={styles.guideOutline} />
              <Text style={styles.guideText}>{currentConfig?.instruction}</Text>
            </View>
            
            <View style={styles.cameraControls}>
              <TouchableOpacity 
                style={styles.captureButton}
                onPress={captureImage}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <MaterialCommunityIcons name="human" size={48} color={theme.colors.accent} />
          <Text style={styles.title}>Posture Assessment</Text>
          <Text style={styles.subtitle}>Capture 4 views and rate each metric</Text>
        </View>

        {/* Patient Selector for Physio */}
        {isPhysio && (
          <View style={styles.patientSection}>
            <Text style={styles.sectionTitle}>Select Patient</Text>
            <TouchableOpacity
              style={styles.patientSelector}
              onPress={() => setShowPatientSelector(!showPatientSelector)}
            >
              <Ionicons name="person" size={20} color={theme.colors.accent} />
              <Text style={styles.patientSelectorText}>
                {selectedPatient
                  ? patients.find((p) => p.id === selectedPatient)?.name || 'Select Patient'
                  : 'Select Patient'}
              </Text>
              <Ionicons
                name={showPatientSelector ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
            {showPatientSelector && (
              <View style={styles.patientList}>
                {patients.map((patient) => (
                  <TouchableOpacity
                    key={patient.id}
                    style={[
                      styles.patientOption,
                      selectedPatient === patient.id && styles.patientOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedPatient(patient.id);
                      setShowPatientSelector(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.patientOptionText,
                        selectedPatient === patient.id && styles.patientOptionTextSelected,
                      ]}
                    >
                      {patient.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Image Upload Section */}
        <View style={styles.imagesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Posture Images</Text>
            <View style={styles.progressBadge}>
              <Text style={styles.progressText}>{getCompletedImagesCount()}/4</Text>
            </View>
          </View>
          
          <View style={styles.imagesGrid}>
            {VIEW_CONFIG.map((config) => (
              <ImageUploadCard key={config.type} config={config} />
            ))}
          </View>
        </View>

        {/* Score Items */}
        <Text style={styles.sectionTitle}>Assessment Scores</Text>
        {POSTURE_ITEMS.map((item) => (
          <ScoreSelector key={item.key} item={item} />
        ))}

        {/* Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any additional observations..."
            placeholderTextColor={theme.colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Assessment Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Images Captured</Text>
            <Text style={styles.summaryValue}>{getCompletedImagesCount()}/4</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Score</Text>
            <Text style={styles.summaryValue}>{calculateTotalScore()}/60</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Percentage</Text>
            <Text style={styles.summaryValue}>
              {((calculateTotalScore() / 60) * 100).toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.textPrimary} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.textPrimary} />
              <Text style={styles.submitButtonText}>Save Assessment</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal
        visible={showImagePreview}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImagePreview(false)}
      >
        <View style={styles.previewModal}>
          <TouchableOpacity 
            style={styles.previewClose}
            onPress={() => setShowImagePreview(false)}
          >
            <Ionicons name="close" size={32} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          {previewImage && (
            <Image source={{ uri: previewImage }} style={styles.previewImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  patientSection: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  progressBadge: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  progressText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  patientSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    gap: theme.spacing.sm,
  },
  patientSelectorText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  patientList: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    overflow: 'hidden',
  },
  patientOption: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  patientOptionSelected: {
    backgroundColor: theme.colors.accent + '20',
  },
  patientOptionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  patientOptionTextSelected: {
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.semibold,
  },
  imagesSection: {
    marginBottom: theme.spacing.lg,
  },
  imagesGrid: {
    gap: theme.spacing.md,
  },
  imageCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  imageCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  imageCardTitle: {
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  capturedImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
  },
  imageOverlay: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.xs,
  },
  imageUploadArea: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.cardBorder,
    borderStyle: 'dashed',
  },
  imageInstruction: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  imageButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  imageButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  scoreCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  scoreLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  scoreValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
  },
  scoreDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  scoreButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  scoreButton: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreButtonActive: {
    backgroundColor: theme.colors.accent,
  },
  scoreButtonLow: {
    borderWidth: 1,
    borderColor: theme.colors.error + '30',
  },
  scoreButtonMid: {
    borderWidth: 1,
    borderColor: theme.colors.warning + '30',
  },
  scoreButtonHigh: {
    borderWidth: 1,
    borderColor: theme.colors.success + '30',
  },
  scoreButtonLowActive: {
    backgroundColor: theme.colors.error,
  },
  scoreButtonMidActive: {
    backgroundColor: theme.colors.warning,
  },
  scoreButtonHighActive: {
    backgroundColor: theme.colors.success,
  },
  scoreButtonText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  scoreButtonTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  notesSection: {
    marginBottom: theme.spacing.lg,
  },
  notesInput: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  summaryCard: {
    backgroundColor: theme.colors.accent + '20',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.accent + '40',
  },
  summaryTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  summaryLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  // Camera styles
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cameraTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  cameraGuide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideOutline: {
    width: width * 0.7,
    height: height * 0.5,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderRadius: theme.borderRadius.lg,
    borderStyle: 'dashed',
  },
  guideText: {
    position: 'absolute',
    bottom: -40,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  cameraControls: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'transparent',
    borderWidth: 4,
    borderColor: theme.colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.textPrimary,
  },
  // Preview Modal
  previewModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  previewImage: {
    width: width * 0.9,
    height: height * 0.7,
  },
});
