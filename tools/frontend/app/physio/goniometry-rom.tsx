import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';
import { saveAssessmentReport } from '../../src/utils/api';
import PatientSelector, { Patient } from '../../src/components/PatientSelector';
import { generatePaymentSectionHTML, generateAISectionHTML } from '../../src/utils/pdfPaymentSection';

// ROM Test Categories
const ROM_CATEGORIES = [
  {
    id: 'shoulder',
    name: 'Shoulder',
    icon: 'arm-flex',
    color: '#2196F3',
    tests: [
      { id: 'shoulder_flexion', name: 'Flexion', normalRange: '0-180°', customNormal: 180 },
      { id: 'shoulder_extension', name: 'Extension', normalRange: '0-60°', customNormal: 60 },
      { id: 'shoulder_abduction', name: 'Abduction', normalRange: '0-180°', customNormal: 180 },
      { id: 'shoulder_adduction', name: 'Adduction', normalRange: '0-45°', customNormal: 45 },
      { id: 'shoulder_ir', name: 'Internal Rotation (IR)', normalRange: '0-70°', customNormal: 70 },
      { id: 'shoulder_er', name: 'External Rotation (ER)', normalRange: '0-90°', customNormal: 90 },
    ],
  },
  {
    id: 'hip',
    name: 'Hip',
    icon: 'human',
    color: '#9C27B0',
    tests: [
      { id: 'hip_flexion', name: 'Flexion', normalRange: '0-120°', customNormal: 120 },
      { id: 'hip_extension', name: 'Extension', normalRange: '0-30°', customNormal: 30 },
      { id: 'hip_abduction', name: 'Abduction', normalRange: '0-45°', customNormal: 45 },
      { id: 'hip_adduction', name: 'Adduction', normalRange: '0-30°', customNormal: 30 },
      { id: 'hip_ir', name: 'Internal Rotation (IR)', normalRange: '0-45°', customNormal: 45 },
      { id: 'hip_er', name: 'External Rotation (ER)', normalRange: '0-45°', customNormal: 45 },
    ],
  },
  {
    id: 'knee',
    name: 'Knee',
    icon: 'human-handsdown',
    color: '#4CAF50',
    tests: [
      { id: 'knee_flexion', name: 'Flexion', normalRange: '0-135°', customNormal: 135 },
      { id: 'knee_extension', name: 'Extension', normalRange: '0-0°', customNormal: 0 },
      { id: 'knee_hyperextension', name: 'Hyperextension', normalRange: '0-10°', customNormal: 10 },
    ],
  },
  {
    id: 'ankle',
    name: 'Ankle',
    icon: 'shoe-print',
    color: '#FF9800',
    tests: [
      { id: 'ankle_dorsiflexion', name: 'Dorsiflexion', normalRange: '0-20°', customNormal: 20 },
      { id: 'ankle_plantarflexion', name: 'Plantarflexion', normalRange: '0-50°', customNormal: 50 },
      { id: 'ankle_inversion', name: 'Inversion', normalRange: '0-35°', customNormal: 35 },
      { id: 'ankle_eversion', name: 'Eversion', normalRange: '0-20°', customNormal: 20 },
    ],
  },
  {
    id: 'cervical',
    name: 'Cervical Spine',
    icon: 'head',
    color: '#E91E63',
    tests: [
      { id: 'cervical_flexion', name: 'Flexion', normalRange: '0-45°', customNormal: 45 },
      { id: 'cervical_extension', name: 'Extension', normalRange: '0-45°', customNormal: 45 },
      { id: 'cervical_lateral_flexion_left', name: 'Lateral Flexion (Left)', normalRange: '0-45°', customNormal: 45 },
      { id: 'cervical_lateral_flexion_right', name: 'Lateral Flexion (Right)', normalRange: '0-45°', customNormal: 45 },
      { id: 'cervical_rotation_left', name: 'Rotation (Left)', normalRange: '0-60°', customNormal: 60 },
      { id: 'cervical_rotation_right', name: 'Rotation (Right)', normalRange: '0-60°', customNormal: 60 },
    ],
  },
  {
    id: 'lumbar',
    name: 'Lumbar Spine',
    icon: 'human-male',
    color: '#00BCD4',
    tests: [
      { id: 'lumbar_flexion', name: 'Flexion', normalRange: '0-60°', customNormal: 60 },
      { id: 'lumbar_extension', name: 'Extension', normalRange: '0-25°', customNormal: 25 },
      { id: 'lumbar_lateral_flexion', name: 'Lateral Flexion', normalRange: '0-25°', customNormal: 25 },
      { id: 'lumbar_rotation', name: 'Rotation', normalRange: '0-30°', customNormal: 30 },
    ],
  },
  {
    id: 'elbow',
    name: 'Elbow',
    icon: 'arm-flex-outline',
    color: '#795548',
    tests: [
      { id: 'elbow_flexion', name: 'Flexion', normalRange: '0-150°', customNormal: 150 },
      { id: 'elbow_extension', name: 'Extension', normalRange: '0-0°', customNormal: 0 },
      { id: 'elbow_supination', name: 'Supination', normalRange: '0-85°', customNormal: 85 },
      { id: 'elbow_pronation', name: 'Pronation', normalRange: '0-85°', customNormal: 85 },
    ],
  },
  {
    id: 'wrist',
    name: 'Wrist',
    icon: 'hand-back-left',
    color: '#607D8B',
    tests: [
      { id: 'wrist_flexion', name: 'Flexion', normalRange: '0-80°', customNormal: 80 },
      { id: 'wrist_extension', name: 'Extension', normalRange: '0-70°', customNormal: 70 },
      { id: 'wrist_radial_dev', name: 'Radial Deviation', normalRange: '0-20°', customNormal: 20 },
      { id: 'wrist_ulnar_dev', name: 'Ulnar Deviation', normalRange: '0-35°', customNormal: 35 },
    ],
  },
];

