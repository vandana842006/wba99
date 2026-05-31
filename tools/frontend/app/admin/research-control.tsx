import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PublicationRequest {
  id: string;
  type: string;
  title: string;
  condition_focus: string;
  requester_name: string;
  requester_role: string;
  organization_name?: string;
  sample_size: number;
  amount: number;
  payment_screenshot?: string;
  created_at: string;
}

interface DownloadRequest {
  id: string;
  type: string;
  download_type: string;
  condition_filter: string;
  requester_name: string;
  requester_role: string;
  row_count: number;
  amount: number;
  payment_screenshot?: string;
  created_at: string;
}

export default function AdminResearchControl() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  
  // Data states
  const [pendingData, setPendingData] = useState<any>(null);
  const [allRequests, setAllRequests] = useState<any>(null);
  
  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchAllData = useCallback(async () => {
    try {
      // Fetch pending requests
      const pendingRes = await api.get('/admin/research/pending-requests');
      setPendingData(pendingRes.data);

      // Fetch all requests
      const allRes = await api.get('/admin/research/all-requests');
      setAllRequests(allRes.data);

    } catch (error) {
      console.error('Fetch research requests error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handleApproval = async (action: 'approve' | 'reject') => {
    if (!selectedRequest || !currentUser?.id) return;
    
    setProcessing(true);
    try {
      const isPublication = selectedRequest.type === 'publication';
      const endpoint = isPublication 
        ? `/admin/research/publication/${selectedRequest.id}/approve`
        : `/admin/research/download/${selectedRequest.id}/approve`;
      
      await api.post(endpoint, {
        admin_id: currentUser.id,
        admin_name: currentUser.name,
        action: action,
        notes: adminNotes
      });
      
      Alert.alert(
        'Success', 
        `Request ${action}d successfully!`,
        [{ text: 'OK', onPress: () => {
          setShowDetailModal(false);
          setSelectedRequest(null);
          setAdminNotes('');
          fetchAllData();
        }}]
      );
      
    } catch (error) {
      console.error('Approval error:', error);
      Alert.alert('Error', `Failed to ${action} request`);
    } finally {
      setProcessing(false);
    }
  };

  const openRequestDetail = (request: any) => {
    setSelectedRequest(request);
    setAdminNotes('');
    setShowDetailModal(true);
  };

  const getFilteredRequests = () => {
    if (!allRequests) return { publications: [], downloads: [] };
    
    let publications = allRequests.publication_requests || [];
    let downloads = allRequests.download_requests || [];
    
    if (activeTab === 'pending') {
      publications = (pendingData?.publication_requests || []);
      downloads = (pendingData?.download_requests || []);
    } else if (activeTab !== 'all') {
      publications = publications.filter((r: any) => r.admin_status === activeTab);
      downloads = downloads.filter((r: any) => r.admin_status === activeTab);
    }
    
    return { publications, downloads };
  };

  const renderRequestCard = (request: any, isPublication: boolean) => {
    const statusColors: Record<string, string> = {
      pending: '#FF9800',
      approved: '#4CAF50',
      rejected: '#f44336'
    };
    
    return (
      <TouchableOpacity 
        key={request.id}
        style={styles.requestCard}
        onPress={() => openRequestDetail({ ...request, type: isPublication ? 'publication' : 'download' })}
      >
        <View style={styles.requestHeader}>
          <View style={styles.requestType}>
            <MaterialCommunityIcons 
              name={isPublication ? "book-open-variant" : "download"} 
              size={20} 
              color={isPublication ? '#673AB7' : '#2196F3'} 
            />
            <Text style={styles.requestTypeText}>
              {isPublication ? 'PUBLICATION' : 'DOWNLOAD'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[request.admin_status] || '#9E9E9E' }]}>
            <Text style={styles.statusText}>{(request.admin_status || 'pending').toUpperCase()}</Text>
          </View>
        </View>
        
        <Text style={styles.requestTitle}>
          {isPublication ? request.title : `${request.condition_filter || 'All Data'} (${request.download_type?.toUpperCase()})`}
        </Text>
        
        <View style={styles.requestInfo}>
          <Text style={styles.requestInfoText}>
            <Ionicons name="person" size={12} /> {request.requester_name} ({request.requester_role})
          </Text>
          {request.organization_name && (
            <Text style={styles.requestInfoText}>
              <Ionicons name="business" size={12} /> {request.organization_name}
            </Text>
          )}
        </View>
        
        <View style={styles.requestFooter}>
          <Text style={styles.amountText}>₹{request.amount}</Text>
          <Text style={styles.countText}>
            {isPublication ? `${request.sample_size} patients` : `${request.row_count} records`}
          </Text>
          <Text style={styles.dateText}>
            {new Date(request.created_at).toLocaleDateString()}
          </Text>
        </View>
        
        {request.payment_screenshot && (
          <View style={styles.paymentIndicator}>
            <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
            <Text style={styles.paymentText}>Payment Screenshot Uploaded</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const filteredRequests = getFilteredRequests();
  const totalPending = (pendingData?.total_pending || 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading research requests...</Text>
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
        <View style={styles.headerTitleContainer}>
          <MaterialCommunityIcons name="shield-check" size={28} color={theme.colors.accent} />
          <Text style={styles.headerTitle}>Research Control</Text>
        </View>
        {totalPending > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingCount}>{totalPending}</Text>
          </View>
        )}
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#FF9800' }]}>
          <Text style={styles.summaryValue}>{totalPending}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#4CAF50' }]}>
          <Text style={styles.summaryValue}>
            {(allRequests?.publication_requests?.filter((r: any) => r.admin_status === 'approved').length || 0) +
             (allRequests?.download_requests?.filter((r: any) => r.admin_status === 'approved').length || 0)}
          </Text>
          <Text style={styles.summaryLabel}>Approved</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#f44336' }]}>
          <Text style={styles.summaryValue}>
            {(allRequests?.publication_requests?.filter((r: any) => r.admin_status === 'rejected').length || 0) +
             (allRequests?.download_requests?.filter((r: any) => r.admin_status === 'rejected').length || 0)}
          </Text>
          <Text style={styles.summaryLabel}>Rejected</Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabScrollView}
        contentContainerStyle={styles.tabContainer}
      >
        {[
          { id: 'pending', label: 'Pending Review', icon: 'time' },
          { id: 'approved', label: 'Approved', icon: 'checkmark-circle' },
          { id: 'rejected', label: 'Rejected', icon: 'close-circle' },
          { id: 'all', label: 'All Requests', icon: 'list' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={16} 
              color={activeTab === tab.id ? '#fff' : theme.colors.textMuted} 
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Publication Requests */}
        {filteredRequests.publications.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Publication Requests ({filteredRequests.publications.length})
            </Text>
            {filteredRequests.publications.map((req: any) => renderRequestCard(req, true))}
          </>
        )}

        {/* Download Requests */}
        {filteredRequests.downloads.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Download Requests ({filteredRequests.downloads.length})
            </Text>
            {filteredRequests.downloads.map((req: any) => renderRequestCard(req, false))}
          </>
        )}

        {filteredRequests.publications.length === 0 && filteredRequests.downloads.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>
              {activeTab === 'pending' ? 'No pending requests' : 'No requests found'}
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: SCREEN_HEIGHT * 0.9 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            {selectedRequest && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Request Type Badge */}
                <View style={styles.detailBadge}>
                  <MaterialCommunityIcons 
                    name={selectedRequest.type === 'publication' ? "book-open-variant" : "download"} 
                    size={20} 
                    color="#fff" 
                  />
                  <Text style={styles.detailBadgeText}>
                    {selectedRequest.type === 'publication' ? 'PUBLICATION REQUEST' : 'DOWNLOAD REQUEST'}
                  </Text>
                </View>
                
                {/* Title */}
                <Text style={styles.detailTitle}>
                  {selectedRequest.type === 'publication' 
                    ? selectedRequest.title 
                    : `${selectedRequest.condition_filter || 'All Data'} (${selectedRequest.download_type?.toUpperCase()})`}
                </Text>
                
                {/* Requester Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Requester</Text>
                  <Text style={styles.detailValue}>{selectedRequest.requester_name}</Text>
                  <Text style={styles.detailSubvalue}>
                    Role: {selectedRequest.requester_role} 
                    {selectedRequest.organization_name && ` • Org: ${selectedRequest.organization_name}`}
                  </Text>
                </View>
                
                {/* Data Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Data</Text>
                  <Text style={styles.detailValue}>
                    {selectedRequest.type === 'publication' 
                      ? `${selectedRequest.sample_size} patients • Condition: ${selectedRequest.condition_focus}`
                      : `${selectedRequest.row_count} records • Scope: ${selectedRequest.data_scope || 'own'}`}
                  </Text>
                </View>
                
                {/* Payment Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Payment</Text>
                  <Text style={styles.detailAmount}>₹{selectedRequest.amount}</Text>
                  <Text style={styles.detailSubvalue}>
                    Status: {selectedRequest.payment_status || 'pending'}
                  </Text>
                </View>
                
                {/* Payment Screenshot */}
                {selectedRequest.payment_screenshot && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Payment Screenshot</Text>
                    <Image 
                      source={{ uri: selectedRequest.payment_screenshot }}
                      style={styles.screenshotImage}
                      resizeMode="contain"
                    />
                  </View>
                )}
                
                {/* Admin Notes */}
                {selectedRequest.admin_status === 'pending' && (
                  <>
                    <Text style={styles.detailLabel}>Admin Notes (Optional)</Text>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Add notes for the requester..."
                      placeholderTextColor={theme.colors.textMuted}
                      value={adminNotes}
                      onChangeText={setAdminNotes}
                      multiline
                      numberOfLines={3}
                    />
                    
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => handleApproval('reject')}
                        disabled={processing}
                      >
                        {processing ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Ionicons name="close-circle" size={20} color="#fff" />
                            <Text style={styles.actionBtnText}>Reject</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.approveBtn]}
                        onPress={() => handleApproval('approve')}
                        disabled={processing}
                      >
                        {processing ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={styles.actionBtnText}>Approve</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
                
                {selectedRequest.admin_status !== 'pending' && (
                  <View style={styles.completedSection}>
                    <Text style={[styles.completedText, { 
                      color: selectedRequest.admin_status === 'approved' ? '#4CAF50' : '#f44336' 
                    }]}>
                      {selectedRequest.admin_status === 'approved' ? '✓ APPROVED' : '✗ REJECTED'}
                    </Text>
                    {selectedRequest.admin_notes && (
                      <Text style={styles.adminNotesText}>Notes: {selectedRequest.admin_notes}</Text>
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
    backgroundColor: theme.colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  pendingBadge: {
    backgroundColor: '#f44336',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  summaryCard: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  tabScrollView: {
    maxHeight: 50,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  tabContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  tabActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  tabText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  requestCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requestTypeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  requestInfo: {
    marginBottom: 8,
  },
  requestInfoText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  countText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  dateText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  paymentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  paymentText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl * 2,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    marginTop: theme.spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#673AB7',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: theme.spacing.md,
  },
  detailBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  detailSection: {
    marginBottom: theme.spacing.lg,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  detailSubvalue: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  detailAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  screenshotImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: theme.colors.primary,
  },
  notesInput: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: 14,
    marginBottom: theme.spacing.lg,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: theme.spacing.md,
    borderRadius: 12,
  },
  approveBtn: {
    backgroundColor: '#4CAF50',
  },
  rejectBtn: {
    backgroundColor: '#f44336',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  completedSection: {
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    marginBottom: theme.spacing.lg,
  },
  completedText: {
    fontSize: 18,
    fontWeight: '700',
  },
  adminNotesText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
