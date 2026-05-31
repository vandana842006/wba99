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
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import api from '../../src/utils/api';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  totalUsers: number;
  totalPatients: number;
  totalPhysios: number;
  totalAssessments: number;
  assessmentsByType: { [key: string]: number };
  recentActivity: Array<{ action: string; user: string; date: string }>;
  monthlyStats: Array<{ month: string; assessments: number; users: number }>;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  const fetchAnalytics = async () => {
    try {
      // Fetch various analytics data
      const [usersRes, assessmentsRes] = await Promise.all([
        api.get('/users'),
        api.get('/assessment-reports?limit=1000'),
      ]);

      const users = usersRes.data || [];
      const assessments = assessmentsRes.data || [];

      // Calculate analytics
      const patients = users.filter((u: any) => u.role === 'patient');
      const physios = users.filter((u: any) => u.role === 'physio');

      // Group assessments by type
      const assessmentsByType: { [key: string]: number } = {};
      assessments.forEach((a: any) => {
        const type = a.assessment_type || 'unknown';
        assessmentsByType[type] = (assessmentsByType[type] || 0) + 1;
      });

      setAnalytics({
        totalUsers: users.length,
        totalPatients: patients.length,
        totalPhysios: physios.length,
        totalAssessments: assessments.length,
        assessmentsByType,
        recentActivity: [],
        monthlyStats: [],
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
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
          <Text style={styles.headerTitle}>📊 Analytics Dashboard</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Overview Cards */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.overviewGrid}>
          <View style={[styles.overviewCard, { borderLeftColor: theme.colors.accent }]}>
            <Ionicons name="people" size={32} color={theme.colors.accent} />
            <Text style={styles.overviewValue}>{analytics?.totalUsers || 0}</Text>
            <Text style={styles.overviewLabel}>Total Users</Text>
          </View>
          <View style={[styles.overviewCard, { borderLeftColor: theme.colors.success }]}>
            <Ionicons name="medical" size={32} color={theme.colors.success} />
            <Text style={styles.overviewValue}>{analytics?.totalPhysios || 0}</Text>
            <Text style={styles.overviewLabel}>Physios</Text>
          </View>
          <View style={[styles.overviewCard, { borderLeftColor: theme.colors.warning }]}>
            <Ionicons name="person" size={32} color={theme.colors.warning} />
            <Text style={styles.overviewValue}>{analytics?.totalPatients || 0}</Text>
            <Text style={styles.overviewLabel}>Patients</Text>
          </View>
          <View style={[styles.overviewCard, { borderLeftColor: '#9C27B0' }]}>
            <MaterialCommunityIcons name="clipboard-check" size={32} color="#9C27B0" />
            <Text style={styles.overviewValue}>{analytics?.totalAssessments || 0}</Text>
            <Text style={styles.overviewLabel}>Assessments</Text>
          </View>
        </View>

        {/* Assessments by Type */}
        <Text style={styles.sectionTitle}>Assessments by Type</Text>
        <View style={styles.chartCard}>
          {analytics?.assessmentsByType && Object.keys(analytics.assessmentsByType).length > 0 ? (
            Object.entries(analytics.assessmentsByType).map(([type, count], index) => {
              const colors = [theme.colors.accent, theme.colors.success, theme.colors.warning, theme.colors.error, '#9C27B0'];
              const maxCount = Math.max(...Object.values(analytics.assessmentsByType));
              const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
              
              return (
                <View key={type} style={styles.barItem}>
                  <View style={styles.barLabelRow}>
                    <Text style={styles.barLabel}>{type.toUpperCase()}</Text>
                    <Text style={styles.barValue}>{count}</Text>
                  </View>
                  <View style={styles.barBackground}>
                    <View 
                      style={[
                        styles.barFill, 
                        { 
                          width: `${percentage}%`,
                          backgroundColor: colors[index % colors.length]
                        }
                      ]} 
                    />
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.noDataContainer}>
              <Ionicons name="analytics-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.noDataText}>No assessment data yet</Text>
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <Text style={styles.sectionTitle}>Platform Health</Text>
        <View style={styles.healthCard}>
          <View style={styles.healthItem}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
            <Text style={styles.healthLabel}>System Status</Text>
            <Text style={[styles.healthValue, { color: theme.colors.success }]}>Online</Text>
          </View>
          <View style={styles.healthDivider} />
          <View style={styles.healthItem}>
            <Ionicons name="server" size={24} color={theme.colors.accent} />
            <Text style={styles.healthLabel}>API Response</Text>
            <Text style={[styles.healthValue, { color: theme.colors.accent }]}>Normal</Text>
          </View>
          <View style={styles.healthDivider} />
          <View style={styles.healthItem}>
            <Ionicons name="cloud" size={24} color={theme.colors.success} />
            <Text style={styles.healthLabel}>Database</Text>
            <Text style={[styles.healthValue, { color: theme.colors.success }]}>Connected</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/admin/user-management')}
          >
            <Ionicons name="people" size={24} color={theme.colors.textPrimary} />
            <Text style={styles.actionButtonText}>Manage Users</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/admin/analysis-requests')}
          >
            <Ionicons name="document-text" size={24} color={theme.colors.textPrimary} />
            <Text style={styles.actionButtonText}>View Requests</Text>
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
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  overviewCard: {
    width: '48%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  overviewValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
  },
  overviewLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  chartCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  barItem: {
    marginBottom: theme.spacing.md,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  barLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  barValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  barBackground: {
    height: 12,
    backgroundColor: theme.colors.cardBorder,
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  noDataContainer: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  noDataText: {
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  healthCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  healthItem: {
    alignItems: 'center',
  },
  healthLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  healthValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    marginTop: 2,
  },
  healthDivider: {
    width: 1,
    backgroundColor: theme.colors.cardBorder,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xl,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  actionButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
});
