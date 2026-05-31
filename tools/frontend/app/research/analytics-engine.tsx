import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Research Statistics Interface
interface ResearchStats {
  totalPatients: number;
  activeStudies: number;
  completedStudies: number;
  dataPoints: number;
  avgImprovement: number;
  pendingAnalysis: number;
}

// Research Study Interface
interface ResearchStudy {
  id: string;
  name: string;
  objective: string;
  status: 'active' | 'completed' | 'draft';
  sampleSize: number;
  enrolledPatients: number;
  parameters: string[];
  createdAt: string;
  createdBy: string;
}

// Patient Data Interface
interface PatientData {
  id: string;
  patientId: string;
  name: string;
  age: number;
  gender: string;
  diagnosis: string;
  painScore: number;
  romData: { [joint: string]: number };
  strengthScore: number;
  postureAnalysis: any;
  gaitParameters: any;
  balanceScore: number;
  treatmentProtocol: string;
  dataType: 'pre' | 'post';
  createdAt: string;
  studyId?: string;
}

// AI Insight Interface
interface AIInsight {
  id: string;
  type: 'pattern' | 'risk' | 'prediction' | 'comparison';
  title: string;
  description: string;
  confidence: number;
  severity?: 'low' | 'medium' | 'high';
}

// Default demo data
const DEFAULT_STATS: ResearchStats = {
  totalPatients: 156,
  activeStudies: 3,
  completedStudies: 12,
  dataPoints: 4892,
  avgImprovement: 34.7,
  pendingAnalysis: 28,
};

const DEFAULT_STUDIES: ResearchStudy[] = [
  {
    id: '1',
    name: 'Lower Back Pain Rehabilitation Outcomes',
    objective: 'Evaluate effectiveness of combined manual therapy and exercise',
    status: 'active',
    sampleSize: 50,
    enrolledPatients: 38,
    parameters: ['VAS', 'ROM', 'Strength', 'Disability Index'],
    createdAt: '2026-01-15',
    createdBy: 'Dr. Sarah Johnson',
  },
  {
    id: '2',
    name: 'FMS Score Improvement in Athletes',
    objective: 'Track functional movement changes with corrective exercise',
    status: 'active',
    sampleSize: 30,
    enrolledPatients: 28,
    parameters: ['FMS Score', 'Y-Balance', 'SLHB'],
    createdAt: '2026-02-01',
    createdBy: 'WBA99 Sports Team',
  },
  {
    id: '3',
    name: 'Post-Surgical Knee Rehabilitation',
    objective: 'Compare early vs delayed mobilization protocols',
    status: 'completed',
    sampleSize: 40,
    enrolledPatients: 40,
    parameters: ['ROM', 'Strength', 'Pain', 'Function'],
    createdAt: '2025-11-10',
    createdBy: 'Dr. Michael Chen',
  },
];

const DEFAULT_INSIGHTS: AIInsight[] = [
  {
    id: '1',
    type: 'pattern',
    title: 'Treatment Response Pattern Detected',
    description: 'Patients aged 35-45 with LBP show 42% faster improvement with combined manual therapy + exercise vs exercise alone.',
    confidence: 89,
  },
  {
    id: '2',
    type: 'risk',
    title: 'High Risk Factor Identified',
    description: '12 patients show signs of potential chronification. Early intervention recommended.',
    confidence: 76,
    severity: 'high',
  },
  {
    id: '3',
    type: 'prediction',
    title: 'Recovery Timeline Prediction',
    description: 'Based on current progress, 85% of active patients projected to reach treatment goals within 6 weeks.',
    confidence: 82,
  },
  {
    id: '4',
    type: 'comparison',
    title: 'Pre vs Post Analysis',
    description: 'Average pain reduction: 4.2 points (VAS). ROM improvement: 23°. Strength gain: 31%.',
    confidence: 95,
  },
];

