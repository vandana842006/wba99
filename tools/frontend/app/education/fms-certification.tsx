import React, { useState } from 'react';
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
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const WBA99_LOGO_URL = 'https://customer-assets.emergentagent.com/job_msk-motion-analysis/artifacts/neprg3w5_file_00000000ef5472098a7dfe442c2153e1%20%281%29.png';

interface Question {
  id: number;
  category: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

// 30 FMS-focused Questions
const QUESTIONS: Question[] = [
  // Deep Squat (1-5)
  { id: 1, category: 'Deep Squat', question: 'In FMS Deep Squat, a score of 3 requires:', options: ['Partial squat only', 'Upper torso parallel to tibia, femurs below horizontal', 'Heels on 2x6 board', 'Unable to complete movement'], correctAnswer: 1 },
  { id: 2, category: 'Deep Squat', question: 'FMS Deep Squat primarily assesses:', options: ['Hamstring flexibility only', 'Bilateral symmetrical mobility of hips, knees, ankles', 'Lumbar stability only', 'Upper body strength'], correctAnswer: 1 },
  { id: 3, category: 'Deep Squat', question: 'If athlete scores 2 with heels flat but 3 with heels elevated, this indicates:', options: ['Hip mobility deficit', 'Ankle dorsiflexion limitation', 'Knee instability', 'Core weakness'], correctAnswer: 1 },
  { id: 4, category: 'Deep Squat', question: 'During Deep Squat, the dowel should be:', options: ['In front of the head', 'Directly overhead', 'Behind the head', 'At shoulder level'], correctAnswer: 1 },
  { id: 5, category: 'Deep Squat', question: 'A score of 0 in any FMS test indicates:', options: ['Perfect execution', 'Minor compensation', 'Unable to perform', 'Pain during movement'], correctAnswer: 3 },

  // Hurdle Step (6-10)
  { id: 6, category: 'Hurdle Step', question: 'Hurdle Step test height is set at:', options: ['Knee height', 'Tibial tuberosity height', 'Mid-thigh height', 'Ankle height'], correctAnswer: 1 },
  { id: 7, category: 'Hurdle Step', question: 'Hurdle Step assesses:', options: ['Upper body stability', 'Bilateral mobility and stability of hips, knees, ankles', 'Shoulder flexibility', 'Grip strength'], correctAnswer: 1 },
  { id: 8, category: 'Hurdle Step', question: 'In Hurdle Step, a score of 3 requires:', options: ['Contact with hurdle', 'Loss of balance', 'Hips, knees, ankles in sagittal plane, no movement in lumbar spine', 'Using arms for balance'], correctAnswer: 2 },
  { id: 9, category: 'Hurdle Step', question: 'Hurdle Step is performed with dowel:', options: ['In front of body', 'Behind head across shoulders', 'At sides', 'Overhead'], correctAnswer: 1 },
  { id: 10, category: 'Hurdle Step', question: 'If left and right scores differ in Hurdle Step, final score is:', options: ['Average of both', 'Higher score', 'Lower score', 'Sum of both'], correctAnswer: 2 },

  // Inline Lunge (11-15)
  { id: 11, category: 'Inline Lunge', question: 'Inline Lunge test distance is based on:', options: ['Height', 'Arm length', 'Tibial length', 'Femur length'], correctAnswer: 2 },
  { id: 12, category: 'Inline Lunge', question: 'Inline Lunge assesses:', options: ['Hip mobility, quad flexibility, ankle stability, torso control', 'Only hip strength', 'Only balance', 'Cardiovascular endurance'], correctAnswer: 0 },
  { id: 13, category: 'Inline Lunge', question: 'For score of 3 in Inline Lunge:', options: ['Dowel contacts head, thoracic spine, sacrum throughout', 'Loss of balance acceptable', 'Torso can rotate', 'Feet can move'], correctAnswer: 0 },
  { id: 14, category: 'Inline Lunge', question: 'During Inline Lunge, the dowel is held:', options: ['Overhead', 'In front of body', 'Behind back touching head, T-spine, sacrum', 'At sides'], correctAnswer: 2 },
  { id: 15, category: 'Inline Lunge', question: 'Inline Lunge tests hip mobility in:', options: ['Sagittal plane only', 'Both extension (rear leg) and flexion (front leg)', 'Frontal plane only', 'Transverse plane only'], correctAnswer: 1 },

  // Shoulder Mobility (16-20)
  { id: 16, category: 'Shoulder Mobility', question: 'Shoulder Mobility test measures distance between:', options: ['Elbows', 'Fists', 'Fingertips', 'Wrists'], correctAnswer: 1 },
  { id: 17, category: 'Shoulder Mobility', question: 'A score of 3 in Shoulder Mobility requires fists within:', options: ['One hand length', 'Two hand lengths', 'Three hand lengths', 'Touching'], correctAnswer: 0 },
  { id: 18, category: 'Shoulder Mobility', question: 'Shoulder Mobility assesses:', options: ['Bilateral shoulder range of motion combining internal and external rotation with adduction and abduction', 'Strength only', 'Stability only', 'Endurance only'], correctAnswer: 0 },
  { id: 19, category: 'Shoulder Mobility', question: 'The clearing test for Shoulder Mobility is:', options: ['Hawkins-Kennedy', 'Impingement clearing test (hand on opposite shoulder)', 'Empty can test', 'Apprehension test'], correctAnswer: 1 },
  { id: 20, category: 'Shoulder Mobility', question: 'If clearing test is positive, score is:', options: ['3', '2', '1', '0'], correctAnswer: 3 },

  // ASLR & Trunk Stability (21-25)
  { id: 21, category: 'ASLR', question: 'Active Straight Leg Raise assesses:', options: ['Hamstring flexibility and hip mobility while maintaining core stability', 'Quad strength', 'Calf flexibility', 'Shoulder mobility'], correctAnswer: 0 },
  { id: 22, category: 'ASLR', question: 'ASLR score of 3 requires malleolus to pass:', options: ['Below knee', 'At knee level', 'Mid-thigh', 'ASIS (anterior superior iliac spine)'], correctAnswer: 2 },
  { id: 23, category: 'Trunk Stability', question: 'Trunk Stability Push-Up for males uses hand position at:', options: ['Chin level', 'Forehead level', 'Top of head level', 'Shoulder level'], correctAnswer: 1 },
  { id: 24, category: 'Trunk Stability', question: 'Trunk Stability Push-Up assesses:', options: ['Upper body strength', 'Reflexive core stabilization during symmetrical upper body movement', 'Flexibility', 'Endurance'], correctAnswer: 1 },
  { id: 25, category: 'Trunk Stability', question: 'Extension clearing test for Trunk Stability involves:', options: ['Cobra pose / press-up', 'Sit-up', 'Plank', 'Superman'], correctAnswer: 0 },

  // Rotary Stability (26-30)
  { id: 26, category: 'Rotary Stability', question: 'Rotary Stability test is performed in:', options: ['Standing', 'Sitting', 'Quadruped position', 'Supine'], correctAnswer: 2 },
  { id: 27, category: 'Rotary Stability', question: 'Score of 3 in Rotary Stability requires:', options: ['Diagonal pattern only', 'Unilateral repetition (same arm and leg)', 'Any movement', 'Bilateral pattern'], correctAnswer: 1 },
  { id: 28, category: 'Rotary Stability', question: 'Rotary Stability assesses:', options: ['Multi-plane trunk stability during combined upper and lower extremity motion', 'Only upper body', 'Only lower body', 'Flexibility'], correctAnswer: 0 },
  { id: 29, category: 'Rotary Stability', question: 'Flexion clearing test for Rotary Stability is:', options: ['Toe touch', 'Child\'s pose / rock back on heels', 'Side bend', 'Rotation'], correctAnswer: 1 },
  { id: 30, category: 'Rotary Stability', question: 'Total maximum FMS score is:', options: ['14', '18', '21', '28'], correctAnswer: 2 },
];

const PASSING_SCORE = 20;

export default function FMSCertification() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [physioName, setPhysioName] = useState('');
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);

  const handleSelectAnswer = (optionIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestion]: optionIndex
    }));
  };

  const calculateScore = () => {
    let correct = 0;
    QUESTIONS.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctAnswer) {
        correct++;
      }
    });
    return correct;
  };

  const getCategoryScore = (category: string) => {
    let correct = 0;
    let total = 0;
    QUESTIONS.forEach((q, index) => {
      if (q.category === category) {
        total++;
        if (selectedAnswers[index] === q.correctAnswer) {
          correct++;
        }
      }
    });
    return { correct, total };
  };

  const handleSubmit = () => {
    const unanswered = QUESTIONS.length - Object.keys(selectedAnswers).length;
    if (unanswered > 0) {
      Alert.alert(
        'Incomplete Exam',
        `You have ${unanswered} unanswered questions. Submit anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', onPress: () => setShowResults(true) }
        ]
      );
    } else {
      setShowResults(true);
    }
  };

  const generateCertificatePDF = async () => {
    const score = calculateScore();
    if (score < PASSING_SCORE) {
      Alert.alert('Not Eligible', 'You need to pass the exam to get a certificate.');
      return;
    }

    setIsGeneratingCertificate(true);

    const currentDate = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const certificateNumber = `WBA99-FMS-${Date.now().toString(36).toUpperCase()}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', serif; background: #f0f0f0; min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
    .certificate { width: 100%; max-width: 800px; background: white; border: 15px solid #28A745; position: relative; padding: 40px; }
    .certificate::before { content: ''; position: absolute; top: 10px; left: 10px; right: 10px; bottom: 10px; border: 3px solid #5cb85c; pointer-events: none; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { width: 100px; height: 100px; border-radius: 50%; border: 4px solid #28A745; }
    .certificate-title { font-size: 42px; font-weight: 700; color: #28A745; margin: 15px 0 5px; letter-spacing: 3px; }
    .certificate-subtitle { font-size: 16px; color: #666; letter-spacing: 5px; text-transform: uppercase; }
    .award-text { text-align: center; margin: 30px 0 20px; font-size: 14px; color: #666; letter-spacing: 3px; }
    .recipient-name { text-align: center; font-family: 'Brush Script MT', cursive; font-size: 52px; color: #1a1a2e; margin: 20px 0; border-bottom: 2px solid #28A745; padding-bottom: 10px; }
    .achievement-text { text-align: center; font-size: 14px; color: #555; line-height: 1.8; margin: 20px auto; max-width: 600px; }
    .expert-badge span { display: inline-block; background: linear-gradient(135deg, #28A745 0%, #5cb85c 50%, #28A745 100%); color: white; font-size: 24px; font-weight: 700; padding: 12px 40px; letter-spacing: 4px; border-radius: 5px; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; padding-top: 20px; }
    .footer-item { text-align: center; flex: 1; }
    .signature-line { width: 180px; border-bottom: 2px solid #333; margin: 0 auto 10px; }
    .signature-name { font-family: 'Brush Script MT', cursive; font-size: 24px; color: #333; margin-bottom: 5px; }
    .footer-label { font-size: 11px; color: #666; letter-spacing: 2px; text-transform: uppercase; }
    .seal { width: 80px; height: 80px; background: linear-gradient(135deg, #28A745 0%, #1a5c2a 100%); border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; color: white; font-weight: bold; border: 3px solid #5cb85c; margin: 0 auto; }
    .cert-number { text-align: center; margin-top: 20px; font-size: 10px; color: #999; letter-spacing: 2px; }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <img src="${WBA99_LOGO_URL}" alt="WBA99" class="logo" onerror="this.style.display='none'" />
      <div class="certificate-title">FMS Certificate</div>
      <div class="certificate-subtitle">Functional Movement Screen Specialist</div>
    </div>
    <div class="award-text">THIS CERTIFICATE IS PROUDLY PRESENTED TO</div>
    <div class="recipient-name">${physioName}</div>
    <div class="achievement-text">
      For successfully completing the <strong>WBA99 FMS Certification Examination</strong> 
      and demonstrating exceptional knowledge in Functional Movement Screening including Deep Squat, 
      Hurdle Step, Inline Lunge, Shoulder Mobility, Active Straight Leg Raise, 
      Trunk Stability Push-Up, and Rotary Stability assessments.
    </div>
    <div class="expert-badge" style="text-align:center">
      <span>FMS SPECIALIST CERTIFIED</span>
    </div>
    <div class="footer">
      <div class="footer-item">
        <div class="footer-label">Date</div>
        <div style="margin-top:5px">${currentDate}</div>
      </div>
      <div class="footer-item">
        <div class="seal">
          <div style="font-size:8px">CERTIFIED</div>
          <div style="font-size:14px">FMS</div>
          <div style="font-size:8px">2025</div>
        </div>
      </div>
      <div class="footer-item">
        <div class="signature-line"></div>
        <div class="signature-name">Dr. Prashant Chaturvedi</div>
        <div class="footer-label">Course Provider</div>
      </div>
    </div>
    <div class="cert-number">Certificate No: ${certificateNumber}</div>
  </div>
</body>
</html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'WBA99 FMS Certificate' });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate certificate');
    } finally {
      setIsGeneratingCertificate(false);
    }
  };

  const handleRestart = () => {
    setSelectedAnswers({});
    setCurrentQuestion(0);
    setShowResults(false);
    setExamStarted(false);
  };

  const getCategoryColor = (index: number) => {
    const colors = [theme.colors.success, '#2E7D32', '#4CAF50', '#81C784', '#A5D6A7', '#C8E6C9'];
    return colors[index % colors.length];
  };

  // Start Screen
  if (!examStarted) {
    const canStartExam = physioName.trim().length >= 2;
    
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          
          <View style={styles.startScreen}>
            <MaterialCommunityIcons name="human-handsup" size={80} color={theme.colors.success} />
            <Text style={styles.startTitle}>FMS Certification Exam</Text>
            <Text style={styles.startSubtitle}>Functional Movement Screen Specialist</Text>
            
            <View style={styles.nameInputCard}>
              <Text style={styles.nameInputLabel}>Enter Your Full Name</Text>
              <TextInput
                style={styles.nameInput}
                placeholder="e.g., Dr. John Smith"
                placeholderTextColor={theme.colors.textMuted}
                value={physioName}
                onChangeText={setPhysioName}
                autoCapitalize="words"
              />
            </View>
            
            <View style={styles.examInfoCard}>
              <Text style={styles.examInfoTitle}>Exam Details</Text>
              <View style={styles.examInfoRow}>
                <Ionicons name="help-circle" size={20} color={theme.colors.success} />
                <Text style={styles.examInfoText}>30 Questions</Text>
              </View>
              <View style={styles.examInfoRow}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                <Text style={styles.examInfoText}>Pass: 20/30 (66%)</Text>
              </View>
              <View style={styles.examInfoRow}>
                <Ionicons name="ribbon" size={20} color="#D4AF37" />
                <Text style={styles.examInfoText}>FMS Specialist Certificate</Text>
              </View>
            </View>

            <View style={styles.categoriesCard}>
              <Text style={styles.categoriesTitle}>7 FMS Tests</Text>
              {['Deep Squat', 'Hurdle Step', 'Inline Lunge', 'Shoulder Mobility', 'ASLR', 'Trunk Stability', 'Rotary Stability'].map((cat, idx) => (
                <View key={cat} style={styles.categoryRow}>
                  <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(idx) }]}>
                    <Text style={styles.categoryBadgeText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.categoryName}>{cat}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.startButton, !canStartExam && styles.startButtonDisabled]}
              onPress={() => setExamStarted(true)}
              disabled={!canStartExam}
            >
              <Ionicons name="play" size={24} color={theme.colors.textPrimary} />
              <Text style={styles.startButtonText}>Start Exam</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Results Screen
  if (showResults) {
    const score = calculateScore();
    const passed = score >= PASSING_SCORE;
    const categories = ['Deep Squat', 'Hurdle Step', 'Inline Lunge', 'Shoulder Mobility', 'ASLR', 'Trunk Stability', 'Rotary Stability'];

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.resultsScreen}>
            <Ionicons 
              name={passed ? 'trophy' : 'close-circle'} 
              size={80} 
              color={passed ? theme.colors.warning : theme.colors.error} 
            />
            <Text style={styles.resultsTitle}>
              {passed ? 'Congratulations!' : 'Try Again'}
            </Text>
            <Text style={styles.resultsSubtitle}>
              {passed ? `Well done, ${physioName}! You are now FMS Certified!` : 'You need 20 marks to pass.'}
            </Text>

            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>Your Score</Text>
              <Text style={[styles.scoreValue, { color: passed ? theme.colors.success : theme.colors.error }]}>
                {score}/30
              </Text>
            </View>

            <View style={styles.categoryScoresCard}>
              <Text style={styles.categoryScoresTitle}>Category Breakdown</Text>
              {categories.map((cat, idx) => {
                const catScore = getCategoryScore(cat);
                return (
                  <View key={cat} style={styles.categoryScoreRow}>
                    <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(idx) }]} />
                    <Text style={styles.categoryScoreName}>{cat}</Text>
                    <Text style={styles.categoryScoreValue}>{catScore.correct}/{catScore.total}</Text>
                  </View>
                );
              })}
            </View>

            {passed && (
              <TouchableOpacity
                style={styles.downloadCertButton}
                onPress={generateCertificatePDF}
                disabled={isGeneratingCertificate}
              >
                {isGeneratingCertificate ? (
                  <ActivityIndicator size="small" color={theme.colors.textPrimary} />
                ) : (
                  <>
                    <Ionicons name="download" size={24} color={theme.colors.textPrimary} />
                    <Text style={styles.downloadCertButtonText}>Download FMS Certificate</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.restartButton} onPress={handleRestart}>
              <Ionicons name="refresh" size={24} color={theme.colors.textPrimary} />
              <Text style={styles.restartButtonText}>{passed ? 'Retake Exam' : 'Try Again'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.homeButton} onPress={() => router.push('/education/courses')}>
              <Ionicons name="home" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.homeButtonText}>Back to Education</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Question Screen
  const question = QUESTIONS[currentQuestion];
  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>Question {currentQuestion + 1} of {QUESTIONS.length}</Text>
          <Text style={styles.answeredText}>{answeredCount}/{QUESTIONS.length} Answered</Text>
        </View>

        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%`, backgroundColor: theme.colors.success }]} />
        </View>

        <View style={[styles.categoryBadgeLarge, { backgroundColor: theme.colors.success }]}>
          <Text style={styles.categoryBadgeLargeText}>{question.category}</Text>
        </View>

        <View style={styles.questionCard}>
          <Text style={styles.questionNumber}>Q{question.id}.</Text>
          <Text style={styles.questionText}>{question.question}</Text>
        </View>

        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => {
            const isSelected = selectedAnswers[currentQuestion] === index;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                onPress={() => handleSelectAnswer(index)}
              >
                <View style={[styles.optionCircle, isSelected && styles.optionCircleSelected]}>
                  {isSelected ? (
                    <Ionicons name="checkmark" size={16} color={theme.colors.textPrimary} />
                  ) : (
                    <Text style={styles.optionLetter}>{String.fromCharCode(65 + index)}</Text>
                  )}
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.navigationRow}>
          <TouchableOpacity
            style={[styles.navButton, currentQuestion === 0 && styles.navButtonDisabled]}
            onPress={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
            <Text style={styles.navButtonText}>Previous</Text>
          </TouchableOpacity>

          {currentQuestion < QUESTIONS.length - 1 ? (
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setCurrentQuestion(prev => Math.min(QUESTIONS.length - 1, prev + 1))}
            >
              <Text style={styles.navButtonText}>Next</Text>
              <Ionicons name="chevron-forward" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.submitButton, { backgroundColor: theme.colors.success }]} onPress={handleSubmit}>
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.textPrimary} />
              <Text style={styles.submitButtonText}>Submit Exam</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.dotsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {QUESTIONS.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dot,
                  selectedAnswers[index] !== undefined && styles.dotAnswered,
                  currentQuestion === index && styles.dotCurrent,
                ]}
                onPress={() => setCurrentQuestion(index)}
              >
                <Text style={[styles.dotText, selectedAnswers[index] !== undefined && styles.dotTextAnswered, currentQuestion === index && styles.dotTextCurrent]}>
                  {index + 1}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  scrollContent: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  backBtn: { marginBottom: theme.spacing.md },
  startScreen: { alignItems: 'center', paddingTop: theme.spacing.lg },
  startTitle: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginTop: theme.spacing.lg, textAlign: 'center' },
  startSubtitle: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginTop: theme.spacing.sm, textAlign: 'center' },
  nameInputCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, marginTop: theme.spacing.lg, width: '100%', borderWidth: 1, borderColor: theme.colors.cardBorder },
  nameInputLabel: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  nameInput: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm, padding: theme.spacing.md, fontSize: theme.fontSize.lg, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.cardBorder },
  examInfoCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, marginTop: theme.spacing.lg, width: '100%', borderWidth: 1, borderColor: theme.colors.cardBorder },
  examInfoTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  examInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm, gap: theme.spacing.sm },
  examInfoText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
  categoriesCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, marginTop: theme.spacing.md, width: '100%', borderWidth: 1, borderColor: theme.colors.cardBorder },
  categoriesTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  categoryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  categoryBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.sm },
  categoryBadgeText: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  categoryName: { flex: 1, fontSize: theme.fontSize.md, color: theme.colors.textPrimary },
  startButton: { flexDirection: 'row', backgroundColor: theme.colors.success, borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.xl, width: '100%', gap: theme.spacing.sm },
  startButtonText: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  startButtonDisabled: { backgroundColor: theme.colors.cardBorder, opacity: 0.7 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  progressText: { fontSize: theme.fontSize.md, color: theme.colors.textPrimary, fontWeight: theme.fontWeight.semibold },
  answeredText: { fontSize: theme.fontSize.sm, color: theme.colors.success },
  progressBarBg: { height: 6, backgroundColor: theme.colors.cardBorder, borderRadius: 3, marginBottom: theme.spacing.md },
  progressBarFill: { height: '100%', borderRadius: 3 },
  categoryBadgeLarge: { alignSelf: 'flex-start', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.borderRadius.sm, marginBottom: theme.spacing.md },
  categoryBadgeLargeText: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  questionCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, marginBottom: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.cardBorder },
  questionNumber: { fontSize: theme.fontSize.sm, color: theme.colors.success, fontWeight: theme.fontWeight.bold, marginBottom: theme.spacing.sm },
  questionText: { fontSize: theme.fontSize.lg, color: theme.colors.textPrimary, lineHeight: 26 },
  optionsContainer: { marginBottom: theme.spacing.lg },
  optionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 2, borderColor: theme.colors.cardBorder },
  optionButtonSelected: { borderColor: theme.colors.success, backgroundColor: theme.colors.success + '20' },
  optionCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  optionCircleSelected: { backgroundColor: theme.colors.success },
  optionLetter: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textSecondary },
  optionText: { flex: 1, fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
  optionTextSelected: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.medium },
  navigationRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  navButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, gap: theme.spacing.xs },
  navButtonDisabled: { opacity: 0.5 },
  navButtonText: { fontSize: theme.fontSize.md, color: theme.colors.textPrimary },
  submitButton: { flexDirection: 'row', alignItems: 'center', borderRadius: theme.borderRadius.md, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, gap: theme.spacing.xs },
  submitButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  dotsContainer: { marginBottom: theme.spacing.lg },
  dot: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.card, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.xs, borderWidth: 1, borderColor: theme.colors.cardBorder },
  dotAnswered: { backgroundColor: theme.colors.success + '30', borderColor: theme.colors.success },
  dotCurrent: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
  dotText: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted },
  dotTextAnswered: { color: theme.colors.success },
  dotTextCurrent: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },
  resultsScreen: { alignItems: 'center', paddingTop: theme.spacing.xl },
  resultsTitle: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginTop: theme.spacing.lg },
  resultsSubtitle: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginTop: theme.spacing.sm, textAlign: 'center' },
  scoreCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.xl, marginTop: theme.spacing.xl, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: theme.colors.cardBorder },
  scoreLabel: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
  scoreValue: { fontSize: 48, fontWeight: theme.fontWeight.bold, marginTop: theme.spacing.sm },
  categoryScoresCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, marginTop: theme.spacing.md, width: '100%', borderWidth: 1, borderColor: theme.colors.cardBorder },
  categoryScoresTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  categoryScoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  categoryDot: { width: 12, height: 12, borderRadius: 6, marginRight: theme.spacing.sm },
  categoryScoreName: { flex: 1, fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
  categoryScoreValue: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  downloadCertButton: { flexDirection: 'row', backgroundColor: '#1a5c2a', borderRadius: theme.borderRadius.md, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.lg, gap: theme.spacing.sm, minWidth: 200 },
  downloadCertButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  restartButton: { flexDirection: 'row', backgroundColor: theme.colors.success, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.lg, width: '100%', gap: theme.spacing.sm },
  restartButtonText: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  homeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.md, gap: theme.spacing.sm },
  homeButtonText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
});
