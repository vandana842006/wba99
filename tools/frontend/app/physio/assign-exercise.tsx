import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { getPhysioPatients, getExercises, assignExercise } from '../../src/utils/api';
import { useStore, User, Exercise } from '../../src/store/useStore';

export default function AssignExerciseScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [patients, setPatients] = useState<User[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

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

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const handleAssign = async () => {
    if (!selectedPatient || !selectedExercise || !currentUser) {
      Alert.alert('Error', 'Please select a patient and an exercise');
      return;
    }

    setSubmitting(true);
    try {
      await assignExercise({
        patient_id: selectedPatient,
        exercise_id: selectedExercise,
        physio_id: currentUser.id,
        notes: notes || undefined,
      });
      Alert.alert('Success', 'Exercise assigned successfully!');
      router.back();
    } catch (error) {
      console.error('Error assigning exercise:', error);
      Alert.alert('Error', 'Failed to assign exercise');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredExercises = categoryFilter
    ? exercises.filter(e => e.category === categoryFilter)
    : exercises;

  const categories = ['posture', 'walking', 'running', 'msk'];

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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Select Patient */}
        <Text style={styles.sectionTitle}>Select Patient</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {patients.map((patient) => (
            <TouchableOpacity
              key={patient.id}
              style={[
                styles.patientChip,
                selectedPatient === patient.id && styles.patientChipSelected,
              ]}
              onPress={() => setSelectedPatient(patient.id)}
            >
              <Ionicons
                name="person"
                size={16}
                color={selectedPatient === patient.id ? theme.colors.textPrimary : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.patientChipText,
                  selectedPatient === patient.id && styles.patientChipTextSelected,
                ]}
              >
                {patient.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Category Filter */}
        <Text style={styles.sectionTitle}>Filter by Category</Text>
        <View style={styles.categoryContainer}>
          <TouchableOpacity
            style={[styles.categoryChip, !categoryFilter && styles.categoryChipSelected]}
            onPress={() => setCategoryFilter(null)}
          >
            <Text style={[styles.categoryChipText, !categoryFilter && styles.categoryChipTextSelected]}>All</Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, categoryFilter === cat && styles.categoryChipSelected]}
              onPress={() => setCategoryFilter(cat)}
            >
              <Text style={[styles.categoryChipText, categoryFilter === cat && styles.categoryChipTextSelected]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Select Exercise */}
        <Text style={styles.sectionTitle}>Select Exercise</Text>
        {filteredExercises.map((exercise) => (
          <TouchableOpacity
            key={exercise.id}
            style={[
              styles.exerciseCard,
              selectedExercise === exercise.id && styles.exerciseCardSelected,
            ]}
            onPress={() => setSelectedExercise(exercise.id)}
          >
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{exercise.category}</Text>
              </View>
            </View>
            <Text style={styles.exerciseDesc}>{exercise.description}</Text>
            <View style={styles.exerciseMeta}>
              <Ionicons name="time" size={14} color={theme.colors.textMuted} />
              <Text style={styles.exerciseMetaText}>{exercise.duration_minutes} min</Text>
            </View>
            {selectedExercise === exercise.id && (
              <View style={styles.selectedIndicator}>
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
              </View>
            )}
          </TouchableOpacity>
        ))}

        {/* Notes */}
        <Text style={styles.sectionTitle}>Notes (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add instructions or notes for the patient..."
          placeholderTextColor={theme.colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        {/* Assign Button */}
        <TouchableOpacity
          style={[styles.assignButton, submitting && styles.assignButtonDisabled]}
          onPress={handleAssign}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={theme.colors.textPrimary} />
          ) : (
            <>
              <Ionicons name="add-circle" size={24} color={theme.colors.textPrimary} />
              <Text style={styles.assignButtonText}>Assign Exercise</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  horizontalScroll: {
    marginBottom: theme.spacing.md,
  },
  patientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    gap: theme.spacing.xs,
  },
  patientChipSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accentLight,
  },
  patientChipText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  patientChipTextSelected: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.semibold,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  categoryChip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  categoryChipSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accentLight,
  },
  categoryChipText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  categoryChipTextSelected: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.semibold,
  },
  exerciseCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    position: 'relative',
  },
  exerciseCardSelected: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success + '10',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  exerciseName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: theme.colors.accent + '30',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  categoryBadgeText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.semibold,
  },
  exerciseDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  exerciseMetaText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  selectedIndicator: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
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
  assignButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  assignButtonDisabled: {
    opacity: 0.6,
  },
  assignButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
});
