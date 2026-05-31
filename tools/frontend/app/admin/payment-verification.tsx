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
  RefreshControl,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';

interface PaymentSubmission {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  user_role: string;
  payment_type: string;
  amount: number;
  credits_requested: number;
  receipt_image: string;
  transaction_id?: string;
  notes?: string;
  status: string;
  admin_notes?: string;
  submitted_at: string;
  verified_at?: string;
  verified_by?: string;
}

export default function PaymentVerificationScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('pending');
  const [selectedSubmission, setSelectedSubmission] = useState<PaymentSubmission | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [creditsToAdd, setCreditsToAdd] = useState('');

  useEffect(() => {
    fetchSubmissions();
  }, [activeFilter]);

  const fetchSubmissions = async () => {
    try {
      const params = new URLSearchParams({
        admin_id: currentUser?.id || '',
        ...(activeFilter !== 'all' && { status: activeFilter }),
        limit: '50'
      });
      const res = await api.get(`/payments/submissions?${params}`);
      setSubmissions(res.data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubmissions();
  };

  const handleViewDetails = (submission: PaymentSubmission) => {
    setSelectedSubmission(submission);
    setAdminNotes('');
    setCreditsToAdd(submission.credits_requested?.toString() || '0');
    setModalVisible(true);
  };

  const handleVerify = async (action: 'approve' | 'reject') => {
    if (!selectedSubmission) return;
    
    setProcessing(true);
    try {
      const params = new URLSearchParams({
        admin_id: currentUser?.id || '',
        action: action,
        ...(adminNotes && { admin_notes: adminNotes }),
        ...(action === 'approve' && creditsToAdd && { credits_to_add: creditsToAdd })
      });
      
      await api.post(`/payments/verify/${selectedSubmission.id}?${params}`);
      
      Alert.alert(
        'Success',
        `Payment ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      );
      
      setModalVisible(false);
      fetchSubmissions();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return theme.colors.warning;
      case 'approved': return theme.colors.success;
      case 'rejected': return theme.colors.error;
      default: return theme.colors.textMuted;
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'credits': return '💰 Credits Purchase';
      case 'signup': return '🆕 Account Activation';
      case 'subscription': return '📅 Subscription';
      default: return type;
    }
  };

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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Verification</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {['pending', 'approved', 'rejected', 'all'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterTab, activeFilter === filter && styles.filterTabActive]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: theme.colors.warning + '20' }]}>
          <Text style={[styles.statNumber, { color: theme.colors.warning }]}>
            {submissions.filter(s => s.status === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme.colors.success + '20' }]}>
          <Text style={[styles.statNumber, { color: theme.colors.success }]}>
            {submissions.filter(s => s.status === 'approved').length}
          </Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme.colors.error + '20' }]}>
          <Text style={[styles.statNumber, { color: theme.colors.error }]}>
            {submissions.filter(s => s.status === 'rejected').length}
          </Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {submissions.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="check-decagram" size={64} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No {activeFilter !== 'all' ? activeFilter : ''} payments</Text>
          </View>
        ) : (
          submissions.map((submission) => (
            <TouchableOpacity
              key={submission.id}
              style={styles.submissionCard}
              onPress={() => handleViewDetails(submission)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{submission.user_name}</Text>
                  <Text style={styles.userEmail}>{submission.user_email}</Text>
                  <Text style={styles.userRole}>{submission.user_role.toUpperCase()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(submission.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(submission.status) }]}>
                    {submission.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              
              <View style={styles.cardBody}>
                <Text style={styles.paymentType}>{getPaymentTypeLabel(submission.payment_type)}</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Amount:</Text>
                  <Text style={styles.amountValue}>₹{submission.amount}</Text>
                </View>
                {submission.credits_requested > 0 && (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Credits:</Text>
                    <Text style={styles.amountValue}>{submission.credits_requested}</Text>
                  </View>
                )}
                {submission.transaction_id && (
                  <Text style={styles.transactionId}>Txn: {submission.transaction_id}</Text>
                )}
              </View>
              
              <View style={styles.cardFooter}>
                <Text style={styles.dateText}>{formatDate(submission.submitted_at)}</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              </View>
            </TouchableOpacity>
          ))
        )}
        
        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            {selectedSubmission && (
              <ScrollView style={styles.modalBody}>
                {/* User Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>User</Text>
                  <Text style={styles.detailValue}>{selectedSubmission.user_name}</Text>
                  <Text style={styles.detailSubvalue}>{selectedSubmission.user_email}</Text>
                  <Text style={styles.detailSubvalue}>{selectedSubmission.user_role.toUpperCase()}</Text>
                </View>
                
                {/* Payment Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Payment Type</Text>
                  <Text style={styles.detailValue}>{getPaymentTypeLabel(selectedSubmission.payment_type)}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <View style={styles.detailHalf}>
                    <Text style={styles.detailLabel}>Amount</Text>
                    <Text style={styles.detailValueLarge}>₹{selectedSubmission.amount}</Text>
                  </View>
                  <View style={styles.detailHalf}>
                    <Text style={styles.detailLabel}>Credits Requested</Text>
                    <Text style={styles.detailValueLarge}>{selectedSubmission.credits_requested}</Text>
                  </View>
                </View>
                
                {selectedSubmission.transaction_id && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Transaction ID</Text>
                    <Text style={styles.detailValue}>{selectedSubmission.transaction_id}</Text>
                  </View>
                )}
                
                {selectedSubmission.notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>User Notes</Text>
                    <Text style={styles.detailValue}>{selectedSubmission.notes}</Text>
                  </View>
                )}
                
                {/* Receipt Image */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Payment Receipt</Text>
                  {selectedSubmission.receipt_image && (
                    <Image
                      source={{ uri: selectedSubmission.receipt_image }}
                      style={styles.receiptImage}
                      resizeMode="contain"
                    />
                  )}
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Submitted</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedSubmission.submitted_at)}</Text>
                </View>
                
                {/* Admin Actions (only for pending) */}
                {selectedSubmission.status === 'pending' && (
                  <View style={styles.adminActions}>
                    <Text style={styles.sectionTitle}>Admin Actions</Text>
                    
                    {selectedSubmission.payment_type === 'credits' && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Credits to Add</Text>
                        <TextInput
                          style={styles.input}
                          keyboardType="numeric"
                          value={creditsToAdd}
                          onChangeText={setCreditsToAdd}
                          placeholder="Enter credits"
                          placeholderTextColor={theme.colors.textMuted}
                        />
                      </View>
                    )}
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Admin Notes (Optional)</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        multiline
                        numberOfLines={3}
                        value={adminNotes}
                        onChangeText={setAdminNotes}
                        placeholder="Add notes..."
                        placeholderTextColor={theme.colors.textMuted}
                      />
                    </View>
                    
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => handleVerify('reject')}
                        disabled={processing}
                      >
                        {processing ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="close-circle" size={20} color="#fff" />
                            <Text style={styles.actionBtnText}>Reject</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.approveBtn]}
                        onPress={() => handleVerify('approve')}
                        disabled={processing}
                      >
                        {processing ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={styles.actionBtnText}>Approve</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                
                {/* Already processed */}
                {selectedSubmission.status !== 'pending' && (
                  <View style={styles.processedInfo}>
                    <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedSubmission.status) + '20' }]}>
                      <Text style={[styles.statusTextLarge, { color: getStatusColor(selectedSubmission.status) }]}>
                        {selectedSubmission.status === 'approved' ? '✅ APPROVED' : '❌ REJECTED'}
                      </Text>
                    </View>
                    {selectedSubmission.verified_at && (
                      <Text style={styles.processedDate}>
                        Processed on {formatDate(selectedSubmission.verified_at)}
                      </Text>
                    )}
                    {selectedSubmission.admin_notes && (
                      <View style={styles.adminNotesBox}>
                        <Text style={styles.adminNotesLabel}>Admin Notes:</Text>
                        <Text style={styles.adminNotesText}>{selectedSubmission.admin_notes}</Text>
                      </View>
                    )}
                  </View>
                )}
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
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: theme.colors.accent,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  filterTextActive: {
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    marginTop: 12,
  },
  submissionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  userEmail: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  userRole: {
    fontSize: 10,
    color: theme.colors.accent,
    fontWeight: '600',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
  },
  paymentType: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  amountValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  transactionId: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  dateText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  modalBody: {
    padding: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  detailSubvalue: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailHalf: {
    flex: 1,
  },
  detailValueLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.accent,
  },
  receiptImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    marginTop: 8,
  },
  adminActions: {
    marginTop: 20,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  rejectBtn: {
    backgroundColor: theme.colors.error,
  },
  approveBtn: {
    backgroundColor: theme.colors.success,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  processedInfo: {
    alignItems: 'center',
    padding: 20,
  },
  statusBadgeLarge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusTextLarge: {
    fontSize: 16,
    fontWeight: '700',
  },
  processedDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  adminNotesBox: {
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    width: '100%',
  },
  adminNotesLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  adminNotesText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
});
