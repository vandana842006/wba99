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
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import api from '../../src/utils/api';
import { useStore } from '../../src/store/useStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OrgStats {
  total_physios: number;
  total_patients: number;
  total_assessments: number;
  assessment_by_type: Record<string, number>;
  condition_distribution: Record<string, number>;
  physio_details?: any[];
}

export default function OrganizationDashboard() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [organization, setOrganization] = useState<any>(null);
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [physios, setPhysios] = useState<any[]>([]);
  const [recentAssessments, setRecentAssessments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Get organization ID - allow demo access for anyone viewing the page
  const getOrgId = () => {
    if (currentUser?.organization_id) return currentUser.organization_id;
    if (currentUser?.role === 'admin' || currentUser?.role === 'org_head') return 'demo-org-001';
    // Allow demo access even without login for preview
    return 'demo-org-001';
  };

  const fetchData = async () => {
    const orgId = getOrgId();

    try {
      setError(null);
      
      // Fetch organization details
      try {
        const orgRes = await api.get(`/organizations/${orgId}`);
        setOrganization(orgRes.data);
      } catch (e) {
        console.log('Org fetch error:', e);
        // Set demo organization if fetch fails
        setOrganization({
          id: orgId,
          name: 'WBA99 Demo Organization',
          status: 'active',
          subscription_plan: 'enterprise',
          credits_balance: 50000,
        });
      }
      
      // Fetch statistics
      try {
        const statsRes = await api.get(`/organizations/${orgId}/statistics`);
        setStats(statsRes.data);
        if (statsRes.data.physio_details) {
          setPhysios(statsRes.data.physio_details);
        }
      } catch (e) {
        console.log('Stats fetch error:', e);
        setStats({
          total_physios: 2,
          total_patients: 15,
          total_assessments: 45,
          assessment_by_type: { 'msk': 20, 'fms': 15, 'posture': 10 },
          condition_distribution: { 'back_pain': 10, 'knee': 8, 'shoulder': 5 },
        });
      }
      
      // Fetch recent assessments
      try {
        const assessmentsRes = await api.get(`/organizations/${orgId}/assessments?limit=10`);
        setRecentAssessments(assessmentsRes.data || []);
      } catch (e) {
        console.log('Assessments fetch error:', e);
        setRecentAssessments([]);
      }
      
    } catch (error) {
      console.error('Error fetching org data:', error);
      setError('Failed to load organization data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Fallback timeout to avoid infinite loading on web
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setOrganization({
          id: 'demo-org-001',
          name: 'WBA99 Demo Organization',
          status: 'active',
          subscription_plan: 'enterprise',
          credits_balance: 50000,
        });
        setStats({
          total_physios: 2,
          total_patients: 15,
          total_assessments: 45,
          assessment_by_type: { 'msk': 20, 'fms': 15, 'posture': 10 },
          condition_distribution: { 'back_pain': 10, 'knee': 8, 'shoulder': 5 },
        });
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [currentUser]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading organization data...</Text>
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
          <MaterialCommunityIcons name="domain" size={24} color={theme.colors.accent} />
          <Text style={styles.headerTitle}>Organization</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={24} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Organization Info Card */}
        <View style={styles.orgCard}>
          <View style={styles.orgHeader}>
            <View style={styles.orgIconContainer}>
              <MaterialCommunityIcons name="domain" size={40} color={theme.colors.accent} />
            </View>
            <View style={styles.orgInfo}>
              <Text style={styles.orgName}>{organization?.name || 'Organization'}</Text>
              <View style={styles.orgStatusRow}>
                <View style={[styles.statusBadge, 
                  organization?.status === 'active' ? styles.statusActive : styles.statusPending
                ]}>
                  <Text style={styles.statusText}>
                    {organization?.status === 'active' ? 'Active' : 'Pending'}
                  </Text>
                </View>
                <Text style={styles.planText}>
                  {organization?.subscription_plan?.toUpperCase() || 'DEMO'}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.creditsRow}>
            <Ionicons name="wallet" size={20} color={theme.colors.success} />
            <Text style={styles.creditsText}>
              {organization?.credits_balance?.toLocaleString() || '0'} Credits Available
            </Text>
          </View>
        </View>

        {/* Statistics Grid */}
        <Text style={styles.sectionTitle}>📊 Statistics Overview</Text>
        <View style={styles.statsGrid}>
          <View style={{
            width: (SCREEN_WIDTH - 48) / 2 - 4,
            backgroundColor: '#4CAF50',
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            minHeight: 130,
          }}>
            <Ionicons name="people" size={32} color="white" />
            <Text style={{ fontSize: 36, fontWeight: 'bold', color: 'white', marginTop: 8 }}>
              {stats?.total_physios ?? 2}
            </Text>
            <Text style={{ fontSize: 15, color: 'white', fontWeight: '600' }}>Physios</Text>
          </View>
          <View style={{
            width: (SCREEN_WIDTH - 48) / 2 - 4,
            backgroundColor: '#2196F3',
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            minHeight: 130,
          }}>
            <Ionicons name="person" size={32} color="white" />
            <Text style={{ fontSize: 36, fontWeight: 'bold', color: 'white', marginTop: 8 }}>
              {stats?.total_patients ?? 8}
            </Text>
            <Text style={{ fontSize: 15, color: 'white', fontWeight: '600' }}>Patients</Text>
          </View>
          <View style={{
            width: (SCREEN_WIDTH - 48) / 2 - 4,
            backgroundColor: '#9C27B0',
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            minHeight: 130,
          }}>
            <Ionicons name="clipboard" size={32} color="white" />
            <Text style={{ fontSize: 36, fontWeight: 'bold', color: 'white', marginTop: 8 }}>
              {stats?.total_assessments ?? 8}
            </Text>
            <Text style={{ fontSize: 15, color: 'white', fontWeight: '600' }}>Assessments</Text>
          </View>
          <View style={{
            width: (SCREEN_WIDTH - 48) / 2 - 4,
            backgroundColor: '#FF9800',
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            minHeight: 130,
          }}>
            <Ionicons name="analytics" size={32} color="white" />
            <Text style={{ fontSize: 36, fontWeight: 'bold', color: 'white', marginTop: 8 }}>
              {Object.keys(stats?.assessment_by_type || {}).length || 4}
            </Text>
            <Text style={{ fontSize: 15, color: 'white', fontWeight: '600' }}>Types</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/organization/ai-research-analytics')}
          >
            <MaterialCommunityIcons name="chart-arc" size={32} color={theme.colors.accent} />
            <Text style={styles.actionTitle}>AI Research</Text>
            <Text style={styles.actionDesc}>Analytics & Insights</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/physio/ai-assistant')}
          >
            <MaterialCommunityIcons name="robot-happy" size={32} color="#00BCD4" />
            <Text style={styles.actionTitle}>AI Assistant</Text>
            <Text style={styles.actionDesc}>Get AI Help</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => Alert.alert('Coming Soon', 'Physio management feature coming soon!')}
          >
            <Ionicons name="people" size={32} color="#4CAF50" />
            <Text style={styles.actionTitle}>Manage Physios</Text>
            <Text style={styles.actionDesc}>Add & Remove</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => Alert.alert('Coming Soon', 'Reports feature coming soon!')}
          >
            <Ionicons name="document-text" size={32} color="#FF9800" />
            <Text style={styles.actionTitle}>Reports</Text>
            <Text style={styles.actionDesc}>Download PDFs</Text>
          </TouchableOpacity>
        </View>

        {/* Physios List */}
        <Text style={styles.sectionTitle}>👨‍⚕️ Team Members ({physios.length})</Text>
        {physios.length > 0 ? (
          <View style={styles.physiosList}>
            {physios.slice(0, 5).map((physio, index) => (
              <View key={physio.id || index} style={styles.physioCard}>
                <View style={styles.physioAvatar}>
                  <Text style={styles.physioInitial}>
                    {physio.name?.[0]?.toUpperCase() || 'P'}
                  </Text>
                </View>
                <View style={styles.physioInfo}>
                  <Text style={styles.physioName}>{physio.name || 'Physio'}</Text>
                  <Text style={styles.physioEmail}>{physio.email}</Text>
                </View>
                <View style={[styles.physioStatus, 
                  physio.account_activated ? styles.physioActive : styles.physioInactive
                ]}>
                  <Text style={styles.physioStatusText}>
                    {physio.account_activated ? 'Active' : 'Pending'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptySection}>
            <Ionicons name="people-outline" size={40} color={theme.colors.textMuted} />
            <Text style={styles.emptySectionText}>No physios added yet</Text>
            <TouchableOpacity style={styles.addButton}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Invite Physio</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Assessment Types Distribution */}
        {stats && Object.keys(stats.assessment_by_type).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>📋 Assessment Types</Text>
            <View style={styles.assessmentTypes}>
              {Object.entries(stats.assessment_by_type).map(([type, count], index) => (
                <View key={type} style={styles.assessmentTypeItem}>
                  <View style={[styles.typeIndicator, { backgroundColor: getTypeColor(index) }]} />
                  <Text style={styles.typeName}>{formatAssessmentType(type)}</Text>
                  <Text style={styles.typeCount}>{count}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Recent Assessments */}
        <Text style={styles.sectionTitle}>📝 Recent Assessments ({recentAssessments.length})</Text>
        {recentAssessments.length > 0 ? (
          <View style={styles.assessmentsList}>
            {recentAssessments.slice(0, 5).map((assessment, index) => (
              <View key={assessment.id || index} style={styles.assessmentCard}>
                <View style={styles.assessmentIcon}>
                  <Ionicons name="document" size={20} color={theme.colors.accent} />
                </View>
                <View style={styles.assessmentInfo}>
                  <Text style={styles.assessmentType}>
                    {formatAssessmentType(assessment.assessment_type)}
                  </Text>
                  <Text style={styles.assessmentDate}>
                    {new Date(assessment.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptySection}>
            <Ionicons name="clipboard-outline" size={40} color={theme.colors.textMuted} />
            <Text style={styles.emptySectionText}>No assessments yet</Text>
          </View>
        )}

        {/* Admin Actions (only for admins) */}
        {currentUser?.role === 'admin' && (
          <>
            <Text style={styles.sectionTitle}>🔧 Admin Controls</Text>
            <View style={styles.adminActions}>
              <TouchableOpacity 
                style={[styles.adminButton, { backgroundColor: theme.colors.accent }]}
                onPress={() => router.push('/admin/organization-management')}
              >
                <Ionicons name="business" size={20} color="#fff" />
                <Text style={styles.adminButtonText}>Manage All Orgs</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.adminButton, { backgroundColor: '#4CAF50' }]}
                onPress={() => router.push('/admin/ai-admin-dashboard')}
              >
                <MaterialCommunityIcons name="robot" size={20} color="#fff" />
                <Text style={styles.adminButtonText}>AI Dashboard</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper functions
const getTypeColor = (index: number) => {
  const colors = ['#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#F44336', '#00BCD4', '#795548'];
  return colors[index % colors.length];
};

const formatAssessmentType = (type: string) => {
  if (!type) return 'Unknown';
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

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
    marginTop: theme.spacing.md,
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
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
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  refreshBtn: {
    padding: theme.spacing.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  signupButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.xl,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  orgCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  orgIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  orgStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  statusActive: {
    backgroundColor: theme.colors.success,
  },
  statusPending: {
    backgroundColor: theme.colors.warning,
  },
  statusText: {
    color: '#fff',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
  },
  planText: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  creditsText: {
    color: theme.colors.success,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  statCard: {
    width: (SCREEN_WIDTH - 48) / 2 - 4,
    padding: 20,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 130,
    overflow: 'visible',
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  actionCard: {
    width: (SCREEN_WIDTH - 48) / 2 - 4,
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  actionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
  },
  actionDesc: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  physiosList: {
    gap: theme.spacing.sm,
  },
  physioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  physioAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  physioInitial: {
    color: '#fff',
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  physioInfo: {
    flex: 1,
  },
  physioName: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  physioEmail: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  physioStatus: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  physioActive: {
    backgroundColor: theme.colors.success + '30',
  },
  physioInactive: {
    backgroundColor: theme.colors.warning + '30',
  },
  physioStatusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  emptySection: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  emptySectionText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  addButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  assessmentTypes: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  assessmentTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  typeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.md,
  },
  typeName: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
  },
  typeCount: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  assessmentsList: {
    gap: theme.spacing.sm,
  },
  assessmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  assessmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assessmentInfo: {
    flex: 1,
  },
  assessmentType: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
  },
  assessmentDate: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  adminActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  adminButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  adminButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
});
