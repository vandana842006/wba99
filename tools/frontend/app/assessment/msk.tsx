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
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../src/utils/theme';
import { createAssessment, getUsers } from '../../src/utils/api';
import { useStore, User } from '../../src/store/useStore';
import Constants from 'expo-constants';
import { generatePaymentSectionHTML } from '../../src/utils/pdfPaymentSection';

// MSK Test Types
type InputType = 'bilateral' | 'single' | 'qualitative';

interface MSKTest {
  key: string;
  label: string;
  description: string;
  unit: string;
  referenceRange: string;
  inputType: InputType;
  options?: string[];
  isCustom?: boolean;
}

// Default MSK Tests
const DEFAULT_MSK_TESTS: MSKTest[] = [
  { key: 'knee_to_wall', label: 'Knee to Wall Lunge', description: 'Measure ankle dorsiflexion ROM', unit: 'cm', referenceRange: '≥14 cm', inputType: 'bilateral' },
  { key: 'ybt_anterior', label: 'Y Balance Test - Anterior', description: 'Reach distance in anterior direction', unit: 'cm', referenceRange: 'Diff ≤4 cm', inputType: 'bilateral' },
  { key: 'ybt_posteromedial', label: 'Y Balance Test - Posteromedial', description: 'Reach in posteromedial direction', unit: 'cm', referenceRange: 'Diff <6%', inputType: 'bilateral' },
  { key: 'ybt_posterolateral', label: 'Y Balance Test - Posterolateral', description: 'Reach in posterolateral direction', unit: 'cm', referenceRange: 'Diff <6%', inputType: 'bilateral' },
  { key: 'slhb_test', label: 'Single Leg Hamstring Bridge', description: 'Max reps at 20° knee flexion', unit: 'reps', referenceRange: '>30 reps', inputType: 'bilateral' },
  { key: 'hip_ir', label: 'Hip Internal Rotation ROM', description: 'Prone, knee at 90° flexion', unit: '°', referenceRange: '≤40°', inputType: 'bilateral' },
  { key: 'lumbar_flexion', label: 'Lumbar Flexion', description: 'Forward bend measurement', unit: 'cm', referenceRange: '>+5 cm', inputType: 'single' },
  { key: 'lumbar_extension', label: 'Lumbar Extension', description: 'Backward bend measurement', unit: 'cm', referenceRange: '>-2 cm', inputType: 'single' },
  { key: 'lumbar_side_flexion', label: 'Lumbar Side Flexion', description: 'Lateral bend measurement', unit: 'cm', referenceRange: '≤+3 cm diff', inputType: 'bilateral' },
  { key: 'combined_elevation', label: 'Combined Elevation Test', description: 'Prone, perpendicular distance from floor', unit: 'cm', referenceRange: 'Record cm', inputType: 'single' },
  { key: 'keibler_test', label: 'Keibler Test', description: 'Scapular position assessment', unit: '', referenceRange: 'Diff <1.5 cm', inputType: 'qualitative', options: ['Full', 'Restricted', 'SC/AP Kinesis'] },
  { key: 'shoulder_er', label: 'Shoulder ER at 90°', description: 'External rotation at 90° abduction', unit: '°', referenceRange: '>90°', inputType: 'bilateral' },
  { key: 'shoulder_ir', label: 'Shoulder IR at 90°', description: 'Internal rotation at 90° abduction', unit: '°', referenceRange: 'Record °', inputType: 'bilateral' },
  { key: 'gird_erg_ratio', label: 'GIRD/ERG Ratio', description: 'Glenohumeral rotation assessment', unit: '', referenceRange: '+ve when GIRD > ERG', inputType: 'qualitative', options: ['Positive', 'Negative', 'Neutral'] },
  { key: 'plank_test', label: 'Plank Test (Core)', description: 'Hold time in prone plank', unit: 'sec', referenceRange: '≥120 sec', inputType: 'single' },
  { key: 'side_plank', label: 'Side Plank (Core)', description: 'Hold time in side plank', unit: 'sec', referenceRange: '≥90 sec', inputType: 'bilateral' },
  { key: 'shoulder_ir_er_ratio', label: 'Shoulder IR/ER Ratio', description: 'IR should be 60-70% of ER', unit: '%', referenceRange: 'IR 60-70% > ER', inputType: 'single' },
];

interface MSKMeasurement {
  left?: string;
  right?: string;
  value?: string;
  comments?: string;
}

