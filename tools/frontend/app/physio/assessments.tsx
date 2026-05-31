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
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';

export default function PhysioAssessments() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assessments, setAssessments] = useState<any[]>([]);

  const fetchAssessments = async () => {
    try {
      const res = await api.get('/assessments', {
        params: { physio_id: currentUser?.id }
      });
      setAssessments(res.data || []);
    } catch (error) {
      console.error('Error fetching assessments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssessments();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'good':
      case 'normal':
        return theme.colors.success;
      case 'fair':
      case 'moderate':
        return theme.colors.warning;
      case 'poor':
      case 'at risk':
        return theme.colors.error;
      default:
        return theme.colors.textMuted;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading Assessments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Assessments</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Assessment List */}
        {assessments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No assessments yet</Text>
            <Text style={styles.emptySubtext}>Start by creating a new assessment</Text>
          </View>
        ) : (
          assessments.map((assessment, index) => (
            <TouchableOpacity
              key={assessment.id || index}
              style={styles.assessmentCard}
              onPress={() => router.push(`/assessment/result?id=${assessment.id}`)}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.typeBadge, { backgroundColor: theme.colors.accent + '20' }]}>
                  <Text style={styles.typeText}>
                    {assessment.assessment_type?.toUpperCase() || 'ASSESSMENT'}
                  </Text>
                </View>
                <Text style={[styles.statusText, { color: getStatusColor(assessment.status) }]}>
                  {assessment.status || 'Completed'}
                </Text>
              </View>
              
              <Text style={styles.patientName}>
                {assessment.patient_name || 'Patient'}
              </Text>
              
              <View style={styles.cardFooter}>
                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreLabel}>Score</Text>
                  <Text style={styles.scoreValue}>
                    {assessment.percentage ? `${assessment.percentage}%` : `${assessment.total_score || 0}/${assessment.max_score || 100}`}
                  </Text>
                </View>
                <Text style={styles.dateText}>
                  {new Date(assessment.created_at).toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>
          ))
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
  scrollContent: {
    padding: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  assessmentCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  typeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
  },
  statusText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  patientName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  scoreLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  scoreValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
  },
  dateText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
});
