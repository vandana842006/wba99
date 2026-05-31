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
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import api from '../../src/utils/api';
import { useStore } from '../../src/store/useStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AIAdminDashboard() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [timeRange, setTimeRange] = useState('30d');
  
  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.post('/ai/admin-dashboard', {
        time_range: timeRange,
        metrics_requested: ['all'],
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Admin dashboard error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [timeRange]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const timeRanges = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <MaterialCommunityIcons name="view-dashboard-variant" size={28} color={theme.colors.accent} />
          <Text style={styles.headerTitle}>AI Admin Dashboard</Text>
        </View>
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {timeRanges.map(range => (
          <TouchableOpacity
            key={range.value}
            style={[styles.timeRangeButton, timeRange === range.value && styles.timeRangeButtonActive]}
            onPress={() => setTimeRange(range.value)}
          >
            <Text style={[styles.timeRangeText, timeRange === range.value && styles.timeRangeTextActive]}>
              {range.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {loading && !dashboardData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={styles.loadingText}>AI analyzing metrics...</Text>
          </View>
        ) : (
          <>
            {/* Executive Summary */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <MaterialCommunityIcons name="brain" size={24} color={theme.colors.accent} />
                <Text style={styles.summaryTitle}>AI Executive Summary</Text>
              </View>
              <Text style={styles.summaryText}>{dashboardData?.summary}</Text>
            </View>

            {/* Key Metrics Grid */}
            <Text style={styles.sectionTitle}>📊 Key Metrics</Text>
            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, { backgroundColor: '#4CAF50' }]}>
                <Ionicons name="people" size={24} color="#fff" />
                <Text style={styles.metricValue}>{dashboardData?.key_metrics?.total_users || 0}</Text>
                <Text style={styles.metricLabel}>Total Users</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: '#2196F3' }]}>
                <Ionicons name="medkit" size={24} color="#fff" />
                <Text style={styles.metricValue}>{dashboardData?.key_metrics?.total_physios || 0}</Text>
                <Text style={styles.metricLabel}>Physios</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: '#9C27B0' }]}>
                <Ionicons name="person" size={24} color="#fff" />
                <Text style={styles.metricValue}>{dashboardData?.key_metrics?.total_patients || 0}</Text>
                <Text style={styles.metricLabel}>Patients</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: '#FF5722' }]}>
                <Ionicons name="clipboard" size={24} color="#fff" />
                <Text style={styles.metricValue}>{dashboardData?.key_metrics?.total_assessments || 0}</Text>
                <Text style={styles.metricLabel}>Assessments</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: '#00BCD4' }]}>
                <Ionicons name="business" size={24} color="#fff" />
                <Text style={styles.metricValue}>{dashboardData?.key_metrics?.total_organizations || 0}</Text>
                <Text style={styles.metricLabel}>Organizations</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: '#FF9800' }]}>
                <Ionicons name="trending-up" size={24} color="#fff" />
                <Text style={styles.metricValue}>{dashboardData?.key_metrics?.growth_rate || '0%'}</Text>
                <Text style={styles.metricLabel}>Growth Rate</Text>
              </View>
            </View>

            {/* AI Insights */}
            <Text style={styles.sectionTitle}>🧠 AI Insights</Text>
            <View style={styles.insightsContainer}>
              {dashboardData?.insights?.map((insight: string, index: number) => (
                <View key={index} style={styles.insightCard}>
                  <View style={styles.insightIcon}>
                    <Ionicons name="bulb" size={20} color="#fff" />
                  </View>
                  <Text style={styles.insightText}>{insight}</Text>
                </View>
              ))}
            </View>

            {/* Alerts */}
            <Text style={styles.sectionTitle}>🔔 Alerts</Text>
            <View style={styles.alertsContainer}>
              {dashboardData?.alerts?.map((alert: any, index: number) => (
                <View key={index} style={[
                  styles.alertCard,
                  alert.type === 'warning' && styles.alertWarning,
                  alert.type === 'error' && styles.alertError,
                  alert.type === 'info' && styles.alertInfo,
                  alert.type === 'success' && styles.alertSuccess,
                ]}>
                  <Ionicons 
                    name={
                      alert.type === 'warning' ? 'warning' : 
                      alert.type === 'error' ? 'close-circle' : 
                      alert.type === 'success' ? 'checkmark-circle' : 'information-circle'
                    } 
                    size={20} 
                    color={
                      alert.type === 'warning' ? '#FF9800' : 
                      alert.type === 'error' ? '#F44336' : 
                      alert.type === 'success' ? '#4CAF50' : '#2196F3'
                    } 
                  />
                  <Text style={styles.alertText}>{alert.message}</Text>
                </View>
              ))}
            </View>

            {/* Recommendations */}
            <Text style={styles.sectionTitle}>💡 AI Recommendations</Text>
            <View style={styles.recommendationsContainer}>
              {dashboardData?.recommendations?.map((rec: string, index: number) => (
                <View key={index} style={styles.recommendationCard}>
                  <View style={styles.recommendationNumber}>
                    <Text style={styles.recommendationNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.recommendationText}>{rec}</Text>
                </View>
              ))}
            </View>

            {/* Predicted Trends */}
            <Text style={styles.sectionTitle}>🔮 Predicted Trends</Text>
            <View style={styles.predictionsContainer}>
              {dashboardData?.predicted_trends?.map((trend: any, index: number) => (
                <View key={index} style={styles.predictionCard}>
                  <Text style={styles.predictionMetric}>{trend.metric}</Text>
                  <View style={styles.predictionBadge}>
                    <Ionicons name="trending-up" size={16} color={theme.colors.success} />
                    <Text style={styles.predictionValue}>{trend.prediction}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
            <View style={styles.quickActionsContainer}>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => router.push('/admin/organization-management')}
              >
                <Ionicons name="business" size={24} color={theme.colors.accent} />
                <Text style={styles.quickActionText}>Manage Orgs</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => router.push('/organization/ai-research-analytics')}
              >
                <Ionicons name="analytics" size={24} color={theme.colors.accent} />
                <Text style={styles.quickActionText}>Research</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => router.push('/admin/exercise-management')}
              >
                <Ionicons name="fitness" size={24} color={theme.colors.accent} />
                <Text style={styles.quickActionText}>Exercises</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => router.push('/physio/ai-assistant')}
              >
                <MaterialCommunityIcons name="robot" size={24} color={theme.colors.accent} />
                <Text style={styles.quickActionText}>AI Chat</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        
        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
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
  aiBadge: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    gap: theme.spacing.sm,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  timeRangeButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  timeRangeText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  timeRangeTextActive: {
    color: '#fff',
    fontWeight: theme.fontWeight.bold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
  },
  summaryCard: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  summaryTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  summaryText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  metricCard: {
    width: (SCREEN_WIDTH - 48) / 3 - 5,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  insightsContainer: {
    gap: theme.spacing.sm,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightText: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
  },
  alertsContainer: {
    gap: theme.spacing.sm,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.card,
  },
  alertWarning: {
    backgroundColor: '#FF9800' + '20',
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  alertError: {
    backgroundColor: '#F44336' + '20',
    borderLeftWidth: 3,
    borderLeftColor: '#F44336',
  },
  alertInfo: {
    backgroundColor: '#2196F3' + '20',
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  alertSuccess: {
    backgroundColor: '#4CAF50' + '20',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  alertText: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
  },
  recommendationsContainer: {
    gap: theme.spacing.sm,
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  recommendationNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendationNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: theme.fontSize.sm,
  },
  recommendationText: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
  },
  predictionsContainer: {
    gap: theme.spacing.sm,
  },
  predictionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  predictionMetric: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  predictionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  predictionValue: {
    color: theme.colors.success,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  quickActionButton: {
    width: (SCREEN_WIDTH - 48) / 4 - 6,
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  quickActionText: {
    color: theme.colors.textPrimary,
    fontSize: 10,
    textAlign: 'center',
  },
});
