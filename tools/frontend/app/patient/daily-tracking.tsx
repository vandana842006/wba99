import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';

const RPE_DESCRIPTIONS = [
  { level: 1, label: 'Very Light', description: 'Barely any effort', color: '#4CAF50' },
  { level: 2, label: 'Light', description: 'Easy, can talk freely', color: '#8BC34A' },
  { level: 3, label: 'Moderate', description: 'Comfortable pace', color: '#CDDC39' },
  { level: 4, label: 'Somewhat Hard', description: 'Breathing harder', color: '#FFEB3B' },
  { level: 5, label: 'Hard', description: 'Challenging', color: '#FFC107' },
  { level: 6, label: 'Harder', description: 'Difficult to maintain', color: '#FF9800' },
  { level: 7, label: 'Very Hard', description: 'Very challenging', color: '#FF5722' },
  { level: 8, label: 'Extremely Hard', description: 'Very difficult', color: '#f44336' },
  { level: 9, label: 'Maximum', description: 'Almost max effort', color: '#E91E63' },
  { level: 10, label: 'Max Effort', description: 'Cannot continue', color: '#9C27B0' },
];

const REASONS_NOT_DONE = [
  'Too tired',
  'Pain/Discomfort',
  'No time',
  'Forgot',
  'Work commitments',
  'Travel',
  'Illness',
  'Equipment unavailable',
  'Feeling unwell',
  'Other',
];

const MOOD_OPTIONS = [
  { value: 'great', label: 'Great', icon: 'happy', color: '#4CAF50' },
  { value: 'good', label: 'Good', icon: 'happy-outline', color: '#8BC34A' },
  { value: 'neutral', label: 'Okay', icon: 'remove', color: '#FFC107' },
  { value: 'bad', label: 'Not Good', icon: 'sad-outline', color: '#FF9800' },
  { value: 'terrible', label: 'Terrible', icon: 'sad', color: '#f44336' },
];

