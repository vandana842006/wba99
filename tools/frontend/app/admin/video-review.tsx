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
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';

interface VideoRequest {
  id: string;
  patient_details: {
    name: string;
    age: number;
    height_cm: number;
    weight_kg: number;
    gender: string;
    phone?: string;
    email?: string;
    medical_history?: string;
    chief_complaint?: string;
  };
  analysis_type: string;
  video_data?: string;
  submitted_by: string;
  submitted_by_name?: string;
  submitted_at: string;
  status: string;
  reviewed_by?: string;
  reviewed_by_name?: string;
  analysis_results?: any;
  ai_analysis?: string;
  recommendations?: string[];
  overall_score?: number;
  admin_notes?: string;
  views?: string[];
}

interface Stats {
  total: number;
  pending: number;
  in_review: number;
  analyzed: number;
  report_sent: number;
}

export default function AdminVideoReviewScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  const [requests, setRequests] = useState<VideoRequest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const [selectedRequest, setSelectedRequest] = useState<VideoRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Analysis form state
  const [analysisForm, setAnalysisForm] = useState({
    overall_score: '',
    recommendations: '',
    admin_notes: '',
  });

  const STATUS_OPTIONS = [
    { id: 'all', label: 'All', color: theme.colors.textSecondary },
    { id: 'pending', label: 'Pending', color: theme.colors.warning },
    { id: 'in_review', label: 'In Review', color: theme.colors.info },
    { id: 'analyzed', label: 'Analyzed', color: theme.colors.success },
    { id: 'report_sent', label: 'Sent', color: theme.colors.accent },
  ];

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    if (!currentUser) return;
    
    try {
      const [requestsRes, statsRes] = await Promise.all([
        api.get('/video-analysis/requests', {
          params: filterStatus !== 'all' ? { status: filterStatus } : {}
        }),
        api.get(`/video-analysis/stats?admin_id=${currentUser.id}`)
      ]);
      
      setRequests(requestsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleStartReview = async (request: VideoRequest) => {
    if (!currentUser) return;
    
    try {
      await api.put(`/video-analysis/requests/${request.id}/review?admin_id=${currentUser.id}`);
      Alert.alert('Success', 'Review started');
      fetchData();
    } catch (error) {
      console.error('Error starting review:', error);
      Alert.alert('Error', 'Failed to start review');
    }
  };

  const handleSubmitAnalysis = async () => {
    if (!currentUser || !selectedRequest) return;
    
    if (!analysisForm.overall_score) {
      Alert.alert('Error', 'Please enter overall score');
      return;
    }
    
    setAnalyzing(true);
    try {
      const recommendations = analysisForm.recommendations
        .split('\n')
        .filter(r => r.trim());
      
      await api.put(
        `/video-analysis/requests/${selectedRequest.id}/analyze?admin_id=${currentUser.id}`,
        {
          analysis_results: {
            posture_score: parseFloat(analysisForm.overall_score),
            analyzed_at: new Date().toISOString(),
          },
          overall_score: parseFloat(analysisForm.overall_score),
          recommendations,
          admin_notes: analysisForm.admin_notes,
          status: 'analyzed',
        }
      );
      
      Alert.alert('Success', 'Analysis completed');
      setShowAnalysisModal(false);
      setShowDetailModal(false);
      resetAnalysisForm();
      fetchData();
    } catch (error) {
      console.error('Error submitting analysis:', error);
      Alert.alert('Error', 'Failed to submit analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSendReport = async (request: VideoRequest) => {
    if (!currentUser) return;
    
    Alert.alert(
      'Send Report',
      'This will mark the report as sent to the physio. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              await api.put(`/video-analysis/requests/${request.id}/send-report?admin_id=${currentUser.id}`);
              Alert.alert('Success', 'Report sent successfully');
              fetchData();
            } catch (error) {
              Alert.alert('Error', 'Failed to send report');
            }
          }
        }
      ]
    );
  };

  const handleDelete = async (request: VideoRequest) => {
    if (!currentUser) return;
    
    Alert.alert(
      'Delete Request',
      'Are you sure you want to delete this request? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/video-analysis/requests/${request.id}?admin_id=${currentUser.id}`);
              Alert.alert('Success', 'Request deleted');
              setShowDetailModal(false);
              fetchData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete request');
            }
          }
        }
      ]
    );
  };

  const resetAnalysisForm = () => {
    setAnalysisForm({
      overall_score: '',
      recommendations: '',
      admin_notes: '',
    });
  };

  const openAnalysisModal = (request: VideoRequest) => {
    setSelectedRequest(request);
    if (request.overall_score) {
      setAnalysisForm({
        overall_score: String(request.overall_score),
        recommendations: request.recommendations?.join('\n') || '',
        admin_notes: request.admin_notes || '',
      });
    }
    setShowAnalysisModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return theme.colors.warning;
      case 'in_review': return theme.colors.info;
      case 'analyzed': return theme.colors.success;
      case 'report_sent': return theme.colors.accent;
      default: return theme.colors.textMuted;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'in_review': return 'In Review';
      case 'analyzed': return 'Analyzed';
      case 'report_sent': return 'Report Sent';
      default: return status;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const RequestCard = ({ request }: { request: VideoRequest }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => {
        setSelectedRequest(request);
        setShowDetailModal(true);
      }}
    >
      <View style={styles.requestHeader}>
        <View style={styles.requestType}>
          <MaterialCommunityIcons
            name={request.analysis_type === 'posture' ? 'human' : request.analysis_type === 'walking' ? 'walk' : 'run'}
            size={24}
            color={theme.colors.accent}
          />
          <Text style={styles.requestTypeText}>{request.analysis_type.toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
            {getStatusLabel(request.status)}
          </Text>
        </View>
      </View>
      
      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>{request.patient_details.name}</Text>
        <Text style={styles.patientMeta}>
          {request.patient_details.age}y • {request.patient_details.height_cm}cm • {request.patient_details.weight_kg}kg
        </Text>
      </View>
      
      <View style={styles.requestFooter}>
        <Text style={styles.submittedBy}>By: {request.submitted_by_name || 'Unknown'}</Text>
        <Text style={styles.submittedAt}>{formatDate(request.submitted_at)}</Text>
      </View>

      {request.overall_score !== undefined && request.overall_score !== null && (
        <View style={styles.scorePreview}>
          <Text style={styles.scoreLabel}>Score:</Text>
          <Text style={[styles.scoreValue, { color: getStatusColor(request.overall_score >= 70 ? 'analyzed' : 'pending') }]}>
            {request.overall_score}%
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Video Analysis Review</Text>
          <Text style={styles.subtitle}>Review and analyze submitted videos</Text>
        </View>

        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderLeftColor: theme.colors.warning }]}>
              <Text style={styles.statValue}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: theme.colors.info }]}>
              <Text style={styles.statValue}>{stats.in_review}</Text>
              <Text style={styles.statLabel}>In Review</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: theme.colors.success }]}>
              <Text style={styles.statValue}>{stats.analyzed}</Text>
              <Text style={styles.statLabel}>Analyzed</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: theme.colors.accent }]}>
              <Text style={styles.statValue}>{stats.report_sent}</Text>
              <Text style={styles.statLabel}>Sent</Text>
            </View>
          </View>
        )}

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterContainer}>
            {STATUS_OPTIONS.map((status) => (
              <TouchableOpacity
                key={status.id}
                style={[styles.filterTab, filterStatus === status.id && styles.filterTabActive]}
                onPress={() => setFilterStatus(status.id)}
              >
                <Text style={[styles.filterText, filterStatus === status.id && styles.filterTextActive]}>
                  {status.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Requests List */}
        <Text style={styles.sectionTitle}>
          Requests ({requests.length})
        </Text>
        
        {requests.length > 0 ? (
          requests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="videocam-off" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No requests found</Text>
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
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
                {/* Status */}
                <View style={[styles.detailStatusBadge, { backgroundColor: getStatusColor(selectedRequest.status) }]}>
                  <Text style={styles.detailStatusText}>{getStatusLabel(selectedRequest.status)}</Text>
                </View>

                {/* Patient Details */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Patient Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name:</Text>
                    <Text style={styles.detailValue}>{selectedRequest.patient_details.name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Age:</Text>
                    <Text style={styles.detailValue}>{selectedRequest.patient_details.age} years</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Height:</Text>
                    <Text style={styles.detailValue}>{selectedRequest.patient_details.height_cm} cm</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Weight:</Text>
                    <Text style={styles.detailValue}>{selectedRequest.patient_details.weight_kg} kg</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Gender:</Text>
                    <Text style={styles.detailValue}>{selectedRequest.patient_details.gender}</Text>
                  </View>
                  {selectedRequest.patient_details.chief_complaint && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Complaint:</Text>
                      <Text style={styles.detailValue}>{selectedRequest.patient_details.chief_complaint}</Text>
                    </View>
                  )}
                </View>

                {/* Analysis Type */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Analysis Type</Text>
                  <Text style={styles.analysisTypeText}>{selectedRequest.analysis_type.toUpperCase()}</Text>
                  {selectedRequest.views && selectedRequest.views.length > 0 && (
                    <Text style={styles.viewsText}>Views: {selectedRequest.views.join(', ')}</Text>
                  )}
                </View>

                {/* Results (if analyzed) */}
                {selectedRequest.overall_score !== undefined && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Analysis Results</Text>
                    <View style={styles.scoreDisplay}>
                      <Text style={styles.scoreBig}>{selectedRequest.overall_score}%</Text>
                    </View>
                    {selectedRequest.recommendations && selectedRequest.recommendations.length > 0 && (
                      <View style={styles.recommendationsList}>
                        <Text style={styles.recommendationsTitle}>Recommendations:</Text>
                        {selectedRequest.recommendations.map((rec, i) => (
                          <Text key={i} style={styles.recommendationItem}>• {rec}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  {selectedRequest.status === 'pending' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: theme.colors.info }]}
                      onPress={() => handleStartReview(selectedRequest)}
                    >
                      <Ionicons name="eye" size={20} color={theme.colors.textPrimary} />
                      <Text style={styles.actionButtonText}>Start Review</Text>
                    </TouchableOpacity>
                  )}
                  
                  {(selectedRequest.status === 'in_review' || selectedRequest.status === 'pending') && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: theme.colors.success }]}
                      onPress={() => openAnalysisModal(selectedRequest)}
                    >
                      <Ionicons name="create" size={20} color={theme.colors.textPrimary} />
                      <Text style={styles.actionButtonText}>Add Analysis</Text>
                    </TouchableOpacity>
                  )}
                  
                  {selectedRequest.status === 'analyzed' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: theme.colors.accent }]}
                      onPress={() => handleSendReport(selectedRequest)}
                    >
                      <Ionicons name="send" size={20} color={theme.colors.textPrimary} />
                      <Text style={styles.actionButtonText}>Send Report</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
                    onPress={() => handleDelete(selectedRequest)}
                  >
                    <Ionicons name="trash" size={20} color={theme.colors.textPrimary} />
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Analysis Modal */}
      <Modal visible={showAnalysisModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Analysis</Text>
              <TouchableOpacity onPress={() => setShowAnalysisModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Overall Score (0-100)</Text>
                <TextInput
                  style={styles.input}
                  value={analysisForm.overall_score}
                  onChangeText={(text) => setAnalysisForm(prev => ({ ...prev, overall_score: text }))}
                  keyboardType="numeric"
                  placeholder="85"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Recommendations (one per line)</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={analysisForm.recommendations}
                  onChangeText={(text) => setAnalysisForm(prev => ({ ...prev, recommendations: text }))}
                  multiline
                  numberOfLines={5}
                  placeholder="Enter recommendations..."
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Admin Notes</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={analysisForm.admin_notes}
                  onChangeText={(text) => setAnalysisForm(prev => ({ ...prev, admin_notes: text }))}
                  multiline
                  numberOfLines={3}
                  placeholder="Internal notes..."
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              
              <TouchableOpacity
                style={[styles.submitAnalysisButton, analyzing && styles.buttonDisabled]}
                onPress={handleSubmitAnalysis}
                disabled={analyzing}
              >
                {analyzing ? (
                  <ActivityIndicator color={theme.colors.textPrimary} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.textPrimary} />
                    <Text style={styles.submitAnalysisText}>Submit Analysis</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  scrollContent: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: theme.spacing.lg },
  backButton: { position: 'absolute', left: 0, top: 0 },
  title: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  subtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
  statsGrid: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  statCard: { flex: 1, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, borderLeftWidth: 3, alignItems: 'center' },
  statValue: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  statLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
  filterScroll: { marginBottom: theme.spacing.md },
  filterContainer: { flexDirection: 'row', gap: theme.spacing.sm },
  filterTab: { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.card },
  filterTabActive: { backgroundColor: theme.colors.accent },
  filterText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  filterTextActive: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  requestCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  requestType: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  requestTypeText: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  statusBadge: { paddingVertical: theme.spacing.xs, paddingHorizontal: theme.spacing.sm, borderRadius: theme.borderRadius.sm },
  statusText: { fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.bold },
  patientInfo: { marginBottom: theme.spacing.sm },
  patientName: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  patientMeta: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  requestFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  submittedBy: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted },
  submittedAt: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted },
  scorePreview: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.cardBorder },
  scoreLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  scoreValue: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, marginLeft: theme.spacing.sm },
  emptyState: { alignItems: 'center', padding: theme.spacing.xl },
  emptyText: { fontSize: theme.fontSize.md, color: theme.colors.textMuted, marginTop: theme.spacing.md },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.primary, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder },
  modalTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  modalBody: { padding: theme.spacing.lg },
  detailStatusBadge: { alignSelf: 'flex-start', paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, borderRadius: theme.borderRadius.full, marginBottom: theme.spacing.lg },
  detailStatusText: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  detailSection: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md },
  detailSectionTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.accent, marginBottom: theme.spacing.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: theme.spacing.xs },
  detailLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  detailValue: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  analysisTypeText: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  viewsText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
  scoreDisplay: { alignItems: 'center', padding: theme.spacing.md },
  scoreBig: { fontSize: 48, fontWeight: theme.fontWeight.bold, color: theme.colors.success },
  recommendationsList: { marginTop: theme.spacing.md },
  recommendationsTitle: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  recommendationItem: { fontSize: theme.fontSize.sm, color: theme.colors.textPrimary, marginBottom: theme.spacing.xs },
  actionButtons: { gap: theme.spacing.sm, marginTop: theme.spacing.lg },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: theme.spacing.md, borderRadius: theme.borderRadius.md, gap: theme.spacing.sm },
  actionButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  inputGroup: { marginBottom: theme.spacing.md },
  inputLabel: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
  input: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, color: theme.colors.textPrimary, fontSize: theme.fontSize.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },
  submitAnalysisButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.success, padding: theme.spacing.lg, borderRadius: theme.borderRadius.md, gap: theme.spacing.sm, marginTop: theme.spacing.md },
  buttonDisabled: { opacity: 0.6 },
  submitAnalysisText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
});
