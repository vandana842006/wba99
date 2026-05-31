import React, { useState } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';
import localStorageManager from '../../src/utils/localStorageManager';

interface PatientDataForm {
  patientId: string;
  name: string;
  age: string;
  gender: 'male' | 'female' | 'other';
  diagnosis: string;
  painScore: number;
  romShoulder: string;
  romElbow: string;
  romWrist: string;
  romHip: string;
  romKnee: string;
  romAnkle: string;
  romSpine: string;
  strengthScore: number;
  balanceScore: number;
  treatmentProtocol: string;
  dataType: 'pre' | 'post';
  notes: string;
  studyId: string;
}

const INITIAL_FORM: PatientDataForm = {
  patientId: '',
  name: '',
  age: '',
  gender: 'male',
  diagnosis: '',
  painScore: 5,
  romShoulder: '',
  romElbow: '',
  romWrist: '',
  romHip: '',
  romKnee: '',
  romAnkle: '',
  romSpine: '',
  strengthScore: 3,
  balanceScore: 50,
  treatmentProtocol: '',
  dataType: 'pre',
  notes: '',
  studyId: '',
};

const DIAGNOSES = [
  'Lower Back Pain',
  'Neck Pain',
  'Shoulder Impingement',
  'Knee OA',
  'Hip OA',
  'ACL Reconstruction',
  'Rotator Cuff Repair',
  'Frozen Shoulder',
  'Tennis Elbow',
  'Plantar Fasciitis',
  'Sciatica',
  'Disc Herniation',
  'Scoliosis',
  'Post-Stroke',
  'Parkinson\'s Disease',
  'Other',
];

const TREATMENT_PROTOCOLS = [
  'Manual Therapy + Exercise',
  'Exercise Only',
  'Electrotherapy + Exercise',
  'Aquatic Therapy',
  'Post-Surgical Rehab',
  'Sports Rehab',
  'Neurological Rehab',
  'Pediatric Rehab',
  'Geriatric Care',
  'Pain Management',
  'Custom Protocol',
];

