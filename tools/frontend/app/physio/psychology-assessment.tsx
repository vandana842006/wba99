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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';

interface Question {
  id: number;
  text: string;
  category: string;
}

const PSYCHOLOGY_QUESTIONS: Question[] = [
  // Mental Readiness
  { id: 1, text: 'I feel mentally prepared for competition', category: 'Mental Readiness' },
  { id: 2, text: 'I can maintain focus during high-pressure situations', category: 'Mental Readiness' },
  { id: 3, text: 'I visualize successful performance before events', category: 'Mental Readiness' },
  
  // Anxiety Management
  { id: 4, text: 'I feel nervous before competitions', category: 'Anxiety' },
  { id: 5, text: 'Physical tension affects my performance', category: 'Anxiety' },
  { id: 6, text: 'I worry about making mistakes', category: 'Anxiety' },
  
  // Confidence
  { id: 7, text: 'I believe in my abilities to perform well', category: 'Confidence' },
  { id: 8, text: 'I recover quickly from setbacks', category: 'Confidence' },
  { id: 9, text: 'I feel confident even against stronger opponents', category: 'Confidence' },
  
  // Motivation
  { id: 10, text: 'I am motivated to train hard every day', category: 'Motivation' },
  { id: 11, text: 'I set clear goals for myself', category: 'Motivation' },
  { id: 12, text: 'I enjoy the process of improving', category: 'Motivation' },
  
  // Team Dynamics
  { id: 13, text: 'I communicate well with teammates/coaches', category: 'Team Dynamics' },
  { id: 14, text: 'I support my teammates during difficult times', category: 'Team Dynamics' },
  { id: 15, text: 'I handle criticism constructively', category: 'Team Dynamics' },
  
  // Stress Management
  { id: 16, text: 'I can manage stress from training and life', category: 'Stress' },
  { id: 17, text: 'I get adequate sleep before competitions', category: 'Stress' },
  { id: 18, text: 'I have healthy coping mechanisms', category: 'Stress' },
];

