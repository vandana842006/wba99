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
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { getUsers, deleteUser } from '../../src/utils/api';
import api from '../../src/utils/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  is_blocked?: boolean;
  blocked_reason?: string;
  subscription?: {
    tier: string;
    start_date: string;
    end_date?: string;
    is_active: boolean;
    custom_features: Record<string, any>;
  };
}

interface SubscriptionTier {
  max_assessments_per_month: number;
  max_patients: number;
  posture_assessment: boolean;
  walking_assessment: boolean;
  running_assessment: boolean;
  msk_assessment: boolean;
  camera_analysis: boolean;
  pdf_reports: boolean;
  exercise_prescription: boolean;
  priority_support: boolean;
  price_monthly: number;
  price_yearly: number;
}

export default function AdminUserManagement() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [tiers, setTiers] = useState<Record<string, SubscriptionTier>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [updatingSubscription, setUpdatingSubscription] = useState(false);

  const fetchData = async () => {
    try {
      const [usersRes, tiersRes] = await Promise.all([
        getUsers(filter || undefined),
        api.get('/admin/subscription-tiers'),
      ]);
      setUsers(usersRes.data);
      setTiers(tiersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleBlockUser = async (userId: string, userName: string) => {
    Alert.prompt(
      'Block User',
      `Enter reason for blocking ${userName}:`,
      async (reason) => {
        try {
          await api.put(`/admin/users/${userId}/block?reason=${encodeURIComponent(reason || '')}`);
          Alert.alert('Success', 'User blocked successfully');
          fetchData();
        } catch (error) {
          Alert.alert('Error', 'Failed to block user');
        }
      },
      'plain-text'
    );
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      await api.put(`/admin/users/${userId}/unblock`);
      Alert.alert('Success', 'User unblocked successfully');
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to unblock user');
    }
  };

  const handleUpgradeSubscription = async (userId: string, tier: string, months: number = 1) => {
    setUpdatingSubscription(true);
    try {
      await api.put(`/admin/users/${userId}/subscription?tier=${tier}&duration_months=${months}`);
      Alert.alert('Success', `Subscription updated to ${tier.toUpperCase()}`);
      setShowUserModal(false);
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update subscription');
    } finally {
      setUpdatingSubscription(false);
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(userId);
              fetchData();
              Alert.alert('Success', 'User deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return '#9333EA';
      case 'premium':
        return theme.colors.warning;
      case 'basic':
        return theme.colors.info;
      default:
        return theme.colors.textMuted;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return theme.colors.error;
      case 'physio':
        return theme.colors.success;
      case 'patient':
        return theme.colors.accent;
      default:
        return theme.colors.textSecondary;
    }
  };

  const FilterButton = ({ label, value }: { label: string; value: string | null }) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === value && styles.filterButtonActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.filterButtonText, filter === value && styles.filterButtonTextActive]}>
        {label}
      </Text>
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
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FilterButton label="All" value={null} />
        <FilterButton label="Admins" value="admin" />
        <FilterButton label="Physios" value="physio" />
        <FilterButton label="Patients" value="patient" />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
      >
        <Text style={styles.countText}>{users.length} users</Text>

        {users.map((user) => (
          <TouchableOpacity
            key={user.id}
            style={[styles.userCard, user.is_blocked && styles.userCardBlocked]}
            onPress={() => {
              setSelectedUser(user);
              setShowUserModal(true);
            }}
          >
            <View style={styles.userHeader}>
              <View style={[styles.roleIndicator, { backgroundColor: getRoleColor(user.role) }]} />
              <View style={styles.userInfo}>
                <View style={styles.userNameRow}>
                  <Text style={styles.userName}>{user.name}</Text>
                  {user.is_blocked && (
                    <View style={styles.blockedBadge}>
                      <Ionicons name="ban" size={12} color={theme.colors.error} />
                      <Text style={styles.blockedText}>Blocked</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.userEmail}>{user.email}</Text>
                <View style={styles.userMeta}>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) + '20' }]}>
                    <Text style={[styles.roleBadgeText, { color: getRoleColor(user.role) }]}>
                      {user.role.toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.tierBadge, { backgroundColor: getTierColor(user.subscription?.tier || 'free') + '20' }]}>
                    <Text style={[styles.tierBadgeText, { color: getTierColor(user.subscription?.tier || 'free') }]}>
                      {(user.subscription?.tier || 'free').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color={theme.colors.textMuted} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* User Detail Modal */}
      <Modal
        visible={showUserModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Management</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <ScrollView style={styles.modalBody}>
                {/* User Info */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>User Information</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Name:</Text>
                    <Text style={styles.infoValue}>{selectedUser.name}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email:</Text>
                    <Text style={styles.infoValue}>{selectedUser.email}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Role:</Text>
                    <Text style={[styles.infoValue, { color: getRoleColor(selectedUser.role) }]}>
                      {selectedUser.role.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status:</Text>
                    <Text style={[styles.infoValue, { color: selectedUser.is_blocked ? theme.colors.error : theme.colors.success }]}>
                      {selectedUser.is_blocked ? 'BLOCKED' : 'ACTIVE'}
                    </Text>
                  </View>
                  {selectedUser.is_blocked && selectedUser.blocked_reason && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Reason:</Text>
                      <Text style={styles.infoValue}>{selectedUser.blocked_reason}</Text>
                    </View>
                  )}
                </View>

                {/* Subscription Management */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Subscription</Text>
                  <Text style={styles.currentTier}>
                    Current: <Text style={{ color: getTierColor(selectedUser.subscription?.tier || 'free') }}>
                      {(selectedUser.subscription?.tier || 'free').toUpperCase()}
                    </Text>
                  </Text>
                  
                  <Text style={styles.upgradeLabel}>Change Subscription:</Text>
                  <View style={styles.tierButtons}>
                    {['free', 'basic', 'premium', 'enterprise'].map((tier) => (
                      <TouchableOpacity
                        key={tier}
                        style={[
                          styles.tierButton,
                          selectedUser.subscription?.tier === tier && styles.tierButtonActive,
                          { borderColor: getTierColor(tier) }
                        ]}
                        onPress={() => handleUpgradeSubscription(selectedUser.id, tier, tier === 'free' ? 0 : 12)}
                        disabled={updatingSubscription}
                      >
                        <Text style={[styles.tierButtonText, { color: getTierColor(tier) }]}>
                          {tier.toUpperCase()}
                        </Text>
                        <Text style={styles.tierPriceText}>
                          {tiers[tier]?.price_monthly === 0 ? 'Free' : `$${tiers[tier]?.price_monthly}/mo`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Features Overview */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Features</Text>
                  {selectedUser.subscription?.tier && tiers[selectedUser.subscription.tier] && (
                    <View style={styles.featuresList}>
                      {Object.entries(tiers[selectedUser.subscription.tier]).map(([key, value]) => {
                        if (typeof value === 'boolean') {
                          return (
                            <View key={key} style={styles.featureItem}>
                              <Ionicons
                                name={value ? 'checkmark-circle' : 'close-circle'}
                                size={20}
                                color={value ? theme.colors.success : theme.colors.error}
                              />
                              <Text style={styles.featureText}>
                                {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                              </Text>
                            </View>
                          );
                        }
                        return null;
                      })}
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Actions</Text>
                  
                  {selectedUser.is_blocked ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.unblockBtn]}
                      onPress={() => handleUnblockUser(selectedUser.id)}
                    >
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.textPrimary} />
                      <Text style={styles.actionBtnText}>Unblock User</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.blockBtn]}
                      onPress={() => {
                        setShowUserModal(false);
                        setTimeout(() => handleBlockUser(selectedUser.id, selectedUser.name), 300);
                      }}
                    >
                      <Ionicons name="ban" size={20} color={theme.colors.textPrimary} />
                      <Text style={styles.actionBtnText}>Block User</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => {
                      setShowUserModal(false);
                      setTimeout(() => handleDeleteUser(selectedUser.id, selectedUser.name), 300);
                    }}
                  >
                    <Ionicons name="trash" size={20} color={theme.colors.textPrimary} />
                    <Text style={styles.actionBtnText}>Delete User</Text>
                  </TouchableOpacity>
                </View>
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
  filterContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  filterButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.xs,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.accent,
  },
  filterButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  filterButtonTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.semibold,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  countText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  userCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  userCardBlocked: {
    opacity: 0.7,
    borderColor: theme.colors.error,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  roleIndicator: {
    width: 4,
    height: 50,
    borderRadius: 2,
    marginRight: theme.spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  userName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  blockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  blockedText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.error,
    fontWeight: theme.fontWeight.semibold,
  },
  userEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  userMeta: {
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  roleBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
  },
  tierBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  tierBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '85%',
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
  modalSection: {
    marginBottom: theme.spacing.xl,
  },
  modalSectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  infoLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  currentTier: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  upgradeLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  tierButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  tierButton: {
    flex: 1,
    minWidth: '45%',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  tierButtonActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  tierButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  tierPriceText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  featuresList: {
    gap: theme.spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  featureText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  actionBtnText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  blockBtn: {
    backgroundColor: theme.colors.warning,
  },
  unblockBtn: {
    backgroundColor: theme.colors.success,
  },
  deleteBtn: {
    backgroundColor: theme.colors.error,
  },
});
