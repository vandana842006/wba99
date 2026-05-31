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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import api from '../../src/utils/api';
import { useStore } from '../../src/store/useStore';

interface CertificationExam {
  id: string;
  name: string;
  title: string;
  description: string;
  passing_score: number;
  total_questions: number;
  time_limit_minutes: number;
  is_active: boolean;
  questions: Question[];
  created_at: string;
}

interface Question {
  id: number;
  category: string;
  question: string;
  options: string[];
  correct_answer: number;
}

const EXAM_CATEGORIES = [
  { value: 'General', label: 'General MSK/FMS' },
  { value: 'MSK', label: 'MSK Certification' },
  { value: 'FMS', label: 'FMS Certification' },
];

const QUESTION_CATEGORIES = [
  'Posture', 'MSK', 'Walking', 'Running', 'Anatomy', 'Biomechanics', 'FMS', 'Assessment'
];

export default function CertificationManagement() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [exams, setExams] = useState<CertificationExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedExam, setSelectedExam] = useState<CertificationExam | null>(null);

  // Exam form states
  const [examName, setExamName] = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [examDescription, setExamDescription] = useState('');
  const [passingScore, setPassingScore] = useState('20');
  const [timeLimit, setTimeLimit] = useState('60');

  // Question form states
  const [questionCategory, setQuestionCategory] = useState('Posture');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const response = await api.get('/certifications');
      setExams(response.data);
    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async () => {
    if (!examName.trim() || !examTitle.trim() || !examDescription.trim()) {
      Alert.alert('Required', 'Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/admin/certifications?admin_id=${currentUser?.id}`, {
        name: examName,
        title: examTitle,
        description: examDescription,
        passing_score: parseInt(passingScore) || 20,
        total_questions: 30,
        time_limit_minutes: parseInt(timeLimit) || 60,
        questions: [],
      });
      
      Alert.alert('Success', 'Certification exam created');
      setShowExamModal(false);
      resetExamForm();
      fetchExams();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create exam');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!questionText.trim() || options.some(o => !o.trim())) {
      Alert.alert('Required', 'Please fill in all fields');
      return;
    }

    if (!selectedExam) return;

    setSubmitting(true);
    try {
      await api.post(`/admin/certifications/${selectedExam.id}/questions?admin_id=${currentUser?.id}`, {
        category: questionCategory,
        question: questionText,
        options: options,
        correct_answer: correctAnswer,
      });
      
      Alert.alert('Success', 'Question added');
      setShowQuestionModal(false);
      resetQuestionForm();
      fetchExamDetails(selectedExam.id);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add question');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchExamDetails = async (examId: string) => {
    try {
      const response = await api.get(`/certifications/${examId}`);
      setSelectedExam(response.data);
    } catch (error) {
      console.error('Error fetching exam details:', error);
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!selectedExam) return;
    
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this question?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/certifications/${selectedExam.id}/questions/${questionId}?admin_id=${currentUser?.id}`);
              fetchExamDetails(selectedExam.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete question');
            }
          },
        },
      ]
    );
  };

  const handleDeleteExam = async (examId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this certification exam?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/certifications/${examId}?admin_id=${currentUser?.id}`);
              fetchExams();
              setSelectedExam(null);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete exam');
            }
          },
        },
      ]
    );
  };

  const resetExamForm = () => {
    setExamName('');
    setExamTitle('');
    setExamDescription('');
    setPassingScore('20');
    setTimeLimit('60');
  };

  const resetQuestionForm = () => {
    setQuestionCategory('Posture');
    setQuestionText('');
    setOptions(['', '', '', '']);
    setCorrectAnswer(0);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If viewing a specific exam
  if (selectedExam) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSelectedExam(null)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>{selectedExam.name}</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowQuestionModal(true)}
            >
              <Ionicons name="add" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Exam Info */}
          <View style={styles.examInfoCard}>
            <Text style={styles.examTitle}>{selectedExam.title}</Text>
            <Text style={styles.examDescription}>{selectedExam.description}</Text>
            <View style={styles.examMetaRow}>
              <View style={styles.examMetaItem}>
                <Ionicons name="help-circle" size={18} color={theme.colors.accent} />
                <Text style={styles.examMetaText}>{selectedExam.questions?.length || 0} Questions</Text>
              </View>
              <View style={styles.examMetaItem}>
                <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                <Text style={styles.examMetaText}>Pass: {selectedExam.passing_score}</Text>
              </View>
              <View style={styles.examMetaItem}>
                <Ionicons name="time" size={18} color={theme.colors.warning} />
                <Text style={styles.examMetaText}>{selectedExam.time_limit_minutes} min</Text>
              </View>
            </View>
          </View>

          {/* Questions */}
          <Text style={styles.sectionTitle}>Questions</Text>
          
          {(!selectedExam.questions || selectedExam.questions.length === 0) ? (
            <View style={styles.emptyCard}>
              <Ionicons name="help-circle" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No questions yet</Text>
              <Text style={styles.emptySubtext}>Tap + to add questions</Text>
            </View>
          ) : (
            selectedExam.questions.map((q, index) => (
              <View key={q.id} style={styles.questionCard}>
                <View style={styles.questionHeader}>
                  <View style={styles.questionBadge}>
                    <Text style={styles.questionBadgeText}>Q{index + 1}</Text>
                  </View>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{q.category}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteQuestion(q.id)}>
                    <Ionicons name="trash" size={18} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.questionText}>{q.question}</Text>
                <View style={styles.optionsList}>
                  {q.options.map((opt, optIndex) => (
                    <View 
                      key={optIndex} 
                      style={[
                        styles.optionItem,
                        optIndex === q.correct_answer && styles.correctOption,
                      ]}
                    >
                      <Text style={styles.optionLetter}>{String.fromCharCode(65 + optIndex)}</Text>
                      <Text style={styles.optionText}>{opt}</Text>
                      {optIndex === q.correct_answer && (
                        <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Add Question Modal */}
        <Modal visible={showQuestionModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Question</Text>
                <TouchableOpacity onPress={() => {
                  setShowQuestionModal(false);
                  resetQuestionForm();
                }}>
                  <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <Text style={styles.inputLabel}>Category</Text>
                <View style={styles.categorySelector}>
                  {QUESTION_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryOption,
                        questionCategory === cat && styles.categoryOptionSelected,
                      ]}
                      onPress={() => setQuestionCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          questionCategory === cat && styles.categoryOptionTextSelected,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Question *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Enter your question"
                  placeholderTextColor={theme.colors.textMuted}
                  value={questionText}
                  onChangeText={setQuestionText}
                  multiline
                />

                <Text style={styles.inputLabel}>Options (tap to mark correct answer)</Text>
                {options.map((opt, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.optionInputRow,
                      correctAnswer === index && styles.correctOptionInput,
                    ]}
                    onPress={() => setCorrectAnswer(index)}
                  >
                    <View style={[
                      styles.optionCircle,
                      correctAnswer === index && styles.optionCircleSelected,
                    ]}>
                      <Text style={styles.optionCircleText}>{String.fromCharCode(65 + index)}</Text>
                    </View>
                    <TextInput
                      style={styles.optionInput}
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      placeholderTextColor={theme.colors.textMuted}
                      value={opt}
                      onChangeText={(val) => updateOption(index, val)}
                    />
                    {correctAnswer === index && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                    )}
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleAddQuestion}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={theme.colors.textPrimary} />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={24} color={theme.colors.textPrimary} />
                      <Text style={styles.submitButtonText}>Add Question</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Main exam list view
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Certifications</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowExamModal(true)}
          >
            <Ionicons name="add" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Default Certifications Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={theme.colors.accent} />
          <Text style={styles.infoText}>
            Create and manage certification exams. Add questions, set passing scores, and track results.
          </Text>
        </View>

        {/* Exam List */}
        <Text style={styles.sectionTitle}>Certification Exams</Text>
        
        {exams.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="ribbon" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No certification exams yet</Text>
            <Text style={styles.emptySubtext}>Tap + to create your first exam</Text>
          </View>
        ) : (
          exams.map((exam) => (
            <TouchableOpacity
              key={exam.id}
              style={styles.examCard}
              onPress={() => fetchExamDetails(exam.id)}
            >
              <View style={styles.examCardHeader}>
                <View style={styles.examNameBadge}>
                  <Text style={styles.examNameText}>{exam.name}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteExam(exam.id)}>
                  <Ionicons name="trash" size={18} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
              <Text style={styles.examCardTitle}>{exam.title}</Text>
              <Text style={styles.examCardDescription} numberOfLines={2}>
                {exam.description}
              </Text>
              <View style={styles.examCardMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="help-circle" size={14} color={theme.colors.textMuted} />
                  <Text style={styles.metaText}>{exam.total_questions} questions</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="checkmark-circle" size={14} color={theme.colors.textMuted} />
                  <Text style={styles.metaText}>Pass: {exam.passing_score}</Text>
                </View>
              </View>
              <View style={styles.manageRow}>
                <Text style={styles.manageText}>Tap to manage questions</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.accent} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Create Exam Modal */}
      <Modal visible={showExamModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Certification</Text>
              <TouchableOpacity onPress={() => {
                setShowExamModal(false);
                resetExamForm();
              }}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Exam Name *</Text>
              <View style={styles.categorySelector}>
                {EXAM_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.examTypeOption,
                      examName === cat.value && styles.examTypeOptionSelected,
                    ]}
                    onPress={() => {
                      setExamName(cat.value);
                      setExamTitle(`${cat.label} Certification`);
                    }}
                  >
                    <Text
                      style={[
                        styles.examTypeText,
                        examName === cat.value && styles.examTypeTextSelected,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Certification title"
                placeholderTextColor={theme.colors.textMuted}
                value={examTitle}
                onChangeText={setExamTitle}
              />

              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe what this certification covers"
                placeholderTextColor={theme.colors.textMuted}
                value={examDescription}
                onChangeText={setExamDescription}
                multiline
              />

              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Passing Score</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="20"
                    placeholderTextColor={theme.colors.textMuted}
                    value={passingScore}
                    onChangeText={setPassingScore}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Time Limit (min)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="60"
                    placeholderTextColor={theme.colors.textMuted}
                    value={timeLimit}
                    onChangeText={setTimeLimit}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleCreateExam}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={theme.colors.textPrimary} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={24} color={theme.colors.textPrimary} />
                    <Text style={styles.submitButtonText}>Create Exam</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
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
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: theme.colors.success,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent + '20',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  examCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  examCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  examNameBadge: {
    backgroundColor: theme.colors.warning,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  examNameText: {
    fontSize: 10,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  examCardTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  examCardDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  examCardMeta: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
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
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
    paddingTop: theme.spacing.sm,
  },
  manageText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
  },
  // Exam detail view
  examInfoCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  examTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  examDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  examMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  examMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  examMetaText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  questionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  questionBadge: {
    backgroundColor: theme.colors.accent,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  categoryBadge: {
    flex: 1,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  questionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    lineHeight: 22,
  },
  optionsList: {
    gap: theme.spacing.xs,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  correctOption: {
    backgroundColor: theme.colors.success + '30',
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  optionLetter: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textMuted,
    width: 20,
  },
  optionText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  modalScroll: {
    padding: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  textInput: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  categoryOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  categoryOptionSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  categoryOptionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  categoryOptionTextSelected: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  examTypeOption: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.cardBorder,
    alignItems: 'center',
  },
  examTypeOptionSelected: {
    backgroundColor: theme.colors.warning + '30',
    borderColor: theme.colors.warning,
  },
  examTypeText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  examTypeTextSelected: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  optionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    gap: theme.spacing.sm,
  },
  correctOptionInput: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success + '15',
  },
  optionCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionCircleSelected: {
    backgroundColor: theme.colors.success,
  },
  optionCircleText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
  },
  optionInput: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    padding: 0,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
});
