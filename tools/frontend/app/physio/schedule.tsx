import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import Constants from 'expo-constants';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface DaySchedule {
  start: string | null;
  end: string | null;
  break_start: string | null;
  break_end: string | null;
}

interface WeeklySchedule {
  [key: string]: DaySchedule;
}

export default function ScheduleScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [schedule, setSchedule] = useState<WeeklySchedule>({
    Monday: { start: '09:00', end: '18:00', break_start: '13:00', break_end: '14:00' },
    Tuesday: { start: '09:00', end: '18:00', break_start: '13:00', break_end: '14:00' },
    Wednesday: { start: '09:00', end: '18:00', break_start: '13:00', break_end: '14:00' },
    Thursday: { start: '09:00', end: '18:00', break_start: '13:00', break_end: '14:00' },
    Friday: { start: '09:00', end: '18:00', break_start: '13:00', break_end: '14:00' },
    Saturday: { start: '10:00', end: '14:00', break_start: null, break_end: null },
    Sunday: { start: null, end: null, break_start: null, break_end: null },
  });
  const [slotDuration, setSlotDuration] = useState('30');
  const [bufferTime, setBufferTime] = useState('5');

  const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                      process.env.EXPO_PUBLIC_BACKEND_URL || '';

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    if (!currentUser?.id) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/schedules/${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.weekly_hours) {
          setSchedule(data.weekly_hours);
        }
        if (data.slot_duration) {
          setSlotDuration(String(data.slot_duration));
        }
        if (data.buffer_time) {
          setBufferTime(String(data.buffer_time));
        }
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSchedule = async () => {
    if (!currentUser?.id) return;
    
    setSaving(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/schedules/${currentUser.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekly_hours: schedule,
          slot_duration: parseInt(slotDuration),
          buffer_time: parseInt(bufferTime),
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Schedule saved successfully!');
      } else {
        Alert.alert('Error', 'Failed to save schedule');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const updateDaySchedule = (field: keyof DaySchedule, value: string | null) => {
    setSchedule(prev => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        [field]: value,
      },
    }));
  };

  const toggleDayOff = () => {
    const currentDay = schedule[selectedDay];
    if (currentDay.start === null) {
      // Turn on - set default hours
      setSchedule(prev => ({
        ...prev,
        [selectedDay]: {
          start: '09:00',
          end: '18:00',
          break_start: '13:00',
          break_end: '14:00',
        },
      }));
    } else {
      // Turn off
      setSchedule(prev => ({
        ...prev,
        [selectedDay]: {
          start: null,
          end: null,
          break_start: null,
          break_end: null,
        },
      }));
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

  const daySchedule = schedule[selectedDay];
  const isWorkingDay = daySchedule?.start !== null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Schedule & Time Slots</Text>
          <TouchableOpacity onPress={saveSchedule} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : (
              <Ionicons name="checkmark" size={24} color={theme.colors.accent} />
            )}
          </TouchableOpacity>
        </View>

        {/* Week View */}
        <View style={styles.weekView}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = selectedDay === day;
              const isWorking = schedule[day]?.start !== null;
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayTab,
                    isSelected && styles.dayTabSelected,
                    !isWorking && styles.dayTabOff,
                  ]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[
                    styles.dayTabText,
                    isSelected && styles.dayTabTextSelected,
                    !isWorking && styles.dayTabTextOff,
                  ]}>
                    {day.slice(0, 3)}
                  </Text>
                  {isWorking && (
                    <View style={[styles.workingDot, isSelected && styles.workingDotSelected]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Day Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{selectedDay}</Text>
            <TouchableOpacity style={styles.toggleButton} onPress={toggleDayOff}>
              <Text style={styles.toggleText}>{isWorkingDay ? 'Mark as Off' : 'Mark as Working'}</Text>
            </TouchableOpacity>
          </View>

          {isWorkingDay ? (
            <>
              {/* Working Hours */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="time" size={20} color={theme.colors.accent} />
                  <Text style={styles.cardTitle}>Working Hours</Text>
                </View>
                <View style={styles.timeRow}>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>Start Time</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={daySchedule.start || ''}
                      onChangeText={(value) => updateDaySchedule('start', value)}
                      placeholder="09:00"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>
                  <View style={styles.timeSeparator}>
                    <Text style={styles.toText}>to</Text>
                  </View>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>End Time</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={daySchedule.end || ''}
                      onChangeText={(value) => updateDaySchedule('end', value)}
                      placeholder="18:00"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>
                </View>
              </View>

              {/* Break Time */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="cafe" size={20} color={theme.colors.warning} />
                  <Text style={styles.cardTitle}>Break Time</Text>
                </View>
                <View style={styles.timeRow}>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>Break Start</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={daySchedule.break_start || ''}
                      onChangeText={(value) => updateDaySchedule('break_start', value || null)}
                      placeholder="13:00"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>
                  <View style={styles.timeSeparator}>
                    <Text style={styles.toText}>to</Text>
                  </View>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>Break End</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={daySchedule.break_end || ''}
                      onChangeText={(value) => updateDaySchedule('break_end', value || null)}
                      placeholder="14:00"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.offDayCard}>
              <MaterialCommunityIcons name="sleep" size={48} color={theme.colors.textMuted} />
              <Text style={styles.offDayText}>Day Off</Text>
              <Text style={styles.offDaySubtext}>No appointments scheduled</Text>
            </View>
          )}
        </View>

        {/* Slot Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointment Settings</Text>
          
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="timer" size={20} color={theme.colors.accent} />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Slot Duration</Text>
                  <Text style={styles.settingDesc}>Time for each appointment</Text>
                </View>
              </View>
              <View style={styles.settingValue}>
                <TextInput
                  style={styles.settingInput}
                  value={slotDuration}
                  onChangeText={setSlotDuration}
                  keyboardType="numeric"
                />
                <Text style={styles.settingUnit}>min</Text>
              </View>
            </View>

            <View style={styles.settingDivider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="pause" size={20} color={theme.colors.warning} />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Buffer Time</Text>
                  <Text style={styles.settingDesc}>Gap between appointments</Text>
                </View>
              </View>
              <View style={styles.settingValue}>
                <TextInput
                  style={styles.settingInput}
                  value={bufferTime}
                  onChangeText={setBufferTime}
                  keyboardType="numeric"
                />
                <Text style={styles.settingUnit}>min</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {DAYS_OF_WEEK.filter(d => schedule[d]?.start !== null).length}
            </Text>
            <Text style={styles.statLabel}>Working Days</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{slotDuration} min</Text>
            <Text style={styles.statLabel}>Per Slot</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>~16</Text>
            <Text style={styles.statLabel}>Slots/Day</Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveSchedule}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Schedule</Text>
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
  weekView: {
    marginBottom: theme.spacing.lg,
  },
  dayTab: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    alignItems: 'center',
    minWidth: 60,
  },
  dayTabSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  dayTabOff: {
    opacity: 0.5,
  },
  dayTabText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  dayTabTextSelected: {
    color: theme.colors.primary,
  },
  dayTabTextOff: {
    color: theme.colors.textMuted,
  },
  workingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.success,
    marginTop: 4,
  },
  workingDotSelected: {
    backgroundColor: theme.colors.primary,
  },
  section: {
    marginBottom: theme.spacing.lg,
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
  },
  toggleButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
  },
  toggleText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.semibold,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeField: {
    flex: 1,
  },
  timeLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  timeInput: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  timeSeparator: {
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  toText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
  },
  offDayCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  offDayText: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  offDaySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  settingsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  settingDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  settingInput: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    width: 60,
    textAlign: 'center',
  },
  settingUnit: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  settingDivider: {
    height: 1,
    backgroundColor: theme.colors.cardBorder,
    marginVertical: theme.spacing.md,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.accent + '40',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.cardBorder,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: '#fff',
  },
});
