import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { createAssessment, getUsers } from '../../src/utils/api';
import { useStore, User } from '../../src/store/useStore';

interface ScoreItem {
  key: string;
  label: string;
  description: string;
}

const POSTURE_ITEMS: ScoreItem[] = [
  { key: 'head_alignment', label: 'Head Alignment', description: 'Forward head position assessment' },
  { key: 'shoulder_level', label: 'Shoulder Level', description: 'Shoulder symmetry and position' },
  { key: 'spine_curvature', label: 'Spine Curvature', description: 'Natural spine alignment' },
  { key: 'hip_level', label: 'Hip Level', description: 'Pelvic tilt and symmetry' },
  { key: 'knee_alignment', label: 'Knee Alignment', description: 'Knee valgus/varus assessment' },
  { key: 'overall_balance', label: 'Overall Balance', description: 'General posture balance' },
];

export default function PostureAssessment() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<User[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [showPatientSelector, setShowPatientSelector] = useState(false);

  const isPhysio = currentUser?.role === 'physio';

  useEffect(() => {
    if (isPhysio && currentUser) {
      // Fetch patients for physio
      const fetchPatients = async () => {
        try {
          const response = await getUsers('patient');
          setPatients(response.data);
        } catch (error) {
          console.error('Error fetching patients:', error);
        }
      };
      fetchPatients();
    } else if (currentUser) {
      setSelectedPatient(currentUser.id);
    }
  }, [currentUser]);

  const handleScoreChange = (key: string, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  };

  const calculateTotalScore = () => {
    return Object.values(scores).reduce((sum, val) => sum + val, 0);
  };

  const handleSubmit = async () => {
    if (!selectedPatient) {
      Alert.alert('Error', 'Please select a patient');
      return;
    }

    // Check if all scores are filled
    const missingScores = POSTURE_ITEMS.filter((item) => scores[item.key] === undefined);
    if (missingScores.length > 0) {
      Alert.alert('Error', 'Please fill in all assessment scores');
      return;
    }

    setLoading(true);
    try {
      const response = await createAssessment({
        patient_id: selectedPatient,
        physio_id: isPhysio ? currentUser?.id : undefined,
        assessment_type: 'posture',
        data: { ...scores, notes },
      });

      Alert.alert('Success', 'Posture assessment saved!', [
        {
          text: 'View Result',
          onPress: () => router.replace(`/assessment/result?id=${response.data.id}`),
        },
      ]);
    } catch (error) {
      console.error('Error saving assessment:', error);
      Alert.alert('Error', 'Failed to save assessment');
    } finally {
      setLoading(false);
    }
  };

  const ScoreSelector = ({ item }: { item: ScoreItem }) => {
    const currentScore = scores[item.key];

    return (
      <View style={styles.scoreCard}>
        <View style={styles.scoreHeader}>
          <Text style={styles.scoreLabel}>{item.label}</Text>
          <Text style={styles.scoreValue}>
            {currentScore !== undefined ? currentScore : '-'}/10
          </Text>
        </View>
        <Text style={styles.scoreDescription}>{item.description}</Text>
        <View style={styles.scoreButtons}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.scoreButton,
                currentScore === num && styles.scoreButtonActive,
                num <= 3 && styles.scoreButtonLow,
                num >= 4 && num <= 6 && styles.scoreButtonMid,
                num >= 7 && styles.scoreButtonHigh,
                currentScore === num && num <= 3 && styles.scoreButtonLowActive,
                currentScore === num && num >= 4 && num <= 6 && styles.scoreButtonMidActive,
                currentScore === num && num >= 7 && styles.scoreButtonHighActive,
              ]}
              onPress={() => handleScoreChange(item.key, num)}
            >
              <Text
                style={[
                  styles.scoreButtonText,
                  currentScore === num && styles.scoreButtonTextActive,
                ]}
              >
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="human" size={48} color={theme.colors.accent} />
          <Text style={styles.title}>Posture Assessment</Text>
          <Text style={styles.subtitle}>Rate each metric from 0 (poor) to 10 (excellent)</Text>
        </View>

        {/* Patient Selector for Physio */}
        {isPhysio && (
          <View style={styles.patientSection}>
            <Text style={styles.sectionTitle}>Select Patient</Text>
            <TouchableOpacity
              style={styles.patientSelector}
              onPress={() => setShowPatientSelector(!showPatientSelector)}
            >
              <Ionicons name="person" size={20} color={theme.colors.accent} />
              <Text style={styles.patientSelectorText}>
                {selectedPatient
                  ? patients.find((p) => p.id === selectedPatient)?.name || 'Select Patient'
                  : 'Select Patient'}
              </Text>
              <Ionicons
                name={showPatientSelector ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
            {showPatientSelector && (
              <View style={styles.patientList}>
                {patients.map((patient) => (
                  <TouchableOpacity
                    key={patient.id}
                    style={[
                      styles.patientOption,
                      selectedPatient === patient.id && styles.patientOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedPatient(patient.id);
                      setShowPatientSelector(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.patientOptionText,
                        selectedPatient === patient.id && styles.patientOptionTextSelected,
                      ]}
                    >
                      {patient.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Score Items */}
        {POSTURE_ITEMS.map((item) => (
          <ScoreSelector key={item.key} item={item} />
        ))}

        {/* Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any additional observations..."
            placeholderTextColor={theme.colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Assessment Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Score</Text>
            <Text style={styles.summaryValue}>{calculateTotalScore()}/60</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Percentage</Text>
            <Text style={styles.summaryValue}>
              {((calculateTotalScore() / 60) * 100).toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.textPrimary} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.textPrimary} />
              <Text style={styles.submitButtonText}>Save Assessment</Text>
            </>
          )}
        </TouchableOpacity>
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
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  patientSection: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  patientSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    gap: theme.spacing.sm,
  },
  patientSelectorText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  patientList: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    overflow: 'hidden',
  },
  patientOption: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  patientOptionSelected: {
    backgroundColor: theme.colors.accent + '20',
  },
  patientOptionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  patientOptionTextSelected: {
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.semibold,
  },
  scoreCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  scoreLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  scoreValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
  },
  scoreDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  scoreButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  scoreButton: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreButtonActive: {
    backgroundColor: theme.colors.accent,
  },
  scoreButtonLow: {
    borderWidth: 1,
    borderColor: theme.colors.error + '30',
  },
  scoreButtonMid: {
    borderWidth: 1,
    borderColor: theme.colors.warning + '30',
  },
  scoreButtonHigh: {
    borderWidth: 1,
    borderColor: theme.colors.success + '30',
  },
  scoreButtonLowActive: {
    backgroundColor: theme.colors.error,
  },
  scoreButtonMidActive: {
    backgroundColor: theme.colors.warning,
  },
  scoreButtonHighActive: {
    backgroundColor: theme.colors.success,
  },
  scoreButtonText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  scoreButtonTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  notesSection: {
    marginBottom: theme.spacing.lg,
  },
  notesInput: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  summaryCard: {
    backgroundColor: theme.colors.accent + '20',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.accent + '40',
  },
  summaryTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  summaryLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
});
