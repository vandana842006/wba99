import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import Constants from 'expo-constants';

interface Prescription {
  id: string;
  title: string;
  diagnosis: string;
  physio_name: string;
  created_at: string;
  nutrition: Array<{
    name: string;
    value: string;
    unit: string;
    frequency: string;
  }>;
  exercises: Array<{
    name: string;
    sets: string;
    reps: string;
    frequency: string;
    description: string;
  }>;
  instructions: string;
  status: 'active' | 'completed';
}

export default function PatientPrescriptions() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                      process.env.EXPO_PUBLIC_BACKEND_URL || 
                      '';

  useEffect(() => {
    // Show sample prescriptions immediately for demo
    setSamplePrescriptions();
    setLoading(false);
  }, []);

  const setSamplePrescriptions = () => {
    setPrescriptions([
      {
        id: '1',
        title: 'Posture Correction Program',
        diagnosis: 'Upper Crossed Syndrome',
        physio_name: 'Dr. Sarah Smith',
        created_at: new Date().toISOString(),
        nutrition: [
          { name: 'Water', value: '3', unit: 'Liters', frequency: 'Daily' },
          { name: 'Protein', value: '1.5', unit: 'g/kg', frequency: 'Daily' },
          { name: 'Electrolytes', value: '1', unit: 'sachet', frequency: 'After exercise' },
        ],
        exercises: [
          { name: 'Wall Angels', sets: '3', reps: '15', frequency: '3x/week', description: 'Stand with back against wall, arms in goalpost position. Slide arms up and down while maintaining wall contact. Great for shoulder mobility and posture.' },
          { name: 'Chin Tucks', sets: '3', reps: '10', frequency: 'Daily', description: 'Sit or stand tall, gently tuck chin toward chest creating a double chin. Hold 5 seconds. Strengthens deep neck flexors.' },
          { name: 'Thoracic Extensions', sets: '2', reps: '12', frequency: '3x/week', description: 'Place foam roller under upper back. Support head with hands. Extend over roller. Improves thoracic mobility.' },
        ],
        instructions: 'Complete exercises in the morning. Take rest days between strength exercises. Stay hydrated throughout the day.',
        status: 'active',
      },
      {
        id: '2',
        title: 'Lower Back Rehabilitation',
        diagnosis: 'Lumbar Strain',
        physio_name: 'Dr. Sarah Smith',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        nutrition: [
          { name: 'Water', value: '2.5', unit: 'Liters', frequency: 'Daily' },
          { name: 'Omega-3', value: '1000', unit: 'mg', frequency: 'With meals' },
        ],
        exercises: [
          { name: 'Cat-Cow Stretch', sets: '2', reps: '15', frequency: 'Daily', description: 'On hands and knees, alternate between arching back (cat) and dropping belly (cow). Gentle spinal mobilization.' },
          { name: 'Bird Dog', sets: '3', reps: '10 each side', frequency: '3x/week', description: 'From hands and knees, extend opposite arm and leg. Hold 5 seconds. Core stability exercise.' },
          { name: 'Glute Bridges', sets: '3', reps: '12', frequency: '3x/week', description: 'Lie on back, knees bent. Lift hips toward ceiling, squeeze glutes. Strengthens posterior chain.' },
        ],
        instructions: 'Avoid heavy lifting. Use proper body mechanics when bending. Apply ice if pain increases.',
        status: 'active',
      },
    ]);
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

  // Detail View
  if (selectedPrescription) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSelectedPrescription(null)}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Prescription Details</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Title Card */}
          <View style={styles.titleCard}>
            <View style={styles.titleBadge}>
              <Ionicons name="document-text" size={24} color={theme.colors.accent} />
            </View>
            <Text style={styles.prescriptionTitle}>{selectedPrescription.title}</Text>
            <Text style={styles.prescriptionDiagnosis}>{selectedPrescription.diagnosis}</Text>
            <View style={styles.prescriptionMeta}>
              <Text style={styles.prescriptionMetaText}>
                By: {selectedPrescription.physio_name}
              </Text>
              <Text style={styles.prescriptionMetaText}>
                Date: {new Date(selectedPrescription.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Nutrition Section */}
          <Text style={styles.sectionTitle}>💧 Nutrition & Hydration</Text>
          <View style={styles.nutritionGrid}>
            {selectedPrescription.nutrition.map((item, index) => (
              <View key={index} style={styles.nutritionCard}>
                <MaterialCommunityIcons 
                  name={item.name === 'Water' ? 'water' : item.name === 'Protein' ? 'food-steak' : 'lightning-bolt'} 
                  size={28} 
                  color={theme.colors.success} 
                />
                <Text style={styles.nutritionName}>{item.name}</Text>
                <Text style={styles.nutritionValue}>{item.value} {item.unit}</Text>
                <Text style={styles.nutritionFreq}>{item.frequency}</Text>
              </View>
            ))}
          </View>

          {/* Exercises Section */}
          <Text style={styles.sectionTitle}>🏋️ Exercise Program</Text>
          {selectedPrescription.exercises.map((exercise, index) => (
            <View key={index} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseNumber}>
                  <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseFrequency}>{exercise.frequency}</Text>
                </View>
              </View>
              
              <View style={styles.exerciseParams}>
                <View style={styles.paramBox}>
                  <Text style={styles.paramValue}>{exercise.sets}</Text>
                  <Text style={styles.paramLabel}>Sets</Text>
                </View>
                <View style={styles.paramBox}>
                  <Text style={styles.paramValue}>{exercise.reps}</Text>
                  <Text style={styles.paramLabel}>Reps</Text>
                </View>
              </View>

              <View style={styles.exerciseDescriptionBox}>
                <Ionicons name="information-circle" size={20} color={theme.colors.warning} />
                <Text style={styles.exerciseDescription}>{exercise.description}</Text>
              </View>
            </View>
          ))}

          {/* Instructions */}
          {selectedPrescription.instructions && (
            <>
              <Text style={styles.sectionTitle}>📝 Special Instructions</Text>
              <View style={styles.instructionsCard}>
                <Text style={styles.instructionsText}>{selectedPrescription.instructions}</Text>
              </View>
            </>
          )}

          {/* Status */}
          <View style={[styles.statusCard, selectedPrescription.status === 'active' && styles.statusCardActive]}>
            <Ionicons 
              name={selectedPrescription.status === 'active' ? 'checkmark-circle' : 'time'} 
              size={24} 
              color={selectedPrescription.status === 'active' ? theme.colors.success : theme.colors.textMuted} 
            />
            <Text style={styles.statusText}>
              Status: {selectedPrescription.status === 'active' ? 'Active' : 'Completed'}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // List View
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Prescriptions</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="medical" size={40} color={theme.colors.accent} />
          <Text style={styles.infoTitle}>Your Health Plan</Text>
          <Text style={styles.infoText}>
            View your prescribed exercises, nutrition guidelines, and special instructions from your physiotherapist.
          </Text>
        </View>

        {/* Prescriptions List */}
        {prescriptions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={60} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No prescriptions yet</Text>
            <Text style={styles.emptySubtext}>Your physiotherapist will create a personalized plan for you.</Text>
          </View>
        ) : (
          prescriptions.map((prescription) => (
            <TouchableOpacity
              key={prescription.id}
              style={styles.prescriptionCard}
              onPress={() => setSelectedPrescription(prescription)}
            >
              <View style={styles.prescriptionCardHeader}>
                <View style={[styles.statusDot, prescription.status === 'active' && styles.statusDotActive]} />
                <Text style={styles.prescriptionCardTitle}>{prescription.title}</Text>
              </View>
              <Text style={styles.prescriptionCardDiagnosis}>{prescription.diagnosis}</Text>
              <View style={styles.prescriptionCardMeta}>
                <Text style={styles.prescriptionCardMetaText}>
                  <Ionicons name="person" size={12} /> {prescription.physio_name}
                </Text>
                <Text style={styles.prescriptionCardMetaText}>
                  <Ionicons name="calendar" size={12} /> {new Date(prescription.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.prescriptionCardStats}>
                <View style={styles.statItem}>
                  <Ionicons name="fitness" size={16} color={theme.colors.accent} />
                  <Text style={styles.statText}>{prescription.exercises.length} Exercises</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="nutrition" size={16} color={theme.colors.success} />
                  <Text style={styles.statText}>{prescription.nutrition.length} Nutrition Items</Text>
                </View>
              </View>
              <View style={styles.viewButton}>
                <Text style={styles.viewButtonText}>View Details</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.accent} />
              </View>
            </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  // Info Card
  infoCard: {
    backgroundColor: theme.colors.accent + '15',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.accent + '30',
  },
  infoTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  // Prescription Card
  prescriptionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  prescriptionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.textMuted,
    marginRight: theme.spacing.sm,
  },
  statusDotActive: {
    backgroundColor: theme.colors.success,
  },
  prescriptionCardTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  prescriptionCardDiagnosis: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    marginBottom: theme.spacing.sm,
  },
  prescriptionCardMeta: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  prescriptionCardMetaText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  prescriptionCardStats: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  viewButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.semibold,
  },
  // Detail View
  titleCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  titleBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  prescriptionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  prescriptionDiagnosis: {
    fontSize: theme.fontSize.md,
    color: theme.colors.accent,
    marginTop: theme.spacing.xs,
  },
  prescriptionMeta: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  prescriptionMetaText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  // Section
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  // Nutrition Grid
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  nutritionCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: theme.colors.success + '15',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.success + '30',
  },
  nutritionName: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
  },
  nutritionValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
    marginTop: 2,
  },
  nutritionFreq: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  // Exercise Card
  exerciseCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  exerciseNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  exerciseNumberText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  exerciseFrequency: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.accent,
  },
  exerciseParams: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  paramBox: {
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  paramValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
  },
  paramLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  exerciseDescriptionBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.warning + '15',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
    gap: theme.spacing.sm,
  },
  exerciseDescription: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  // Instructions
  instructionsCard: {
    backgroundColor: theme.colors.accent + '15',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.accent + '30',
  },
  instructionsText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  // Status Card
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  statusCardActive: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success + '10',
  },
  statusText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
});
