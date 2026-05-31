import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface CertificationExam {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  passingScore: number;
  timeLimit: string;
  questions: Question[];
}

const CERTIFICATION_EXAMS: Record<string, CertificationExam> = {
  'msk': {
    id: 'msk',
    title: 'MSK Assessment Certification',
    description: 'Test your knowledge on musculoskeletal screening and assessment',
    icon: 'bone',
    color: theme.colors.accent,
    passingScore: 70,
    timeLimit: '30 minutes',
    questions: [
      {
        id: 1,
        question: 'What is the cut-off composite score for the Y Balance Test that indicates increased injury risk?',
        options: ['Below 80%', 'Below 85%', 'Below 89%', 'Below 95%'],
        correctAnswer: 2,
        explanation: 'Research has shown that a composite score below 89% on the Y Balance Test indicates significantly increased injury risk.'
      },
      {
        id: 2,
        question: 'In the Single Leg Hamstring Bridge (SLHB) test, what asymmetry percentage is considered clinically significant?',
        options: ['Greater than 5%', 'Greater than 10%', 'Greater than 15%', 'Greater than 25%'],
        correctAnswer: 2,
        explanation: 'An asymmetry of greater than 15% between sides on the SLHB test is considered clinically significant and warrants intervention.'
      },
      {
        id: 3,
        question: 'What does GIRD stand for in shoulder assessment?',
        options: ['Glenohumeral Internal Rotation Deficit', 'General Internal Range Dysfunction', 'Glenohumeral Injury Recovery Diagnosis', 'General Impairment Rating Deficit'],
        correctAnswer: 0,
        explanation: 'GIRD stands for Glenohumeral Internal Rotation Deficit, commonly found in overhead athletes.'
      },
      {
        id: 4,
        question: 'A GIRD value greater than how many degrees is considered clinically significant?',
        options: ['10 degrees', '15 degrees', '18-20 degrees', '30 degrees'],
        correctAnswer: 2,
        explanation: 'GIRD greater than 18-20 degrees is considered clinically significant and associated with increased shoulder injury risk.'
      },
      {
        id: 5,
        question: 'What is the normal range for the Knee to Wall test?',
        options: ['Less than 5cm', '5-7cm', 'Greater than 10cm', 'Greater than 20cm'],
        correctAnswer: 2,
        explanation: 'A distance of greater than 10cm from the wall indicates good ankle dorsiflexion mobility.'
      },
      {
        id: 6,
        question: 'The Beighton Score is used to assess:',
        options: ['Muscle strength', 'Cardiovascular fitness', 'Generalized joint hypermobility', 'Balance'],
        correctAnswer: 2,
        explanation: 'The Beighton Score is a clinical tool used to assess generalized joint hypermobility.'
      },
      {
        id: 7,
        question: 'What Beighton Score indicates generalized hypermobility?',
        options: ['2 or above', '4 or above', '6 or above', '8 or above'],
        correctAnswer: 1,
        explanation: 'A Beighton Score of 4 or above (out of 9) indicates generalized joint hypermobility.'
      },
      {
        id: 8,
        question: 'When assessing Total Arc of Motion (TAOM) in the shoulder, what asymmetry is considered pathological?',
        options: ['Greater than 2 degrees', 'Greater than 5 degrees', 'Greater than 10 degrees', 'Greater than 15 degrees'],
        correctAnswer: 1,
        explanation: 'A TAOM asymmetry greater than 5 degrees compared to the opposite side is considered pathological.'
      },
      {
        id: 9,
        question: 'The anterior reach asymmetry threshold for the Y Balance Test is:',
        options: ['Greater than 2cm', 'Greater than 4cm', 'Greater than 6cm', 'Greater than 10cm'],
        correctAnswer: 1,
        explanation: 'An anterior reach asymmetry greater than 4cm on the Y Balance Test is considered significant for injury risk.'
      },
      {
        id: 10,
        question: 'Which test involves touching the thumb to the forearm?',
        options: ['Thomas Test', 'Beighton Score', 'SLHB Test', 'Y Balance Test'],
        correctAnswer: 1,
        explanation: 'Passive thumb to forearm apposition is one of the components of the Beighton Score for hypermobility.'
      }
    ]
  },
  'fms': {
    id: 'fms',
    title: 'FMS Certification Exam',
    description: 'Functional Movement Screen specialist certification',
    icon: 'human-handsup',
    color: theme.colors.success,
    passingScore: 70,
    timeLimit: '30 minutes',
    questions: [
      {
        id: 1,
        question: 'How many fundamental movement patterns are assessed in the FMS?',
        options: ['5', '6', '7', '8'],
        correctAnswer: 2,
        explanation: 'The FMS assesses 7 fundamental movement patterns: Deep Squat, Hurdle Step, Inline Lunge, Shoulder Mobility, ASLR, Trunk Stability Push-up, and Rotary Stability.'
      },
      {
        id: 2,
        question: 'What score is given when pain is experienced during an FMS movement?',
        options: ['0', '1', '2', '3'],
        correctAnswer: 0,
        explanation: 'A score of 0 is always given when pain is experienced during any portion of the FMS movement.'
      },
      {
        id: 3,
        question: 'What composite FMS score indicates increased injury risk?',
        options: ['Below 10', 'Below 12', 'Below 14', 'Below 16'],
        correctAnswer: 2,
        explanation: 'Research by Kiesel et al. found that a composite FMS score of 14 or below indicates significantly increased injury risk.'
      },
      {
        id: 4,
        question: 'In the Deep Squat, the heel lift modification is used when:',
        options: ['The athlete scores a 3', 'The athlete scores less than 3', 'The athlete experiences pain', 'The athlete requests it'],
        correctAnswer: 1,
        explanation: 'If an athlete cannot achieve a score of 3 on the Deep Squat, the heel lift modification (2x6 board) is used.'
      },
      {
        id: 5,
        question: 'What is the correct height for the hurdle in the Hurdle Step test?',
        options: ['Knee height', 'Tibial tuberosity height', 'Mid-thigh height', 'Ankle height'],
        correctAnswer: 1,
        explanation: 'The hurdle is set at the height of the tibial tuberosity for the Hurdle Step test.'
      },
      {
        id: 6,
        question: 'In the Shoulder Mobility test, what is used as the reference measurement?',
        options: ['Arm length', 'Hand span', 'Shoulder width', 'Chest width'],
        correctAnswer: 1,
        explanation: 'Hand span (tip of thumb to tip of fifth finger) is used as the reference measurement for the Shoulder Mobility test.'
      },
      {
        id: 7,
        question: 'The clearing test for Shoulder Mobility assesses for:',
        options: ['Hypermobility', 'Impingement', 'Rotator cuff strength', 'Scapular winging'],
        correctAnswer: 1,
        explanation: 'The impingement clearing test is performed for the Shoulder Mobility test when scores of 1 or 2 are achieved.'
      },
      {
        id: 8,
        question: 'In the Active Straight Leg Raise, the dowel is placed at:',
        options: ['The knee', 'The hip', 'Midpoint between ASIS and knee', 'The ankle'],
        correctAnswer: 2,
        explanation: 'The dowel is placed at the midpoint between the ASIS and the knee joint center.'
      },
      {
        id: 9,
        question: 'For the Trunk Stability Push-up, where should men\'s thumbs be positioned for a score of 3?',
        options: ['At chin level', 'At forehead level', 'At top of head', 'At chest level'],
        correctAnswer: 1,
        explanation: 'For men to achieve a score of 3, thumbs must be at forehead level during the push-up.'
      },
      {
        id: 10,
        question: 'In the Rotary Stability test, performing the unilateral (same side) pattern earns what score?',
        options: ['1', '2', '3', 'Depends on form'],
        correctAnswer: 2,
        explanation: 'Successfully performing the unilateral (same side arm and leg) pattern in Rotary Stability earns a score of 3.'
      }
    ]
  },
  'psychology': {
    id: 'psychology',
    title: 'Sports Psychology Certification',
    description: 'Mental performance specialist certification exam',
    icon: 'head-heart',
    color: '#E91E63',
    passingScore: 70,
    timeLimit: '30 minutes',
    questions: [
      {
        id: 1,
        question: 'According to research, what percentage of elite athletic success is attributed to mental factors?',
        options: ['10-20%', '30-40%', '50-90%', '100%'],
        correctAnswer: 2,
        explanation: 'Research consistently shows that elite athletes attribute 50-90% of their success to mental factors.'
      },
      {
        id: 2,
        question: 'The Inverted-U Hypothesis describes the relationship between:',
        options: ['Age and performance', 'Arousal and performance', 'Training and recovery', 'Nutrition and strength'],
        correctAnswer: 1,
        explanation: 'The Inverted-U Hypothesis describes how performance increases with arousal up to an optimal point, then decreases.'
      },
      {
        id: 3,
        question: 'According to Bandura, which source of self-efficacy is the most powerful?',
        options: ['Verbal persuasion', 'Vicarious experiences', 'Performance accomplishments', 'Physiological states'],
        correctAnswer: 2,
        explanation: 'Performance accomplishments (past successes) are the most powerful source of self-efficacy.'
      },
      {
        id: 4,
        question: 'What does the "P" in the PETTLEP imagery model stand for?',
        options: ['Performance', 'Physical', 'Psychological', 'Practice'],
        correctAnswer: 1,
        explanation: 'P stands for Physical - matching the physical position during imagery practice.'
      },
      {
        id: 5,
        question: 'Which type of goal provides the MOST control for the athlete?',
        options: ['Outcome goals', 'Performance goals', 'Process goals', 'Team goals'],
        correctAnswer: 2,
        explanation: 'Process goals (focusing on behaviors and actions) provide the most control as they depend only on the athlete.'
      },
      {
        id: 6,
        question: 'The 4 Cs model of mental toughness includes all EXCEPT:',
        options: ['Control', 'Commitment', 'Creativity', 'Challenge'],
        correctAnswer: 2,
        explanation: 'The 4 Cs are Control, Commitment, Challenge, and Confidence. Creativity is not part of this model.'
      },
      {
        id: 7,
        question: 'Progressive Muscle Relaxation (PMR) primarily addresses:',
        options: ['Cognitive anxiety', 'Somatic anxiety', 'Trait anxiety', 'Social anxiety'],
        correctAnswer: 1,
        explanation: 'PMR primarily addresses somatic (physical) anxiety through systematic muscle tension and release.'
      },
      {
        id: 8,
        question: 'In the context of imagery, what does "internal perspective" mean?',
        options: ['Focusing on internal organs', 'Seeing through your own eyes', 'Using internal motivation', 'Internalizing feedback'],
        correctAnswer: 1,
        explanation: 'Internal (first-person) perspective means seeing the imagery through your own eyes.'
      },
      {
        id: 9,
        question: 'Centering is a technique best used:',
        options: ['During off-season training', 'Immediately before performance', 'After competition', 'During sleep'],
        correctAnswer: 1,
        explanation: 'Centering is a brief focusing technique (30 seconds) ideal for use immediately before performance.'
      },
      {
        id: 10,
        question: 'SMART goals should be all of the following EXCEPT:',
        options: ['Specific', 'Measurable', 'Simple', 'Time-bound'],
        correctAnswer: 2,
        explanation: 'SMART stands for Specific, Measurable, Achievable, Relevant, and Time-bound. Simple is not part of this acronym.'
      }
    ]
  },
  'snc': {
    id: 'snc',
    title: 'Strength & Conditioning Certification',
    description: 'S&C specialist certification based on CSCS/ASCA standards',
    icon: 'dumbbell',
    color: '#FF5722',
    passingScore: 70,
    timeLimit: '45 minutes',
    questions: [
      {
        id: 1,
        question: 'The CSCS certification is offered by which organization?',
        options: ['ACSM', 'NSCA', 'NASM', 'ACE'],
        correctAnswer: 1,
        explanation: 'The Certified Strength and Conditioning Specialist (CSCS) certification is offered by the NSCA.'
      },
      {
        id: 2,
        question: 'In traditional (linear) periodization, as the training phase progresses:',
        options: ['Volume increases, intensity decreases', 'Volume decreases, intensity increases', 'Both volume and intensity increase', 'Both volume and intensity decrease'],
        correctAnswer: 1,
        explanation: 'In traditional periodization, volume decreases and intensity increases as the athlete approaches competition.'
      },
      {
        id: 3,
        question: 'What is the recommended rest period between sets for maximal strength development?',
        options: ['30-60 seconds', '1-2 minutes', '2-5 minutes', '5-10 minutes'],
        correctAnswer: 2,
        explanation: 'For maximal strength development, 2-5 minutes of rest between sets is recommended to allow ATP-PC recovery.'
      },
      {
        id: 4,
        question: 'The force-velocity relationship shows that as velocity increases:',
        options: ['Force increases', 'Force decreases', 'Force stays the same', 'Force becomes unpredictable'],
        correctAnswer: 1,
        explanation: 'The force-velocity curve shows an inverse relationship - as velocity increases, force production decreases.'
      },
      {
        id: 5,
        question: 'The ATP-PC energy system is predominant during efforts lasting:',
        options: ['0-10 seconds', '30-60 seconds', '2-3 minutes', '5+ minutes'],
        correctAnswer: 0,
        explanation: 'The phosphagen (ATP-PC) system is the primary energy source for maximal efforts lasting 0-10 seconds.'
      },
      {
        id: 6,
        question: 'Which exercise should be performed FIRST in a training session?',
        options: ['Bicep curls', 'Leg extensions', 'Power cleans', 'Crunches'],
        correctAnswer: 2,
        explanation: 'Olympic lifts like power cleans should be performed first when the athlete is freshest, as they are most technically demanding.'
      },
      {
        id: 7,
        question: 'What load range is typically used for maximal strength training?',
        options: ['40-60% 1RM', '60-70% 1RM', '70-100% 1RM', '30-50% 1RM'],
        correctAnswer: 2,
        explanation: 'Maximal strength training typically uses loads of 70-100% of 1RM with lower repetitions.'
      },
      {
        id: 8,
        question: 'Plyometric training primarily develops:',
        options: ['Muscular endurance', 'Flexibility', 'Reactive strength', 'Cardiovascular fitness'],
        correctAnswer: 2,
        explanation: 'Plyometric training develops reactive strength through the stretch-shortening cycle.'
      },
      {
        id: 9,
        question: 'The optimal Acute:Chronic Workload Ratio (ACWR) range is:',
        options: ['0.5-0.7', '0.8-1.3', '1.5-2.0', '2.0-2.5'],
        correctAnswer: 1,
        explanation: 'An ACWR between 0.8-1.3 is considered optimal for reducing injury risk while maintaining training adaptation.'
      },
      {
        id: 10,
        question: 'Block periodization typically includes which phases?',
        options: ['Warm-up, main, cool-down', 'Accumulation, transmutation, realization', 'Morning, afternoon, evening', 'Light, medium, heavy'],
        correctAnswer: 1,
        explanation: 'Block periodization uses Accumulation (volume), Transmutation (sport-specific), and Realization (peaking) blocks.'
      },
      {
        id: 11,
        question: 'Which test measures lower body power using the stretch-shortening cycle?',
        options: ['1RM Squat', 'Countermovement Jump', 'Plank hold', 'Yo-Yo test'],
        correctAnswer: 1,
        explanation: 'The Countermovement Jump (CMJ) measures lower body power utilizing the stretch-shortening cycle.'
      },
      {
        id: 12,
        question: 'Undulating periodization is best suited for:',
        options: ['Individual sports with clear peaking', 'Team sports with long seasons', 'Beginners only', 'Rehabilitation only'],
        correctAnswer: 1,
        explanation: 'Undulating (non-linear) periodization suits team sports with long seasons requiring maintained fitness.'
      }
    ]
  },
  'massage': {
    id: 'massage',
    title: 'Massage Therapy Certification',
    description: 'Therapeutic massage specialist exam',
    icon: 'hand-heart',
    color: '#9C27B0',
    passingScore: 70,
    timeLimit: '30 minutes',
    questions: [
      {
        id: 1,
        question: 'Effleurage is characterized by:',
        options: ['Deep kneading strokes', 'Light, gliding strokes', 'Tapping movements', 'Vibration techniques'],
        correctAnswer: 1,
        explanation: 'Effleurage consists of light, gliding strokes typically used at the beginning and end of massage.'
      },
      {
        id: 2,
        question: 'Petrissage involves:',
        options: ['Gliding strokes', 'Kneading and lifting tissues', 'Percussion', 'Static pressure'],
        correctAnswer: 1,
        explanation: 'Petrissage involves kneading, lifting, and squeezing soft tissues.'
      },
      {
        id: 3,
        question: 'What is the primary contraindication for deep tissue massage?',
        options: ['Muscle tension', 'Acute inflammation or injury', 'Stress', 'Poor posture'],
        correctAnswer: 1,
        explanation: 'Acute inflammation or injury is a contraindication for deep tissue massage as it may worsen the condition.'
      },
      {
        id: 4,
        question: 'Trigger points are best described as:',
        options: ['Acupuncture points', 'Hyperirritable spots in taut muscle bands', 'Lymph nodes', 'Nerve endings'],
        correctAnswer: 1,
        explanation: 'Trigger points are hyperirritable spots within taut bands of skeletal muscle that refer pain.'
      },
      {
        id: 5,
        question: 'The direction of massage strokes for lymphatic drainage should be:',
        options: ['Away from the heart', 'Toward the heart', 'Circular only', 'In any direction'],
        correctAnswer: 1,
        explanation: 'Lymphatic drainage massage uses light strokes directed toward the heart and lymph nodes.'
      },
      {
        id: 6,
        question: 'Sports massage is typically performed:',
        options: ['Only before events', 'Only after events', 'Before, during, or after events', 'Only during injury'],
        correctAnswer: 2,
        explanation: 'Sports massage can be performed pre-event, inter-event, post-event, or as maintenance.'
      },
      {
        id: 7,
        question: 'Friction massage is primarily used to:',
        options: ['Relax muscles', 'Break down adhesions and scar tissue', 'Improve circulation only', 'Reduce swelling'],
        correctAnswer: 1,
        explanation: 'Cross-fiber friction massage is used to break down adhesions, scar tissue, and realign collagen fibers.'
      },
      {
        id: 8,
        question: 'Which massage technique uses percussion movements?',
        options: ['Effleurage', 'Petrissage', 'Tapotement', 'Myofascial release'],
        correctAnswer: 2,
        explanation: 'Tapotement involves rhythmic percussion movements including cupping, hacking, and tapping.'
      },
      {
        id: 9,
        question: 'Myofascial release targets:',
        options: ['Only muscles', 'Only joints', 'Fascia and connective tissue', 'Only nerves'],
        correctAnswer: 2,
        explanation: 'Myofascial release specifically targets restrictions in the fascia and connective tissue.'
      },
      {
        id: 10,
        question: 'The recommended duration for a typical full-body massage is:',
        options: ['15-20 minutes', '30-60 minutes', '60-90 minutes', '2-3 hours'],
        correctAnswer: 2,
        explanation: 'A typical full-body massage session lasts 60-90 minutes to adequately address all body regions.'
      }
    ]
  }
};