export default function PsychologyAssessment() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  const [patientName, setPatientName] = useState('');
  const [sport, setSport] = useState('');
  const [scores, setScores] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  const updateScore = (questionId: number, score: number) => {
    setScores(prev => ({ ...prev, [questionId]: score }));
  };

  const calculateResults = () => {
    const categories = ['Mental Readiness', 'Anxiety', 'Confidence', 'Motivation', 'Team Dynamics', 'Stress'];
    const results: Record<string, { score: number; max: number; percentage: number }> = {};

    categories.forEach(category => {
      const categoryQuestions = PSYCHOLOGY_QUESTIONS.filter(q => q.category === category);
      let totalScore = 0;
      let answered = 0;

      categoryQuestions.forEach(q => {
        if (scores[q.id] !== undefined) {
          // For Anxiety, reverse the score (high anxiety score = low performance)
          if (category === 'Anxiety') {
            totalScore += (6 - scores[q.id]); // Reverse 1-5 to 5-1
          } else {
            totalScore += scores[q.id];
          }
          answered++;
        }
      });

      const maxScore = categoryQuestions.length * 5;
      results[category] = {
        score: totalScore,
        max: maxScore,
        percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
      };
    });

    return results;
  };

  const getOverallScore = () => {
    const results = calculateResults();
    let total = 0;
    let max = 0;
    Object.values(results).forEach(r => {
      total += r.score;
      max += r.max;
    });
    return { score: total, max, percentage: Math.round((total / max) * 100) };
  };

  const handleSubmit = () => {
    const answeredCount = Object.keys(scores).length;
    if (answeredCount < PSYCHOLOGY_QUESTIONS.length) {
      Alert.alert(
        'Incomplete Assessment',
        `Please answer all questions. ${PSYCHOLOGY_QUESTIONS.length - answeredCount} remaining.`,
        [{ text: 'OK' }]
      );
      return;
    }
    setShowResults(true);
  };

  const getCategoryColor = (percentage: number) => {
    if (percentage >= 80) return theme.colors.success;
    if (percentage >= 60) return theme.colors.warning;
    return theme.colors.error;
  };

  const getRecommendation = (category: string, percentage: number) => {
    const recommendations: Record<string, Record<string, string>> = {
      'Mental Readiness': {
        high: 'Excellent mental preparation. Continue visualization and pre-competition routines.',
        medium: 'Consider adding structured mental rehearsal and pre-game routines.',
        low: 'Focus on building mental preparation skills. Work with a sports psychologist on visualization techniques.',
      },
      'Anxiety': {
        high: 'Good anxiety management. Your arousal levels seem well-controlled.',
        medium: 'Practice relaxation techniques like progressive muscle relaxation and breathing exercises.',
        low: 'Anxiety appears to be affecting performance. Consider anxiety management training and possibly professional support.',
      },
      'Confidence': {
        high: 'Strong self-belief. Maintain this through positive self-talk and achievement reminders.',
        medium: 'Build confidence through setting achievable goals and celebrating small wins.',
        low: 'Confidence needs attention. Focus on competence development and positive affirmations.',
      },
      'Motivation': {
        high: 'Highly motivated. Channel this energy effectively with clear goal-setting.',
        medium: 'Explore intrinsic motivators and set both process and outcome goals.',
        low: 'Motivation may be an issue. Reconnect with why you started and consider setting fresh goals.',
      },
      'Team Dynamics': {
        high: 'Excellent team player. Continue fostering positive relationships.',
        medium: 'Work on communication skills and active listening with teammates.',
        low: 'Team dynamics need improvement. Consider team-building activities and communication workshops.',
      },
      'Stress': {
        high: 'Good stress management. Maintain your recovery and coping strategies.',
        medium: 'Develop more structured recovery protocols and stress-relief practices.',
        low: 'Stress levels appear high. Prioritize recovery, sleep, and consider stress management training.',
      },
    };

    const level = percentage >= 80 ? 'high' : percentage >= 60 ? 'medium' : 'low';
    return recommendations[category]?.[level] || '';
  };

  if (showResults) {
    const results = calculateResults();
    const overall = getOverallScore();

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowResults(false)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Assessment Results</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Patient Info */}
          <View style={styles.patientCard}>
            <Text style={styles.patientName}>{patientName || 'Athlete'}</Text>
            <Text style={styles.patientSport}>{sport || 'Sport not specified'}</Text>
          </View>

          {/* Overall Score */}
          <View style={styles.overallCard}>
            <Text style={styles.overallTitle}>Overall Mental Performance</Text>
            <View style={styles.overallScoreContainer}>
              <Text style={[styles.overallScore, { color: getCategoryColor(overall.percentage) }]}>
                {overall.percentage}%
              </Text>
            </View>
            <Text style={styles.overallSubtext}>
              {overall.percentage >= 80 ? 'Excellent mental fitness' :
               overall.percentage >= 60 ? 'Good with room for improvement' :
               'Needs attention and support'}
            </Text>
          </View>

          {/* Category Results */}
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          {Object.entries(results).map(([category, data]) => (
            <View key={category} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryName}>{category}</Text>
                <Text style={[styles.categoryScore, { color: getCategoryColor(data.percentage) }]}>
                  {data.percentage}%
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${data.percentage}%`, backgroundColor: getCategoryColor(data.percentage) }
                  ]} 
                />
              </View>
              <Text style={styles.recommendation}>
                {getRecommendation(category, data.percentage)}
              </Text>
            </View>
          ))}

          {/* Action Buttons */}
          <TouchableOpacity
            style={styles.newAssessmentButton}
            onPress={() => {
              setScores({});
              setShowResults(false);
            }}
          >
            <Ionicons name="refresh" size={20} color={theme.colors.textPrimary} />
            <Text style={styles.newAssessmentText}>New Assessment</Text>
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
          <View style={styles.headerCenter}>
            <MaterialCommunityIcons name="head-heart" size={28} color="#E91E63" />
            <Text style={styles.headerTitle}>Sports Psychology</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Patient Info */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Athlete Name</Text>
          <TextInput
            style={styles.input}
            value={patientName}
            onChangeText={setPatientName}
            placeholder="Enter athlete name"
            placeholderTextColor={theme.colors.textMuted}
          />
          <Text style={styles.inputLabel}>Sport</Text>
          <TextInput
            style={styles.input}
            value={sport}
            onChangeText={setSport}
            placeholder="e.g., Football, Cricket, Tennis"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        {/* Questions */}
        <Text style={styles.sectionTitle}>Rate each statement (1-5)</Text>
        <Text style={styles.scaleHelp}>1 = Strongly Disagree, 5 = Strongly Agree</Text>

        {PSYCHOLOGY_QUESTIONS.map((question, index) => {
          const prevQuestion = PSYCHOLOGY_QUESTIONS[index - 1];
          const showCategoryHeader = !prevQuestion || prevQuestion.category !== question.category;

          return (
            <View key={question.id}>
              {showCategoryHeader && (
                <View style={styles.categoryHeaderRow}>
                  <MaterialCommunityIcons 
                    name={
                      question.category === 'Mental Readiness' ? 'brain' :
                      question.category === 'Anxiety' ? 'heart-pulse' :
                      question.category === 'Confidence' ? 'shield-check' :
                      question.category === 'Motivation' ? 'fire' :
                      question.category === 'Team Dynamics' ? 'account-group' :
                      'meditation'
                    } 
                    size={20} 
                    color="#E91E63" 
                  />
                  <Text style={styles.categoryHeaderText}>{question.category}</Text>
                </View>
              )}
              <View style={styles.questionCard}>
                <Text style={styles.questionText}>{question.text}</Text>
                <View style={styles.scoreButtons}>
                  {[1, 2, 3, 4, 5].map(score => (
                    <TouchableOpacity
                      key={score}
                      style={[
                        styles.scoreButton,
                        scores[question.id] === score && styles.scoreButtonActive
                      ]}
                      onPress={() => updateScore(question.id, score)}
                    >
                      <Text style={[
                        styles.scoreButtonText,
                        scores[question.id] === score && styles.scoreButtonTextActive
                      ]}>
                        {score}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          );
        })}

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>View Results</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  scrollContent: { padding: theme.spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  backButton: { padding: theme.spacing.xs },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  headerTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  
  inputSection: { marginBottom: theme.spacing.lg },
  inputLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: 4, marginTop: theme.spacing.sm },
  input: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.cardBorder },
  
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.xs },
  scaleHelp: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginBottom: theme.spacing.md },
  
  categoryHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  categoryHeaderText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: '#E91E63' },
  
  questionCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.cardBorder },
  questionText: { fontSize: theme.fontSize.sm, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm, lineHeight: 20 },
  scoreButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.xs },
  scoreButton: { flex: 1, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.sm, backgroundColor: theme.colors.primaryLight, alignItems: 'center' },
  scoreButtonActive: { backgroundColor: '#E91E63' },
  scoreButtonText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, fontWeight: theme.fontWeight.bold },
  scoreButtonTextActive: { color: theme.colors.textPrimary },
  
  submitButton: { backgroundColor: '#E91E63', paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center', marginTop: theme.spacing.lg },
  submitButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  
  // Results styles
  patientCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.lg, alignItems: 'center' },
  patientName: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  patientSport: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  
  overallCard: { backgroundColor: '#E91E63' + '20', borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.lg, alignItems: 'center', borderWidth: 2, borderColor: '#E91E63' },
  overallTitle: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  overallScoreContainer: { marginVertical: theme.spacing.md },
  overallScore: { fontSize: 48, fontWeight: theme.fontWeight.bold },
  overallSubtext: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  
  categoryCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.cardBorder },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  categoryName: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  categoryScore: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold },
  progressBar: { height: 8, backgroundColor: theme.colors.primaryLight, borderRadius: 4, overflow: 'hidden', marginBottom: theme.spacing.sm },
  progressFill: { height: '100%', borderRadius: 4 },
  recommendation: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, lineHeight: 18 },
  
  newAssessmentButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, backgroundColor: '#E91E63', paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.lg },
  newAssessmentText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
});
