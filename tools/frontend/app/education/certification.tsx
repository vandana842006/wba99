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
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import api from '../../src/utils/api';

// WBA99 Logo URL
const WBA99_LOGO_URL = 'https://customer-assets.emergentagent.com/job_msk-motion-analysis/artifacts/neprg3w5_file_00000000ef5472098a7dfe442c2153e1%20%281%29.png';

// Base64 encoded logo placeholder - using SVG for reliability
const WBA99_LOGO_SVG = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGNpcmNsZSBjeD0iMTAwIiBjeT0iMTAwIiByPSI5NSIgZmlsbD0iIzhCNDUxMyIgc3Ryb2tlPSIjRDRBRjM3IiBzdHJva2Utd2lkdGg9IjgiLz4KICA8Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9Ijc1IiBmaWxsPSJub25lIiBzdHJva2U9IiNENEFGMzciIHN0cm9rZS13aWR0aD0iMiIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjRDRBRjM3IiBmb250LWZhbWlseT0iR2VvcmdpYSwgc2VyaWYiIGZvbnQtc2l6ZT0iNDAiIGZvbnQtd2VpZ2h0PSJib2xkIj5XQkE5OTwvdGV4dD4KICA8dGV4dCB4PSI1MCUiIHk9IjYwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0Q0QUYzNyIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIj5NU0svRk1TPC90ZXh0PgogIDx0ZXh0IHg9IjUwJSIgeT0iNzUlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjRDRBRjM3IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiPkFOQUxZU0lTPC90ZXh0Pgo8L3N2Zz4=`;

// Question type
interface Question {
  id: number;
  category: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

// 30 MCQ Questions - 6 each for Posture, MSK, Walking, Anatomy, Biomechanics
const QUESTIONS: Question[] = [
  // POSTURE QUESTIONS (1-6)
  { id: 1, category: 'Posture', question: 'What is the ideal alignment of the ear in relation to the shoulder in lateral posture assessment?', options: ['Ear should be forward of shoulder', 'Ear should be directly over the shoulder', 'Ear should be behind the shoulder', 'Ear position does not matter'], correctAnswer: 1 },
  { id: 2, category: 'Posture', question: 'Which spinal curve is considered normal in the cervical region?', options: ['Kyphosis', 'Lordosis', 'Scoliosis', 'Flat'], correctAnswer: 1 },
  { id: 3, category: 'Posture', question: 'Forward head posture typically results in:', options: ['Decreased cervical lordosis', 'Increased cervical lordosis', 'Increased thoracic lordosis', 'Decreased lumbar lordosis'], correctAnswer: 1 },
  { id: 4, category: 'Posture', question: 'What does ASIS stand for in postural assessment?', options: ['Anterior Superior Iliac Spine', 'Anterior Sacral Iliac Structure', 'Anterior Spinal Iliac Segment', 'Anterior Superior Ischial Spine'], correctAnswer: 0 },
  { id: 5, category: 'Posture', question: 'Hyperlordosis of the lumbar spine is commonly associated with:', options: ['Weak hip flexors', 'Tight hip flexors', 'Weak quadriceps', 'Tight hamstrings'], correctAnswer: 1 },
  { id: 6, category: 'Posture', question: 'In ideal standing posture, the plumb line should pass through:', options: ['Anterior to the ankle', 'Through the ankle joint', 'Posterior to the ankle', 'Through the heel'], correctAnswer: 1 },

  // MSK QUESTIONS (7-12)
  { id: 7, category: 'MSK', question: 'The normal range for the Knee to Wall test is:', options: ['≥10 cm', '≥14 cm', '≥18 cm', '≥22 cm'], correctAnswer: 1 },
  { id: 8, category: 'MSK', question: 'Y Balance Test assesses:', options: ['Strength only', 'Dynamic balance and stability', 'Flexibility only', 'Cardiovascular fitness'], correctAnswer: 1 },
  { id: 9, category: 'MSK', question: 'Single Leg Hamstring Bridge test primarily assesses:', options: ['Quadriceps strength', 'Hamstring strength and endurance', 'Calf strength', 'Hip flexor flexibility'], correctAnswer: 1 },
  { id: 10, category: 'MSK', question: 'GIRD stands for:', options: ['Glenohumeral Internal Rotation Deficit', 'Greater Internal Rotation Difference', 'Glenohumeral Inferior Rotation Deficit', 'General Internal Rotation Dysfunction'], correctAnswer: 0 },
  { id: 11, category: 'MSK', question: 'Normal plank hold time for core assessment is:', options: ['60 seconds', '90 seconds', '120 seconds', '180 seconds'], correctAnswer: 2 },
  { id: 12, category: 'MSK', question: 'The Keibler test assesses:', options: ['Hip mobility', 'Scapular position and control', 'Knee stability', 'Ankle flexibility'], correctAnswer: 1 },

  // WALKING QUESTIONS (13-18)
  { id: 13, category: 'Walking', question: 'Normal walking cadence is approximately:', options: ['80-90 steps/min', '100-120 steps/min', '130-150 steps/min', '160-180 steps/min'], correctAnswer: 1 },
  { id: 14, category: 'Walking', question: 'The stance phase of gait comprises approximately what percentage of the gait cycle?', options: ['40%', '50%', '60%', '70%'], correctAnswer: 2 },
  { id: 15, category: 'Walking', question: 'Heel strike occurs during which phase?', options: ['Initial contact', 'Mid stance', 'Terminal stance', 'Pre-swing'], correctAnswer: 0 },
  { id: 16, category: 'Walking', question: 'Trendelenburg gait indicates weakness of:', options: ['Quadriceps', 'Hip abductors', 'Hamstrings', 'Ankle dorsiflexors'], correctAnswer: 1 },
  { id: 17, category: 'Walking', question: 'Step length is defined as:', options: ['Distance from heel to heel of same foot', 'Distance from heel of one foot to heel of other foot', 'Distance covered in one second', 'Number of steps per minute'], correctAnswer: 1 },
  { id: 18, category: 'Walking', question: 'Antalgic gait is characterized by:', options: ['Wide base of support', 'Short stance phase on affected side', 'Excessive hip flexion', 'Foot drop'], correctAnswer: 1 },

  // ANATOMY QUESTIONS (19-24)
  { id: 19, category: 'Anatomy', question: 'The rotator cuff consists of how many muscles?', options: ['2', '3', '4', '5'], correctAnswer: 2 },
  { id: 20, category: 'Anatomy', question: 'Which muscle is NOT part of the quadriceps?', options: ['Rectus femoris', 'Vastus lateralis', 'Sartorius', 'Vastus medialis'], correctAnswer: 2 },
  { id: 21, category: 'Anatomy', question: 'The sciatic nerve originates from which spinal levels?', options: ['L1-L3', 'L2-L4', 'L4-S3', 'S1-S4'], correctAnswer: 2 },
  { id: 22, category: 'Anatomy', question: 'The ACL prevents:', options: ['Posterior tibial translation', 'Anterior tibial translation', 'Medial tibial rotation', 'Lateral tibial rotation'], correctAnswer: 1 },
  { id: 23, category: 'Anatomy', question: 'The gluteus maximus is primarily a:', options: ['Hip flexor', 'Hip extensor', 'Hip abductor', 'Hip adductor'], correctAnswer: 1 },
  { id: 24, category: 'Anatomy', question: 'How many cervical vertebrae are there?', options: ['5', '6', '7', '8'], correctAnswer: 2 },

  // BIOMECHANICS QUESTIONS (25-30)
  { id: 25, category: 'Biomechanics', question: 'A first-class lever has the fulcrum:', options: ['At one end', 'Between the effort and resistance', 'At the resistance', 'There is no fulcrum'], correctAnswer: 1 },
  { id: 26, category: 'Biomechanics', question: 'Ground reaction force during walking is typically:', options: ['Less than body weight', 'Equal to body weight', '1.0-1.5 times body weight', '2-3 times body weight'], correctAnswer: 2 },
  { id: 27, category: 'Biomechanics', question: 'The Q-angle is measured between:', options: ['Femur and tibia', 'Quadriceps line and patellar tendon', 'Hip and knee', 'Pelvis and femur'], correctAnswer: 1 },
  { id: 28, category: 'Biomechanics', question: 'Normal Q-angle in females is approximately:', options: ['10-12 degrees', '13-18 degrees', '19-22 degrees', '23-28 degrees'], correctAnswer: 1 },
  { id: 29, category: 'Biomechanics', question: 'Center of mass in standing is located approximately at:', options: ['T12 vertebra', 'L3 vertebra', 'S2 vertebra', 'Hip joint'], correctAnswer: 2 },
  { id: 30, category: 'Biomechanics', question: 'Closed kinetic chain exercises involve:', options: ['Distal segment free to move', 'Distal segment fixed', 'No resistance', 'Only upper body'], correctAnswer: 1 },
];

const PASSING_SCORE = 20;

export default function CertificationExam() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [physioName, setPhysioName] = useState('');
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);
  const [certificateGenerated, setCertificateGenerated] = useState(false);
  
  // QR Payment States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    fetchQRCode();
  }, []);

  const fetchQRCode = async () => {
    try {
      const response = await api.get('/qr-codes/active');
      setQrCode(response.data.qr_image_url);
    } catch (error) {
      console.log('No active QR code found');
    }
  };

  const pickPaymentScreenshot = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setPaymentScreenshot(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const submitPaymentProof = async () => {
    if (!paymentScreenshot) {
      Alert.alert('Required', 'Please upload payment screenshot');
      return;
    }
    setSubmittingPayment(true);
    try {
      await api.post('/payment-proofs', {
        physio_id: 'certification_exam',
        report_type: 'certificate',
        screenshot_url: paymentScreenshot,
        amount: 500,
      });
      setPaymentVerified(true);
      setShowPaymentModal(false);
      Alert.alert('Success', 'Payment verified! You can now download your certificate.');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit payment. Please try again.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleDownloadCertificate = () => {
    if (qrCode && !paymentVerified) {
      setShowPaymentModal(true);
    } else {
      generateCertificatePDF();
    }
  };

  // Generate Certificate PDF - Matching provided design
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

    const certificateNumber = `WBA99-CERT-${Date.now().toString(36).toUpperCase()}`;

    // Certificate design matching the provided sample
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Montserrat:wght@300;400;600;700&family=Great+Vibes&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Montserrat', sans-serif;
      background: #f0f0f0;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    
    .certificate {
      width: 100%;
      max-width: 800px;
      background: white;
      border: 15px solid #8B4513;
      position: relative;
      padding: 40px;
    }
    
    .certificate::before {
      content: '';
      position: absolute;
      top: 10px;
      left: 10px;
      right: 10px;
      bottom: 10px;
      border: 3px solid #D4AF37;
      pointer-events: none;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .logo-container {
      margin-bottom: 15px;
    }
    
    .logo {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      border: 4px solid #D4AF37;
    }
    
    .certificate-title {
      font-family: 'Playfair Display', serif;
      font-size: 42px;
      font-weight: 700;
      color: #8B4513;
      margin-bottom: 5px;
      letter-spacing: 3px;
    }
    
    .certificate-subtitle {
      font-size: 16px;
      color: #666;
      letter-spacing: 5px;
      text-transform: uppercase;
    }
    
    .award-text {
      text-align: center;
      margin: 30px 0 20px;
      font-size: 14px;
      color: #666;
      letter-spacing: 3px;
    }
    
    .recipient-name {
      text-align: center;
      font-family: 'Great Vibes', cursive;
      font-size: 52px;
      color: #1a1a2e;
      margin: 20px 0;
      border-bottom: 2px solid #D4AF37;
      padding-bottom: 10px;
      display: inline-block;
      width: 100%;
    }
    
    .achievement-text {
      text-align: center;
      font-size: 14px;
      color: #555;
      line-height: 1.8;
      margin: 20px auto;
      max-width: 600px;
    }
    
    .expert-badge {
      text-align: center;
      margin: 25px 0;
    }
    
    .expert-badge span {
      display: inline-block;
      background: linear-gradient(135deg, #D4AF37 0%, #FFD700 50%, #D4AF37 100%);
      color: #1a1a2e;
      font-size: 24px;
      font-weight: 700;
      padding: 12px 40px;
      letter-spacing: 4px;
      border-radius: 5px;
    }
    
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 40px;
      padding-top: 20px;
    }
    
    .footer-item {
      text-align: center;
      flex: 1;
    }
    
    .signature-line {
      width: 180px;
      border-bottom: 2px solid #333;
      margin: 0 auto 10px;
    }
    
    .signature-name {
      font-family: 'Great Vibes', cursive;
      font-size: 24px;
      color: #333;
      margin-bottom: 5px;
    }
    
    .footer-label {
      font-size: 11px;
      color: #666;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    
    .footer-value {
      font-size: 13px;
      color: #333;
      margin-top: 5px;
    }
    
    .seal {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #D4AF37 0%, #8B4513 100%);
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: white;
      font-weight: bold;
      border: 3px solid #D4AF37;
      margin: 0 auto;
    }
    
    .seal-text {
      font-size: 8px;
      letter-spacing: 1px;
    }
    
    .seal-main {
      font-size: 14px;
      margin: 2px 0;
    }
    
    .corner-decoration {
      position: absolute;
      width: 60px;
      height: 60px;
    }
    
    .corner-decoration.top-left { top: 25px; left: 25px; border-top: 3px solid #D4AF37; border-left: 3px solid #D4AF37; }
    .corner-decoration.top-right { top: 25px; right: 25px; border-top: 3px solid #D4AF37; border-right: 3px solid #D4AF37; }
    .corner-decoration.bottom-left { bottom: 25px; left: 25px; border-bottom: 3px solid #D4AF37; border-left: 3px solid #D4AF37; }
    .corner-decoration.bottom-right { bottom: 25px; right: 25px; border-bottom: 3px solid #D4AF37; border-right: 3px solid #D4AF37; }
    
    .cert-number {
      text-align: center;
      margin-top: 20px;
      font-size: 10px;
      color: #999;
      letter-spacing: 2px;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="corner-decoration top-left"></div>
    <div class="corner-decoration top-right"></div>
    <div class="corner-decoration bottom-left"></div>
    <div class="corner-decoration bottom-right"></div>
    
    <div class="header">
      <div class="logo-container">
        <img src="${WBA99_LOGO_URL}" alt="WBA99" class="logo" onerror="this.style.display='none'" />
      </div>
      <div class="certificate-title">Certificate</div>
      <div class="certificate-subtitle">of Achievement</div>
    </div>
    
    <div class="award-text">THIS CERTIFICATE IS PROUDLY PRESENTED TO</div>
    
    <div class="recipient-name">${physioName}</div>
    
    <div class="achievement-text">
      For successfully completing the <strong>WBA99 MSK/FMS Certification Examination</strong> 
      and demonstrating exceptional knowledge in Posture Analysis, Musculoskeletal Assessment, 
      Gait Analysis, Functional Movement Screening, and Biomechanics.
    </div>
    
    <div class="expert-badge">
      <span>WBA99 ANALYSIS EXPERT INDIA</span>
    </div>
    
    <div class="footer">
      <div class="footer-item">
        <div class="footer-label">Date</div>
        <div class="footer-value">${currentDate}</div>
      </div>
      
      <div class="footer-item">
        <div class="seal">
          <div class="seal-text">CERTIFIED</div>
          <div class="seal-main">WBA99</div>
          <div class="seal-text">2025</div>
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
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'WBA99 Certificate',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Success!', `Certificate saved to: ${uri}`);
      }
    } catch (error) {
      console.error('Error generating certificate:', error);
      Alert.alert('Error', 'Failed to generate certificate. Please try again.');
    } finally {
      setIsGeneratingCertificate(false);
    }
  };

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
        `You have ${unanswered} unanswered questions. Are you sure you want to submit?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit Anyway', onPress: () => setShowResults(true) }
        ]
      );
    } else {
      setShowResults(true);
    }
  };

  const handleRestart = () => {
    setSelectedAnswers({});
    setCurrentQuestion(0);
    setShowResults(false);
    setExamStarted(false);
  };

  // Start Screen
  if (!examStarted) {
    const canStartExam = physioName.trim().length >= 2;
    
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.startScreen}>
            <Image 
              source={{ uri: WBA99_LOGO_URL }} 
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.startTitle}>MSK/FMS Certification Exam</Text>
            <Text style={styles.startSubtitle}>Test your knowledge and get certified!</Text>
            
            {/* Name Input Card */}
            <View style={styles.nameInputCard}>
              <Text style={styles.nameInputLabel}>Enter Your Full Name</Text>
              <Text style={styles.nameInputHelper}>This name will appear on your certificate</Text>
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
                <Ionicons name="help-circle" size={20} color={theme.colors.accent} />
                <Text style={styles.examInfoText}>30 Multiple Choice Questions</Text>
              </View>
              <View style={styles.examInfoRow}>
                <Ionicons name="list" size={20} color={theme.colors.success} />
                <Text style={styles.examInfoText}>5 Categories (6 each)</Text>
              </View>
              <View style={styles.examInfoRow}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.warning} />
                <Text style={styles.examInfoText}>Pass: 20/30 (66%)</Text>
              </View>
              <View style={styles.examInfoRow}>
                <Ionicons name="ribbon" size={20} color="#D4AF37" />
                <Text style={styles.examInfoText}>Certificate on Passing</Text>
              </View>
            </View>

            <View style={styles.categoriesCard}>
              <Text style={styles.categoriesTitle}>Categories</Text>
              {['Posture', 'MSK', 'Walking', 'Anatomy', 'Biomechanics'].map((cat, idx) => (
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
              <Text style={styles.startButtonText}>
                {canStartExam ? 'Start Exam' : 'Enter Your Name to Begin'}
              </Text>
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
    const categories = ['Posture', 'MSK', 'Walking', 'Anatomy', 'Biomechanics'];

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
              {passed ? `Well done, ${physioName}! You have passed the certification exam!` : 'You need 33 marks to pass.'}
            </Text>

            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>Your Score</Text>
              <Text style={[styles.scoreValue, { color: passed ? theme.colors.success : theme.colors.error }]}>
                {score}/30
              </Text>
              <Text style={styles.scorePercent}>({((score / 30) * 100).toFixed(0)}%)</Text>
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
              <View style={styles.certificateCard}>
                <Image 
                  source={{ uri: WBA99_LOGO_URL }} 
                  style={styles.certificateLogo}
                  resizeMode="contain"
                />
                <Text style={styles.certificateTitle}>Certificate Earned!</Text>
                <Text style={styles.certificateText}>
                  WBA99 Analysis Expert India
                </Text>
                <Text style={styles.certificateName}>{physioName}</Text>
                <Text style={styles.certificateDate}>
                  Date: {new Date().toLocaleDateString('en-IN')}
                </Text>
                
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
                      <Text style={styles.downloadCertButtonText}>Download Certificate</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.restartButton}
              onPress={handleRestart}
            >
              <Ionicons name="refresh" size={24} color={theme.colors.textPrimary} />
              <Text style={styles.restartButtonText}>
                {passed ? 'Retake Exam' : 'Try Again'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => router.push('/')}
            >
              <Ionicons name="home" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.homeButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Question Screen
  const question = QUESTIONS[currentQuestion];
  const isAnswered = selectedAnswers[currentQuestion] !== undefined;
  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress Header */}
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>
            Question {currentQuestion + 1} of {QUESTIONS.length}
          </Text>
          <Text style={styles.answeredText}>
            {answeredCount}/{QUESTIONS.length} Answered
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarBg}>
          <View 
            style={[
              styles.progressBarFill, 
              { width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%` }
            ]} 
          />
        </View>

        {/* Category Badge */}
        <View style={[styles.categoryBadgeLarge, { backgroundColor: getCategoryColor(getCategoryIndex(question.category)) }]}>
          <Text style={styles.categoryBadgeLargeText}>{question.category}</Text>
        </View>

        {/* Question Card */}
        <View style={styles.questionCard}>
          <Text style={styles.questionNumber}>Q{question.id}.</Text>
          <Text style={styles.questionText}>{question.question}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => {
            const isSelected = selectedAnswers[currentQuestion] === index;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  isSelected && styles.optionButtonSelected,
                ]}
                onPress={() => handleSelectAnswer(index)}
              >
                <View style={[styles.optionCircle, isSelected && styles.optionCircleSelected]}>
                  {isSelected ? (
                    <Ionicons name="checkmark" size={16} color={theme.colors.textPrimary} />
                  ) : (
                    <Text style={styles.optionLetter}>
                      {String.fromCharCode(65 + index)}
                    </Text>
                  )}
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Navigation */}
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
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
            >
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.textPrimary} />
              <Text style={styles.submitButtonText}>Submit Exam</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Question Dots */}
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
                <Text style={[
                  styles.dotText,
                  selectedAnswers[index] !== undefined && styles.dotTextAnswered,
                  currentQuestion === index && styles.dotTextCurrent,
                ]}>
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

// Helper functions
const getCategoryColor = (index: number) => {
  const colors = [
    theme.colors.accent,
    theme.colors.error,
    theme.colors.success,
    theme.colors.warning,
    '#9C27B0', // Purple for Biomechanics
  ];
  return colors[index] || theme.colors.accent;
};

const getCategoryIndex = (category: string) => {
  const categories = ['Posture', 'MSK', 'Walking', 'Anatomy', 'Biomechanics'];
  return categories.indexOf(category);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  // Start Screen
  startScreen: {
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
  },
  startTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  startSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  examInfoCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  examInfoTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  examInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  examInfoText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  categoriesCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  categoriesTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  categoryBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  categoryBadgeText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  categoryName: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  categoryQuestions: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
    width: '100%',
    gap: theme.spacing.sm,
  },
  startButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  startButtonDisabled: {
    backgroundColor: theme.colors.cardBorder,
    opacity: 0.7,
  },
  // Logo Image
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: theme.spacing.md,
  },
  // Name Input
  nameInputCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  nameInputLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  nameInputHelper: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  nameInput: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.lg,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  // Progress
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  progressText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.semibold,
  },
  answeredText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.success,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: theme.colors.cardBorder,
    borderRadius: 3,
    marginBottom: theme.spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 3,
  },
  // Category Badge
  categoryBadgeLarge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
  },
  categoryBadgeLargeText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  // Question
  questionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  questionNumber: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.bold,
    marginBottom: theme.spacing.sm,
  },
  questionText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textPrimary,
    lineHeight: 26,
  },
  // Options
  optionsContainer: {
    marginBottom: theme.spacing.lg,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.cardBorder,
  },
  optionButtonSelected: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success + '20',
  },
  optionCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  optionCircleSelected: {
    backgroundColor: theme.colors.success,
  },
  optionLetter: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
  },
  optionText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  optionTextSelected: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.medium,
  },
  // Navigation
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  submitButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  // Dots
  dotsContainer: {
    marginBottom: theme.spacing.lg,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  dotAnswered: {
    backgroundColor: theme.colors.success + '30',
    borderColor: theme.colors.success,
  },
  dotCurrent: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  dotText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  dotTextAnswered: {
    color: theme.colors.success,
  },
  dotTextCurrent: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  // Results
  resultsScreen: {
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
  },
  resultsTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
  },
  resultsSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  scoreCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginTop: theme.spacing.xl,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  scoreLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: theme.fontWeight.bold,
    marginTop: theme.spacing.sm,
  },
  scorePercent: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textMuted,
  },
  categoryScoresCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  categoryScoresTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  categoryScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.sm,
  },
  categoryScoreName: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  categoryScoreValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  certificateCard: {
    backgroundColor: theme.colors.warning + '20',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginTop: theme.spacing.lg,
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: theme.colors.warning,
  },
  certificateLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: theme.spacing.sm,
  },
  certificateTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.warning,
    marginTop: theme.spacing.sm,
  },
  certificateText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  certificateName: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: '#D4AF37',
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  certificateDate: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  downloadCertButton: {
    flexDirection: 'row',
    backgroundColor: '#8B4513',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
    minWidth: 200,
  },
  downloadCertButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  restartButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
    width: '100%',
    gap: theme.spacing.sm,
  },
  restartButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  homeButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
});
