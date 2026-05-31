import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import api from '../../src/utils/api';
import { useStore } from '../../src/store/useStore';

// Demo organization ID for demo accounts
const DEMO_ORG_ID = 'demo-org-001';

export default function OrganizationResearch() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  const [publications, setPublications] = useState<any[]>([]);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishForm, setPublishForm] = useState({
    title: '',
    condition_type: '',
    abstract: '',
  });
  const [publishing, setPublishing] = useState(false);

  const isDemoAccount = () => {
    const demoEmails = ['sarah@wba99.com', 'admin@wba99.com', 'demo@wba99.com', 'demohead@wba99.com'];
    return demoEmails.includes(currentUser?.email?.toLowerCase() || '');
  };

  const getOrgId = () => {
    return currentUser?.organization_id || (isDemoAccount() ? DEMO_ORG_ID : null);
  };

  const fetchData = async () => {
    const orgId = getOrgId();
    if (!orgId) {
      setLoading(false);
      return;
    }

    try {
      const [statsRes, pubsRes] = await Promise.all([
        api.get(`/organizations/${orgId}/statistics`),
        api.get('/research/publications'),
      ]);
      setStatistics(statsRes.data);
      setPublications(pubsRes.data || []);
    } catch (error) {
      console.error('Error fetching research data:', error);
      // Set mock data for demo
      if (isDemoAccount()) {
        setStatistics({
          total_physios: 5,
          total_patients: 48,
          total_assessments: 156,
          assessment_by_type: { msk: 45, fms: 32, posture: 28, walking: 25, running: 26 },
          condition_distribution: { 
            'back_pain': 28, 
            'knee_pain': 22, 
            'shoulder_injury': 18,
            'ankle_sprain': 15,
            'neck_pain': 12,
            'hip_pain': 8
          },
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handlePublish = async () => {
    if (!publishForm.title || !publishForm.condition_type) {
      Alert.alert('Error', 'Please fill in title and condition type');
      return;
    }

    const orgId = getOrgId();
    if (!orgId) {
      Alert.alert('Error', 'Organization not found');
      return;
    }

    setPublishing(true);
    try {
      await api.post(`/organizations/${orgId}/research/publish`, null, {
        params: {
          title: publishForm.title,
          condition_type: publishForm.condition_type,
          abstract: publishForm.abstract,
        }
      });
      Alert.alert(
        '✅ Publication Submitted',
        'Your research publication has been submitted for admin approval. Payment of 500 credits will be required.',
        [{ text: 'OK' }]
      );
      setShowPublishModal(false);
      setPublishForm({ title: '', condition_type: '', abstract: '' });
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to submit publication');
    } finally {
      setPublishing(false);
    }
  };

  const topConditions = Object.entries(statistics?.condition_distribution || {})
    .sort(([, a]: any, [, b]: any) => b - a);

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
          <Text style={styles.headerTitle}>🔬 Research Dashboard</Text>
          <TouchableOpacity 
            style={styles.publishBtn}
            onPress={() => setShowPublishModal(true)}
          >
            <Ionicons name="cloud-upload" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Demo Badge */}
        {isDemoAccount() && !currentUser?.organization_id && (
          <View style={styles.demoBanner}>
            <Ionicons name="flask" size={20} color={theme.colors.warning} />
            <Text style={styles.demoBannerText}>Demo Mode - Sample Research Data</Text>
          </View>
        )}

        {/* Overview Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{statistics?.total_patients || 0}</Text>
            <Text style={styles.statLabel}>Total Patients</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{statistics?.total_assessments || 0}</Text>
            <Text style={styles.statLabel}>Assessments</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{topConditions.length}</Text>
            <Text style={styles.statLabel}>Conditions</Text>
          </View>
        </View>

        {/* Condition Distribution - Research Data */}
        <Text style={styles.sectionTitle}>📊 Condition Distribution</Text>
        <View style={styles.conditionsCard}>
          {topConditions.length > 0 ? (
            topConditions.map(([condition, count]: any, index) => {
              const total = statistics?.total_patients || 1;
              const percentage = Math.round((count / total) * 100);
              const colors = ['#E53935', '#FB8C00', '#43A047', '#1E88E5', '#8E24AA', '#00ACC1'];
              
              return (
                <View key={condition} style={styles.conditionRow}>
                  <View style={styles.conditionHeader}>
                    <View style={[styles.conditionDot, { backgroundColor: colors[index % colors.length] }]} />
                    <Text style={styles.conditionName}>{condition.replace(/_/g, ' ')}</Text>
                    <Text style={styles.conditionCount}>{count} patients ({percentage}%)</Text>
                  </View>
                  <View style={styles.conditionBarBg}>
                    <View 
                      style={[
                        styles.conditionBarFill, 
                        { width: `${Math.min(percentage * 2, 100)}%`, backgroundColor: colors[index % colors.length] }
                      ]} 
                    />
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="analytics-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No condition data yet</Text>
            </View>
          )}
        </View>

        {/* Assessment Type Distribution */}
        <Text style={styles.sectionTitle}>📋 Assessment Types</Text>
        <View style={styles.assessmentTypesCard}>
          {Object.entries(statistics?.assessment_by_type || {}).map(([type, count]: any) => (
            <View key={type} style={styles.assessmentTypeItem}>
              <MaterialCommunityIcons 
                name={type === 'msk' ? 'bone' : type === 'fms' ? 'human-handsup' : type === 'posture' ? 'human' : type === 'walking' ? 'walk' : 'run'} 
                size={24} 
                color={theme.colors.accent} 
              />
              <Text style={styles.assessmentTypeCount}>{count}</Text>
              <Text style={styles.assessmentTypeLabel}>{type.toUpperCase()}</Text>
            </View>
          ))}
        </View>

        {/* AI Research Insights */}
        <Text style={styles.sectionTitle}>🤖 AI Research Insights</Text>
        <View style={styles.insightsCard}>
          <View style={styles.insightItem}>
            <Ionicons name="trending-up" size={24} color={theme.colors.success} />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Most Common Condition</Text>
              <Text style={styles.insightValue}>
                {topConditions[0] ? topConditions[0][0].replace(/_/g, ' ') : 'N/A'}
              </Text>
            </View>
          </View>
          <View style={styles.insightDivider} />
          <View style={styles.insightItem}>
            <MaterialCommunityIcons name="chart-line" size={24} color={theme.colors.accent} />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Avg Assessments/Patient</Text>
              <Text style={styles.insightValue}>
                {statistics?.total_patients ? (statistics.total_assessments / statistics.total_patients).toFixed(1) : '0'}
              </Text>
            </View>
          </View>
          <View style={styles.insightDivider} />
          <View style={styles.insightItem}>
            <Ionicons name="medical" size={24} color="#9C27B0" />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Active Physios</Text>
              <Text style={styles.insightValue}>{statistics?.total_physios || 0}</Text>
            </View>
          </View>
        </View>

        {/* Publications */}
        <Text style={styles.sectionTitle}>📚 Research Publications</Text>
        {publications.length === 0 ? (
          <View style={styles.emptyPublications}>
            <Ionicons name="document-text-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No publications yet</Text>
            <TouchableOpacity 
              style={styles.createPublicationBtn}
              onPress={() => setShowPublishModal(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createPublicationBtnText}>Create Publication</Text>
            </TouchableOpacity>
          </View>
        ) : (
          publications.map((pub) => (
            <View key={pub.id} style={styles.publicationCard}>
              <View style={styles.publicationHeader}>
                <Text style={styles.publicationTitle}>{pub.title}</Text>
                <View style={[styles.publicationBadge, { 
                  backgroundColor: pub.status === 'approved' ? theme.colors.success + '30' : theme.colors.warning + '30' 
                }]}>
                  <Text style={[styles.publicationBadgeText, { 
                    color: pub.status === 'approved' ? theme.colors.success : theme.colors.warning 
                  }]}>{pub.status?.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.publicationCondition}>Condition: {pub.condition_type}</Text>
              <Text style={styles.publicationPatients}>{pub.total_patients} patients</Text>
            </View>
          ))
        )}

        {/* Publish Button */}
        <TouchableOpacity 
          style={styles.publishResearchBtn}
          onPress={() => setShowPublishModal(true)}
        >
          <Ionicons name="cloud-upload" size={24} color="#fff" />
          <Text style={styles.publishResearchBtnText}>Publish New Research</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Publish Modal */}
      <Modal
        visible={showPublishModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPublishModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📚 Publish Research</Text>
              <TouchableOpacity onPress={() => setShowPublishModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Research Title *</Text>
              <TextInput
                style={styles.input}
                value={publishForm.title}
                onChangeText={(text) => setPublishForm({...publishForm, title: text})}
                placeholder="e.g., Back Pain Treatment Outcomes 2026"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={styles.inputLabel}>Condition Type *</Text>
              <TextInput
                style={styles.input}
                value={publishForm.condition_type}
                onChangeText={(text) => setPublishForm({...publishForm, condition_type: text})}
                placeholder="e.g., back_pain, knee_pain"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={styles.inputLabel}>Abstract</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={publishForm.abstract}
                onChangeText={(text) => setPublishForm({...publishForm, abstract: text})}
                placeholder="Brief description of your research..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
              />

              <View style={styles.feeInfo}>
                <Ionicons name="information-circle" size={20} color={theme.colors.info} />
                <Text style={styles.feeInfoText}>Publication fee: 500 credits (Admin approval required)</Text>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.submitBtn, publishing && styles.submitBtnDisabled]}
              onPress={handlePublish}
              disabled={publishing}
            >
              {publishing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>Submit for Publication</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  publishBtn: {
    backgroundColor: theme.colors.success,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning + '20',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  demoBannerText: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  conditionsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  conditionRow: {
    marginBottom: theme.spacing.md,
  },
  conditionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  conditionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.sm,
  },
  conditionName: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.medium,
    textTransform: 'capitalize',
  },
  conditionCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  conditionBarBg: {
    height: 8,
    backgroundColor: theme.colors.cardBorder,
    borderRadius: 4,
    marginLeft: 20,
    overflow: 'hidden',
  },
  conditionBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  assessmentTypesCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    justifyContent: 'space-around',
  },
  assessmentTypeItem: {
    alignItems: 'center',
    padding: theme.spacing.sm,
    minWidth: 60,
  },
  assessmentTypeCount: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: 4,
  },
  assessmentTypeLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  insightsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightContent: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  insightTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  insightValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    textTransform: 'capitalize',
  },
  insightDivider: {
    height: 1,
    backgroundColor: theme.colors.cardBorder,
    marginVertical: theme.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  emptyPublications: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  createPublicationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  createPublicationBtnText: {
    color: '#fff',
    fontWeight: theme.fontWeight.bold,
  },
  publicationCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  publicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  publicationTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  publicationBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  publicationBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
  },
  publicationCondition: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  publicationPatients: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  publishResearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  publishResearchBtnText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  modalScroll: {
    padding: theme.spacing.md,
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  input: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  feeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.info + '20',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  feeInfoText: {
    color: theme.colors.info,
    fontSize: theme.fontSize.sm,
    flex: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
});
