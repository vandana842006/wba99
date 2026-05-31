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
import { getAssessments, getAssignedExercises, getPatientAnalytics, getPatientReports } from '../../src/utils/api';
import { useStore, Assessment, AssignedExercise } from '../../src/store/useStore';

interface AssessmentReport {
  id: string;
  assessment_type: string;
  patient_name: string;
  physio_name?: string;
  total_score?: number;
  percentage?: number;
  risk_level?: string;
  created_at: string;
  ai_analysis?: any;
}

export default function PatientDashboard() {
  const router = useRouter();
  const { currentUser, logout } = useStore();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [reports, setReports] = useState<AssessmentReport[]>([]);
  const [exercises, setExercises] = useState<AssignedExercise[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!currentUser) return;
    
    try {
      const [assessmentsRes, exercisesRes, analyticsRes, reportsRes] = await Promise.all([
        getAssessments({ patient_id: currentUser.id }),
        getAssignedExercises({ patient_id: currentUser.id }),
        getPatientAnalytics(currentUser.id),
        getPatientReports(currentUser.id),
      ]);
      
      setAssessments(assessmentsRes.data.slice(0, 3));
      setExercises(exercisesRes.data);
      setAnalytics(analyticsRes.data);
      setReports(reportsRes.data?.reports || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

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

  const pendingExercises = exercises.filter(e => e.status !== 'completed');
  const completedExercises = exercises.filter(e => e.status === 'completed');

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
        {/* Premium Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={28} color={theme.colors.accent} />
            </View>
            <View>
              <Text style={styles.welcomeText}>Welcome back</Text>
              <Text style={styles.nameText}>{currentUser?.name}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.notificationBtn}>
              <Ionicons name="notifications-outline" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <Ionicons name="log-out" size={24} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress Card */}
        <TouchableOpacity style={styles.progressCard} onPress={() => router.push('/patient/progress')}>
          <View style={styles.progressCardHeader}>
            <Text style={styles.progressTitle}>Your Progress</Text>
            <View style={styles.viewProgressBtn}>
              <Ionicons name="analytics" size={16} color={theme.colors.accent} />
              <Text style={styles.viewProgressText}>View Charts</Text>
            </View>
          </View>
          <View style={styles.progressStats}>
            <View style={styles.progressItem}>
              <Text style={styles.progressValue}>{analytics?.total_assessments || 0}</Text>
              <Text style={styles.progressLabel}>Assessments</Text>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressItem}>
              <Text style={styles.progressValue}>{completedExercises.length}</Text>
              <Text style={styles.progressLabel}>Exercises Done</Text>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressItem}>
              <Text style={[styles.progressValue, { color: theme.colors.success }]}>
                {analytics?.exercises?.completion_rate || 0}%
              </Text>
              <Text style={styles.progressLabel}>Completion</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Quick Actions - Reports & Exercises Instead of Assessments */}
        <Text style={styles.sectionTitle}>My Health</Text>
        <View style={styles.healthGrid}>
          <TouchableOpacity
            style={styles.healthCard}
            onPress={() => router.push('/patient/prescriptions')}
          >
            <View style={[styles.healthCardIcon, { backgroundColor: '#4CAF50' }]}>
              <MaterialCommunityIcons name="file-document" size={28} color="#fff" />
            </View>
            <Text style={styles.healthCardTitle}>Reports & Exercises</Text>
            <Text style={styles.healthCardSubtitle}>View your prescriptions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.healthCard}
            onPress={() => router.push('/patient/progress')}
          >
            <View style={[styles.healthCardIcon, { backgroundColor: '#2196F3' }]}>
              <MaterialCommunityIcons name="chart-line" size={28} color="#fff" />
            </View>
            <Text style={styles.healthCardTitle}>Progress Tracking</Text>
            <Text style={styles.healthCardSubtitle}>View your improvement</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.healthCard}
            onPress={() => router.push('/patient/daily-tracking')}
          >
            <View style={[styles.healthCardIcon, { backgroundColor: '#FF9800' }]}>
              <MaterialCommunityIcons name="weight-lifter" size={28} color="#fff" />
            </View>
            <Text style={styles.healthCardTitle}>Load Monitoring</Text>
            <Text style={styles.healthCardSubtitle}>Track daily activity</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.healthCard}
            onPress={() => router.push('/patient/exercises')}
          >
            <View style={[styles.healthCardIcon, { backgroundColor: '#9C27B0' }]}>
              <MaterialCommunityIcons name="dumbbell" size={28} color="#fff" />
            </View>
            <Text style={styles.healthCardTitle}>My Exercises</Text>
            <Text style={styles.healthCardSubtitle}>Assigned by physio</Text>
          </TouchableOpacity>
        </View>

        {/* My Reports Section */}
        {reports.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>My Assessment Reports</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reportsScroll}>
              {reports.slice(0, 5).map((report) => (
                <TouchableOpacity
                  key={report.id}
                  style={styles.reportCard}
                  onPress={() => router.push(`/patient/report/${report.id}` as any)}
                >
                  <View style={styles.reportHeader}>
                    {getAssessmentIcon(report.assessment_type)}
                    <Text style={styles.reportType}>
                      {report.assessment_type.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </View>
                  {report.percentage !== undefined && (
                    <View style={styles.reportScore}>
                      <Text style={styles.reportScoreValue}>{Math.round(report.percentage)}%</Text>
                      <Text style={styles.reportScoreLabel}>Score</Text>
                    </View>
                  )}
                  {report.risk_level && (
                    <View style={[styles.riskBadge, { 
                      backgroundColor: report.risk_level === 'low' ? '#4CAF50' : 
                                       report.risk_level === 'medium' ? '#FF9800' : '#F44336' 
                    }]}>
                      <Text style={styles.riskText}>{report.risk_level.toUpperCase()} RISK</Text>
                    </View>
                  )}
                  <Text style={styles.reportDate}>
                    {new Date(report.created_at).toLocaleDateString()}
                  </Text>
                  <Text style={styles.reportPhysio}>By: {report.physio_name || 'Physio'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Physio Recommendations Section */}
        <View style={styles.recommendationSection}>
          <View style={styles.recommendationHeader}>
            <MaterialCommunityIcons name="doctor" size={24} color="#4CAF50" />
            <Text style={styles.recommendationTitle}>Recommendations by Physio</Text>
          </View>
          {pendingExercises.length > 0 ? (
            <>
              <View style={styles.recommendationCard}>
                <Text style={styles.recommendationLabel}>Current Focus</Text>
                <Text style={styles.recommendationText}>
                  {pendingExercises[0]?.notes || 'Follow your exercise program consistently'}
                </Text>
              </View>
              <View style={styles.recommendationStats}>
                <View style={styles.recommendationStat}>
                  <Text style={styles.statValue}>{pendingExercises.length}</Text>
                  <Text style={styles.statLabel}>Exercises Pending</Text>
                </View>
                <View style={styles.recommendationStat}>
                  <Text style={styles.statValue}>{completedExercises.length}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.recommendationStat}>
                  <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                    {analytics?.exercises?.completion_rate || 0}%
                  </Text>
                  <Text style={styles.statLabel}>Progress</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.noRecommendation}>
              <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
              <Text style={styles.noRecommendationText}>Great job! All exercises completed!</Text>
            </View>
          )}
        </View>

        {/* Pending Exercises */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending Exercises</Text>
          <TouchableOpacity onPress={() => router.push('/patient/exercises')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        {pendingExercises.length > 0 ? (
          pendingExercises.slice(0, 2).map((exercise) => (
            <TouchableOpacity
              key={exercise.id}
              style={styles.exerciseCard}
              onPress={() => router.push('/patient/exercises')}
            >
              <View style={styles.exerciseIcon}>
                <Ionicons name="fitness" size={24} color={theme.colors.warning} />
              </View>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
                <Text style={styles.exercisePhysio}>Assigned by {exercise.physio_name}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: theme.colors.warning + '20' }]}>
                <Text style={[styles.statusText, { color: theme.colors.warning }]}>
                  {exercise.status === 'in_progress' ? 'In Progress' : 'Pending'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle" size={32} color={theme.colors.success} />
            <Text style={styles.emptyText}>No pending exercises!</Text>
          </View>
        )}

        {/* Recent Assessments */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Assessments</Text>
          <TouchableOpacity onPress={() => router.push('/patient/history')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        {assessments.length > 0 ? (
          assessments.map((assessment) => (
            <TouchableOpacity
              key={assessment.id}
              style={styles.assessmentCard}
              onPress={() => router.push(`/assessment/result?id=${assessment.id}`)}
            >
              <View style={styles.assessmentCardIcon}>
                {getAssessmentIcon(assessment.assessment_type)}
              </View>
              <View style={styles.assessmentCardContent}>
                <Text style={styles.assessmentCardTitle}>
                  {assessment.assessment_type.charAt(0).toUpperCase() + assessment.assessment_type.slice(1)} Assessment
                </Text>
                <Text style={styles.assessmentCardDate}>
                  {new Date(assessment.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.assessmentCardScore}>
                <Text style={styles.scoreValue}>{assessment.percentage}%</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="clipboard" size={32} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No assessments yet</Text>
            <Text style={styles.emptySubtext}>Start your first assessment above!</Text>
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
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.error + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  progressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  progressTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  viewProgressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  viewProgressText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.bold,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  progressItem: {
    alignItems: 'center',
  },
  progressValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  progressLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  progressDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.cardBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  seeAllText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
  },
  assessmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  assessmentButton: {
    width: '48%',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  assessmentButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
  },
  exerciseCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  exerciseIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  exerciseName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  exercisePhysio: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  statusBadge: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
  },
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  assessmentCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  assessmentCardIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assessmentCardContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  assessmentCardTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  assessmentCardDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  assessmentCardScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  scoreValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
  },
  
  // New Health Grid Styles
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  healthCard: {
    width: '48%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  healthCardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  healthCardTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  healthCardSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  
  // Recommendation Section Styles
  recommendationSection: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  recommendationTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: '#4CAF50',
  },
  recommendationCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  recommendationLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    fontStyle: 'italic',
  },
  recommendationStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  recommendationStat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  noRecommendation: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  noRecommendationText: {
    fontSize: theme.fontSize.sm,
    color: '#4CAF50',
    marginTop: theme.spacing.sm,
  },
  // Report styles
  reportsScroll: {
    marginBottom: theme.spacing.lg,
  },
  reportCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginRight: theme.spacing.sm,
    width: 160,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  reportType: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.xs,
    flex: 1,
  },
  reportScore: {
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
  },
  reportScoreValue: {
    fontSize: 28,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
  },
  reportScoreLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  riskBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  riskText: {
    fontSize: 10,
    fontWeight: theme.fontWeight.bold,
    color: '#fff',
  },
  reportDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  reportPhysio: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