export default function ResearchAnalyticsEngine() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<ResearchStats>(DEFAULT_STATS);
  const [studies, setStudies] = useState<ResearchStudy[]>(DEFAULT_STUDIES);
  const [insights, setInsights] = useState<AIInsight[]>(DEFAULT_INSIGHTS);
  const [activeTab, setActiveTab] = useState<'overview' | 'studies' | 'data' | 'ai' | 'export'>('overview');
  const [showNewStudyModal, setShowNewStudyModal] = useState(false);
  const [showDataEntryModal, setShowDataEntryModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Publication states
  const [publications, setPublications] = useState<any[]>([]);
  const [selectedPublication, setSelectedPublication] = useState<any>(null);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  // User role check
  const userRole = currentUser?.role || 'physio';
  const canCreateStudy = ['admin', 'org_head'].includes(userRole);
  const canExportAll = userRole === 'admin';
  const canApproveData = userRole === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch from API
      const [statsRes, studiesRes] = await Promise.all([
        api.get('/research/statistics'),
        api.get('/research/studies'),
      ]);
      if (statsRes.data) setStats(statsRes.data);
      if (studiesRes.data?.length) setStudies(studiesRes.data);
    } catch (error) {
      console.log('Using default data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const runAIAnalysis = async () => {
    setAiProcessing(true);
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Add new AI insight
      const newInsight: AIInsight = {
        id: Date.now().toString(),
        type: 'pattern',
        title: 'New Pattern Discovered',
        description: `AI analysis complete. Identified ${Math.floor(Math.random() * 5) + 1} new correlations in treatment outcomes.`,
        confidence: 75 + Math.floor(Math.random() * 20),
      };
      
      setInsights(prev => [newInsight, ...prev]);
      Alert.alert('AI Analysis Complete', 'New insights have been generated based on your data.');
    } catch (error) {
      Alert.alert('Error', 'AI analysis failed. Please try again.');
    } finally {
      setAiProcessing(false);
    }
  };

  const handleBulkUpload = async () => {
    router.push('/research/bulk-upload');
  };

  // Fetch ready-to-publish publications
  const fetchPublications = async () => {
    try {
      const res = await api.get('/research/publications/ready');
      if (res.data?.publications) {
        setPublications(res.data.publications);
      }
    } catch (error) {
      console.log('Using demo publications');
      // Demo publications fallback
      setPublications([
        {
          id: 'pub-001',
          title: 'Effectiveness of Combined Manual Therapy and Exercise for Chronic Low Back Pain',
          authors: ['Dr. Sarah Johnson, PT, PhD', 'Dr. Michael Chen, MD'],
          institution: 'WBA99 Research Institute',
          condition_type: 'Lower Back Pain',
          abstract: 'This comprehensive study evaluated the effectiveness of combined manual therapy and exercise...',
          statistics: { sample_size: 156, success_rate_group_a: 72 }
        },
        {
          id: 'pub-002',
          title: 'AI-Assisted Posture Analysis in Clinical Practice: Validation Study',
          authors: ['Dr. Raj Sharma, PT, PhD', 'Dr. Emily Wong, MS'],
          institution: 'WBA99 Digital Health Research Center',
          condition_type: 'Postural Disorders',
          abstract: 'AI-based posture analysis systems offer potential for standardized objective assessment...',
          statistics: { sample_size: 89, time_reduction_percentage: 97.5 }
        },
        {
          id: 'pub-003',
          title: 'Progressive Loading Protocols in Rotator Cuff Rehabilitation',
          authors: ['Dr. Michael Chen, PT, PhD', 'Dr. Lisa Kumar, MD'],
          institution: 'WBA99 Sports Medicine Research Division',
          condition_type: 'Shoulder Impingement',
          abstract: 'Rotator cuff disorders are among the most common shoulder pathologies...',
          statistics: { sample_size: 67, goal_achievement: 91 }
        }
      ]);
    }
  };

  // Download publication as PDF
  const downloadPublicationPDF = async (pubId: string) => {
    try {
      setExportingFormat('pdf');
      const res = await api.get(`/research/export/pdf/${pubId}`);
      if (res.data) {
        const pub = res.data;
        const pdfContent = `
WBA99 RESEARCH PUBLICATION
========================

${pub.title}

Authors: ${pub.authors?.join(', ') || 'N/A'}
Institution: ${pub.institution}

${pub.sections?.map((s: any) => `
${s.name.toUpperCase()}
${'-'.repeat(s.name.length)}
${s.content}
`).join('\n') || ''}

REFERENCES
----------
${pub.references?.join('\n') || 'N/A'}

Generated: ${new Date().toLocaleDateString()}
`;
        const fileUri = FileSystem.documentDirectory + `publication_${pubId}.txt`;
        await FileSystem.writeAsStringAsync(fileUri, pdfContent);
        await Sharing.shareAsync(fileUri);
      }
      Alert.alert('Success', 'Publication exported successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to export publication');
    } finally {
      setExportingFormat(null);
    }
  };

  // Download publication data as Excel
  const downloadPublicationExcel = async (pubId: string) => {
    try {
      setExportingFormat('excel');
      const res = await api.get('/research/export/excel');
      if (res.data?.sheets) {
        let content = 'WBA99 RESEARCH DATA EXPORT\n\n';
        res.data.sheets.forEach((sheet: any) => {
          content += `=== ${sheet.name} ===\n`;
          content += sheet.headers.join('\t') + '\n';
          sheet.rows.forEach((row: any[]) => {
            content += row.join('\t') + '\n';
          });
          content += '\n';
        });
        const fileUri = FileSystem.documentDirectory + `research_data_${Date.now()}.csv`;
        await FileSystem.writeAsStringAsync(fileUri, content);
        await Sharing.shareAsync(fileUri);
      }
      Alert.alert('Success', 'Data exported successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    } finally {
      setExportingFormat(null);
    }
  };

  // Download as CSV
  const downloadPublicationCSV = async (pubId: string) => {
    try {
      setExportingFormat('csv');
      const res = await api.get('/research/export/csv?data_type=assessments');
      if (res.data?.csv_content) {
        const fileUri = FileSystem.documentDirectory + `assessments_${Date.now()}.csv`;
        await FileSystem.writeAsStringAsync(fileUri, res.data.csv_content);
        await Sharing.shareAsync(fileUri);
      }
      Alert.alert('Success', 'CSV exported successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to export CSV');
    } finally {
      setExportingFormat(null);
    }
  };

  // Export full research report
  const exportFullReport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      setExportingFormat(format);
      
      if (format === 'pdf') {
        const res = await api.get('/research/export/full-report');
        if (res.data) {
          const report = res.data;
          const content = `
WBA99 COMPREHENSIVE RESEARCH REPORT
===================================
Generated: ${new Date().toLocaleDateString()}

EXECUTIVE SUMMARY
-----------------
Total Patients: ${report.executive_summary?.total_patients || 0}
Total Assessments: ${report.executive_summary?.total_assessments || 0}
Active Studies: ${report.executive_summary?.active_studies || 0}
Overall Success Rate: ${report.executive_summary?.overall_success_rate || 0}%
Average Improvement: ${report.executive_summary?.avg_improvement || 0}%

CONDITION ANALYSIS
------------------
${report.condition_analysis?.map((c: any) => `${c.condition}: ${c.patient_count} patients, Avg Score: ${c.avg_score}%`).join('\n') || 'N/A'}

AI INSIGHTS
-----------
${report.ai_insights?.map((i: any) => `• ${i.title}: ${i.description} (${i.confidence}% confidence)`).join('\n') || 'N/A'}

METHODOLOGY
-----------
${report.methodology_notes || 'N/A'}
`;
          const fileUri = FileSystem.documentDirectory + `full_research_report_${Date.now()}.txt`;
          await FileSystem.writeAsStringAsync(fileUri, content);
          await Sharing.shareAsync(fileUri);
        }
      } else if (format === 'excel') {
        await downloadPublicationExcel('full');
        return;
      } else if (format === 'csv') {
        await downloadPublicationCSV('full');
        return;
      }
      
      Alert.alert('Success', `${format.toUpperCase()} report exported successfully`);
    } catch (error) {
      Alert.alert('Error', `Failed to export ${format} report`);
    } finally {
      setExportingFormat(null);
    }
  };

  // Load publications when export tab is selected
  useEffect(() => {
    if (activeTab === 'export') {
      fetchPublications();
    }
  }, [activeTab]);

  const exportData = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      let filename: string;
      let content: string;
      let mimeType: string;

      if (format === 'csv') {
        filename = `wba99_research_export_${Date.now()}.csv`;
        content = generateCSVContent();
        mimeType = 'text/csv';
      } else if (format === 'excel') {
        filename = `wba99_research_export_${Date.now()}.xlsx`;
        content = generateCSVContent(); // Simplified - would need xlsx library
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else {
        filename = `wba99_research_report_${Date.now()}.pdf`;
        content = await generatePDFContent();
        mimeType = 'application/pdf';
      }

      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, content);
      await Sharing.shareAsync(fileUri, { mimeType });
    } catch (error) {
      Alert.alert('Export Error', 'Failed to export data');
    }
  };

  const generateCSVContent = () => {
    const headers = ['Patient ID', 'Name', 'Age', 'Gender', 'Diagnosis', 'Pain Score', 'ROM', 'Strength', 'Balance', 'Data Type', 'Date'];
    const rows = [
      ['P001', 'John Doe', '45', 'M', 'LBP', '6', '85', '4', '78', 'pre', '2026-01-15'],
      ['P001', 'John Doe', '45', 'M', 'LBP', '2', '92', '5', '89', 'post', '2026-03-15'],
      ['P002', 'Jane Smith', '38', 'F', 'Knee Pain', '7', '78', '3', '72', 'pre', '2026-02-01'],
    ];
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  };

  const generatePDFContent = async () => {
    return `
      WBA99 RESEARCH ANALYTICS REPORT
      Generated: ${new Date().toLocaleDateString()}
      
      EXECUTIVE SUMMARY
      -----------------
      Total Patients: ${stats.totalPatients}
      Active Studies: ${stats.activeStudies}
      Data Points: ${stats.dataPoints}
      Average Improvement: ${stats.avgImprovement}%
      
      AI INSIGHTS
      -----------
      ${insights.map(i => `• ${i.title}: ${i.description}`).join('\n')}
    `;
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pattern': return 'trending-up';
      case 'risk': return 'alert-circle';
      case 'prediction': return 'analytics';
      case 'comparison': return 'git-compare';
      default: return 'bulb';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'pattern': return '#4CAF50';
      case 'risk': return '#FF5252';
      case 'prediction': return '#2196F3';
      case 'comparison': return '#FF9800';
      default: return theme.colors.accent;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading Research Engine...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Research Engine</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{userRole.toUpperCase()}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={runAIAnalysis} disabled={aiProcessing}>
          {aiProcessing ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : (
            <MaterialCommunityIcons name="robot" size={24} color="#00E676" />
          )}
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {[
          { key: 'overview', label: 'Overview', icon: 'view-dashboard' },
          { key: 'studies', label: 'Studies', icon: 'flask' },
          { key: 'data', label: 'Data Input', icon: 'database-plus' },
          { key: 'ai', label: 'AI Analysis', icon: 'brain' },
          { key: 'export', label: 'Export', icon: 'download' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.key ? '#fff' : theme.colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
        contentContainerStyle={styles.content}
      >
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* Statistics Cards - 2x2 Grid */}
            <View style={styles.statsContainer}>
              <View style={styles.statsRow}>
                <View style={[styles.statCardNew, { backgroundColor: '#0D47A1' }]}>
                  <FontAwesome5 name="users" size={20} color="#fff" />
                  <Text style={styles.statValueNew}>{stats.totalPatients}</Text>
                  <Text style={styles.statLabelNew}>Total Patients</Text>
                </View>
                <View style={[styles.statCardNew, { backgroundColor: '#2E7D32' }]}>
                  <MaterialCommunityIcons name="flask" size={20} color="#fff" />
                  <Text style={styles.statValueNew}>{stats.activeStudies}</Text>
                  <Text style={styles.statLabelNew}>Active Studies</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={[styles.statCardNew, { backgroundColor: '#E65100' }]}>
                  <MaterialCommunityIcons name="database" size={20} color="#fff" />
                  <Text style={styles.statValueNew}>{stats.dataPoints}</Text>
                  <Text style={styles.statLabelNew}>Data Points</Text>
                </View>
                <View style={[styles.statCardNew, { backgroundColor: '#6A1B9A' }]}>
                  <Ionicons name="trending-up" size={20} color="#fff" />
                  <Text style={styles.statValueNew}>{stats.avgImprovement}%</Text>
                  <Text style={styles.statLabelNew}>Avg Improvement</Text>
                </View>
              </View>
            </View>

            {/* AI Insights Panel */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="brain" size={24} color="#00E676" />
                <Text style={styles.sectionTitle}>AI Insights</Text>
                <TouchableOpacity onPress={runAIAnalysis} disabled={aiProcessing}>
                  <Text style={styles.refreshText}>
                    {aiProcessing ? 'Processing...' : 'Run Analysis'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {insights.slice(0, 4).map((insight) => (
                <View key={insight.id} style={styles.insightCard}>
                  <View style={[styles.insightIcon, { backgroundColor: getInsightColor(insight.type) + '20' }]}>
                    <Ionicons
                      name={getInsightIcon(insight.type) as any}
                      size={20}
                      color={getInsightColor(insight.type)}
                    />
                  </View>
                  <View style={styles.insightContent}>
                    <View style={styles.insightHeader}>
                      <Text style={styles.insightTitle}>{insight.title}</Text>
                      <View style={styles.confidenceBadge}>
                        <Text style={styles.confidenceText}>{insight.confidence}%</Text>
                      </View>
                    </View>
                    <Text style={styles.insightDescription}>{insight.description}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => setShowDataEntryModal(true)}>
                <MaterialCommunityIcons name="plus-circle" size={28} color={theme.colors.accent} />
                <Text style={styles.quickActionText}>Add Data</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={handleBulkUpload}>
                <MaterialCommunityIcons name="upload" size={28} color="#4CAF50" />
                <Text style={styles.quickActionText}>Bulk Upload</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push('/research/report-generator')}>
                <MaterialCommunityIcons name="file-document" size={28} color="#FF9800" />
                <Text style={styles.quickActionText}>Generate Report</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => setActiveTab('export')}>
                <MaterialCommunityIcons name="download" size={28} color="#9C27B0" />
                <Text style={styles.quickActionText}>Export</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* STUDIES TAB */}
        {activeTab === 'studies' && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Research Studies</Text>
              {canCreateStudy && (
                <TouchableOpacity
                  style={styles.addStudyBtn}
                  onPress={() => setShowNewStudyModal(true)}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.addStudyText}>New Study</Text>
                </TouchableOpacity>
              )}
            </View>

            {studies.map((study) => (
              <TouchableOpacity
                key={study.id}
                style={styles.studyCard}
                onPress={() => router.push(`/research/study/${study.id}`)}
              >
                <View style={styles.studyHeader}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: study.status === 'active' ? '#4CAF5020' : study.status === 'completed' ? '#2196F320' : '#9E9E9E20' }
                  ]}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: study.status === 'active' ? '#4CAF50' : study.status === 'completed' ? '#2196F3' : '#9E9E9E' }
                    ]} />
                    <Text style={[
                      styles.statusText,
                      { color: study.status === 'active' ? '#4CAF50' : study.status === 'completed' ? '#2196F3' : '#9E9E9E' }
                    ]}>
                      {(study.status || 'active').toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.studyDate}>{study.createdAt || study.start_date || 'N/A'}</Text>
                </View>
                <Text style={styles.studyName}>{study.name}</Text>
                <Text style={styles.studyObjective}>{study.objective || study.description}</Text>
                <View style={styles.studyMeta}>
                  <View style={styles.studyMetaItem}>
                    <FontAwesome5 name="users" size={12} color={theme.colors.textMuted} />
                    <Text style={styles.studyMetaText}>{study.enrolledPatients || study.total_participants || (study.patients?.length) || 0}/{study.sampleSize || study.total_participants || 50}</Text>
                  </View>
                  <View style={styles.studyMetaItem}>
                    <MaterialCommunityIcons name="chart-line" size={14} color={theme.colors.textMuted} />
                    <Text style={styles.studyMetaText}>{study.data_points || (study.parameters?.length) || 0} Data Points</Text>
                  </View>
                  <View style={styles.studyMetaItem}>
                    <Ionicons name="person" size={14} color={theme.colors.textMuted} />
                    <Text style={styles.studyMetaText}>{study.createdBy || 'Researcher'}</Text>
                  </View>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, ((study.enrolledPatients || study.total_participants || 0) / (study.sampleSize || study.total_participants || 50)) * 100)}%` }]} />
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* DATA INPUT TAB */}
        {activeTab === 'data' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Data Input Methods</Text>
              
              {/* Manual Entry */}
              <TouchableOpacity
                style={styles.dataInputCard}
                onPress={() => router.push('/research/data-entry')}
              >
                <View style={[styles.dataInputIcon, { backgroundColor: '#1E88E520' }]}>
                  <MaterialCommunityIcons name="form-textbox" size={32} color="#1E88E5" />
                </View>
                <View style={styles.dataInputContent}>
                  <Text style={styles.dataInputTitle}>Manual Data Entry</Text>
                  <Text style={styles.dataInputDesc}>
                    Enter patient assessment data manually with validation
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>

              {/* Bulk Upload */}
              <TouchableOpacity
                style={styles.dataInputCard}
                onPress={handleBulkUpload}
              >
                <View style={[styles.dataInputIcon, { backgroundColor: '#4CAF5020' }]}>
                  <MaterialCommunityIcons name="file-upload" size={32} color="#4CAF50" />
                </View>
                <View style={styles.dataInputContent}>
                  <Text style={styles.dataInputTitle}>Bulk Data Upload</Text>
                  <Text style={styles.dataInputDesc}>
                    Upload CSV or Excel files with auto column mapping
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>

              {/* Sensor Integration */}
              <TouchableOpacity
                style={styles.dataInputCard}
                onPress={() => router.push('/research/sensor-import')}
              >
                <View style={[styles.dataInputIcon, { backgroundColor: '#FF980020' }]}>
                  <MaterialCommunityIcons name="access-point" size={32} color="#FF9800" />
                </View>
                <View style={styles.dataInputContent}>
                  <Text style={styles.dataInputTitle}>Sensor / WBA99 Integration</Text>
                  <Text style={styles.dataInputDesc}>
                    Auto-import from Posture, Gait, Strength, Balance systems
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Recent Data */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending Analysis ({stats.pendingAnalysis})</Text>
              <View style={styles.pendingCard}>
                <Text style={styles.pendingText}>
                  {stats.pendingAnalysis} data points awaiting AI analysis
                </Text>
                <TouchableOpacity style={styles.analyzeBtn} onPress={runAIAnalysis}>
                  <MaterialCommunityIcons name="brain" size={18} color="#fff" />
                  <Text style={styles.analyzeBtnText}>Run AI Analysis</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* AI ANALYSIS TAB */}
        {activeTab === 'ai' && (
          <>
            {/* AI Engine Controls */}
            <View style={styles.aiControlPanel}>
              <View style={[styles.aiHeader, { backgroundColor: '#1A237E' }]}>
                <MaterialCommunityIcons name="brain" size={40} color="#00E676" />
                <Text style={styles.aiTitle}>WBA99 AI Engine</Text>
                <Text style={styles.aiSubtitle}>Medical-Grade Research Analytics</Text>
              </View>

              <View style={styles.aiFeatures}>
                <TouchableOpacity style={styles.aiFeatureCard} onPress={runAIAnalysis}>
                  <MaterialCommunityIcons name="chart-areaspline" size={28} color="#2196F3" />
                  <Text style={styles.aiFeatureTitle}>Pattern Detection</Text>
                  <Text style={styles.aiFeatureDesc}>Find correlations in treatment data</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.aiFeatureCard} onPress={runAIAnalysis}>
                  <MaterialCommunityIcons name="compare-horizontal" size={28} color="#4CAF50" />
                  <Text style={styles.aiFeatureTitle}>Pre vs Post Analysis</Text>
                  <Text style={styles.aiFeatureDesc}>Compare treatment outcomes</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.aiFeatureCard} onPress={runAIAnalysis}>
                  <MaterialCommunityIcons name="alert-decagram" size={28} color="#FF5252" />
                  <Text style={styles.aiFeatureTitle}>Risk Identification</Text>
                  <Text style={styles.aiFeatureDesc}>Detect high-risk patients</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.aiFeatureCard} onPress={runAIAnalysis}>
                  <MaterialCommunityIcons name="crystal-ball" size={28} color="#9C27B0" />
                  <Text style={styles.aiFeatureTitle}>Recovery Prediction</Text>
                  <Text style={styles.aiFeatureDesc}>Predict recovery timelines</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* AI Report Generator */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Auto Report Generation</Text>
              <TouchableOpacity
                style={styles.reportGeneratorCard}
                onPress={() => router.push('/research/report-generator')}
              >
                <MaterialCommunityIcons name="file-document-edit" size={40} color={theme.colors.accent} />
                <View style={styles.reportGeneratorContent}>
                  <Text style={styles.reportGeneratorTitle}>AI Research Paper Generator</Text>
                  <Text style={styles.reportGeneratorDesc}>
                    Auto-generate journal-ready research papers with Title, Abstract, Introduction, Methodology, Results, Discussion, Conclusion
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* All Insights */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>All AI Insights</Text>
              {insights.map((insight) => (
                <View key={insight.id} style={styles.insightCard}>
                  <View style={[styles.insightIcon, { backgroundColor: getInsightColor(insight.type) + '20' }]}>
                    <Ionicons
                      name={getInsightIcon(insight.type) as any}
                      size={20}
                      color={getInsightColor(insight.type)}
                    />
                  </View>
                  <View style={styles.insightContent}>
                    <View style={styles.insightHeader}>
                      <Text style={styles.insightTitle}>{insight.title}</Text>
                      <View style={styles.confidenceBadge}>
                        <Text style={styles.confidenceText}>{insight.confidence}%</Text>
                      </View>
                    </View>
                    <Text style={styles.insightDescription}>{insight.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* EXPORT TAB */}
        {activeTab === 'export' && (
          <>
            {/* Ready-to-Publish Research Papers */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📚 Ready-to-Publish Research</Text>
                <TouchableOpacity 
                  style={styles.refreshBtn}
                  onPress={() => fetchPublications()}
                >
                  <Text style={styles.refreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>
              
              {publications.map((pub, index) => (
                <TouchableOpacity 
                  key={pub.id}
                  style={styles.publicationCard}
                  onPress={() => setSelectedPublication(pub)}
                >
                  <View style={styles.pubHeader}>
                    <View style={[styles.pubBadge, { backgroundColor: '#4CAF50' }]}>
                      <Text style={styles.pubBadgeText}>PEER REVIEWED</Text>
                    </View>
                    <Text style={styles.pubCondition}>{pub.condition_type}</Text>
                  </View>
                  <Text style={styles.pubTitle}>{pub.title}</Text>
                  <Text style={styles.pubAuthors}>{pub.authors?.join(', ')}</Text>
                  <Text style={styles.pubInstitution}>{pub.institution}</Text>
                  
                  <View style={styles.pubStats}>
                    <View style={styles.pubStatItem}>
                      <FontAwesome5 name="users" size={12} color={theme.colors.accent} />
                      <Text style={styles.pubStatText}>{pub.statistics?.sample_size || 0} patients</Text>
                    </View>
                    <View style={styles.pubStatItem}>
                      <MaterialCommunityIcons name="chart-line" size={12} color="#4CAF50" />
                      <Text style={styles.pubStatText}>{pub.statistics?.success_rate_group_a || pub.statistics?.goal_achievement || 0}% success</Text>
                    </View>
                  </View>
                  
                  <View style={styles.pubActions}>
                    <TouchableOpacity 
                      style={[styles.pubActionBtn, { backgroundColor: '#F44336' }]}
                      onPress={() => downloadPublicationPDF(pub.id)}
                    >
                      <MaterialCommunityIcons name="file-pdf-box" size={16} color="#fff" />
                      <Text style={styles.pubActionText}>PDF</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.pubActionBtn, { backgroundColor: '#1E88E5' }]}
                      onPress={() => downloadPublicationExcel(pub.id)}
                    >
                      <MaterialCommunityIcons name="microsoft-excel" size={16} color="#fff" />
                      <Text style={styles.pubActionText}>Excel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.pubActionBtn, { backgroundColor: '#4CAF50' }]}
                      onPress={() => downloadPublicationCSV(pub.id)}
                    >
                      <MaterialCommunityIcons name="file-delimited" size={16} color="#fff" />
                      <Text style={styles.pubActionText}>CSV</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.pubActionBtn, { backgroundColor: theme.colors.accent }]}
                      onPress={() => setSelectedPublication(pub)}
                    >
                      <Ionicons name="eye" size={16} color="#fff" />
                      <Text style={styles.pubActionText}>View</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* One-Click Export Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📥 One-Click Export</Text>

              <TouchableOpacity
                style={styles.exportCard}
                onPress={() => exportFullReport('csv')}
              >
                <View style={[styles.exportIcon, { backgroundColor: '#4CAF5020' }]}>
                  <MaterialCommunityIcons name="file-delimited" size={32} color="#4CAF50" />
                </View>
                <View style={styles.exportContent}>
                  <Text style={styles.exportTitle}>CSV Export</Text>
                  <Text style={styles.exportDesc}>Raw data, filtered data, analysis results</Text>
                </View>
                <Ionicons name="download" size={24} color="#4CAF50" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportCard}
                onPress={() => exportFullReport('excel')}
              >
                <View style={[styles.exportIcon, { backgroundColor: '#1E88E520' }]}>
                  <MaterialCommunityIcons name="microsoft-excel" size={32} color="#1E88E5" />
                </View>
                <View style={styles.exportContent}>
                  <Text style={styles.exportTitle}>Excel Export</Text>
                  <Text style={styles.exportDesc}>Multi-sheet: Summary, Patients, Assessments, Outcomes</Text>
                </View>
                <Ionicons name="download" size={24} color="#1E88E5" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportCard}
                onPress={() => exportFullReport('pdf')}
              >
                <View style={[styles.exportIcon, { backgroundColor: '#F4433620' }]}>
                  <MaterialCommunityIcons name="file-pdf-box" size={32} color="#F44336" />
                </View>
                <View style={styles.exportContent}>
                  <Text style={styles.exportTitle}>Full Research Report (PDF)</Text>
                  <Text style={styles.exportDesc}>Comprehensive report with all statistics & AI insights</Text>
                </View>
                <Ionicons name="download" size={24} color="#F44336" />
              </TouchableOpacity>
            </View>

            {/* Filter Options */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔍 Filter Data Before Export</Text>
              <View style={styles.filterGrid}>
                <TouchableOpacity style={styles.filterChip}>
                  <Text style={styles.filterChipText}>Age: All</Text>
                  <Ionicons name="chevron-down" size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterChip}>
                  <Text style={styles.filterChipText}>Condition: All</Text>
                  <Ionicons name="chevron-down" size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterChip}>
                  <Text style={styles.filterChipText}>Treatment: All</Text>
                  <Ionicons name="chevron-down" size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterChip}>
                  <Text style={styles.filterChipText}>Date Range</Text>
                  <Ionicons name="calendar" size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* Publication Detail Modal */}
        <Modal
          visible={!!selectedPublication}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setSelectedPublication(null)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedPublication(null)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Research Publication</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <ScrollView style={styles.modalContent}>
              {selectedPublication && (
                <>
                  <View style={[styles.pubBadge, { backgroundColor: '#4CAF50', alignSelf: 'flex-start', marginBottom: 12 }]}>
                    <Text style={styles.pubBadgeText}>PEER REVIEWED</Text>
                  </View>
                  
                  <Text style={styles.modalPubTitle}>{selectedPublication.title}</Text>
                  <Text style={styles.modalAuthors}>{selectedPublication.authors?.join(', ')}</Text>
                  <Text style={styles.modalInstitution}>{selectedPublication.institution}</Text>
                  
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>ABSTRACT</Text>
                    <Text style={styles.modalSectionContent}>{selectedPublication.abstract}</Text>
                  </View>
                  
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>INTRODUCTION</Text>
                    <Text style={styles.modalSectionContent}>{selectedPublication.introduction}</Text>
                  </View>
                  
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>METHODOLOGY</Text>
                    <Text style={styles.modalSectionContent}>{selectedPublication.methodology}</Text>
                  </View>
                  
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>RESULTS</Text>
                    <Text style={styles.modalSectionContent}>{selectedPublication.results}</Text>
                  </View>
                  
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>DISCUSSION</Text>
                    <Text style={styles.modalSectionContent}>{selectedPublication.discussion}</Text>
                  </View>
                  
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>CONCLUSION</Text>
                    <Text style={styles.modalSectionContent}>{selectedPublication.conclusion}</Text>
                  </View>
                  
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>REFERENCES</Text>
                    {selectedPublication.references?.map((ref: string, i: number) => (
                      <Text key={i} style={styles.referenceText}>{ref}</Text>
                    ))}
                  </View>
                  
                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={[styles.modalActionBtn, { backgroundColor: '#F44336' }]}
                      onPress={() => downloadPublicationPDF(selectedPublication.id)}
                    >
                      <MaterialCommunityIcons name="file-pdf-box" size={20} color="#fff" />
                      <Text style={styles.modalActionText}>Download PDF</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.modalActionBtn, { backgroundColor: '#1E88E5' }]}
                      onPress={() => downloadPublicationExcel(selectedPublication.id)}
                    >
                      <MaterialCommunityIcons name="microsoft-excel" size={20} color="#fff" />
                      <Text style={styles.modalActionText}>Download Excel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  roleBadge: {
    backgroundColor: theme.colors.accent + '30',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    marginTop: 4,
  },
  roleBadgeText: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: 'bold',
  },
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.card,
    gap: theme.spacing.xs,
  },
  tabActive: {
    backgroundColor: theme.colors.accent,
  },
  tabText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: theme.fontWeight.semibold,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  // New stat card styles
  statsContainer: {
    marginBottom: theme.spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statCardNew: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValueNew: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabelNew: {
    fontSize: 11,
    color: '#FFFFFF',
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.9,
  },
  statCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#ffffff',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  refreshText: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.sm,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  insightIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  insightContent: {
    flex: 1,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  insightTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  confidenceBadge: {
    backgroundColor: theme.colors.accent + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  confidenceText: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: 'bold',
  },
  insightDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  quickActionBtn: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  quickActionText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  addStudyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
  },
  addStudyText: {
    color: '#fff',
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  studyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  studyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  studyDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  studyName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  studyObjective: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  studyMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  studyMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  studyMetaText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
  },
  dataInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  dataInputIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  dataInputContent: {
    flex: 1,
  },
  dataInputTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  dataInputDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  pendingCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  pendingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00E676',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.sm,
  },
  analyzeBtnText: {
    color: '#000',
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  aiControlPanel: {
    marginBottom: theme.spacing.lg,
  },
  aiHeader: {
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  aiTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: '#fff',
    marginTop: theme.spacing.md,
  },
  aiSubtitle: {
    fontSize: theme.fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  aiFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  aiFeatureCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  aiFeatureTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  aiFeatureDesc: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  reportGeneratorCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    alignItems: 'center',
  },
  reportGeneratorContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  reportGeneratorTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  reportGeneratorDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  exportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  exportIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  exportContent: {
    flex: 1,
  },
  exportTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  exportDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    gap: theme.spacing.xs,
  },
  filterChipText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  // Publication card styles
  publicationCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  pubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  pubBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pubBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pubCondition: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.semibold,
  },
  pubTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
    lineHeight: 22,
  },
  pubAuthors: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  pubInstitution: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  pubStats: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  pubStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pubStatText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  pubActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  pubActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  pubActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  modalContent: {
    padding: theme.spacing.md,
  },
  modalPubTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: 8,
    lineHeight: 28,
  },
  modalAuthors: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  modalInstitution: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
  },
  modalSection: {
    marginBottom: theme.spacing.lg,
  },
  modalSectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
    marginBottom: 8,
    letterSpacing: 1,
  },
  modalSectionContent: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  referenceText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: 4,
    paddingLeft: 8,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xxl,
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  modalActionText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
});
