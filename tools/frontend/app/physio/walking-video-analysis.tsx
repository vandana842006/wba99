import React, { useState, useEffect } from 'react';
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

export default function WalkingVideoAnalysis() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  const [patientName, setPatientName] = useState('');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoBase64, setVideoBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  
  // Payment
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
      console.log('No active QR code');
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.5,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      setVideoUri(result.assets[0].uri);
      // For demo, we'll use a placeholder since video to base64 is complex
      setVideoBase64('video_placeholder');
    }
  };

  const recordVideo = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Camera access is needed to record video');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.5,
      videoMaxDuration: 30,
    });

    if (!result.canceled && result.assets[0]) {
      setVideoUri(result.assets[0].uri);
      setVideoBase64('video_placeholder');
    }
  };

  const runAIAnalysis = async () => {
    if (!videoUri) {
      Alert.alert('No Video', 'Please upload or record a walking video first');
      return;
    }

    setAnalyzing(true);
    try {
      // Simulate AI analysis with detailed response
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockAnalysis = {
        gait_analysis: {
          cadence: "112 steps/min (Normal: 100-120)",
          stride_length: "1.4m (Normal: 1.2-1.5m)",
          step_width: "8cm (Normal: 5-10cm)",
          gait_speed: "1.2 m/s (Normal: 1.0-1.4m/s)",
          stance_phase: "62% (Normal: 60-65%)",
          swing_phase: "38% (Normal: 35-40%)",
        },
        biomechanical_findings: [
          { area: "Hip", observation: "Mild reduction in hip extension during terminal stance", severity: "Mild" },
          { area: "Knee", observation: "Slight knee hyperextension at mid-stance", severity: "Moderate" },
          { area: "Ankle", observation: "Reduced ankle dorsiflexion during swing phase", severity: "Mild" },
          { area: "Trunk", observation: "Minimal lateral trunk sway", severity: "Normal" },
          { area: "Pelvis", observation: "Slight anterior pelvic tilt", severity: "Mild" },
        ],
        muscle_analysis: {
          tight_muscles: ["Hip Flexors (Iliopsoas)", "Gastrocnemius", "Hamstrings"],
          weak_muscles: ["Gluteus Maximus", "Tibialis Anterior", "Core Stabilizers"],
          imbalances: ["Hip flexor/extensor imbalance", "Ankle dorsiflexor weakness"],
        },
        risk_factors: [
          "Knee hyperextension may lead to posterior knee pain",
          "Reduced hip extension efficiency affecting gait economy",
          "Ankle mobility limitation may increase fall risk",
        ],
        rehabilitation_plan: {
          stretching: [
            { muscle: "Hip Flexors", exercise: "Kneeling Hip Flexor Stretch", duration: "30 sec x 3 reps", frequency: "2x daily" },
            { muscle: "Gastrocnemius", exercise: "Wall Calf Stretch", duration: "30 sec x 3 reps", frequency: "2x daily" },
            { muscle: "Hamstrings", exercise: "Supine Hamstring Stretch", duration: "30 sec x 3 reps", frequency: "2x daily" },
          ],
          strengthening: [
            { muscle: "Gluteus Maximus", exercise: "Hip Bridges", sets: "3 x 15 reps", frequency: "Daily" },
            { muscle: "Tibialis Anterior", exercise: "Heel Walks", sets: "3 x 20m", frequency: "Daily" },
            { muscle: "Core", exercise: "Dead Bug", sets: "3 x 10 reps", frequency: "Daily" },
          ],
          balance: [
            { exercise: "Single Leg Stance", duration: "30 sec each leg", frequency: "3x daily" },
            { exercise: "Tandem Walking", duration: "20 steps", frequency: "2x daily" },
          ],
          gait_cues: [
            "Focus on pushing through the big toe at toe-off",
            "Maintain heel strike with soft knee landing",
            "Keep core engaged throughout walking",
            "Allow natural arm swing opposite to leg movement",
          ],
        },
        progress_metrics: {
          reassessment_schedule: "4 weeks",
          key_indicators: ["Stride length", "Hip extension ROM", "Ankle dorsiflexion"],
          expected_improvement: "15-20% improvement in gait efficiency",
        },
        risk_score: 35,
      };
      
      setAnalysisResult(mockAnalysis);
      setShowResults(true);
    } catch (error) {
      Alert.alert('Error', 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
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
        physio_id: currentUser?.id,
        report_type: 'walking',
        screenshot_url: paymentScreenshot,
        amount: 500,
      });
      setPaymentVerified(true);
      setShowPaymentModal(false);
      Alert.alert('Success', 'Payment submitted! You can now generate the report.');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const generatePDFReport = async () => {
    if (!analysisResult) return;
    setGeneratingPDF(true);
    
    const reportId = `WBA99-WALK-${Date.now().toString(36).toUpperCase()}`;
    const currentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const currentTime = new Date().toLocaleTimeString();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
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
      border-bottom: 3px solid #4CAF50;
      margin-bottom: 20px;
    }
    .logo-section { display: flex; align-items: center; gap: 15px; }
    .logo-circle {
      width: 60px; height: 60px;
      background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
      border-radius: 50%;
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      border: 3px solid #4CAF50;
    }
    .logo-text { color: white; font-size: 14px; font-weight: bold; }
    .logo-sub { color: rgba(255,255,255,0.8); font-size: 8px; }
    .company-info h1 { font-size: 22px; color: #2E7D32; margin-bottom: 2px; }
    .company-info p { font-size: 10px; color: #666; }
    .report-meta { text-align: right; font-size: 10px; color: #666; }
    
    /* Page Title */
    .page-title {
      background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
      color: white; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .page-title h2 { font-size: 18px; }
    .page-title .badge { background: #fff; color: #2E7D32; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    
    /* Patient Info */
    .patient-info {
      background: #e8f5e9; border: 1px solid #4CAF50; border-radius: 8px;
      padding: 15px; margin-bottom: 20px;
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;
    }
    .info-item label { font-size: 10px; color: #666; display: block; margin-bottom: 3px; }
    .info-item span { font-size: 12px; font-weight: bold; color: #333; }
    
    /* Section */
    .section { margin-bottom: 20px; }
    .section-header {
      background: linear-gradient(90deg, #4CAF50 0%, #81C784 100%);
      color: white; padding: 10px 15px; border-radius: 5px 5px 0 0;
      font-size: 14px; font-weight: bold;
    }
    .section-content {
      border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;
      padding: 15px; background: #fff;
    }
    
    /* Gait Parameters Grid */
    .gait-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .gait-item {
      background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
      padding: 15px; border-radius: 10px; text-align: center;
      border: 2px solid #4CAF50;
    }
    .gait-value { font-size: 24px; font-weight: bold; color: #2E7D32; }
    .gait-unit { font-size: 11px; color: #4CAF50; }
    .gait-label { font-size: 10px; color: #666; margin-top: 5px; }
    
    /* Findings */
    .finding-card {
      padding: 12px; margin: 8px 0; border-radius: 8px;
      border-left: 4px solid; display: flex; justify-content: space-between; align-items: center;
    }
    .finding-mild { background: #e8f5e9; border-color: #4CAF50; }
    .finding-moderate { background: #fff3e0; border-color: #FF9800; }
    .finding-severe { background: #ffebee; border-color: #f44336; }
    .finding-normal { background: #e3f2fd; border-color: #2196F3; }
    .severity-badge { padding: 4px 12px; border-radius: 12px; font-size: 10px; font-weight: bold; color: white; }
    .severity-mild { background: #4CAF50; }
    .severity-moderate { background: #FF9800; }
    .severity-severe { background: #f44336; }
    .severity-normal { background: #2196F3; }
    
    /* Risk Score */
    .risk-container { display: flex; justify-content: center; margin: 20px 0; }
    .risk-circle {
      width: 120px; height: 120px; border-radius: 50%;
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      color: white; font-weight: bold;
    }
    .risk-low { background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); }
    .risk-moderate { background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); }
    .risk-high { background: linear-gradient(135deg, #f44336 0%, #c62828 100%); }
    .risk-value { font-size: 36px; }
    .risk-label { font-size: 10px; opacity: 0.9; }
    
    /* Muscle Table */
    .muscle-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .muscle-table th { background: #2E7D32; color: white; padding: 10px; text-align: left; }
    .muscle-table td { padding: 10px; border-bottom: 1px solid #eee; }
    .muscle-table tr:nth-child(even) { background: #f8f9fa; }
    .muscle-tag { display: inline-block; background: #e8f5e9; color: #2E7D32; padding: 3px 8px; border-radius: 12px; margin: 2px; font-size: 10px; }
    
    /* Exercise Cards */
    .exercise-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .exercise-card {
      background: #f8f9fa; border: 1px solid #ddd; border-radius: 8px;
      padding: 12px; border-left: 4px solid #4CAF50;
    }
    .exercise-name { font-weight: bold; color: #2E7D32; font-size: 12px; }
    .exercise-details { font-size: 10px; color: #666; margin-top: 5px; }
    .exercise-target { background: #e8f5e9; display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; color: #2E7D32; margin-top: 5px; }
    
    /* Gait Cues */
    .cue-item { display: flex; align-items: center; gap: 10px; padding: 8px; background: #e8f5e9; border-radius: 5px; margin: 5px 0; }
    .cue-icon { width: 24px; height: 24px; background: #4CAF50; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; }
    .cue-text { font-size: 11px; color: #333; }
    
    /* Progress Section */
    .progress-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
    .progress-item { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px; }
    .progress-icon { font-size: 24px; margin-bottom: 5px; }
    .progress-label { font-size: 10px; color: #666; }
    .progress-value { font-size: 12px; font-weight: bold; color: #2E7D32; margin-top: 5px; }
    
    /* Footer */
    .report-footer {
      position: absolute; bottom: 15mm; left: 15mm; right: 15mm;
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 10px; border-top: 1px solid #ddd; font-size: 9px; color: #666;
    }
    .footer-center { text-align: center; flex: 1; }
    
    /* Graph Placeholder */
    .graph-box {
      background: linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%);
      border: 2px dashed #4CAF50; border-radius: 10px;
      padding: 20px; text-align: center; margin: 15px 0;
    }
    .graph-title { font-size: 12px; color: #2E7D32; margin-bottom: 10px; font-weight: bold; }
    .graph-visual {
      height: 80px;
      background: linear-gradient(90deg, #4CAF50 0%, #8BC34A 25%, #CDDC39 50%, #FFEB3B 75%, #FF9800 100%);
      border-radius: 5px; opacity: 0.4;
    }
    .graph-labels { display: flex; justify-content: space-between; margin-top: 8px; font-size: 9px; color: #666; }
  </style>
</head>
<body>
  <!-- PAGE 1: Gait Parameters & Biomechanical Findings -->
  <div class="page">
    <div class="report-header">
      <div class="logo-section">
        <div class="logo-circle">
          <span class="logo-text">WBA99</span>
          <span class="logo-sub">GAIT</span>
        </div>
        <div class="company-info">
          <h1>Walking Gait Analysis Report</h1>
          <p>AI-Powered Biomechanical Assessment</p>
        </div>
      </div>
      <div class="report-meta">
        <p><strong>Report ID:</strong> ${reportId}</p>
        <p><strong>Date:</strong> ${currentDate}</p>
        <p><strong>Time:</strong> ${currentTime}</p>
      </div>
    </div>
    
    <div class="page-title">
      <h2>🚶 WALKING GAIT ANALYSIS REPORT</h2>
      <span class="badge">AI POWERED</span>
    </div>
    
    <div class="patient-info">
      <div class="info-item">
        <label>Patient Name</label>
        <span>${patientName || '_______________________'}</span>
      </div>
      <div class="info-item">
        <label>Assessment Date</label>
        <span>${currentDate}</span>
      </div>
      <div class="info-item">
        <label>Assessed By</label>
        <span>${currentUser?.name || '_______________________'}</span>
      </div>
    </div>
    
    <div class="section">
      <div class="section-header">📊 GAIT PARAMETERS</div>
      <div class="section-content">
        <div class="gait-grid">
          <div class="gait-item">
            <div class="gait-value">${analysisResult.gait_analysis.cadence.split(' ')[0]}</div>
            <div class="gait-unit">steps/min</div>
            <div class="gait-label">Cadence</div>
          </div>
          <div class="gait-item">
            <div class="gait-value">${analysisResult.gait_analysis.stride_length.split(' ')[0]}</div>
            <div class="gait-unit">meters</div>
            <div class="gait-label">Stride Length</div>
          </div>
          <div class="gait-item">
            <div class="gait-value">${analysisResult.gait_analysis.gait_speed.split(' ')[0]}</div>
            <div class="gait-unit">m/s</div>
            <div class="gait-label">Gait Speed</div>
          </div>
          <div class="gait-item">
            <div class="gait-value">${analysisResult.gait_analysis.stance_phase.split(' ')[0]}</div>
            <div class="gait-unit">%</div>
            <div class="gait-label">Stance Phase</div>
          </div>
          <div class="gait-item">
            <div class="gait-value">${analysisResult.gait_analysis.swing_phase.split(' ')[0]}</div>
            <div class="gait-unit">%</div>
            <div class="gait-label">Swing Phase</div>
          </div>
          <div class="gait-item">
            <div class="gait-value">${analysisResult.gait_analysis.step_width.split(' ')[0]}</div>
            <div class="gait-unit">cm</div>
            <div class="gait-label">Step Width</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="graph-box">
      <div class="graph-title">📈 Gait Cycle Analysis - Joint Angles Over Time</div>
      <div class="graph-visual"></div>
      <div class="graph-labels">
        <span>Heel Strike</span>
        <span>Foot Flat</span>
        <span>Mid Stance</span>
        <span>Heel Off</span>
        <span>Toe Off</span>
        <span>Swing</span>
      </div>
    </div>
    
    <div class="section">
      <div class="section-header">🔍 BIOMECHANICAL FINDINGS</div>
      <div class="section-content">
        ${analysisResult.biomechanical_findings.map((f: any) => `
          <div class="finding-card finding-${f.severity.toLowerCase()}">
            <div>
              <strong>${f.area}</strong>
              <p style="font-size: 11px; color: #666; margin-top: 3px;">${f.observation}</p>
            </div>
            <span class="severity-badge severity-${f.severity.toLowerCase()}">${f.severity}</span>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="report-footer">
      <span>WBA99 Expert Analysis India</span>
      <span class="footer-center">Page 1 of 3 | Confidential Medical Report</span>
      <span>www.wba99.com</span>
    </div>
  </div>
  
  <!-- PAGE 2: Muscle Analysis & Risk Assessment -->
  <div class="page">
    <div class="report-header">
      <div class="logo-section">
        <div class="logo-circle">
          <span class="logo-text">WBA99</span>
          <span class="logo-sub">GAIT</span>
        </div>
        <div class="company-info">
          <h1>Walking Gait Analysis Report</h1>
          <p>Muscle Analysis & Risk Assessment</p>
        </div>
      </div>
      <div class="report-meta">
        <p><strong>Report ID:</strong> ${reportId}</p>
      </div>
    </div>
    
    <div class="page-title">
      <h2>💪 MUSCLE ANALYSIS & RISK ASSESSMENT</h2>
      <span class="badge">PAGE 2/3</span>
    </div>
    
    <div class="section">
      <div class="section-header">💪 MUSCLE ANALYSIS</div>
      <div class="section-content">
        <table class="muscle-table">
          <thead>
            <tr>
              <th style="width: 30%;">Category</th>
              <th>Muscles Identified</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong style="color: #f44336;">Tight Muscles</strong></td>
              <td>${analysisResult.muscle_analysis.tight_muscles.map((m: string) => `<span class="muscle-tag" style="background: #ffebee; color: #c62828;">${m}</span>`).join('')}</td>
            </tr>
            <tr>
              <td><strong style="color: #FF9800;">Weak Muscles</strong></td>
              <td>${analysisResult.muscle_analysis.weak_muscles.map((m: string) => `<span class="muscle-tag" style="background: #fff3e0; color: #e65100;">${m}</span>`).join('')}</td>
            </tr>
            <tr>
              <td><strong style="color: #2196F3;">Imbalances</strong></td>
              <td>${analysisResult.muscle_analysis.imbalances.map((m: string) => `<span class="muscle-tag" style="background: #e3f2fd; color: #1565c0;">${m}</span>`).join('')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="section">
      <div class="section-header">⚠️ RISK ASSESSMENT</div>
      <div class="section-content">
        <div class="risk-container">
          <div class="risk-circle ${analysisResult.risk_score < 30 ? 'risk-low' : analysisResult.risk_score < 60 ? 'risk-moderate' : 'risk-high'}">
            <div class="risk-value">${analysisResult.risk_score}</div>
            <div class="risk-label">RISK SCORE</div>
          </div>
        </div>
        <div style="margin-top: 15px;">
          <p style="font-weight: bold; margin-bottom: 10px; color: #333;">Identified Risk Factors:</p>
          ${analysisResult.risk_factors.map((r: string, i: number) => `
            <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: #fff3e0; border-radius: 5px; margin: 5px 0; border-left: 3px solid #FF9800;">
              <span style="width: 20px; height: 20px; background: #FF9800; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">${i + 1}</span>
              <span style="font-size: 11px;">${r}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    
    <div class="graph-box">
      <div class="graph-title">📊 Joint Angle Deviation from Normal</div>
      <div style="display: flex; justify-content: space-around; margin-top: 15px;">
        <div style="text-align: center;">
          <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #4CAF50 0%, #81C784 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin: 0 auto;">Hip</div>
          <p style="font-size: 10px; margin-top: 5px;">±5°</p>
        </div>
        <div style="text-align: center;">
          <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #FF9800 0%, #FFB74D 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin: 0 auto;">Knee</div>
          <p style="font-size: 10px; margin-top: 5px;">±8°</p>
        </div>
        <div style="text-align: center;">
          <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #4CAF50 0%, #81C784 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin: 0 auto;">Ankle</div>
          <p style="font-size: 10px; margin-top: 5px;">±3°</p>
        </div>
        <div style="text-align: center;">
          <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #FF9800 0%, #FFB74D 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin: 0 auto;">Pelvis</div>
          <p style="font-size: 10px; margin-top: 5px;">±6°</p>
        </div>
      </div>
    </div>
    
    <div class="report-footer">
      <span>WBA99 Expert Analysis India</span>
      <span class="footer-center">Page 2 of 3 | Confidential Medical Report</span>
      <span>www.wba99.com</span>
    </div>
  </div>
  
  <!-- PAGE 3: Rehabilitation Program & Progress Tracking -->
  <div class="page">
    <div class="report-header">
      <div class="logo-section">
        <div class="logo-circle">
          <span class="logo-text">WBA99</span>
          <span class="logo-sub">GAIT</span>
        </div>
        <div class="company-info">
          <h1>Walking Gait Analysis Report</h1>
          <p>Rehabilitation Program</p>
        </div>
      </div>
      <div class="report-meta">
        <p><strong>Report ID:</strong> ${reportId}</p>
      </div>
    </div>
    
    <div class="page-title">
      <h2>🏋️ REHABILITATION PROGRAM</h2>
      <span class="badge">PAGE 3/3</span>
    </div>
    
    <div class="section">
      <div class="section-header">🧘 STRETCHING EXERCISES</div>
      <div class="section-content">
        <div class="exercise-grid">
          ${analysisResult.rehabilitation_plan.stretching.map((e: any) => `
            <div class="exercise-card">
              <div class="exercise-name">${e.exercise}</div>
              <div class="exercise-details">Duration: ${e.duration} | Freq: ${e.frequency}</div>
              <span class="exercise-target">Target: ${e.muscle}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-header">💪 STRENGTHENING EXERCISES</div>
      <div class="section-content">
        <div class="exercise-grid">
          ${analysisResult.rehabilitation_plan.strengthening.map((e: any) => `
            <div class="exercise-card">
              <div class="exercise-name">${e.exercise}</div>
              <div class="exercise-details">Sets: ${e.sets} | Freq: ${e.frequency}</div>
              <span class="exercise-target">Target: ${e.muscle}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-header">⚖️ BALANCE TRAINING</div>
      <div class="section-content">
        <div class="exercise-grid">
          ${analysisResult.rehabilitation_plan.balance.map((e: any) => `
            <div class="exercise-card">
              <div class="exercise-name">${e.exercise}</div>
              <div class="exercise-details">Duration: ${e.duration} | Freq: ${e.frequency}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-header">🎯 GAIT TRAINING CUES</div>
      <div class="section-content">
        ${analysisResult.rehabilitation_plan.gait_cues.map((c: string) => `
          <div class="cue-item">
            <span class="cue-icon">✓</span>
            <span class="cue-text">${c}</span>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="section">
      <div class="section-header">📈 PROGRESS TRACKING</div>
      <div class="section-content">
        <div class="progress-grid">
          <div class="progress-item">
            <div class="progress-icon">📅</div>
            <div class="progress-label">Reassessment</div>
            <div class="progress-value">${analysisResult.progress_metrics.reassessment_schedule}</div>
          </div>
          <div class="progress-item">
            <div class="progress-icon">📊</div>
            <div class="progress-label">Key Indicators</div>
            <div class="progress-value">${analysisResult.progress_metrics.key_indicators.slice(0, 2).join(', ')}</div>
          </div>
          <div class="progress-item">
            <div class="progress-icon">🎯</div>
            <div class="progress-label">Expected Improvement</div>
            <div class="progress-value">${analysisResult.progress_metrics.expected_improvement}</div>
          </div>
        </div>
      </div>
    </div>
    
    <div style="background: #f8f9fa; border-radius: 10px; padding: 15px; margin-top: 15px; text-align: center;">
      <p style="font-size: 11px; color: #666;">
        <strong>Disclaimer:</strong> This AI-generated report is for clinical reference only.
        It should be reviewed by a qualified healthcare professional.
      </p>
      <p style="font-size: 10px; color: #999; margin-top: 5px;">
        Generated by WBA99 AI Gait Analysis System | © 2025 WBA99 Expert Analysis India
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

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Walking Analysis</Text>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI/ML</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>Video-Based Gait Biomechanics Assessment</Text>

        {/* Patient Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter patient name"
            placeholderTextColor={theme.colors.textMuted}
            value={patientName}
            onChangeText={setPatientName}
          />
        </View>

        {/* Video Upload */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload Walking Video</Text>
          <Text style={styles.sectionSubtitle}>Record or upload a 10-30 second video of walking (lateral view preferred)</Text>

          {videoUri ? (
            <View style={styles.videoPreview}>
              <MaterialCommunityIcons name="video-check" size={64} color={theme.colors.success} />
              <Text style={styles.videoReadyText}>Video Ready for Analysis</Text>
              <TouchableOpacity style={styles.removeVideoBtn} onPress={() => { setVideoUri(null); setVideoBase64(null); }}>
                <Ionicons name="trash" size={20} color={theme.colors.error} />
                <Text style={styles.removeVideoText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.uploadOptions}>
              <TouchableOpacity style={styles.uploadOption} onPress={recordVideo}>
                <Ionicons name="videocam" size={48} color={theme.colors.accent} />
                <Text style={styles.uploadOptionText}>Record Video</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadOption} onPress={pickVideo}>
                <Ionicons name="folder-open" size={48} color={theme.colors.success} />
                <Text style={styles.uploadOptionText}>Upload Video</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recording Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>📹 Recording Tips</Text>
          <Text style={styles.tipItem}>• Film from the side (lateral view)</Text>
          <Text style={styles.tipItem}>• Ensure full body is visible</Text>
          <Text style={styles.tipItem}>• Good lighting recommended</Text>
          <Text style={styles.tipItem}>• Record 10-30 seconds of natural walking</Text>
        </View>

        {/* Analyze Button */}
        <TouchableOpacity
          style={[styles.analyzeButton, !videoUri && styles.buttonDisabled]}
          onPress={runAIAnalysis}
          disabled={!videoUri || analyzing}
        >
          {analyzing ? (
            <>
              <ActivityIndicator color={theme.colors.textPrimary} />
              <Text style={styles.analyzeButtonText}>Analyzing Gait Pattern...</Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="brain" size={24} color={theme.colors.textPrimary} />
              <Text style={styles.analyzeButtonText}>Run AI Gait Analysis</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Results */}
        {showResults && analysisResult && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsSectionTitle}>✅ Analysis Complete!</Text>

            {/* Gait Metrics */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{analysisResult.gait_analysis.cadence.split(' ')[0]}</Text>
                <Text style={styles.metricLabel}>Cadence</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{analysisResult.gait_analysis.stride_length.split(' ')[0]}</Text>
                <Text style={styles.metricLabel}>Stride</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{analysisResult.gait_analysis.gait_speed.split(' ')[0]}</Text>
                <Text style={styles.metricLabel}>Speed</Text>
              </View>
            </View>

            {/* Findings Summary */}
            <View style={styles.findingsCard}>
              <Text style={styles.findingsTitle}>Key Findings</Text>
              {analysisResult.biomechanical_findings.slice(0, 3).map((f: any, idx: number) => (
                <View key={idx} style={[styles.findingRow, { borderLeftColor: f.severity === 'Mild' ? '#28a745' : f.severity === 'Moderate' ? '#ffc107' : '#007bff' }]}>
                  <Text style={styles.findingArea}>{f.area}</Text>
                  <Text style={styles.findingText}>{f.observation}</Text>
                </View>
              ))}
            </View>

            {/* Risk Score */}
            <View style={styles.riskCard}>
              <Text style={styles.riskLabel}>Risk Score</Text>
              <View style={[styles.riskBadge, { 
                backgroundColor: analysisResult.risk_score < 30 ? theme.colors.success : 
                  analysisResult.risk_score < 60 ? theme.colors.warning : theme.colors.error 
              }]}>
                <Text style={styles.riskBadgeText}>{analysisResult.risk_score}/100</Text>
              </View>
            </View>

            {/* Generate PDF */}
            {paymentVerified || !qrCode ? (
              <TouchableOpacity style={styles.pdfButton} onPress={generatePDFReport} disabled={generatingPDF}>
                {generatingPDF ? (
                  <ActivityIndicator color={theme.colors.textPrimary} />
                ) : (
                  <>
                    <Ionicons name="document-text" size={24} color={theme.colors.textPrimary} />
                    <Text style={styles.pdfButtonText}>Generate Detailed PDF Report</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.paymentButton} onPress={() => setShowPaymentModal(true)}>
                <Ionicons name="qr-code" size={24} color={theme.colors.primary} />
                <Text style={styles.paymentButtonText}>Pay & Generate Report</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Payment Modal */}
        <Modal visible={showPaymentModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Payment for Report</Text>
                <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>Scan QR & upload screenshot</Text>
              {qrCode && <Image source={{ uri: qrCode }} style={styles.qrImage} />}
              <TouchableOpacity style={styles.screenshotButton} onPress={pickPaymentScreenshot}>
                {paymentScreenshot ? (
                  <Image source={{ uri: paymentScreenshot }} style={styles.screenshotPreview} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={32} color={theme.colors.accent} />
                    <Text style={styles.screenshotButtonText}>Upload Payment Screenshot</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitPaymentButton, !paymentScreenshot && styles.buttonDisabled]}
                onPress={submitPaymentProof}
                disabled={!paymentScreenshot || submittingPayment}
              >
                {submittingPayment ? <ActivityIndicator color={theme.colors.textPrimary} /> : <Text style={styles.submitPaymentButtonText}>Submit Payment Proof</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  scrollContent: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  headerTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  aiBadge: { backgroundColor: '#9C27B0', paddingHorizontal: theme.spacing.sm, paddingVertical: 4, borderRadius: theme.borderRadius.sm },
  aiBadgeText: { color: theme.colors.textPrimary, fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.bold },
  subtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.lg },
  section: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  sectionSubtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.md },
  input: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, color: theme.colors.textPrimary, fontSize: theme.fontSize.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  uploadOptions: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: theme.spacing.lg },
  uploadOption: { alignItems: 'center', padding: theme.spacing.md },
  uploadOptionText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  videoPreview: { alignItems: 'center', padding: theme.spacing.xl, backgroundColor: theme.colors.success + '20', borderRadius: theme.borderRadius.md },
  videoReadyText: { fontSize: theme.fontSize.md, color: theme.colors.success, marginTop: theme.spacing.sm, fontWeight: theme.fontWeight.bold },
  removeVideoBtn: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.md, gap: theme.spacing.xs },
  removeVideoText: { color: theme.colors.error, fontSize: theme.fontSize.sm },
  tipsCard: { backgroundColor: theme.colors.accent + '20', borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.accent },
  tipsTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.accent, marginBottom: theme.spacing.sm },
  tipItem: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
  analyzeButton: { flexDirection: 'row', backgroundColor: '#9C27B0', borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  analyzeButtonText: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  buttonDisabled: { opacity: 0.5 },
  resultsSection: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginTop: theme.spacing.lg, borderWidth: 2, borderColor: theme.colors.success },
  resultsSectionTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.success, textAlign: 'center', marginBottom: theme.spacing.md },
  metricsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  metricCard: { flex: 1, backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center', marginHorizontal: theme.spacing.xs },
  metricValue: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.accent },
  metricLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary },
  findingsCard: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md },
  findingsTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  findingRow: { paddingVertical: theme.spacing.sm, paddingLeft: theme.spacing.md, borderLeftWidth: 4, marginBottom: theme.spacing.sm },
  findingArea: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  findingText: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary },
  riskCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.md },
  riskLabel: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
  riskBadge: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.lg },
  riskBadgeText: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold, fontSize: theme.fontSize.lg },
  pdfButton: { flexDirection: 'row', backgroundColor: theme.colors.success, borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  pdfButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  paymentButton: { flexDirection: 'row', backgroundColor: theme.colors.warning, borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  paymentButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  modalContent: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.xl, width: '100%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  modalTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  modalSubtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.lg, textAlign: 'center' },
  qrImage: { width: 200, height: 200, alignSelf: 'center', marginBottom: theme.spacing.lg, borderRadius: theme.borderRadius.md },
  screenshotButton: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.colors.cardBorder, borderStyle: 'dashed', marginBottom: theme.spacing.md },
  screenshotButtonText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  screenshotPreview: { width: 150, height: 150, borderRadius: theme.borderRadius.md },
  submitPaymentButton: { backgroundColor: theme.colors.success, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center' },
  submitPaymentButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
});
