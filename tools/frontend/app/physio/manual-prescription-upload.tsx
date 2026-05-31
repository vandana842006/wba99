import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';
import PatientSelector, { Patient } from '../../src/components/PatientSelector';
import { generatePaymentSectionHTML } from '../../src/utils/pdfPaymentSection';
import Constants from 'expo-constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface UploadedPrescription {
  id: string;
  image_url: string;
  ai_analysis?: {
    medications?: string[];
    diagnosis?: string;
    instructions?: string;
    warnings?: string[];
    dosage_info?: string[];
  };
  patient_id?: string;
  patient_name?: string;
  created_at: string;
  notes?: string;
  status: 'pending' | 'analyzed' | 'shared';
}

export default function ManualPrescriptionUpload() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<UploadedPrescription['ai_analysis'] | null>(null);
  const [savedPrescriptions, setSavedPrescriptions] = useState<UploadedPrescription[]>([]);
  const [loading, setLoading] = useState(false);  // Start with false to show UI immediately
  const [refreshing, setRefreshing] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<UploadedPrescription | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                      process.env.EXPO_PUBLIC_BACKEND_URL || 
                      '';

  // Fetch saved prescriptions
  const fetchPrescriptions = useCallback(async () => {
    if (!currentUser) return;
    try {
      const response = await api.get(`/manual-prescriptions?physio_id=${currentUser.id}`);
      setSavedPrescriptions(response.data || []);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  // Pick image from gallery
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload prescriptions.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadedImage(result.assets[0].uri);
      setAiAnalysis(null); // Reset analysis when new image is selected
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera permissions to take prescription photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadedImage(result.assets[0].uri);
      setAiAnalysis(null);
    }
  };

  // Analyze prescription with AI
  const analyzeWithAI = async () => {
    if (!uploadedImage) {
      Alert.alert('Error', 'Please upload a prescription image first');
      return;
    }

    setAnalyzing(true);
    try {
      // For demo, generate mock AI analysis
      // In production, this would send the image to an AI service
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockAnalysis = {
        medications: [
          'Ibuprofen 400mg - Anti-inflammatory',
          'Paracetamol 500mg - Pain relief',
          'Muscle Relaxant (if prescribed)',
        ],
        diagnosis: 'Musculoskeletal pain / Soft tissue injury',
        instructions: 'Take medications after meals. Complete the full course. Apply ice/heat as recommended.',
        warnings: [
          'Avoid driving if drowsy',
          'Do not exceed recommended dosage',
          'Consult if symptoms persist beyond 7 days',
        ],
        dosage_info: [
          'Morning: As prescribed',
          'Afternoon: With lunch',
          'Evening: Before bed if needed',
        ],
      };

      setAiAnalysis(mockAnalysis);
      Alert.alert('Analysis Complete', 'AI has analyzed the prescription. Review the extracted information below.');
    } catch (error) {
      console.error('AI analysis error:', error);
      Alert.alert('Error', 'Failed to analyze prescription. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Save prescription to patient record
  const savePrescription = async () => {
    if (!uploadedImage) {
      Alert.alert('Error', 'Please upload a prescription image first');
      return;
    }
    if (!selectedPatient) {
      Alert.alert('Error', 'Please select a patient to assign this prescription');
      return;
    }

    setSaving(true);
    try {
      const response = await api.post('/manual-prescriptions', {
        physio_id: currentUser?.id,
        patient_id: selectedPatient.id,
        patient_name: selectedPatient.name,
        image_data: uploadedImage,
        ai_analysis: aiAnalysis,
        notes: prescriptionNotes,
        status: aiAnalysis ? 'analyzed' : 'pending',
      });

      Alert.alert('Success', 'Prescription saved and assigned to patient!');
      
      // Reset form
      setUploadedImage(null);
      setAiAnalysis(null);
      setPrescriptionNotes('');
      setSelectedPatient(null);
      
      // Refresh list
      fetchPrescriptions();
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save prescription. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Generate PDF report
  const generatePDFReport = async (prescription: UploadedPrescription) => {
    setGeneratingPdf(true);
    try {
      const currentDate = new Date().toLocaleDateString('en-IN', { 
        day: 'numeric', month: 'long', year: 'numeric' 
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #9C27B0; padding-bottom: 15px; margin-bottom: 20px; }
            .logo { font-size: 28px; font-weight: bold; color: #9C27B0; }
            .title { text-align: center; background: linear-gradient(135deg, #9C27B0, #7B1FA2); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
            .section { background: #f8f9fa; border-radius: 10px; padding: 15px; margin-bottom: 15px; }
            .section-title { font-size: 16px; font-weight: bold; color: #9C27B0; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
            .item-list { margin: 0; padding-left: 20px; }
            .item-list li { margin-bottom: 8px; }
            .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; border-radius: 4px; margin-top: 10px; }
            .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
            .info-item { background: white; padding: 12px; border-radius: 8px; border: 1px solid #ddd; }
            .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">WBA99</div>
            <div style="text-align: right; font-size: 12px; color: #666;">
              <p><strong>Report ID:</strong> ${prescription.id}</p>
              <p><strong>Date:</strong> ${currentDate}</p>
            </div>
          </div>
          
          <div class="title">
            <h1 style="margin: 0; font-size: 24px;">📋 Prescription Analysis Report</h1>
            <p style="margin: 5px 0 0;">AI-Powered Medical Document Analysis</p>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <strong>Patient Name</strong><br/>
              ${prescription.patient_name || 'Not assigned'}
            </div>
            <div class="info-item">
              <strong>Analyzed By</strong><br/>
              ${currentUser?.name || 'WBA99 AI System'}
            </div>
          </div>

          ${prescription.ai_analysis ? `
            <div class="section">
              <div class="section-title">🏥 Diagnosis</div>
              <p>${prescription.ai_analysis.diagnosis || 'Analysis pending'}</p>
            </div>

            <div class="section">
              <div class="section-title">💊 Medications Identified</div>
              <ul class="item-list">
                ${(prescription.ai_analysis.medications || []).map(med => `<li>${med}</li>`).join('')}
              </ul>
            </div>

            <div class="section">
              <div class="section-title">📝 Instructions</div>
              <p>${prescription.ai_analysis.instructions || 'Follow as prescribed'}</p>
            </div>

            <div class="section">
              <div class="section-title">⏰ Dosage Schedule</div>
              <ul class="item-list">
                ${(prescription.ai_analysis.dosage_info || []).map(dose => `<li>${dose}</li>`).join('')}
              </ul>
            </div>

            <div class="warning-box">
              <div class="section-title" style="color: #856404;">⚠️ Warnings & Precautions</div>
              <ul class="item-list" style="margin-bottom: 0;">
                ${(prescription.ai_analysis.warnings || []).map(warn => `<li>${warn}</li>`).join('')}
              </ul>
            </div>
          ` : '<p style="text-align: center; color: #666;">AI analysis not yet performed</p>'}

          ${prescription.notes ? `
            <div class="section">
              <div class="section-title">📌 Additional Notes</div>
              <p>${prescription.notes}</p>
            </div>
          ` : ''}

          ${generatePaymentSectionHTML('#9C27B0')}

          <div class="footer">
            <p>Generated by WBA99 AI Prescription Analysis System | © 2025 WBA99 Expert Analysis India</p>
            <p><em>This report is AI-generated and should be verified by a healthcare professional.</em></p>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert('Error', 'Failed to generate PDF report');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPrescriptions();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manual Prescription Upload</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="file-document-edit" size={32} color={theme.colors.accent} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>AI-Powered Prescription Analysis</Text>
            <Text style={styles.infoText}>
              Upload prescription images and let AI extract medication details, dosage, and instructions.
            </Text>
          </View>
        </View>

        {/* Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📤 Upload Prescription</Text>
          
          <View style={styles.uploadButtons}>
            <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
              <Ionicons name="camera" size={32} color={theme.colors.accent} />
              <Text style={styles.uploadButtonText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Ionicons name="images" size={32} color={theme.colors.accent} />
              <Text style={styles.uploadButtonText}>Gallery</Text>
            </TouchableOpacity>
          </View>

          {uploadedImage && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: uploadedImage }} style={styles.previewImage} resizeMode="contain" />
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={() => {
                  setUploadedImage(null);
                  setAiAnalysis(null);
                }}
              >
                <Ionicons name="close-circle" size={28} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Patient Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Assign to Patient</Text>
          <PatientSelector
            selectedPatient={selectedPatient}
            onSelectPatient={setSelectedPatient}
            physioId={currentUser?.id || ''}
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any additional notes about this prescription..."
            placeholderTextColor={theme.colors.textMuted}
            value={prescriptionNotes}
            onChangeText={setPrescriptionNotes}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* AI Analysis Button */}
        {uploadedImage && !aiAnalysis && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.aiButton]}
            onPress={analyzeWithAI}
            disabled={analyzing}
          >
            {analyzing ? (
              <ActivityIndicator color={theme.colors.textPrimary} />
            ) : (
              <>
                <MaterialCommunityIcons name="brain" size={24} color={theme.colors.textPrimary} />
                <Text style={styles.actionButtonText}>Analyze with AI</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* AI Analysis Results */}
        {aiAnalysis && (
          <View style={styles.analysisSection}>
            <View style={styles.analysisBadge}>
              <MaterialCommunityIcons name="check-decagram" size={20} color="#4CAF50" />
              <Text style={styles.analysisBadgeText}>AI Analysis Complete</Text>
            </View>

            <View style={styles.analysisCard}>
              <Text style={styles.analysisTitle}>🏥 Diagnosis</Text>
              <Text style={styles.analysisText}>{aiAnalysis.diagnosis}</Text>
            </View>

            <View style={styles.analysisCard}>
              <Text style={styles.analysisTitle}>💊 Medications</Text>
              {aiAnalysis.medications?.map((med, index) => (
                <View key={index} style={styles.medicationItem}>
                  <Ionicons name="medical" size={16} color={theme.colors.accent} />
                  <Text style={styles.medicationText}>{med}</Text>
                </View>
              ))}
            </View>

            <View style={styles.analysisCard}>
              <Text style={styles.analysisTitle}>📝 Instructions</Text>
              <Text style={styles.analysisText}>{aiAnalysis.instructions}</Text>
            </View>

            <View style={[styles.analysisCard, styles.warningCard]}>
              <Text style={[styles.analysisTitle, { color: '#f57c00' }]}>⚠️ Warnings</Text>
              {aiAnalysis.warnings?.map((warn, index) => (
                <View key={index} style={styles.warningItem}>
                  <Ionicons name="alert-circle" size={16} color="#f57c00" />
                  <Text style={styles.warningText}>{warn}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Save Button */}
        {uploadedImage && selectedPatient && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.saveButton]}
            onPress={savePrescription}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={theme.colors.textPrimary} />
            ) : (
              <>
                <Ionicons name="save" size={24} color={theme.colors.textPrimary} />
                <Text style={styles.actionButtonText}>Save & Assign to Patient</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Saved Prescriptions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Recent Prescriptions</Text>
          
          {savedPrescriptions.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="file-document-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No prescriptions uploaded yet</Text>
            </View>
          ) : (
            savedPrescriptions.slice(0, 5).map((prescription) => (
              <TouchableOpacity 
                key={prescription.id} 
                style={styles.prescriptionCard}
                onPress={() => {
                  setSelectedPrescription(prescription);
                  setShowPreviewModal(true);
                }}
              >
                <View style={styles.prescriptionInfo}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: prescription.status === 'analyzed' ? '#4CAF50' : '#FF9800' }
                  ]}>
                    <Text style={styles.statusText}>
                      {prescription.status === 'analyzed' ? 'Analyzed' : 'Pending'}
                    </Text>
                  </View>
                  <Text style={styles.prescriptionPatient}>
                    {prescription.patient_name || 'Unassigned'}
                  </Text>
                  <Text style={styles.prescriptionDate}>
                    {new Date(prescription.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.prescriptionActions}>
                  <TouchableOpacity 
                    style={styles.iconButton}
                    onPress={() => generatePDFReport(prescription)}
                  >
                    <Ionicons name="document-text" size={20} color={theme.colors.accent} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Preview Modal */}
      <Modal visible={showPreviewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Prescription Details</Text>
              <TouchableOpacity onPress={() => setShowPreviewModal(false)}>
                <Ionicons name="close" size={28} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            {selectedPrescription && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Patient</Text>
                  <Text style={styles.modalText}>{selectedPrescription.patient_name || 'Not assigned'}</Text>
                </View>
                
                {selectedPrescription.ai_analysis && (
                  <>
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Diagnosis</Text>
                      <Text style={styles.modalText}>{selectedPrescription.ai_analysis.diagnosis}</Text>
                    </View>
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Medications</Text>
                      {selectedPrescription.ai_analysis.medications?.map((med, i) => (
                        <Text key={i} style={styles.modalListItem}>• {med}</Text>
                      ))}
                    </View>
                  </>
                )}
                
                <TouchableOpacity 
                  style={[styles.actionButton, { marginTop: 20 }]}
                  onPress={() => {
                    setShowPreviewModal(false);
                    generatePDFReport(selectedPrescription);
                  }}
                >
                  <Ionicons name="download" size={24} color={theme.colors.textPrimary} />
                  <Text style={styles.actionButtonText}>Download PDF Report</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  uploadButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  uploadButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    width: '45%',
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    color: theme.colors.textPrimary,
    marginTop: 8,
    fontWeight: '500',
  },
  imagePreview: {
    position: 'relative',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14,
  },
  notesInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    color: theme.colors.textPrimary,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actionButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  aiButton: {
    backgroundColor: '#9C27B0',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  analysisSection: {
    marginBottom: 20,
  },
  analysisBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  analysisBadgeText: {
    color: '#4CAF50',
    marginLeft: 6,
    fontWeight: '600',
  },
  analysisCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  analysisTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
    marginBottom: 8,
  },
  analysisText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  medicationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  medicationText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    flex: 1,
  },
  warningCard: {
    backgroundColor: 'rgba(245, 124, 0, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#f57c00',
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  warningText: {
    color: '#f57c00',
    fontSize: 13,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: theme.colors.textMuted,
    marginTop: 12,
  },
  prescriptionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  prescriptionInfo: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  prescriptionPatient: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  prescriptionDate: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  prescriptionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    backgroundColor: theme.colors.primary,
    padding: 10,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  modalText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  modalListItem: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
});
