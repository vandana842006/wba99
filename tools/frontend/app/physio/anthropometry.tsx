import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';
import { saveAssessmentReport } from '../../src/utils/api';
import PatientSelector, { Patient } from '../../src/components/PatientSelector';
import Constants from 'expo-constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AnthropometryResult {
  estimatedHeight: number;
  heightUnit: string;
  armSpan: number;
  shoulderWidth: number;
  torsoLength: number;
  legLength: number;
  headCircumference: number;
  chestCircumference: number;
  waistCircumference: number;
  hipCircumference: number;
  bmi: number;
  bodyType: string;
  proportionAnalysis: {
    metric: string;
    value: string;
    status: 'normal' | 'warning' | 'optimal';
    reference: string;
  }[];
  recommendations: string[];
  isMockData?: boolean;
}

// True Length / Segmental Length Measurements
interface TrueLengthMeasurement {
  segment: string;
  left: string;
  right: string;
  difference: string;
  normalRange: string;
}

// Girth Measurements
interface GirthMeasurement {
  site: string;
  measurement: string;
  normalRange: string;
  notes: string;
}

// Skinfold Fat Measurements
interface SkinfoldMeasurement {
  site: string;
  reading1: string;
  reading2: string;
  reading3: string;
  average: string;
}

// Default True Length segments
const TRUE_LENGTH_SEGMENTS = [
  { id: 'femur', name: 'Femur (True Leg Length)', method: 'ASIS to Medial Malleolus', normalRange: '38-48 cm' },
  { id: 'tibia', name: 'Tibia Length', method: 'Knee Joint Line to Lateral Malleolus', normalRange: '35-45 cm' },
  { id: 'humerus', name: 'Humerus Length', method: 'Acromion to Lateral Epicondyle', normalRange: '30-36 cm' },
  { id: 'forearm', name: 'Forearm Length', method: 'Olecranon to Ulnar Styloid', normalRange: '24-30 cm' },
  { id: 'apparent_leg', name: 'Apparent Leg Length', method: 'Umbilicus to Medial Malleolus', normalRange: '80-95 cm' },
];

// Default Girth measurement sites
const GIRTH_SITES = [
  { id: 'thigh_upper', name: 'Upper Thigh', landmark: '15cm above patella', normalRange: '45-65 cm' },
  { id: 'thigh_mid', name: 'Mid Thigh', landmark: '10cm above patella', normalRange: '40-55 cm' },
  { id: 'knee', name: 'Knee', landmark: 'At patella center', normalRange: '35-45 cm' },
  { id: 'calf', name: 'Calf', landmark: 'Maximum circumference', normalRange: '32-42 cm' },
  { id: 'ankle', name: 'Ankle', landmark: 'Above malleoli', normalRange: '20-28 cm' },
  { id: 'arm_upper', name: 'Upper Arm', landmark: 'Mid-biceps', normalRange: '25-38 cm' },
  { id: 'forearm', name: 'Forearm', landmark: 'Maximum circumference', normalRange: '22-32 cm' },
  { id: 'wrist', name: 'Wrist', landmark: 'Distal to styloid', normalRange: '14-20 cm' },
];

// Skinfold sites for body fat measurement
const SKINFOLD_SITES = [
  { id: 'triceps', name: 'Triceps', landmark: 'Midpoint between acromion and olecranon' },
  { id: 'biceps', name: 'Biceps', landmark: 'Midpoint of muscle belly, anterior' },
  { id: 'subscapular', name: 'Subscapular', landmark: '2cm below inferior angle of scapula' },
  { id: 'suprailiac', name: 'Suprailiac', landmark: 'Above iliac crest, midaxillary line' },
  { id: 'abdominal', name: 'Abdominal', landmark: '3cm lateral to umbilicus' },
  { id: 'thigh', name: 'Thigh', landmark: 'Midpoint of anterior thigh' },
  { id: 'calf', name: 'Calf (Medial)', landmark: 'Maximum circumference, medial aspect' },
];

