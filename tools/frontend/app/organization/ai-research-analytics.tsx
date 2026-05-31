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

export default function AIResearchAnalytics() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const [queryType, setQueryType] = useState('general');
  
  const fetchInsights = async (query: string = 'Provide comprehensive analytics overview') => {
    try {
      setLoading(true);
      const response = await api.post('/ai/research-analysis', {
        query: query,
        analysis_type: queryType,
        patient_data: [],
      });
      setInsights(response.data);
    } catch (error) {
      console.error('Research analytics error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInsights();
  };

  const analysisQueries = [
    { type: 'general', label: 'Overview', icon: 'analytics', query: 'Provide comprehensive platform analytics overview' },
    { type: 'condition_analysis', label: 'Conditions', icon: 'medical', query: 'Analyze patient condition distribution and trends' },
    { type: 'outcome_prediction', label: 'Outcomes', icon: 'trending-up', query: 'Predict treatment outcomes and success rates' },
    { type: 'trends', label: 'Trends', icon: 'stats-chart', query: 'Identify key trends in patient data and treatments' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <MaterialCommunityIcons name="chart-arc" size={28} color={theme.colors.accent} />
          <Text style={styles.headerTitle}>AI Research Analytics</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Analysis Type Selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.analysisSelector}
      >
        {analysisQueries.map(item => (
          <TouchableOpacity
            key={item.type}
            style={[styles.analysisButton, queryType === item.type && styles.analysisButtonActive]}
            onPress={() => {
              setQueryType(item.type);
              fetchInsights(item.query);
            }}
          >
            <Ionicons 
              name={item.icon as any} 
              size={18} 
              color={queryType === item.type ? '#fff' : theme.colors.textMuted} 
            />
            <Text style={[styles.analysisButtonText, queryType === item.type && styles.analysisButtonTextActive]}>
              {item.label}
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
        {loading && !insights ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={styles.loadingText}>AI analyzing data...</Text>
          </View>
        ) : (
          <>
            {/* Key Metrics Cards */}
            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, { backgroundColor: '#4CAF50' }]}>
                <Ionicons name="people" size={28} color="#fff" />
                <Text style={styles.metricValue}>{insights?.statistics?.total_patients || 0}</Text>
                <Text style={styles.metricLabel}>Patients</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: '#2196F3' }]}>
                <Ionicons name="person-add" size={28} color="#fff" />
                <Text style={styles.metricValue}>{insights?.statistics?.total_physios || 0}</Text>
                <Text style={styles.metricLabel}>Physios</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: '#9C27B0' }]}>
                <Ionicons name="clipboard" size={28} color="#fff" />
                <Text style={styles.metricValue}>{insights?.statistics?.total_assessments || 0}</Text>
                <Text style={styles.metricLabel}>Assessments</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: '#FF9800' }]}>
                <Ionicons name="business" size={28} color="#fff" />
                <Text style={styles.metricValue}>{insights?.statistics?.total_organizations || 0}</Text>
                <Text style={styles.metricLabel}>Organizations</Text>
              </View>
            </View>

            {/* AI Insights Section */}
            <View style={styles.insightsSection}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="brain" size={24} color={theme.colors.accent} />
                <Text style={styles.sectionTitle}>AI Generated Insights</Text>
              </View>
              <View style={styles.insightCard}>
                <Text style={styles.insightText}>{insights?.insights || 'No insights available'}</Text>
              </View>
            </View>

            {/* Trends Section */}
            <View style={styles.trendsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="trending-up" size={24} color={theme.colors.success} />
                <Text style={styles.sectionTitle}>Identified Trends</Text>
              </View>
              {insights?.trends?.map((trend: string, index: number) => (
                <View key={index} style={styles.trendItem}>
                  <View style={[styles.trendDot, { backgroundColor: theme.colors.success }]} />
                  <Text style={styles.trendText}>{trend}</Text>
                </View>
              ))}
            </View>

            {/* Recommendations Section */}
            <View style={styles.recommendationsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="bulb" size={24} color={theme.colors.warning} />
                <Text style={styles.sectionTitle}>AI Recommendations</Text>
              </View>
              {insights?.recommendations?.map((rec: string, index: number) => (
                <View key={index} style={styles.recommendationItem}>
                  <View style={styles.recommendationNumber}>
                    <Text style={styles.recommendationNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.recommendationText}>{rec}</Text>
                </View>
              ))}
            </View>

            {/* Predicted Trends */}
            <View style={styles.predictionsSection}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="crystal-ball" size={24} color="#9C27B0" />
                <Text style={styles.sectionTitle}>Predicted Trends</Text>
              </View>
              {insights?.predicted_trends?.map((pred: any, index: number) => (
                <View key={index} style={styles.predictionItem}>
                  <Text style={styles.predictionMetric}>{pred.metric}</Text>
                  <Text style={styles.predictionValue}>{pred.prediction}</Text>
                </View>
              ))}
            </View>

            {/* Export Options */}
            <View style={styles.exportSection}>
              <Text style={styles.exportTitle}>Export Research Data</Text>
              <View style={styles.exportButtons}>
                <TouchableOpacity style={styles.exportButton}>
                  <Ionicons name="document-text" size={20} color={theme.colors.accent} />
                  <Text style={styles.exportButtonText}>PDF Report</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.exportButton}>
                  <Ionicons name="grid" size={20} color={theme.colors.accent} />
                  <Text style={styles.exportButtonText}>Excel Data</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.exportButton}>
                  <Ionicons name="share" size={20} color={theme.colors.accent} />
                  <Text style={styles.exportButtonText}>Share</Text>
                </TouchableOpacity>
              </View>
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
  refreshButton: {
    padding: theme.spacing.xs,
  },
  analysisSelector: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.card,
  },
  analysisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  analysisButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  analysisButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  analysisButtonTextActive: {
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  metricCard: {
    width: (SCREEN_WIDTH - 48) / 2 - 4,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: theme.spacing.sm,
  },
  metricLabel: {
    fontSize: theme.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  insightsSection: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  insightCard: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  insightText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    lineHeight: 24,
  },
  trendsSection: {
    marginBottom: theme.spacing.lg,
  },
  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  trendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  trendText: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
  },
  recommendationsSection: {
    marginBottom: theme.spacing.lg,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  recommendationNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.warning,
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
  predictionsSection: {
    marginBottom: theme.spacing.lg,
  },
  predictionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  predictionMetric: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  predictionValue: {
    color: theme.colors.success,
    fontSize: theme.fontSize.md,
  },
  exportSection: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  exportTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  exportButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  exportButtonText: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.sm,
  },
});
