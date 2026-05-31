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
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { theme } from '../../src/utils/theme';
import { 
  getUser, 
  getAssessments, 
  getLatestHealthMetrics, 
  getHealthTrends,
  createHealthMetrics 
} from '../../src/utils/api';
import { useStore } from '../../src/store/useStore';

interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface HealthMetrics {
  id: string;
  load_monitoring: number;
  resting_heart_rate: number;
  hydration_level: number;
  water_intake_liters: number;
  sleep_quality: number;
  sleep_duration_hours: number;
  protein_intake_grams: number;
  protein_target_grams: number;
  wellness_score: number;
  date: string;
}

interface HealthTrends {
  avg_load_monitoring: number | null;
  avg_resting_heart_rate: number | null;
  avg_hydration_level: number | null;
  avg_sleep_quality: number | null;
  avg_sleep_duration: number | null;
  avg_protein_intake: number | null;
  avg_wellness_score: number | null;
}

export default function PatientDetailScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const { currentUser } = useStore();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [latestMetrics, setLatestMetrics] = useState<HealthMetrics | null>(null);
  const [trends, setTrends] = useState<HealthTrends | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state for health metrics
  const [formData, setFormData] = useState({
    load_monitoring: 5,
    resting_heart_rate: 70,
    hydration_level: 7,
    water_intake_liters: 2.0,
    sleep_quality: 7,
    sleep_duration_hours: 7.0,
    protein_intake_grams: 100,
    protein_target_grams: 120,
    notes: '',
  });

  const fetchData = async () => {
    if (!patientId) return;
    
    try {
      const [patientRes, assessmentsRes, metricsRes, trendsRes] = await Promise.all([
        getUser(patientId),
        getAssessments({ patient_id: patientId }),
        getLatestHealthMetrics(patientId),
        getHealthTrends(patientId, 30),
      ]);
      
      setPatient(patientRes.data);
      setAssessments(assessmentsRes.data);
      if (metricsRes.data) {
        setLatestMetrics(metricsRes.data);
        // Pre-fill form with latest values
        setFormData({
          load_monitoring: metricsRes.data.load_monitoring || 5,
          resting_heart_rate: metricsRes.data.resting_heart_rate || 70,
          hydration_level: metricsRes.data.hydration_level || 7,
          water_intake_liters: metricsRes.data.water_intake_liters || 2.0,
          sleep_quality: metricsRes.data.sleep_quality || 7,
          sleep_duration_hours: metricsRes.data.sleep_duration_hours || 7.0,
          protein_intake_grams: metricsRes.data.protein_intake_grams || 100,
          protein_target_grams: metricsRes.data.protein_target_grams || 120,
          notes: '',
        });
      }
      if (trendsRes.data?.trends) {
        setTrends(trendsRes.data.trends);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const handleSaveMetrics = async () => {
    if (!patientId) return;
    
    setSaving(true);
    try {
      await createHealthMetrics({
        patient_id: patientId,
        recorded_by: currentUser?.id,
        ...formData,
      });
      Alert.alert('Success', 'Health metrics saved successfully');
      setShowMetricsModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving metrics:', error);
      Alert.alert('Error', 'Failed to save health metrics');
    } finally {
      setSaving(false);
    }
  };

  const getScoreColor = (score: number, max: number = 10) => {
    const percentage = (score / max) * 100;
    if (percentage >= 70) return theme.colors.success;
    if (percentage >= 40) return theme.colors.warning;
    return theme.colors.error;
  };

  const getWellnessColor = (score: number) => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.warning;
    return theme.colors.error;
  };

  const MetricCard = ({ 
    icon, 
    iconFamily = 'ionicons',
    title, 
    value, 
    unit, 
    color, 
    trend 
  }: { 
    icon: string; 
    iconFamily?: 'ionicons' | 'material';
    title: string; 
    value: string | number; 
    unit: string;
    color: string;
    trend?: number | null;
  }) => (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={styles.metricHeader}>
        {iconFamily === 'material' ? (
          <MaterialCommunityIcons name={icon as any} size={24} color={color} />
        ) : (
          <Ionicons name={icon as any} size={24} color={color} />
        )}
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <View style={styles.metricValueRow}>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
        <Text style={styles.metricUnit}>{unit}</Text>
      </View>
      {trend !== null && trend !== undefined && (
        <View style={styles.trendRow}>
          <Text style={styles.trendLabel}>30-day avg:</Text>
          <Text style={styles.trendValue}>{trend}</Text>
        </View>
      )}
    </View>
  );

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
        {/* Patient Header */}
        <View style={styles.patientHeader}>
          <View style={styles.patientAvatar}>
            <Ionicons name="person" size={40} color={theme.colors.accent} />
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{patient?.name}</Text>
            <Text style={styles.patientEmail}>{patient?.email}</Text>
            {patient?.phone && (
              <Text style={styles.patientPhone}>{patient.phone}</Text>
            )}
          </View>
        </View>

        {/* Wellness Score */}
        {latestMetrics && (
          <View style={[styles.wellnessCard, { borderColor: getWellnessColor(latestMetrics.wellness_score) }]}>
            <View style={styles.wellnessHeader}>
              <MaterialCommunityIcons name="heart-pulse" size={28} color={getWellnessColor(latestMetrics.wellness_score)} />
              <Text style={styles.wellnessTitle}>Overall Wellness</Text>
            </View>
            <View style={styles.wellnessScore}>
              <Text style={[styles.wellnessValue, { color: getWellnessColor(latestMetrics.wellness_score) }]}>
                {latestMetrics.wellness_score}%
              </Text>
              <Text style={styles.wellnessLabel}>
                Last updated: {new Date(latestMetrics.date).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}

        {/* Health Metrics Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Health Monitoring</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowMetricsModal(true)}>
            <Ionicons name="add-circle" size={24} color={theme.colors.accent} />
            <Text style={styles.addButtonText}>Record</Text>
          </TouchableOpacity>
        </View>

        {latestMetrics ? (
          <View style={styles.metricsGrid}>
            <MetricCard
              icon="barbell"
              title="Load Monitoring"
              value={latestMetrics.load_monitoring}
              unit="/10 RPE"
              color={getScoreColor(10 - Math.abs(latestMetrics.load_monitoring - 5) * 2)}
              trend={trends?.avg_load_monitoring}
            />
            <MetricCard
              icon="heart"
              title="Heart Rate"
              value={latestMetrics.resting_heart_rate}
              unit="bpm"
              color={latestMetrics.resting_heart_rate >= 60 && latestMetrics.resting_heart_rate <= 80 
                ? theme.colors.success 
                : theme.colors.warning}
              trend={trends?.avg_resting_heart_rate}
            />
            <MetricCard
              icon="water"
              title="Hydration"
              value={latestMetrics.hydration_level}
              unit={`/10 (${latestMetrics.water_intake_liters}L)`}
              color={getScoreColor(latestMetrics.hydration_level)}
              trend={trends?.avg_hydration_level}
            />
            <MetricCard
              icon="moon"
              title="Sleep Quality"
              value={latestMetrics.sleep_quality}
              unit={`/10 (${latestMetrics.sleep_duration_hours}h)`}
              color={getScoreColor(latestMetrics.sleep_quality)}
              trend={trends?.avg_sleep_quality}
            />
            <MetricCard
              icon="food-drumstick"
              iconFamily="material"
              title="Protein Intake"
              value={latestMetrics.protein_intake_grams}
              unit={`g / ${latestMetrics.protein_target_grams}g`}
              color={latestMetrics.protein_intake_grams >= latestMetrics.protein_target_grams * 0.8 
                ? theme.colors.success 
                : theme.colors.warning}
              trend={trends?.avg_protein_intake}
            />
          </View>
        ) : (
          <View style={styles.emptyMetrics}>
            <MaterialCommunityIcons name="chart-line" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No health metrics recorded</Text>
            <TouchableOpacity style={styles.recordButton} onPress={() => setShowMetricsModal(true)}>
              <Text style={styles.recordButtonText}>Record First Entry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Assessments Summary */}
        <Text style={styles.sectionTitle}>Assessments ({assessments.length})</Text>
        {assessments.slice(0, 3).map((assessment) => (
          <TouchableOpacity
            key={assessment.id}
            style={styles.assessmentCard}
            onPress={() => router.push(`/assessment/result?id=${assessment.id}`)}
          >
            <View style={styles.assessmentInfo}>
              <Text style={styles.assessmentType}>
                {assessment.assessment_type.toUpperCase()}
              </Text>
              <Text style={styles.assessmentDate}>
                {new Date(assessment.created_at).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.assessmentScore}>
              <Text style={[styles.scoreText, { color: getScoreColor(assessment.percentage, 100) }]}>
                {assessment.percentage}%
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
            </View>
          </TouchableOpacity>
        ))}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/assessment/posture')}
          >
            <MaterialCommunityIcons name="human" size={28} color={theme.colors.accent} />
            <Text style={styles.actionText}>New Assessment</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/physio/create-prescription')}
          >
            <Ionicons name="document-text" size={28} color={theme.colors.success} />
            <Text style={styles.actionText}>Prescription</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Health Metrics Entry Modal */}
      <Modal
        visible={showMetricsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMetricsModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Health Metrics</Text>
              <TouchableOpacity onPress={() => setShowMetricsModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Load Monitoring */}
              <View style={styles.inputGroup}>
                <View style={styles.inputHeader}>
                  <Ionicons name="barbell" size={20} color={theme.colors.accent} />
                  <Text style={styles.inputLabel}>Load Monitoring (RPE)</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={10}
                  step={1}
                  value={formData.load_monitoring}
                  onValueChange={(v) => setFormData({...formData, load_monitoring: v})}
                  minimumTrackTintColor={theme.colors.accent}
                  maximumTrackTintColor={theme.colors.cardBorder}
                  thumbTintColor={theme.colors.accent}
                />
                <Text style={styles.sliderValue}>{formData.load_monitoring}/10</Text>
              </View>

              {/* Heart Rate */}
              <View style={styles.inputGroup}>
                <View style={styles.inputHeader}>
                  <Ionicons name="heart" size={20} color={theme.colors.error} />
                  <Text style={styles.inputLabel}>Resting Heart Rate (bpm)</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  value={String(formData.resting_heart_rate)}
                  onChangeText={(v) => setFormData({...formData, resting_heart_rate: parseInt(v) || 70})}
                  keyboardType="numeric"
                  placeholder="70"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              {/* Hydration */}
              <View style={styles.inputGroup}>
                <View style={styles.inputHeader}>
                  <Ionicons name="water" size={20} color={theme.colors.info} />
                  <Text style={styles.inputLabel}>Hydration Level</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={10}
                  step={1}
                  value={formData.hydration_level}
                  onValueChange={(v) => setFormData({...formData, hydration_level: v})}
                  minimumTrackTintColor={theme.colors.info}
                  maximumTrackTintColor={theme.colors.cardBorder}
                  thumbTintColor={theme.colors.info}
                />
                <Text style={styles.sliderValue}>{formData.hydration_level}/10</Text>
                <TextInput
                  style={[styles.textInput, styles.smallInput]}
                  value={String(formData.water_intake_liters)}
                  onChangeText={(v) => setFormData({...formData, water_intake_liters: parseFloat(v) || 2.0})}
                  keyboardType="decimal-pad"
                  placeholder="Water intake (L)"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              {/* Sleep */}
              <View style={styles.inputGroup}>
                <View style={styles.inputHeader}>
                  <Ionicons name="moon" size={20} color={theme.colors.warning} />
                  <Text style={styles.inputLabel}>Sleep Quality</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={10}
                  step={1}
                  value={formData.sleep_quality}
                  onValueChange={(v) => setFormData({...formData, sleep_quality: v})}
                  minimumTrackTintColor={theme.colors.warning}
                  maximumTrackTintColor={theme.colors.cardBorder}
                  thumbTintColor={theme.colors.warning}
                />
                <Text style={styles.sliderValue}>{formData.sleep_quality}/10</Text>
                <TextInput
                  style={[styles.textInput, styles.smallInput]}
                  value={String(formData.sleep_duration_hours)}
                  onChangeText={(v) => setFormData({...formData, sleep_duration_hours: parseFloat(v) || 7.0})}
                  keyboardType="decimal-pad"
                  placeholder="Sleep duration (hours)"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              {/* Protein Intake */}
              <View style={styles.inputGroup}>
                <View style={styles.inputHeader}>
                  <MaterialCommunityIcons name="food-drumstick" size={20} color={theme.colors.success} />
                  <Text style={styles.inputLabel}>Protein Intake</Text>
                </View>
                <View style={styles.proteinRow}>
                  <View style={styles.proteinInput}>
                    <Text style={styles.proteinLabel}>Intake (g)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={String(formData.protein_intake_grams)}
                      onChangeText={(v) => setFormData({...formData, protein_intake_grams: parseFloat(v) || 100})}
                      keyboardType="numeric"
                      placeholder="100"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>
                  <View style={styles.proteinInput}>
                    <Text style={styles.proteinLabel}>Target (g)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={String(formData.protein_target_grams)}
                      onChangeText={(v) => setFormData({...formData, protein_target_grams: parseFloat(v) || 120})}
                      keyboardType="numeric"
                      placeholder="120"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>
                </View>
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <View style={styles.inputHeader}>
                  <Ionicons name="document-text" size={20} color={theme.colors.textSecondary} />
                  <Text style={styles.inputLabel}>Notes</Text>
                </View>
                <TextInput
                  style={[styles.textInput, styles.notesInput]}
                  value={formData.notes}
                  onChangeText={(v) => setFormData({...formData, notes: v})}
                  placeholder="Additional notes..."
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setShowMetricsModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleSaveMetrics}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={theme.colors.textPrimary} />
                ) : (
                  <Text style={styles.saveButtonText}>Save Metrics</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingBottom: theme.spacing.xxl,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  patientAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  patientName: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  patientEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  patientPhone: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    marginTop: theme.spacing.xs,
  },
  wellnessCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
  },
  wellnessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  wellnessTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  wellnessScore: {
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  wellnessValue: {
    fontSize: 48,
    fontWeight: theme.fontWeight.bold,
  },
  wellnessLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
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
    marginBottom: theme.spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  addButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.semibold,
  },
  metricsGrid: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  metricCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  metricTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.xs,
  },
  metricValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
  },
  metricUnit: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  trendLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  trendValue: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.semibold,
  },
  emptyMetrics: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  recordButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  recordButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  assessmentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  assessmentInfo: {
    flex: 1,
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
  assessmentScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  scoreText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  actionText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  modalBody: {
    padding: theme.spacing.lg,
    maxHeight: 500,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  inputLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  smallInput: {
    marginTop: theme.spacing.sm,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  proteinRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  proteinInput: {
    flex: 1,
  },
  proteinLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  cancelButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  saveButton: {
    flex: 2,
    backgroundColor: theme.colors.accent,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
});
