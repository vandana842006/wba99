import React, { useState, useEffect } from 'react';
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../src/utils/theme';
import api, { getPhysioPatients } from '../../src/utils/api';
import { useStore } from '../../src/store/useStore';
import { generatePaymentSectionHTML } from '../../src/utils/pdfPaymentSection';

const CONDITIONS = [
  'Lower Back Pain',
  'Cervical Spondylosis',
  'Frozen Shoulder',
  'Knee Osteoarthritis',
  'Ankle Sprain',
  'Tennis Elbow',
  'Carpal Tunnel Syndrome',
  'Sciatica',
  'Rotator Cuff Injury',
  'Plantar Fasciitis',
  'ACL Injury',
  'Post-Surgical Rehabilitation',
  'Stroke Rehabilitation',
  'Sports Injury',
  'Other',
];

const SEVERITY_LEVELS = ['Mild', 'Moderate', 'Severe'];

export default function AITreatmentPlanner() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  
  const [condition, setCondition] = useState('');
  const [customCondition, setCustomCondition] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [duration, setDuration] = useState('');
  const [severity, setSeverity] = useState('Moderate');
  
  const [loading, setLoading] = useState(false);
  const [treatmentPlan, setTreatmentPlan] = useState<any>(null);
  
  useEffect(() => {
    const fetchPatients = async () => {
      if (!currentUser?.id) return;
      try {
        const response = await getPhysioPatients(currentUser.id);
        setPatients(response.data || []);
      } catch (error) {
        console.error('Error fetching patients:', error);
      }
    };
    fetchPatients();
  }, [currentUser?.id]);

  const generateTreatmentPlan = async () => {
    const finalCondition = condition === 'Other' ? customCondition : condition;
    
    if (!finalCondition) {
      Alert.alert('Required', 'Please select or enter a condition');
      return;
    }
    
    setLoading(true);
    setTreatmentPlan(null);
    
    try {
      const response = await api.post('/ai/treatment-plan', {
        patient_id: selectedPatient?.id || 'general',
        patient_name: selectedPatient?.name || 'Patient',
        condition: finalCondition,
        symptoms: symptoms.split(',').map(s => s.trim()).filter(Boolean),
        duration: duration,
        severity: severity.toLowerCase(),
        assessment_data: {},
      });
      
      setTreatmentPlan(response.data);
    } catch (error) {
      console.error('Treatment plan error:', error);
      Alert.alert('Error', 'Failed to generate treatment plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Export treatment plan as PDF
  const exportTreatmentPlanPDF = async () => {
    if (!treatmentPlan) {
      Alert.alert('Error', 'Generate a treatment plan first');
      return;
    }

    try {
      const currentDate = new Date().toLocaleDateString('en-IN', { 
        day: 'numeric', month: 'long', year: 'numeric' 
      });
      const finalCondition = condition === 'Other' ? customCondition : condition;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #4CAF50; padding-bottom: 15px; margin-bottom: 20px; }
            .logo { font-size: 28px; font-weight: bold; color: #4CAF50; }
            .title { text-align: center; background: linear-gradient(135deg, #4CAF50, #388E3C); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
            .section { background: #f8f9fa; border-radius: 10px; padding: 15px; margin-bottom: 15px; }
            .section-title { font-size: 16px; font-weight: bold; color: #4CAF50; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
            .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
            .info-item { background: white; padding: 12px; border-radius: 8px; border-left: 4px solid #4CAF50; }
            .phase { background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #2196F3; }
            .phase-title { font-size: 14px; font-weight: bold; color: #2196F3; margin-bottom: 8px; }
            .exercise-item { background: #e8f5e9; padding: 10px; border-radius: 6px; margin-bottom: 8px; }
            .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">WBA99</div>
            <div style="text-align: right; font-size: 12px; color: #666;">
              <p><strong>Physio:</strong> ${currentUser?.name || 'User'}</p>
              <p><strong>Date:</strong> ${currentDate}</p>
            </div>
          </div>
          
          <div class="title">
            <h1 style="margin: 0; font-size: 24px;">📋 AI Treatment Plan</h1>
            <p style="margin: 5px 0 0;">Personalized Rehabilitation Protocol</p>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <strong>Patient</strong><br/>
              ${selectedPatient?.name || 'General Patient'}
            </div>
            <div class="info-item">
              <strong>Condition</strong><br/>
              ${finalCondition}
            </div>
            <div class="info-item">
              <strong>Severity</strong><br/>
              ${severity}
            </div>
            <div class="info-item">
              <strong>Duration</strong><br/>
              ${duration || 'Not specified'}
            </div>
          </div>

          ${treatmentPlan.treatment_protocol ? `
            <div class="section">
              <div class="section-title">🎯 Treatment Protocol</div>
              <p>${treatmentPlan.treatment_protocol}</p>
            </div>
          ` : ''}

          ${treatmentPlan.phases && treatmentPlan.phases.length > 0 ? `
            <div class="section">
              <div class="section-title">📅 Treatment Phases</div>
              ${treatmentPlan.phases.map((phase: any, index: number) => `
                <div class="phase">
                  <div class="phase-title">Phase ${index + 1}: ${phase.name || 'Rehabilitation Phase'}</div>
                  <p style="font-size: 12px;">${phase.description || ''}</p>
                  ${phase.exercises ? `
                    <div style="margin-top: 10px;">
                      ${phase.exercises.map((ex: any) => `
                        <div class="exercise-item">
                          <strong>${ex.name || ex}</strong>
                          ${ex.sets ? `<br/><small>Sets: ${ex.sets} | Reps: ${ex.reps || 'As tolerated'}</small>` : ''}
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${treatmentPlan.exercises && treatmentPlan.exercises.length > 0 ? `
            <div class="section">
              <div class="section-title">🏋️ Recommended Exercises</div>
              ${treatmentPlan.exercises.map((ex: any) => `
                <div class="exercise-item">
                  <strong>${ex.name || ex}</strong>
                  ${ex.description ? `<p style="font-size: 11px; margin: 5px 0 0;">${ex.description}</p>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${treatmentPlan.precautions ? `
            <div class="section" style="border-left: 4px solid #FF9800; background: #fff3e0;">
              <div class="section-title" style="color: #e65100;">⚠️ Precautions</div>
              <p>${Array.isArray(treatmentPlan.precautions) ? treatmentPlan.precautions.join(', ') : treatmentPlan.precautions}</p>
            </div>
          ` : ''}

          ${generatePaymentSectionHTML('#4CAF50')}

          <div class="footer">
            <p>Generated by WBA99 AI Treatment Planner | © 2025 WBA99 Expert Analysis India</p>
            <p><em>This plan is AI-generated and should be reviewed by a qualified healthcare professional.</em></p>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch (error) {
      console.error('PDF export error:', error);
      Alert.alert('Error', 'Failed to export treatment plan as PDF');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <MaterialCommunityIcons name="brain" size={28} color={theme.colors.accent} />
            <Text style={styles.headerTitle}>AI Treatment Planner</Text>
          </View>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Patient Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="person" size={18} color={theme.colors.accent} /> Patient (Optional)
            </Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowPatientPicker(!showPatientPicker)}
            >
              <Text style={styles.selectButtonText}>
                {selectedPatient ? selectedPatient.name : 'Select Patient'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
            
            {showPatientPicker && (
              <View style={styles.pickerContainer}>
                <ScrollView style={{ maxHeight: 200 }}>
                  <TouchableOpacity
                    style={styles.pickerOption}
                    onPress={() => {
                      setSelectedPatient(null);
                      setShowPatientPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>General (No specific patient)</Text>
                  </TouchableOpacity>
                  {patients.map(patient => (
                    <TouchableOpacity
                      key={patient.id}
                      style={[styles.pickerOption, selectedPatient?.id === patient.id && styles.pickerOptionSelected]}
                      onPress={() => {
                        setSelectedPatient(patient);
                        setShowPatientPicker(false);
                      }}
                    >
                      <Text style={styles.pickerOptionText}>{patient.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Condition Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="medical" size={18} color={theme.colors.accent} /> Condition *
            </Text>
            <View style={styles.conditionGrid}>
              {CONDITIONS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.conditionChip, condition === c && styles.conditionChipActive]}
                  onPress={() => setCondition(c)}
                >
                  <Text style={[styles.conditionChipText, condition === c && styles.conditionChipTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {condition === 'Other' && (
              <TextInput
                style={styles.input}
                placeholder="Enter condition name"
                placeholderTextColor={theme.colors.textMuted}
                value={customCondition}
                onChangeText={setCustomCondition}
              />
            )}
          </View>

          {/* Symptoms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="warning" size={18} color={theme.colors.warning} /> Symptoms
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter symptoms (comma separated)&#10;e.g., pain on movement, stiffness, swelling"
              placeholderTextColor={theme.colors.textMuted}
              value={symptoms}
              onChangeText={setSymptoms}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Duration */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="time" size={18} color={theme.colors.info} /> Duration
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 2 weeks, 3 months, chronic"
              placeholderTextColor={theme.colors.textMuted}
              value={duration}
              onChangeText={setDuration}
            />
          </View>

          {/* Severity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="speedometer" size={18} color={theme.colors.error} /> Severity
            </Text>
            <View style={styles.severityButtons}>
              {SEVERITY_LEVELS.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.severityButton,
                    severity === s && styles.severityButtonActive,
                    severity === s && s === 'Mild' && { backgroundColor: theme.colors.success },
                    severity === s && s === 'Moderate' && { backgroundColor: theme.colors.warning },
                    severity === s && s === 'Severe' && { backgroundColor: theme.colors.error },
                  ]}
                  onPress={() => setSeverity(s)}
                >
                  <Text style={[styles.severityButtonText, severity === s && styles.severityButtonTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Generate Button */}
          <TouchableOpacity
            style={[styles.generateButton, loading && styles.buttonDisabled]}
            onPress={generateTreatmentPlan}
            disabled={loading}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.generateButtonText}>Generating AI Treatment Plan...</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="brain" size={24} color="#fff" />
                <Text style={styles.generateButtonText}>Generate Treatment Plan</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Treatment Plan Results */}
          {treatmentPlan && (
            <View style={styles.resultsContainer}>
              <View style={styles.resultHeader}>
                <MaterialCommunityIcons name="file-document-check" size={28} color={theme.colors.success} />
                <Text style={styles.resultTitle}>AI Treatment Plan Generated</Text>
              </View>

              {/* Diagnosis Suggestions */}
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>🔍 Diagnosis Suggestions</Text>
                {treatmentPlan.diagnosis_suggestions?.map((d: string, i: number) => (
                  <Text key={i} style={styles.resultItem}>• {d}</Text>
                ))}
              </View>

              {/* Treatment Plan */}
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>📋 Treatment Plan</Text>
                <Text style={styles.resultText}>{treatmentPlan.treatment_plan}</Text>
              </View>

              {/* Exercises */}
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>💪 Recommended Exercises</Text>
                {treatmentPlan.exercises?.map((ex: any, i: number) => (
                  <View key={i} style={styles.exerciseItem}>
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                    <Text style={styles.exerciseDetails}>
                      {ex.sets} sets × {ex.reps} | {ex.frequency}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Precautions */}
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>⚠️ Precautions</Text>
                {treatmentPlan.precautions?.map((p: string, i: number) => (
                  <Text key={i} style={styles.resultItem}>• {p}</Text>
                ))}
              </View>

              {/* Recovery Timeline */}
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>📅 Expected Recovery</Text>
                <Text style={styles.resultText}>{treatmentPlan.expected_recovery}</Text>
              </View>

              {/* Follow-up */}
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>🗓️ Follow-up Schedule</Text>
                <Text style={styles.resultText}>{treatmentPlan.follow_up_schedule}</Text>
              </View>

              {/* Save Button */}
              <TouchableOpacity style={styles.saveButton}>
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Treatment Plan</Text>
              </TouchableOpacity>

              {/* Export PDF Button */}
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: '#9C27B0', marginTop: 10 }]}
                onPress={exportTreatmentPlanPDF}
              >
                <Ionicons name="download" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Download PDF Report</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={{ height: 100 }} />
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
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  aiBadge: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  selectButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
  },
  pickerContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  pickerOption: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  pickerOptionSelected: {
    backgroundColor: theme.colors.accent + '20',
  },
  pickerOptionText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
  },
  conditionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  conditionChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  conditionChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  conditionChipText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.sm,
  },
  conditionChipTextActive: {
    color: '#fff',
    fontWeight: theme.fontWeight.bold,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginTop: theme.spacing.sm,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  severityButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  severityButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  severityButtonActive: {
    borderColor: 'transparent',
  },
  severityButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
  },
  severityButtonTextActive: {
    color: '#fff',
    fontWeight: theme.fontWeight.bold,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  resultsContainer: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.success,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  resultTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
  },
  resultSection: {
    marginBottom: theme.spacing.lg,
  },
  resultSectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  resultItem: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    marginBottom: 4,
    paddingLeft: theme.spacing.sm,
  },
  resultText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    lineHeight: 22,
  },
  exerciseItem: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  exerciseName: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  exerciseDetails: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
});
