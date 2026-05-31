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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { getAnalyticsOverview } from '../../src/utils/api';
import { useStore } from '../../src/store/useStore';

interface Analytics {
  users: { total: number; patients: number; physios: number; admins: number };
  assessments: { total: number; posture: number; walking: number; running: number; msk: number };
  exercises: { total: number; assigned: number; completed: number };
}

export default function AdminDashboard() {
  const router = useRouter();
  const { currentUser, logout } = useStore();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingAnalysisCount, setPendingAnalysisCount] = useState(0);

  const fetchAnalytics = async () => {
    try {
      const response = await getAnalyticsOverview();
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Set default data on error so page still loads
      setAnalytics({
        users: { total: 0, patients: 0, physios: 0, admins: 0 },
        assessments: { total: 0, posture: 0, walking: 0, running: 0, msk: 0 },
        exercises: { total: 0, assigned: 0, completed: 0 }
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPendingAnalysisCount = async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/analysis-requests/pending/count`);
      const data = await response.json();
      setPendingAnalysisCount(data.total_actionable || 0);
    } catch (error) {
      console.error('Error fetching pending analysis count:', error);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchPendingAnalysisCount();
    
    // Fallback: Force show content after 5 seconds even if API fails
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setAnalytics({
          users: { total: 0, patients: 0, physios: 0, admins: 0 },
          assessments: { total: 0, posture: 0, walking: 0, running: 0, msk: 0 },
          exercises: { total: 0, assigned: 0, completed: 0 }
        });
      }
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const StatCard = ({ title, value, icon, color, onPress }: { title: string; value: number; icon: string; color: string; onPress?: () => void }) => (
    <TouchableOpacity 
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Ionicons name={icon as any} size={28} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {onPress && <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} style={{ position: 'absolute', top: 8, right: 8 }} />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
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
          <View>
            <Text style={styles.welcomeText}>Welcome, Admin</Text>
            <Text style={styles.nameText}>{currentUser?.name}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/admin/settings')}>
              <Ionicons name="settings" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <Ionicons name="log-out" size={24} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* User Stats */}
        <Text style={styles.sectionTitle}>User Statistics</Text>
        <View style={styles.statsGrid}>
          <StatCard 
            title="Total Users" 
            value={analytics?.users.total || 0} 
            icon="people" 
            color={theme.colors.accent} 
            onPress={() => router.push('/admin/user-management')}
          />
          <StatCard 
            title="Patients" 
            value={analytics?.users.patients || 0} 
            icon="person" 
            color={theme.colors.warning}
            onPress={() => router.push('/admin/users?role=patient')}
          />
          <StatCard 
            title="Physios" 
            value={analytics?.users.physios || 0} 
            icon="medical" 
            color={theme.colors.success}
            onPress={() => router.push('/admin/physio-control')}
          />
          <StatCard 
            title="Admins" 
            value={analytics?.users.admins || 0} 
            icon="settings" 
            color={theme.colors.info}
            onPress={() => router.push('/admin/users?role=admin')}
          />
        </View>

        {/* Assessment Stats */}
        <Text style={styles.sectionTitle}>Assessment Overview</Text>
        <TouchableOpacity 
          style={styles.assessmentCard}
          onPress={() => router.push('/admin/analysis-requests')}
          activeOpacity={0.8}
        >
          <View style={styles.assessmentRow}>
            <TouchableOpacity 
              style={styles.assessmentItem}
              onPress={() => router.push('/admin/analysis-requests?type=posture')}
            >
              <MaterialCommunityIcons name="human" size={32} color={theme.colors.accent} />
              <Text style={styles.assessmentValue}>{analytics?.assessments.posture || 0}</Text>
              <Text style={styles.assessmentLabel}>Posture</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.assessmentItem}
              onPress={() => router.push('/admin/analysis-requests?type=walking')}
            >
              <MaterialCommunityIcons name="walk" size={32} color={theme.colors.success} />
              <Text style={styles.assessmentValue}>{analytics?.assessments.walking || 0}</Text>
              <Text style={styles.assessmentLabel}>Walking</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.assessmentItem}
              onPress={() => router.push('/admin/analysis-requests?type=running')}
            >
              <MaterialCommunityIcons name="run" size={32} color={theme.colors.warning} />
              <Text style={styles.assessmentValue}>{analytics?.assessments.running || 0}</Text>
              <Text style={styles.assessmentLabel}>Running</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.assessmentItem}
              onPress={() => router.push('/admin/analysis-requests?type=msk')}
            >
              <MaterialCommunityIcons name="bone" size={32} color={theme.colors.error} />
              <Text style={styles.assessmentValue}>{analytics?.assessments.msk || 0}</Text>
              <Text style={styles.assessmentLabel}>M.S.K.</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Assessments</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.totalValue}>{analytics?.assessments.total || 0}</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.accent} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Exercise Stats */}
        <Text style={styles.sectionTitle}>Exercise Library</Text>
        <TouchableOpacity 
          style={styles.exerciseCard}
          onPress={() => router.push('/admin/exercise-management')}
          activeOpacity={0.8}
        >
          <View style={styles.exerciseRow}>
            <View style={styles.exerciseItem}>
              <Text style={styles.exerciseValue}>{analytics?.exercises.total || 0}</Text>
              <Text style={styles.exerciseLabel}>Exercises</Text>
            </View>
            <View style={styles.exerciseDivider} />
            <View style={styles.exerciseItem}>
              <Text style={styles.exerciseValue}>{analytics?.exercises.assigned || 0}</Text>
              <Text style={styles.exerciseLabel}>Assigned</Text>
            </View>
            <View style={styles.exerciseDivider} />
            <View style={styles.exerciseItem}>
              <Text style={[styles.exerciseValue, { color: theme.colors.success }]}>
                {analytics?.exercises.completed || 0}
              </Text>
              <Text style={styles.exerciseLabel}>Completed</Text>
            </View>
          </View>
          <View style={styles.exerciseFooter}>
            <Text style={styles.exerciseFooterText}>Tap to manage exercises</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.accent} />
          </View>
        </TouchableOpacity>

        {/* Actions */}
        <Text style={styles.sectionTitle}>Analysis Requests</Text>
        <TouchableOpacity 
          style={[styles.analysisRequestsCard, pendingAnalysisCount > 0 && styles.analysisRequestsCardActive]} 
          onPress={() => router.push('/admin/analysis-requests')}
        >
          <View style={styles.analysisRequestsContent}>
            <MaterialCommunityIcons name="file-document-edit" size={40} color={theme.colors.accent} />
            <View style={styles.analysisRequestsText}>
              <Text style={styles.analysisRequestsTitle}>Posture & Gait Analysis</Text>
              <Text style={styles.analysisRequestsDesc}>Review physio uploads, analyze & send reports</Text>
            </View>
          </View>
          {pendingAnalysisCount > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingAnalysisCount} Pending</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>User Management</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/admin/user-management')}>
            <Ionicons name="person-add" size={32} color={theme.colors.accent} />
            <Text style={styles.actionTitle}>All Users</Text>
            <Text style={styles.actionDesc}>Subscriptions & Access</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/admin/users')}>
            <Ionicons name="list" size={32} color={theme.colors.warning} />
            <Text style={styles.actionTitle}>User List</Text>
            <Text style={styles.actionDesc}>View all users</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/admin/analytics')}>
            <Ionicons name="analytics" size={32} color="#9C27B0" />
            <Text style={styles.actionTitle}>Analytics</Text>
            <Text style={styles.actionDesc}>View reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/admin/physio-control')}>
            <Ionicons name="shield-checkmark" size={32} color={theme.colors.success} />
            <Text style={styles.actionTitle}>Physio Control</Text>
            <Text style={styles.actionDesc}>Permissions & Access</Text>
          </TouchableOpacity>
        </View>

        {/* Organization Management */}
        <Text style={styles.sectionTitle}>🏢 Organization Management</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={[styles.actionCard, { borderColor: theme.colors.accent, borderWidth: 2 }]} 
            onPress={() => router.push('/admin/organization-management')}
          >
            <MaterialCommunityIcons name="domain" size={32} color={theme.colors.accent} />
            <Text style={styles.actionTitle}>Organizations</Text>
            <Text style={styles.actionDesc}>Approve & Manage</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionCard, { borderColor: '#673AB7', borderWidth: 2 }]} 
            onPress={() => router.push('/admin/research-control')}
          >
            <MaterialCommunityIcons name="shield-check" size={32} color="#673AB7" />
            <Text style={styles.actionTitle}>Research Control</Text>
            <Text style={styles.actionDesc}>Publications & Downloads</Text>
          </TouchableOpacity>
        </View>

        {/* Data Hub - ALL DATA FROM DEVICES */}
        <Text style={styles.sectionTitle}>📊 Data Hub - Device Sync</Text>
        <TouchableOpacity 
          style={[styles.analysisRequestsCard, { borderColor: '#00BCD4', borderWidth: 2 }]} 
          onPress={() => router.push('/admin/data-hub')}
        >
          <View style={styles.analysisRequestsContent}>
            <MaterialCommunityIcons name="cloud-sync" size={40} color="#00BCD4" />
            <View style={styles.analysisRequestsText}>
              <Text style={styles.analysisRequestsTitle}>Central Data Hub</Text>
              <Text style={styles.analysisRequestsDesc}>All data from Physios, Organizations & Devices synced here</Text>
            </View>
          </View>
          <View style={[styles.pendingBadge, { backgroundColor: '#00BCD4' }]}>
            <Text style={styles.pendingBadgeText}>View All</Text>
          </View>
        </TouchableOpacity>

        {/* AI Features - NEW */}
        <Text style={styles.sectionTitle}>🤖 AI Features</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={[styles.actionCard, { borderColor: '#00BCD4', borderWidth: 2 }]} 
            onPress={() => router.push('/admin/ai-admin-dashboard')}
          >
            <MaterialCommunityIcons name="robot-happy" size={32} color="#00BCD4" />
            <Text style={styles.actionTitle}>AI Dashboard</Text>
            <Text style={styles.actionDesc}>AI-Powered Insights</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionCard, { borderColor: '#4CAF50', borderWidth: 2 }]} 
            onPress={() => router.push('/organization/ai-research-analytics')}
          >
            <MaterialCommunityIcons name="chart-arc" size={32} color="#4CAF50" />
            <Text style={styles.actionTitle}>AI Research</Text>
            <Text style={styles.actionDesc}>Analytics & Predictions</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={[styles.actionCard, { borderColor: '#E91E63', borderWidth: 2 }]} 
            onPress={() => router.push('/organization/dashboard')}
          >
            <MaterialCommunityIcons name="domain" size={32} color="#E91E63" />
            <Text style={styles.actionTitle}>Org Dashboard</Text>
            <Text style={styles.actionDesc}>View Demo Org</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionCard, { borderColor: '#FF9800', borderWidth: 2 }]} 
            onPress={() => router.push('/physio/ai-assistant')}
          >
            <MaterialCommunityIcons name="robot" size={32} color="#FF9800" />
            <Text style={styles.actionTitle}>AI Assistant</Text>
            <Text style={styles.actionDesc}>Chat with AI</Text>
          </TouchableOpacity>
        </View>

        {/* Education & Content Management */}
        <Text style={styles.sectionTitle}>Education & Content</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/admin/education-management')}>
            <Ionicons name="book" size={32} color={theme.colors.success} />
            <Text style={styles.actionTitle}>Study Materials</Text>
            <Text style={styles.actionDesc}>Upload PDFs & Videos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/admin/blog-management')}>
            <Ionicons name="document-text" size={32} color={theme.colors.accent} />
            <Text style={styles.actionTitle}>Blog Posts</Text>
            <Text style={styles.actionDesc}>Manage articles</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={[styles.actionCard, { borderColor: theme.colors.warning }]} onPress={() => router.push('/admin/certification-management')}>
            <Ionicons name="ribbon" size={32} color={theme.colors.warning} />
            <Text style={styles.actionTitle}>Certifications</Text>
            <Text style={styles.actionDesc}>Manage exams & questions</Text>
          </TouchableOpacity>
        </View>

        {/* Payment & Credit Management - Single Section */}
        <Text style={styles.sectionTitle}>💰 Payment & Credits</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={[styles.actionCard, { borderColor: theme.colors.success, borderWidth: 2 }]} 
            onPress={() => router.push('/admin/payment-settings')}
          >
            <MaterialCommunityIcons name="bank" size={32} color={theme.colors.success} />
            <Text style={styles.actionTitle}>Payment Settings</Text>
            <Text style={styles.actionDesc}>Bank, QR & Add Credits</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionCard, { borderColor: theme.colors.warning }]} 
            onPress={() => router.push('/admin/payment-verification')}
          >
            <MaterialCommunityIcons name="check-decagram" size={32} color={theme.colors.warning} />
            <Text style={styles.actionTitle}>Payment Verification</Text>
            <Text style={styles.actionDesc}>Verify User Payments</Text>
          </TouchableOpacity>
        </View>

        {/* Reports Analytics Section */}
        <Text style={styles.sectionTitle}>📊 Reports & Analytics</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={[styles.actionCard, { borderColor: theme.colors.gold, borderWidth: 2 }]} 
            onPress={() => router.push('/admin/reports-dashboard')}
          >
            <MaterialCommunityIcons name="file-chart" size={32} color={theme.colors.gold} />
            <Text style={styles.actionTitle}>Reports Dashboard</Text>
            <Text style={styles.actionDesc}>All Reports & Revenue</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionCard, { borderColor: theme.colors.accent }]} 
            onPress={() => router.push('/admin/data-hub')}
          >
            <MaterialCommunityIcons name="database" size={32} color={theme.colors.accent} />
            <Text style={styles.actionTitle}>Central Data Hub</Text>
            <Text style={styles.actionDesc}>Device Synced Data</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Links */}
        <Text style={styles.sectionTitle}>Quick Links</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/education/courses')}>
            <Ionicons name="school" size={32} color={theme.colors.success} />
            <Text style={styles.actionTitle}>View Courses</Text>
            <Text style={styles.actionDesc}>Access all education</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/education/research-blog')}>
            <MaterialCommunityIcons name="newspaper-variant" size={32} color={theme.colors.accent} />
            <Text style={styles.actionTitle}>Research Blog</Text>
            <Text style={styles.actionDesc}>View articles</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/admin/video-review')}>
            <Ionicons name="videocam" size={32} color="#9C27B0" />
            <Text style={styles.actionTitle}>Video Review</Text>
            <Text style={styles.actionDesc}>Review submissions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/')}>
            <Ionicons name="home" size={32} color={theme.colors.info} />
            <Text style={styles.actionTitle}>Home</Text>
            <Text style={styles.actionDesc}>Back to main menu</Text>
          </TouchableOpacity>
        </View>
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
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  welcomeText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  nameText: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  logoutButton: {
    padding: theme.spacing.sm,
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
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    alignItems: 'center',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  statValue: {
    fontSize: 28,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
  },
  statTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    fontWeight: theme.fontWeight.medium,
  },
  assessmentCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  assessmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.lg,
  },
  assessmentItem: {
    alignItems: 'center',
  },
  assessmentValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
  },
  assessmentLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
    paddingTop: theme.spacing.md,
  },
  totalLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  totalValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
  },
  exerciseCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  exerciseItem: {
    alignItems: 'center',
    flex: 1,
  },
  exerciseDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.cardBorder,
  },
  exerciseValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  exerciseLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  exerciseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
    gap: theme.spacing.xs,
  },
  exerciseFooterText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  actionCard: {
    width: '48%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
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
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  analysisRequestsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.lg,
  },
  analysisRequestsCardActive: {
    borderColor: theme.colors.warning,
    borderWidth: 2,
  },
  analysisRequestsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  analysisRequestsText: {
    flex: 1,
  },
  analysisRequestsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  analysisRequestsDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  pendingBadge: {
    backgroundColor: theme.colors.warning,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
    alignSelf: 'flex-start',
  },
  pendingBadgeText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerBtn: {
    padding: theme.spacing.sm,
  },
});
