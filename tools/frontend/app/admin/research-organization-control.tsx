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
  Switch,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import api from '../../src/utils/api';
import { useStore } from '../../src/store/useStore';

interface Settings {
  auto_approve_organizations: boolean;
  require_payment_for_approval: boolean;
  default_credits_on_signup: number;
  research_publication_fee: number;
  public_publication_fee: number;
  ai_research_enabled: boolean;
}

interface Statistics {
  publications: { total: number; pending: number; approved: number; public: number };
  organizations: { total: number; active: number; pending: number };
  revenue: { total_subscription_revenue: number; total_subscriptions: number };
}

export default function ResearchOrganizationControl() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [pendingPubs, setPendingPubs] = useState<any[]>([]);
  const [pendingSubs, setPendingSubs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'publications' | 'subscriptions'>('overview');

  const fetchData = async () => {
    try {
      const [settingsRes, statsRes, pubsRes, subsRes] = await Promise.all([
        api.get('/admin/organization-settings'),
        api.get('/admin/research-statistics'),
        api.get('/research/publications?status=pending'),
        api.get('/organizations/subscriptions/pending'),
      ]);
      setSettings(settingsRes.data);
      setStatistics(statsRes.data);
      setPendingPubs(pubsRes.data || []);
      setPendingSubs(subsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const updateSetting = async (key: string, value: boolean | number) => {
    try {
      const params: any = {};
      if (key === 'auto_approve_organizations') params.auto_approve = value;
      if (key === 'require_payment_for_approval') params.require_payment = value;
      if (key === 'default_credits_on_signup') params.default_credits = value;
      if (key === 'research_publication_fee') params.research_fee = value;
      if (key === 'public_publication_fee') params.public_fee = value;
      if (key === 'ai_research_enabled') params.ai_research = value;

      await api.put('/admin/organization-settings', null, { params });
      setSettings({ ...settings!, [key]: value });
      Alert.alert('Success', 'Setting updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleApprovePublication = async (pubId: string) => {
    try {
      await api.post(`/research/publications/${pubId}/approve?admin_id=${currentUser?.id}`);
      Alert.alert('Success', 'Publication approved');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to approve');
    }
  };

  const handlePublishPublic = async (pubId: string) => {
    try {
      await api.post(`/research/publish-public/${pubId}?admin_id=${currentUser?.id}`);
      Alert.alert('Success', 'Research published publicly');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to publish');
    }
  };

  const handleApproveSubscription = async (subId: string) => {
    try {
      await api.post(`/organizations/subscriptions/${subId}/approve?admin_id=${currentUser?.id}`);
      Alert.alert('Success', 'Subscription approved and credits added');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to approve');
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
          <Text style={styles.headerTitle}>🔬 Research & Org Control</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
          {(['overview', 'settings', 'publications', 'subscriptions'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Statistics */}
            <Text style={styles.sectionTitle}>📊 Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { borderLeftColor: theme.colors.accent }]}>
                <MaterialCommunityIcons name="domain" size={28} color={theme.colors.accent} />
                <Text style={styles.statValue}>{statistics?.organizations.total || 0}</Text>
                <Text style={styles.statLabel}>Organizations</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: theme.colors.success }]}>
                <Ionicons name="checkmark-circle" size={28} color={theme.colors.success} />
                <Text style={styles.statValue}>{statistics?.organizations.active || 0}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: theme.colors.warning }]}>
                <Ionicons name="time" size={28} color={theme.colors.warning} />
                <Text style={styles.statValue}>{statistics?.organizations.pending || 0}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#9C27B0' }]}>
                <Ionicons name="document-text" size={28} color="#9C27B0" />
                <Text style={styles.statValue}>{statistics?.publications.total || 0}</Text>
                <Text style={styles.statLabel}>Publications</Text>
              </View>
            </View>

            {/* Revenue */}
            <View style={styles.revenueCard}>
              <MaterialCommunityIcons name="cash-multiple" size={32} color={theme.colors.success} />
              <View style={{ marginLeft: 16, flex: 1 }}>
                <Text style={styles.revenueLabel}>Total Subscription Revenue</Text>
                <Text style={styles.revenueValue}>₹{(statistics?.revenue.total_subscription_revenue || 0).toLocaleString()}</Text>
                <Text style={styles.revenueSubtext}>{statistics?.revenue.total_subscriptions || 0} subscriptions</Text>
              </View>
            </View>

            {/* Subscription Plans */}
            <Text style={styles.sectionTitle}>💰 Subscription Plans</Text>
            <View style={styles.plansContainer}>
              <View style={styles.planCard}>
                <Text style={styles.planName}>Basic</Text>
                <Text style={styles.planPrice}>₹15,000/year</Text>
                <Text style={styles.planFeatures}>5 Physios • 100 Patients • 5,000 Credits</Text>
              </View>
              <View style={[styles.planCard, { borderColor: theme.colors.accent }]}>
                <Text style={styles.planName}>Professional</Text>
                <Text style={styles.planPrice}>₹30,000/year</Text>
                <Text style={styles.planFeatures}>20 Physios • 500 Patients • 15,000 Credits</Text>
              </View>
              <View style={[styles.planCard, { borderColor: theme.colors.success }]}>
                <Text style={styles.planName}>Enterprise</Text>
                <Text style={styles.planPrice}>₹75,000/year</Text>
                <Text style={styles.planFeatures}>100 Physios • 2,000 Patients • 50,000 Credits</Text>
              </View>
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => router.push('/admin/organization-management')}
              >
                <MaterialCommunityIcons name="domain" size={28} color={theme.colors.accent} />
                <Text style={styles.actionText}>Manage Orgs</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => setActiveTab('publications')}
              >
                <Ionicons name="document-text" size={28} color="#9C27B0" />
                <Text style={styles.actionText}>Publications</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => router.push('/research/public' as any)}
              >
                <Ionicons name="globe" size={28} color={theme.colors.success} />
                <Text style={styles.actionText}>Public Research</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && settings && (
          <>
            <Text style={styles.sectionTitle}>⚙️ Organization Settings</Text>
            
            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.settingTitle}>Auto-Approve Organizations</Text>
                  <Text style={styles.settingDesc}>Automatically approve new organization signups</Text>
                </View>
              </View>
              <Switch
                value={settings.auto_approve_organizations}
                onValueChange={(v) => updateSetting('auto_approve_organizations', v)}
                trackColor={{ false: theme.colors.cardBorder, true: theme.colors.success }}
              />
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <Ionicons name="card" size={24} color={theme.colors.warning} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.settingTitle}>Require Payment for Approval</Text>
                  <Text style={styles.settingDesc}>Organizations must pay before activation</Text>
                </View>
              </View>
              <Switch
                value={settings.require_payment_for_approval}
                onValueChange={(v) => updateSetting('require_payment_for_approval', v)}
                trackColor={{ false: theme.colors.cardBorder, true: theme.colors.success }}
              />
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <MaterialCommunityIcons name="robot" size={24} color={theme.colors.accent} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.settingTitle}>AI Research Assistant</Text>
                  <Text style={styles.settingDesc}>Enable AI-generated research insights</Text>
                </View>
              </View>
              <Switch
                value={settings.ai_research_enabled}
                onValueChange={(v) => updateSetting('ai_research_enabled', v)}
                trackColor={{ false: theme.colors.cardBorder, true: theme.colors.success }}
              />
            </View>

            <Text style={styles.sectionTitle}>💵 Pricing Settings</Text>

            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Default Credits on Signup</Text>
              <TextInput
                style={styles.input}
                value={String(settings.default_credits_on_signup)}
                onChangeText={(v) => setSettings({...settings, default_credits_on_signup: parseInt(v) || 0})}
                keyboardType="numeric"
                onBlur={() => updateSetting('default_credits_on_signup', settings.default_credits_on_signup)}
              />
            </View>

            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Research Publication Fee (Credits)</Text>
              <TextInput
                style={styles.input}
                value={String(settings.research_publication_fee)}
                onChangeText={(v) => setSettings({...settings, research_publication_fee: parseInt(v) || 0})}
                keyboardType="numeric"
                onBlur={() => updateSetting('research_publication_fee', settings.research_publication_fee)}
              />
            </View>

            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Public Publication Fee (Credits)</Text>
              <TextInput
                style={styles.input}
                value={String(settings.public_publication_fee)}
                onChangeText={(v) => setSettings({...settings, public_publication_fee: parseInt(v) || 0})}
                keyboardType="numeric"
                onBlur={() => updateSetting('public_publication_fee', settings.public_publication_fee)}
              />
            </View>
          </>
        )}

        {/* Publications Tab */}
        {activeTab === 'publications' && (
          <>
            <Text style={styles.sectionTitle}>📚 Research Publications</Text>
            
            <View style={styles.pubStatsRow}>
              <View style={styles.pubStatItem}>
                <Text style={styles.pubStatValue}>{statistics?.publications.pending || 0}</Text>
                <Text style={styles.pubStatLabel}>Pending</Text>
              </View>
              <View style={styles.pubStatItem}>
                <Text style={[styles.pubStatValue, { color: theme.colors.success }]}>{statistics?.publications.approved || 0}</Text>
                <Text style={styles.pubStatLabel}>Approved</Text>
              </View>
              <View style={styles.pubStatItem}>
                <Text style={[styles.pubStatValue, { color: theme.colors.accent }]}>{statistics?.publications.public || 0}</Text>
                <Text style={styles.pubStatLabel}>Public</Text>
              </View>
            </View>

            {pendingPubs.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={theme.colors.textMuted} />
                <Text style={styles.emptyText}>No pending publications</Text>
              </View>
            ) : (
              pendingPubs.map((pub) => (
                <View key={pub.id} style={styles.pubCard}>
                  <View style={styles.pubHeader}>
                    <Text style={styles.pubTitle}>{pub.title}</Text>
                    <View style={[styles.pubBadge, { backgroundColor: theme.colors.warning + '30' }]}>
                      <Text style={[styles.pubBadgeText, { color: theme.colors.warning }]}>Pending</Text>
                    </View>
                  </View>
                  <Text style={styles.pubCondition}>Condition: {pub.condition_type}</Text>
                  <Text style={styles.pubPatients}>{pub.total_patients} patients</Text>
                  
                  <View style={styles.pubActions}>
                    <TouchableOpacity
                      style={[styles.pubBtn, { backgroundColor: theme.colors.success }]}
                      onPress={() => handleApprovePublication(pub.id)}
                    >
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.pubBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.pubBtn, { backgroundColor: theme.colors.accent }]}
                      onPress={() => handlePublishPublic(pub.id)}
                    >
                      <Ionicons name="globe" size={18} color="#fff" />
                      <Text style={styles.pubBtnText}>Publish Public</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <>
            <Text style={styles.sectionTitle}>📋 Pending Subscriptions</Text>
            
            {pendingSubs.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="credit-card-outline" size={48} color={theme.colors.textMuted} />
                <Text style={styles.emptyText}>No pending subscriptions</Text>
              </View>
            ) : (
              pendingSubs.map((sub) => (
                <View key={sub.id} style={styles.subCard}>
                  <View style={styles.subHeader}>
                    <Text style={styles.subPlan}>{sub.plan_name}</Text>
                    <Text style={styles.subPrice}>₹{sub.price?.toLocaleString()}</Text>
                  </View>
                  <Text style={styles.subOrg}>Org ID: {sub.organization_id}</Text>
                  <Text style={styles.subCredits}>Credits: {sub.credits}</Text>
                  <Text style={styles.subDate}>{new Date(sub.created_at).toLocaleDateString()}</Text>
                  
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleApproveSubscription(sub.id)}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.approveBtnText}>Approve & Add Credits</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
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
    marginBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  tabsContainer: {
    marginBottom: theme.spacing.lg,
  },
  tab: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.card,
    marginRight: theme.spacing.sm,
  },
  tabActive: {
    backgroundColor: theme.colors.accent,
  },
  tabText: {
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: theme.fontWeight.bold,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  revenueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success + '15',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  revenueLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  revenueValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
  },
  revenueSubtext: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  plansContainer: {
    gap: theme.spacing.sm,
  },
  planCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.sm,
  },
  planName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  planPrice: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
    marginVertical: 4,
  },
  planFeatures: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  settingDesc: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  inputCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
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
    fontSize: theme.fontSize.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  pubStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  pubStatItem: {
    alignItems: 'center',
  },
  pubStatValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.warning,
  },
  pubStatLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  pubCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  pubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pubTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  pubBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  pubBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
  },
  pubCondition: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  pubPatients: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  pubActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  pubBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: 4,
  },
  pubBtnText: {
    color: '#fff',
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  subCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subPlan: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  subPrice: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
  },
  subOrg: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  subCredits: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
  },
  subDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  approveBtnText: {
    color: '#fff',
    fontWeight: theme.fontWeight.bold,
  },
});
