import React, { useState } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useVideoPlayer, VideoView } from 'expo-video';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';

type AnalysisType = 'posture' | 'walking' | 'running';

interface PatientDetails {
  name: string;
  age: string;
  height: string;
  weight: string;
  gender: string;
  phone: string;
  email: string;
  medicalHistory: string;
  chiefComplaint: string;
}

export default function VideoUploadScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  const [analysisType, setAnalysisType] = useState<AnalysisType>('posture');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoBase64, setVideoBase64] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedViews, setSelectedViews] = useState<string[]>([]);
  
  // Video player for preview
  const videoPlayer = useVideoPlayer(videoUri || '', player => {
    player.loop = false;
  });
  
  const [patientDetails, setPatientDetails] = useState<PatientDetails>({
    name: '',
    age: '',
    height: '',
    weight: '',
    gender: 'male',
    phone: '',
    email: '',
    medicalHistory: '',
    chiefComplaint: '',
  });

  const ANALYSIS_TYPES = [
    { id: 'posture', label: 'Posture', icon: 'human', description: 'Static posture analysis' },
    { id: 'walking', label: 'Walking', icon: 'walk', description: 'Gait analysis' },
    { id: 'running', label: 'Running', icon: 'run', description: 'Running biomechanics' },
  ];

  const POSTURE_VIEWS = [
    { id: 'anterior', label: 'Anterior (Front)' },
    { id: 'posterior', label: 'Posterior (Back)' },
    { id: 'lateral_left', label: 'Lateral Left' },
    { id: 'lateral_right', label: 'Lateral Right' },
  ];

  const GENDERS = [
    { id: 'male', label: 'Male' },
    { id: 'female', label: 'Female' },
    { id: 'other', label: 'Other' },
  ];

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.5,
        videoMaxDuration: 120,
      });

      if (!result.canceled && result.assets[0]) {
        setVideoUri(result.assets[0].uri);
        
        // Convert to base64 for upload
        const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
          encoding: 'base64',
        });
        setVideoBase64(base64);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to select video');
    }
  };

  const recordVideo = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.5,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets[0]) {
        setVideoUri(result.assets[0].uri);
        
        const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
          encoding: 'base64',
        });
        setVideoBase64(base64);
      }
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert('Error', 'Failed to record video');
    }
  };

  const validateForm = (): boolean => {
    if (!patientDetails.name.trim()) {
      Alert.alert('Error', 'Please enter patient name');
      return false;
    }
    if (!patientDetails.age || parseInt(patientDetails.age) < 1) {
      Alert.alert('Error', 'Please enter valid age');
      return false;
    }
    if (!patientDetails.height || parseFloat(patientDetails.height) < 50) {
      Alert.alert('Error', 'Please enter valid height (cm)');
      return false;
    }
    if (!patientDetails.weight || parseFloat(patientDetails.weight) < 10) {
      Alert.alert('Error', 'Please enter valid weight (kg)');
      return false;
    }
    if (!videoUri) {
      Alert.alert('Error', 'Please select or record a video');
      return false;
    }
    if (analysisType === 'posture' && selectedViews.length === 0) {
      Alert.alert('Error', 'Please select at least one posture view');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!currentUser) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    setUploading(true);
    try {
      const response = await api.post(`/video-analysis/submit?physio_id=${currentUser.id}`, {
        patient_name: patientDetails.name,
        patient_age: parseInt(patientDetails.age),
        patient_height_cm: parseFloat(patientDetails.height),
        patient_weight_kg: parseFloat(patientDetails.weight),
        patient_gender: patientDetails.gender,
        patient_phone: patientDetails.phone || null,
        patient_email: patientDetails.email || null,
        medical_history: patientDetails.medicalHistory || null,
        chief_complaint: patientDetails.chiefComplaint || null,
        analysis_type: analysisType,
        video_data: videoBase64,
        video_filename: `${analysisType}_analysis_${Date.now()}.mp4`,
        views: analysisType === 'posture' ? selectedViews : [],
      });

      Alert.alert(
        'Success!',
        'Video analysis request submitted successfully. Admin will review and send the report.',
        [
          { text: 'Submit Another', onPress: resetForm },
          { text: 'View My Requests', onPress: () => router.push('/physio/my-video-requests') },
        ]
      );
    } catch (error) {
      console.error('Error submitting:', error);
      Alert.alert('Error', 'Failed to submit video analysis request');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setPatientDetails({
      name: '',
      age: '',
      height: '',
      weight: '',
      gender: 'male',
      phone: '',
      email: '',
      medicalHistory: '',
      chiefComplaint: '',
    });
    setVideoUri(null);
    setVideoBase64(null);
    setSelectedViews([]);
  };

  const toggleView = (viewId: string) => {
    setSelectedViews(prev => 
      prev.includes(viewId) 
        ? prev.filter(v => v !== viewId)
        : [...prev, viewId]
    );
  };

  const InputField = ({ 
    label, 
    value, 
    onChangeText, 
    placeholder, 
    keyboardType = 'default',
    multiline = false,
    required = false 
  }: any) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <MaterialCommunityIcons name="video-plus" size={48} color={theme.colors.accent} />
            <Text style={styles.title}>Video Analysis Request</Text>
            <Text style={styles.subtitle}>Upload video for admin review & report</Text>
          </View>

          {/* Analysis Type Selection */}
          <Text style={styles.sectionTitle}>Analysis Type</Text>
          <View style={styles.typeGrid}>
            {ANALYSIS_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.typeCard, analysisType === type.id && styles.typeCardSelected]}
                onPress={() => setAnalysisType(type.id as AnalysisType)}
              >
                <MaterialCommunityIcons
                  name={type.icon as any}
                  size={32}
                  color={analysisType === type.id ? theme.colors.textPrimary : theme.colors.textMuted}
                />
                <Text style={[styles.typeLabel, analysisType === type.id && styles.typeLabelSelected]}>
                  {type.label}
                </Text>
                <Text style={styles.typeDesc}>{type.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Posture Views (only for posture analysis) */}
          {analysisType === 'posture' && (
            <>
              <Text style={styles.sectionTitle}>Select Views Recorded</Text>
              <View style={styles.viewsGrid}>
                {POSTURE_VIEWS.map((view) => (
                  <TouchableOpacity
                    key={view.id}
                    style={[styles.viewChip, selectedViews.includes(view.id) && styles.viewChipSelected]}
                    onPress={() => toggleView(view.id)}
                  >
                    <Ionicons
                      name={selectedViews.includes(view.id) ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={selectedViews.includes(view.id) ? theme.colors.textPrimary : theme.colors.textMuted}
                    />
                    <Text style={[styles.viewLabel, selectedViews.includes(view.id) && styles.viewLabelSelected]}>
                      {view.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Patient Details Section */}
          <View style={styles.patientSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={24} color={theme.colors.accent} />
              <Text style={styles.sectionTitle}>Patient Details</Text>
            </View>

            <InputField
              label="Patient Name"
              value={patientDetails.name}
              onChangeText={(text: string) => setPatientDetails(prev => ({ ...prev, name: text }))}
              placeholder="Enter full name"
              required
            />

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <InputField
                  label="Age"
                  value={patientDetails.age}
                  onChangeText={(text: string) => setPatientDetails(prev => ({ ...prev, age: text }))}
                  placeholder="Years"
                  keyboardType="numeric"
                  required
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Gender</Text>
                <View style={styles.genderContainer}>
                  {GENDERS.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.genderOption, patientDetails.gender === g.id && styles.genderOptionSelected]}
                      onPress={() => setPatientDetails(prev => ({ ...prev, gender: g.id }))}
                    >
                      <Text style={[styles.genderText, patientDetails.gender === g.id && styles.genderTextSelected]}>
                        {g.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <InputField
                  label="Height (cm)"
                  value={patientDetails.height}
                  onChangeText={(text: string) => setPatientDetails(prev => ({ ...prev, height: text }))}
                  placeholder="170"
                  keyboardType="numeric"
                  required
                />
              </View>
              <View style={styles.halfInput}>
                <InputField
                  label="Weight (kg)"
                  value={patientDetails.weight}
                  onChangeText={(text: string) => setPatientDetails(prev => ({ ...prev, weight: text }))}
                  placeholder="70"
                  keyboardType="numeric"
                  required
                />
              </View>
            </View>

            <InputField
              label="Phone Number"
              value={patientDetails.phone}
              onChangeText={(text: string) => setPatientDetails(prev => ({ ...prev, phone: text }))}
              placeholder="+91 9876543210"
              keyboardType="phone-pad"
            />

            <InputField
              label="Email"
              value={patientDetails.email}
              onChangeText={(text: string) => setPatientDetails(prev => ({ ...prev, email: text }))}
              placeholder="patient@email.com"
              keyboardType="email-address"
            />

            <InputField
              label="Chief Complaint"
              value={patientDetails.chiefComplaint}
              onChangeText={(text: string) => setPatientDetails(prev => ({ ...prev, chiefComplaint: text }))}
              placeholder="Describe the main issue..."
              multiline
            />

            <InputField
              label="Medical History"
              value={patientDetails.medicalHistory}
              onChangeText={(text: string) => setPatientDetails(prev => ({ ...prev, medicalHistory: text }))}
              placeholder="Relevant medical history..."
              multiline
            />
          </View>

          {/* Video Upload Section */}
          <View style={styles.videoSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="videocam" size={24} color={theme.colors.accent} />
              <Text style={styles.sectionTitle}>Video Upload</Text>
            </View>

            {videoUri ? (
              <View style={styles.videoPreview}>
                <View style={styles.videoContainer}>
                  <VideoView
                    player={videoPlayer}
                    style={styles.video}
                    contentFit="contain"
                    nativeControls
                  />
                </View>
                <View style={styles.videoInfoBar}>
                  <MaterialCommunityIcons name="video-check" size={16} color={theme.colors.success} />
                  <Text style={styles.videoInfoText}>Video loaded • Tap play to preview</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeVideo}
                  onPress={() => {
                    setVideoUri(null);
                    setVideoBase64(null);
                  }}
                >
                  <Ionicons name="close-circle" size={32} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadOptions}>
                <TouchableOpacity style={styles.uploadButton} onPress={recordVideo}>
                  <Ionicons name="videocam" size={32} color={theme.colors.textPrimary} />
                  <Text style={styles.uploadButtonText}>Record Video</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.uploadButton, styles.uploadButtonSecondary]} onPress={pickVideo}>
                  <Ionicons name="folder-open" size={32} color={theme.colors.accent} />
                  <Text style={[styles.uploadButtonText, { color: theme.colors.accent }]}>Choose from Gallery</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.videoTips}>
              <Text style={styles.tipsTitle}>Recording Tips:</Text>
              <Text style={styles.tipText}>• Ensure good lighting</Text>
              <Text style={styles.tipText}>• Keep camera stable</Text>
              <Text style={styles.tipText}>• Full body should be visible</Text>
              <Text style={styles.tipText}>• Record for 15-30 seconds</Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <ActivityIndicator color={theme.colors.textPrimary} />
                <Text style={styles.submitButtonText}>Uploading...</Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload" size={24} color={theme.colors.textPrimary} />
                <Text style={styles.submitButtonText}>Submit for Analysis</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Your video will be reviewed by our admin team. Report will be sent within 24-48 hours.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  scrollContent: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  header: { alignItems: 'center', marginBottom: theme.spacing.lg },
  backButton: { position: 'absolute', left: 0, top: 0 },
  title: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginTop: theme.spacing.sm },
  subtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm, marginTop: theme.spacing.lg },
  typeGrid: { flexDirection: 'row', gap: theme.spacing.sm },
  typeCard: { flex: 1, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  typeCardSelected: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accent + '20' },
  typeLabel: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textMuted, marginTop: theme.spacing.xs },
  typeLabelSelected: { color: theme.colors.textPrimary },
  typeDesc: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing.xs },
  viewsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  viewChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, borderRadius: theme.borderRadius.full, gap: theme.spacing.xs, borderWidth: 1, borderColor: theme.colors.cardBorder },
  viewChipSelected: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  viewLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  viewLabelSelected: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.semibold },
  patientSection: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginTop: theme.spacing.lg },
  inputContainer: { marginBottom: theme.spacing.md },
  inputLabel: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
  required: { color: theme.colors.error },
  input: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, color: theme.colors.textPrimary, fontSize: theme.fontSize.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  rowInputs: { flexDirection: 'row', gap: theme.spacing.md },
  halfInput: { flex: 1 },
  genderContainer: { flexDirection: 'row', gap: theme.spacing.xs },
  genderOption: { flex: 1, backgroundColor: theme.colors.primaryLight, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.cardBorder },
  genderOptionSelected: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  genderText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  genderTextSelected: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },
  videoSection: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginTop: theme.spacing.md },
  videoPreview: { position: 'relative', borderRadius: theme.borderRadius.md, overflow: 'hidden', backgroundColor: '#000' },
  videoContainer: { width: '100%', aspectRatio: 16/9, minHeight: 220, backgroundColor: '#000', borderRadius: theme.borderRadius.md, overflow: 'hidden' },
  video: { width: '100%', height: '100%', backgroundColor: '#000' },
  videoInfoBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight, paddingVertical: theme.spacing.sm, gap: theme.spacing.xs, marginTop: theme.spacing.xs, borderRadius: theme.borderRadius.sm },
  videoInfoText: { fontSize: theme.fontSize.xs, color: theme.colors.success, fontWeight: theme.fontWeight.semibold },
  removeVideo: { position: 'absolute', top: theme.spacing.sm, right: theme.spacing.sm, zIndex: 10 },
  uploadOptions: { gap: theme.spacing.md },
  uploadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accent, paddingVertical: theme.spacing.lg, borderRadius: theme.borderRadius.md, gap: theme.spacing.md },
  uploadButtonSecondary: { backgroundColor: 'transparent', borderWidth: 2, borderColor: theme.colors.accent },
  uploadButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  videoTips: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginTop: theme.spacing.md },
  tipsTitle: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  tipText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginBottom: theme.spacing.xs },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.success, paddingVertical: theme.spacing.lg, borderRadius: theme.borderRadius.lg, marginTop: theme.spacing.xl, gap: theme.spacing.md },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  disclaimer: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing.md },
});
