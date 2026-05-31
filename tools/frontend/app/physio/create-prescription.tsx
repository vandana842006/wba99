import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { getPhysioPatients, getExercises, createPrescription } from '../../src/utils/api';
import { useStore, User, Exercise } from '../../src/store/useStore';

interface SelectedExercise {
  exercise: Exercise;
  custom_sets?: number;
  custom_reps?: number;
  custom_hold_seconds?: number;
  custom_rest_seconds?: number;
  custom_frequency_per_day?: number;
  custom_frequency_per_week?: number;
  custom_intensity?: string;
  custom_notes: string;
  order: number;
}

export default function CreatePrescriptionScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  // Form State
  const [title, setTitle] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [goals, setGoals] = useState<string[]>(['']);
  const [totalDurationWeeks, setTotalDurationWeeks] = useState('4');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [precautions, setPrecautions] = useState<string[]>(['']);
  
  // Patient Selection
  const [patients, setPatients] = useState<User[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  
  // Exercise Selection
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      try {
        const [patientsRes, exercisesRes] = await Promise.all([
          getPhysioPatients(currentUser.id),
          getExercises(),
        ]);
        setPatients(patientsRes.data);
        setExercises(exercisesRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  const handleAddGoal = () => {
    setGoals([...goals, '']);
  };

  const handleRemoveGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const handleGoalChange = (index: number, value: string) => {
    const newGoals = [...goals];
    newGoals[index] = value;
    setGoals(newGoals);
  };

  const handleAddPrecaution = () => {
    setPrecautions([...precautions, '']);
  };

  const handleRemovePrecaution = (index: number) => {
    setPrecautions(precautions.filter((_, i) => i !== index));
  };

  const handlePrecautionChange = (index: number, value: string) => {
    const newPrecautions = [...precautions];
    newPrecautions[index] = value;
    setPrecautions(newPrecautions);
  };

  const handleAddExercise = (exercise: Exercise) => {
    const newSelected: SelectedExercise = {
      exercise,
      custom_notes: '',
      order: selectedExercises.length,
    };
    setSelectedExercises([...selectedExercises, newSelected]);
    setShowExerciseSelector(false);
  };

  const handleRemoveExercise = (index: number) => {
    setSelectedExercises(selectedExercises.filter((_, i) => i !== index));
  };

  const handleExerciseParamChange = (index: number, field: string, value: any) => {
    const newSelected = [...selectedExercises];
    (newSelected[index] as any)[field] = value;
    setSelectedExercises(newSelected);
  };

  const filteredExercises = categoryFilter
    ? exercises.filter(e => e.category === categoryFilter)
    : exercises;

  const handleSubmit = async () => {
    if (!selectedPatient) {
      Alert.alert('Error', 'Please select a patient');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a prescription title');
      return;
    }
    if (selectedExercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }

    setSubmitting(true);
    try {
      await createPrescription({
        patient_id: selectedPatient,
        physio_id: currentUser!.id,
        title: title.trim(),
        diagnosis: diagnosis.trim(),
        goals: goals.filter(g => g.trim()),
        exercises: selectedExercises.map((se, index) => ({
          exercise_id: se.exercise.id,
          custom_sets: se.custom_sets,
          custom_reps: se.custom_reps,
          custom_hold_seconds: se.custom_hold_seconds,
          custom_rest_seconds: se.custom_rest_seconds,
          custom_frequency_per_day: se.custom_frequency_per_day,
          custom_frequency_per_week: se.custom_frequency_per_week,
          custom_intensity: se.custom_intensity,
          custom_notes: se.custom_notes,
          order: index,
        })),
        total_duration_weeks: parseInt(totalDurationWeeks) || 4,
        special_instructions: specialInstructions.trim(),
        precautions: precautions.filter(p => p.trim()),
      });

      Alert.alert('Success', 'Exercise prescription created successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error creating prescription:', error);
      Alert.alert('Error', 'Failed to create prescription');
    } finally {
      setSubmitting(false);
    }
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.pageTitle}>Create Exercise Prescription</Text>

          {/* Patient Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Patient *</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowPatientSelector(!showPatientSelector)}
            >
              <Ionicons name="person" size={20} color={theme.colors.accent} />
              <Text style={styles.selectorText}>
                {selectedPatient
                  ? patients.find(p => p.id === selectedPatient)?.name || 'Select Patient'
                  : 'Select Patient'}
              </Text>
              <Ionicons
                name={showPatientSelector ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
            {showPatientSelector && (
              <View style={styles.selectorList}>
                {patients.map(patient => (
                  <TouchableOpacity
                    key={patient.id}
                    style={[
                      styles.selectorOption,
                      selectedPatient === patient.id && styles.selectorOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedPatient(patient.id);
                      setShowPatientSelector(false);
                    }}
                  >
                    <Text style={[
                      styles.selectorOptionText,
                      selectedPatient === patient.id && styles.selectorOptionTextSelected,
                    ]}>
                      {patient.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prescription Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Posture Correction Program"
              placeholderTextColor={theme.colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Diagnosis */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Diagnosis / Condition</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Upper Crossed Syndrome"
              placeholderTextColor={theme.colors.textMuted}
              value={diagnosis}
              onChangeText={setDiagnosis}
            />
          </View>

          {/* Goals */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Treatment Goals</Text>
            {goals.map((goal, index) => (
              <View key={index} style={styles.listItemRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder={`Goal ${index + 1}`}
                  placeholderTextColor={theme.colors.textMuted}
                  value={goal}
                  onChangeText={(text) => handleGoalChange(index, text)}
                />
                {goals.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveGoal(index)}
                  >
                    <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={handleAddGoal}>
              <Ionicons name="add" size={20} color={theme.colors.accent} />
              <Text style={styles.addButtonText}>Add Goal</Text>
            </TouchableOpacity>
          </View>

          {/* Duration */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Program Duration (Weeks)</Text>
            <View style={styles.durationRow}>
              {['2', '4', '6', '8', '12'].map(weeks => (
                <TouchableOpacity
                  key={weeks}
                  style={[
                    styles.durationButton,
                    totalDurationWeeks === weeks && styles.durationButtonActive,
                  ]}
                  onPress={() => setTotalDurationWeeks(weeks)}
                >
                  <Text style={[
                    styles.durationButtonText,
                    totalDurationWeeks === weeks && styles.durationButtonTextActive,
                  ]}>
                    {weeks}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Exercises */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exercises *</Text>
            
            {selectedExercises.map((se, index) => (
              <View key={index} style={styles.selectedExerciseCard}>
                <View style={styles.exerciseCardHeader}>
                  <Text style={styles.exerciseCardTitle}>{se.exercise.name}</Text>
                  <View style={styles.exerciseCardActions}>
                    <TouchableOpacity
                      onPress={() => setEditingExercise(editingExercise === index ? null : index)}
                    >
                      <Ionicons
                        name={editingExercise === index ? 'chevron-up' : 'settings'}
                        size={20}
                        color={theme.colors.accent}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleRemoveExercise(index)}>
                      <Ionicons name="trash" size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <Text style={styles.exerciseCardCategory}>{se.exercise.category.toUpperCase()}</Text>
                <Text style={styles.exerciseCardDesc}>{se.exercise.description}</Text>
                
                {/* Default Values */}
                <View style={styles.exerciseDefaults}>
                  <Text style={styles.exerciseDefaultText}>
                    Default: {se.exercise.sets || 3} sets × {se.exercise.reps || 10} reps
                    {se.exercise.hold_seconds ? ` × ${se.exercise.hold_seconds}s hold` : ''}
                  </Text>
                  <Text style={styles.exerciseDefaultText}>
                    {se.exercise.frequency_per_day || 1}x/day, {se.exercise.frequency_per_week || 3}x/week
                  </Text>
                </View>

                {/* Custom Parameters (Expandable) */}
                {editingExercise === index && (
                  <View style={styles.customParams}>
                    <Text style={styles.customParamsTitle}>Customize Parameters</Text>
                    
                    <View style={styles.paramRow}>
                      <View style={styles.paramItem}>
                        <Text style={styles.paramLabel}>Sets</Text>
                        <TextInput
                          style={styles.paramInput}
                          placeholder={String(se.exercise.sets || 3)}
                          placeholderTextColor={theme.colors.textMuted}
                          keyboardType="numeric"
                          value={se.custom_sets?.toString() || ''}
                          onChangeText={(v) => handleExerciseParamChange(index, 'custom_sets', v ? parseInt(v) : undefined)}
                        />
                      </View>
                      <View style={styles.paramItem}>
                        <Text style={styles.paramLabel}>Reps</Text>
                        <TextInput
                          style={styles.paramInput}
                          placeholder={String(se.exercise.reps || 10)}
                          placeholderTextColor={theme.colors.textMuted}
                          keyboardType="numeric"
                          value={se.custom_reps?.toString() || ''}
                          onChangeText={(v) => handleExerciseParamChange(index, 'custom_reps', v ? parseInt(v) : undefined)}
                        />
                      </View>
                      <View style={styles.paramItem}>
                        <Text style={styles.paramLabel}>Hold (s)</Text>
                        <TextInput
                          style={styles.paramInput}
                          placeholder={String(se.exercise.hold_seconds || 0)}
                          placeholderTextColor={theme.colors.textMuted}
                          keyboardType="numeric"
                          value={se.custom_hold_seconds?.toString() || ''}
                          onChangeText={(v) => handleExerciseParamChange(index, 'custom_hold_seconds', v ? parseInt(v) : undefined)}
                        />
                      </View>
                      <View style={styles.paramItem}>
                        <Text style={styles.paramLabel}>Rest (s)</Text>
                        <TextInput
                          style={styles.paramInput}
                          placeholder={String(se.exercise.rest_seconds || 30)}
                          placeholderTextColor={theme.colors.textMuted}
                          keyboardType="numeric"
                          value={se.custom_rest_seconds?.toString() || ''}
                          onChangeText={(v) => handleExerciseParamChange(index, 'custom_rest_seconds', v ? parseInt(v) : undefined)}
                        />
                      </View>
                    </View>

                    <View style={styles.paramRow}>
                      <View style={styles.paramItem}>
                        <Text style={styles.paramLabel}>Per Day</Text>
                        <TextInput
                          style={styles.paramInput}
                          placeholder={String(se.exercise.frequency_per_day || 1)}
                          placeholderTextColor={theme.colors.textMuted}
                          keyboardType="numeric"
                          value={se.custom_frequency_per_day?.toString() || ''}
                          onChangeText={(v) => handleExerciseParamChange(index, 'custom_frequency_per_day', v ? parseInt(v) : undefined)}
                        />
                      </View>
                      <View style={styles.paramItem}>
                        <Text style={styles.paramLabel}>Per Week</Text>
                        <TextInput
                          style={styles.paramInput}
                          placeholder={String(se.exercise.frequency_per_week || 3)}
                          placeholderTextColor={theme.colors.textMuted}
                          keyboardType="numeric"
                          value={se.custom_frequency_per_week?.toString() || ''}
                          onChangeText={(v) => handleExerciseParamChange(index, 'custom_frequency_per_week', v ? parseInt(v) : undefined)}
                        />
                      </View>
                    </View>

                    <Text style={styles.paramLabel}>Intensity</Text>
                    <View style={styles.intensityRow}>
                      {['low', 'moderate', 'high'].map(level => (
                        <TouchableOpacity
                          key={level}
                          style={[
                            styles.intensityButton,
                            (se.custom_intensity || se.exercise.intensity) === level && styles.intensityButtonActive,
                          ]}
                          onPress={() => handleExerciseParamChange(index, 'custom_intensity', level)}
                        >
                          <Text style={[
                            styles.intensityButtonText,
                            (se.custom_intensity || se.exercise.intensity) === level && styles.intensityButtonTextActive,
                          ]}>
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.paramLabel}>Custom Notes</Text>
                    <TextInput
                      style={[styles.input, { minHeight: 60 }]}
                      placeholder="Add specific instructions for this patient..."
                      placeholderTextColor={theme.colors.textMuted}
                      multiline
                      value={se.custom_notes}
                      onChangeText={(v) => handleExerciseParamChange(index, 'custom_notes', v)}
                    />
                  </View>
                )}
              </View>
            ))}

            {/* Add Exercise Button */}
            <TouchableOpacity
              style={styles.addExerciseButton}
              onPress={() => setShowExerciseSelector(true)}
            >
              <Ionicons name="add-circle" size={24} color={theme.colors.accent} />
              <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
            </TouchableOpacity>

            {/* Exercise Selector Modal */}
            {showExerciseSelector && (
              <View style={styles.exerciseSelector}>
                <View style={styles.exerciseSelectorHeader}>
                  <Text style={styles.exerciseSelectorTitle}>Select Exercise</Text>
                  <TouchableOpacity onPress={() => setShowExerciseSelector(false)}>
                    <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Category Filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  <TouchableOpacity
                    style={[styles.categoryChip, !categoryFilter && styles.categoryChipActive]}
                    onPress={() => setCategoryFilter(null)}
                  >
                    <Text style={[styles.categoryChipText, !categoryFilter && styles.categoryChipTextActive]}>All</Text>
                  </TouchableOpacity>
                  {['posture', 'walking', 'running', 'msk'].map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryChip, categoryFilter === cat && styles.categoryChipActive]}
                      onPress={() => setCategoryFilter(cat)}
                    >
                      <Text style={[styles.categoryChipText, categoryFilter === cat && styles.categoryChipTextActive]}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Exercise List */}
                <ScrollView style={styles.exerciseList}>
                  {filteredExercises.map(exercise => {
                    const isSelected = selectedExercises.some(se => se.exercise.id === exercise.id);
                    return (
                      <TouchableOpacity
                        key={exercise.id}
                        style={[styles.exerciseOption, isSelected && styles.exerciseOptionDisabled]}
                        onPress={() => !isSelected && handleAddExercise(exercise)}
                        disabled={isSelected}
                      >
                        <View style={styles.exerciseOptionContent}>
                          <Text style={styles.exerciseOptionName}>{exercise.name}</Text>
                          <Text style={styles.exerciseOptionCategory}>{exercise.category}</Text>
                          <Text style={styles.exerciseOptionDesc} numberOfLines={2}>
                            {exercise.description}
                          </Text>
                        </View>
                        {isSelected ? (
                          <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
                        ) : (
                          <Ionicons name="add-circle-outline" size={24} color={theme.colors.accent} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Special Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Instructions</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              placeholder="Any additional instructions for the patient..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              value={specialInstructions}
              onChangeText={setSpecialInstructions}
            />
          </View>

          {/* Precautions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Precautions</Text>
            {precautions.map((precaution, index) => (
              <View key={index} style={styles.listItemRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder={`Precaution ${index + 1}`}
                  placeholderTextColor={theme.colors.textMuted}
                  value={precaution}
                  onChangeText={(text) => handlePrecautionChange(index, text)}
                />
                {precautions.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemovePrecaution(index)}
                  >
                    <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={handleAddPrecaution}>
              <Ionicons name="add" size={20} color={theme.colors.accent} />
              <Text style={styles.addButtonText}>Add Precaution</Text>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={theme.colors.textPrimary} />
            ) : (
              <>
                <Ionicons name="document-text" size={24} color={theme.colors.textPrimary} />
                <Text style={styles.submitButtonText}>Create Prescription</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  keyboardView: {
    flex: 1,
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
  pageTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    gap: theme.spacing.sm,
  },
  selectorText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  selectorList: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    maxHeight: 200,
  },
  selectorOption: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  selectorOptionSelected: {
    backgroundColor: theme.colors.accent + '20',
  },
  selectorOptionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  selectorOptionTextSelected: {
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.semibold,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  removeButton: {
    padding: theme.spacing.xs,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  addButtonText: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  durationRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  durationButton: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  durationButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accentLight,
  },
  durationButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.semibold,
  },
  durationButtonTextActive: {
    color: theme.colors.textPrimary,
  },
  selectedExerciseCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  exerciseCardTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  exerciseCardActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  exerciseCardCategory: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.accent,
    marginBottom: theme.spacing.xs,
  },
  exerciseCardDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  exerciseDefaults: {
    backgroundColor: theme.colors.primaryLight,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  exerciseDefaultText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  customParams: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  customParamsTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.accent,
    marginBottom: theme.spacing.md,
  },
  paramRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  paramItem: {
    flex: 1,
  },
  paramLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  paramInput: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },
  intensityRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  intensityButton: {
    flex: 1,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  intensityButtonActive: {
    backgroundColor: theme.colors.accent,
  },
  intensityButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  intensityButtonTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.semibold,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderStyle: 'dashed',
    gap: theme.spacing.sm,
  },
  addExerciseButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.semibold,
  },
  exerciseSelector: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    maxHeight: 400,
  },
  exerciseSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  exerciseSelectorTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  categoryScroll: {
    padding: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  categoryChip: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryLight,
    marginRight: theme.spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.accent,
  },
  categoryChipText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  categoryChipTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.semibold,
  },
  exerciseList: {
    maxHeight: 250,
  },
  exerciseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  exerciseOptionDisabled: {
    opacity: 0.5,
  },
  exerciseOptionContent: {
    flex: 1,
  },
  exerciseOptionName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  exerciseOptionCategory: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.accent,
    marginTop: theme.spacing.xs,
  },
  exerciseOptionDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
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
