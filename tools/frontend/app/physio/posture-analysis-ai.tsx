import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';

type ViewType = 'anterior' | 'posterior' | 'lateral_left' | 'lateral_right';

interface ViewConfig {
  key: ViewType;
  label: string;
  icon: string;
  description: string;
}

const VIEWS: ViewConfig[] = [
  { key: 'anterior', label: 'Anterior (Front)', icon: 'body', description: 'Front facing view' },
  { key: 'posterior', label: 'Posterior (Back)', icon: 'body', description: 'Back facing view' },
  { key: 'lateral_left', label: 'Lateral Left', icon: 'body', description: 'Left side view' },
  { key: 'lateral_right', label: 'Lateral Right', icon: 'body', description: 'Right side view' },
];

export default function PostureAnalysisEnhanced() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  // Patient info
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  
  // Image states for each view
  const [images, setImages] = useState<Record<ViewType, string | null>>({
    anterior: null,
    posterior: null,
    lateral_left: null,
    lateral_right: null,
  });
  
  // Analysis states
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  
  // Payment states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  
  // PDF generation
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Admin submission states
  const [showAdminSubmitModal, setShowAdminSubmitModal] = useState(false);
  const [adminSubmitNotes, setAdminSubmitNotes] = useState('');
  const [submittingToAdmin, setSubmittingToAdmin] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  useEffect(() => {
    fetchQRCode();
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    if (!currentUser?.id) return;
    try {
      const response = await api.get(`/users?role=patient&physio_id=${currentUser.id}`);
      setPatients(response.data || []);
    } catch (error) {
      console.log('Error fetching patients:', error);
    }
  };

  const fetchQRCode = async () => {
    try {
      const response = await api.get('/qr-codes/active');
      setQrCode(response.data.qr_image_url);
    } catch (error) {
      console.log('No active QR code found');
    }
  };

  const pickImage = async (viewType: ViewType) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please grant photo library access');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setImages(prev => ({ ...prev, [viewType]: base64 }));
    }
  };

  const takePhoto = async (viewType: ViewType) => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please grant camera access');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setImages(prev => ({ ...prev, [viewType]: base64 }));
    }
  };

  const getUploadedCount = () => {
    return Object.values(images).filter(img => img !== null).length;
  };

  const runAIAnalysis = async () => {
    const uploadedImages: Record<string, string> = {};
    Object.entries(images).forEach(([key, value]) => {
      if (value) uploadedImages[key] = value;
    });

    if (Object.keys(uploadedImages).length === 0) {
      Alert.alert('No Images', 'Please upload at least one image for analysis');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await api.post('/ai/analyze-posture-images', {
        images: uploadedImages,
        patient_name: patientName || 'Unknown',
        patient_id: patientId,
      });
      setAnalysisResult(response.data);
      setShowResults(true);
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert('Analysis Failed', 'Could not complete AI analysis. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePaymentFlow = () => {
    if (!qrCode) {
      Alert.alert('No QR Code', 'Payment QR code is not available. Please contact admin.');
      return;
    }
    setShowPaymentModal(true);
  };

  const pickPaymentScreenshot = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setPaymentScreenshot(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const submitPaymentProof = async () => {
    if (!paymentScreenshot) {
      Alert.alert('Required', 'Please upload payment screenshot');
      return;
    }

    setSubmittingPayment(true);
    try {
      await api.post('/payment-proofs', {
        physio_id: currentUser?.id,
        patient_id: patientId,
        report_type: 'posture',
        screenshot_url: paymentScreenshot,
        amount: 500, // Default amount
      });
      
      setPaymentVerified(true);
      setShowPaymentModal(false);
      Alert.alert('Success', 'Payment proof submitted! You can now generate the report.');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit payment proof');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const submitToAdmin = async () => {
    // Get the first uploaded image
    const firstImage = Object.values(images).find(img => img !== null);
    if (!firstImage) {
      Alert.alert('No Images', 'Please upload at least one image');
      return;
    }

    const patientNameToUse = selectedPatient?.name || patientName;
    const patientIdToUse = selectedPatient?.id || patientId;

    if (!patientNameToUse) {
      Alert.alert('Patient Required', 'Please select or enter a patient name');
      return;
    }

    setSubmittingToAdmin(true);
    try {
      await api.post('/analysis-requests', {
        request_type: 'posture',
        physio_id: currentUser?.id,
        patient_id: patientIdToUse || 'unknown',
        patient_name: patientNameToUse,
        original_media_url: firstImage,
        original_media_type: 'image',
        original_notes: adminSubmitNotes,
      });

      setShowAdminSubmitModal(false);
      setAdminSubmitNotes('');
      Alert.alert(
        'Request Submitted!', 
        'Your analysis request has been sent to the Admin. You will be notified when the analysis is complete.',
        [{ text: 'OK', onPress: () => router.push('/physio/my-analysis-requests') }]
      );
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    } finally {
      setSubmittingToAdmin(false);
    }
  };

  const generatePDFReport = async () => {
    if (!analysisResult) return;

    setGeneratingPDF(true);
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
    .header { text-align: center; border-bottom: 3px solid #8B4513; padding-bottom: 20px; margin-bottom: 20px; }
    .logo { width: 80px; height: 80px; }
    h1 { color: #8B4513; margin: 10px 0; }
    .subtitle { color: #666; font-size: 14px; }
    .section { margin-bottom: 25px; page-break-inside: avoid; }
    .section-title { background: #8B4513; color: white; padding: 10px 15px; margin-bottom: 15px; font-weight: bold; }
    .content { padding: 0 15px; }
    .grid { display: flex; flex-wrap: wrap; gap: 15px; }
    .grid-item { flex: 1; min-width: 200px; background: #f5f5f5; padding: 15px; border-radius: 8px; }
    .label { font-weight: bold; color: #8B4513; margin-bottom: 5px; }
    ul { margin: 0; padding-left: 20px; }
    li { margin-bottom: 8px; line-height: 1.5; }
    .deviation { background: #fff3cd; padding: 10px; margin: 5px 0; border-left: 4px solid #ffc107; }
    .recommendation { background: #d4edda; padding: 10px; margin: 5px 0; border-left: 4px solid #28a745; }
    .risk-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
    .risk-low { background: #28a745; color: white; }
    .risk-moderate { background: #ffc107; color: #333; }
    .risk-high { background: #dc3545; color: white; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #ccc; font-size: 12px; color: #666; }
    .analysis-text { white-space: pre-wrap; line-height: 1.6; font-size: 13px; background: #fafafa; padding: 15px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>WBA99 POSTURE ANALYSIS REPORT</h1>
    <div class="subtitle">Markerless AI-Powered Joint Analysis</div>
  </div>

  <div class="section">
    <div class="section-title">PATIENT INFORMATION</div>
    <div class="content">
      <div class="grid">
        <div class="grid-item">
          <div class="label">Patient Name</div>
          <div>${patientName || 'Not Specified'}</div>
        </div>
        <div class="grid-item">
          <div class="label">Assessment Date</div>
          <div>${new Date().toLocaleDateString('en-IN')}</div>
        </div>
        <div class="grid-item">
          <div class="label">Assessed By</div>
          <div>${currentUser?.name || 'Unknown'}</div>
        </div>
        <div class="grid-item">
          <div class="label">Views Analyzed</div>
          <div>${getUploadedCount()} of 4</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">OVERALL ANALYSIS</div>
    <div class="content">
      <div class="analysis-text">${analysisResult.overall_analysis || 'Analysis not available'}</div>
    </div>
  </div>

  ${Object.entries(analysisResult.view_analyses || {}).map(([view, analysis]) => `
  <div class="section">
    <div class="section-title">${view.toUpperCase().replace('_', ' ')} VIEW ANALYSIS</div>
    <div class="content">
      <div class="analysis-text">${analysis}</div>
    </div>
  </div>
  `).join('')}

  <div class="section">
    <div class="section-title">POSTURAL DEVIATIONS IDENTIFIED</div>
    <div class="content">
      ${(analysisResult.deviations || []).map((d: string) => `<div class="deviation">${d}</div>`).join('') || '<p>No significant deviations identified</p>'}
    </div>
  </div>

  <div class="section">
    <div class="section-title">MUSCLE IMBALANCES</div>
    <div class="content">
      ${(analysisResult.muscle_imbalances || []).map((m: string) => `<div class="deviation">${m}</div>`).join('') || '<p>No muscle imbalances identified</p>'}
    </div>
  </div>

  <div class="section">
    <div class="section-title">REHABILITATION RECOMMENDATIONS</div>
    <div class="content">
      ${(analysisResult.recommendations || []).map((r: string) => `<div class="recommendation">${r}</div>`).join('')}
    </div>
  </div>

  <div class="section">
    <div class="section-title">RISK ASSESSMENT</div>
    <div class="content">
      <p>Risk Score: <span class="risk-badge ${analysisResult.risk_score < 30 ? 'risk-low' : analysisResult.risk_score < 60 ? 'risk-moderate' : 'risk-high'}">${analysisResult.risk_score || 50}/100</span></p>
    </div>
  </div>

  <div class="footer">
    <p>Generated by WBA99 MSK/FMS Analysis App</p>
    <p>This AI-generated report should be reviewed by a qualified healthcare professional.</p>
    <p>Report ID: WBA99-${Date.now().toString(36).toUpperCase()}</p>
  </div>
</body>
</html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'WBA99 Posture Analysis Report',
        });
      } else {
        Alert.alert('Success', `Report saved to: ${uri}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF report');
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Posture Analysis</Text>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>Multi-View Markerless Joint Analysis</Text>

        {/* Patient Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter patient name"
            placeholderTextColor={theme.colors.textMuted}
            value={patientName}
            onChangeText={setPatientName}
          />
        </View>

        {/* Image Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Upload Photos ({getUploadedCount()}/4)
          </Text>
          <Text style={styles.sectionSubtitle}>
            Capture or upload photos from multiple views for comprehensive analysis
          </Text>

          <View style={styles.viewsGrid}>
            {VIEWS.map(view => (
              <View key={view.key} style={styles.viewCard}>
                <Text style={styles.viewLabel}>{view.label}</Text>
                
                {images[view.key] ? (
                  <TouchableOpacity 
                    style={styles.imagePreview}
                    onPress={() => setImages(prev => ({ ...prev, [view.key]: null }))}
                  >
                    <Image source={{ uri: images[view.key]! }} style={styles.previewImage} />
                    <View style={styles.removeButton}>
                      <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.uploadButtons}>
                    <TouchableOpacity 
                      style={styles.uploadBtn}
                      onPress={() => takePhoto(view.key)}
                    >
                      <Ionicons name="camera" size={24} color={theme.colors.accent} />
                      <Text style={styles.uploadBtnText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.uploadBtn}
                      onPress={() => pickImage(view.key)}
                    >
                      <Ionicons name="images" size={24} color={theme.colors.success} />
                      <Text style={styles.uploadBtnText}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Analyze Button */}
        <TouchableOpacity
          style={[styles.analyzeButton, getUploadedCount() === 0 && styles.buttonDisabled]}
          onPress={runAIAnalysis}
          disabled={analyzing || getUploadedCount() === 0}
        >
          {analyzing ? (
            <ActivityIndicator color={theme.colors.textPrimary} />
          ) : (
            <>
              <MaterialCommunityIcons name="brain" size={24} color={theme.colors.textPrimary} />
              <Text style={styles.analyzeButtonText}>Run AI Analysis</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Submit to Admin for Expert Analysis */}
        <TouchableOpacity
          style={[styles.submitToAdminButton, getUploadedCount() === 0 && styles.buttonDisabled]}
          onPress={() => setShowAdminSubmitModal(true)}
          disabled={getUploadedCount() === 0}
        >
          <Ionicons name="send" size={24} color={theme.colors.textPrimary} />
          <Text style={styles.submitToAdminButtonText}>Submit for Expert Analysis</Text>
        </TouchableOpacity>
        <Text style={styles.submitToAdminHint}>
          Send images to Admin for detailed manual analysis & report
        </Text>

        {/* Results Section */}
        {showResults && analysisResult && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsSectionTitle}>Analysis Complete!</Text>
            
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Risk Score</Text>
              <View style={[styles.riskBadge, { 
                backgroundColor: analysisResult.risk_score < 30 ? theme.colors.success : 
                  analysisResult.risk_score < 60 ? theme.colors.warning : theme.colors.error 
              }]}>
                <Text style={styles.riskBadgeText}>{analysisResult.risk_score || 50}/100</Text>
              </View>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Deviations Found</Text>
              <Text style={styles.resultValue}>{(analysisResult.deviations || []).length}</Text>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Recommendations</Text>
              <Text style={styles.resultValue}>{(analysisResult.recommendations || []).length}</Text>
            </View>

            {/* Generate PDF Button */}
            {paymentVerified || !qrCode ? (
              <TouchableOpacity
                style={styles.pdfButton}
                onPress={generatePDFReport}
                disabled={generatingPDF}
              >
                {generatingPDF ? (
                  <ActivityIndicator color={theme.colors.textPrimary} />
                ) : (
                  <>
                    <Ionicons name="document-text" size={24} color={theme.colors.textPrimary} />
                    <Text style={styles.pdfButtonText}>Generate PDF Report</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.paymentButton}
                onPress={handlePaymentFlow}
              >
                <Ionicons name="qr-code" size={24} color={theme.colors.textPrimary} />
                <Text style={styles.paymentButtonText}>Scan QR & Pay for Report</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Payment Modal */}
        <Modal
          visible={showPaymentModal}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Payment for Report</Text>
                <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Scan the QR code below to make payment, then upload screenshot
              </Text>

              {qrCode && (
                <Image source={{ uri: qrCode }} style={styles.qrImage} />
              )}

              <TouchableOpacity
                style={styles.screenshotButton}
                onPress={pickPaymentScreenshot}
              >
                {paymentScreenshot ? (
                  <Image source={{ uri: paymentScreenshot }} style={styles.screenshotPreview} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={32} color={theme.colors.accent} />
                    <Text style={styles.screenshotButtonText}>Upload Payment Screenshot</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitPaymentButton, !paymentScreenshot && styles.buttonDisabled]}
                onPress={submitPaymentProof}
                disabled={!paymentScreenshot || submittingPayment}
              >
                {submittingPayment ? (
                  <ActivityIndicator color={theme.colors.textPrimary} />
                ) : (
                  <Text style={styles.submitPaymentButtonText}>Submit Payment Proof</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Admin Submission Modal */}
        <Modal
          visible={showAdminSubmitModal}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Submit for Expert Analysis</Text>
                <TouchableOpacity onPress={() => setShowAdminSubmitModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.adminModalScroll}>
                <Text style={styles.adminModalSubtitle}>
                  Send your uploaded images to our expert team for detailed posture analysis and comprehensive report.
                </Text>

                {/* Patient Selection */}
                <Text style={styles.adminModalLabel}>Select Patient *</Text>
                {patients.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.patientSelector}>
                    {patients.map(patient => (
                      <TouchableOpacity
                        key={patient.id}
                        style={[
                          styles.patientChip,
                          selectedPatient?.id === patient.id && styles.patientChipSelected
                        ]}
                        onPress={() => setSelectedPatient(patient)}
                      >
                        <Text style={[
                          styles.patientChipText,
                          selectedPatient?.id === patient.id && styles.patientChipTextSelected
                        ]}>
                          {patient.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <TextInput
                    style={styles.adminModalInput}
                    placeholder="Enter patient name"
                    placeholderTextColor={theme.colors.textMuted}
                    value={patientName}
                    onChangeText={setPatientName}
                  />
                )}

                {/* Images Preview */}
                <Text style={styles.adminModalLabel}>Images to Submit</Text>
                <View style={styles.imagePreviewRow}>
                  {Object.entries(images).filter(([_, img]) => img !== null).map(([view, img]) => (
                    <View key={view} style={styles.adminImagePreview}>
                      <Image source={{ uri: img! }} style={styles.adminPreviewImg} />
                      <Text style={styles.adminPreviewLabel}>{view.replace('_', ' ')}</Text>
                    </View>
                  ))}
                </View>

                {/* Notes */}
                <Text style={styles.adminModalLabel}>Additional Notes (Optional)</Text>
                <TextInput
                  style={styles.adminModalTextArea}
                  placeholder="Add any observations or specific areas to focus on..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={adminSubmitNotes}
                  onChangeText={setAdminSubmitNotes}
                  multiline
                  numberOfLines={4}
                />

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.adminSubmitBtn, submittingToAdmin && styles.buttonDisabled]}
                  onPress={submitToAdmin}
                  disabled={submittingToAdmin}
                >
                  {submittingToAdmin ? (
                    <ActivityIndicator color={theme.colors.textPrimary} />
                  ) : (
                    <>
                      <Ionicons name="send" size={24} color={theme.colors.textPrimary} />
                      <Text style={styles.adminSubmitBtnText}>Submit Request</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  aiBadge: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  aiBadgeText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  section: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  sectionSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  input: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  viewsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  viewCard: {
    width: '47%',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  viewLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  uploadButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.md,
  },
  uploadBtn: {
    alignItems: 'center',
    padding: theme.spacing.sm,
  },
  uploadBtnText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  imagePreview: {
    position: 'relative',
    alignItems: 'center',
  },
  previewImage: {
    width: 100,
    height: 130,
    borderRadius: theme.borderRadius.md,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  analyzeButton: {
    flexDirection: 'row',
    backgroundColor: '#9C27B0',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  analyzeButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  resultsSection: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.success,
  },
  resultsSectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  resultCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  resultLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  resultValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  riskBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },
  riskBadgeText: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  pdfButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  pdfButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  paymentButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.warning,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  paymentButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  qrImage: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  screenshotButton: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.cardBorder,
    borderStyle: 'dashed',
    marginBottom: theme.spacing.md,
  },
  screenshotButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  screenshotPreview: {
    width: 150,
    height: 150,
    borderRadius: theme.borderRadius.md,
  },
  submitPaymentButton: {
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  submitPaymentButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  // Submit to Admin styles
  submitToAdminButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.info,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  submitToAdminButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  submitToAdminHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  adminModalScroll: {
    maxHeight: 500,
  },
  adminModalSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  adminModalLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  adminModalInput: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  adminModalTextArea: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  patientSelector: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  patientChip: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  patientChipSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  patientChipText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  patientChipTextSelected: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  imagePreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  adminImagePreview: {
    alignItems: 'center',
  },
  adminPreviewImg: {
    width: 70,
    height: 90,
    borderRadius: theme.borderRadius.sm,
  },
  adminPreviewLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  adminSubmitBtn: {
    flexDirection: 'row',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  adminSubmitBtnText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
});