export default function CertificationExam() {
  const router = useRouter();
  const { type } = useLocalSearchParams();
  
  const examType = Array.isArray(type) ? type[0] : type || 'msk';
  const exam = CERTIFICATION_EXAMS[examType] || CERTIFICATION_EXAMS['msk'];
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  };

  const handleNextQuestion = () => {
    if (selectedAnswer !== null) {
      setAnswers(prev => ({ ...prev, [currentQuestion]: selectedAnswer }));
      if (currentQuestion < exam.questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer(null);
      } else {
        setShowResults(true);
      }
    } else {
      Alert.alert('Select Answer', 'Please select an answer before continuing.');
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      setSelectedAnswer(answers[currentQuestion - 1] ?? null);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    exam.questions.forEach((q, index) => {
      if (answers[index] === q.correctAnswer) {
        correct++;
      }
    });
    return {
      correct,
      total: exam.questions.length,
      percentage: Math.round((correct / exam.questions.length) * 100),
      passed: Math.round((correct / exam.questions.length) * 100) >= exam.passingScore
    };
  };

  if (showResults) {
    const score = calculateScore();
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Exam Results</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={[styles.resultCard, { borderColor: score.passed ? theme.colors.success : theme.colors.error }]}>
            <MaterialCommunityIcons 
              name={score.passed ? 'trophy' : 'close-circle'} 
              size={64} 
              color={score.passed ? theme.colors.success : theme.colors.error} 
            />
            <Text style={[styles.resultTitle, { color: score.passed ? theme.colors.success : theme.colors.error }]}>
              {score.passed ? 'PASSED!' : 'NOT PASSED'}
            </Text>
            <Text style={styles.scoreText}>{score.percentage}%</Text>
            <Text style={styles.scoreDetails}>
              {score.correct} out of {score.total} questions correct
            </Text>
            <Text style={styles.passingText}>Passing score: {exam.passingScore}%</Text>
          </View>

          {/* Review Answers */}
          <Text style={styles.sectionTitle}>Review Answers</Text>
          {exam.questions.map((question, index) => {
            const userAnswer = answers[index];
            const isCorrect = userAnswer === question.correctAnswer;
            return (
              <View key={index} style={[styles.reviewCard, { borderColor: isCorrect ? theme.colors.success : theme.colors.error }]}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewNumber}>Q{index + 1}</Text>
                  <Ionicons 
                    name={isCorrect ? 'checkmark-circle' : 'close-circle'} 
                    size={24} 
                    color={isCorrect ? theme.colors.success : theme.colors.error} 
                  />
                </View>
                <Text style={styles.reviewQuestion}>{question.question}</Text>
                <Text style={[styles.reviewAnswer, { color: isCorrect ? theme.colors.success : theme.colors.error }]}>
                  Your answer: {question.options[userAnswer]}
                </Text>
                {!isCorrect && (
                  <Text style={[styles.reviewAnswer, { color: theme.colors.success }]}>
                    Correct answer: {question.options[question.correctAnswer]}
                  </Text>
                )}
                <Text style={styles.explanation}>{question.explanation}</Text>
              </View>
            );
          })}

          <TouchableOpacity 
            style={styles.retakeButton}
            onPress={() => {
              setAnswers({});
              setCurrentQuestion(0);
              setSelectedAnswer(null);
              setShowResults(false);
            }}
          >
            <Ionicons name="refresh" size={20} color={theme.colors.textPrimary} />
            <Text style={styles.retakeButtonText}>Retake Exam</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const question = exam.questions[currentQuestion];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{exam.title}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${((currentQuestion + 1) / exam.questions.length) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Question {currentQuestion + 1} of {exam.questions.length}
          </Text>
        </View>

        {/* Question Card */}
        <View style={[styles.questionCard, { borderColor: exam.color }]}>
          <View style={[styles.questionNumber, { backgroundColor: exam.color }]}>
            <Text style={styles.questionNumberText}>Q{currentQuestion + 1}</Text>
          </View>
          <Text style={styles.questionText}>{question.question}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                selectedAnswer === index && styles.optionButtonSelected,
                selectedAnswer === index && { borderColor: exam.color, backgroundColor: exam.color + '20' }
              ]}
              onPress={() => handleAnswerSelect(index)}
            >
              <View style={[
                styles.optionLetter,
                selectedAnswer === index && { backgroundColor: exam.color }
              ]}>
                <Text style={[
                  styles.optionLetterText,
                  selectedAnswer === index && { color: theme.colors.textPrimary }
                ]}>
                  {String.fromCharCode(65 + index)}
                </Text>
              </View>
              <Text style={[
                styles.optionText,
                selectedAnswer === index && { color: theme.colors.textPrimary }
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={[styles.navButton, currentQuestion === 0 && styles.navButtonDisabled]}
            onPress={handlePreviousQuestion}
            disabled={currentQuestion === 0}
          >
            <Ionicons name="arrow-back" size={20} color={currentQuestion === 0 ? theme.colors.textMuted : theme.colors.textPrimary} />
            <Text style={[styles.navButtonText, currentQuestion === 0 && styles.navButtonTextDisabled]}>Previous</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.nextButton, { backgroundColor: exam.color }]}
            onPress={handleNextQuestion}
          >
            <Text style={styles.nextButtonText}>
              {currentQuestion === exam.questions.length - 1 ? 'Finish' : 'Next'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  scrollContent: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  backButton: { padding: theme.spacing.xs },
  headerTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, flex: 1, textAlign: 'center' },

  progressContainer: { marginBottom: theme.spacing.lg },
  progressBar: { height: 8, backgroundColor: theme.colors.card, borderRadius: 4, overflow: 'hidden', marginBottom: theme.spacing.xs },
  progressFill: { height: '100%', backgroundColor: theme.colors.accent, borderRadius: 4 },
  progressText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, textAlign: 'center' },

  questionCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.lg, borderWidth: 2 },
  questionNumber: { alignSelf: 'flex-start', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.md },
  questionNumberText: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  questionText: { fontSize: theme.fontSize.md, color: theme.colors.textPrimary, lineHeight: 26 },

  optionsContainer: { marginBottom: theme.spacing.lg },
  optionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 2, borderColor: theme.colors.cardBorder },
  optionButtonSelected: { borderWidth: 2 },
  optionLetter: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  optionLetterText: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textSecondary },
  optionText: { flex: 1, fontSize: theme.fontSize.md, color: theme.colors.textSecondary },

  navigationButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md },
  navButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.card },
  navButtonDisabled: { opacity: 0.5 },
  navButtonText: { fontSize: theme.fontSize.md, color: theme.colors.textPrimary },
  navButtonTextDisabled: { color: theme.colors.textMuted },
  nextButton: { backgroundColor: theme.colors.accent },
  nextButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },

  // Results styles
  resultCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.xl, alignItems: 'center', marginBottom: theme.spacing.lg, borderWidth: 3 },
  resultTitle: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, marginTop: theme.spacing.md },
  scoreText: { fontSize: 64, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  scoreDetails: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  passingText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: theme.spacing.xs },

  sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  reviewCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderLeftWidth: 4 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xs },
  reviewNumber: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textMuted },
  reviewQuestion: { fontSize: theme.fontSize.sm, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  reviewAnswer: { fontSize: theme.fontSize.sm, marginBottom: theme.spacing.xs },
  explanation: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, fontStyle: 'italic', marginTop: theme.spacing.sm },

  retakeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.accent, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.lg },
  retakeButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
});
