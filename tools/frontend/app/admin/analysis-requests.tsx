import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';

interface AnalysisRequest {
  id: string;
  request_type: 'posture' | 'walking' | 'running';
  status: 'pending' | 'under_review' | 'analyzed' | 'delivered';
  physio_id: string;
  physio_name: string;
  physio_email: string;
  patient_id: string;
  patient_name: string;
  original_media_url: string;
  original_media_type: string;
  original_notes?: string;
  analyzed_media_url?: string;
  report_pdf_url?: string;
  admin_notes?: string;
  created_at: string;
  analyzed_at?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#FF9800',
  under_review: '#2196F3',
  analyzed: '#4CAF50',
  delivered: '#9C27B0',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  analyzed: 'Analyzed',
  delivered: 'Delivered',
};

export default function AdminAnalysisRequests() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [requests, setRequests] = useState<AnalysisRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AnalysisRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  
  // Analysis submission states
  const [analyzedImage, setAnalyzedImage] = useState<string | null>(null);
  const [reportPdf, setReportPdf] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filterStatus, filterType]);

  const fetchRequests = async () => {
    try {
      let url = `/analysis-requests?user_id=${currentUser?.id}&role=admin`;
      if (filterStatus) url += `&status=${filterStatus}`;
      if (filterType) url += `&request_type=${filterType}`;
      
      const response = await api.get(url);
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const updateStatus = async (requestId: string, newStatus: string) => {
    try {
      await api.patch(`/analysis-requests/${requestId}/status?admin_id=${currentUser?.id}`, {
        status: newStatus,
      });
      fetchRequests();
      Alert.alert('Success', `Status updated to ${STATUS_LABELS[newStatus]}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const openAnalysisModal = (request: AnalysisRequest) => {
    setSelectedRequest(request);
    setAnalyzedImage(null);
    setReportPdf(null);
    setAdminNotes('');
    setShowAnalysisModal(true);
  };

  const pickAnalyzedImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setAnalyzedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const pickReportPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const fileUri = result.assets[0].uri;
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: 'base64',
        });
        setReportPdf(`data:application/pdf;base64,${base64}`);
        Alert.alert('PDF Selected', result.assets[0].name);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick PDF file');
    }
  };

  const submitAnalysis = async () => {
    if (!selectedRequest || !analyzedImage || !reportPdf) {
      Alert.alert('Required', 'Please upload both analyzed image and PDF report');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/analysis-requests/${selectedRequest.id}/submit-analysis?admin_id=${currentUser?.id}`, {
        analyzed_media_url: analyzedImage,
        report_pdf_url: reportPdf,
        admin_notes: adminNotes,
      });
      
      Alert.alert('Success', 'Analysis submitted successfully! The physio will be notified.');
      setShowAnalysisModal(false);
      fetchRequests();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit analysis');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'posture': return 'body';
      case 'walking': return 'walk';
      case 'running': return 'bicycle';
      default: return 'fitness';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const underReviewCount = requests.filter(r => r.status === 'under_review').length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading analysis requests...</Text>
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
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analysis Requests</Text>
          <View style={styles.badgeContainer}>
            {pendingCount > 0 && (
              <View style={[styles.badge, { backgroundColor: STATUS_COLORS.pending }]}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderLeftColor: STATUS_COLORS.pending }]}>
            <Text style={styles.summaryValue}>{pendingCount}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: STATUS_COLORS.under_review }]}>
            <Text style={styles.summaryValue}>{underReviewCount}</Text>
            <Text style={styles.summaryLabel}>Under Review</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: STATUS_COLORS.analyzed }]}>
            <Text style={styles.summaryValue}>{requests.filter(r => r.status === 'analyzed').length}</Text>
            <Text style={styles.summaryLabel}>Analyzed</Text>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Filter by Status:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterChip, !filterStatus && styles.filterChipActive]}
              onPress={() => setFilterStatus(null)}
            >
              <Text style={[styles.filterChipText, !filterStatus && styles.filterChipTextActive]}>All</Text>
            </TouchableOpacity>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.filterChip, filterStatus === key && styles.filterChipActive]}
                onPress={() => setFilterStatus(key)}
              >
                <Text style={[styles.filterChipText, filterStatus === key && styles.filterChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Filter by Type:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterChip, !filterType && styles.filterChipActive]}
              onPress={() => setFilterType(null)}
            >
              <Text style={[styles.filterChipText, !filterType && styles.filterChipTextActive]}>All</Text>
            </TouchableOpacity>
            {['posture', 'walking', 'running'].map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.filterChip, filterType === type && styles.filterChipActive]}
                onPress={() => setFilterType(type)}
              >
                <MaterialCommunityIcons 
                  name={getTypeIcon(type) as any} 
                  size={16} 
                  color={filterType === type ? theme.colors.textPrimary : theme.colors.textSecondary} 
                />
                <Text style={[styles.filterChipText, filterType === type && styles.filterChipTextActive]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Request List */}
        <Text style={styles.sectionTitle}>
          {requests.length} Request{requests.length !== 1 ? 's' : ''}
        </Text>

        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No analysis requests found</Text>
          </View>
        ) : (
          requests.map(request => (
            <TouchableOpacity
              key={request.id}
              style={styles.requestCard}
              onPress={() => {
                setSelectedRequest(request);
                setShowDetailModal(true);
              }}
            >
              <View style={styles.requestHeader}>
                <View style={styles.typeContainer}>
                  <MaterialCommunityIcons 
                    name={getTypeIcon(request.request_type) as any} 
                    size={24} 
                    color={theme.colors.accent} 
                  />
                  <Text style={styles.requestType}>
                    {request.request_type.charAt(0).toUpperCase() + request.request_type.slice(1)} Analysis
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[request.status] }]}>
                  <Text style={styles.statusText}>{STATUS_LABELS[request.status]}</Text>
                </View>
              </View>

              <View style={styles.requestInfo}>
                <View style={styles.infoRow}>
                  <Ionicons name="person" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.infoText}>Patient: {request.patient_name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="medical" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.infoText}>Physio: {request.physio_name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="calendar" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.infoText}>{formatDate(request.created_at)}</Text>
                </View>
              </View>

              {request.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: STATUS_COLORS.under_review }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      updateStatus(request.id, 'under_review');
                    }}
                  >
                    <Text style={styles.actionBtnText}>Start Review</Text>
                  </TouchableOpacity>
                </View>
              )}

              {request.status === 'under_review' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: theme.colors.success }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      openAnalysisModal(request);
                    }}
                  >
                    <Ionicons name="cloud-upload" size={16} color={theme.colors.textPrimary} />
                    <Text style={styles.actionBtnText}>Upload Analysis</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <ScrollView style={styles.modalBody}>
                <View style={[styles.statusBadgeLarge, { backgroundColor: STATUS_COLORS[selectedRequest.status] }]}>
                  <Text style={styles.statusTextLarge}>{STATUS_LABELS[selectedRequest.status]}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Analysis Type</Text>
                  <Text style={styles.detailValue}>
                    {selectedRequest.request_type.charAt(0).toUpperCase() + selectedRequest.request_type.slice(1)}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Patient</Text>
                  <Text style={styles.detailValue}>{selectedRequest.patient_name}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Physio</Text>
                  <Text style={styles.detailValue}>{selectedRequest.physio_name}</Text>
                  <Text style={styles.detailSubValue}>{selectedRequest.physio_email}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Original Media</Text>
                  {selectedRequest.original_media_url && (
                    <Image 
                      source={{ uri: selectedRequest.original_media_url }} 
                      style={styles.mediaPreview}
                      resizeMode="contain"
                    />
                  )}
                </View>

                {selectedRequest.original_notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Physio Notes</Text>
                    <Text style={styles.detailNotes}>{selectedRequest.original_notes}</Text>
                  </View>
                )}

                {selectedRequest.status === 'analyzed' && selectedRequest.analyzed_media_url && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Analyzed Media</Text>
                    <Image 
                      source={{ uri: selectedRequest.analyzed_media_url }} 
                      style={styles.mediaPreview}
                      resizeMode="contain"
                    />
                  </View>
                )}

                {selectedRequest.admin_notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Admin Notes</Text>
                    <Text style={styles.detailNotes}>{selectedRequest.admin_notes}</Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Created At</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedRequest.created_at)}</Text>
                </View>

                {selectedRequest.analyzed_at && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Analyzed At</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedRequest.analyzed_at)}</Text>
                  </View>
                )}

                {selectedRequest.status === 'under_review' && (
                  <TouchableOpacity
                    style={styles.uploadAnalysisBtn}
                    onPress={() => {
                      setShowDetailModal(false);
                      openAnalysisModal(selectedRequest);
                    }}
                  >
                    <Ionicons name="cloud-upload" size={24} color={theme.colors.textPrimary} />
                    <Text style={styles.uploadAnalysisBtnText}>Upload Analysis & Report</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Analysis Upload Modal */}
      <Modal visible={showAnalysisModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Analysis</Text>
              <TouchableOpacity onPress={() => setShowAnalysisModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedRequest && (
                <>
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientInfoLabel}>Patient:</Text>
                    <Text style={styles.patientInfoValue}>{selectedRequest.patient_name}</Text>
                  </View>

                  {/* Original Image Preview */}
                  <View style={styles.uploadSection}>
                    <Text style={styles.uploadLabel}>Original Image</Text>
                    <Image 
                      source={{ uri: selectedRequest.original_media_url }} 
                      style={styles.originalPreview}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Analyzed Image Upload */}
                  <View style={styles.uploadSection}>
                    <Text style={styles.uploadLabel}>Upload Analyzed Image *</Text>
                    <TouchableOpacity style={styles.uploadBox} onPress={pickAnalyzedImage}>
                      {analyzedImage ? (
                        <Image source={{ uri: analyzedImage }} style={styles.uploadPreview} />
                      ) : (
                        <>
                          <Ionicons name="image" size={40} color={theme.colors.accent} />
                          <Text style={styles.uploadBoxText}>Tap to upload analyzed image</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* PDF Report Upload */}
                  <View style={styles.uploadSection}>
                    <Text style={styles.uploadLabel}>Upload PDF Report *</Text>
                    <TouchableOpacity style={styles.uploadBox} onPress={pickReportPdf}>
                      {reportPdf ? (
                        <View style={styles.pdfSelected}>
                          <Ionicons name="document-text" size={40} color={theme.colors.success} />
                          <Text style={styles.pdfSelectedText}>PDF Report Selected</Text>
                        </View>
                      ) : (
                        <>
                          <Ionicons name="document-attach" size={40} color={theme.colors.warning} />
                          <Text style={styles.uploadBoxText}>Tap to upload PDF report</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Admin Notes */}
                  <View style={styles.uploadSection}>
                    <Text style={styles.uploadLabel}>Admin Notes (Optional)</Text>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Add any notes or observations..."
                      placeholderTextColor={theme.colors.textMuted}
                      value={adminNotes}
                      onChangeText={setAdminNotes}
                      multiline
                      numberOfLines={4}
                    />
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[styles.submitBtn, (!analyzedImage || !reportPdf) && styles.submitBtnDisabled]}
                    onPress={submitAnalysis}
                    disabled={!analyzedImage || !reportPdf || submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color={theme.colors.textPrimary} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={24} color={theme.colors.textPrimary} />
                        <Text style={styles.submitBtnText}>Submit Analysis</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  headerTitle: {
    flex: 1,
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.md,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginHorizontal: 4,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  summaryLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  filterSection: {
    marginBottom: theme.spacing.md,
  },
  filterTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing.sm,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: theme.colors.accent,
  },
  filterChipText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  filterChipTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.md,
  },
  requestCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  requestType: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
  },
  requestInfo: {
    gap: theme.spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  infoText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  actionBtnText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  modalBody: {
    padding: theme.spacing.lg,
  },
  statusBadgeLarge: {
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  statusTextLarge: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  detailSection: {
    marginBottom: theme.spacing.lg,
  },
  detailLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  detailValue: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.semibold,
  },
  detailSubValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  detailNotes: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.primaryLight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  mediaPreview: {
    width: '100%',
    height: 250,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primaryLight,
  },
  uploadAnalysisBtn: {
    flexDirection: 'row',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  uploadAnalysisBtnText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  patientInfoLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.sm,
  },
  patientInfoValue: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  uploadSection: {
    marginBottom: theme.spacing.lg,
  },
  uploadLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.semibold,
    marginBottom: theme.spacing.sm,
  },
  originalPreview: {
    width: '100%',
    height: 150,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primaryLight,
  },
  uploadBox: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.cardBorder,
    borderStyle: 'dashed',
    minHeight: 150,
  },
  uploadBoxText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
  },
  uploadPreview: {
    width: '100%',
    height: 150,
    borderRadius: theme.borderRadius.md,
  },
  pdfSelected: {
    alignItems: 'center',
  },
  pdfSelectedText: {
    color: theme.colors.success,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    marginTop: theme.spacing.sm,
  },
  notesInput: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xxl,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
});