export default function DailyTrackingScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [rpeScore, setRpeScore] = useState(5);
  const [rpeFeeliing, setRpeFeeling] = useState('');
  const [exerciseCompleted, setExerciseCompleted] = useState(true);
  const [exercisesDone, setExercisesDone] = useState<string[]>([]);
  const [exercisesNotDone, setExercisesNotDone] = useState<string[]>([]);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [painLevel, setPainLevel] = useState(0);
  const [painLocation, setPainLocation] = useState('');
  const [sleepQuality, setSleepQuality] = useState(5);
  const [energyLevel, setEnergyLevel] = useState(5);
  const [mood, setMood] = useState('neutral');
  const [notes, setNotes] = useState('');

  const currentRPE = RPE_DESCRIPTIONS[rpeScore - 1];

  const toggleReason = (reason: string) => {
    setSelectedReasons(prev => 
      prev.includes(reason) 
        ? prev.filter(r => r !== reason)
        : [...prev, reason]
    );
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/daily-tracking', {
        patient_id: currentUser.id,
        rpe_score: rpeScore,
        rpe_feeling: rpeFeeliing,
        exercise_completed: exerciseCompleted,
        exercises_done: exercisesDone,
        exercises_not_done: exercisesNotDone,
        not_done_reasons: selectedReasons,
        pain_level: painLevel,
        pain_location: painLocation,
        sleep_quality: sleepQuality,
        energy_level: energyLevel,
        mood: mood,
        notes: notes,
      });

      Alert.alert(
        'Success!',
        'Your daily tracking has been recorded. Keep up the great work!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to submit tracking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Daily Tracking</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.dateText}>
          {new Date().toLocaleDateString('en-IN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>

        {/* RPE Scale Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons name="gauge" size={20} color={theme.colors.accent} />
            {'  '}Rate of Perceived Exertion (RPE)
          </Text>
          
          <View style={[styles.rpeDisplay, { backgroundColor: currentRPE.color + '30', borderColor: currentRPE.color }]}>
            <Text style={[styles.rpeNumber, { color: currentRPE.color }]}>{rpeScore}</Text>
            <Text style={styles.rpeLabel}>{currentRPE.label}</Text>
            <Text style={styles.rpeDescription}>{currentRPE.description}</Text>
          </View>

          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={rpeScore}
            onValueChange={setRpeScore}
            minimumTrackTintColor={currentRPE.color}
            maximumTrackTintColor={theme.colors.cardBorder}
            thumbTintColor={currentRPE.color}
          />

          <View style={styles.rpeScale}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <Text 
                key={num} 
                style={[styles.rpeScaleNum, num === rpeScore && { color: currentRPE.color, fontWeight: 'bold' }]}
              >
                {num}
              </Text>
            ))}
          </View>

          <TextInput
            style={styles.textInput}
            placeholder="How are you feeling today? (optional)"
            placeholderTextColor={theme.colors.textMuted}
            value={rpeFeeliing}
            onChangeText={setRpeFeeling}
            multiline
          />
        </View>

        {/* Exercise Completion */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons name="dumbbell" size={20} color={theme.colors.success} />
            {'  '}Exercise Completion
          </Text>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleButton, exerciseCompleted && styles.toggleButtonActive]}
              onPress={() => setExerciseCompleted(true)}
            >
              <Ionicons name="checkmark-circle" size={24} color={exerciseCompleted ? theme.colors.textPrimary : theme.colors.textMuted} />
              <Text style={[styles.toggleText, exerciseCompleted && styles.toggleTextActive]}>Completed</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, !exerciseCompleted && styles.toggleButtonActiveRed]}
              onPress={() => setExerciseCompleted(false)}
            >
              <Ionicons name="close-circle" size={24} color={!exerciseCompleted ? theme.colors.textPrimary : theme.colors.textMuted} />
              <Text style={[styles.toggleText, !exerciseCompleted && styles.toggleTextActive]}>Not Done</Text>
            </TouchableOpacity>
          </View>

          {!exerciseCompleted && (
            <View style={styles.reasonsContainer}>
              <Text style={styles.subLabel}>Why weren't exercises completed?</Text>
              <View style={styles.reasonsGrid}>
                {REASONS_NOT_DONE.map(reason => (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reasonChip,
                      selectedReasons.includes(reason) && styles.reasonChipSelected
                    ]}
                    onPress={() => toggleReason(reason)}
                  >
                    <Text style={[
                      styles.reasonChipText,
                      selectedReasons.includes(reason) && styles.reasonChipTextSelected
                    ]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Pain Level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons name="bandage" size={20} color={theme.colors.error} />
            {'  '}Pain Level
          </Text>

          <View style={styles.painDisplay}>
            <Text style={styles.painNumber}>{painLevel}</Text>
            <Text style={styles.painLabel}>
              {painLevel === 0 ? 'No Pain' : painLevel <= 3 ? 'Mild' : painLevel <= 6 ? 'Moderate' : 'Severe'}
            </Text>
          </View>

          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={10}
            step={1}
            value={painLevel}
            onValueChange={setPainLevel}
            minimumTrackTintColor={painLevel > 6 ? theme.colors.error : painLevel > 3 ? theme.colors.warning : theme.colors.success}
            maximumTrackTintColor={theme.colors.cardBorder}
            thumbTintColor={theme.colors.accent}
          />

          {painLevel > 0 && (
            <TextInput
              style={styles.textInput}
              placeholder="Where is the pain located?"
              placeholderTextColor={theme.colors.textMuted}
              value={painLocation}
              onChangeText={setPainLocation}
            />
          )}
        </View>

        {/* Sleep & Energy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons name="bed" size={20} color={theme.colors.warning} />
            {'  '}Sleep & Energy
          </Text>

          <View style={styles.dualSliderRow}>
            <View style={styles.dualSliderItem}>
              <Text style={styles.subLabel}>Sleep Quality: {sleepQuality}/10</Text>
              <Slider
                style={styles.miniSlider}
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={sleepQuality}
                onValueChange={setSleepQuality}
                minimumTrackTintColor={theme.colors.accent}
                maximumTrackTintColor={theme.colors.cardBorder}
              />
            </View>
            <View style={styles.dualSliderItem}>
              <Text style={styles.subLabel}>Energy Level: {energyLevel}/10</Text>
              <Slider
                style={styles.miniSlider}
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={energyLevel}
                onValueChange={setEnergyLevel}
                minimumTrackTintColor={theme.colors.success}
                maximumTrackTintColor={theme.colors.cardBorder}
              />
            </View>
          </View>
        </View>

        {/* Mood */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons name="emoticon" size={20} color="#9C27B0" />
            {'  '}Overall Mood
          </Text>

          <View style={styles.moodRow}>
            {MOOD_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[styles.moodOption, mood === option.value && { backgroundColor: option.color + '30', borderColor: option.color }]}
                onPress={() => setMood(option.value)}
              >
                <Ionicons 
                  name={option.icon as any} 
                  size={28} 
                  color={mood === option.value ? option.color : theme.colors.textMuted} 
                />
                <Text style={[styles.moodLabel, mood === option.value && { color: option.color }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons name="note-text" size={20} color={theme.colors.textSecondary} />
            {'  '}Additional Notes
          </Text>
          <TextInput
            style={[styles.textInput, styles.notesInput]}
            placeholder="Any other observations, concerns, or notes for your physio..."
            placeholderTextColor={theme.colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={theme.colors.textPrimary} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.textPrimary} />
              <Text style={styles.submitButtonText}>Submit Daily Tracking</Text>
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
  dateText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.accent,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  section: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  rpeDisplay: {
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    marginBottom: theme.spacing.md,
  },
  rpeNumber: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  rpeLabel: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
  },
  rpeDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  rpeScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
    marginTop: -theme.spacing.sm,
  },
  rpeScaleNum: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  textInput: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 2,
    borderColor: theme.colors.cardBorder,
    gap: theme.spacing.sm,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.success + '30',
    borderColor: theme.colors.success,
  },
  toggleButtonActiveRed: {
    backgroundColor: theme.colors.error + '30',
    borderColor: theme.colors.error,
  },
  toggleText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    fontWeight: theme.fontWeight.semibold,
  },
  toggleTextActive: {
    color: theme.colors.textPrimary,
  },
  reasonsContainer: {
    marginTop: theme.spacing.md,
  },
  subLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  reasonChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  reasonChipSelected: {
    backgroundColor: theme.colors.error + '30',
    borderColor: theme.colors.error,
  },
  reasonChipText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  reasonChipTextSelected: {
    color: theme.colors.error,
    fontWeight: theme.fontWeight.semibold,
  },
  painDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  painNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  painLabel: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
  },
  dualSliderRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  dualSliderItem: {
    flex: 1,
  },
  miniSlider: {
    width: '100%',
    height: 30,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodOption: {
    alignItems: 'center',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 60,
  },
  moodLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  submitButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
});
