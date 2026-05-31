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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { getAssessments } from '../../src/utils/api';
import { useStore, Assessment, AssessmentType } from '../../src/store/useStore';

export default function PatientHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentUser } = useStore();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<AssessmentType | 'all'>('all');

  // If patientId is passed, show that patient's history (for physios viewing patient)
  const patientId = (params.patientId as string) || currentUser?.id;

  const fetchData = async () => {
    if (!patientId) return;
    
    try {
      const response = await getAssessments({ patient_id: patientId });
      setAssessments(response.data);
    } catch (error) {
      console.error('Error fetching assessments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [patientId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredAssessments = filter === 'all'
    ? assessments
    : assessments.filter(a => a.assessment_type === filter);

  const getAssessmentIcon = (type: string) => {
    switch (type) {
      case 'posture':
        return <MaterialCommunityIcons name="human" size={24} color={theme.colors.accent} />;
      case 'walking':
        return <MaterialCommunityIcons name="walk" size={24} color={theme.colors.success} />;
      case 'running':
        return <MaterialCommunityIcons name="run" size={24} color={theme.colors.warning} />;
      case 'msk':
        return <MaterialCommunityIcons name="bone" size={24} color={theme.colors.error} />;
      default:
        return <Ionicons name="clipboard" size={24} color={theme.colors.textSecondary} />;
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return theme.colors.success;
    if (percentage >= 60) return theme.colors.warning;
    return theme.colors.error;
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
      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <View style={styles.filterContainer}>
          {(['all', 'posture', 'walking', 'running', 'msk'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, filter === f && styles.filterButtonActive]}
              onPress={() => setFilter(f)}
            >
              {f !== 'all' && (
                <View style={styles.filterIcon}>
                  {f === 'posture' && <MaterialCommunityIcons name="human" size={16} color={filter === f ? theme.colors.textPrimary : theme.colors.textSecondary} />}
                  {f === 'walking' && <MaterialCommunityIcons name="walk" size={16} color={filter === f ? theme.colors.textPrimary : theme.colors.textSecondary} />}
                  {f === 'running' && <MaterialCommunityIcons name="run" size={16} color={filter === f ? theme.colors.textPrimary : theme.colors.textSecondary} />}
                  {f === 'msk' && <MaterialCommunityIcons name="bone" size={16} color={filter === f ? theme.colors.textPrimary : theme.colors.textSecondary} />}
                </View>
              )}
              <Text style={[styles.filterButtonText, filter === f && styles.filterButtonTextActive]}>
                {f === 'all' ? 'All' : f === 'msk' ? 'M.S.K.' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
      >
        <Text style={styles.countText}>
          {filteredAssessments.length} assessment{filteredAssessments.length !== 1 ? 's' : ''}
        </Text>

        {filteredAssessments.map((assessment) => (
          <TouchableOpacity
            key={assessment.id}
            style={styles.assessmentCard}
            onPress={() => router.push(`/assessment/result?id=${assessment.id}`)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                {getAssessmentIcon(assessment.assessment_type)}
              </View>
              <View style={styles.cardTitle}>
                <Text style={styles.assessmentType}>
                  {assessment.assessment_type === 'msk' ? 'M.S.K.' : assessment.assessment_type.charAt(0).toUpperCase() + assessment.assessment_type.slice(1)} Assessment
                </Text>
                <Text style={styles.assessmentDate}>
                  {new Date(assessment.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <View style={styles.scoreContainer}>
                <Text style={[styles.scoreValue, { color: getScoreColor(assessment.percentage) }]}>
                  {assessment.percentage}%
                </Text>
                <Text style={styles.scoreLabel}>
                  {assessment.total_score}/{assessment.max_score}
                </Text>
              </View>
            </View>

            {assessment.physio_name && (
              <View style={styles.physioInfo}>
                <Ionicons name="medical" size={14} color={theme.colors.success} />
                <Text style={styles.physioName}>By {assessment.physio_name}</Text>
              </View>
            )}

            <View style={styles.cardFooter}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${assessment.percentage}%`,
                      backgroundColor: getScoreColor(assessment.percentage),
                    },
                  ]}
                />
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
            </View>
          </TouchableOpacity>
        ))}

        {filteredAssessments.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="clipboard" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No Assessments</Text>
            <Text style={styles.emptyText}>
              {filter === 'all'
                ? "No assessments recorded yet"
                : `No ${filter} assessments found`}
            </Text>
          </View>
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
  filterScroll: {
    maxHeight: 60,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryLight,
    gap: theme.spacing.xs,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.accent,
  },
  filterIcon: {
    marginRight: theme.spacing.xs,
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
  assessmentCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  assessmentType: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  assessmentDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
  },
  scoreLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  physioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  physioName: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.success,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xxl,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});