export default function DataEntryScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [form, setForm] = useState<PatientDataForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'basic' | 'rom' | 'assessment' | 'treatment'>('basic');
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const updateForm = (key: keyof PatientDataForm, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    // Clear error when field is updated
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!form.patientId.trim()) newErrors.patientId = 'Patient ID is required';
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.age.trim() || isNaN(Number(form.age))) newErrors.age = 'Valid age is required';
    if (!form.diagnosis) newErrors.diagnosis = 'Diagnosis is required';
    if (!form.treatmentProtocol) newErrors.treatmentProtocol = 'Treatment protocol is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveData = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        ...form,
        age: Number(form.age),
        romData: {
          shoulder: form.romShoulder ? Number(form.romShoulder) : null,
          elbow: form.romElbow ? Number(form.romElbow) : null,
          wrist: form.romWrist ? Number(form.romWrist) : null,
          hip: form.romHip ? Number(form.romHip) : null,
          knee: form.romKnee ? Number(form.romKnee) : null,
          ankle: form.romAnkle ? Number(form.romAnkle) : null,
          spine: form.romSpine ? Number(form.romSpine) : null,
        },
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.id,
        createdByName: currentUser?.name,
      };

      // Save to local storage and sync queue
      await localStorageManager.addToSyncQueue({
        id: `patient-data-${Date.now()}`,
        type: 'assessment',
        data: dataToSave,
        userId: currentUser?.id || '',
        userName: currentUser?.name || '',
        userRole: currentUser?.role || 'physio',
        organizationId: currentUser?.organization_id,
        organizationName: currentUser?.organization_name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Also try to save to server directly
      try {
        await api.post('/research/patient-data', dataToSave);
      } catch (apiError) {
        console.log('Will sync later:', apiError);
      }

      Alert.alert(
        'Data Saved',
        'Patient assessment data has been saved and will sync to the server.',
        [
          {
            text: 'Add Another',
            onPress: () => setForm(INITIAL_FORM),
          },
          {
            text: 'Done',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save data. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderSectionTab = (key: string, label: string, icon: string) => (
    <TouchableOpacity
      style={[styles.sectionTab, activeSection === key && styles.sectionTabActive]}
      onPress={() => setActiveSection(key as any)}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={18}
        color={activeSection === key ? '#fff' : theme.colors.textMuted}
      />
      <Text style={[styles.sectionTabText, activeSection === key && styles.sectionTabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderInput = (
    key: keyof PatientDataForm,
    label: string,
    placeholder: string,
    keyboardType: 'default' | 'numeric' = 'default',
    required = false
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TextInput
        style={[styles.input, errors[key] && styles.inputError]}
        value={form[key] as string}
        onChangeText={(text) => updateForm(key, text)}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType={keyboardType}
      />
      {errors[key] && <Text style={styles.errorText}>{errors[key]}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manual Data Entry</Text>
          <TouchableOpacity onPress={saveData} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : (
              <Ionicons name="checkmark" size={24} color={theme.colors.accent} />
            )}
          </TouchableOpacity>
        </View>

        {/* Section Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionTabs}>
          {renderSectionTab('basic', 'Basic Info', 'account')}
          {renderSectionTab('rom', 'ROM', 'human')}
          {renderSectionTab('assessment', 'Assessment', 'clipboard-check')}
          {renderSectionTab('treatment', 'Treatment', 'medical-bag')}
        </ScrollView>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Pre/Post Toggle */}
          <View style={styles.dataTypeToggle}>
            <TouchableOpacity
              style={[styles.dataTypeBtn, form.dataType === 'pre' && styles.dataTypeBtnActive]}
              onPress={() => updateForm('dataType', 'pre')}
            >
              <Text style={[styles.dataTypeBtnText, form.dataType === 'pre' && styles.dataTypeBtnTextActive]}>
                PRE Treatment
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dataTypeBtn, form.dataType === 'post' && styles.dataTypeBtnActive]}
              onPress={() => updateForm('dataType', 'post')}
            >
              <Text style={[styles.dataTypeBtnText, form.dataType === 'post' && styles.dataTypeBtnTextActive]}>
                POST Treatment
              </Text>
            </TouchableOpacity>
          </View>

          {/* BASIC INFO SECTION */}
          {activeSection === 'basic' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Patient Information</Text>
              
              {renderInput('patientId', 'Patient ID', 'Enter patient ID', 'default', true)}
              {renderInput('name', 'Full Name', 'Enter patient name', 'default', true)}
              {renderInput('age', 'Age', 'Enter age', 'numeric', true)}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Gender <Text style={styles.required}>*</Text></Text>
                <View style={styles.genderButtons}>
                  {['male', 'female', 'other'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderBtn, form.gender === g && styles.genderBtnActive]}
                      onPress={() => updateForm('gender', g)}
                    >
                      <Ionicons
                        name={g === 'male' ? 'male' : g === 'female' ? 'female' : 'person'}
                        size={18}
                        color={form.gender === g ? '#fff' : theme.colors.textMuted}
                      />
                      <Text style={[styles.genderBtnText, form.gender === g && styles.genderBtnTextActive]}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Diagnosis <Text style={styles.required}>*</Text></Text>
                <View style={[styles.pickerContainer, errors.diagnosis && styles.inputError]}>
                  <Picker
                    selectedValue={form.diagnosis}
                    onValueChange={(value) => updateForm('diagnosis', value)}
                    style={styles.picker}
                    dropdownIconColor={theme.colors.textMuted}
                  >
                    <Picker.Item label="Select Diagnosis" value="" color={theme.colors.textMuted} />
                    {DIAGNOSES.map((d) => (
                      <Picker.Item key={d} label={d} value={d} color={theme.colors.textPrimary} />
                    ))}
                  </Picker>
                </View>
                {errors.diagnosis && <Text style={styles.errorText}>{errors.diagnosis}</Text>}
              </View>
            </View>
          )}

          {/* ROM SECTION */}
          {activeSection === 'rom' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Range of Motion (degrees)</Text>
              <Text style={styles.sectionSubtitle}>Enter available ROM for each joint</Text>
              
              <View style={styles.romGrid}>
                {renderInput('romShoulder', 'Shoulder', '180', 'numeric')}
                {renderInput('romElbow', 'Elbow', '150', 'numeric')}
                {renderInput('romWrist', 'Wrist', '80', 'numeric')}
                {renderInput('romHip', 'Hip', '120', 'numeric')}
                {renderInput('romKnee', 'Knee', '140', 'numeric')}
                {renderInput('romAnkle', 'Ankle', '50', 'numeric')}
                {renderInput('romSpine', 'Spine (Flexion)', '90', 'numeric')}
              </View>
            </View>
          )}

          {/* ASSESSMENT SECTION */}
          {activeSection === 'assessment' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Assessment Scores</Text>

              {/* Pain Score VAS */}
              <View style={styles.sliderGroup}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.inputLabel}>Pain Score (VAS)</Text>
                  <Text style={styles.sliderValue}>{form.painScore}/10</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={10}
                  step={1}
                  value={form.painScore}
                  onValueChange={(value) => updateForm('painScore', value)}
                  minimumTrackTintColor={form.painScore > 7 ? '#F44336' : form.painScore > 4 ? '#FF9800' : '#4CAF50'}
                  maximumTrackTintColor={theme.colors.cardBorder}
                  thumbTintColor={theme.colors.accent}
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabel}>No Pain</Text>
                  <Text style={styles.sliderLabel}>Severe</Text>
                </View>
              </View>

              {/* Strength Score */}
              <View style={styles.sliderGroup}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.inputLabel}>Strength (Oxford Scale)</Text>
                  <Text style={styles.sliderValue}>{form.strengthScore}/5</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={5}
                  step={1}
                  value={form.strengthScore}
                  onValueChange={(value) => updateForm('strengthScore', value)}
                  minimumTrackTintColor="#4CAF50"
                  maximumTrackTintColor={theme.colors.cardBorder}
                  thumbTintColor={theme.colors.accent}
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabel}>0 - None</Text>
                  <Text style={styles.sliderLabel}>5 - Normal</Text>
                </View>
              </View>

              {/* Balance Score */}
              <View style={styles.sliderGroup}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.inputLabel}>Balance Score</Text>
                  <Text style={styles.sliderValue}>{form.balanceScore}%</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  step={5}
                  value={form.balanceScore}
                  onValueChange={(value) => updateForm('balanceScore', value)}
                  minimumTrackTintColor="#2196F3"
                  maximumTrackTintColor={theme.colors.cardBorder}
                  thumbTintColor={theme.colors.accent}
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabel}>Poor</Text>
                  <Text style={styles.sliderLabel}>Excellent</Text>
                </View>
              </View>
            </View>
          )}

          {/* TREATMENT SECTION */}
          {activeSection === 'treatment' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Treatment Details</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Treatment Protocol <Text style={styles.required}>*</Text></Text>
                <View style={[styles.pickerContainer, errors.treatmentProtocol && styles.inputError]}>
                  <Picker
                    selectedValue={form.treatmentProtocol}
                    onValueChange={(value) => updateForm('treatmentProtocol', value)}
                    style={styles.picker}
                    dropdownIconColor={theme.colors.textMuted}
                  >
                    <Picker.Item label="Select Protocol" value="" color={theme.colors.textMuted} />
                    {TREATMENT_PROTOCOLS.map((p) => (
                      <Picker.Item key={p} label={p} value={p} color={theme.colors.textPrimary} />
                    ))}
                  </Picker>
                </View>
                {errors.treatmentProtocol && <Text style={styles.errorText}>{errors.treatmentProtocol}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Additional Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={form.notes}
                  onChangeText={(text) => updateForm('notes', text)}
                  placeholder="Enter any additional observations or notes"
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {renderInput('studyId', 'Research Study ID (Optional)', 'Enter study ID if part of research')}
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={saveData}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Save Patient Data</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  sectionTabs: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.card,
    gap: theme.spacing.xs,
  },
  sectionTabActive: {
    backgroundColor: theme.colors.accent,
  },
  sectionTabText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  sectionTabTextActive: {
    color: '#fff',
    fontWeight: theme.fontWeight.semibold,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  dataTypeToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    marginBottom: theme.spacing.lg,
  },
  dataTypeBtn: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  dataTypeBtnActive: {
    backgroundColor: theme.colors.accent,
  },
  dataTypeBtnText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  dataTypeBtnTextActive: {
    color: '#fff',
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  sectionSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  required: {
    color: '#F44336',
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
  inputError: {
    borderColor: '#F44336',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#F44336',
    fontSize: theme.fontSize.xs,
    marginTop: 4,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    gap: theme.spacing.xs,
  },
  genderBtnActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  genderBtnText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  genderBtnTextActive: {
    color: '#fff',
  },
  pickerContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    overflow: 'hidden',
  },
  picker: {
    color: theme.colors.textPrimary,
  },
  romGrid: {
    gap: theme.spacing.sm,
  },
  sliderGroup: {
    marginBottom: theme.spacing.lg,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sliderValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
});
