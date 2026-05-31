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

// 30 Massage Therapy focused Questions
const QUESTIONS: Question[] = [
  // Swedish Massage (1-6)
  { id: 1, category: 'Swedish Massage', question: 'Effleurage is a technique that involves:', options: ['Deep kneading', 'Long gliding strokes', 'Rapid tapping', 'Friction on tendons'], correctAnswer: 1 },
  { id: 2, category: 'Swedish Massage', question: 'Petrissage involves:', options: ['Gliding strokes', 'Kneading and squeezing of muscles', 'Vibration', 'Percussion'], correctAnswer: 1 },
  { id: 3, category: 'Swedish Massage', question: 'The primary purpose of effleurage at the beginning of massage is:', options: ['Deep muscle work', 'Warm up tissues and apply lubricant', 'Break adhesions', 'Release trigger points'], correctAnswer: 1 },
  { id: 4, category: 'Swedish Massage', question: 'Tapotement (percussion) is contraindicated over:', options: ['Large muscle groups', 'Bony prominences and kidneys', 'Gluteal muscles', 'Calf muscles'], correctAnswer: 1 },
  { id: 5, category: 'Swedish Massage', question: 'The direction of effleurage strokes should be:', options: ['Away from the heart', 'Toward the heart (venous return)', 'Only horizontal', 'Only circular'], correctAnswer: 1 },
  { id: 6, category: 'Swedish Massage', question: 'Friction massage is used to:', options: ['Relax muscles', 'Break down adhesions and scar tissue', 'Warm up tissues', 'Sedate the nervous system'], correctAnswer: 1 },

  // Deep Tissue (7-12)
  { id: 7, category: 'Deep Tissue', question: 'Deep tissue massage primarily targets:', options: ['Superficial fascia', 'Deeper layers of muscle and connective tissue', 'Skin only', 'Lymphatic system'], correctAnswer: 1 },
  { id: 8, category: 'Deep Tissue', question: 'When performing deep tissue work, pressure should be:', options: ['Constant and rapid', 'Gradual, increasing as tissues release', 'Maximum from the start', 'Light throughout'], correctAnswer: 1 },
  { id: 9, category: 'Deep Tissue', question: 'Cross-fiber friction is performed:', options: ['Along the muscle fibers', 'Perpendicular to muscle fibers', 'In circular motions only', 'With no pressure'], correctAnswer: 1 },
  { id: 10, category: 'Deep Tissue', question: 'Deep tissue massage may cause:', options: ['No soreness', 'Some post-massage soreness (normal)', 'Immediate pain relief only', 'Numbness'], correctAnswer: 1 },
  { id: 11, category: 'Deep Tissue', question: 'The elbow is commonly used in deep tissue massage for:', options: ['Delicate areas', 'Broader pressure on large muscles', 'Face massage', 'Lymphatic drainage'], correctAnswer: 1 },
  { id: 12, category: 'Deep Tissue', question: 'Proper body mechanics for deep tissue work includes:', options: ['Using finger strength only', 'Leaning with body weight instead of muscle force', 'Standing upright', 'Locking the wrists'], correctAnswer: 1 },

  // Myofascial Release (13-18)
  { id: 13, category: 'Myofascial Release', question: 'Fascia is:', options: ['A muscle type', 'Connective tissue surrounding muscles and organs', 'A bone structure', 'A nerve pathway'], correctAnswer: 1 },
  { id: 14, category: 'Myofascial Release', question: 'Myofascial release techniques typically use:', options: ['Oil or lotion', 'No lubricant (dry technique)', 'Water only', 'Alcohol'], correctAnswer: 1 },
  { id: 15, category: 'Myofascial Release', question: 'The hold time for myofascial release is typically:', options: ['1-2 seconds', '90-120 seconds or until release felt', '10 seconds maximum', '5 minutes minimum'], correctAnswer: 1 },
  { id: 16, category: 'Myofascial Release', question: 'Signs of fascial release include:', options: ['Increased resistance', 'Softening, lengthening, or heat', 'No change', 'Pain increase'], correctAnswer: 1 },
  { id: 17, category: 'Myofascial Release', question: 'Fascial restrictions can cause:', options: ['Only local pain', 'Referred pain, reduced mobility, postural changes', 'Weight gain', 'Increased flexibility'], correctAnswer: 1 },
  { id: 18, category: 'Myofascial Release', question: 'The superficial fascia is located:', options: ['Deep to muscles', 'Just beneath the skin', 'Around organs only', 'In joints'], correctAnswer: 1 },

  // Trigger Points (19-24)
  { id: 19, category: 'Trigger Points', question: 'A trigger point is:', options: ['A relaxed muscle area', 'A hyperirritable spot in a taut band of muscle', 'A joint', 'A nerve ending'], correctAnswer: 1 },
  { id: 20, category: 'Trigger Points', question: 'Active trigger points:', options: ['Cause no symptoms', 'Produce pain at rest and with movement', 'Only hurt when pressed', 'Are always visible'], correctAnswer: 1 },
  { id: 21, category: 'Trigger Points', question: 'Referred pain from trigger points:', options: ['Stays at the trigger point', 'Radiates to other areas in predictable patterns', 'Never occurs', 'Is always random'], correctAnswer: 1 },
  { id: 22, category: 'Trigger Points', question: 'Ischemic compression involves:', options: ['Light touch', 'Sustained pressure to reduce blood flow then release', 'Rapid movements', 'No pressure'], correctAnswer: 1 },
  { id: 23, category: 'Trigger Points', question: 'The local twitch response indicates:', options: ['Muscle weakness', 'Trigger point presence', 'Nerve damage', 'Bone fracture'], correctAnswer: 1 },
  { id: 24, category: 'Trigger Points', question: 'Common causes of trigger points include:', options: ['Proper posture', 'Muscle overuse, trauma, stress', 'Adequate sleep', 'Regular exercise'], correctAnswer: 1 },

  // Contraindications & Safety (25-30)
  { id: 25, category: 'Safety', question: 'Absolute contraindication for massage includes:', options: ['Muscle tension', 'Deep vein thrombosis (DVT)', 'Stress', 'Minor headache'], correctAnswer: 1 },
  { id: 26, category: 'Safety', question: 'Massage over varicose veins should be:', options: ['Deep and vigorous', 'Avoided or very gentle', 'Normal pressure', 'Using friction'], correctAnswer: 1 },
  { id: 27, category: 'Safety', question: 'During pregnancy, which position is preferred after first trimester?', options: ['Prone (face down)', 'Side-lying or semi-reclined', 'Supine only', 'Standing'], correctAnswer: 1 },
  { id: 28, category: 'Safety', question: 'Massage is contraindicated with:', options: ['Stress', 'Fever and acute infection', 'Mild muscle soreness', 'Relaxation needs'], correctAnswer: 1 },
  { id: 29, category: 'Safety', question: 'Before massaging a client with cancer, the therapist should:', options: ['Proceed normally', 'Get physician clearance', 'Refuse service', 'Use deep pressure'], correctAnswer: 1 },
  { id: 30, category: 'Safety', question: 'Proper draping during massage ensures:', options: ['Client discomfort', 'Client privacy and warmth', 'Faster treatment', 'Deeper access'], correctAnswer: 1 },
];

