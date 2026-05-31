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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';
import { generatePaymentSectionHTML } from '../../src/utils/pdfPaymentSection';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ResearchStats {
  total_patients: number;
  total_assessments: number;
  assessment_breakdown: {
    posture: number;
    walking: number;
    running: number;
    msk: number;
    fms: number;
    rom: number;
  };
  condition_stats: {
    condition: string;
    count: number;
    avg_improvement: number;
  }[];
  monthly_data: {
    month: string;
    assessments: number;
    patients: number;
  }[];
  outcomes: {
    improved: number;
    stable: number;
    needs_attention: number;
  };
}

interface PatientResearchData {
  id: string;
  name: string;
  total_assessments: number;
  conditions: string[];
  improvement_rate: number;
  last_assessment: string;
}

export default function PhysioResearchDashboard() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  const [loading, setLoading] = useState(false);  // Start with false to show empty state
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<ResearchStats | null>(null);
  const [patientData, setPatientData] = useState<PatientResearchData[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const fetchResearchData = useCallback(async () => {
    if (!currentUser) {
      // Set default empty stats for non-logged-in users
      setStats({
        total_patients: 0,
        total_assessments: 0,
        assessment_breakdown: {
          posture: 0,
          walking: 0,
          running: 0,
          msk: 0,
          fms: 0,
          rom: 0,
        },
        condition_stats: [],
        monthly_data: [],
        outcomes: { improved: 0, stable: 0, needs_attention: 0 },
      });
      setLoading(false);
      return;
    }
    
    try {
      // Fetch assessments
      const assessmentsRes = await api.get(`/assessments?physio_id=${currentUser.id}`);
      const assessments = assessmentsRes.data || [];
      
      // Fetch patients
      const patientsRes = await api.get(`/users/physio/${currentUser.id}/patients`);
      const patients = patientsRes.data || [];
      
      // Calculate stats
      const assessmentBreakdown = {
        posture: assessments.filter((a: any) => a.assessment_type === 'posture').length,
        walking: assessments.filter((a: any) => a.assessment_type === 'walking').length,
        running: assessments.filter((a: any) => a.assessment_type === 'running').length,
        msk: assessments.filter((a: any) => a.assessment_type === 'msk').length,
        fms: assessments.filter((a: any) => a.assessment_type === 'fms').length,
        rom: assessments.filter((a: any) => a.assessment_type === 'rom').length,
      };

      // Group by condition
      const conditionMap: Record<string, { count: number; scores: number[] }> = {};
      assessments.forEach((a: any) => {
        const condition = a.assessment_type || 'general';
        if (!conditionMap[condition]) {
          conditionMap[condition] = { count: 0, scores: [] };
        }
        conditionMap[condition].count++;
        if (a.percentage) {
          conditionMap[condition].scores.push(a.percentage);
        }
      });

      const conditionStats = Object.entries(conditionMap).map(([condition, data]) => ({
        condition: condition.charAt(0).toUpperCase() + condition.slice(1),
        count: data.count,
        avg_improvement: data.scores.length > 0 
          ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) 
          : 0,
      }));

      // Calculate outcomes based on scores
      const improved = assessments.filter((a: any) => a.percentage >= 70).length;
      const stable = assessments.filter((a: any) => a.percentage >= 40 && a.percentage < 70).length;
      const needsAttention = assessments.filter((a: any) => a.percentage < 40).length;

      // Generate monthly data (last 6 months)
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = date.toLocaleDateString('en-US', { month: 'short' });
        const monthAssessments = assessments.filter((a: any) => {
          const aDate = new Date(a.created_at);
          return aDate.getMonth() === date.getMonth() && aDate.getFullYear() === date.getFullYear();
        });
        monthlyData.push({
          month: monthStr,
          assessments: monthAssessments.length,
          patients: new Set(monthAssessments.map((a: any) => a.patient_id)).size,
        });
      }

      // Patient research data
      const patientResearch = patients.map((p: any) => {
        const patientAssessments = assessments.filter((a: any) => a.patient_id === p.id);
        const conditions = [...new Set(patientAssessments.map((a: any) => a.assessment_type))];
        const avgScore = patientAssessments.length > 0
          ? patientAssessments.reduce((sum: number, a: any) => sum + (a.percentage || 0), 0) / patientAssessments.length
          : 0;
        
        return {
          id: p.id,
          name: p.name,
          total_assessments: patientAssessments.length,
          conditions,
          improvement_rate: Math.round(avgScore),
          last_assessment: patientAssessments[0]?.created_at || 'N/A',
        };
      });

      setStats({
        total_patients: patients.length,
        total_assessments: assessments.length,
        assessment_breakdown: assessmentBreakdown,
        condition_stats: conditionStats,
        monthly_data: monthlyData,
        outcomes: { improved, stable, needs_attention: needsAttention },
      });

      setPatientData(patientResearch);
    } catch (error) {
      console.error('Error fetching research data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchResearchData();
  }, [fetchResearchData]);

  // Fallback timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [loading]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchResearchData();
  };

  const generateResearchReport = async () => {
    if (!stats) return;
    
    setGeneratingReport(true);
    try {
      const currentDate = new Date().toLocaleDateString('en-IN', { 
        day: 'numeric', month: 'long', year: 'numeric' 
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #673AB7; padding-bottom: 15px; margin-bottom: 20px; }
            .logo { font-size: 28px; font-weight: bold; color: #673AB7; }
            .title { text-align: center; background: linear-gradient(135deg, #673AB7, #512DA8); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
            .stat-card { background: #f8f9fa; border-radius: 10px; padding: 15px; text-align: center; }
            .stat-value { font-size: 28px; font-weight: bold; color: #673AB7; }
            .stat-label { font-size: 12px; color: #666; }
            .section { background: #f8f9fa; border-radius: 10px; padding: 15px; margin-bottom: 15px; }
            .section-title { font-size: 16px; font-weight: bold; color: #673AB7; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #673AB7; color: white; }
            .chart-bar { height: 20px; background: linear-gradient(90deg, #673AB7, #9C27B0); border-radius: 4px; }
            .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">WBA99 Research</div>
            <div style="text-align: right; font-size: 12px; color: #666;">
              <p><strong>Researcher:</strong> ${currentUser?.name}</p>
              <p><strong>Date:</strong> ${currentDate}</p>
            </div>
          </div>
          
          <div class="title">
            <h1 style="margin: 0; font-size: 24px;">📊 Clinical Research Report</h1>
            <p style="margin: 5px 0 0;">Comprehensive Patient Data & Outcomes Analysis</p>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${stats.total_patients}</div>
              <div class="stat-label">Total Patients</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${stats.total_assessments}</div>
              <div class="stat-label">Total Assessments</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${stats.outcomes.improved}</div>
              <div class="stat-label">Improved Cases</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${Math.round((stats.outcomes.improved / Math.max(stats.total_assessments, 1)) * 100)}%</div>
              <div class="stat-label">Success Rate</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">📈 Assessment Distribution</div>
            <table>
              <thead>
                <tr>
                  <th>Assessment Type</th>
                  <th>Count</th>
                  <th>Distribution</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(stats.assessment_breakdown).map(([type, count]) => `
                  <tr>
                    <td>${type.charAt(0).toUpperCase() + type.slice(1)}</td>
                    <td>${count}</td>
                    <td>
                      <div class="chart-bar" style="width: ${Math.max(((count as number) / Math.max(stats.total_assessments, 1)) * 100, 5)}%;"></div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">🎯 Treatment Outcomes</div>
            <table>
              <thead>
                <tr>
                  <th>Outcome Category</th>
                  <th>Count</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="color: #4CAF50;">✅ Improved (>70%)</td>
                  <td>${stats.outcomes.improved}</td>
                  <td>${Math.round((stats.outcomes.improved / Math.max(stats.total_assessments, 1)) * 100)}%</td>
                </tr>
                <tr>
                  <td style="color: #FF9800;">🔄 Stable (40-70%)</td>
                  <td>${stats.outcomes.stable}</td>
                  <td>${Math.round((stats.outcomes.stable / Math.max(stats.total_assessments, 1)) * 100)}%</td>
                </tr>
                <tr>
                  <td style="color: #f44336;">⚠️ Needs Attention (<40%)</td>
                  <td>${stats.outcomes.needs_attention}</td>
                  <td>${Math.round((stats.outcomes.needs_attention / Math.max(stats.total_assessments, 1)) * 100)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">📅 Monthly Activity (Last 6 Months)</div>
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Assessments</th>
                  <th>Unique Patients</th>
                </tr>
              </thead>
              <tbody>
                ${stats.monthly_data.map(m => `
                  <tr>
                    <td>${m.month}</td>
                    <td>${m.assessments}</td>
                    <td>${m.patients}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">👥 Patient Overview (Top 10)</div>
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Assessments</th>
                  <th>Avg Score</th>
                  <th>Conditions</th>
                </tr>
              </thead>
              <tbody>
                ${patientData.slice(0, 10).map(p => `
                  <tr>
                    <td>${p.name}</td>
                    <td>${p.total_assessments}</td>
                    <td>${p.improvement_rate}%</td>
                    <td>${p.conditions.join(', ') || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          ${generatePaymentSectionHTML('#673AB7')}

          <div class="footer">
            <p>Generated by WBA99 Research Analytics | © 2025 WBA99 Expert Analysis India</p>
            <p><em>This report is for research and clinical documentation purposes.</em></p>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch (error) {
      console.error('Report generation error:', error);
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading research data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Research Dashboard</Text>
          <TouchableOpacity onPress={generateResearchReport} disabled={generatingReport}>
            {generatingReport ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : (
              <Ionicons name="download" size={24} color={theme.colors.accent} />
            )}
          </TouchableOpacity>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#673AB7' }]}>
            <Text style={styles.statValue}>{stats?.total_patients || 0}</Text>
            <Text style={styles.statLabel}>Total Patients</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#2196F3' }]}>
            <Text style={styles.statValue}>{stats?.total_assessments || 0}</Text>
            <Text style={styles.statLabel}>Assessments</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#4CAF50' }]}>
            <Text style={styles.statValue}>{stats?.outcomes.improved || 0}</Text>
            <Text style={styles.statLabel}>Improved</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FF9800' }]}>
            <Text style={styles.statValue}>
              {stats ? Math.round((stats.outcomes.improved / Math.max(stats.total_assessments, 1)) * 100) : 0}%
            </Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
        </View>

        {/* Assessment Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Assessment Distribution</Text>
          {stats && Object.entries(stats.assessment_breakdown).map(([type, count]) => (
            <View key={type} style={styles.distributionItem}>
              <View style={styles.distributionLabel}>
                <Text style={styles.distributionType}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
                <Text style={styles.distributionCount}>{count}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${Math.max(((count as number) / Math.max(stats.total_assessments, 1)) * 100, 5)}%` }
                  ]} 
                />
              </View>
            </View>
          ))}
        </View>

        {/* Treatment Outcomes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Treatment Outcomes</Text>
          <View style={styles.outcomesGrid}>
            <View style={[styles.outcomeCard, { borderColor: '#4CAF50' }]}>
              <Ionicons name="trending-up" size={24} color="#4CAF50" />
              <Text style={[styles.outcomeValue, { color: '#4CAF50' }]}>{stats?.outcomes.improved || 0}</Text>
              <Text style={styles.outcomeLabel}>Improved</Text>
            </View>
            <View style={[styles.outcomeCard, { borderColor: '#FF9800' }]}>
              <Ionicons name="remove" size={24} color="#FF9800" />
              <Text style={[styles.outcomeValue, { color: '#FF9800' }]}>{stats?.outcomes.stable || 0}</Text>
              <Text style={styles.outcomeLabel}>Stable</Text>
            </View>
            <View style={[styles.outcomeCard, { borderColor: '#f44336' }]}>
              <Ionicons name="alert-circle" size={24} color="#f44336" />
              <Text style={[styles.outcomeValue, { color: '#f44336' }]}>{stats?.outcomes.needs_attention || 0}</Text>
              <Text style={styles.outcomeLabel}>Needs Attention</Text>
            </View>
          </View>
        </View>

        {/* Monthly Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Monthly Activity</Text>
          <View style={styles.monthlyChart}>
            {stats?.monthly_data.map((m, index) => (
              <View key={index} style={styles.monthItem}>
                <View style={styles.barContainer}>
                  <View 
                    style={[
                      styles.monthBar, 
                      { height: Math.max(m.assessments * 10, 10) }
                    ]} 
                  />
                </View>
                <Text style={styles.monthLabel}>{m.month}</Text>
                <Text style={styles.monthValue}>{m.assessments}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Patient Research Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Patient Research Data</Text>
          {patientData.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-search" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No patient data available</Text>
            </View>
          ) : (
            patientData.slice(0, 10).map((patient) => (
              <View key={patient.id} style={styles.patientCard}>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{patient.name}</Text>
                  <Text style={styles.patientMeta}>
                    {patient.total_assessments} assessments • {patient.conditions.join(', ') || 'General'}
                  </Text>
                </View>
                <View style={styles.patientScore}>
                  <Text style={[
                    styles.scoreValue,
                    { color: patient.improvement_rate >= 70 ? '#4CAF50' : 
                             patient.improvement_rate >= 40 ? '#FF9800' : '#f44336' }
                  ]}>
                    {patient.improvement_rate}%
                  </Text>
                  <Text style={styles.scoreLabel}>Avg</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Generate Report Button */}
        <TouchableOpacity 
          style={styles.reportButton}
          onPress={generateResearchReport}
          disabled={generatingReport}
        >
          {generatingReport ? (
            <ActivityIndicator color={theme.colors.textPrimary} />
          ) : (
            <>
              <Ionicons name="document-text" size={24} color={theme.colors.textPrimary} />
              <Text style={styles.reportButtonText}>Generate Full Research Report</Text>
            </>
          )}
        </TouchableOpacity>
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
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: (SCREEN_WIDTH - 56) / 2,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  distributionItem: {
    marginBottom: 12,
  },
  distributionLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  distributionType: {
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  distributionCount: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  progressBarFill: {
    height: 8,
    backgroundColor: theme.colors.accent,
    borderRadius: 4,
  },
  outcomesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  outcomeCard: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  outcomeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  outcomeLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  monthlyChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  monthItem: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  monthBar: {
    width: 24,
    backgroundColor: theme.colors.accent,
    borderRadius: 4,
    minHeight: 10,
  },
  monthLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  monthValue: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  patientCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  patientMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  patientScore: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: theme.colors.textMuted,
    marginTop: 12,
  },
  reportButton: {
    backgroundColor: '#673AB7',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 20,
  },
  reportButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
