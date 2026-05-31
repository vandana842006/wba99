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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import api from '../../src/utils/api';

interface Exercise {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  duration: string;
  video_url?: string;
  image_url?: string;
  instructions: string[];
  assigned_count?: number;
  completed_count?: number;
}

export default function ExerciseManagement() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Form state
  const [newExercise, setNewExercise] = useState({
    name: '',
    description: '',
    category: 'strength',
    difficulty: 'beginner',
    duration: '10 mins',
    instructions: '',
  });

  const categories = ['strength', 'flexibility', 'balance', 'cardio', 'rehab', 'sports'];
  const difficulties = ['beginner', 'intermediate', 'advanced'];

  const fetchExercises = async () => {
    try {
      const response = await api.get('/exercises');
      setExercises(response.data || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExercises();
  };

  const handleAddExercise = async () => {
    if (!newExercise.name.trim()) {
      Alert.alert('Error', 'Please enter exercise name');
      return;
    }

    try {
      const exerciseData = {
        ...newExercise,
        instructions: newExercise.instructions.split('\n').filter(i => i.trim()),
      };
      
      await api.post('/exercises', exerciseData);
      Alert.alert('Success', 'Exercise added successfully');
      setShowAddModal(false);
      setNewExercise({
        name: '',
        description: '',
        category: 'strength',
        difficulty: 'beginner',
        duration: '10 mins',
        instructions: '',
      });
      fetchExercises();
    } catch (error) {
      console.error('Error adding exercise:', error);
      Alert.alert('Error', 'Failed to add exercise');
    }
  };

  const handleDeleteExercise = async (id: string) => {
    Alert.alert(
      'Delete Exercise',
      'Are you sure you want to delete this exercise?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/exercises/${id}`);
              fetchExercises();
            } catch (error) {
              console.error('Error deleting exercise:', error);
              Alert.alert('Error', 'Failed to delete exercise');
            }
          },
        },
      ]
    );
  };

  const filteredExercises = selectedCategory 
    ? exercises.filter(e => e.category === selectedCategory)
    : exercises;

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      strength: theme.colors.error,
      flexibility: theme.colors.success,
      balance: theme.colors.warning,
      cardio: theme.colors.accent,
      rehab: '#9C27B0',
      sports: '#FF9800',
    };
    return colors[category] || theme.colors.accent;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading exercises...</Text>
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🏋️ Exercise Library</Text>
          <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
            <Ionicons name="add" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{exercises.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{exercises.filter(e => e.category === 'rehab').length}</Text>
            <Text style={styles.statLabel}>Rehab</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{exercises.filter(e => e.category === 'strength').length}</Text>
            <Text style={styles.statLabel}>Strength</Text>
          </View>
        </View>

        {/* Category Filter */}
        <Text style={styles.sectionTitle}>Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          <TouchableOpacity 
            style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>All</Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat}
              style={[
                styles.categoryChip, 
                selectedCategory === cat && styles.categoryChipActive,
                { borderColor: getCategoryColor(cat) }
              ]}
              onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            >
              <Text style={[
                styles.categoryChipText, 
                selectedCategory === cat && styles.categoryChipTextActive
              ]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Exercise List */}
        <Text style={styles.sectionTitle}>Exercises ({filteredExercises.length})</Text>
        {filteredExercises.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="dumbbell" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No exercises found</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => setShowAddModal(true)}>
              <Text style={styles.emptyButtonText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredExercises.map(exercise => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(exercise.category) }]}>
                  <Text style={styles.categoryBadgeText}>{exercise.category}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteExercise(exercise.id)}>
                  <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.exerciseDesc}>{exercise.description}</Text>
              <View style={styles.exerciseMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color={theme.colors.textMuted} />
                  <Text style={styles.metaText}>{exercise.duration}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="fitness-outline" size={16} color={theme.colors.textMuted} />
                  <Text style={styles.metaText}>{exercise.difficulty}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Exercise Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Exercise</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                value={newExercise.name}
                onChangeText={(text) => setNewExercise({...newExercise, name: text})}
                placeholder="Exercise name"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newExercise.description}
                onChangeText={(text) => setNewExercise({...newExercise, description: text})}
                placeholder="Brief description"
                placeholderTextColor={theme.colors.textMuted}
                multiline
              />

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.optionRow}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.optionChip,
                      newExercise.category === cat && styles.optionChipActive
                    ]}
                    onPress={() => setNewExercise({...newExercise, category: cat})}
                  >
                    <Text style={[
                      styles.optionChipText,
                      newExercise.category === cat && styles.optionChipTextActive
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Difficulty</Text>
              <View style={styles.optionRow}>
                {difficulties.map(diff => (
                  <TouchableOpacity
                    key={diff}
                    style={[
                      styles.optionChip,
                      newExercise.difficulty === diff && styles.optionChipActive
                    ]}
                    onPress={() => setNewExercise({...newExercise, difficulty: diff})}
                  >
                    <Text style={[
                      styles.optionChipText,
                      newExercise.difficulty === diff && styles.optionChipTextActive
                    ]}>
                      {diff}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Duration</Text>
              <TextInput
                style={styles.input}
                value={newExercise.duration}
                onChangeText={(text) => setNewExercise({...newExercise, duration: text})}
                placeholder="e.g., 10 mins"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={styles.inputLabel}>Instructions (one per line)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newExercise.instructions}
                onChangeText={(text) => setNewExercise({...newExercise, instructions: text})}
                placeholder="Step 1&#10;Step 2&#10;Step 3"
                placeholderTextColor={theme.colors.textMuted}
                multiline
              />
            </ScrollView>

            <TouchableOpacity style={styles.submitButton} onPress={handleAddExercise}>
              <Text style={styles.submitButtonText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  addButton: {
    backgroundColor: theme.colors.accent,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  categoryScroll: {
    marginBottom: theme.spacing.md,
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginRight: theme.spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  categoryChipText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  categoryChipTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  emptyButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  emptyButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  exerciseCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    textTransform: 'uppercase',
  },
  exerciseName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  exerciseDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  exerciseMeta: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  modalScroll: {
    padding: theme.spacing.md,
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  input: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  optionChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  optionChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  optionChipText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  optionChipTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  submitButton: {
    backgroundColor: theme.colors.accent,
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  submitButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
});
