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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';

interface TrackingEntry {
  id: string;
  patient_id: string;
  patient_name: string;
  date: string;
  rpe_score: number;
  exercise_completed: boolean;
  not_done_reasons: string[];
  pain_level: number;
  pain_location: string;
  sleep_quality: number;
  energy_level: number;
  mood: string;
  notes: string;
}

const RPE_COLORS = ['#4CAF50', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#f44336', '#E91E63', '#9C27B0'];

export default function PatientTrackingView() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trackingData, setTrackingData] = useState<TrackingEntry[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const fetchData = async () => {
    if (!currentUser?.id) {
      console.log('No currentUser ID available');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      console.log('Fetching patients for physio:', currentUser.id);
      // Fetch patients
      const patientsRes = await api.get(`/users/physio/${currentUser.id}/patients`);
      console.log('Patients found:', patientsRes.data?.length || 0);
      setPatients(patientsRes.data || []);
      
      // Fetch all tracking data for physio's patients
      const trackingRes = await api.get('/daily-tracking', {
        params: { physio_id: currentUser.id, limit: 100 }
      });
      setTrackingData(trackingRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setPatients([]);
      setTrackingData([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const filteredData = selectedPatient 
    ? trackingData.filter(t => t.patient_id === selectedPatient)
    : trackingData;

  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'great': return 'happy';
      case 'good': return 'happy-outline';
      case 'neutral': return 'remove';
      case 'bad': return 'sad-outline';
      case 'terrible': return 'sad';
      default: return 'help';
    }
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'great': return '#4CAF50';
      case 'good': return '#8BC34A';
      case 'neutral': return '#FFC107';
      case 'bad': return '#FF9800';
      case 'terrible': return '#f44336';
      default: return theme.colors.textMuted;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading patient data...</Text>
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
          <Text style={styles.headerTitle}>Patient Tracking</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Patient Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterChip, !selectedPatient && styles.filterChipActive]}
            onPress={() => setSelectedPatient(null)}
          >
            <Text style={[styles.filterChipText, !selectedPatient && styles.filterChipTextActive]}>
              All Patients
            </Text>
          </TouchableOpacity>
          {patients.map(patient => (
            <TouchableOpacity
              key={patient.id}
              style={[styles.filterChip, selectedPatient === patient.id && styles.filterChipActive]}
              onPress={() => setSelectedPatient(patient.id)}
            >
              <Text style={[styles.filterChipText, selectedPatient === patient.id && styles.filterChipTextActive]}>
                {patient.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Summary Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="account-group" size={24} color={theme.colors.accent} />
            <Text style={styles.statValue}>{patients.length}</Text>
            <Text style={styles.statLabel}>Patients</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="clipboard-check" size={24} color={theme.colors.success} />
            <Text style={styles.statValue}>{filteredData.length}</Text>
            <Text style={styles.statLabel}>Entries</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
            <Text style={styles.statValue}>
              {filteredData.length > 0 ? Math.round(filteredData.filter(t => t.exercise_completed).length / filteredData.length * 100) : 0}%
            </Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
        </View>

        {/* No Patients Warning */}
        {patients.length === 0 && (
          <View style={styles.noPatientsBanner}>
            <Ionicons name="alert-circle" size={24} color={theme.colors.warning} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.noPatientsBannerTitle}>No Patients Found</Text>
              <Text style={styles.noPatientsBannerText}>Add patients to your account to start tracking their progress</Text>
            </View>
            <TouchableOpacity 
              style={styles.addPatientButton}
              onPress={() => router.push('/physio/add-patient')}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addPatientButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tracking Entries */}
        <Text style={styles.sectionTitle}>Daily Tracking Entries</Text>
        
        {filteredData.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No tracking data yet</Text>
            <Text style={styles.emptySubtext}>Patients will submit their daily tracking here</Text>
          </View>
        ) : (
          filteredData.map(entry => (
            <View key={entry.id} style={styles.entryCard}>
              {/* Header */}
              <View style={styles.entryHeader}>
                <View>
                  <Text style={styles.entryPatientName}>{entry.patient_name}</Text>
                  <Text style={styles.entryDate}>{entry.date}</Text>
                </View>
                <View style={[styles.exerciseBadge, { backgroundColor: entry.exercise_completed ? '#4CAF50' : '#f44336' }]}>
                  <Ionicons 
                    name={entry.exercise_completed ? 'checkmark' : 'close'} 
                    size={16} 
                    color={theme.colors.textPrimary} 
                  />
                  <Text style={styles.exerciseBadgeText}>
                    {entry.exercise_completed ? 'Done' : 'Missed'}
                  </Text>
                </View>
              </View>

              {/* Metrics Row */}
              <View style={styles.metricsRow}>
                {/* RPE */}
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>RPE</Text>
                  <View style={[styles.rpeCircle, { backgroundColor: RPE_COLORS[entry.rpe_score] }]}>
                    <Text style={styles.rpeText}>{entry.rpe_score}</Text>
                  </View>
                </View>

                {/* Pain */}
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Pain</Text>
                  <View style={[styles.painCircle, { 
                    backgroundColor: entry.pain_level === 0 ? '#4CAF50' : 
                      entry.pain_level <= 3 ? '#FFEB3B' : 
                      entry.pain_level <= 6 ? '#FF9800' : '#f44336' 
                  }]}>
                    <Text style={styles.painText}>{entry.pain_level}</Text>
                  </View>
                </View>

                {/* Sleep */}
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Sleep</Text>
                  <Text style={styles.metricValue}>{entry.sleep_quality}/10</Text>
                </View>

                {/* Energy */}
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Energy</Text>
                  <Text style={styles.metricValue}>{entry.energy_level}/10</Text>
                </View>

                {/* Mood */}
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Mood</Text>
                  <Ionicons 
                    name={getMoodIcon(entry.mood) as any} 
                    size={24} 
                    color={getMoodColor(entry.mood)} 
                  />
                </View>
              </View>

              {/* Pain Location */}
              {entry.pain_level > 0 && entry.pain_location && (
                <View style={styles.alertRow}>
                  <Ionicons name="alert-circle" size={18} color={theme.colors.warning} />
                  <Text style={styles.alertText}>Pain: {entry.pain_location}</Text>
                </View>
              )}

              {/* Reasons Not Done */}
              {!entry.exercise_completed && entry.not_done_reasons?.length > 0 && (
                <View style={styles.reasonsRow}>
                  <Text style={styles.reasonsLabel}>Reasons:</Text>
                  <View style={styles.reasonsChips}>
                    {entry.not_done_reasons.map((reason, idx) => (
                      <View key={idx} style={styles.reasonChip}>
                        <Text style={styles.reasonChipText}>{reason}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Notes */}
              {entry.notes && (
                <View style={styles.notesRow}>
                  <Ionicons name="document-text" size={16} color={theme.colors.textMuted} />
                  <Text style={styles.notesText}>{entry.notes}</Text>
                </View>
              )}
            </View>
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
    paddingBottom: theme.spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  filterContainer: {
    marginBottom: theme.spacing.md,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  filterChipText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  filterChipTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginHorizontal: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xxl,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  entryCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  entryPatientName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  entryDate: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  exerciseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  exerciseBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.sm,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  rpeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rpeText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: '#fff',
  },
  painCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  painText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: '#fff',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning + '20',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  alertText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.warning,
  },
  reasonsRow: {
    marginTop: theme.spacing.sm,
  },
  reasonsLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  reasonsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  reasonChip: {
    backgroundColor: theme.colors.error + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  reasonChipText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.error,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.sm,
  },
  notesText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  noPatientsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning + '20',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  noPatientsBannerTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.warning,
  },
  noPatientsBannerText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  addPatientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: 4,
  },
  addPatientButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
});