// Inclinometer Types
const INCLINOMETER_TYPES = [
  { id: 'digital', name: 'Digital Inclinometer', icon: 'phone-portrait', description: 'Uses phone sensors' },
  { id: 'gravity', name: 'Gravity-Referenced', icon: 'compass', description: 'For limb measurements' },
  { id: 'bubble', name: 'Bubble Inclinometer', icon: 'water', description: 'Traditional method' },
];

interface ROMValue {
  left: string;
  right: string;
  customNormal?: string;
}

export default function GoniometryROM() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedInclinometer, setSelectedInclinometer] = useState('digital');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [romValues, setRomValues] = useState<Record<string, ROMValue>>({});
  const [customNormals, setCustomNormals] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState<string | null>(null);
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [assessmentSaved, setAssessmentSaved] = useState(false);

  const setROMValue = (testId: string, side: 'left' | 'right', value: string) => {
    setRomValues(prev => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        [side]: value,
      },
    }));
  };

  const setCustomNormal = (testId: string, value: string) => {
    setCustomNormals(prev => ({
      ...prev,
      [testId]: value,
    }));
  };

  const getDeviationStatus = (testId: string, measured: number, side: 'left' | 'right'): { status: string; color: string } => {
    const test = ROM_CATEGORIES.flatMap(c => c.tests).find(t => t.id === testId);
    if (!test) return { status: 'Unknown', color: theme.colors.textMuted };
    
    const normalValue = customNormals[testId] ? parseFloat(customNormals[testId]) : test.customNormal;
    const percentDeviation = ((normalValue - measured) / normalValue) * 100;
    
    if (measured >= normalValue) {
      return { status: 'Normal/Hyper', color: theme.colors.success };
    } else if (percentDeviation <= 15) {
      return { status: 'Mild Restriction', color: theme.colors.warning };
    } else if (percentDeviation <= 30) {
      return { status: 'Moderate Restriction', color: '#FF9800' };
    } else {
      return { status: 'Severe Restriction', color: theme.colors.error };
    }
  };

  const calculateCategoryScore = (categoryId: string): { completed: number; total: number; avgDeviation: number } => {
    const category = ROM_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return { completed: 0, total: 0, avgDeviation: 0 };
    
    let completed = 0;
    let totalDeviation = 0;
    let deviationCount = 0;
    
    category.tests.forEach(test => {
      const values = romValues[test.id];
      if (values?.left || values?.right) {
        completed++;
        const normalValue = customNormals[test.id] ? parseFloat(customNormals[test.id]) : test.customNormal;
        
        if (values.left) {
          const deviation = Math.abs(normalValue - parseFloat(values.left)) / normalValue * 100;
          totalDeviation += deviation;
          deviationCount++;
        }
        if (values.right) {
          const deviation = Math.abs(normalValue - parseFloat(values.right)) / normalValue * 100;
          totalDeviation += deviation;
          deviationCount++;
        }
      }
    });
    
    return {
      completed,
      total: category.tests.length,
      avgDeviation: deviationCount > 0 ? Math.round(totalDeviation / deviationCount) : 0,
    };
  };

  // Generate AI-Powered Comprehensive Report
  const generateComprehensiveReport = async () => {
    if (!selectedPatient) {
      Alert.alert('Error', 'Please select a patient first');
      return;
    }

    setGeneratingReport(true);
    try {
      // Prepare data for AI analysis
      const assessmentData: Record<string, any> = {};
      ROM_CATEGORIES.forEach(category => {
        category.tests.forEach(test => {
          const values = romValues[test.id];
          if (values?.left || values?.right) {
            assessmentData[test.id] = {
              left: values.left ? parseFloat(values.left) : null,
              right: values.right ? parseFloat(values.right) : null,
              normal: customNormals[test.id] ? parseFloat(customNormals[test.id]) : test.customNormal,
              testName: test.name,
              category: category.name,
            };
          }
        });
      });

      // Call backend for AI analysis
      const response = await api.post('/generate-rom-report', {
        patient_name: selectedPatient?.name || 'Unknown',
        physio_name: currentUser?.name || 'WBA99 Physio',
        inclinometer_type: selectedInclinometer,
        assessment_data: assessmentData,
        notes: notes,
      });

      const { report_html, report_id } = response.data;

      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html: report_html,
        base64: false,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `ROM Assessment - ${selectedPatient?.name || 'Patient'}`,
        });
      } else {
        Alert.alert('Success', `Report generated: ${report_id}`);
      }
    } catch (error) {
      console.error('Report generation error:', error);
      // Generate local report if API fails
      await generateLocalReport();
    } finally {
      setGeneratingReport(false);
    }
  };

  // Save Assessment to Database
  const handleSaveAssessment = async () => {
    if (!selectedPatient || !currentUser?.id) {
      Alert.alert('Error', 'Please select a patient first');
      return;
    }

    const hasData = Object.keys(romValues).some(k => romValues[k]?.left || romValues[k]?.right);
    if (!hasData) {
      Alert.alert('Error', 'Please complete at least one ROM measurement before saving');
      return;
    }

    setSavingAssessment(true);
    try {
      // Prepare comprehensive report data
      const assessmentData: Record<string, any> = {};
      ROM_CATEGORIES.forEach(category => {
        const score = calculateCategoryScore(category.id);
        category.tests.forEach(test => {
          const values = romValues[test.id];
          if (values?.left || values?.right) {
            assessmentData[test.id] = {
              left: values.left ? parseFloat(values.left) : null,
              right: values.right ? parseFloat(values.right) : null,
              normal: customNormals[test.id] ? parseFloat(customNormals[test.id]) : test.customNormal,
              testName: test.name,
              category: category.name,
            };
          }
        });
      });

      const reportData = {
        physio_id: currentUser.id,
        patient_id: selectedPatient.id,
        assessment_type: 'goniometry',
        report_data: {
          inclinometerType: selectedInclinometer,
          romValues,
          customNormals,
          notes,
          assessmentData,
        },
        summary: `Goniometry/ROM Assessment: ${Object.keys(romValues).filter(k => romValues[k]?.left || romValues[k]?.right).length} measurements recorded`,
      };

      await saveAssessmentReport(reportData);
      setAssessmentSaved(true);
      Alert.alert(
        '✅ Assessment Saved',
        `ROM assessment for ${selectedPatient.name} has been saved successfully.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving assessment:', error);
      Alert.alert('Error', 'Failed to save assessment. Please try again.');
    } finally {
      setSavingAssessment(false);
    }
  };

  // Generate local PDF report (fallback)
  const generateLocalReport = async () => {
    const currentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const reportId = `WBA99-ROM-${Date.now().toString(36).toUpperCase()}`;

    let testsHtml = '';
    ROM_CATEGORIES.forEach(category => {
      const categoryTests = category.tests.filter(t => romValues[t.id]?.left || romValues[t.id]?.right);
      if (categoryTests.length === 0) return;

      testsHtml += `
        <div class="category-section">
          <div class="category-header" style="background: ${category.color};">
            <span>${category.name} ROM</span>
          </div>
          <table class="rom-table">
            <thead>
              <tr>
                <th>Movement</th>
                <th>Normal</th>
                <th>Left</th>
                <th>Right</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${categoryTests.map(test => {
                const values = romValues[test.id];
                const normal = customNormals[test.id] || test.customNormal;
                const leftStatus = values?.left ? getDeviationStatus(test.id, parseFloat(values.left), 'left') : null;
                const rightStatus = values?.right ? getDeviationStatus(test.id, parseFloat(values.right), 'right') : null;
                
                return `
                  <tr>
                    <td><strong>${test.name}</strong></td>
                    <td>${normal}°</td>
                    <td style="color: ${leftStatus?.color || '#666'};">${values?.left || '-'}°</td>
                    <td style="color: ${rightStatus?.color || '#666'};">${values?.right || '-'}°</td>
                    <td>
                      ${leftStatus ? `<span class="status-badge" style="background: ${leftStatus.color}20; color: ${leftStatus.color};">L: ${leftStatus.status}</span>` : ''}
                      ${rightStatus ? `<span class="status-badge" style="background: ${rightStatus.color}20; color: ${rightStatus.color};">R: ${rightStatus.status}</span>` : ''}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; border-bottom: 3px solid #00BCD4; padding-bottom: 15px; margin-bottom: 20px; }
          .logo { font-size: 28px; font-weight: bold; color: #00BCD4; }
          .report-meta { text-align: right; font-size: 11px; color: #666; }
          .title { text-align: center; background: linear-gradient(135deg, #00BCD4, #0097A7); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
          .title h1 { margin: 0; font-size: 24px; }
          .patient-info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .info-item { text-align: center; }
          .info-label { font-size: 10px; color: #666; text-transform: uppercase; }
          .info-value { font-size: 14px; font-weight: bold; color: #333; }
          .category-section { margin-bottom: 20px; }
          .category-header { color: white; padding: 10px 15px; border-radius: 5px 5px 0 0; font-weight: bold; }
          .rom-table { width: 100%; border-collapse: collapse; }
          .rom-table th { background: #f0f0f0; padding: 10px; text-align: left; font-size: 11px; border: 1px solid #ddd; }
          .rom-table td { padding: 10px; border: 1px solid #ddd; font-size: 12px; }
          .status-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; margin: 2px; }
          .ai-section { background: #f3e5f5; border: 2px solid #9C27B0; border-radius: 10px; padding: 20px; margin-top: 20px; }
          .ai-title { color: #7B1FA2; font-weight: bold; font-size: 16px; margin-bottom: 10px; }
          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">WBA99</div>
          <div class="report-meta">
            <p><strong>Report ID:</strong> ${reportId}</p>
            <p><strong>Date:</strong> ${currentDate}</p>
          </div>
        </div>
        
        <div class="title">
          <h1>📐 Goniometry & Range of Motion Report</h1>
          <p>Comprehensive Joint Assessment with AI Analysis</p>
        </div>
        
        <div class="patient-info">
          <div class="info-item">
            <div class="info-label">Patient Name</div>
            <div class="info-value">${selectedPatient?.name || 'Unknown'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Inclinometer Type</div>
            <div class="info-value">${INCLINOMETER_TYPES.find(i => i.id === selectedInclinometer)?.name}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Assessed By</div>
            <div class="info-value">${currentUser?.name || 'WBA99 Physio'}</div>
          </div>
        </div>
        
        ${testsHtml}
        
        <div class="ai-section">
          <div class="ai-title">🧠 AI Clinical Analysis</div>
          <p><strong>Causes of Restricted ROM:</strong> Joint restrictions may result from muscle tightness, joint capsule adhesions, ligamentous shortening, muscular weakness, neural tension, or post-surgical/traumatic changes.</p>
          <p><strong>Potential Consequences:</strong> Untreated ROM deficits can lead to compensatory movement patterns, increased stress on adjacent joints, muscle imbalances, pain syndromes, and functional limitations affecting daily activities.</p>
          <p><strong>Recommendations:</strong> Targeted stretching, joint mobilization, strengthening exercises, and regular ROM monitoring are advised based on the findings.</p>
        </div>
        
        ${generatePaymentSectionHTML('#00BCD4')}
        
        <div class="footer">
          <p>Generated by WBA99 Goniometry & ROM Assessment System | © 2025 WBA99 Expert Analysis India</p>
          <p><em>This report is for clinical reference only. Always correlate with clinical examination.</em></p>
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Goniometry & ROM</Text>
          <TouchableOpacity onPress={() => setShowInfoModal('info')}>
            <Ionicons name="information-circle" size={24} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="angle-acute" size={40} color={theme.colors.accent} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Range of Motion Assessment</Text>
            <Text style={styles.infoSubtitle}>
              Measure joint angles with goniometry & inclinometry. AI-powered analysis with causes & consequences.
            </Text>
          </View>
        </View>

        {/* Patient Selector */}
        <PatientSelector
          physioId={currentUser?.id || ''}
          selectedPatient={selectedPatient}
          onSelectPatient={setSelectedPatient}
          label="Select Patient"
          placeholder="Tap to select a patient"
        />

        {/* Inclinometer Type Selection */}
        <Text style={styles.sectionTitle}>📐 Inclinometer Type</Text>
        <View style={styles.inclinometerGrid}>
          {INCLINOMETER_TYPES.map(type => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.inclinometerCard,
                selectedInclinometer === type.id && styles.inclinometerCardActive,
              ]}
              onPress={() => {
                setSelectedInclinometer(type.id);
                // Navigate to Digital Inclinometer tool when tapped
                if (type.id === 'digital') {
                  router.push('/physio/inclinometer');
                }
              }}
            >
              <MaterialCommunityIcons
                name={type.icon as any}
                size={32}
                color={selectedInclinometer === type.id ? theme.colors.accent : theme.colors.textMuted}
              />
              <Text style={[
                styles.inclinometerName,
                selectedInclinometer === type.id && styles.inclinometerNameActive,
              ]}>
                {type.name}
              </Text>
              <Text style={styles.inclinometerDesc}>{type.description}</Text>
              {type.id === 'digital' && (
                <View style={styles.openToolBadge}>
                  <Text style={styles.openToolBadgeText}>TAP TO OPEN</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ROM Categories */}
        <Text style={styles.sectionTitle}>🦴 Body Regions</Text>
        {ROM_CATEGORIES.map(category => {
          const score = calculateCategoryScore(category.id);
          const isExpanded = activeCategory === category.id;
          
          return (
            <View key={category.id} style={styles.categoryContainer}>
              <TouchableOpacity
                style={[styles.categoryHeader, { borderLeftColor: category.color }]}
                onPress={() => setActiveCategory(isExpanded ? null : category.id)}
              >
                <View style={styles.categoryLeft}>
                  <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                    <MaterialCommunityIcons name={category.icon as any} size={24} color="#fff" />
                  </View>
                  <View>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryProgress}>
                      {score.completed}/{score.total} tests • {score.avgDeviation > 0 ? `~${score.avgDeviation}% deviation` : 'No data'}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.testsContainer}>
                  {category.tests.map(test => {
                    const values = romValues[test.id] || { left: '', right: '' };
                    const customNormal = customNormals[test.id];
                    
                    return (
                      <View key={test.id} style={styles.testCard}>
                        <View style={styles.testHeader}>
                          <Text style={styles.testName}>{test.name}</Text>
                          <TouchableOpacity
                            style={styles.normalButton}
                            onPress={() => setShowInfoModal(test.id)}
                          >
                            <Text style={styles.normalButtonText}>
                              Normal: {customNormal || test.customNormal}°
                            </Text>
                            <Ionicons name="create-outline" size={14} color={theme.colors.accent} />
                          </TouchableOpacity>
                        </View>
                        
                        <View style={styles.romInputRow}>
                          <View style={styles.romInputContainer}>
                            <Text style={styles.sideLabel}>LEFT</Text>
                            <View style={styles.romInputWrapper}>
                              <TextInput
                                style={styles.romInput}
                                placeholder="0"
                                placeholderTextColor={theme.colors.textMuted}
                                keyboardType="numeric"
                                value={values.left}
                                onChangeText={(v) => setROMValue(test.id, 'left', v)}
                              />
                              <Text style={styles.degreeSymbol}>°</Text>
                            </View>
                            {values.left && (
                              <View style={[
                                styles.statusTag,
                                { backgroundColor: getDeviationStatus(test.id, parseFloat(values.left), 'left').color + '20' }
                              ]}>
                                <Text style={[
                                  styles.statusTagText,
                                  { color: getDeviationStatus(test.id, parseFloat(values.left), 'left').color }
                                ]}>
                                  {getDeviationStatus(test.id, parseFloat(values.left), 'left').status}
                                </Text>
                              </View>
                            )}
                          </View>
                          
                          <View style={styles.romInputContainer}>
                            <Text style={styles.sideLabel}>RIGHT</Text>
                            <View style={styles.romInputWrapper}>
                              <TextInput
                                style={styles.romInput}
                                placeholder="0"
                                placeholderTextColor={theme.colors.textMuted}
                                keyboardType="numeric"
                                value={values.right}
                                onChangeText={(v) => setROMValue(test.id, 'right', v)}
                              />
                              <Text style={styles.degreeSymbol}>°</Text>
                            </View>
                            {values.right && (
                              <View style={[
                                styles.statusTag,
                                { backgroundColor: getDeviationStatus(test.id, parseFloat(values.right), 'right').color + '20' }
                              ]}>
                                <Text style={[
                                  styles.statusTagText,
                                  { color: getDeviationStatus(test.id, parseFloat(values.right), 'right').color }
                                ]}>
                                  {getDeviationStatus(test.id, parseFloat(values.right), 'right').status}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {/* Generate Report Button */}
        <TouchableOpacity
          style={[styles.reportButton, generatingReport && styles.buttonDisabled]}
          onPress={generateComprehensiveReport}
          disabled={generatingReport}
        >
          {generatingReport ? (
            <>
              <ActivityIndicator color={theme.colors.textPrimary} />
              <Text style={styles.reportButtonText}>Generating AI Report...</Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="file-document" size={24} color={theme.colors.textPrimary} />
              <Text style={styles.reportButtonText}>Generate Comprehensive Report</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Save Assessment Button */}
        <TouchableOpacity
          style={[styles.saveButton, (savingAssessment || assessmentSaved) && styles.buttonDisabled]}
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

        <Text style={styles.reportHint}>
          Includes: Causes • Consequences • Rehabilitation Plan • Mobility • Strengthening
        </Text>

        {/* Info/Edit Modal */}
        <Modal visible={!!showInfoModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {showInfoModal === 'info' ? (
                <>
                  <Text style={styles.modalTitle}>Goniometry Guide</Text>
                  <ScrollView style={styles.modalScroll}>
                    <Text style={styles.modalText}>
                      <Text style={styles.bold}>Goniometry</Text> is the measurement of joint angles using a goniometer or inclinometer.
                    </Text>
                    <Text style={styles.modalSubtitle}>Inclinometer Types:</Text>
                    <Text style={styles.modalText}>• <Text style={styles.bold}>Digital:</Text> Uses electronic sensors for precise measurements</Text>
                    <Text style={styles.modalText}>• <Text style={styles.bold}>Gravity-Referenced:</Text> Uses gravity for accurate limb measurements</Text>
                    <Text style={styles.modalText}>• <Text style={styles.bold}>Bubble:</Text> Traditional fluid-filled device</Text>
                    <Text style={styles.modalSubtitle}>ROM Classification:</Text>
                    <Text style={styles.modalText}>• <Text style={{ color: theme.colors.success }}>Normal:</Text> Within expected range</Text>
                    <Text style={styles.modalText}>• <Text style={{ color: theme.colors.warning }}>Mild Restriction:</Text> Up to 15% below normal</Text>
                    <Text style={styles.modalText}>• <Text style={{ color: '#FF9800' }}>Moderate Restriction:</Text> 15-30% below normal</Text>
                    <Text style={styles.modalText}>• <Text style={{ color: theme.colors.error }}>Severe Restriction:</Text> Over 30% below normal</Text>
                  </ScrollView>
                </>
              ) : (
                <>
                  <Text style={styles.modalTitle}>Set Custom Normal Value</Text>
                  {(() => {
                    const test = ROM_CATEGORIES.flatMap(c => c.tests).find(t => t.id === showInfoModal);
                    return test ? (
                      <>
                        <Text style={styles.modalTestName}>{test.name}</Text>
                        <Text style={styles.modalText}>Standard Range: {test.normalRange}</Text>
                        <View style={styles.customNormalInput}>
                          <TextInput
                            style={styles.customNormalTextInput}
                            placeholder={String(test.customNormal)}
                            placeholderTextColor={theme.colors.textMuted}
                            keyboardType="numeric"
                            value={customNormals[test.id] || ''}
                            onChangeText={(v) => setCustomNormal(test.id, v)}
                          />
                          <Text style={styles.customNormalDegree}>°</Text>
                        </View>
                      </>
                    ) : null;
                  })()}
                </>
              )}
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowInfoModal(null)}>
                <Text style={styles.modalCloseText}>Close</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  headerTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  infoTextContainer: { flex: 1, marginLeft: theme.spacing.md },
  infoTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  infoSubtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
  inputSection: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  inputLabel: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  input: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm, padding: theme.spacing.md, color: theme.colors.textPrimary, fontSize: theme.fontSize.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md, marginTop: theme.spacing.md },
  inclinometerGrid: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  inclinometerCard: { flex: 1, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center', borderWidth: 2, borderColor: theme.colors.cardBorder },
  inclinometerCardActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accent + '10' },
  inclinometerName: { fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.semibold, color: theme.colors.textSecondary, marginTop: theme.spacing.sm, textAlign: 'center' },
  inclinometerNameActive: { color: theme.colors.accent },
  inclinometerDesc: { fontSize: 9, color: theme.colors.textMuted, textAlign: 'center', marginTop: 2 },
  categoryContainer: { marginBottom: theme.spacing.md },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, borderLeftWidth: 4, borderWidth: 1, borderColor: theme.colors.cardBorder },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  categoryIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  categoryName: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  categoryProgress: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted },
  testsContainer: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.sm, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  testCard: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  testHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  testName: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  normalButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.accent + '20', paddingHorizontal: theme.spacing.sm, paddingVertical: 4, borderRadius: theme.borderRadius.sm },
  normalButtonText: { fontSize: theme.fontSize.xs, color: theme.colors.accent },
  romInputRow: { flexDirection: 'row', gap: theme.spacing.md },
  romInputContainer: { flex: 1, alignItems: 'center' },
  sideLabel: { fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.bold, color: theme.colors.textMuted, marginBottom: theme.spacing.xs },
  romInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.sm, paddingHorizontal: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  romInput: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, paddingVertical: theme.spacing.sm, width: 60, textAlign: 'center' },
  degreeSymbol: { fontSize: theme.fontSize.lg, color: theme.colors.textMuted },
  statusTag: { marginTop: theme.spacing.xs, paddingHorizontal: theme.spacing.sm, paddingVertical: 2, borderRadius: theme.borderRadius.sm },
  statusTagText: { fontSize: 10, fontWeight: theme.fontWeight.bold },
  reportButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.success, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginTop: theme.spacing.lg, gap: theme.spacing.sm },
  reportButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accent, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginTop: theme.spacing.sm, gap: theme.spacing.sm },
  saveButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  reportHint: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing.sm },
  buttonDisabled: { opacity: 0.6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  modalContent: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.xl, width: '100%', maxHeight: '80%' },
  modalTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  modalScroll: { maxHeight: 300 },
  modalText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, lineHeight: 22 },
  modalSubtitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm },
  modalTestName: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.accent, marginBottom: theme.spacing.sm },
  bold: { fontWeight: 'bold' as const, color: theme.colors.textPrimary },
  customNormalInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.md, marginVertical: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  customNormalTextInput: { flex: 1, fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, paddingVertical: theme.spacing.md, textAlign: 'center' },
  customNormalDegree: { fontSize: theme.fontSize.xl, color: theme.colors.textMuted },
  modalCloseButton: { backgroundColor: theme.colors.accent, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center', marginTop: theme.spacing.md },
  modalCloseText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  openToolBadge: { backgroundColor: theme.colors.success, borderRadius: theme.borderRadius.sm, paddingHorizontal: theme.spacing.sm, paddingVertical: 2, marginTop: theme.spacing.sm },
  openToolBadgeText: { fontSize: 8, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
});
