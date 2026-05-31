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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { getAssignedExercises, updateAssignmentStatus, getExercise } from '../../src/utils/api';
import { useStore, AssignedExercise, Exercise } from '../../src/store/useStore';

export default function PatientExercisesScreen() {
  const { currentUser } = useStore();
  const [exercises, setExercises] = useState<(AssignedExercise & { details?: Exercise })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const fetchData = async () => {
    if (!currentUser) return;
    
    try {
      const response = await getAssignedExercises({ patient_id: currentUser.id });
      
      // Fetch exercise details for each assigned exercise
      const exercisesWithDetails = await Promise.all(
        response.data.map(async (assigned: AssignedExercise) => {
          try {
            const exerciseRes = await getExercise(assigned.exercise_id);
            return { ...assigned, details: exerciseRes.data };
          } catch {
            return assigned;
          }
        })
      );
      
      setExercises(exercisesWithDetails);
    } catch (error) {
      console.error('Error fetching exercises:', error);
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

  const handleStatusUpdate = async (assignmentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'in_progress' : 
                      currentStatus === 'in_progress' ? 'completed' : currentStatus;
    
    if (newStatus === currentStatus) return;

    try {
      await updateAssignmentStatus(assignmentId, newStatus);
      fetchData();
      if (newStatus === 'completed') {
        Alert.alert('Great job!', 'Exercise marked as completed!');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const filteredExercises = exercises.filter(e => {
    if (filter === 'all') return true;
    if (filter === 'pending') return e.status !== 'completed';
    if (filter === 'completed') return e.status === 'completed';
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return theme.colors.warning;
      case 'in_progress':
        return theme.colors.info;
      case 'completed':
        return theme.colors.success;
      default:
        return theme.colors.textMuted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'in_progress':
        return 'play-circle-outline';
      case 'completed':
        return 'checkmark-circle';
      default:
        return 'ellipse-outline';
    }
  };

  const getNextStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Start Exercise';
      case 'in_progress':
        return 'Mark Complete';
      default:
        return '';
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
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'pending', 'completed'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterButtonText, filter === f && styles.filterButtonTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
      >
        {filteredExercises.map((exercise) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(exercise.status) }]} />
              <View style={styles.exerciseTitle}>
                <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
                <Text style={styles.exerciseCategory}>
                  {exercise.details?.category?.toUpperCase() || 'EXERCISE'}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(exercise.status) + '20' }]}>
                <Ionicons
                  name={getStatusIcon(exercise.status) as any}
                  size={16}
                  color={getStatusColor(exercise.status)}
                />
                <Text style={[styles.statusText, { color: getStatusColor(exercise.status) }]}>
                  {exercise.status.replace('_', ' ')}
                </Text>
              </View>
            </View>

            {exercise.details && (
              <View style={styles.exerciseDetails}>
                <Text style={styles.exerciseDesc}>{exercise.details.description}</Text>
                
                {exercise.details.instructions && exercise.details.instructions.length > 0 && (
                  <View style={styles.instructionsContainer}>
                    <Text style={styles.instructionsTitle}>Instructions:</Text>
                    {exercise.details.instructions.map((instruction, idx) => (
                      <View key={idx} style={styles.instructionItem}>
                        <Text style={styles.instructionNumber}>{idx + 1}.</Text>
                        <Text style={styles.instructionText}>{instruction}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.exerciseMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time" size={16} color={theme.colors.textMuted} />
                    <Text style={styles.metaText}>{exercise.details.duration_minutes} min</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="person" size={16} color={theme.colors.textMuted} />
                    <Text style={styles.metaText}>By {exercise.physio_name}</Text>
                  </View>
                </View>
              </View>
            )}

            {exercise.notes && (
              <View style={styles.notesContainer}>
                <Ionicons name="document-text" size={16} color={theme.colors.accent} />
                <Text style={styles.notesText}>{exercise.notes}</Text>
              </View>
            )}

            {exercise.status !== 'completed' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: getStatusColor(exercise.status) }]}
                onPress={() => handleStatusUpdate(exercise.id, exercise.status)}
              >
                <Ionicons
                  name={exercise.status === 'pending' ? 'play' : 'checkmark'}
                  size={20}
                  color={theme.colors.textPrimary}
                />
                <Text style={styles.actionButtonText}>
                  {getNextStatusLabel(exercise.status)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {filteredExercises.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="fitness" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No Exercises</Text>
            <Text style={styles.emptyText}>
              {filter === 'completed' 
                ? "You haven't completed any exercises yet"
                : filter === 'pending'
                ? "No pending exercises! Great job!"
                : "No exercises assigned to you yet"}
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
  filterContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  filterButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.xs,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.accent,
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
  exerciseCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  statusIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: theme.spacing.md,
  },
  exerciseTitle: {
    flex: 1,
  },
  exerciseName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  exerciseCategory: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.xs,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    textTransform: 'capitalize',
  },
  exerciseDetails: {
    padding: theme.spacing.md,
  },
  exerciseDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  instructionsContainer: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  instructionsTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xs,
  },
  instructionNumber: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.semibold,
    marginRight: theme.spacing.sm,
    width: 20,
  },
  instructionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  exerciseMeta: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
    gap: theme.spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  metaText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.accent + '10',
    gap: theme.spacing.sm,
  },
  notesText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    fontStyle: 'italic',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  actionButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
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