const PASSING_SCORE = 20;

export default function MassageCertification() {
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

    const certificateNumber = `WBA99-MSG-${Date.now().toString(36).toUpperCase()}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', serif; background: #f0f0f0; min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
    .certificate { width: 100%; max-width: 800px; background: white; border: 15px solid #E91E63; position: relative; padding: 40px; }
    .certificate::before { content: ''; position: absolute; top: 10px; left: 10px; right: 10px; bottom: 10px; border: 3px solid #F48FB1; pointer-events: none; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { width: 100px; height: 100px; border-radius: 50%; border: 4px solid #E91E63; }
    .certificate-title { font-size: 42px; font-weight: 700; color: #E91E63; margin: 15px 0 5px; letter-spacing: 3px; }
    .certificate-subtitle { font-size: 16px; color: #666; letter-spacing: 5px; text-transform: uppercase; }
    .award-text { text-align: center; margin: 30px 0 20px; font-size: 14px; color: #666; letter-spacing: 3px; }
    .recipient-name { text-align: center; font-family: 'Brush Script MT', cursive; font-size: 52px; color: #1a1a2e; margin: 20px 0; border-bottom: 2px solid #E91E63; padding-bottom: 10px; }
    .achievement-text { text-align: center; font-size: 14px; color: #555; line-height: 1.8; margin: 20px auto; max-width: 600px; }
    .expert-badge span { display: inline-block; background: linear-gradient(135deg, #E91E63 0%, #F48FB1 50%, #E91E63 100%); color: white; font-size: 24px; font-weight: 700; padding: 12px 40px; letter-spacing: 4px; border-radius: 5px; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; padding-top: 20px; }
    .footer-item { text-align: center; flex: 1; }
    .signature-line { width: 180px; border-bottom: 2px solid #333; margin: 0 auto 10px; }
    .signature-name { font-family: 'Brush Script MT', cursive; font-size: 24px; color: #333; margin-bottom: 5px; }
    .footer-label { font-size: 11px; color: #666; letter-spacing: 2px; text-transform: uppercase; }
    .seal { width: 80px; height: 80px; background: linear-gradient(135deg, #E91E63 0%, #880E4F 100%); border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; color: white; font-weight: bold; border: 3px solid #F48FB1; margin: 0 auto; }
    .cert-number { text-align: center; margin-top: 20px; font-size: 10px; color: #999; letter-spacing: 2px; }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <img src="${WBA99_LOGO_URL}" alt="WBA99" class="logo" onerror="this.style.display='none'" />
      <div class="certificate-title">Massage Certificate</div>
      <div class="certificate-subtitle">Therapeutic Massage Specialist</div>
    </div>
    <div class="award-text">THIS CERTIFICATE IS PROUDLY PRESENTED TO</div>
    <div class="recipient-name">${physioName}</div>
    <div class="achievement-text">
      For successfully completing the <strong>WBA99 Massage Therapy Certification Examination</strong> 
      and demonstrating exceptional knowledge in Swedish Massage, Deep Tissue Techniques, 
      Myofascial Release, Trigger Point Therapy, and Clinical Safety Protocols.
    </div>
    <div class="expert-badge" style="text-align:center">
      <span>MASSAGE SPECIALIST CERTIFIED</span>
    </div>
    <div class="footer">
      <div class="footer-item">
        <div class="footer-label">Date</div>
        <div style="margin-top:5px">${currentDate}</div>
      </div>
      <div class="footer-item">
        <div class="seal">
          <div style="font-size:8px">CERTIFIED</div>
          <div style="font-size:14px">MSG</div>
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
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'WBA99 Massage Certificate' });
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
    const colors = ['#E91E63', '#AD1457', '#C2185B', '#D81B60', '#EC407A'];
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
            <MaterialCommunityIcons name="hand-heart" size={80} color="#E91E63" />
            <Text style={styles.startTitle}>Massage Certification Exam</Text>
            <Text style={styles.startSubtitle}>Therapeutic Massage Specialist</Text>
            
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
                <Ionicons name="help-circle" size={20} color="#E91E63" />
                <Text style={styles.examInfoText}>30 Questions</Text>
              </View>
              <View style={styles.examInfoRow}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                <Text style={styles.examInfoText}>Pass: 20/30 (66%)</Text>
              </View>
              <View style={styles.examInfoRow}>
                <Ionicons name="ribbon" size={20} color="#D4AF37" />
                <Text style={styles.examInfoText}>Massage Specialist Certificate</Text>
              </View>
            </View>

            <View style={styles.categoriesCard}>
              <Text style={styles.categoriesTitle}>Categories</Text>
              {['Swedish Massage', 'Deep Tissue', 'Myofascial Release', 'Trigger Points', 'Safety'].map((cat, idx) => (
                <View key={cat} style={styles.categoryRow}>
                  <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(idx) }]}>
                    <Text style={styles.categoryBadgeText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.categoryName}>{cat}</Text>
                  <Text style={styles.categoryQuestions}>6 Questions</Text>
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
    const categories = ['Swedish Massage', 'Deep Tissue', 'Myofascial Release', 'Trigger Points', 'Safety'];

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
              {passed ? `Well done, ${physioName}! You are now Massage Certified!` : 'You need 20 marks to pass.'}
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
                    <Text style={styles.downloadCertButtonText}>Download Massage Certificate</Text>
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
          <View style={[styles.progressBarFill, { width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%`, backgroundColor: '#E91E63' }]} />
        </View>

        <View style={[styles.categoryBadgeLarge, { backgroundColor: '#E91E63' }]}>
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
            <TouchableOpacity style={[styles.submitButton, { backgroundColor: '#E91E63' }]} onPress={handleSubmit}>
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
  categoryQuestions: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  startButton: { flexDirection: 'row', backgroundColor: '#E91E63', borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.xl, width: '100%', gap: theme.spacing.sm },
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
  questionNumber: { fontSize: theme.fontSize.sm, color: '#E91E63', fontWeight: theme.fontWeight.bold, marginBottom: theme.spacing.sm },
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
  dotCurrent: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
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
  downloadCertButton: { flexDirection: 'row', backgroundColor: '#880E4F', borderRadius: theme.borderRadius.md, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.lg, gap: theme.spacing.sm, minWidth: 200 },
  downloadCertButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  restartButton: { flexDirection: 'row', backgroundColor: '#E91E63', borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.lg, width: '100%', gap: theme.spacing.sm },
  restartButtonText: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  homeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.md, gap: theme.spacing.sm },
  homeButtonText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
});