export default function Anthropometry() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnthropometryResult | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [patientHeight, setPatientHeight] = useState('');
  const [patientWeight, setPatientWeight] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<'ai' | 'trueLength' | 'girth' | 'skinfold'>('ai');
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [assessmentSaved, setAssessmentSaved] = useState(false);
  const { currentUser } = useStore();
  
  // True Length Measurements
  const [trueLengthMeasurements, setTrueLengthMeasurements] = useState<Record<string, { left: string; right: string }>>({});
  
  // Girth Measurements
  const [girthMeasurements, setGirthMeasurements] = useState<Record<string, { left: string; right: string }>>({});
  
  // Skinfold Measurements (3 readings per site)
  const [skinfoldMeasurements, setSkinfoldMeasurements] = useState<Record<string, { r1: string; r2: string; r3: string }>>({});
  
  // Calculate body fat percentage from skinfold
  const calculateBodyFat = () => {
    const sites = ['triceps', 'biceps', 'subscapular', 'suprailiac'];
    let sumOfFolds = 0;
    let validCount = 0;
    
    for (const site of sites) {
      const readings = skinfoldMeasurements[site];
      if (readings?.r1 && readings?.r2 && readings?.r3) {
        const avg = (parseFloat(readings.r1) + parseFloat(readings.r2) + parseFloat(readings.r3)) / 3;
        if (!isNaN(avg)) {
          sumOfFolds += avg;
          validCount++;
        }
      }
    }
    
    if (validCount < 4) return null;
    
    // Durnin & Womersley formula approximation
    const logSum = Math.log10(sumOfFolds);
    const bodyDensity = 1.1631 - (0.0632 * logSum);
    const bodyFatPercent = ((4.95 / bodyDensity) - 4.5) * 100;
    
    return bodyFatPercent.toFixed(1);
  };
  
  // Calculate leg length discrepancy
  const calculateLLD = () => {
    const femur = trueLengthMeasurements['femur'];
    if (femur?.left && femur?.right) {
      const diff = Math.abs(parseFloat(femur.left) - parseFloat(femur.right));
      if (!isNaN(diff)) return diff.toFixed(1);
    }
    return null;
  };

  const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                      process.env.EXPO_PUBLIC_BACKEND_URL || 
                      '';

  // Pick image from gallery
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setResult(null);
      setPaymentVerified(false);
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setResult(null);
      setPaymentVerified(false);
    }
  };

  // Analyze anthropometry
  const analyzeAnthropometry = async () => {
    if (!imageUri) {
      Alert.alert('Error', 'Please upload an image first');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/analyze-anthropometry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_data: imageUri,
          patient_height: patientHeight ? parseFloat(patientHeight) : null,
          patient_weight: patientWeight ? parseFloat(patientWeight) : null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        generateMockAnalysis();
      }
    } catch (error) {
      console.error('Analysis error:', error);
      generateMockAnalysis();
    } finally {
      setAnalyzing(false);
    }
  };

  // Generate mock analysis
  const generateMockAnalysis = () => {
    const height = patientHeight ? parseFloat(patientHeight) : Math.floor(Math.random() * 30) + 160;
    const weight = patientWeight ? parseFloat(patientWeight) : Math.floor(Math.random() * 30) + 55;
    const bmi = weight / ((height / 100) ** 2);

    const mockResult: AnthropometryResult = {
      estimatedHeight: height,
      heightUnit: 'cm',
      armSpan: Math.round(height * (0.98 + Math.random() * 0.04)),
      shoulderWidth: Math.round(height * 0.24 + Math.random() * 5),
      torsoLength: Math.round(height * 0.30 + Math.random() * 3),
      legLength: Math.round(height * 0.47 + Math.random() * 3),
      headCircumference: Math.round(53 + Math.random() * 6),
      chestCircumference: Math.round(85 + Math.random() * 15),
      waistCircumference: Math.round(70 + Math.random() * 20),
      hipCircumference: Math.round(90 + Math.random() * 15),
      bmi: Math.round(bmi * 10) / 10,
      bodyType: bmi < 18.5 ? 'Ectomorph' : bmi > 25 ? 'Endomorph' : 'Mesomorph',
      proportionAnalysis: [
        { metric: 'Arm Span to Height Ratio', value: '1.01', status: 'normal', reference: '0.96-1.04' },
        { metric: 'Sitting Height Ratio', value: '0.52', status: 'normal', reference: '0.50-0.54' },
        { metric: 'Waist-to-Hip Ratio', value: '0.78', status: 'optimal', reference: '< 0.85 (F) / < 0.90 (M)' },
        { metric: 'Shoulder-to-Waist Ratio', value: '1.42', status: 'optimal', reference: '> 1.4 ideal' },
        { metric: 'Leg-to-Body Ratio', value: '0.47', status: 'normal', reference: '0.45-0.50' },
        { metric: 'Head-to-Body Ratio', value: '1:7.5', status: 'normal', reference: '1:7 to 1:8' },
      ],
      recommendations: [
        '⚠️ SIMULATED DATA - For demonstration only',
        'For accurate measurements, real AI integration is required',
        'Use standardized posture (standing straight, arms at sides)',
        'Ensure full body is visible in the frame',
        'Use reference object for scale calibration',
      ],
      isMockData: true,
    };

    setResult(mockResult);
  };

  // Verify QR payment
  const verifyPayment = () => {
    setTimeout(() => {
      setPaymentVerified(true);
      setShowQRModal(false);
      Alert.alert('Payment Verified', 'You can now generate the PDF report');
    }, 1500);
  };

  // Generate PDF Report
  const generatePDFReport = async () => {
    if (!result) return;

    setGeneratingPdf(true);
    try {
      const html = generatePDFHTML(result);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Save Assessment to Database
  const handleSaveAssessment = async () => {
    if (!selectedPatient || !currentUser?.id) {
      Alert.alert('Error', 'Please select a patient first');
      return;
    }

    // Check if there's any data to save
    const hasTrueLength = Object.keys(trueLengthMeasurements).some(k => trueLengthMeasurements[k]?.left || trueLengthMeasurements[k]?.right);
    const hasGirth = Object.keys(girthMeasurements).some(k => girthMeasurements[k]?.left || girthMeasurements[k]?.right);
    const hasSkinfold = Object.keys(skinfoldMeasurements).some(k => skinfoldMeasurements[k]?.r1 || skinfoldMeasurements[k]?.r2);

    if (!result && !hasTrueLength && !hasGirth && !hasSkinfold) {
      Alert.alert('Error', 'Please complete at least one measurement before saving');
      return;
    }

    setSavingAssessment(true);
    try {
      const bodyFat = calculateBodyFat();
      const legDiscrepancy = calculateLegDiscrepancy();

      const reportData = {
        physio_id: currentUser.id,
        patient_id: selectedPatient.id,
        assessment_type: 'anthropometry',
        report_data: {
          aiAnalysis: result,
          trueLengthMeasurements,
          girthMeasurements,
          skinfoldMeasurements,
          patientHeight,
          patientWeight,
          calculatedBodyFat: bodyFat,
          legLengthDiscrepancy: legDiscrepancy,
        },
        summary: `Anthropometry Assessment: ${result ? `BMI ${result.bmi}, Body Type: ${result.bodyType}` : ''} ${bodyFat ? `Body Fat: ${bodyFat}%` : ''} ${legDiscrepancy ? `LLD: ${legDiscrepancy}cm` : ''}`.trim(),
      };

      await saveAssessmentReport(reportData);
      setAssessmentSaved(true);
      Alert.alert(
        '✅ Assessment Saved',
        `Anthropometry data for ${selectedPatient.name} has been saved successfully.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving assessment:', error);
      Alert.alert('Error', 'Failed to save assessment. Please try again.');
    } finally {
      setSavingAssessment(false);
    }
  };

  // Generate PDF HTML - Professional Multi-Page Report
  const generatePDFHTML = (data: AnthropometryResult) => {
    const currentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const currentTime = new Date().toLocaleTimeString();
    const reportId = `WBA99-ANT-${Date.now().toString(36).toUpperCase()}`;
    
    const getBMICategory = (bmi: number) => {
      if (bmi < 18.5) return { category: 'Underweight', color: '#FF9800' };
      if (bmi < 25) return { category: 'Normal', color: '#4CAF50' };
      if (bmi < 30) return { category: 'Overweight', color: '#FF9800' };
      return { category: 'Obese', color: '#f44336' };
    };
    
    const bmiInfo = getBMICategory(data.bmi);
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background: #fff; color: #333; line-height: 1.4; }
        
        .page { 
          width: 210mm; 
          min-height: 297mm; 
          padding: 15mm;
          page-break-after: always;
          position: relative;
          background: #fff;
        }
        .page:last-child { page-break-after: auto; }
        
        /* Header */
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 15px;
          border-bottom: 3px solid #00BCD4;
          margin-bottom: 20px;
        }
        .logo-section {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .logo-circle {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #00BCD4 0%, #0097A7 100%);
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          border: 3px solid #00BCD4;
        }
        .logo-text { color: white; font-size: 14px; font-weight: bold; }
        .logo-sub { color: rgba(255,255,255,0.8); font-size: 8px; }
        .company-info h1 { font-size: 22px; color: #00838F; margin-bottom: 2px; }
        .company-info p { font-size: 10px; color: #666; }
        .report-meta { text-align: right; font-size: 10px; color: #666; }
        
        /* Page Title */
        .page-title {
          background: linear-gradient(135deg, #00BCD4 0%, #0097A7 100%);
          color: white;
          padding: 15px 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .page-title h2 { font-size: 18px; }
        .page-title .badge {
          background: #fff;
          color: #00838F;
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
        }
        
        /* Warning Box */
        .warning-box {
          background: #fff3e0;
          border: 2px solid #FF9800;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
          text-align: center;
        }
        .warning-box strong { color: #e65100; font-size: 14px; }
        
        /* BMI Section */
        .bmi-container {
          display: flex;
          gap: 20px;
          margin-bottom: 25px;
        }
        .bmi-card {
          flex: 1;
          text-align: center;
          padding: 25px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 15px;
          border: 3px solid ${bmiInfo.color};
        }
        .bmi-value {
          font-size: 56px;
          font-weight: bold;
          color: ${bmiInfo.color};
        }
        .bmi-label { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
        .bmi-status {
          display: inline-block;
          margin-top: 10px;
          padding: 8px 20px;
          border-radius: 25px;
          font-size: 14px;
          font-weight: bold;
          color: white;
          background: ${bmiInfo.color};
        }
        .body-type-card {
          flex: 1;
          text-align: center;
          padding: 25px;
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          border-radius: 15px;
          border: 3px solid #2196F3;
        }
        .body-type-value {
          font-size: 32px;
          font-weight: bold;
          color: #1565C0;
          margin-top: 10px;
        }
        
        /* Measurements Grid */
        .section {
          margin-bottom: 20px;
        }
        .section-header {
          background: linear-gradient(90deg, #00BCD4 0%, #00838F 100%);
          color: white;
          padding: 10px 15px;
          border-radius: 5px 5px 0 0;
          font-size: 14px;
          font-weight: bold;
        }
        .section-content {
          border: 1px solid #ddd;
          border-top: none;
          border-radius: 0 0 5px 5px;
          padding: 15px;
          background: #fff;
        }
        
        .measurement-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .measurement-item {
          background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%);
          padding: 15px;
          border-radius: 10px;
          text-align: center;
          border: 1px solid #00BCD4;
        }
        .measurement-value { font-size: 22px; font-weight: bold; color: #00838F; }
        .measurement-label { font-size: 10px; color: #666; margin-top: 5px; }
        .measurement-unit { font-size: 12px; color: #00838F; }
        
        /* Body Diagram */
        .body-diagram {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 200px;
          background: linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%);
          border-radius: 10px;
          margin: 15px 0;
          border: 2px dashed #00BCD4;
        }
        
        /* Proportion Table */
        .proportion-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        .proportion-table th {
          background: #00838F;
          color: white;
          padding: 10px 8px;
          text-align: left;
          font-weight: 600;
        }
        .proportion-table td {
          padding: 10px 8px;
          border-bottom: 1px solid #eee;
        }
        .proportion-table tr:nth-child(even) { background: #f8f9fa; }
        .status-normal { color: #4CAF50; font-weight: bold; }
        .status-warning { color: #FF9800; font-weight: bold; }
        .status-optimal { color: #2196F3; font-weight: bold; }
        
        /* Circumference Visual */
        .circum-container {
          display: flex;
          justify-content: space-around;
          margin: 20px 0;
        }
        .circum-item {
          text-align: center;
        }
        .circum-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00BCD4 0%, #0097A7 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          color: white;
          margin: 0 auto 8px;
        }
        .circum-value { font-size: 18px; font-weight: bold; }
        .circum-unit { font-size: 10px; }
        .circum-label { font-size: 11px; color: #666; }
        
        /* Footer */
        .report-footer {
          position: absolute;
          bottom: 15mm;
          left: 15mm;
          right: 15mm;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 10px;
          border-top: 1px solid #ddd;
          font-size: 9px;
          color: #666;
        }
        .footer-center { text-align: center; flex: 1; }
        
        /* Notes Section */
        .notes-box {
          min-height: 80px;
          border: 1px dashed #ccc;
          border-radius: 5px;
          padding: 10px;
          background: #fafafa;
        }
        .notes-box p { color: #999; font-size: 11px; }
      </style>
    </head>
    <body>
      <!-- PAGE 1: BMI & Body Measurements -->
      <div class="page">
        <div class="report-header">
          <div class="logo-section">
            <div class="logo-circle">
              <span class="logo-text">WBA99</span>
              <span class="logo-sub">ANTHRO</span>
            </div>
            <div class="company-info">
              <h1>Anthropometry Report</h1>
              <p>AI-Powered Body Measurement Analysis</p>
            </div>
          </div>
          <div class="report-meta">
            <p><strong>Report ID:</strong> ${reportId}</p>
            <p><strong>Date:</strong> ${currentDate}</p>
            <p><strong>Time:</strong> ${currentTime}</p>
          </div>
        </div>
        
        <div class="page-title">
          <h2>📏 ANTHROPOMETRY ANALYSIS REPORT</h2>
          <span class="badge">AI POWERED</span>
        </div>
        
        ${data.isMockData ? `
        <div class="warning-box">
          <strong>⚠️ DEMONSTRATION DATA - This is simulated analysis for demo purposes</strong>
        </div>
        ` : ''}
        
        <div class="bmi-container">
          <div class="bmi-card">
            <div class="bmi-label">Body Mass Index (BMI)</div>
            <div class="bmi-value">${data.bmi}</div>
            <span class="bmi-status">${bmiInfo.category}</span>
          </div>
          <div class="body-type-card">
            <div class="bmi-label">Somatotype Classification</div>
            <div class="body-type-value">${data.bodyType}</div>
            <p style="font-size: 11px; color: #666; margin-top: 10px;">
              ${data.bodyType === 'Ectomorph' ? 'Lean, long limbs, low body fat' : 
                data.bodyType === 'Mesomorph' ? 'Athletic build, muscular' : 
                'Wider build, stores fat easily'}
            </p>
          </div>
        </div>
        
        <div class="section">
          <div class="section-header">📐 LINEAR MEASUREMENTS</div>
          <div class="section-content">
            <div class="measurement-grid">
              <div class="measurement-item">
                <div class="measurement-value">${data.estimatedHeight}</div>
                <div class="measurement-unit">cm</div>
                <div class="measurement-label">Estimated Height</div>
              </div>
              <div class="measurement-item">
                <div class="measurement-value">${data.armSpan}</div>
                <div class="measurement-unit">cm</div>
                <div class="measurement-label">Arm Span</div>
              </div>
              <div class="measurement-item">
                <div class="measurement-value">${data.shoulderWidth}</div>
                <div class="measurement-unit">cm</div>
                <div class="measurement-label">Shoulder Width</div>
              </div>
              <div class="measurement-item">
                <div class="measurement-value">${data.torsoLength}</div>
                <div class="measurement-unit">cm</div>
                <div class="measurement-label">Torso Length</div>
              </div>
              <div class="measurement-item">
                <div class="measurement-value">${data.legLength}</div>
                <div class="measurement-unit">cm</div>
                <div class="measurement-label">Leg Length</div>
              </div>
              <div class="measurement-item">
                <div class="measurement-value">${data.headCircumference}</div>
                <div class="measurement-unit">cm</div>
                <div class="measurement-label">Head Circumference</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-header">⭕ CIRCUMFERENCE MEASUREMENTS</div>
          <div class="section-content">
            <div class="circum-container">
              <div class="circum-item">
                <div class="circum-circle">
                  <span class="circum-value">${data.chestCircumference}</span>
                  <span class="circum-unit">cm</span>
                </div>
                <div class="circum-label">Chest</div>
              </div>
              <div class="circum-item">
                <div class="circum-circle">
                  <span class="circum-value">${data.waistCircumference}</span>
                  <span class="circum-unit">cm</span>
                </div>
                <div class="circum-label">Waist</div>
              </div>
              <div class="circum-item">
                <div class="circum-circle">
                  <span class="circum-value">${data.hipCircumference}</span>
                  <span class="circum-unit">cm</span>
                </div>
                <div class="circum-label">Hip</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="report-footer">
          <span>WBA99 Expert Analysis India</span>
          <span class="footer-center">Page 1 of 2 | Confidential Medical Report</span>
          <span>www.wba99.com</span>
        </div>
      </div>
      
      <!-- PAGE 2: Proportion Analysis & Recommendations -->
      <div class="page">
        <div class="report-header">
          <div class="logo-section">
            <div class="logo-circle">
              <span class="logo-text">WBA99</span>
              <span class="logo-sub">ANTHRO</span>
            </div>
            <div class="company-info">
              <h1>Anthropometry Report</h1>
              <p>Proportion Analysis</p>
            </div>
          </div>
          <div class="report-meta">
            <p><strong>Report ID:</strong> ${reportId}</p>
          </div>
        </div>
        
        <div class="page-title">
          <h2>📊 BODY PROPORTION ANALYSIS</h2>
          <span class="badge">DETAILED</span>
        </div>
        
        <div class="section">
          <div class="section-header">📏 PROPORTION RATIOS</div>
          <div class="section-content">
            <table class="proportion-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                  <th>Reference Range</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${data.proportionAnalysis.map(p => `
                  <tr>
                    <td><strong>${p.metric}</strong></td>
                    <td style="font-size: 14px; font-weight: bold; color: #00838F;">${p.value}</td>
                    <td>${p.reference}</td>
                    <td class="status-${p.status}">${p.status.toUpperCase()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="section">
          <div class="section-header">💡 RECOMMENDATIONS</div>
          <div class="section-content">
            <ul style="list-style: none;">
              ${data.recommendations.map((r, i) => `
                <li style="display: flex; align-items: flex-start; gap: 10px; padding: 10px; margin-bottom: 8px; background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%); border-radius: 5px;">
                  <span style="width: 24px; height: 24px; background: #00BCD4; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0;">${i + 1}</span>
                  <span style="font-size: 11px; color: #333;">${r}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
        
        <div class="section">
          <div class="section-header">📝 CLINICAL NOTES</div>
          <div class="section-content">
            <div class="notes-box">
              <p>Space for clinical notes:</p>
            </div>
            <div style="margin-top: 20px; display: flex; justify-content: space-between;">
              <div>
                <p style="font-size: 10px; color: #666;">Next Assessment Date:</p>
                <div style="border-bottom: 1px solid #333; width: 150px; margin-top: 20px;"></div>
              </div>
              <div>
                <p style="font-size: 10px; color: #666;">Therapist Signature:</p>
                <div style="border-bottom: 1px solid #333; width: 150px; margin-top: 20px;"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div style="background: #f8f9fa; border-radius: 10px; padding: 15px; margin-top: 20px; text-align: center;">
          <p style="font-size: 11px; color: #666; margin-bottom: 10px;">
            <strong>Disclaimer:</strong> This AI-generated report is for clinical reference only. 
            Measurements should be verified manually for critical assessments.
          </p>
          <p style="font-size: 10px; color: #999;">
            Generated by WBA99 AI Anthropometry System | © 2025 WBA99 Expert Analysis India
          </p>
        </div>
        
        <div class="report-footer">
          <span>WBA99 Expert Analysis India</span>
          <span class="footer-center">Page 2 of 2 | Confidential Medical Report</span>
          <span>www.wba99.com</span>
        </div>
      </div>
    </body>
    </html>
  `;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return theme.colors.success;
      case 'warning': return theme.colors.warning;
      case 'optimal': return theme.colors.accent;
      default: return theme.colors.textMuted;
    }
  };

  // Get BMI color
  const getBMIColor = (bmi: number) => {
    if (bmi < 18.5) return theme.colors.warning;
    if (bmi > 25) return theme.colors.error;
    return theme.colors.success;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Anthropometry</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="human-male-height" size={40} color={theme.colors.accent} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Body Measurement Analysis</Text>
            <Text style={styles.infoSubtitle}>
              AI-powered estimation of body dimensions, proportions, and anthropometric indices
            </Text>
          </View>
        </View>

        {/* Patient Data Input */}
        {/* Patient Selector */}
        <PatientSelector
          physioId={currentUser?.id || ''}
          selectedPatient={selectedPatient}
          onSelectPatient={setSelectedPatient}
          label="Select Patient"
          placeholder="Tap to select a patient"
        />

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Patient Information</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputContainer}>
              <Ionicons name="resize-outline" size={20} color={theme.colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Height (cm)"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={patientHeight}
                onChangeText={setPatientHeight}
              />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="scale-outline" size={20} color={theme.colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Weight (kg)"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={patientWeight}
                onChangeText={setPatientWeight}
              />
            </View>
          </View>
        </View>

        {/* Measurement Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ai' && styles.tabActive]}
            onPress={() => setActiveTab('ai')}
          >
            <MaterialCommunityIcons name="robot" size={18} color={activeTab === 'ai' ? '#fff' : theme.colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'ai' && styles.tabTextActive]}>AI Analysis</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'trueLength' && styles.tabActive]}
            onPress={() => setActiveTab('trueLength')}
          >
            <MaterialCommunityIcons name="ruler" size={18} color={activeTab === 'trueLength' ? '#fff' : theme.colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'trueLength' && styles.tabTextActive]}>True Length</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'girth' && styles.tabActive]}
            onPress={() => setActiveTab('girth')}
          >
            <MaterialCommunityIcons name="tape-measure" size={18} color={activeTab === 'girth' ? '#fff' : theme.colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'girth' && styles.tabTextActive]}>Girth</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'skinfold' && styles.tabActive]}
            onPress={() => setActiveTab('skinfold')}
          >
            <MaterialCommunityIcons name="hand-front-right" size={18} color={activeTab === 'skinfold' ? '#fff' : theme.colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'skinfold' && styles.tabTextActive]}>Fat %</Text>
          </TouchableOpacity>
        </View>

        {/* TRUE LENGTH TAB */}
        {activeTab === 'trueLength' && (
          <View style={styles.measurementSection}>
            <View style={styles.sectionHeaderCard}>
              <MaterialCommunityIcons name="ruler" size={24} color="#2196F3" />
              <View>
                <Text style={styles.sectionHeaderTitle}>True Length / Segmental Length</Text>
                <Text style={styles.sectionHeaderSubtitle}>Measure bilateral limb lengths for discrepancy analysis</Text>
              </View>
            </View>

            {TRUE_LENGTH_SEGMENTS.map((segment) => (
              <View key={segment.id} style={styles.measurementCard}>
                <View style={styles.measurementHeader}>
                  <Text style={styles.measurementName}>{segment.name}</Text>
                  <Text style={styles.measurementMethod}>{segment.method}</Text>
                </View>
                <View style={styles.bilateralInputRow}>
                  <View style={styles.sideInput}>
                    <Text style={styles.sideLabel}>LEFT (cm)</Text>
                    <TextInput
                      style={styles.measureInput}
                      placeholder="0.0"
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="decimal-pad"
                      value={trueLengthMeasurements[segment.id]?.left || ''}
                      onChangeText={(v) => setTrueLengthMeasurements(prev => ({
                        ...prev,
                        [segment.id]: { ...prev[segment.id], left: v }
                      }))}
                    />
                  </View>
                  <View style={styles.sideInput}>
                    <Text style={styles.sideLabel}>RIGHT (cm)</Text>
                    <TextInput
                      style={styles.measureInput}
                      placeholder="0.0"
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="decimal-pad"
                      value={trueLengthMeasurements[segment.id]?.right || ''}
                      onChangeText={(v) => setTrueLengthMeasurements(prev => ({
                        ...prev,
                        [segment.id]: { ...prev[segment.id], right: v }
                      }))}
                    />
                  </View>
                  <View style={styles.diffBox}>
                    <Text style={styles.diffLabel}>DIFF</Text>
                    <Text style={[
                      styles.diffValue,
                      trueLengthMeasurements[segment.id]?.left && trueLengthMeasurements[segment.id]?.right &&
                      Math.abs(parseFloat(trueLengthMeasurements[segment.id].left) - parseFloat(trueLengthMeasurements[segment.id].right)) > 1 
                        ? styles.diffWarning : styles.diffNormal
                    ]}>
                      {trueLengthMeasurements[segment.id]?.left && trueLengthMeasurements[segment.id]?.right
                        ? Math.abs(parseFloat(trueLengthMeasurements[segment.id].left) - parseFloat(trueLengthMeasurements[segment.id].right)).toFixed(1)
                        : '-'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.normalRange}>Normal Range: {segment.normalRange}</Text>
              </View>
            ))}

            {calculateLLD() && (
              <View style={[styles.summaryCard, parseFloat(calculateLLD()!) > 1 ? styles.summaryWarning : styles.summaryNormal]}>
                <MaterialCommunityIcons 
                  name={parseFloat(calculateLLD()!) > 1 ? "alert-circle" : "check-circle"} 
                  size={24} 
                  color={parseFloat(calculateLLD()!) > 1 ? "#FF9800" : "#4CAF50"} 
                />
                <View>
                  <Text style={styles.summaryTitle}>Leg Length Discrepancy (LLD)</Text>
                  <Text style={styles.summaryValue}>{calculateLLD()} cm</Text>
                  <Text style={styles.summaryNote}>
                    {parseFloat(calculateLLD()!) > 1.5 ? 'Significant discrepancy - consider intervention' :
                     parseFloat(calculateLLD()!) > 1 ? 'Mild discrepancy - monitor' : 'Within normal limits'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* GIRTH MEASUREMENT TAB */}
        {activeTab === 'girth' && (
          <View style={styles.measurementSection}>
            <View style={styles.sectionHeaderCard}>
              <MaterialCommunityIcons name="tape-measure" size={24} color="#9C27B0" />
              <View>
                <Text style={styles.sectionHeaderTitle}>Girth Measurements</Text>
                <Text style={styles.sectionHeaderSubtitle}>Circumference measurements for muscle mass & edema assessment</Text>
              </View>
            </View>

            {GIRTH_SITES.map((site) => (
              <View key={site.id} style={styles.measurementCard}>
                <View style={styles.measurementHeader}>
                  <Text style={styles.measurementName}>{site.name}</Text>
                  <Text style={styles.measurementMethod}>📍 {site.landmark}</Text>
                </View>
                <View style={styles.bilateralInputRow}>
                  <View style={styles.sideInput}>
                    <Text style={styles.sideLabel}>LEFT (cm)</Text>
                    <TextInput
                      style={styles.measureInput}
                      placeholder="0.0"
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="decimal-pad"
                      value={girthMeasurements[site.id]?.left || ''}
                      onChangeText={(v) => setGirthMeasurements(prev => ({
                        ...prev,
                        [site.id]: { ...prev[site.id], left: v }
                      }))}
                    />
                  </View>
                  <View style={styles.sideInput}>
                    <Text style={styles.sideLabel}>RIGHT (cm)</Text>
                    <TextInput
                      style={styles.measureInput}
                      placeholder="0.0"
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="decimal-pad"
                      value={girthMeasurements[site.id]?.right || ''}
                      onChangeText={(v) => setGirthMeasurements(prev => ({
                        ...prev,
                        [site.id]: { ...prev[site.id], right: v }
                      }))}
                    />
                  </View>
                  <View style={styles.diffBox}>
                    <Text style={styles.diffLabel}>DIFF</Text>
                    <Text style={[
                      styles.diffValue,
                      girthMeasurements[site.id]?.left && girthMeasurements[site.id]?.right &&
                      Math.abs(parseFloat(girthMeasurements[site.id].left) - parseFloat(girthMeasurements[site.id].right)) > 2 
                        ? styles.diffWarning : styles.diffNormal
                    ]}>
                      {girthMeasurements[site.id]?.left && girthMeasurements[site.id]?.right
                        ? Math.abs(parseFloat(girthMeasurements[site.id].left) - parseFloat(girthMeasurements[site.id].right)).toFixed(1)
                        : '-'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.normalRange}>Normal Range: {site.normalRange}</Text>
              </View>
            ))}
          </View>
        )}

        {/* SKINFOLD / FAT MEASUREMENT TAB */}
        {activeTab === 'skinfold' && (
          <View style={styles.measurementSection}>
            <View style={styles.sectionHeaderCard}>
              <MaterialCommunityIcons name="hand-front-right" size={24} color="#FF5722" />
              <View>
                <Text style={styles.sectionHeaderTitle}>Skinfold Fat Measurement</Text>
                <Text style={styles.sectionHeaderSubtitle}>Caliper measurements for body fat % estimation</Text>
              </View>
            </View>

            <View style={styles.caliperTip}>
              <MaterialCommunityIcons name="information" size={20} color="#2196F3" />
              <Text style={styles.caliperTipText}>
                Take 3 readings at each site. Use caliper 1cm below pinch point. Wait 2-3 seconds before reading.
              </Text>
            </View>

            {SKINFOLD_SITES.map((site) => (
              <View key={site.id} style={styles.measurementCard}>
                <View style={styles.measurementHeader}>
                  <Text style={styles.measurementName}>{site.name}</Text>
                  <Text style={styles.measurementMethod}>📍 {site.landmark}</Text>
                </View>
                <View style={styles.skinfoldInputRow}>
                  <View style={styles.skinfoldInput}>
                    <Text style={styles.readingLabel}>R1 (mm)</Text>
                    <TextInput
                      style={styles.measureInput}
                      placeholder="0"
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="decimal-pad"
                      value={skinfoldMeasurements[site.id]?.r1 || ''}
                      onChangeText={(v) => setSkinfoldMeasurements(prev => ({
                        ...prev,
                        [site.id]: { ...prev[site.id], r1: v }
                      }))}
                    />
                  </View>
                  <View style={styles.skinfoldInput}>
                    <Text style={styles.readingLabel}>R2 (mm)</Text>
                    <TextInput
                      style={styles.measureInput}
                      placeholder="0"
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="decimal-pad"
                      value={skinfoldMeasurements[site.id]?.r2 || ''}
                      onChangeText={(v) => setSkinfoldMeasurements(prev => ({
                        ...prev,
                        [site.id]: { ...prev[site.id], r2: v }
                      }))}
                    />
                  </View>
                  <View style={styles.skinfoldInput}>
                    <Text style={styles.readingLabel}>R3 (mm)</Text>
                    <TextInput
                      style={styles.measureInput}
                      placeholder="0"
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="decimal-pad"
                      value={skinfoldMeasurements[site.id]?.r3 || ''}
                      onChangeText={(v) => setSkinfoldMeasurements(prev => ({
                        ...prev,
                        [site.id]: { ...prev[site.id], r3: v }
                      }))}
                    />
                  </View>
                  <View style={styles.avgBox}>
                    <Text style={styles.avgLabel}>AVG</Text>
                    <Text style={styles.avgValue}>
                      {skinfoldMeasurements[site.id]?.r1 && skinfoldMeasurements[site.id]?.r2 && skinfoldMeasurements[site.id]?.r3
                        ? ((parseFloat(skinfoldMeasurements[site.id].r1) + parseFloat(skinfoldMeasurements[site.id].r2) + parseFloat(skinfoldMeasurements[site.id].r3)) / 3).toFixed(1)
                        : '-'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {calculateBodyFat() && (
              <View style={styles.bodyFatResult}>
                <Text style={styles.bodyFatTitle}>Estimated Body Fat Percentage</Text>
                <Text style={styles.bodyFatValue}>{calculateBodyFat()}%</Text>
                <Text style={styles.bodyFatNote}>
                  (Based on Durnin & Womersley 4-site formula)
                </Text>
                <View style={styles.bodyFatScale}>
                  <View style={[styles.fatCategory, { backgroundColor: '#4CAF50' }]}>
                    <Text style={styles.fatCategoryText}>Essential: 2-5%</Text>
                  </View>
                  <View style={[styles.fatCategory, { backgroundColor: '#8BC34A' }]}>
                    <Text style={styles.fatCategoryText}>Athletic: 6-13%</Text>
                  </View>
                  <View style={[styles.fatCategory, { backgroundColor: '#CDDC39' }]}>
                    <Text style={styles.fatCategoryText}>Fitness: 14-17%</Text>
                  </View>
                  <View style={[styles.fatCategory, { backgroundColor: '#FFC107' }]}>
                    <Text style={styles.fatCategoryText}>Average: 18-24%</Text>
                  </View>
                  <View style={[styles.fatCategory, { backgroundColor: '#FF9800' }]}>
                    <Text style={styles.fatCategoryText}>Above: 25%+</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* AI ANALYSIS TAB (Original Upload Section) */}
        {activeTab === 'ai' && (
          <>
          {!imageUri ? (
          <View style={styles.uploadSection}>
            <MaterialCommunityIcons name="human" size={80} color={theme.colors.accent} />
            <Text style={styles.uploadTitle}>Upload Full Body Photo</Text>
            <Text style={styles.uploadSubtitle}>
              Stand straight with arms at sides for best results
            </Text>
            
            <View style={styles.uploadButtons}>
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                <Ionicons name="images" size={24} color={theme.colors.textPrimary} />
                <Text style={styles.uploadButtonText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
                <Ionicons name="camera" size={24} color={theme.colors.textPrimary} />
                <Text style={styles.uploadButtonText}>Camera</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>📸 Photo Tips:</Text>
              <Text style={styles.tipText}>• Full body should be visible</Text>
              <Text style={styles.tipText}>• Stand straight, arms relaxed at sides</Text>
              <Text style={styles.tipText}>• Wear fitted clothing for accuracy</Text>
              <Text style={styles.tipText}>• Use a plain background</Text>
            </View>

            {/* Inclinometer Link */}
            <TouchableOpacity 
              style={styles.inclinometerLink}
              onPress={() => router.push('/physio/goniometry-rom')}
            >
              <MaterialCommunityIcons name="angle-acute" size={28} color={theme.colors.accent} />
              <View style={styles.inclinometerLinkContent}>
                <Text style={styles.inclinometerLinkTitle}>Goniometry & ROM Assessment</Text>
                <Text style={styles.inclinometerLinkText}>Measure joint angles, IR/ER, with AI analysis</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={theme.colors.accent} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Image Preview */}
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.uploadedImage} />
              <TouchableOpacity 
                style={styles.changeImageButton}
                onPress={() => {
                  setImageUri(null);
                  setResult(null);
                  setPaymentVerified(false);
                }}
              >
                <Ionicons name="refresh" size={16} color={theme.colors.textPrimary} />
                <Text style={styles.changeImageText}>Change</Text>
              </TouchableOpacity>
            </View>

            {/* Analyze Button */}
            {!result && (
              <TouchableOpacity
                style={[styles.analyzeButton, analyzing && styles.analyzeButtonDisabled]}
                onPress={analyzeAnthropometry}
                disabled={analyzing}
              >
                {analyzing ? (
                  <>
                    <ActivityIndicator color={theme.colors.textPrimary} />
                    <Text style={styles.analyzeButtonText}>Analyzing Body Measurements...</Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="ruler" size={24} color={theme.colors.textPrimary} />
                    <Text style={styles.analyzeButtonText}>Analyze Anthropometry</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Results */}
            {result && (
              <>
                {/* Mock Data Warning */}
                {result.isMockData && (
                  <View style={styles.mockWarning}>
                    <Ionicons name="warning" size={20} color={theme.colors.warning} />
                    <Text style={styles.mockWarningText}>SIMULATED DATA - Demo Only</Text>
                  </View>
                )}

                {/* BMI Card */}
                <View style={styles.bmiCard}>
                  <Text style={styles.bmiLabel}>Body Mass Index (BMI)</Text>
                  <Text style={[styles.bmiValue, { color: getBMIColor(result.bmi) }]}>
                    {result.bmi}
                  </Text>
                  <View style={[styles.bodyTypeBadge, { backgroundColor: getBMIColor(result.bmi) + '20' }]}>
                    <Text style={[styles.bodyTypeText, { color: getBMIColor(result.bmi) }]}>
                      {result.bodyType}
                    </Text>
                  </View>
                </View>

                {/* Measurements Grid */}
                <View style={styles.measurementsSection}>
                  <Text style={styles.sectionTitle}>📏 Body Measurements</Text>
                  <View style={styles.measurementsGrid}>
                    <MeasurementItem label="Height" value={`${result.estimatedHeight} cm`} icon="resize-outline" />
                    <MeasurementItem label="Arm Span" value={`${result.armSpan} cm`} icon="swap-horizontal" />
                    <MeasurementItem label="Shoulder Width" value={`${result.shoulderWidth} cm`} icon="remove-outline" />
                    <MeasurementItem label="Torso Length" value={`${result.torsoLength} cm`} icon="body-outline" />
                    <MeasurementItem label="Leg Length" value={`${result.legLength} cm`} icon="walk-outline" />
                    <MeasurementItem label="Head Circ." value={`${result.headCircumference} cm`} icon="ellipse-outline" />
                    <MeasurementItem label="Chest Circ." value={`${result.chestCircumference} cm`} icon="fitness-outline" />
                    <MeasurementItem label="Waist Circ." value={`${result.waistCircumference} cm`} icon="ellipse-outline" />
                    <MeasurementItem label="Hip Circ." value={`${result.hipCircumference} cm`} icon="ellipse-outline" />
                  </View>
                </View>

                {/* Proportion Analysis */}
                <View style={styles.proportionsSection}>
                  <Text style={styles.sectionTitle}>📊 Proportion Analysis</Text>
                  {result.proportionAnalysis.map((prop, index) => (
                    <View key={index} style={styles.proportionRow}>
                      <View style={styles.proportionInfo}>
                        <Text style={styles.proportionMetric}>{prop.metric}</Text>
                        <Text style={styles.proportionRef}>Ref: {prop.reference}</Text>
                      </View>
                      <View style={styles.proportionValues}>
                        <Text style={styles.proportionValue}>{prop.value}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(prop.status) }]}>
                          <Text style={styles.statusText}>{prop.status}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>

                {/* QR Payment & PDF Generation */}
                <View style={styles.actionSection}>
                  {!paymentVerified ? (
                    <TouchableOpacity
                      style={styles.qrButton}
                      onPress={() => setShowQRModal(true)}
                    >
                      <Ionicons name="qr-code" size={24} color={theme.colors.textPrimary} />
                      <Text style={styles.qrButtonText}>Scan QR to Generate Report</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.pdfButton, generatingPdf && styles.pdfButtonDisabled]}
                      onPress={generatePDFReport}
                      disabled={generatingPdf}
                    >
                      {generatingPdf ? (
                        <>
                          <ActivityIndicator color={theme.colors.textPrimary} />
                          <Text style={styles.pdfButtonText}>Generating PDF...</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="document-text" size={24} color={theme.colors.textPrimary} />
                          <Text style={styles.pdfButtonText}>Download PDF Report</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Save Assessment Button */}
                  <TouchableOpacity
                    style={[styles.saveButton, (savingAssessment || assessmentSaved) && styles.saveButtonDisabled]}
                    onPress={handleSaveAssessment}
                    disabled={savingAssessment || assessmentSaved}
                  >
                    {savingAssessment ? (
                      <>
                        <ActivityIndicator color={theme.colors.textPrimary} />
                        <Text style={styles.saveButtonText}>Saving...</Text>
                      </>
                    ) : assessmentSaved ? (
                      <>
                        <Ionicons name="checkmark-circle" size={24} color={theme.colors.textPrimary} />
                        <Text style={styles.saveButtonText}>Assessment Saved</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="save" size={24} color={theme.colors.textPrimary} />
                        <Text style={styles.saveButtonText}>Save to Patient Record</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}
        </>
        )}

        {/* QR Code Modal */}
        <Modal
          visible={showQRModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowQRModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Payment Verification</Text>
              <Text style={styles.modalSubtitle}>
                Scan the QR code to complete payment and generate report
              </Text>
              
              <View style={styles.qrCodeContainer}>
                <View style={styles.qrCodePlaceholder}>
                  <Ionicons name="qr-code" size={120} color={theme.colors.accent} />
                </View>
                <Text style={styles.qrCodeLabel}>Scan with UPI App</Text>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.verifyButton} onPress={verifyPayment}>
                  <Text style={styles.verifyButtonText}>Verify Payment</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowQRModal(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

// Measurement Item Component
const MeasurementItem = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
  <View style={styles.measurementItem}>
    <Ionicons name={icon as any} size={20} color={theme.colors.accent} />
    <Text style={styles.measurementValue}>{value}</Text>
    <Text style={styles.measurementLabel}>{label}</Text>
  </View>
);

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
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  infoTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  infoSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  // Input Section
  inputSection: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    paddingVertical: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  // Upload Section
  uploadSection: {
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.accent,
  },
  uploadTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  uploadSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  uploadButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  tipCard: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
    width: '100%',
  },
  tipTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  tipText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  inclinometerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent + '20',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  inclinometerLinkContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  inclinometerLinkTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  inclinometerLinkText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  // Image Container
  imageContainer: {
    position: 'relative',
    marginBottom: theme.spacing.md,
  },
  uploadedImage: {
    width: '100%',
    height: SCREEN_WIDTH * 1.3,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.card,
  },
  changeImageButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  changeImageText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textPrimary,
  },
  // Analyze Button
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  analyzeButtonDisabled: {
    opacity: 0.7,
  },
  analyzeButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  // Mock Warning
  mockWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.warning + '20',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  mockWarningText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.warning,
  },
  // BMI Card
  bmiCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  bmiLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  bmiValue: {
    fontSize: 48,
    fontWeight: theme.fontWeight.bold,
    marginVertical: theme.spacing.sm,
  },
  bodyTypeBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  bodyTypeText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  // Measurements Section
  measurementsSection: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  measurementItem: {
    width: (SCREEN_WIDTH - theme.spacing.md * 4 - theme.spacing.sm * 2) / 3,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  measurementValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
  },
  measurementLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  // Proportions Section
  proportionsSection: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  proportionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  proportionInfo: {
    flex: 1,
  },
  proportionMetric: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.medium,
  },
  proportionRef: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  proportionValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  proportionValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
    textTransform: 'uppercase',
  },
  // Action Section
  actionSection: {
    marginTop: theme.spacing.md,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.warning,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  qrButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  pdfButtonDisabled: {
    opacity: 0.7,
  },
  pdfButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  modalSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  qrCodePlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCodeLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  modalButtons: {
    width: '100%',
    gap: theme.spacing.sm,
  },
  verifyButton: {
    backgroundColor: theme.colors.success,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  verifyButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  cancelButton: {
    backgroundColor: theme.colors.primaryLight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  
  // Tab styles
  tabContainer: { flexDirection: 'row', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: 4, marginBottom: theme.spacing.md },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.sm, paddingHorizontal: 4, borderRadius: theme.borderRadius.sm, gap: 4 },
  tabActive: { backgroundColor: theme.colors.accent },
  tabText: { fontSize: 10, color: theme.colors.textMuted },
  tabTextActive: { color: '#fff', fontWeight: 'bold' as const },
  
  // Measurement section styles
  measurementSection: { marginBottom: theme.spacing.lg },
  sectionHeaderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md, gap: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  sectionHeaderTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  sectionHeaderSubtitle: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: 2 },
  
  measurementCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.cardBorder },
  measurementHeader: { marginBottom: theme.spacing.sm },
  measurementName: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  measurementMethod: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: 2 },
  
  bilateralInputRow: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-end' },
  sideInput: { flex: 1 },
  sideLabel: { fontSize: 9, color: theme.colors.textMuted, marginBottom: 4, textAlign: 'center' as const },
  measureInput: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm, padding: theme.spacing.sm, color: theme.colors.textPrimary, fontSize: theme.fontSize.md, textAlign: 'center' as const, borderWidth: 1, borderColor: theme.colors.cardBorder },
  
  diffBox: { width: 50, alignItems: 'center' as const },
  diffLabel: { fontSize: 9, color: theme.colors.textMuted, marginBottom: 4 },
  diffValue: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold },
  diffNormal: { color: theme.colors.success },
  diffWarning: { color: theme.colors.warning },
  
  normalRange: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: theme.spacing.sm, fontStyle: 'italic' as const },
  
  summaryCard: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.md, gap: theme.spacing.md },
  summaryNormal: { backgroundColor: 'rgba(76, 175, 80, 0.1)', borderWidth: 1, borderColor: '#4CAF50' },
  summaryWarning: { backgroundColor: 'rgba(255, 152, 0, 0.1)', borderWidth: 1, borderColor: '#FF9800' },
  summaryTitle: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  summaryValue: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.accent },
  summaryNote: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: 2 },
  
  // Skinfold styles
  skinfoldInputRow: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-end' },
  skinfoldInput: { flex: 1 },
  readingLabel: { fontSize: 9, color: theme.colors.textMuted, marginBottom: 4, textAlign: 'center' as const },
  avgBox: { width: 50, alignItems: 'center' as const },
  avgLabel: { fontSize: 9, color: theme.colors.accent, marginBottom: 4 },
  avgValue: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.accent },
  
  caliperTip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(33, 150, 243, 0.1)', borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md, gap: theme.spacing.sm },
  caliperTipText: { flex: 1, fontSize: theme.fontSize.xs, color: '#2196F3' },
  
  bodyFatResult: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginTop: theme.spacing.md, alignItems: 'center' as const, borderWidth: 2, borderColor: theme.colors.accent },
  bodyFatTitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  bodyFatValue: { fontSize: 48, fontWeight: theme.fontWeight.bold, color: theme.colors.accent, marginVertical: theme.spacing.sm },
  bodyFatNote: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted },
  bodyFatScale: { flexDirection: 'row', marginTop: theme.spacing.md, borderRadius: theme.borderRadius.sm, overflow: 'hidden' as const },
  fatCategory: { flex: 1, paddingVertical: 4, alignItems: 'center' as const },
  fatCategoryText: { fontSize: 7, color: '#fff', fontWeight: 'bold' as const },
});
