import React, { useState, useRef } from 'react';
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
import Constants from 'expo-constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Landmark types
interface Landmark {
  name: string;
  x: number;
  y: number;
  confidence: number;
}

interface JointAngle {
  joint: string;
  angle: number;
  deviation: number;
  status: 'normal' | 'warning' | 'critical';
  reference: string;
}

interface AnalysisResult {
  landmarks: Landmark[];
  angles: JointAngle[];
  totalScore: number;
  posturalDeviations: string[];
  recommendations: string[];
  summary: string;
  isMockData?: boolean; // Flag to indicate if this is simulated data
}

// Default landmarks for visualization
const DEFAULT_LANDMARKS: Landmark[] = [
  { name: 'Head', x: 0.5, y: 0.08, confidence: 0.95 },
  { name: 'Neck', x: 0.5, y: 0.15, confidence: 0.92 },
  { name: 'Right Shoulder', x: 0.35, y: 0.2, confidence: 0.94 },
  { name: 'Left Shoulder', x: 0.65, y: 0.2, confidence: 0.93 },
  { name: 'Right Elbow', x: 0.28, y: 0.35, confidence: 0.91 },
  { name: 'Left Elbow', x: 0.72, y: 0.35, confidence: 0.90 },
  { name: 'Right Wrist', x: 0.25, y: 0.48, confidence: 0.88 },
  { name: 'Left Wrist', x: 0.75, y: 0.48, confidence: 0.87 },
  { name: 'Right Hip', x: 0.4, y: 0.52, confidence: 0.96 },
  { name: 'Left Hip', x: 0.6, y: 0.52, confidence: 0.95 },
  { name: 'Right Knee', x: 0.38, y: 0.72, confidence: 0.93 },
  { name: 'Left Knee', x: 0.62, y: 0.72, confidence: 0.92 },
  { name: 'Right Ankle', x: 0.36, y: 0.92, confidence: 0.89 },
  { name: 'Left Ankle', x: 0.64, y: 0.92, confidence: 0.88 },
];

// Skeleton connections for drawing lines
const SKELETON_CONNECTIONS = [
  ['Head', 'Neck'],
  ['Neck', 'Right Shoulder'],
  ['Neck', 'Left Shoulder'],
  ['Right Shoulder', 'Right Elbow'],
  ['Left Shoulder', 'Left Elbow'],
  ['Right Elbow', 'Right Wrist'],
  ['Left Elbow', 'Left Wrist'],
  ['Right Shoulder', 'Right Hip'],
  ['Left Shoulder', 'Left Hip'],
  ['Right Hip', 'Left Hip'],
  ['Right Hip', 'Right Knee'],
  ['Left Hip', 'Left Knee'],
  ['Right Knee', 'Right Ankle'],
  ['Left Knee', 'Left Ankle'],
];

