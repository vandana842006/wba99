import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../src/utils/theme';
import { getAssessment } from '../../src/utils/api';
import { Assessment, useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';
import { generatePaymentSectionHTML } from '../../src/utils/pdfPaymentSection';

const SCORE_LABELS: Record<string, Record<string, string>> = {
  posture: {
    head_alignment: 'Head Alignment',
    shoulder_level: 'Shoulder Level',
    spine_curvature: 'Spine Curvature',
    hip_level: 'Hip Level',
    knee_alignment: 'Knee Alignment',
    overall_balance: 'Overall Balance',
  },
  walking: {
    gait_symmetry: 'Gait Symmetry',
    stride_length: 'Stride Length',
    arm_swing: 'Arm Swing',
    heel_strike: 'Heel Strike',
    toe_off: 'Toe Off',
    balance: 'Balance',
  },
  running: {
    cadence: 'Cadence',
    foot_strike: 'Foot Strike',
    knee_drive: 'Knee Drive',
    arm_mechanics: 'Arm Mechanics',
    trunk_stability: 'Trunk Stability',
    overall_form: 'Overall Form',
  },
  msk: {
    deep_squat: 'Deep Squat',
    hurdle_step: 'Hurdle Step',
    inline_lunge: 'In-Line Lunge',
    shoulder_mobility: 'Shoulder Mobility',
    active_straight_leg: 'Active Straight Leg Raise',
    trunk_stability_pushup: 'Trunk Stability Push-Up',
    rotary_stability: 'Rotary Stability',
  },
};

export default function AssessmentResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentUser } = useStore();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    const fetchAssessment = async () => {
      if (!params.id) return;
      
      try {
        const response = await getAssessment(params.id as string);
        setAssessment(response.data);
      } catch (error) {
        console.error('Error fetching assessment:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssessment();
  }, [params.id]);

  // Generate comprehensive PDF report
  const generateComprehensivePDF = async () => {
    if (!assessment) return;
    
    setGeneratingPdf(true);
    try {
      // Call backend API to generate comprehensive report
      const response = await api.post('/generate-comprehensive-report', {
        assessment_id: assessment.id,
        assessment_type: assessment.assessment_type,
        patient_name: assessment.patient_name || 'Patient',
        patient_age: null,
        patient_gender: null,
        physio_name: assessment.physio_name || currentUser?.name || 'WBA99 Physio',
        physio_clinic: 'WBA99 Sports Physiotherapy',
        assessment_data: assessment.data,
        total_score: assessment.total_score,
        max_score: assessment.max_score,
        percentage: assessment.percentage,
        include_ai_analysis: true
      });

      const { report_html, report_id } = response.data;

      // Generate PDF from HTML
      const { uri } = await Print.printToFileAsync({
        html: report_html,
        base64: false
      });

      // Share the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${assessment.assessment_type.toUpperCase()} Report - ${assessment.patient_name}`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Success', `PDF report generated: ${report_id}`);
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert('Error', 'Failed to generate PDF report. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const getAssessmentIcon = () => {
    switch (assessment?.assessment_type) {
      case 'posture':
        return <MaterialCommunityIcons name="human" size={48} color={theme.colors.accent} />;
      case 'walking':
        return <MaterialCommunityIcons name="walk" size={48} color={theme.colors.success} />;
      case 'running':
        return <MaterialCommunityIcons name="run" size={48} color={theme.colors.warning} />;
      case 'msk':
        return <MaterialCommunityIcons name="bone" size={48} color={theme.colors.error} />;
      default:
        return <Ionicons name="clipboard" size={48} color={theme.colors.textSecondary} />;
    }
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 70) return theme.colors.success;
    if (percentage >= 50) return theme.colors.warning;
    return theme.colors.error;
  };

  const getOverallColor = () => {
    if (!assessment) return theme.colors.textMuted;
    if (assessment.percentage >= 70) return theme.colors.success;
    if (assessment.percentage >= 50) return theme.colors.warning;
    return theme.colors.error;
  };

  const getRiskLevel = () => {
    if (!assessment) return 'Unknown';
    if (assessment.assessment_type === 'msk') {
      if (assessment.total_score >= 14) return 'Low Risk';
      if (assessment.total_score >= 10) return 'Moderate Risk';
      return 'High Risk';
    }
    if (assessment.percentage >= 70) return 'Good';
    if (assessment.percentage >= 50) return 'Fair';
    return 'Needs Improvement';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!assessment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>Assessment not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isMSK = assessment.assessment_type === 'msk';
  const maxItemScore = isMSK ? 3 : 10;
  const labels = SCORE_LABELS[assessment.assessment_type] || {};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          {getAssessmentIcon()}
          <Text style={styles.title}>
            {assessment.assessment_type === 'msk'
              ? 'M.S.K.'
              : assessment.assessment_type.charAt(0).toUpperCase() + assessment.assessment_type.slice(1)}
            {' '}Assessment Result
          </Text>
          <Text style={styles.date}>
            {new Date(assessment.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {/* Patient/Physio Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={20} color={theme.colors.accent} />
            <Text style={styles.infoLabel}>Patient:</Text>
            <Text style={styles.infoValue}>{assessment.patient_name || 'Unknown'}</Text>
          </View>
          {assessment.physio_name && (
            <View style={styles.infoRow}>
              <Ionicons name="medical" size={20} color={theme.colors.success} />
              <Text style={styles.infoLabel}>Assessed by:</Text>
              <Text style={styles.infoValue}>{assessment.physio_name}</Text>
            </View>
          )}
        </View>

        {/* Score Overview */}
        <View style={[styles.scoreCard, { borderColor: getOverallColor() }]}>
          <View style={styles.scoreCircle}>
            <Text style={[styles.scorePercentage, { color: getOverallColor() }]}>
              {assessment.percentage}%
            </Text>
            <Text style={styles.scoreRatio}>
              {assessment.total_score}/{assessment.max_score}
            </Text>
          </View>
          <View style={styles.scoreInfo}>
            <Text style={styles.scoreLabel}>Overall Score</Text>
            <View style={[styles.riskBadge, { backgroundColor: getOverallColor() + '20' }]}>
              <Text style={[styles.riskText, { color: getOverallColor() }]}>
                {getRiskLevel()}
              </Text>
            </View>
          </View>
        </View>

        {/* Detailed Scores */}
        <Text style={styles.sectionTitle}>Detailed Breakdown</Text>
        <View style={styles.detailsCard}>
          {Object.entries(assessment.data)
            .filter(([key]) => key !== 'notes')
            .map(([key, value]) => {
              const numValue = typeof value === 'number' ? value : 0;
              const barWidth = (numValue / maxItemScore) * 100;
              
              return (
                <View key={key} style={styles.detailRow}>
                  <View style={styles.detailHeader}>
                    <Text style={styles.detailLabel}>{labels[key] || key}</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        { color: getScoreColor(numValue, maxItemScore) },
                      ]}
                    >
                      {numValue}/{maxItemScore}
                    </Text>
                  </View>
                  <View style={styles.detailBar}>
                    <View
                      style={[
                        styles.detailBarFill,
                        {
                          width: `${barWidth}%`,
                          backgroundColor: getScoreColor(numValue, maxItemScore),
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
        </View>

        {/* Notes */}
        {assessment.data.notes && (
          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <Ionicons name="document-text" size={20} color={theme.colors.accent} />
              <Text style={styles.notesTitle}>Clinical Notes</Text>
            </View>
            <Text style={styles.notesText}>{assessment.data.notes as string}</Text>
          </View>
        )}

        {/* Recommendations */}
        <View style={styles.recommendationsCard}>
          <Text style={styles.recommendationsTitle}>Recommendations</Text>
          {assessment.percentage < 50 && (
            <View style={styles.recommendationItem}>
              <Ionicons name="warning" size={20} color={theme.colors.error} />
              <Text style={styles.recommendationText}>
                Score indicates significant areas for improvement. Consider consultation with a physiotherapist.
              </Text>
            </View>
          )}
          {assessment.percentage >= 50 && assessment.percentage < 70 && (
            <View style={styles.recommendationItem}>
              <Ionicons name="fitness" size={20} color={theme.colors.warning} />
              <Text style={styles.recommendationText}>
                Some areas need attention. Focus on targeted exercises to improve weak points.
              </Text>
            </View>
          )}
          {assessment.percentage >= 70 && (
            <View style={styles.recommendationItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={styles.recommendationText}>
                Good overall score. Maintain current practices and continue regular assessments.
              </Text>
            </View>
          )}
        </View>

        {/* PDF Report Button */}
        <TouchableOpacity
          style={[styles.pdfButton, generatingPdf && styles.buttonDisabled]}
          onPress={generateComprehensivePDF}
          disabled={generatingPdf}
        >
          {generatingPdf ? (
            <>
              <ActivityIndicator size="small" color={theme.colors.textPrimary} />
              <Text style={styles.pdfButtonText}>Generating AI Report...</Text>
            </>
          ) : (
            <>
              <Ionicons name="document-text" size={24} color={theme.colors.textPrimary} />
              <Text style={styles.pdfButtonText}>Download Comprehensive PDF Report</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.pdfHint}>
          Includes: Biomechanics • Kinetic Chain • Rehab Plan • Mobility • Stretching • Strengthening • Release Techniques • Consequences
        </Text>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/assessment/${assessment.assessment_type}`)}
          >
            <Ionicons name="refresh" size={24} color={theme.colors.textPrimary} />
            <Text style={styles.actionButtonText}>New Assessment</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={() => router.push('/')}
          >
            <Ionicons name="home" size={24} color={theme.colors.accent} />
            <Text style={[styles.actionButtonText, { color: theme.colors.accent }]}>Home</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  backButton: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
  },
  backButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.semibold,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  date: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  infoCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  infoLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  scoreCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    alignItems: 'center',
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scorePercentage: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
  },
  scoreRatio: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  scoreInfo: {
    flex: 1,
    marginLeft: theme.spacing.lg,
  },
  scoreLabel: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  riskBadge: {
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  riskText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  detailsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  detailRow: {
    marginBottom: theme.spacing.md,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  detailLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  detailBar: {
    height: 8,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  detailBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  notesCard: {
    backgroundColor: theme.colors.accent + '15',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.accent + '30',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  notesTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  notesText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  recommendationsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  recommendationsTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  recommendationText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  actionButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  pdfButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  pdfHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 18,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
