import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import api from '../../src/utils/api';
import { useStore } from '../../src/store/useStore';

export default function OrganizationManagement() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');

  const fetchData = async () => {
    try {
      const [orgsRes, paymentsRes] = await Promise.all([
        api.get('/organizations'),
        api.get('/organizations/payments/pending'),
      ]);
      setOrganizations(orgsRes.data || []);
      setPendingPayments(paymentsRes.data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleApprove = async (org: any) => {
    Alert.alert(
      'Approve Organization',
      `Are you sure you want to approve "${org.name}"? This will create an account for the organization head.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await api.post(`/organizations/${org.id}/approve?admin_id=${currentUser?.id}`);
              Alert.alert('Success', 'Organization approved successfully');
              fetchData();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to approve');
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!selectedOrg) return;
    
    try {
      await api.post(`/organizations/${selectedOrg.id}/reject?admin_id=${currentUser?.id}&reason=${encodeURIComponent(rejectReason)}`);
      Alert.alert('Success', 'Organization rejected');
      setShowRejectModal(false);
      setSelectedOrg(null);
      setRejectReason('');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to reject');
    }
  };

  const handleVerifyPayment = async (payment: any, approved: boolean) => {
    try {
      await api.post(`/organizations/payments/${payment.id}/verify?admin_id=${currentUser?.id}&approved=${approved}`);
      Alert.alert('Success', approved ? 'Payment verified and credits added' : 'Payment rejected');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to verify');
    }
  };

  const filteredOrgs = organizations.filter(org => {
    if (filter === 'all') return true;
    if (filter === 'pending') return org.approval_status === 'pending';
    if (filter === 'active') return org.status === 'active';
    if (filter === 'suspended') return org.status === 'suspended';
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return theme.colors.success;
      case 'pending': return theme.colors.warning;
      case 'suspended': return theme.colors.error;
      default: return theme.colors.textMuted;
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
          <Text style={styles.headerTitle}>🏢 Organization Management</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{organizations.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.warning }]}>
              {organizations.filter(o => o.approval_status === 'pending').length}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>
              {organizations.filter(o => o.status === 'active').length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        {/* Pending Payments */}
        {pendingPayments.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>⏳ Pending Payments ({pendingPayments.length})</Text>
            {pendingPayments.map((payment) => (
              <View key={payment.id} style={styles.paymentCard}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentAmount}>₹{payment.amount}</Text>
                  <Text style={styles.paymentCredits}>{payment.credits_purchased} Credits</Text>
                  <Text style={styles.paymentDate}>
                    {new Date(payment.created_at).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.paymentActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: theme.colors.success }]}
                    onPress={() => handleVerifyPayment(payment, true)}
                  >
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: theme.colors.error }]}
                    onPress={() => handleVerifyPayment(payment, false)}
                  >
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Filter */}
        <Text style={styles.sectionTitle}>Organizations</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {(['all', 'pending', 'active', 'suspended'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Organizations List */}
        {filteredOrgs.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="domain" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No organizations found</Text>
          </View>
        ) : (
          filteredOrgs.map((org) => (
            <View key={org.id} style={styles.orgCard}>
              <View style={styles.orgHeader}>
                <View style={styles.orgIcon}>
                  <MaterialCommunityIcons name="domain" size={28} color={theme.colors.accent} />
                </View>
                <View style={styles.orgInfo}>
                  <Text style={styles.orgName}>{org.name}</Text>
                  <Text style={styles.orgEmail}>{org.email}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(org.status) + '30' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(org.status) }]}>
                    {org.status?.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.orgDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Head:</Text>
                  <Text style={styles.detailValue}>{org.head_name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Head Email:</Text>
                  <Text style={styles.detailValue}>{org.head_email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Credits:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.accent }]}>{org.credits || 0}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Registered:</Text>
                  <Text style={styles.detailValue}>{new Date(org.created_at).toLocaleDateString()}</Text>
                </View>
              </View>

              {org.approval_status === 'pending' && (
                <View style={styles.orgActions}>
                  <TouchableOpacity
                    style={[styles.approveBtn, { backgroundColor: theme.colors.success }]}
                    onPress={() => handleApprove(org)}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.approveBtn, { backgroundColor: theme.colors.error }]}
                    onPress={() => { setSelectedOrg(org); setShowRejectModal(true); }}
                  >
                    <Ionicons name="close-circle" size={20} color="#fff" />
                    <Text style={styles.approveBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}

              {org.status === 'active' && (
                <TouchableOpacity 
                  style={styles.viewDetailsBtn}
                  onPress={() => router.push(`/admin/organization-details?id=${org.id}` as any)}
                >
                  <Text style={styles.viewDetailsBtnText}>View Details</Text>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.accent} />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Organization</Text>
            <Text style={styles.modalSubtitle}>Rejecting: {selectedOrg?.name}</Text>
            
            <Text style={styles.inputLabel}>Reason (Optional)</Text>
            <TextInput
              style={styles.input}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Enter rejection reason"
              placeholderTextColor={theme.colors.textMuted}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.colors.cardBorder }]}
                onPress={() => setShowRejectModal(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.colors.error }]}
                onPress={handleReject}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Reject</Text>
              </TouchableOpacity>
            </View>
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
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  paymentCredits: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
  },
  paymentDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  paymentActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: {
    marginBottom: theme.spacing.md,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginRight: theme.spacing.sm,
  },
  filterChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  filterChipText: {
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: theme.fontWeight.bold,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  orgCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orgIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orgInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  orgName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  orgEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
  },
  orgDetails: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  detailValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.medium,
  },
  orgActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  approveBtnText: {
    color: '#fff',
    fontWeight: theme.fontWeight.bold,
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  viewDetailsBtnText: {
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  modalBtn: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  modalBtnText: {
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
});
