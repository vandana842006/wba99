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
  Image,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';
import { PaymentGateModal } from '../../src/utils/PaymentGateModal';

// Comprehensive MCQ Question Bank - 30 questions per category
const MCQ_QUESTIONS = {
  basic: [
    { id: 1, question: 'What is the primary function of the rotator cuff?', options: ['Flexion of the elbow', 'Stabilization of the shoulder joint', 'Extension of the wrist', 'Abduction of the hip'], correct: 1 },
    { id: 2, question: 'Which muscle is NOT part of the quadriceps group?', options: ['Rectus femoris', 'Vastus lateralis', 'Biceps femoris', 'Vastus medialis'], correct: 2 },
    { id: 3, question: 'The normal range of motion for hip flexion is approximately:', options: ['90 degrees', '120 degrees', '45 degrees', '180 degrees'], correct: 1 },
    { id: 4, question: 'Which joint type allows movement in all planes?', options: ['Hinge joint', 'Pivot joint', 'Ball and socket joint', 'Saddle joint'], correct: 2 },
    { id: 5, question: 'The sciatic nerve originates from which spinal levels?', options: ['L1-L3', 'L4-S3', 'T10-L2', 'C5-C7'], correct: 1 },
    { id: 6, question: 'What is the normal gait cycle stance phase percentage?', options: ['40%', '50%', '60%', '70%'], correct: 2 },
    { id: 7, question: 'Which test is used to assess ACL integrity?', options: ['McMurray test', 'Lachman test', 'Apley test', 'Ober test'], correct: 1 },
    { id: 8, question: 'The SITS muscles refer to:', options: ['Core stabilizers', 'Rotator cuff muscles', 'Hip flexors', 'Ankle stabilizers'], correct: 1 },
    { id: 9, question: 'Normal cervical lordosis angle is approximately:', options: ['10-20 degrees', '20-40 degrees', '40-60 degrees', '60-80 degrees'], correct: 1 },
    { id: 10, question: 'Which dermatome covers the thumb?', options: ['C5', 'C6', 'C7', 'C8'], correct: 1 },
    { id: 11, question: 'The Thomas test assesses tightness of:', options: ['Hamstrings', 'Hip flexors', 'Quadriceps', 'ITB'], correct: 1 },
    { id: 12, question: 'Active insufficiency occurs when a muscle:', options: ['Is overstretched', 'Cannot generate tension when maximally shortened', 'Is fatigued', 'Is injured'], correct: 1 },
    { id: 13, question: 'Which muscle is the prime mover for knee extension?', options: ['Hamstrings', 'Gastrocnemius', 'Quadriceps', 'Tibialis anterior'], correct: 2 },
    { id: 14, question: 'The carpal tunnel contains how many tendons?', options: ['7', '8', '9', '10'], correct: 2 },
    { id: 15, question: 'Normal lumbar lordosis angle is:', options: ['20-40 degrees', '40-60 degrees', '60-80 degrees', '80-100 degrees'], correct: 1 },
    { id: 16, question: 'Which nerve is tested with the biceps reflex?', options: ['C4', 'C5-C6', 'C7', 'C8-T1'], correct: 1 },
    { id: 17, question: 'The ankle mortise is formed by:', options: ['Talus and calcaneus', 'Tibia and fibula', 'Tibia, fibula, and talus', 'Navicular and cuboid'], correct: 2 },
    { id: 18, question: 'What is the Q-angle in males normally?', options: ['8-10 degrees', '10-15 degrees', '15-20 degrees', '20-25 degrees'], correct: 1 },
    { id: 19, question: 'Which test assesses for piriformis syndrome?', options: ['FABER test', 'FAIR test', 'Slump test', 'Spurling test'], correct: 1 },
    { id: 20, question: 'The end feel for elbow extension is:', options: ['Soft', 'Firm', 'Hard/bony', 'Empty'], correct: 2 },
    { id: 21, question: 'Which muscle performs ankle dorsiflexion?', options: ['Gastrocnemius', 'Soleus', 'Tibialis anterior', 'Peroneus longus'], correct: 2 },
    { id: 22, question: 'The glenohumeral joint is classified as:', options: ['Hinge', 'Pivot', 'Ball and socket', 'Condyloid'], correct: 2 },
    { id: 23, question: 'Normal shoulder abduction range is:', options: ['90 degrees', '120 degrees', '150 degrees', '180 degrees'], correct: 3 },
    { id: 24, question: 'Which bursa is commonly affected in shoulder impingement?', options: ['Olecranon', 'Subacromial', 'Trochanteric', 'Prepatellar'], correct: 1 },
    { id: 25, question: 'The medial meniscus is attached to:', options: ['ACL only', 'MCL only', 'MCL and joint capsule', 'LCL'], correct: 2 },
    { id: 26, question: 'Which test is positive in carpal tunnel syndrome?', options: ['Finkelstein test', 'Phalen test', 'Allen test', 'Froment sign'], correct: 1 },
    { id: 27, question: 'The plantaris muscle assists in:', options: ['Dorsiflexion', 'Plantar flexion', 'Inversion', 'Eversion'], correct: 1 },
    { id: 28, question: 'What percentage of body weight does the lumbar spine bear?', options: ['30%', '50%', '60%', '80%'], correct: 2 },
    { id: 29, question: 'The sacroiliac joint is classified as:', options: ['Synovial', 'Fibrous', 'Cartilaginous', 'Amphiarthrosis'], correct: 0 },
    { id: 30, question: 'Which nerve innervates the deltoid muscle?', options: ['Musculocutaneous', 'Axillary', 'Radial', 'Median'], correct: 1 },
  ],
  intermediate: [
    { id: 1, question: 'In FMS, what score indicates pain during movement?', options: ['0', '1', '2', '3'], correct: 0 },
    { id: 2, question: 'The Deep Squat test primarily assesses:', options: ['Hip mobility', 'Ankle mobility', 'Bilateral symmetry and total body mechanics', 'Core stability'], correct: 2 },
    { id: 3, question: 'Which FMS test identifies asymmetries in hip mobility?', options: ['Hurdle Step', 'Active Straight Leg Raise', 'Rotary Stability', 'Trunk Stability Push-Up'], correct: 1 },
    { id: 4, question: 'A score of 2 in FMS means:', options: ['Pain is present', 'Performs with compensation', 'Performs without compensation', 'Cannot perform'], correct: 1 },
    { id: 5, question: 'The minimum passing FMS score is generally considered:', options: ['10', '12', '14', '16'], correct: 2 },
    { id: 6, question: 'Upper Crossed Syndrome involves tight:', options: ['Upper trapezius and pectorals', 'Rhomboids and lower traps', 'Serratus anterior and lats', 'Deltoids and biceps'], correct: 0 },
    { id: 7, question: 'Lower Crossed Syndrome involves weak:', options: ['Hip flexors', 'Erector spinae', 'Glutes and abdominals', 'Hamstrings'], correct: 2 },
    { id: 8, question: 'The Y-Balance Test assesses:', options: ['Upper body strength', 'Dynamic balance and reach', 'Core endurance', 'Flexibility'], correct: 1 },
    { id: 9, question: 'In postural assessment, forward head posture increases stress on:', options: ['Lumbar spine', 'Cervical extensors', 'Hip flexors', 'Knee joint'], correct: 1 },
    { id: 10, question: 'The normal standing posture plumb line passes through:', options: ['Anterior to ankle', 'Through lateral malleolus', 'Posterior to ankle', 'Through medial malleolus'], correct: 1 },
    { id: 11, question: 'Genu valgum is commonly called:', options: ['Bow legs', 'Knock knees', 'Flat feet', 'High arches'], correct: 1 },
    { id: 12, question: 'The Trendelenburg sign indicates weakness of:', options: ['Quadriceps', 'Hip abductors', 'Hip flexors', 'Hamstrings'], correct: 1 },
    { id: 13, question: 'During gait, initial contact should occur with:', options: ['Toe', 'Forefoot', 'Midfoot', 'Heel'], correct: 3 },
    { id: 14, question: 'Single leg stance duration for normal balance is:', options: ['5 seconds', '15 seconds', '30 seconds', '60 seconds'], correct: 2 },
    { id: 15, question: 'The star excursion balance test has how many reach directions?', options: ['4', '6', '8', '10'], correct: 2 },
    { id: 16, question: 'Antalgic gait is characterized by:', options: ['Wide base', 'Short stance on affected side', 'High stepping', 'Circumduction'], correct: 1 },
    { id: 17, question: 'The Functional Movement Screen consists of how many tests?', options: ['5', '6', '7', '8'], correct: 2 },
    { id: 18, question: 'In-line lunge test assesses:', options: ['Hip mobility only', 'Knee stability and ankle mobility', 'Hip and knee mobility with stability', 'Core strength'], correct: 2 },
    { id: 19, question: 'Shoulder mobility test in FMS uses what measurement?', options: ['Finger distance', 'Fist distance', 'Hand length', 'Forearm length'], correct: 1 },
    { id: 20, question: 'The hurdle step height is determined by:', options: ['Fixed 15 inches', 'Tibial tuberosity height', 'Knee height', 'Hip height'], correct: 1 },
    { id: 21, question: 'Rotary stability test primarily challenges:', options: ['Hip mobility', 'Core stability in transverse plane', 'Shoulder stability', 'Knee stability'], correct: 1 },
    { id: 22, question: 'A positive impingement clearing test indicates:', options: ['Normal findings', 'Need for medical referral', 'Poor flexibility', 'Muscle weakness'], correct: 1 },
    { id: 23, question: 'The SFMA stands for:', options: ['Static Functional Movement Assessment', 'Selective Functional Movement Assessment', 'Standard Functional Motor Assessment', 'Systematic Functional Motion Analysis'], correct: 1 },
    { id: 24, question: 'Regional interdependence suggests that:', options: ['Pain is always local', 'Dysfunction in one region affects others', 'Treatment should be isolated', 'Assessment is unnecessary'], correct: 1 },
    { id: 25, question: 'The prone press-up test assesses:', options: ['Lumbar flexion', 'Lumbar extension mobility', 'Hip extension', 'Thoracic rotation'], correct: 1 },
    { id: 26, question: 'Active straight leg raise assesses:', options: ['Hamstring strength', 'Hip flexor strength and core stability', 'Quad strength', 'Calf flexibility'], correct: 1 },
    { id: 27, question: 'Joint centration refers to:', options: ['Joint locking', 'Optimal joint position', 'Joint subluxation', 'Joint hypermobility'], correct: 1 },
    { id: 28, question: 'The multi-segmental extension pattern tests:', options: ['Flexion mobility', 'Extension control through the spine', 'Rotation mobility', 'Lateral flexion'], correct: 1 },
    { id: 29, question: 'DNS stands for:', options: ['Dynamic Neuromuscular Stabilization', 'Dorsal Nerve Stimulation', 'Deep Nerve Stretch', 'Distal Nerve Syndrome'], correct: 0 },
    { id: 30, question: 'The breakpoint in movement dysfunction is:', options: ['Where pain starts', 'Where compensation begins', 'End range', 'Mid range'], correct: 1 },
  ],
  advanced: [
    { id: 1, question: 'TENS frequency for acute pain is typically:', options: ['1-10 Hz', '50-150 Hz', '200-300 Hz', '400+ Hz'], correct: 1 },
    { id: 2, question: 'IFT carrier frequency is usually:', options: ['1000 Hz', '2000 Hz', '4000 Hz', '8000 Hz'], correct: 2 },
    { id: 3, question: 'Therapeutic ultrasound intensity for deep heating is:', options: ['0.1-0.5 W/cm²', '0.5-1.0 W/cm²', '1.0-2.0 W/cm²', '2.5-3.0 W/cm²'], correct: 2 },
    { id: 4, question: 'Russian current uses frequency of:', options: ['1000 Hz', '2500 Hz', '4000 Hz', '5000 Hz'], correct: 1 },
    { id: 5, question: 'Iontophoresis uses which type of current?', options: ['AC', 'Pulsed DC', 'Continuous DC', 'Interferential'], correct: 2 },
    { id: 6, question: 'Ultrasound contraindication includes:', options: ['Muscle spasm', 'Joint stiffness', 'Over growth plates', 'Chronic inflammation'], correct: 2 },
    { id: 7, question: 'Cryotherapy duration for acute injury is:', options: ['5-10 min', '10-20 min', '20-30 min', '30-45 min'], correct: 1 },
    { id: 8, question: 'PRICE protocol stands for:', options: ['Pain, Rest, Ice, Compression, Elevation', 'Protection, Rest, Ice, Compression, Elevation', 'Position, Rest, Ice, Cold, Elevation', 'Pain, Reduce, Ice, Compress, Elevate'], correct: 1 },
    { id: 9, question: 'Galvanic current is primarily used for:', options: ['Pain relief', 'Muscle strengthening', 'Iontophoresis and wound healing', 'Muscle re-education'], correct: 2 },
    { id: 10, question: 'Duty cycle for muscle strengthening with NMES is:', options: ['1:1', '1:3', '1:5', '1:10'], correct: 2 },
    { id: 11, question: 'SWD wavelength is approximately:', options: ['5 meters', '11 meters', '22 meters', '50 meters'], correct: 1 },
    { id: 12, question: 'MWD frequency is:', options: ['27.12 MHz', '2450 MHz', '1 MHz', '3 MHz'], correct: 1 },
    { id: 13, question: 'Laser therapy class 3B power output is:', options: ['<5 mW', '5-500 mW', '500 mW-10W', '>10W'], correct: 1 },
    { id: 14, question: 'Phonophoresis uses which medium?', options: ['Water', 'Gel with medication', 'Oil', 'Saline'], correct: 1 },
    { id: 15, question: 'Strength-duration curve is used to assess:', options: ['Muscle power', 'Nerve integrity', 'Joint mobility', 'Endurance'], correct: 1 },
    { id: 16, question: 'Chronaxie is the pulse duration at:', options: ['Rheobase', 'Twice rheobase', 'Half rheobase', 'Three times rheobase'], correct: 1 },
    { id: 17, question: 'Shockwave therapy pressure ranges:', options: ['0.1-1 bar', '1-5 bar', '5-10 bar', '10-20 bar'], correct: 1 },
    { id: 18, question: 'PEMF stands for:', options: ['Pulsed Electric Magnetic Field', 'Pulsed Electromagnetic Field', 'Periodic Electromagnetic Force', 'Pulsed Energy Magnetic Frequency'], correct: 1 },
    { id: 19, question: 'Ultrasound beam non-uniformity ratio (BNR) should be:', options: ['<2:1', '<4:1', '<6:1', '<8:1'], correct: 2 },
    { id: 20, question: 'Fluidotherapy temperature range is:', options: ['30-35°C', '38-48°C', '50-55°C', '55-60°C'], correct: 1 },
    { id: 21, question: 'Paraffin wax temperature should be:', options: ['40-45°C', '50-54°C', '60-65°C', '70-75°C'], correct: 1 },
    { id: 22, question: 'Contraindication for MWD includes:', options: ['Muscle spasm', 'Metal implants', 'Joint stiffness', 'Chronic pain'], correct: 1 },
    { id: 23, question: 'TENS gate control mechanism works at:', options: ['Brain', 'Spinal cord', 'Peripheral nerve', 'Muscle'], correct: 1 },
    { id: 24, question: 'Endorphin release requires TENS frequency of:', options: ['1-5 Hz', '50-100 Hz', '100-150 Hz', '200+ Hz'], correct: 0 },
    { id: 25, question: 'Faradic current pulse duration is:', options: ['0.01-0.1 ms', '0.1-1 ms', '1-10 ms', '10-100 ms'], correct: 1 },
    { id: 26, question: 'Infrared radiation wavelength is:', options: ['400-700 nm', '700-1500 nm', '1500-3000 nm', '3000-5000 nm'], correct: 1 },
    { id: 27, question: 'Biofeedback EMG detects activity in:', options: ['Millivolts', 'Microvolts', 'Volts', 'Kilovolts'], correct: 1 },
    { id: 28, question: 'Traction force for cervical spine is typically:', options: ['5-10 lbs', '10-30 lbs', '30-50 lbs', '50-70 lbs'], correct: 1 },
    { id: 29, question: 'Lumbar traction force should be:', options: ['10-20% body weight', '25-50% body weight', '50-75% body weight', '75-100% body weight'], correct: 1 },
    { id: 30, question: 'Acetic acid iontophoresis is used for:', options: ['Muscle spasm', 'Calcium deposits', 'Inflammation', 'Wound healing'], correct: 1 },
  ],
};

