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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import { getPhysioPatients } from '../../src/utils/api';
import api from '../../src/utils/api';

interface Patient {
  id: string;
  name: string;
  email: string;
}

interface FMSTest {
  movement: string;
  label: string;
  description: string;
  score: number;
  pain: boolean;
  asymmetry: boolean;
  videoUri?: string;
}

const FMS_TESTS: Omit<FMSTest, 'score' | 'pain' | 'asymmetry'>[] = [
  { movement: 'deep_squat', label: 'Deep Squat', description: 'Tests bilateral mobility of hips, knees, and ankles' },
  { movement: 'hurdle_step', label: 'Hurdle Step', description: 'Tests stride mechanics and stability' },
  { movement: 'inline_lunge', label: 'Inline Lunge', description: 'Tests hip mobility and trunk stability' },
  { movement: 'shoulder_mobility', label: 'Shoulder Mobility', description: 'Tests shoulder ROM and scapular mobility' },
  { movement: 'active_straight_leg', label: 'Active Straight Leg Raise', description: 'Tests hamstring and hip flexibility' },
  { movement: 'trunk_stability_pushup', label: 'Trunk Stability Push-up', description: 'Tests core stability during movement' },
  { movement: 'rotary_stability', label: 'Rotary Stability', description: 'Tests multi-plane trunk stability' },
];

