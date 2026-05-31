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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { useStore, Assessment } from '../../src/store/useStore';
import api from '../../src/utils/api';

export default function RecentAnalysesScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      const res = await api.get(`/assessments/physio/${currentUser?.id}`);
      setAssessments(res.data || []);
    } catch (error) {
      console.error('Error fetching assessments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssessments();
  };

  const getAssessmentIcon = (type: string) => {
    const icons: Record<string, { name: string; color: string; bg: string }> = {
      posture: { name: 'human', color: '#4CAF50', bg: '#4CAF5020' },
      gait: { name: 'walk', color: '#2196F3', bg: '#2196F320' },
      fms: { name: 'run', color: '#FF9800', bg: '#FF980020' },
      rom: { name: 'rotate-3d-variant', color: '#9C27B0', bg: '#9C27B020' },
      balance: { name: 'scale-balance', color: '#00BCD4', bg: '#00BCD420' },
      flexibility: { name: 'yoga', color: '#E91E63', bg: '#E91E6320' },
    };
    return icons[type?.toLowerCase()] || { name: 'clipboard-check', color: '#607D8B', bg: '#607D8B20' };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  const filteredAssessments = filter === 'all' 
    ? assessments 
    : assessments.filter(a => a.assessment_type?.toLowerCase() === filter);

  const filterOptions = ['all', 'posture', 'gait', 'fms', 'rom'];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading analyses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Recent Analyses</Text>
          <Text style={styles.headerSubtitle}>{assessments.length} total assessments</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={22} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filterOptions.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.filterTab, filter === option && styles.filterTabActive]}
            onPress={() => setFilter(option)}
          >
            <Text style={[styles.filterTabText, filter === option && styles.filterTabTextActive]}>
              {option.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Assessments List */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
      >
        {filteredAssessments.length > 0 ? (
          filteredAssessments.map((assessment) => {
            const icon = getAssessmentIcon(assessment.assessment_type);
            const score = assessment.percentage || assessment.score || 0;
            return (
              <TouchableOpacity
                key={assessment.id}
                style={styles.assessmentCard}
                onPress={() => router.push(`/assessment/result?id=${assessment.id}`)}
              >
                <View style={[styles.assessmentIcon, { backgroundColor: icon.bg }]}>
                  <MaterialCommunityIcons name={icon.name as any} size={26} color={icon.color} />
                </View>
                <View style={styles.assessmentInfo}>
                  <Text style={styles.assessmentPatient}>{assessment.patient_name || 'Patient'}</Text>
                  <Text style={styles.assessmentType}>
                    {(assessment.assessment_type || 'Assessment').toUpperCase()}
                  </Text>
                  <View style={styles.assessmentMeta}>
                    <Ionicons name="calendar" size={12} color={theme.colors.textMuted} />
                    <Text style={styles.assessmentDate}>{formatDate(assessment.created_at)} • {formatTime(assessment.created_at)}</Text>
                  </View>
                </View>
                <View style={styles.assessmentScore}>
                  <Text style={[styles.scoreValue, { color: getScoreColor(score) }]}>{score}%</Text>
                  <View style={[styles.scoreIndicator, { backgroundColor: getScoreColor(score) }]} />
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={60} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No Assessments Found</Text>
            <Text style={styles.emptyText}>
              {filter === 'all' 
                ? 'Start conducting assessments to see them here'
                : `No ${filter.toUpperCase()} assessments found`}
            </Text>
            <TouchableOpacity 
              style={styles.newAssessmentBtn}
              onPress={() => router.push('/assessment/new')}
            >
              <Ionicons name="add" size={20} color="#000" />
              <Text style={styles.newAssessmentBtnText}>New Assessment</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Summary Stats */}
        {assessments.length > 0 && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Assessment Summary</Text>
            <View style={styles.summaryGrid}>
              {filterOptions.slice(1).map((type) => {
                const typeAssessments = assessments.filter(a => a.assessment_type?.toLowerCase() === type);
                const avgScore = typeAssessments.length > 0 
                  ? Math.round(typeAssessments.reduce((sum, a) => sum + (a.percentage || 0), 0) / typeAssessments.length)
                  : 0;
                const icon = getAssessmentIcon(type);
                return (
                  <View key={type} style={styles.summaryCard}>
                    <MaterialCommunityIcons name={icon.name as any} size={24} color={icon.color} />
                    <Text style={styles.summaryCount}>{typeAssessments.length}</Text>
                    <Text style={styles.summaryType}>{type.toUpperCase()}</Text>
                    {avgScore > 0 && <Text style={styles.summaryAvg}>Avg: {avgScore}%</Text>}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textMuted,
    marginTop: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'ios' ? 10 : 35,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1A3A5C',
  },
  backBtn: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.gold,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  refreshBtn: {
    padding: 8,
  },
  filterContainer: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#1A3A5C',
  },
  filterContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: theme.colors.accent,
  },
  filterTabText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  assessmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  assessmentIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assessmentInfo: {
    flex: 1,
  },
  assessmentPatient: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  assessmentType: {
    fontSize: 11,
    color: theme.colors.accent,
    marginTop: 2,
    fontWeight: '600',
  },
  assessmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  assessmentDate: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  assessmentScore: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scoreIndicator: {
    width: 30,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  newAssessmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.gold,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
    gap: 8,
  },
  newAssessmentBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  summarySection: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.gold,
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 6,
  },
  summaryType: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  summaryAvg: {
    fontSize: 11,
    color: theme.colors.accent,
    marginTop: 4,
  },
});