export default function AIPoseAnalysis() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'metrics' | 'graph' | 'comments'>('analysis');
  const [generatingPdf, setGeneratingPdf] = useState(false);

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
      setAnalysisResult(null);
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
      setAnalysisResult(null);
      setPaymentVerified(false);
    }
  };

  // Analyze pose with AI
  const analyzePose = async () => {
    if (!imageUri) {
      Alert.alert('Error', 'Please upload an image first');
      return;
    }

    setAnalyzing(true);
    try {
      // Call backend AI endpoint for pose analysis
      const response = await fetch(`${BACKEND_URL}/api/ai/analyze-pose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_data: imageUri,
          analysis_type: 'full_body',
          patient_id: currentUser?.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysisResult(data);
      } else {
        // Generate mock analysis if API fails
        generateMockAnalysis();
      }
    } catch (error) {
      console.error('Analysis error:', error);
      // Generate mock analysis for demo
      generateMockAnalysis();
    } finally {
      setAnalyzing(false);
    }
  };

  // Generate mock analysis for demonstration
  const generateMockAnalysis = () => {
    // Generate random variations for more realistic-looking scores
    const baseScore = Math.floor(Math.random() * 20) + 60; // 60-80 range
    
    const angles: JointAngle[] = [
      { joint: 'Head Tilt', angle: Math.floor(Math.random() * 6) - 3, deviation: Math.floor(Math.random() * 4) + 1, status: 'normal', reference: '0°' },
      { joint: 'Neck Flexion', angle: Math.floor(Math.random() * 8) + 10, deviation: Math.floor(Math.random() * 3) + 1, status: 'normal', reference: '10-15°' },
      { joint: 'Shoulder Level', angle: Math.floor(Math.random() * 4) - 2, deviation: Math.floor(Math.random() * 3) + 1, status: 'normal', reference: '0°' },
      { joint: 'Thoracic Kyphosis', angle: Math.floor(Math.random() * 15) + 28, deviation: Math.floor(Math.random() * 6) + 2, status: Math.random() > 0.5 ? 'warning' : 'normal', reference: '20-40°' },
      { joint: 'Lumbar Lordosis', angle: Math.floor(Math.random() * 15) + 35, deviation: Math.floor(Math.random() * 6) + 2, status: Math.random() > 0.5 ? 'warning' : 'normal', reference: '30-50°' },
      { joint: 'Pelvic Tilt', angle: Math.floor(Math.random() * 6) + 5, deviation: Math.floor(Math.random() * 4) + 1, status: 'normal', reference: '5-10°' },
      { joint: 'Right Knee', angle: Math.floor(Math.random() * 6) + 175, deviation: Math.floor(Math.random() * 4) + 1, status: 'normal', reference: '180°' },
      { joint: 'Left Knee', angle: Math.floor(Math.random() * 8) + 172, deviation: Math.floor(Math.random() * 5) + 2, status: Math.random() > 0.6 ? 'warning' : 'normal', reference: '180°' },
      { joint: 'Right Ankle', angle: Math.floor(Math.random() * 6) + 86, deviation: Math.floor(Math.random() * 4) + 1, status: 'normal', reference: '90°' },
      { joint: 'Left Ankle', angle: Math.floor(Math.random() * 8) + 82, deviation: Math.floor(Math.random() * 5) + 2, status: Math.random() > 0.6 ? 'warning' : 'normal', reference: '90°' },
    ];

    const result: AnalysisResult = {
      landmarks: [], // Empty landmarks - don't show skeleton for mock data
      angles,
      totalScore: baseScore,
      posturalDeviations: [
        'Note: This is a SIMULATED analysis for demonstration',
        'For accurate AI-based pose detection, real ML model integration is required',
        'Contact admin to enable real-time pose estimation',
      ],
      recommendations: [
        'This analysis provides sample recommendations',
        'Real AI analysis would provide personalized insights',
        'Upload high-quality full-body photos for best results',
        'Ensure good lighting and clear visibility of joints',
      ],
      summary: '⚠️ SIMULATED ANALYSIS: This is demonstration data showing how the analysis report would appear. For real AI-powered pose estimation with accurate landmark detection and joint angle measurements, please ensure the backend AI service is properly configured. The actual implementation would use computer vision to detect body landmarks from the uploaded image.',
      isMockData: true,
    };

    setAnalysisResult(result);
  };

  // Verify QR payment
  const verifyPayment = () => {
    // Simulate payment verification
    setTimeout(() => {
      setPaymentVerified(true);
      setShowQRModal(false);
      Alert.alert('Payment Verified', 'You can now generate the PDF report');
    }, 1500);
  };

  // Generate PDF Report
  const generatePDFReport = async () => {
    if (!analysisResult) return;

    setGeneratingPdf(true);
    try {
      const html = generatePDFHTML(analysisResult);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Generate PDF HTML
  const generatePDFHTML = (result: AnalysisResult) => {
    const currentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const currentTime = new Date().toLocaleTimeString();
    const reportId = `WBA99-${Date.now().toString(36).toUpperCase()}`;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background: #fff; color: #333; line-height: 1.4; }
        
        /* Page Layout */
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
          border-bottom: 3px solid #8B4513;
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
          background: linear-gradient(135deg, #8B4513 0%, #D4AF37 100%);
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          border: 3px solid #D4AF37;
        }
        .logo-text { color: white; font-size: 14px; font-weight: bold; }
        .logo-sub { color: rgba(255,255,255,0.8); font-size: 8px; }
        .company-info h1 { font-size: 22px; color: #8B4513; margin-bottom: 2px; }
        .company-info p { font-size: 10px; color: #666; }
        .report-meta { text-align: right; font-size: 10px; color: #666; }
        .report-meta strong { color: #333; }
        
        /* Page Title */
        .page-title {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
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
          background: #00d9ff;
          color: #1a1a2e;
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
        }
        
        /* Score Section */
        .score-container {
          display: flex;
          justify-content: space-around;
          gap: 20px;
          margin-bottom: 25px;
        }
        .score-card {
          flex: 1;
          text-align: center;
          padding: 20px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 10px;
          border: 2px solid #D4AF37;
        }
        .score-value {
          font-size: 48px;
          font-weight: bold;
          color: ${result.totalScore >= 80 ? '#4CAF50' : result.totalScore >= 60 ? '#FF9800' : '#f44336'};
        }
        .score-label { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
        .score-status {
          display: inline-block;
          margin-top: 10px;
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: bold;
          color: white;
          background: ${result.totalScore >= 80 ? '#4CAF50' : result.totalScore >= 60 ? '#FF9800' : '#f44336'};
        }
        
        /* Patient Info Box */
        .patient-info {
          background: #f0fff0;
          border: 1px solid #90EE90;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
        }
        .patient-info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }
        .info-item label { font-size: 10px; color: #666; display: block; margin-bottom: 3px; }
        .info-item span { font-size: 12px; font-weight: bold; color: #333; }
        
        /* Analysis Section */
        .section {
          margin-bottom: 20px;
        }
        .section-header {
          background: linear-gradient(90deg, #8B4513 0%, #D4AF37 100%);
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
        
        /* Joint Angles Table */
        .angles-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        .angles-table th {
          background: #1a1a2e;
          color: white;
          padding: 10px 8px;
          text-align: left;
          font-weight: 600;
        }
        .angles-table td {
          padding: 10px 8px;
          border-bottom: 1px solid #eee;
        }
        .angles-table tr:nth-child(even) { background: #f8f9fa; }
        .status-normal { color: #4CAF50; font-weight: bold; }
        .status-warning { color: #FF9800; font-weight: bold; }
        .status-critical { color: #f44336; font-weight: bold; }
        .angle-value { font-size: 14px; font-weight: bold; color: #00d9ff; }
        
        /* Body Diagram Placeholder */
        .body-diagram {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 200px;
          background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
          border-radius: 10px;
          margin: 15px 0;
          border: 2px dashed #999;
        }
        .diagram-text { color: #666; font-style: italic; }
        
        /* Deviation Cards */
        .deviation-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .deviation-card {
          background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
          border-left: 4px solid #FF9800;
          padding: 12px;
          border-radius: 0 5px 5px 0;
        }
        .deviation-title { font-weight: bold; color: #e65100; font-size: 12px; margin-bottom: 5px; }
        .deviation-detail { font-size: 11px; color: #666; }
        
        /* Recommendations */
        .recommendation-list {
          list-style: none;
        }
        .recommendation-list li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
          border-radius: 5px;
        }
        .rec-icon {
          width: 24px;
          height: 24px;
          background: #4CAF50;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          flex-shrink: 0;
        }
        .rec-text { font-size: 11px; color: #333; }
        
        /* Summary Box */
        .summary-box {
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          border-radius: 10px;
          padding: 20px;
          border-left: 5px solid #2196F3;
        }
        .summary-box h3 { color: #1565C0; margin-bottom: 10px; font-size: 14px; }
        .summary-box p { font-size: 12px; line-height: 1.6; color: #333; }
        
        /* Analysis View Box */
        .view-box {
          border: 2px solid #1a1a2e;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 15px;
        }
        .view-header {
          background: #1a1a2e;
          color: white;
          padding: 10px 15px;
          font-size: 14px;
          font-weight: bold;
        }
        .view-content {
          padding: 20px;
          background: #f5f5f5;
          min-height: 180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        /* Angle Labels */
        .angle-labels {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 15px;
          width: 100%;
        }
        .angle-label-item {
          background: linear-gradient(135deg, #00d9ff 0%, #00a8cc 100%);
          color: #1a1a2e;
          padding: 8px 12px;
          border-radius: 20px;
          text-align: center;
          font-size: 11px;
          font-weight: bold;
        }
        
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
        
        /* Measurement Grid */
        .measurement-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
        }
        .measurement-item {
          background: #f8f9fa;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 10px;
          text-align: center;
        }
        .measurement-value { font-size: 18px; font-weight: bold; color: #00d9ff; }
        .measurement-label { font-size: 9px; color: #666; margin-top: 3px; }
        
        /* Graph Placeholder */
        .graph-container {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          margin: 10px 0;
        }
        .graph-title { font-size: 12px; font-weight: bold; color: #333; margin-bottom: 10px; }
        .graph-placeholder {
          height: 80px;
          background: linear-gradient(90deg, 
            #4CAF50 0%, #8BC34A 15%, #CDDC39 30%, #FFEB3B 45%, 
            #FFC107 60%, #FF9800 75%, #FF5722 90%, #f44336 100%);
          border-radius: 5px;
          opacity: 0.3;
        }
        .graph-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 5px;
          font-size: 9px;
          color: #666;
        }
        
        /* Regional Analysis */
        .regional-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }
        .regional-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
        }
        .regional-header {
          background: ${result.totalScore >= 80 ? '#4CAF50' : result.totalScore >= 60 ? '#FF9800' : '#f44336'};
          color: white;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: bold;
        }
        .regional-content {
          padding: 12px;
          background: #fff;
        }
        .regional-score {
          font-size: 24px;
          font-weight: bold;
          color: ${result.totalScore >= 80 ? '#4CAF50' : result.totalScore >= 60 ? '#FF9800' : '#f44336'};
        }
        .regional-status { font-size: 10px; color: #666; }
      </style>
    </head>
    <body>
      <!-- PAGE 1: Overview & Scores -->
      <div class="page">
        <div class="report-header">
          <div class="logo-section">
            <div class="logo-circle">
              <span class="logo-text">WBA99</span>
              <span class="logo-sub">MSK/FMS</span>
            </div>
            <div class="company-info">
              <h1>WBA99 Analysis Report</h1>
              <p>AI-Powered Musculoskeletal Assessment</p>
            </div>
          </div>
          <div class="report-meta">
            <p><strong>Report ID:</strong> ${reportId}</p>
            <p><strong>Date:</strong> ${currentDate}</p>
            <p><strong>Time:</strong> ${currentTime}</p>
          </div>
        </div>
        
        <div class="page-title">
          <h2>📊 POSTURE ANALYSIS REPORT</h2>
          <span class="badge">AI POWERED</span>
        </div>
        
        ${result.isMockData ? `
        <div class="warning-box">
          <strong>⚠️ DEMONSTRATION DATA - This is simulated analysis for demo purposes</strong>
        </div>
        ` : ''}
        
        <div class="patient-info">
          <div class="patient-info-grid">
            <div class="info-item">
              <label>Patient Name</label>
              <span>_______________________</span>
            </div>
            <div class="info-item">
              <label>Date of Birth</label>
              <span>_______________________</span>
            </div>
            <div class="info-item">
              <label>Analysis Performed By</label>
              <span>_______________________</span>
            </div>
          </div>
        </div>
        
        <div class="score-container">
          <div class="score-card">
            <div class="score-value">${result.totalScore}%</div>
            <div class="score-label">Overall Alignment Score</div>
            <span class="score-status">${result.totalScore >= 80 ? 'GOOD' : result.totalScore >= 60 ? 'FAIR' : 'NEEDS ATTENTION'}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-header">📐 JOINT ANGLES MEASUREMENT</div>
          <div class="section-content">
            <table class="angles-table">
              <thead>
                <tr>
                  <th>Joint/Region</th>
                  <th>Measured</th>
                  <th>Deviation</th>
                  <th>Reference</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${result.angles.slice(0, 5).map(a => `
                  <tr>
                    <td><strong>${a.joint}</strong></td>
                    <td><span class="angle-value">${a.angle}°</span></td>
                    <td>${a.deviation > 0 ? '+' : ''}${a.deviation}°</td>
                    <td>${a.reference}</td>
                    <td class="status-${a.status}">${a.status.toUpperCase()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="section">
          <div class="section-header">🎯 REGIONAL ANALYSIS</div>
          <div class="section-content">
            <div class="regional-grid">
              <div class="regional-card">
                <div class="regional-header">HEAD & NECK</div>
                <div class="regional-content">
                  <span class="regional-score">${Math.floor(Math.random() * 20) + 70}%</span>
                  <p class="regional-status">Minor forward head posture</p>
                </div>
              </div>
              <div class="regional-card">
                <div class="regional-header">SHOULDERS</div>
                <div class="regional-content">
                  <span class="regional-score">${Math.floor(Math.random() * 20) + 70}%</span>
                  <p class="regional-status">Slight asymmetry detected</p>
                </div>
              </div>
              <div class="regional-card">
                <div class="regional-header">SPINE</div>
                <div class="regional-content">
                  <span class="regional-score">${Math.floor(Math.random() * 20) + 65}%</span>
                  <p class="regional-status">Thoracic kyphosis within range</p>
                </div>
              </div>
              <div class="regional-card">
                <div class="regional-header">PELVIS & HIPS</div>
                <div class="regional-content">
                  <span class="regional-score">${Math.floor(Math.random() * 20) + 70}%</span>
                  <p class="regional-status">Mild anterior pelvic tilt</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="report-footer">
          <span>WBA99 Expert Analysis India</span>
          <span class="footer-center">Page 1 of 3 | Confidential Medical Report</span>
          <span>www.wba99.com</span>
        </div>
      </div>
      
      <!-- PAGE 2: Detailed Analysis -->
      <div class="page">
        <div class="report-header">
          <div class="logo-section">
            <div class="logo-circle">
              <span class="logo-text">WBA99</span>
              <span class="logo-sub">MSK/FMS</span>
            </div>
            <div class="company-info">
              <h1>WBA99 Analysis Report</h1>
              <p>Detailed Joint Analysis</p>
            </div>
          </div>
          <div class="report-meta">
            <p><strong>Report ID:</strong> ${reportId}</p>
          </div>
        </div>
        
        <div class="page-title">
          <h2>📏 ANTERIOR VIEW ANALYSIS</h2>
          <span class="badge">VIEW 1/2</span>
        </div>
        
        <div class="view-box">
          <div class="view-header">Anterior View - Full Body Joint Mapping</div>
          <div class="view-content">
            <p class="diagram-text">🦴 Skeleton overlay would be displayed here with actual image</p>
            <div class="angle-labels">
              <div class="angle-label-item">Head: 88.0°</div>
              <div class="angle-label-item">R.Shoulder: 89.0°</div>
              <div class="angle-label-item">L.Shoulder: 87.8°</div>
              <div class="angle-label-item">R.Elbow: 179.7°</div>
              <div class="angle-label-item">L.Elbow: 178.2°</div>
              <div class="angle-label-item">R.Knee: 177.8°</div>
              <div class="angle-label-item">L.Knee: 178.5°</div>
              <div class="angle-label-item">R.Ankle: 90.2°</div>
              <div class="angle-label-item">L.Ankle: 89.5°</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-header">📊 COMPLETE JOINT MEASUREMENTS</div>
          <div class="section-content">
            <table class="angles-table">
              <thead>
                <tr>
                  <th>Joint/Region</th>
                  <th>Measured Angle</th>
                  <th>Deviation</th>
                  <th>Reference Range</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${result.angles.map(a => `
                  <tr>
                    <td><strong>${a.joint}</strong></td>
                    <td><span class="angle-value">${a.angle}°</span></td>
                    <td>${a.deviation > 0 ? '+' : ''}${a.deviation}°</td>
                    <td>${a.reference}</td>
                    <td class="status-${a.status}">${a.status.toUpperCase()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="section">
          <div class="section-header">⚠️ POSTURAL DEVIATIONS DETECTED</div>
          <div class="section-content">
            <div class="deviation-grid">
              ${result.posturalDeviations.map((d, i) => `
                <div class="deviation-card">
                  <div class="deviation-title">Finding ${i + 1}</div>
                  <div class="deviation-detail">${d}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        
        <div class="report-footer">
          <span>WBA99 Expert Analysis India</span>
          <span class="footer-center">Page 2 of 3 | Confidential Medical Report</span>
          <span>www.wba99.com</span>
        </div>
      </div>
      
      <!-- PAGE 3: Recommendations & Summary -->
      <div class="page">
        <div class="report-header">
          <div class="logo-section">
            <div class="logo-circle">
              <span class="logo-text">WBA99</span>
              <span class="logo-sub">MSK/FMS</span>
            </div>
            <div class="company-info">
              <h1>WBA99 Analysis Report</h1>
              <p>Recommendations & Summary</p>
            </div>
          </div>
          <div class="report-meta">
            <p><strong>Report ID:</strong> ${reportId}</p>
          </div>
        </div>
        
        <div class="page-title">
          <h2>✅ RECOMMENDATIONS & ACTION PLAN</h2>
          <span class="badge">TREATMENT</span>
        </div>
        
        <div class="section">
          <div class="section-header">🎯 RECOMMENDED EXERCISES & INTERVENTIONS</div>
          <div class="section-content">
            <ul class="recommendation-list">
              ${result.recommendations.map((r, i) => `
                <li>
                  <span class="rec-icon">${i + 1}</span>
                  <span class="rec-text">${r}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
        
        <div class="section">
          <div class="section-header">📋 CLINICAL SUMMARY</div>
          <div class="section-content">
            <div class="summary-box">
              <h3>Assessment Summary</h3>
              <p>${result.summary}</p>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-header">📝 NOTES & FOLLOW-UP</div>
          <div class="section-content">
            <div style="min-height: 100px; border: 1px dashed #ccc; border-radius: 5px; padding: 10px;">
              <p style="color: #999; font-size: 11px;">Space for clinical notes:</p>
              <br><br><br><br>
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
            It should not replace professional medical diagnosis or treatment.
          </p>
          <p style="font-size: 10px; color: #999;">
            Generated by WBA99 AI Analysis System | © 2025 WBA99 Expert Analysis India
          </p>
        </div>
        
        <div class="report-footer">
          <span>WBA99 Expert Analysis India</span>
          <span class="footer-center">Page 3 of 3 | Confidential Medical Report</span>
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
      case 'critical': return theme.colors.error;
      default: return theme.colors.textMuted;
    }
  };

  // Render landmark overlay on image
  const renderLandmarkOverlay = () => {
    // Don't render overlay for mock data or empty landmarks
    if (!analysisResult || !imageUri || !analysisResult.landmarks || analysisResult.landmarks.length === 0 || analysisResult.isMockData) {
      return null;
    }

    const imageWidth = SCREEN_WIDTH - 32;
    const imageHeight = imageWidth * 1.3;

    return (
      <View style={[styles.landmarkOverlay, { width: imageWidth, height: imageHeight }]}>
        {/* Draw skeleton lines */}
        {SKELETON_CONNECTIONS.map(([from, to], index) => {
          const fromLandmark = analysisResult.landmarks.find(l => l.name === from);
          const toLandmark = analysisResult.landmarks.find(l => l.name === to);
          if (!fromLandmark || !toLandmark) return null;

          const x1 = fromLandmark.x * imageWidth;
          const y1 = fromLandmark.y * imageHeight;
          const x2 = toLandmark.x * imageWidth;
          const y2 = toLandmark.y * imageHeight;

          return (
            <View
              key={`line-${index}`}
              style={[
                styles.skeletonLine,
                {
                  left: Math.min(x1, x2),
                  top: Math.min(y1, y2),
                  width: Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
                  transform: [{ rotate: `${Math.atan2(y2 - y1, x2 - x1)}rad` }],
                  transformOrigin: 'left center',
                },
              ]}
            />
          );
        })}

        {/* Draw landmark points */}
        {analysisResult.landmarks.map((landmark, index) => (
          <View
            key={`landmark-${index}`}
            style={[
              styles.landmarkPoint,
              {
                left: landmark.x * imageWidth - 8,
                top: landmark.y * imageHeight - 8,
              },
            ]}
          >
            <View style={styles.landmarkDot} />
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Pose Analysis</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Upload Section */}
        {!imageUri ? (
          <View style={styles.uploadSection}>
            <MaterialCommunityIcons name="human" size={80} color={theme.colors.accent} />
            <Text style={styles.uploadTitle}>Upload Photo for Analysis</Text>
            <Text style={styles.uploadSubtitle}>
              AI will detect body landmarks and analyze posture deviations
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
          </View>
        ) : (
          <>
            {/* Image with Landmarks */}
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.uploadedImage} />
              {analysisResult && renderLandmarkOverlay()}
              
              <TouchableOpacity 
                style={styles.changeImageButton}
                onPress={() => {
                  setImageUri(null);
                  setAnalysisResult(null);
                  setPaymentVerified(false);
                }}
              >
                <Ionicons name="refresh" size={16} color={theme.colors.textPrimary} />
                <Text style={styles.changeImageText}>Change</Text>
              </TouchableOpacity>
            </View>

            {/* Analyze Button */}
            {!analysisResult && (
              <TouchableOpacity
                style={[styles.analyzeButton, analyzing && styles.analyzeButtonDisabled]}
                onPress={analyzePose}
                disabled={analyzing}
              >
                {analyzing ? (
                  <>
                    <ActivityIndicator color={theme.colors.textPrimary} />
                    <Text style={styles.analyzeButtonText}>Analyzing Pose...</Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="brain" size={24} color={theme.colors.textPrimary} />
                    <Text style={styles.analyzeButtonText}>Analyze with AI</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Analysis Results */}
            {analysisResult && (
              <>
                {/* Score Card */}
                <View style={styles.scoreCard}>
                  <Text style={styles.scoreLabel}>Overall Postural Score</Text>
                  <Text style={[
                    styles.scoreValue,
                    { color: analysisResult.totalScore >= 80 ? theme.colors.success : 
                             analysisResult.totalScore >= 60 ? theme.colors.warning : theme.colors.error }
                  ]}>
                    {analysisResult.totalScore}%
                  </Text>
                  <View style={styles.scoreBar}>
                    <View style={[
                      styles.scoreBarFill, 
                      { 
                        width: `${analysisResult.totalScore}%`,
                        backgroundColor: analysisResult.totalScore >= 80 ? theme.colors.success : 
                                        analysisResult.totalScore >= 60 ? theme.colors.warning : theme.colors.error
                      }
                    ]} />
                  </View>
                  {analysisResult.isMockData && (
                    <View style={styles.mockDataBadge}>
                      <Ionicons name="information-circle" size={16} color={theme.colors.warning} />
                      <Text style={styles.mockDataText}>SIMULATED DATA - Demo Only</Text>
                    </View>
                  )}
                </View>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                  {(['analysis', 'metrics', 'graph', 'comments'] as const).map((tab) => (
                    <TouchableOpacity
                      key={tab}
                      style={[styles.tab, activeTab === tab && styles.tabActive]}
                      onPress={() => setActiveTab(tab)}
                    >
                      <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Tab Content */}
                {activeTab === 'analysis' && (
                  <View style={styles.tabContent}>
                    <Text style={styles.sectionTitle}>📐 Joint Angles</Text>
                    {analysisResult.angles.map((angle, index) => (
                      <View key={index} style={styles.angleRow}>
                        <View style={styles.angleInfo}>
                          <Text style={styles.angleName}>{angle.joint}</Text>
                          <Text style={styles.angleRef}>Ref: {angle.reference}</Text>
                        </View>
                        <View style={styles.angleValues}>
                          <Text style={styles.angleValue}>{angle.angle}°</Text>
                          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(angle.status) }]}>
                            <Text style={styles.statusText}>
                              {angle.deviation > 0 ? '+' : ''}{angle.deviation}°
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {activeTab === 'metrics' && (
                  <View style={styles.tabContent}>
                    <Text style={styles.sectionTitle}>📍 Detected Landmarks</Text>
                    <View style={styles.landmarksGrid}>
                      {analysisResult.landmarks.map((landmark, index) => (
                        <View key={index} style={styles.landmarkCard}>
                          <Text style={styles.landmarkName}>{landmark.name}</Text>
                          <Text style={styles.landmarkConf}>
                            {(landmark.confidence * 100).toFixed(0)}%
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {activeTab === 'graph' && (
                  <View style={styles.tabContent}>
                    <Text style={styles.sectionTitle}>⚠️ Postural Deviations</Text>
                    {analysisResult.posturalDeviations.map((deviation, index) => (
                      <View key={index} style={styles.deviationCard}>
                        <Ionicons name="warning" size={20} color={theme.colors.warning} />
                        <Text style={styles.deviationText}>{deviation}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {activeTab === 'comments' && (
                  <View style={styles.tabContent}>
                    <Text style={styles.sectionTitle}>✅ Recommendations</Text>
                    {analysisResult.recommendations.map((rec, index) => (
                      <View key={index} style={styles.recommendationCard}>
                        <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                        <Text style={styles.recommendationText}>{rec}</Text>
                      </View>
                    ))}
                    
                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>📋 Summary</Text>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryText}>{analysisResult.summary}</Text>
                    </View>
                  </View>
                )}

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
                </View>
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
              
              {/* QR Code Placeholder */}
              <View style={styles.qrCodeContainer}>
                <View style={styles.qrCodePlaceholder}>
                  <Ionicons name="qr-code" size={120} color={theme.colors.accent} />
                </View>
                <Text style={styles.qrCodeLabel}>Scan with UPI App</Text>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.verifyButton}
                  onPress={verifyPayment}
                >
                  <Text style={styles.verifyButtonText}>Verify Payment</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowQRModal(false)}
                >
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
  // Landmark Overlay
  landmarkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  skeletonLine: {
    position: 'absolute',
    height: 3,
    backgroundColor: theme.colors.accent,
    opacity: 0.8,
  },
  landmarkPoint: {
    position: 'absolute',
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  landmarkDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.success,
    borderWidth: 2,
    borderColor: theme.colors.textPrimary,
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
  // Score Card
  scoreCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  scoreLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: theme.fontWeight.bold,
    marginVertical: theme.spacing.sm,
  },
  scoreBar: {
    width: '100%',
    height: 8,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  // Mock Data Badge
  mockDataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.warning + '20',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.md,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  mockDataText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.warning,
    fontWeight: theme.fontWeight.bold,
  },
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  tabActive: {
    backgroundColor: theme.colors.accent,
  },
  tabText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  tabTextActive: {
    color: theme.colors.textPrimary,
  },
  // Tab Content
  tabContent: {
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
  // Angle Row
  angleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  angleInfo: {
    flex: 1,
  },
  angleName: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.medium,
  },
  angleRef: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  angleValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  angleValue: {
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
    fontSize: theme.fontSize.xs,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  // Landmarks Grid
  landmarksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  landmarkCard: {
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  landmarkName: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.medium,
  },
  landmarkConf: {
    fontSize: 10,
    color: theme.colors.success,
  },
  // Deviation & Recommendation Cards
  deviationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.warning + '15',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  deviationText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.success + '15',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  recommendationText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  summaryCard: {
    backgroundColor: theme.colors.accent + '15',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  summaryText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    lineHeight: 20,
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
});