export default function FMSAnalysisScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  const [tests, setTests] = useState<FMSTest[]>(
    FMS_TESTS.map(t => ({ ...t, score: 0, pain: false, asymmetry: false }))
  );
  
  const [results, setResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (currentUser?.role === 'physio' || currentUser?.role === 'admin') {
      fetchPatients();
    }
  }, [currentUser]);

  const fetchPatients = async () => {
    if (!currentUser) return;
    try {
      const response = await getPhysioPatients(currentUser.id);
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const updateTestScore = (index: number, score: number) => {
    setTests(prev => prev.map((t, i) => 
      i === index ? { ...t, score } : t
    ));
  };

  const togglePain = (index: number) => {
    setTests(prev => prev.map((t, i) => 
      i === index ? { ...t, pain: !t.pain } : t
    ));
  };

  const toggleAsymmetry = (index: number) => {
    setTests(prev => prev.map((t, i) => 
      i === index ? { ...t, asymmetry: !t.asymmetry } : t
    ));
  };

  const pickVideo = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setTests(prev => prev.map((t, i) => 
        i === index ? { ...t, videoUri: result.assets[0].uri } : t
      ));
    }
  };

  const calculateTotalScore = () => {
    return tests.reduce((sum, t) => sum + t.score, 0);
  };

  const handleSubmit = async () => {
    if (!selectedPatient) {
      Alert.alert('Error', 'Please select a patient');
      return;
    }

    const incompleteTests = tests.filter(t => t.score === 0);
    if (incompleteTests.length > 0) {
      Alert.alert(
        'Incomplete Assessment',
        `${incompleteTests.length} tests have score 0. Continue anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: submitAnalysis }
        ]
      );
      return;
    }

    submitAnalysis();
  };

  const submitAnalysis = async () => {
    setAnalyzing(true);
    try {
      const response = await api.post('/fms-analysis', {
        patient_id: selectedPatient?.id,
        physio_id: currentUser?.id,
        tests: tests.map(t => ({
          movement: t.movement,
          score: t.score,
          pain: t.pain,
          asymmetry: t.asymmetry,
        })),
        video_urls: {},
      });

      setResults(response.data);
      setShowResults(true);
    } catch (error) {
      console.error('Error submitting FMS:', error);
      Alert.alert('Error', 'Failed to submit FMS analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score === 3) return theme.colors.success;
    if (score === 2) return theme.colors.warning;
    return theme.colors.error;
  };

  const ScoreButton = ({ value, current, onPress }: { value: number; current: number; onPress: () => void }) => (
    <TouchableOpacity
      style={[
        styles.scoreButton,
        current === value && { backgroundColor: getScoreColor(value) }
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.scoreButtonText,
        current === value && styles.scoreButtonTextActive
      ]}>
        {value}
      </Text>
    </TouchableOpacity>
  );

  // Results View
  if (showResults && results) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.resultsHeader}>
            <TouchableOpacity onPress={() => setShowResults(false)}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.resultsTitle}>FMS Results</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Score Card */}
          <View style={styles.scoreCard}>
            <Text style={styles.scoreCardLabel}>Total FMS Score</Text>
            <Text style={[styles.scoreCardValue, { color: getScoreColor(results.total_score > 14 ? 3 : results.total_score > 10 ? 2 : 1) }]}>
              {results.total_score}/21
            </Text>
            <Text style={styles.scoreCardDesc}>
              {results.total_score >= 14 ? 'Good Movement Quality' : 
               results.total_score >= 10 ? 'Moderate Dysfunction' : 'Significant Dysfunction'}
            </Text>
          </View>

          {/* AI Analysis */}
          {results.ai_analysis && (
            <View style={styles.aiSection}>
              <View style={styles.aiHeader}>
                <MaterialCommunityIcons name="robot" size={24} color={theme.colors.accent} />
                <Text style={styles.aiTitle}>AI Analysis</Text>
              </View>
              <Text style={styles.aiText}>{results.ai_analysis}</Text>
            </View>
          )}

          {/* Recommendations */}
          {results.recommendations?.length > 0 && (
            <View style={styles.recommendationsSection}>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              {results.recommendations.map((rec: string, i: number) => (
                <View key={i} style={styles.recommendationItem}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                  <Text style={styles.recommendationText}>{rec}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <MaterialCommunityIcons name="human-handsup" size={48} color={theme.colors.accent} />
          <Text style={styles.title}>FMS Analysis</Text>
          <Text style={styles.subtitle}>Functional Movement Screen - 7 Tests</Text>
        </View>

        {/* Patient Selection */}
        <Text style={styles.sectionTitle}>Patient</Text>
        <TouchableOpacity style={styles.patientSelector} onPress={() => setShowPatientModal(true)}>
          {selectedPatient ? (
            <>
              <Ionicons name="person" size={24} color={theme.colors.accent} />
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{selectedPatient.name}</Text>
                <Text style={styles.patientEmail}>{selectedPatient.email}</Text>
              </View>
            </>
          ) : (
            <>
              <Ionicons name="person-add" size={24} color={theme.colors.textMuted} />
              <Text style={styles.patientPlaceholder}>Select a patient</Text>
            </>
          )}
          <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {/* FMS Tests */}
        <View style={styles.totalScoreCard}>
          <Text style={styles.totalScoreLabel}>Total Score</Text>
          <Text style={[styles.totalScoreValue, { color: getScoreColor(calculateTotalScore() > 14 ? 3 : calculateTotalScore() > 10 ? 2 : 1) }]}>
            {calculateTotalScore()}/21
          </Text>
        </View>

        {tests.map((test, index) => (
          <View key={test.movement} style={styles.testCard}>
            <View style={styles.testHeader}>
              <Text style={styles.testLabel}>{test.label}</Text>
              <Text style={[styles.testScore, { color: getScoreColor(test.score) }]}>
                {test.score}/3
              </Text>
            </View>
            <Text style={styles.testDescription}>{test.description}</Text>
            
            {/* Score Buttons */}
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Score:</Text>
              <View style={styles.scoreButtons}>
                {[0, 1, 2, 3].map(score => (
                  <ScoreButton
                    key={score}
                    value={score}
                    current={test.score}
                    onPress={() => updateTestScore(index, score)}
                  />
                ))}
              </View>
            </View>

            {/* Pain & Asymmetry Toggles */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleButton, test.pain && styles.toggleButtonActive]}
                onPress={() => togglePain(index)}
              >
                <Ionicons 
                  name={test.pain ? "alert-circle" : "alert-circle-outline"} 
                  size={18} 
                  color={test.pain ? theme.colors.error : theme.colors.textMuted} 
                />
                <Text style={[styles.toggleText, test.pain && { color: theme.colors.error }]}>
                  Pain
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.toggleButton, test.asymmetry && styles.toggleButtonActive]}
                onPress={() => toggleAsymmetry(index)}
              >
                <Ionicons 
                  name={test.asymmetry ? "git-compare" : "git-compare-outline"} 
                  size={18} 
                  color={test.asymmetry ? theme.colors.warning : theme.colors.textMuted} 
                />
                <Text style={[styles.toggleText, test.asymmetry && { color: theme.colors.warning }]}>
                  Asymmetry
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.videoButton}
                onPress={() => pickVideo(index)}
              >
                <Ionicons 
                  name={test.videoUri ? "videocam" : "videocam-outline"} 
                  size={18} 
                  color={test.videoUri ? theme.colors.success : theme.colors.textMuted} 
                />
                <Text style={styles.toggleText}>
                  {test.videoUri ? 'Video Added' : 'Add Video'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, (!selectedPatient || analyzing) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!selectedPatient || analyzing}
        >
          {analyzing ? (
            <>
              <ActivityIndicator size="small" color={theme.colors.textPrimary} />
              <Text style={styles.submitButtonText}>Analyzing with AI...</Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="robot" size={24} color={theme.colors.textPrimary} />
              <Text style={styles.submitButtonText}>Generate AI Analysis</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Patient Selection Modal */}
      <Modal visible={showPatientModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Patient</Text>
              <TouchableOpacity onPress={() => setShowPatientModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {patients.map(patient => (
                <TouchableOpacity
                  key={patient.id}
                  style={[styles.patientOption, selectedPatient?.id === patient.id && styles.patientOptionSelected]}
                  onPress={() => {
                    setSelectedPatient(patient);
                    setShowPatientModal(false);
                  }}
                >
                  <Ionicons name="person" size={24} color={selectedPatient?.id === patient.id ? theme.colors.accent : theme.colors.textMuted} />
                  <View style={styles.patientOptionInfo}>
                    <Text style={styles.patientOptionName}>{patient.name}</Text>
                    <Text style={styles.patientOptionEmail}>{patient.email}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  scrollContent: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  header: { alignItems: 'center', marginBottom: theme.spacing.lg },
  backButton: { position: 'absolute', left: 0, top: 0 },
  title: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginTop: theme.spacing.sm },
  subtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },
  patientSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, gap: theme.spacing.md },
  patientInfo: { flex: 1 },
  patientName: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  patientEmail: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  patientPlaceholder: { flex: 1, color: theme.colors.textMuted },
  totalScoreCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, marginTop: theme.spacing.lg, borderWidth: 2, borderColor: theme.colors.accent },
  totalScoreLabel: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  totalScoreValue: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold },
  testCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginTop: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  testHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  testLabel: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  testScore: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold },
  testDescription: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.md, gap: theme.spacing.md },
  scoreLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  scoreButtons: { flexDirection: 'row', gap: theme.spacing.sm },
  scoreButton: { width: 44, height: 44, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.cardBorder },
  scoreButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textSecondary },
  scoreButtonTextActive: { color: theme.colors.textPrimary },
  toggleRow: { flexDirection: 'row', marginTop: theme.spacing.md, gap: theme.spacing.sm },
  toggleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: theme.spacing.sm, borderRadius: theme.borderRadius.sm, backgroundColor: theme.colors.primaryLight, gap: theme.spacing.xs },
  toggleButtonActive: { backgroundColor: theme.colors.cardBorder },
  toggleText: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted },
  videoButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: theme.spacing.sm, borderRadius: theme.borderRadius.sm, backgroundColor: theme.colors.primaryLight, gap: theme.spacing.xs },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accent, paddingVertical: theme.spacing.lg, borderRadius: theme.borderRadius.lg, marginTop: theme.spacing.xl, gap: theme.spacing.md },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  // Results styles
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  resultsTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  scoreCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.xl, alignItems: 'center', borderWidth: 2, borderColor: theme.colors.accent },
  scoreCardLabel: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
  scoreCardValue: { fontSize: 56, fontWeight: theme.fontWeight.bold, marginVertical: theme.spacing.sm },
  scoreCardDesc: { fontSize: theme.fontSize.md, color: theme.colors.textPrimary },
  aiSection: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, marginTop: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.accent },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  aiTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  aiText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 22 },
  recommendationsSection: { marginTop: theme.spacing.lg },
  recommendationItem: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, marginBottom: theme.spacing.sm, backgroundColor: theme.colors.card, padding: theme.spacing.md, borderRadius: theme.borderRadius.md },
  recommendationText: { flex: 1, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  doneButton: { backgroundColor: theme.colors.success, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center', marginTop: theme.spacing.xl },
  doneButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.primary, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder },
  modalTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  modalBody: { padding: theme.spacing.md },
  patientOption: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.sm, backgroundColor: theme.colors.card, gap: theme.spacing.md },
  patientOptionSelected: { borderWidth: 2, borderColor: theme.colors.accent },
  patientOptionInfo: { flex: 1 },
  patientOptionName: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  patientOptionEmail: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
});
