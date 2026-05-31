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
import { getPhysioPatients, getAssessments } from '../../src/utils/api';
import { useStore, User, Assessment } from '../../src/store/useStore';

export default function PhysioPatientsScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [patients, setPatients] = useState<User[]>([]);
  const [patientAssessments, setPatientAssessments] = useState<Record<string, Assessment[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!currentUser) return;
    
    try {
      const patientsRes = await getPhysioPatients(currentUser.id);
      setPatients(patientsRes.data);
      
      // Fetch assessments for each patient
      const assessmentsMap: Record<string, Assessment[]> = {};
      for (const patient of patientsRes.data) {
        const assessmentsRes = await getAssessments({ patient_id: patient.id });
        assessmentsMap[patient.id] = assessmentsRes.data;
      }
      setPatientAssessments(assessmentsMap);
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

  const getAverageScore = (patientId: string) => {
    const assessments = patientAssessments[patientId] || [];
    if (assessments.length === 0) return null;
    const avg = assessments.reduce((sum, a) => sum + a.percentage, 0) / assessments.length;
    return avg.toFixed(1);
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
      >
        <Text style={styles.countText}>{patients.length} patients assigned to you</Text>

        {patients.map((patient) => {
          const avgScore = getAverageScore(patient.id);
          const assessmentCount = patientAssessments[patient.id]?.length || 0;
          
          return (
            <TouchableOpacity
              key={patient.id}
              style={styles.patientCard}
              onPress={() => router.push(`/physio/patient-detail?patientId=${patient.id}`)}
            >
              <View style={styles.patientAvatar}>
                <Ionicons name="person" size={32} color={theme.colors.accent} />
              </View>
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{patient.name}</Text>
                <Text style={styles.patientEmail}>{patient.email}</Text>
                <View style={styles.patientStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="clipboard" size={14} color={theme.colors.textMuted} />
                    <Text style={styles.statText}>{assessmentCount} assessments</Text>
                  </View>
                  {avgScore && (
                    <View style={styles.statItem}>
                      <Ionicons name="analytics" size={14} color={theme.colors.success} />
                      <Text style={[styles.statText, { color: theme.colors.success }]}>
                        Avg: {avgScore}%
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color={theme.colors.textMuted} />
            </TouchableOpacity>
          );
        })}

        {patients.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No Patients Assigned</Text>
            <Text style={styles.emptyText}>Add patients to your account to start managing their progress</Text>
            <TouchableOpacity 
              style={styles.addPatientBtn}
              onPress={() => router.push('/physio/add-patient')}
            >
              <Ionicons name="person-add" size={20} color="#fff" />
              <Text style={styles.addPatientBtnText}>Add Patient</Text>
            </TouchableOpacity>
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
  scrollContent: {
    padding: theme.spacing.md,
  },
  countText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  patientCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  patientAvatar: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  patientName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  patientEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  patientStats: {
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
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
  addPatientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  addPatientBtnText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
});