const CERTIFICATION_LEVELS = [
  {
    id: 'basic',
    name: 'Basic Certification',
    description: 'Fundamental MSK knowledge',
    questions: 30,
    passingScore: 70,
    time: '45 min',
    icon: 'ribbon',
    color: '#00E676',
    status: 'available',
  },
  {
    id: 'intermediate',
    name: 'Intermediate Certification',
    description: 'Advanced assessment techniques',
    questions: 30,
    passingScore: 75,
    time: '45 min',
    icon: 'medal',
    color: '#448AFF',
    status: 'locked',
  },
  {
    id: 'advanced',
    name: 'Advanced Certification',
    description: 'Expert level comprehensive exam',
    questions: 30,
    passingScore: 80,
    time: '45 min',
    icon: 'trophy',
    color: '#FFD700',
    status: 'locked',
  },
];

export default function CertificationScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [examStarted, setExamStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [examQuestions, setExamQuestions] = useState<typeof MCQ_QUESTIONS.basic>([]);

  const startExam = (levelId: string) => {
    Alert.alert(
      'Start Certification Exam',
      'Are you ready to begin? You will have 30 questions to complete.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Exam', 
          onPress: () => {
            // Get questions for the selected level
            const questions = MCQ_QUESTIONS[levelId as keyof typeof MCQ_QUESTIONS] || MCQ_QUESTIONS.basic;
            setExamQuestions(questions);
            setSelectedLevel(levelId);
            setExamStarted(true);
            setCurrentQuestion(0);
            setScore(0);
            setShowResult(false);
            setSelectedAnswer(null);
          }
        }
      ]
    );
  };

  const submitAnswer = () => {
    if (selectedAnswer === null || examQuestions.length === 0) return;
    
    if (selectedAnswer === examQuestions[currentQuestion].correct) {
      setScore(score + 1);
    }
    
    if (currentQuestion < examQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      setShowResult(true);
    }
  };

  const resetExam = () => {
    setExamStarted(false);
    setSelectedLevel(null);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setScore(0);
    setShowResult(false);
    setShowPaymentModal(false);
    setPaymentScreenshot(null);
    setPaymentSubmitting(false);
    setCertificateReady(false);
  };

  // Payment and Certificate States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [certificateReady, setCertificateReady] = useState(false);
  const [generatingCertificate, setGeneratingCertificate] = useState(false);

  // Fetch payment settings
  useEffect(() => {
    const fetchPaymentSettings = async () => {
      try {
        const response = await api.get('/api/payment/settings');
        setPaymentSettings(response.data);
      } catch (error) {
        console.error('Failed to fetch payment settings:', error);
      }
    };
    fetchPaymentSettings();
  }, []);

  // Upload payment screenshot
  const pickPaymentScreenshot = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      setPaymentScreenshot(result.assets[0].uri);
    }
  };

  // Submit payment for verification
  const submitPayment = async () => {
    if (!paymentScreenshot) {
      Alert.alert('Error', 'Please upload your payment screenshot');
      return;
    }

    setPaymentSubmitting(true);
    try {
      // In production, this would send to backend for admin verification
      // For now, we'll simulate successful payment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Payment Submitted!',
        'Your payment has been submitted for verification. Once approved, you can download your certificate.',
        [{ text: 'OK', onPress: () => {
          setCertificateReady(true);
          setShowPaymentModal(false);
        }}]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit payment. Please try again.');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Generate and download certificate
  const downloadCertificate = async () => {
    setGeneratingCertificate(true);
    try {
      const date = new Date().toLocaleDateString('en-IN', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      });
      const certificateId = `WBA99-CERT-${Date.now().toString(36).toUpperCase()}`;
      const levelName = selectedLevel === 'basic' ? 'Basic' : selectedLevel === 'intermediate' ? 'Intermediate' : 'Advanced';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: 'Georgia', serif; 
              margin: 0; 
              padding: 40px; 
              background: linear-gradient(135deg, #0D1B2A 0%, #1B3A5F 100%);
              min-height: 100vh;
            }
            .certificate {
              background: white;
              padding: 50px;
              border-radius: 20px;
              max-width: 700px;
              margin: 0 auto;
              position: relative;
              border: 8px solid #D4AF37;
            }
            .certificate::before {
              content: '';
              position: absolute;
              top: 15px;
              left: 15px;
              right: 15px;
              bottom: 15px;
              border: 2px solid #D4AF37;
              border-radius: 10px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 36px;
              font-weight: bold;
              color: #D4AF37;
              letter-spacing: 4px;
            }
            .title {
              font-size: 42px;
              color: #1B3A5F;
              margin: 20px 0;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 3px;
            }
            .subtitle {
              color: #666;
              font-size: 16px;
              margin-bottom: 30px;
            }
            .main-text {
              text-align: center;
              margin: 30px 0;
            }
            .this-is {
              font-size: 14px;
              color: #888;
            }
            .name {
              font-size: 32px;
              font-weight: bold;
              color: #1B3A5F;
              border-bottom: 2px solid #D4AF37;
              display: inline-block;
              padding: 10px 40px;
              margin: 20px 0;
            }
            .achievement {
              font-size: 16px;
              color: #444;
              line-height: 1.8;
            }
            .level-badge {
              display: inline-block;
              background: linear-gradient(135deg, #D4AF37, #B8860B);
              color: white;
              padding: 8px 25px;
              border-radius: 20px;
              font-weight: bold;
              margin: 20px 0;
            }
            .score {
              font-size: 18px;
              color: #1B3A5F;
              margin: 20px 0;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              margin-top: 50px;
              padding-top: 30px;
              border-top: 1px solid #ddd;
            }
            .signature {
              text-align: center;
            }
            .signature-line {
              width: 150px;
              border-top: 2px solid #333;
              margin: 10px auto;
            }
            .signature-text {
              font-size: 12px;
              color: #666;
            }
            .cert-id {
              position: absolute;
              bottom: 25px;
              right: 30px;
              font-size: 10px;
              color: #999;
            }
            .qr-section {
              text-align: center;
              margin-top: 20px;
            }
            .qr-code {
              width: 80px;
              height: 80px;
              margin: 0 auto;
            }
            .qr-text {
              font-size: 10px;
              color: #888;
              margin-top: 5px;
            }
            .verify-text {
              font-size: 11px;
              color: #666;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="header">
              <div class="logo">WBA99</div>
              <div class="title">Certificate of Achievement</div>
              <div class="subtitle">Musculoskeletal & Functional Movement Analysis</div>
            </div>
            
            <div class="main-text">
              <div class="this-is">This is to certify that</div>
              <div class="name">${currentUser?.name || 'Candidate'}</div>
              <div class="achievement">
                has successfully completed the <strong>${levelName} Level</strong> certification examination<br>
                in Physiotherapy Assessment and Analysis
              </div>
              <div class="level-badge">${levelName.toUpperCase()} CERTIFIED</div>
              <div class="score">
                Final Score: ${score}/30 (${Math.round((score / 30) * 100)}%)
              </div>
            </div>
            
            <div class="qr-section">
              <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=WBA99-CERT-${certificateId}" alt="WBA99 QR" />
              <div class="qr-text">Scan to verify certificate</div>
              <div class="verify-text">Verify at: wba99.com/verify/${certificateId}</div>
            </div>
            
            <div class="footer">
              <div class="signature">
                <div class="signature-line"></div>
                <div class="signature-text">Program Director</div>
              </div>
              <div class="signature">
                <div class="signature-line"></div>
                <div class="signature-text">Date: ${date}</div>
              </div>
            </div>
            
            <div class="cert-id">Certificate ID: ${certificateId}</div>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      
      Alert.alert('Success!', 'Your certificate has been generated and shared.');
    } catch (error) {
      Alert.alert('Error', 'Failed to generate certificate. Please try again.');
    } finally {
      setGeneratingCertificate(false);
    }
  };

  if (showResult) {
    const totalQuestions = examQuestions.length || 30;
    const passed = (score / totalQuestions) * 100 >= 70;
    const levelName = selectedLevel === 'basic' ? 'Basic' : selectedLevel === 'intermediate' ? 'Intermediate' : 'Advanced';
    
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultContainer}>
          <MaterialCommunityIcons 
            name={passed ? 'trophy' : 'close-circle'} 
            size={80} 
            color={passed ? '#FFD700' : theme.colors.error} 
          />
          <Text style={styles.resultTitle}>{passed ? '🎉 Congratulations!' : 'Better Luck Next Time'}</Text>
          <Text style={styles.resultScore}>Score: {score}/{totalQuestions}</Text>
          <Text style={styles.resultPercent}>{Math.round((score / totalQuestions) * 100)}%</Text>
          <Text style={styles.resultMessage}>
            {passed 
              ? `You have passed the ${levelName} Certification Exam!` 
              : 'You need 70% to pass. Keep studying!'}
          </Text>
          
          {passed && (
            <View style={styles.certificateSection}>
              <View style={styles.certificateCard}>
                <MaterialCommunityIcons name="certificate" size={40} color="#FFD700" />
                <Text style={styles.certificateTitle}>Get Your Certificate</Text>
                <Text style={styles.certificateDesc}>
                  Complete payment to download your official WBA99 {levelName} Certification
                </Text>
                
                {certificateReady ? (
                  <TouchableOpacity 
                    style={styles.downloadCertBtn}
                    onPress={downloadCertificate}
                    disabled={generatingCertificate}
                  >
                    {generatingCertificate ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="download" size={20} color="#fff" />
                        <Text style={styles.downloadCertBtnText}>Download Certificate</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={styles.payNowBtn}
                    onPress={() => setShowPaymentModal(true)}
                  >
                    <Ionicons name="card" size={20} color={theme.colors.primary} />
                    <Text style={styles.payNowBtnText}>Pay ₹999 to Get Certificate</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          
          <TouchableOpacity style={styles.retryButton} onPress={resetExam}>
            <Text style={styles.retryButtonText}>Back to Certifications</Text>
          </TouchableOpacity>
        </ScrollView>
        
        {/* Payment Modal */}
        <Modal visible={showPaymentModal} transparent animationType="slide">
          <View style={styles.paymentModalOverlay}>
            <View style={styles.paymentModalContent}>
              <View style={styles.paymentModalHeader}>
                <Text style={styles.paymentModalTitle}>Complete Payment</Text>
                <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>
              
              {/* QR Code */}
              {paymentSettings?.qr_code_image && (
                <View style={styles.qrSection}>
                  <Text style={styles.qrTitle}>Scan QR Code to Pay ₹999</Text>
                  <Image 
                    source={{ uri: paymentSettings.qr_code_image }} 
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.upiId}>UPI ID: {paymentSettings.upi_id}</Text>
                </View>
              )}
              
              {/* Bank Details */}
              <View style={styles.bankDetails}>
                <Text style={styles.bankTitle}>Or Transfer to Bank Account</Text>
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>Account Name:</Text>
                  <Text style={styles.bankValue}>{paymentSettings?.account_holder_name}</Text>
                </View>
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>Account No:</Text>
                  <Text style={styles.bankValue}>{paymentSettings?.account_number}</Text>
                </View>
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>IFSC:</Text>
                  <Text style={styles.bankValue}>{paymentSettings?.ifsc_code}</Text>
                </View>
              </View>
              
              {/* Upload Screenshot */}
              <View style={styles.uploadSection}>
                <Text style={styles.uploadTitle}>Upload Payment Screenshot</Text>
                <TouchableOpacity 
                  style={styles.uploadBtn}
                  onPress={pickPaymentScreenshot}
                >
                  {paymentScreenshot ? (
                    <Image source={{ uri: paymentScreenshot }} style={styles.uploadPreview} />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={32} color={theme.colors.accent} />
                      <Text style={styles.uploadBtnText}>Tap to Upload Screenshot</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              
              {/* Submit Button */}
              <TouchableOpacity 
                style={[
                  styles.submitPaymentBtn,
                  !paymentScreenshot && styles.submitPaymentBtnDisabled
                ]}
                onPress={submitPayment}
                disabled={!paymentScreenshot || paymentSubmitting}
              >
                {paymentSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.submitPaymentBtnText}>Submit for Verification</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  if (examStarted && examQuestions.length > 0) {
    const question = examQuestions[currentQuestion];
    const totalQuestions = examQuestions.length;
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.examContainer}>
          {/* Progress */}
          <View style={styles.examProgress}>
            <Text style={styles.examProgressText}>Question {currentQuestion + 1} of {totalQuestions}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }]} />
            </View>
          </View>

          {/* Question */}
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{question.question}</Text>
          </View>

          {/* Options */}
          <View style={styles.optionsList}>
            {question.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionCard,
                  selectedAnswer === index && styles.optionSelected
                ]}
                onPress={() => setSelectedAnswer(index)}
              >
                <View style={[
                  styles.optionIndex,
                  selectedAnswer === index && styles.optionIndexSelected
                ]}>
                  <Text style={[
                    styles.optionIndexText,
                    selectedAnswer === index && styles.optionIndexTextSelected
                  ]}>{String.fromCharCode(65 + index)}</Text>
                </View>
                <Text style={[
                  styles.optionText,
                  selectedAnswer === index && styles.optionTextSelected
                ]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, selectedAnswer === null && styles.submitButtonDisabled]}
            onPress={submitAnswer}
            disabled={selectedAnswer === null}
          >
            <Text style={styles.submitButtonText}>
              {currentQuestion < totalQuestions - 1 ? 'Next Question' : 'Finish Exam'}
            </Text>
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
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Certification</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <MaterialCommunityIcons name="medal-outline" size={48} color="#FFD700" />
          <Text style={styles.heroTitle}>Get Certified</Text>
          <Text style={styles.heroSubtitle}>Prove your expertise with WBA99 certifications</Text>
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>90</Text>
            <Text style={styles.statLabel}>MCQs Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>30</Text>
            <Text style={styles.statLabel}>Per Level</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>45</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
        </View>

        {/* Certification Levels */}
        <Text style={styles.sectionTitle}>Certification Levels</Text>
        <View style={styles.levelsList}>
          {CERTIFICATION_LEVELS.map((level) => (
            <TouchableOpacity
              key={level.id}
              style={[
                styles.levelCard,
                level.status === 'locked' && styles.levelCardLocked
              ]}
              onPress={() => level.status === 'available' && startExam(level.id)}
              disabled={level.status === 'locked'}
            >
              <View style={[styles.levelIcon, { backgroundColor: level.color + '20' }]}>
                <MaterialCommunityIcons name={level.icon as any} size={32} color={level.color} />
              </View>
              <View style={styles.levelInfo}>
                <Text style={styles.levelName}>{level.name}</Text>
                <Text style={styles.levelDesc}>{level.description}</Text>
                <View style={styles.levelMeta}>
                  <Text style={styles.levelMetaText}>{level.questions} Questions • {level.time}</Text>
                </View>
              </View>
              {level.status === 'locked' ? (
                <Ionicons name="lock-closed" size={24} color={theme.colors.textMuted} />
              ) : (
                <Ionicons name="chevron-forward" size={24} color={level.color} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Section */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={theme.colors.accent} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>How Certification Works</Text>
            <Text style={styles.infoText}>• Complete the exam within the time limit</Text>
            <Text style={styles.infoText}>• Score at least 70% to pass</Text>
            <Text style={styles.infoText}>• Receive digital certificate upon passing</Text>
            <Text style={styles.infoText}>• Unlock higher levels by passing previous ones</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
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
  heroSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  heroTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  heroSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: '#FFD700',
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.cardBorder,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  levelsList: {
    gap: theme.spacing.sm,
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  levelCardLocked: {
    opacity: 0.6,
  },
  levelIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  levelName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  levelDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  levelMeta: {
    marginTop: theme.spacing.xs,
  },
  levelMetaText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  infoContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  infoTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  // Exam styles
  examContainer: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  examProgress: {
    marginBottom: theme.spacing.lg,
  },
  examProgressText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 3,
  },
  questionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  questionText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    lineHeight: 26,
  },
  optionsList: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.cardBorder,
  },
  optionSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent + '10',
  },
  optionIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  optionIndexSelected: {
    backgroundColor: theme.colors.accent,
  },
  optionIndexText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
  },
  optionIndexTextSelected: {
    color: theme.colors.primary,
  },
  optionText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  optionTextSelected: {
    color: theme.colors.accent,
  },
  submitButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.textMuted,
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  // Result styles
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  resultTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
  },
  resultScore: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  resultPercent: {
    fontSize: 48,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
    marginTop: theme.spacing.sm,
  },
  resultMessage: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  retryButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.xl,
  },
  retryButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  // Certificate Section
  certificateSection: {
    width: '100%',
    marginTop: theme.spacing.lg,
  },
  certificateCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  certificateTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  certificateDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  payNowBtnText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  downloadCertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  downloadCertBtnText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  // Payment Modal
  paymentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  paymentModalContent: {
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.lg,
    maxHeight: '90%',
  },
  paymentModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  paymentModalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  qrTitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  qrImage: {
    width: 200,
    height: 200,
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.md,
  },
  upiId: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    marginTop: theme.spacing.sm,
  },
  bankDetails: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  bankTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  bankLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  bankValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  uploadSection: {
    marginBottom: theme.spacing.lg,
  },
  uploadTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  uploadBtn: {
    height: 120,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  uploadBtnText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  uploadPreview: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.md - 2,
  },
  submitPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  submitPaymentBtnDisabled: {
    opacity: 0.5,
  },
  submitPaymentBtnText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
});