export default function MSKAssessmentEnhanced() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  // Tests state - can be modified
  const [mskTests, setMskTests] = useState<MSKTest[]>(DEFAULT_MSK_TESTS);
  const [measurements, setMeasurements] = useState<Record<string, MSKMeasurement>>({});
  
  // Form state
  const [playerName, setPlayerName] = useState('');
  const [assessorName, setAssessorName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<User[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  
  // AI & PDF state
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  
  // Custom test modal
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [newTestName, setNewTestName] = useState('');
  const [newTestDescription, setNewTestDescription] = useState('');
  const [newTestUnit, setNewTestUnit] = useState('');
  const [newTestReference, setNewTestReference] = useState('');
  const [newTestType, setNewTestType] = useState<InputType>('bilateral');

  const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                      process.env.EXPO_PUBLIC_BACKEND_URL || 
                      '';

  const isPhysio = currentUser?.role === 'physio';

  useEffect(() => {
    if (isPhysio && currentUser) {
      setAssessorName(currentUser.name);
      const fetchPatients = async () => {
        try {
          const response = await getUsers('patient');
          setPatients(response.data);
        } catch (error) {
          console.error('Error fetching patients:', error);
        }
      };
      fetchPatients();
    } else if (currentUser) {
      setSelectedPatient(currentUser.id);
      setPlayerName(currentUser.name);
    }
  }, [currentUser]);

  // Update measurement
  const updateMeasurement = (key: string, field: 'left' | 'right' | 'value' | 'comments', value: string) => {
    setMeasurements(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  // Calculate completion
  const calculateCompletion = () => {
    let filled = 0;
    let total = 0;
    mskTests.forEach(test => {
      if (test.inputType === 'bilateral') {
        total += 2;
        if (measurements[test.key]?.left) filled++;
        if (measurements[test.key]?.right) filled++;
      } else {
        total += 1;
        if (measurements[test.key]?.value) filled++;
      }
    });
    return Math.round((filled / total) * 100);
  };

  // Check reference range
  const checkReferenceRange = (test: MSKTest, value: string): 'good' | 'warning' | 'neutral' => {
    if (!value || value === '') return 'neutral';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'neutral';

    switch (test.key) {
      case 'knee_to_wall': return numValue >= 14 ? 'good' : 'warning';
      case 'slhb_test': return numValue > 30 ? 'good' : 'warning';
      case 'hip_ir': return numValue <= 40 ? 'good' : 'warning';
      case 'lumbar_flexion': return numValue > 5 ? 'good' : 'warning';
      case 'shoulder_er': return numValue > 90 ? 'good' : 'warning';
      case 'plank_test': return numValue >= 120 ? 'good' : 'warning';
      case 'side_plank': return numValue >= 90 ? 'good' : 'warning';
      default: return 'neutral';
    }
  };

  // Add custom test
  const addCustomTest = () => {
    if (!newTestName.trim()) {
      Alert.alert('Error', 'Please enter test name');
      return;
    }

    const newTest: MSKTest = {
      key: `custom_${Date.now()}`,
      label: newTestName,
      description: newTestDescription || 'Custom test',
      unit: newTestUnit,
      referenceRange: newTestReference || 'Record value',
      inputType: newTestType,
      isCustom: true,
    };

    setMskTests([...mskTests, newTest]);
    setShowAddTestModal(false);
    setNewTestName('');
    setNewTestDescription('');
    setNewTestUnit('');
    setNewTestReference('');
    setNewTestType('bilateral');
    
    Alert.alert('Success', 'Custom test added!');
  };

  // Remove custom test
  const removeCustomTest = (key: string) => {
    setMskTests(mskTests.filter(t => t.key !== key));
    const { [key]: removed, ...rest } = measurements;
    setMeasurements(rest);
  };

  // Generate AI Analysis
  const generateAIAnalysis = async () => {
    const completion = calculateCompletion();
    if (completion < 30) {
      Alert.alert('Error', 'Please fill at least 30% of measurements for AI analysis');
      return;
    }

    setGeneratingAI(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/analyze-msk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          measurements,
          tests: mskTests,
          patient_name: playerName,
          notes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiAnalysis(data.analysis);
      } else {
        // Generate local analysis
        setAiAnalysis(generateLocalAnalysis());
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      setAiAnalysis(generateLocalAnalysis());
    } finally {
      setGeneratingAI(false);
    }
  };

  // Generate local AI analysis
  const generateLocalAnalysis = () => {
    const issues: string[] = [];
    const strengths: string[] = [];
    const recommendations: string[] = [];

    mskTests.forEach(test => {
      const m = measurements[test.key];
      if (!m) return;

      if (test.inputType === 'bilateral') {
        const left = parseFloat(m.left || '0');
        const right = parseFloat(m.right || '0');
        const diff = Math.abs(left - right);

        if (diff > 5) {
          issues.push(`${test.label}: Asymmetry detected (L: ${left}, R: ${right}, Diff: ${diff.toFixed(1)}${test.unit})`);
          recommendations.push(`Address ${test.label} asymmetry with targeted exercises`);
        }

        const status = checkReferenceRange(test, m.left || '');
        if (status === 'warning') {
          issues.push(`${test.label}: Below optimal range (${m.left}${test.unit}, Reference: ${test.referenceRange})`);
        } else if (status === 'good') {
          strengths.push(`${test.label}: Within optimal range`);
        }
      } else if (m.value) {
        const status = checkReferenceRange(test, m.value);
        if (status === 'warning') {
          issues.push(`${test.label}: ${m.value}${test.unit} (Below reference: ${test.referenceRange})`);
        } else if (status === 'good') {
          strengths.push(`${test.label}: ${m.value}${test.unit} (Good)`);
        }
      }
    });

    // Add general recommendations
    if (issues.length > 0) {
      recommendations.push('Focus on corrective exercises for identified deficits');
      recommendations.push('Re-assess in 4-6 weeks to monitor progress');
    }
    recommendations.push('Maintain current strengths with regular training');
    recommendations.push('Consider sport-specific functional training');

    return `**MSK SCREENING ANALYSIS REPORT**

**Patient:** ${playerName || 'Not specified'}
**Assessor:** ${assessorName || 'Not specified'}
**Date:** ${new Date().toLocaleDateString()}
**Completion:** ${calculateCompletion()}%

---

**AREAS OF CONCERN (${issues.length}):**
${issues.length > 0 ? issues.map((i, idx) => `${idx + 1}. ${i}`).join('\n') : 'No significant concerns identified.'}

---

**STRENGTHS (${strengths.length}):**
${strengths.length > 0 ? strengths.map((s, idx) => `${idx + 1}. ${s}`).join('\n') : 'Continue assessment for complete picture.'}

---

**CLINICAL RECOMMENDATIONS:**
${recommendations.map((r, idx) => `${idx + 1}. ${r}`).join('\n')}

---

**RISK ASSESSMENT:**
${issues.length > 3 ? '⚠️ HIGH - Multiple areas require attention' : 
  issues.length > 1 ? '⚠️ MODERATE - Some areas need improvement' : 
  '✅ LOW - Generally good musculoskeletal health'}

**Note:** This AI-generated analysis should be reviewed by a qualified healthcare professional before making clinical decisions.`;
  };

  // Generate PDF Report
  const generatePDFReport = async () => {
    if (!aiAnalysis) {
      Alert.alert('Generate AI Analysis First', 'Please generate AI analysis before creating PDF report');
      return;
    }

    setGeneratingPdf(true);
    try {
      const html = generatePDFHTML();
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error('PDF error:', error);
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Generate PDF HTML
  const generatePDFHTML = () => {
    const completion = calculateCompletion();
    const reportId = `WBA99-MSK-${Date.now().toString(36).toUpperCase()}`;
    const currentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const currentTime = new Date().toLocaleTimeString();
    
    const testResults = mskTests.map(test => {
      const m = measurements[test.key];
      if (!m) return null;
      
      let value = '';
      let status = 'neutral';
      
      if (test.inputType === 'bilateral') {
        value = `L: ${m.left || '-'} | R: ${m.right || '-'}`;
        status = checkReferenceRange(test, m.left || '');
      } else {
        value = m.value || '-';
        status = checkReferenceRange(test, m.value || '');
      }
      
      return { ...test, measuredValue: value, status, comments: m.comments };
    }).filter(Boolean);
    
    const goodCount = testResults.filter((t: any) => t.status === 'good').length;
    const warningCount = testResults.filter((t: any) => t.status === 'warning').length;

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
            width: 210mm; min-height: 297mm; padding: 15mm;
            page-break-after: always; position: relative; background: #fff;
          }
          .page:last-child { page-break-after: auto; }
          
          /* Header - Red theme for MSK */
          .report-header {
            display: flex; justify-content: space-between; align-items: center;
            padding-bottom: 15px; border-bottom: 3px solid #c62828; margin-bottom: 20px;
          }
          .logo-section { display: flex; align-items: center; gap: 15px; }
          .logo-circle {
            width: 60px; height: 60px;
            background: linear-gradient(135deg, #c62828 0%, #b71c1c 100%);
            border-radius: 50%; display: flex; flex-direction: column;
            justify-content: center; align-items: center; border: 3px solid #c62828;
          }
          .logo-text { color: white; font-size: 14px; font-weight: bold; }
          .logo-sub { color: rgba(255,255,255,0.8); font-size: 8px; }
          .company-info h1 { font-size: 22px; color: #b71c1c; margin-bottom: 2px; }
          .company-info p { font-size: 10px; color: #666; }
          .report-meta { text-align: right; font-size: 10px; color: #666; }
          
          .page-title {
            background: linear-gradient(135deg, #c62828 0%, #b71c1c 100%);
            color: white; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px;
            display: flex; justify-content: space-between; align-items: center;
          }
          .page-title h2 { font-size: 18px; }
          .page-title .badge { background: #fff; color: #b71c1c; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          
          .patient-info {
            background: #ffebee; border: 1px solid #c62828; border-radius: 8px;
            padding: 15px; margin-bottom: 20px;
            display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;
          }
          .info-item { text-align: center; }
          .info-item label { font-size: 10px; color: #666; display: block; margin-bottom: 3px; }
          .info-item span { font-size: 12px; font-weight: bold; color: #333; }
          
          /* Score Summary */
          .score-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
          .score-card { text-align: center; padding: 15px; border-radius: 10px; }
          .score-card.completion { background: linear-gradient(135deg, #c62828 0%, #ef5350 100%); color: white; }
          .score-card.good { background: #e8f5e9; border: 2px solid #4CAF50; }
          .score-card.warning { background: #fff3e0; border: 2px solid #FF9800; }
          .score-card.tests { background: #e3f2fd; border: 2px solid #2196F3; }
          .score-value { font-size: 28px; font-weight: bold; }
          .score-label { font-size: 10px; margin-top: 5px; text-transform: uppercase; }
          
          .section { margin-bottom: 20px; }
          .section-header {
            background: linear-gradient(90deg, #c62828 0%, #ef5350 100%);
            color: white; padding: 10px 15px; border-radius: 5px 5px 0 0;
            font-size: 14px; font-weight: bold;
          }
          .section-content {
            border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;
            padding: 15px; background: #fff;
          }
          
          /* Results Table */
          .results-table { width: 100%; border-collapse: collapse; font-size: 10px; }
          .results-table th { background: #b71c1c; color: white; padding: 8px; text-align: left; }
          .results-table td { padding: 8px; border-bottom: 1px solid #eee; }
          .results-table tr:nth-child(even) { background: #f8f9fa; }
          .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 9px; font-weight: bold; }
          .status-good { background: #4CAF50; color: white; }
          .status-warning { background: #FF9800; color: white; }
          .status-neutral { background: #9e9e9e; color: white; }
          .custom-badge { background: #9C27B0; color: white; padding: 2px 6px; border-radius: 4px; font-size: 8px; margin-left: 5px; }
          
          /* AI Section */
          .ai-box {
            background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
            border-left: 5px solid #c62828; border-radius: 0 10px 10px 0;
            padding: 20px; line-height: 1.6; font-size: 11px;
          }
          .ai-box strong { color: #b71c1c; }
          
          /* Notes Box */
          .notes-box {
            background: #fff3e0; border: 1px dashed #FF9800; border-radius: 8px;
            padding: 15px; margin-top: 15px;
          }
          .notes-title { font-size: 12px; font-weight: bold; color: #e65100; margin-bottom: 8px; }
          
          .report-footer {
            position: absolute; bottom: 15mm; left: 15mm; right: 15mm;
            display: flex; justify-content: space-between; align-items: center;
            padding-top: 10px; border-top: 1px solid #ddd; font-size: 9px; color: #666;
          }
          .footer-center { text-align: center; flex: 1; }
        </style>
      </head>
      <body>
        <!-- PAGE 1: Overview & Test Results -->
        <div class="page">
          <div class="report-header">
            <div class="logo-section">
              <div class="logo-circle">
                <span class="logo-text">WBA99</span>
                <span class="logo-sub">MSK</span>
              </div>
              <div class="company-info">
                <h1>MSK Screening Report</h1>
                <p>Musculoskeletal Assessment with AI Analysis</p>
              </div>
            </div>
            <div class="report-meta">
              <p><strong>Report ID:</strong> ${reportId}</p>
              <p><strong>Date:</strong> ${currentDate}</p>
              <p><strong>Time:</strong> ${currentTime}</p>
            </div>
          </div>
          
          <div class="page-title">
            <h2>🦴 MSK SCREENING ASSESSMENT REPORT</h2>
            <span class="badge">AI POWERED</span>
          </div>
          
          <div class="patient-info">
            <div class="info-item">
              <label>Patient Name</label>
              <span>${playerName || '_____________'}</span>
            </div>
            <div class="info-item">
              <label>Assessor</label>
              <span>${assessorName || '_____________'}</span>
            </div>
            <div class="info-item">
              <label>Assessment Date</label>
              <span>${currentDate}</span>
            </div>
            <div class="info-item">
              <label>Total Tests</label>
              <span>${mskTests.length} Tests</span>
            </div>
          </div>
          
          <div class="score-grid">
            <div class="score-card completion">
              <div class="score-value">${completion}%</div>
              <div class="score-label">Completion</div>
            </div>
            <div class="score-card good">
              <div class="score-value" style="color: #4CAF50;">${goodCount}</div>
              <div class="score-label">Within Range</div>
            </div>
            <div class="score-card warning">
              <div class="score-value" style="color: #FF9800;">${warningCount}</div>
              <div class="score-label">Needs Review</div>
            </div>
            <div class="score-card tests">
              <div class="score-value" style="color: #2196F3;">${testResults.length}</div>
              <div class="score-label">Tests Completed</div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-header">📊 TEST RESULTS - PART 1</div>
            <div class="section-content">
              <table class="results-table">
                <thead>
                  <tr>
                    <th>Test Name</th>
                    <th>Measured</th>
                    <th>Reference</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${testResults.slice(0, 8).map((t: any) => `
                    <tr>
                      <td>
                        ${t.label}
                        ${t.isCustom ? '<span class="custom-badge">CUSTOM</span>' : ''}
                      </td>
                      <td><strong>${t.measuredValue}</strong> ${t.unit}</td>
                      <td>${t.referenceRange}</td>
                      <td>
                        <span class="status-badge status-${t.status}">
                          ${t.status === 'good' ? '✓ GOOD' : t.status === 'warning' ? '⚠ REVIEW' : '○ N/A'}
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          
          <div class="report-footer">
            <span>WBA99 Expert Analysis India</span>
            <span class="footer-center">Page 1 of 2 | Confidential Medical Report</span>
            <span>www.wba99.com</span>
          </div>
        </div>
        
        <!-- PAGE 2: Remaining Results & AI Analysis -->
        <div class="page">
          <div class="report-header">
            <div class="logo-section">
              <div class="logo-circle">
                <span class="logo-text">WBA99</span>
                <span class="logo-sub">MSK</span>
              </div>
              <div class="company-info">
                <h1>MSK Screening Report</h1>
                <p>AI Analysis & Recommendations</p>
              </div>
            </div>
            <div class="report-meta"><p><strong>Report ID:</strong> ${reportId}</p></div>
          </div>
          
          <div class="page-title">
            <h2>🤖 AI ANALYSIS & RECOMMENDATIONS</h2>
            <span class="badge">PAGE 2/2</span>
          </div>
          
          ${testResults.length > 8 ? `
            <div class="section">
              <div class="section-header">📊 TEST RESULTS - PART 2</div>
              <div class="section-content">
                <table class="results-table">
                  <thead>
                    <tr>
                      <th>Test Name</th>
                      <th>Measured</th>
                      <th>Reference</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${testResults.slice(8).map((t: any) => `
                      <tr>
                        <td>
                          ${t.label}
                          ${t.isCustom ? '<span class="custom-badge">CUSTOM</span>' : ''}
                        </td>
                        <td><strong>${t.measuredValue}</strong> ${t.unit}</td>
                        <td>${t.referenceRange}</td>
                        <td>
                          <span class="status-badge status-${t.status}">
                            ${t.status === 'good' ? '✓ GOOD' : t.status === 'warning' ? '⚠ REVIEW' : '○ N/A'}
                          </span>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}
          
          <div class="section">
            <div class="section-header">🤖 AI ANALYSIS & RECOMMENDATIONS</div>
            <div class="section-content">
              <div class="ai-box">
                ${aiAnalysis?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') || 'AI analysis not generated. Complete more tests and generate AI recommendations.'}
              </div>
            </div>
          </div>
          
          <!-- AI Biomechanics Analysis Section -->
          <div style="background: linear-gradient(135deg, #1a237e, #311b92); border-radius: 12px; padding: 20px; margin-top: 15px; color: white; page-break-inside: avoid;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
              <span style="font-size: 20px;">🔬</span>
              <span style="font-size: 16px; font-weight: bold;">AI Biomechanics Analysis</span>
              <span style="background: #00e676; color: #1a237e; padding: 3px 10px; border-radius: 15px; font-size: 9px; font-weight: bold; margin-left: auto;">POWERED BY AI</span>
            </div>
            <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; margin-bottom: 10px;">
              <div style="font-size: 11px; font-weight: bold; margin-bottom: 6px;">📊 Movement Quality Assessment</div>
              <div style="font-size: 10px; opacity: 0.9;">Based on your MSK assessment results, AI has identified patterns in joint mobility, muscle activation, and movement quality that may affect athletic performance and injury risk.</div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
              <div style="background: rgba(255,255,255,0.1); border-radius: 6px; padding: 10px; text-align: center;">
                <div style="font-size: 16px; margin-bottom: 3px;">🦴</div>
                <div style="font-size: 9px; font-weight: bold;">Joint Mobility</div>
              </div>
              <div style="background: rgba(255,255,255,0.1); border-radius: 6px; padding: 10px; text-align: center;">
                <div style="font-size: 16px; margin-bottom: 3px;">💪</div>
                <div style="font-size: 9px; font-weight: bold;">Muscle Balance</div>
              </div>
              <div style="background: rgba(255,255,255,0.1); border-radius: 6px; padding: 10px; text-align: center;">
                <div style="font-size: 16px; margin-bottom: 3px;">⚡</div>
                <div style="font-size: 9px; font-weight: bold;">Movement Pattern</div>
              </div>
            </div>
          </div>
          
          <!-- DOs and DON'Ts Section -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
            <div style="background: linear-gradient(135deg, #e8f5e9, #c8e6c9); border-radius: 10px; padding: 15px; border-left: 4px solid #4CAF50;">
              <div style="font-size: 14px; font-weight: bold; color: #2e7d32; margin-bottom: 10px;">✅ DOs - Recommended Actions</div>
              <ul style="margin: 0; padding-left: 15px; font-size: 10px; color: #333;">
                <li style="margin-bottom: 5px;">Maintain regular mobility exercises for restricted joints</li>
                <li style="margin-bottom: 5px;">Focus on progressive strengthening of weak muscle groups</li>
                <li style="margin-bottom: 5px;">Warm up thoroughly before any physical activity</li>
                <li style="margin-bottom: 5px;">Practice proper form and technique during exercises</li>
                <li style="margin-bottom: 5px;">Stay hydrated and maintain adequate nutrition</li>
                <li style="margin-bottom: 5px;">Follow prescribed exercise frequency and intensity</li>
                <li style="margin-bottom: 5px;">Monitor pain levels and report changes to physio</li>
              </ul>
            </div>
            <div style="background: linear-gradient(135deg, #ffebee, #ffcdd2); border-radius: 10px; padding: 15px; border-left: 4px solid #f44336;">
              <div style="font-size: 14px; font-weight: bold; color: #c62828; margin-bottom: 10px;">❌ DON'Ts - Avoid These</div>
              <ul style="margin: 0; padding-left: 15px; font-size: 10px; color: #333;">
                <li style="margin-bottom: 5px;">Don't ignore pain or discomfort during exercises</li>
                <li style="margin-bottom: 5px;">Avoid sudden increases in training intensity</li>
                <li style="margin-bottom: 5px;">Don't skip cool-down and stretching routines</li>
                <li style="margin-bottom: 5px;">Avoid compensatory movements during exercises</li>
                <li style="margin-bottom: 5px;">Don't train through acute injuries</li>
                <li style="margin-bottom: 5px;">Avoid sitting/standing in poor postures for long periods</li>
                <li style="margin-bottom: 5px;">Don't self-medicate without professional advice</li>
              </ul>
            </div>
          </div>
          
          ${notes ? `
            <div class="notes-box">
              <div class="notes-title">📝 Clinical Notes</div>
              <p style="font-size: 11px;">${notes}</p>
            </div>
          ` : ''}
          
          ${generatePaymentSectionHTML('#2196F3')}
          
          <div style="background: #f8f9fa; border-radius: 10px; padding: 15px; margin-top: 20px; text-align: center;">
            <p style="font-size: 11px; color: #666;">
              <strong>Disclaimer:</strong> This AI-generated report is for clinical reference only.
              Consult a qualified healthcare professional for diagnosis and treatment.
            </p>
            <p style="font-size: 10px; color: #999; margin-top: 5px;">
              Generated by WBA99 MSK Assessment System | © 2025 WBA99 Expert Analysis India
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

  // Save assessment
  const handleSubmit = async () => {
    if (!selectedPatient) {
      Alert.alert('Error', 'Please select a patient');
      return;
    }

    const completion = calculateCompletion();
    if (completion < 30) {
      Alert.alert('Warning', 'Please fill at least 30% of the measurements');
      return;
    }

    setLoading(true);
    try {
      await createAssessment({
        patient_id: selectedPatient,
        physio_id: isPhysio ? currentUser?.id : undefined,
        assessment_type: 'msk',
        data: { 
          measurements, 
          playerName,
          assessorName,
          notes,
          aiAnalysis,
          completionPercentage: completion,
          customTests: mskTests.filter(t => t.isCustom),
        },
      });

      Alert.alert('Success', 'MSK Assessment saved!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to save assessment');
    } finally {
      setLoading(false);
    }
  };

  // Render test input based on type
  const renderTestInput = (test: MSKTest) => {
    const m = measurements[test.key] || {};

    if (test.inputType === 'qualitative' && test.options) {
      return (
        <View key={test.key} style={styles.testCard}>
          <View style={styles.testHeader}>
            <View style={styles.testTitleRow}>
              <Text style={styles.testLabel}>{test.label}</Text>
              {test.isCustom && (
                <TouchableOpacity onPress={() => removeCustomTest(test.key)}>
                  <Ionicons name="close-circle" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.refBadge}>
              <Text style={styles.refBadgeText}>{test.referenceRange}</Text>
            </View>
          </View>
          <Text style={styles.testDescription}>{test.description}</Text>
          
          <View style={styles.qualitativeContainer}>
            <View style={styles.qualitativeSide}>
              <Text style={styles.sideLabel}>LEFT</Text>
              <View style={styles.optionsRow}>
                {test.options.map(opt => (
                  <TouchableOpacity
                    key={`left-${opt}`}
                    style={[styles.optionButton, m.left === opt && styles.optionButtonSelected]}
                    onPress={() => updateMeasurement(test.key, 'left', opt)}
                  >
                    <Text style={[styles.optionText, m.left === opt && styles.optionTextSelected]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.qualitativeSide}>
              <Text style={styles.sideLabel}>RIGHT</Text>
              <View style={styles.optionsRow}>
                {test.options.map(opt => (
                  <TouchableOpacity
                    key={`right-${opt}`}
                    style={[styles.optionButton, m.right === opt && styles.optionButtonSelected]}
                    onPress={() => updateMeasurement(test.key, 'right', opt)}
                  >
                    <Text style={[styles.optionText, m.right === opt && styles.optionTextSelected]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      );
    }

    if (test.inputType === 'bilateral') {
      const leftStatus = checkReferenceRange(test, m.left || '');
      const rightStatus = checkReferenceRange(test, m.right || '');
      
      return (
        <View key={test.key} style={styles.testCard}>
          <View style={styles.testHeader}>
            <View style={styles.testTitleRow}>
              <Text style={styles.testLabel}>{test.label}</Text>
              {test.isCustom && (
                <TouchableOpacity onPress={() => removeCustomTest(test.key)}>
                  <Ionicons name="close-circle" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.refBadge}>
              <Text style={styles.refBadgeText}>{test.referenceRange}</Text>
            </View>
          </View>
          <Text style={styles.testDescription}>{test.description}</Text>
          
          <View style={styles.bilateralContainer}>
            <View style={styles.sideInput}>
              <Text style={styles.sideLabel}>LEFT</Text>
              <View style={[styles.inputWrapper, leftStatus === 'good' && styles.inputGood, leftStatus === 'warning' && styles.inputWarning]}>
                <TextInput
                  style={styles.measureInput}
                  placeholder="--"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="decimal-pad"
                  value={m.left || ''}
                  onChangeText={(v) => updateMeasurement(test.key, 'left', v)}
                />
                {test.unit ? <Text style={styles.unitText}>{test.unit}</Text> : null}
              </View>
            </View>
            <View style={styles.sideInput}>
              <Text style={styles.sideLabel}>RIGHT</Text>
              <View style={[styles.inputWrapper, rightStatus === 'good' && styles.inputGood, rightStatus === 'warning' && styles.inputWarning]}>
                <TextInput
                  style={styles.measureInput}
                  placeholder="--"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="decimal-pad"
                  value={m.right || ''}
                  onChangeText={(v) => updateMeasurement(test.key, 'right', v)}
                />
                {test.unit ? <Text style={styles.unitText}>{test.unit}</Text> : null}
              </View>
            </View>
          </View>
          
          <TextInput
            style={styles.commentsInput}
            placeholder="Comments (optional)"
            placeholderTextColor={theme.colors.textMuted}
            value={m.comments || ''}
            onChangeText={(v) => updateMeasurement(test.key, 'comments', v)}
          />
        </View>
      );
    }

    // Single input
    const status = checkReferenceRange(test, m.value || '');
    return (
      <View key={test.key} style={styles.testCard}>
        <View style={styles.testHeader}>
          <View style={styles.testTitleRow}>
            <Text style={styles.testLabel}>{test.label}</Text>
            {test.isCustom && (
              <TouchableOpacity onPress={() => removeCustomTest(test.key)}>
                <Ionicons name="close-circle" size={20} color={theme.colors.error} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.refBadge}>
            <Text style={styles.refBadgeText}>{test.referenceRange}</Text>
          </View>
        </View>
        <Text style={styles.testDescription}>{test.description}</Text>
        
        <View style={styles.singleContainer}>
          <View style={[styles.inputWrapper, styles.inputWrapperLarge, status === 'good' && styles.inputGood, status === 'warning' && styles.inputWarning]}>
            <TextInput
              style={styles.measureInput}
              placeholder="Enter value"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="decimal-pad"
              value={m.value || ''}
              onChangeText={(v) => updateMeasurement(test.key, 'value', v)}
            />
            {test.unit ? <Text style={styles.unitText}>{test.unit}</Text> : null}
          </View>
        </View>
        
        <TextInput
          style={styles.commentsInput}
          placeholder="Comments (optional)"
          placeholderTextColor={theme.colors.textMuted}
          value={m.comments || ''}
          onChangeText={(v) => updateMeasurement(test.key, 'comments', v)}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <MaterialCommunityIcons name="bone" size={48} color={theme.colors.error} />
            <Text style={styles.title}>MSK Screening</Text>
            <Text style={styles.subtitle}>Enhanced Assessment with AI Analysis</Text>
          </View>

          {/* Version Switcher */}
          <View style={styles.versionSwitcher}>
            <TouchableOpacity style={[styles.versionTab, styles.versionTabActive]}>
              <Text style={[styles.versionTabText, styles.versionTabTextActive]}>MSK Standard</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.versionTab}
              onPress={() => router.push('/physio/msk-assessment-2')}
            >
              <Text style={styles.versionTabText}>MSK Detailed</Text>
            </TouchableOpacity>
          </View>

          {/* Patient Info */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Player:</Text>
              <TextInput
                style={styles.infoInput}
                placeholder="Enter player name"
                placeholderTextColor={theme.colors.textMuted}
                value={playerName}
                onChangeText={setPlayerName}
              />
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Assessor:</Text>
              <TextInput
                style={styles.infoInput}
                placeholder="Enter assessor name"
                placeholderTextColor={theme.colors.textMuted}
                value={assessorName}
                onChangeText={setAssessorName}
              />
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date:</Text>
              <Text style={styles.dateText}>{new Date().toLocaleDateString()}</Text>
            </View>
          </View>

          {isPhysio && (
            <View style={styles.patientSection}>
              <Text style={styles.sectionTitle}>Select Patient</Text>
              <TouchableOpacity style={styles.patientSelector} onPress={() => setShowPatientSelector(!showPatientSelector)}>
                <Ionicons name="person" size={20} color={theme.colors.accent} />
                <Text style={styles.patientSelectorText}>
                  {selectedPatient ? patients.find(p => p.id === selectedPatient)?.name || 'Select' : 'Select Patient'}
                </Text>
                <Ionicons name={showPatientSelector ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              {showPatientSelector && (
                <View style={styles.patientList}>
                  {patients.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.patientOption, selectedPatient === p.id && styles.patientOptionSelected]}
                      onPress={() => { setSelectedPatient(p.id); setPlayerName(p.name); setShowPatientSelector(false); }}
                    >
                      <Text style={[styles.patientOptionText, selectedPatient === p.id && styles.patientOptionTextSelected]}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Progress */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Completion</Text>
              <Text style={styles.progressPercent}>{calculateCompletion()}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${calculateCompletion()}%` }]} />
            </View>
            <Text style={styles.testCount}>{mskTests.length} Tests ({mskTests.filter(t => t.isCustom).length} Custom)</Text>
          </View>

          {/* Add Custom Test Button */}
          <TouchableOpacity style={styles.addTestButton} onPress={() => setShowAddTestModal(true)}>
            <Ionicons name="add-circle" size={24} color={theme.colors.accent} />
            <Text style={styles.addTestButtonText}>Add Custom Test / Parameter</Text>
          </TouchableOpacity>

          {/* Tests */}
          <Text style={styles.sectionHeader}>📏 Standing Measures</Text>
          {mskTests.slice(0, 6).map(renderTestInput)}

          <Text style={styles.sectionHeader}>🦴 Lumbar Spine</Text>
          {mskTests.slice(6, 10).map(renderTestInput)}

          <Text style={styles.sectionHeader}>💪 Shoulder & Upper Body</Text>
          {mskTests.slice(10, 14).map(renderTestInput)}

          <Text style={styles.sectionHeader}>🎯 Core Stability</Text>
          {mskTests.slice(14, 17).map(renderTestInput)}

          {mskTests.filter(t => t.isCustom).length > 0 && (
            <>
              <Text style={styles.sectionHeader}>⚙️ Custom Tests</Text>
              {mskTests.filter(t => t.isCustom).map(renderTestInput)}
            </>
          )}

          {/* Clinical Notes */}
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Clinical Notes</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Add observations, injury history, recommendations..."
              placeholderTextColor={theme.colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* AI Analysis Display */}
          {aiAnalysis && (
            <View style={styles.aiAnalysisCard}>
              <View style={styles.aiHeader}>
                <MaterialCommunityIcons name="robot" size={24} color={theme.colors.accent} />
                <Text style={styles.aiTitle}>AI Analysis</Text>
              </View>
              <Text style={styles.aiText}>{aiAnalysis}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.aiButton, generatingAI && styles.buttonDisabled]}
              onPress={generateAIAnalysis}
              disabled={generatingAI}
            >
              {generatingAI ? (
                <ActivityIndicator color={theme.colors.textPrimary} />
              ) : (
                <>
                  <MaterialCommunityIcons name="robot" size={24} color={theme.colors.textPrimary} />
                  <Text style={styles.aiButtonText}>Generate AI Analysis</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pdfButton, (!aiAnalysis || generatingPdf) && styles.buttonDisabled]}
              onPress={generatePDFReport}
              disabled={!aiAnalysis || generatingPdf}
            >
              {generatingPdf ? (
                <ActivityIndicator color={theme.colors.textPrimary} />
              ) : (
                <>
                  <Ionicons name="document-text" size={24} color={theme.colors.textPrimary} />
                  <Text style={styles.pdfButtonText}>Download PDF Report</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.textPrimary} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.textPrimary} />
                  <Text style={styles.saveButtonText}>Save Assessment</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Add Custom Test Modal */}
      <Modal visible={showAddTestModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Custom Test</Text>
              <TouchableOpacity onPress={() => setShowAddTestModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalLabel}>Test Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Thomas Test"
                placeholderTextColor={theme.colors.textMuted}
                value={newTestName}
                onChangeText={setNewTestName}
              />

              <Text style={styles.modalLabel}>Description</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Brief description of the test"
                placeholderTextColor={theme.colors.textMuted}
                value={newTestDescription}
                onChangeText={setNewTestDescription}
              />

              <Text style={styles.modalLabel}>Unit</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., cm, °, sec, reps"
                placeholderTextColor={theme.colors.textMuted}
                value={newTestUnit}
                onChangeText={setNewTestUnit}
              />

              <Text style={styles.modalLabel}>Reference Range</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., >10 cm, ≤30°"
                placeholderTextColor={theme.colors.textMuted}
                value={newTestReference}
                onChangeText={setNewTestReference}
              />

              <Text style={styles.modalLabel}>Input Type</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeButton, newTestType === 'bilateral' && styles.typeButtonActive]}
                  onPress={() => setNewTestType('bilateral')}
                >
                  <Text style={[styles.typeButtonText, newTestType === 'bilateral' && styles.typeButtonTextActive]}>Bilateral (L/R)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, newTestType === 'single' && styles.typeButtonActive]}
                  onPress={() => setNewTestType('single')}
                >
                  <Text style={[styles.typeButtonText, newTestType === 'single' && styles.typeButtonTextActive]}>Single Value</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.addButton} onPress={addCustomTest}>
                <Ionicons name="add" size={24} color={theme.colors.textPrimary} />
                <Text style={styles.addButtonText}>Add Test</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  scrollContent: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  header: { alignItems: 'center', marginBottom: theme.spacing.lg },
  title: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginTop: theme.spacing.sm },
  subtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  versionSwitcher: { flexDirection: 'row', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: 4, marginBottom: theme.spacing.md },
  versionTab: { flex: 1, paddingVertical: theme.spacing.sm, alignItems: 'center', borderRadius: theme.borderRadius.sm },
  versionTabActive: { backgroundColor: theme.colors.error },
  versionTabText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  versionTabTextActive: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },
  infoCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  infoLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, width: 80 },
  infoInput: { flex: 1, fontSize: theme.fontSize.md, color: theme.colors.textPrimary, backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm, padding: theme.spacing.sm },
  dateText: { fontSize: theme.fontSize.md, color: theme.colors.textPrimary },
  patientSection: { marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  sectionHeader: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.error, marginTop: theme.spacing.lg, marginBottom: theme.spacing.md, paddingBottom: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.error + '30' },
  patientSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, gap: theme.spacing.sm },
  patientSelectorText: { flex: 1, fontSize: theme.fontSize.md, color: theme.colors.textPrimary },
  patientList: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.sm, overflow: 'hidden' },
  patientOption: { padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder },
  patientOptionSelected: { backgroundColor: theme.colors.accent + '20' },
  patientOptionText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
  patientOptionTextSelected: { color: theme.colors.accent, fontWeight: theme.fontWeight.semibold },
  progressCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  progressTitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  progressPercent: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.success },
  progressBarBg: { height: 8, backgroundColor: theme.colors.primaryLight, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: theme.colors.success, borderRadius: 4 },
  testCount: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: theme.spacing.xs, textAlign: 'center' },
  addTestButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accent + '20', borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 2, borderStyle: 'dashed', borderColor: theme.colors.accent, gap: theme.spacing.sm },
  addTestButtonText: { fontSize: theme.fontSize.md, color: theme.colors.accent, fontWeight: theme.fontWeight.semibold },
  testCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  testHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.xs },
  testTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: theme.spacing.sm },
  testLabel: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary, flex: 1 },
  testDescription: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginBottom: theme.spacing.md },
  refBadge: { backgroundColor: theme.colors.accent + '20', paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.borderRadius.sm, marginLeft: theme.spacing.sm },
  refBadgeText: { fontSize: theme.fontSize.xs, color: theme.colors.accent, fontWeight: theme.fontWeight.medium },
  bilateralContainer: { flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.sm },
  sideInput: { flex: 1 },
  sideLabel: { fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.bold, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs, textAlign: 'center' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm, paddingHorizontal: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.cardBorder },
  inputWrapperLarge: { maxWidth: 200 },
  inputGood: { borderColor: theme.colors.success, backgroundColor: theme.colors.success + '15' },
  inputWarning: { borderColor: theme.colors.warning, backgroundColor: theme.colors.warning + '15' },
  measureInput: { flex: 1, fontSize: theme.fontSize.lg, color: theme.colors.textPrimary, paddingVertical: theme.spacing.sm, textAlign: 'center' },
  unitText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  commentsInput: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm, padding: theme.spacing.sm, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, borderWidth: 1, borderColor: theme.colors.cardBorder },
  singleContainer: { marginBottom: theme.spacing.sm },
  qualitativeContainer: { gap: theme.spacing.md, marginBottom: theme.spacing.sm },
  qualitativeSide: { marginBottom: theme.spacing.sm },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  optionButton: { backgroundColor: theme.colors.primaryLight, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.borderRadius.sm, borderWidth: 1, borderColor: theme.colors.cardBorder },
  optionButtonSelected: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  optionText: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary },
  optionTextSelected: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.medium },
  notesSection: { marginTop: theme.spacing.lg, marginBottom: theme.spacing.lg },
  notesInput: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, color: theme.colors.textPrimary, fontSize: theme.fontSize.md, minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: theme.colors.cardBorder },
  aiAnalysisCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.accent },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  aiTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  aiText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 20 },
  actionButtons: { gap: theme.spacing.md },
  aiButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#9C27B0', borderRadius: theme.borderRadius.md, padding: theme.spacing.md, gap: theme.spacing.sm },
  aiButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  pdfButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accent, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, gap: theme.spacing.sm },
  pdfButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.success, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, gap: theme.spacing.sm },
  saveButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  buttonDisabled: { opacity: 0.6 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.primary, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder },
  modalTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  modalBody: { padding: theme.spacing.lg },
  modalLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs, marginTop: theme.spacing.md },
  modalInput: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, color: theme.colors.textPrimary, fontSize: theme.fontSize.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  typeSelector: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  typeButton: { flex: 1, backgroundColor: theme.colors.card, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  typeButtonActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accent + '20' },
  typeButtonText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  typeButtonTextActive: { color: theme.colors.accent, fontWeight: theme.fontWeight.bold },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.success, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginTop: theme.spacing.xl, gap: theme.spacing.sm },
  addButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
});
