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
  TextInput,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConditionData {
  condition: string;
  display_name: string;
  patient_count: number;
  assessment_count: number;
  avg_score: number;
  success_rate: number;
  improved_count: number;
  stable_count: number;
  needs_attention_count: number;
}

interface PaymentInfo {
  qr_code: string;
  upi_id: string;
  account_holder: string;
}

export default function ResearchAnalyticsEnhanced() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'conditions' | 'publications' | 'downloads' | 'statistics'>('conditions');
  
  // Data states
  const [conditionDashboard, setConditionDashboard] = useState<any>(null);
  const [publications, setPublications] = useState<any[]>([]);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [statisticsData, setStatisticsData] = useState<any>(null);
  
  // Modal states
  const [showPublicationModal, setShowPublicationModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<ConditionData | null>(null);
  
  // Form states
  const [publicationTitle, setPublicationTitle] = useState('');
  const [publicationDescription, setPublicationDescription] = useState('');
  const [currentRequestId, setCurrentRequestId] = useState('');
  const [currentAmount, setCurrentAmount] = useState(0);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [paymentScreenshot, setPaymentScreenshot] = useState('');
  const [requestType, setRequestType] = useState<'publication' | 'download'>('publication');
  const [downloadType, setDownloadType] = useState<'csv' | 'excel'>('csv');
  const [downloadScope, setDownloadScope] = useState<'condition' | 'all'>('condition');
  
  // Loading states
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPayment, setUploadingPayment] = useState(false);

  const fetchAllData = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    try {
      // Fetch condition dashboard
      const conditionRes = await api.get('/research/condition-dashboard');
      setConditionDashboard(conditionRes.data);

      // Fetch user's publication requests
      const pubRes = await api.get(`/research/publication/requests?requester_id=${currentUser.id}`);
      setPublications(pubRes.data || []);

      // Fetch user's download requests
      const downloadRes = await api.get(`/research/download/requests?requester_id=${currentUser.id}`);
      setDownloads(downloadRes.data || []);

      // Fetch statistics
      const statsRes = await api.post(`/research/statistical-analysis?researcher_id=${currentUser.id}&analysis_type=descriptive&data_source=assessments`);
      setStatisticsData(statsRes.data);

    } catch (error) {
      console.error('Research data fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handlePublishResearch = async () => {
    if (!currentUser?.id || !selectedCondition || !publicationTitle.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await api.post('/research/publication/request', {
        requester_id: currentUser.id,
        requester_name: currentUser.name,
        requester_role: currentUser.role,
        organization_id: currentUser.organization_id,
        organization_name: currentUser.organization_name,
        condition_focus: selectedCondition.condition,
        title: publicationTitle,
        description: publicationDescription
      });
      
      setCurrentRequestId(response.data.request_id);
      setCurrentAmount(response.data.amount);
      setPaymentInfo(response.data.payment_info);
      setRequestType('publication');
      setShowPublicationModal(false);
      setShowPaymentModal(true);
      
    } catch (error) {
      console.error('Publication request error:', error);
      Alert.alert('Error', 'Failed to create publication request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestDownload = async () => {
    if (!currentUser?.id) return;
    
    setSubmitting(true);
    try {
      const response = await api.post('/research/download/request', {
        requester_id: currentUser.id,
        requester_name: currentUser.name,
        requester_role: currentUser.role,
        organization_id: currentUser.organization_id,
        download_type: downloadType,
        condition_filter: downloadScope === 'all' ? 'all' : selectedCondition?.condition,
        data_scope: downloadScope === 'all' ? 'all' : 'own'
      });
      
      setCurrentRequestId(response.data.request_id);
      setCurrentAmount(response.data.amount);
      setPaymentInfo(response.data.payment_info);
      setRequestType('download');
      setShowDownloadModal(false);
      setShowPaymentModal(true);
      
    } catch (error) {
      console.error('Download request error:', error);
      Alert.alert('Error', 'Failed to create download request');
    } finally {
      setSubmitting(false);
    }
  };

  const pickPaymentScreenshot = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        base64: true
      });
      
      if (!result.canceled && result.assets[0]?.base64) {
        setPaymentScreenshot(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      console.error('Image picker error:', error);
    }
  };

  const uploadPaymentScreenshot = async () => {
    if (!paymentScreenshot || !currentRequestId) {
      Alert.alert('Error', 'Please select a payment screenshot');
      return;
    }
    
    setUploadingPayment(true);
    try {
      const endpoint = requestType === 'publication' 
        ? `/research/publication/${currentRequestId}/upload-payment`
        : `/research/download/${currentRequestId}/upload-payment`;
      
      await api.post(endpoint, null, {
        params: { screenshot: paymentScreenshot }
      });
      
      Alert.alert('Success', 'Payment screenshot uploaded! Waiting for admin approval.', [
        { text: 'OK', onPress: () => {
          setShowPaymentModal(false);
          setPaymentScreenshot('');
          setCurrentRequestId('');
          fetchAllData();
        }}
      ]);
      
    } catch (error) {
      console.error('Upload payment error:', error);
      Alert.alert('Error', 'Failed to upload payment screenshot');
    } finally {
      setUploadingPayment(false);
    }
  };

  const openConditionDetail = (condition: ConditionData) => {
    setSelectedCondition(condition);
    setPublicationTitle(`Research Study: ${condition.display_name} Treatment Outcomes`);
    setShowPublicationModal(true);
  };

  const openDownloadModal = (condition?: ConditionData) => {
    setSelectedCondition(condition || null);
    setDownloadScope(condition ? 'condition' : 'all');
    setShowDownloadModal(true);
  };

  const renderConditionCard = (condition: ConditionData, index: number) => {
    const colors = ['#673AB7', '#2196F3', '#4CAF50', '#FF9800', '#E91E63', '#00BCD4', '#795548', '#607D8B'];
    const bgColor = colors[index % colors.length];
    
    return (
      <TouchableOpacity 
        key={condition.condition}
        style={[styles.conditionCard, { borderLeftColor: bgColor }]}
        onPress={() => openConditionDetail(condition)}
      >
        <View style={styles.conditionHeader}>
          <View style={[styles.conditionIcon, { backgroundColor: bgColor }]}>
            <MaterialCommunityIcons name="human" size={24} color="#fff" />
          </View>
          <View style={styles.conditionInfo}>
            <Text style={styles.conditionName}>{condition.display_name}</Text>
            <Text style={styles.conditionStats}>
              {condition.patient_count} patients • {condition.assessment_count} assessments
            </Text>
          </View>
          <View style={styles.conditionScore}>
            <Text style={styles.scoreValue}>{condition.avg_score}%</Text>
            <Text style={styles.scoreLabel}>Avg Score</Text>
          </View>
        </View>
        
        <View style={styles.conditionMetrics}>
          <View style={styles.metric}>
            <View style={[styles.metricDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.metricText}>Improved: {condition.improved_count}</Text>
          </View>
          <View style={styles.metric}>
            <View style={[styles.metricDot, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.metricText}>Stable: {condition.stable_count}</Text>
          </View>
          <View style={styles.metric}>
            <View style={[styles.metricDot, { backgroundColor: '#f44336' }]} />
            <Text style={styles.metricText}>Attention: {condition.needs_attention_count}</Text>
          </View>
        </View>
        
        <View style={styles.conditionActions}>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => openConditionDetail(condition)}
          >
            <Ionicons name="document-text" size={16} color={theme.colors.accent} />
            <Text style={styles.actionText}>Publish Research</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => openDownloadModal(condition)}
          >
            <Ionicons name="download" size={16} color="#4CAF50" />
            <Text style={[styles.actionText, { color: '#4CAF50' }]}>Download Data</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRequestStatus = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: '#FF9800',
      uploaded: '#2196F3',
      approved: '#4CAF50',
      rejected: '#f44336',
      verified: '#4CAF50'
    };
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: statusColors[status] || '#9E9E9E' }]}>
        <Text style={styles.statusText}>{status.toUpperCase()}</Text>
      </View>
    );
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <MaterialCommunityIcons name="chart-timeline-variant" size={28} color={theme.colors.accent} />
          <Text style={styles.headerTitle}>Research Analytics</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.badgeText}>PREMIUM</Text>
        </View>
      </View>

      {/* Summary Banner */}
      <View style={styles.summaryBanner}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{conditionDashboard?.total_patients || 0}</Text>
          <Text style={styles.summaryLabel}>Patients</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{conditionDashboard?.total_assessments || 0}</Text>
          <Text style={styles.summaryLabel}>Assessments</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{conditionDashboard?.total_conditions || 0}</Text>
          <Text style={styles.summaryLabel}>Conditions</Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabScrollView}
        contentContainerStyle={styles.tabContainer}
      >
        {[
          { id: 'conditions', label: 'Conditions', icon: 'body' },
          { id: 'publications', label: 'My Publications', icon: 'document-text' },
          { id: 'downloads', label: 'My Downloads', icon: 'download' },
          { id: 'statistics', label: 'Statistics', icon: 'stats-chart' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={18} 
              color={activeTab === tab.id ? '#fff' : theme.colors.textMuted} 
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Conditions Tab */}
        {activeTab === 'conditions' && (
          <>
            {/* Pricing Info */}
            <View style={styles.pricingCard}>
              <Text style={styles.pricingTitle}>Research Publication Pricing</Text>
              <View style={styles.pricingRow}>
                <Text style={styles.pricingItem}>Physio: ₹{conditionDashboard?.pricing?.physio || 999}</Text>
                <Text style={styles.pricingItem}>Organization: ₹{conditionDashboard?.pricing?.organization || 2999}</Text>
              </View>
              <Text style={styles.pricingNote}>* Admin approval required after payment</Text>
            </View>

            {/* Collective Download */}
            <TouchableOpacity 
              style={styles.collectiveDownloadBtn}
              onPress={() => openDownloadModal()}
            >
              <MaterialCommunityIcons name="database-export" size={24} color="#fff" />
              <View style={styles.collectiveInfo}>
                <Text style={styles.collectiveTitle}>Download All Data (Collective)</Text>
                <Text style={styles.collectiveSubtitle}>₹{conditionDashboard?.pricing?.collective_download || 1499} • All conditions • Admin approval</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Condition Cards */}
            <Text style={styles.sectionTitle}>Conditions by Patient Count</Text>
            {conditionDashboard?.conditions?.map((condition: ConditionData, index: number) => 
              renderConditionCard(condition, index)
            )}
          </>
        )}

        {/* Publications Tab */}
        {activeTab === 'publications' && (
          <>
            <Text style={styles.sectionTitle}>My Publication Requests</Text>
            {publications.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={theme.colors.textMuted} />
                <Text style={styles.emptyText}>No publication requests yet</Text>
                <Text style={styles.emptySubtext}>Select a condition to publish research</Text>
              </View>
            ) : (
              publications.map((pub, index) => (
                <View key={index} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <Text style={styles.requestTitle}>{pub.title}</Text>
                    {renderRequestStatus(pub.admin_status)}
                  </View>
                  <Text style={styles.requestMeta}>
                    Condition: {pub.condition_focus} • Sample: {pub.sample_size} patients
                  </Text>
                  <View style={styles.requestFooter}>
                    <Text style={styles.requestAmount}>₹{pub.amount}</Text>
                    <Text style={styles.requestDate}>
                      {new Date(pub.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  {pub.admin_status === 'approved' && (
                    <TouchableOpacity style={styles.viewReportBtn}>
                      <Ionicons name="eye" size={16} color="#fff" />
                      <Text style={styles.viewReportText}>View Published Research</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </>
        )}

        {/* Downloads Tab */}
        {activeTab === 'downloads' && (
          <>
            <Text style={styles.sectionTitle}>My Download Requests</Text>
            {downloads.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="download-outline" size={48} color={theme.colors.textMuted} />
                <Text style={styles.emptyText}>No download requests yet</Text>
                <Text style={styles.emptySubtext}>Request data downloads from conditions</Text>
              </View>
            ) : (
              downloads.map((dl, index) => (
                <View key={index} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <Text style={styles.requestTitle}>
                      {dl.condition_filter === 'all' ? 'All Data' : dl.condition_filter} ({dl.download_type?.toUpperCase()})
                    </Text>
                    {renderRequestStatus(dl.admin_status)}
                  </View>
                  <Text style={styles.requestMeta}>
                    {dl.row_count} records • Scope: {dl.data_scope}
                  </Text>
                  <View style={styles.requestFooter}>
                    <Text style={styles.requestAmount}>₹{dl.amount}</Text>
                    <Text style={styles.requestDate}>
                      {new Date(dl.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  {dl.admin_status === 'approved' && dl.download_url && (
                    <TouchableOpacity style={styles.downloadDataBtn}>
                      <Ionicons name="download" size={16} color="#fff" />
                      <Text style={styles.downloadDataText}>Download Data</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </>
        )}

        {/* Statistics Tab */}
        {activeTab === 'statistics' && statisticsData && (
          <>
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Descriptive Statistics</Text>
              <View style={styles.statsGrid}>
                {[
                  { label: 'Sample Size', value: statisticsData.sample_size, icon: 'people' },
                  { label: 'Mean Score', value: `${statisticsData.descriptive_statistics?.mean || 0}%`, icon: 'analytics' },
                  { label: 'Median Score', value: `${statisticsData.descriptive_statistics?.median || 0}%`, icon: 'remove' },
                  { label: 'Std Deviation', value: statisticsData.descriptive_statistics?.std_dev?.toFixed(2) || 0, icon: 'pulse' },
                  { label: 'Min Score', value: `${statisticsData.descriptive_statistics?.min || 0}%`, icon: 'arrow-down' },
                  { label: 'Max Score', value: `${statisticsData.descriptive_statistics?.max || 0}%`, icon: 'arrow-up' },
                ].map((stat, index) => (
                  <View key={index} style={styles.statItem}>
                    <Ionicons name={stat.icon as any} size={20} color={theme.colors.accent} />
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Publication Modal */}
      <Modal
        visible={showPublicationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPublicationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Publish Research</Text>
              <TouchableOpacity onPress={() => setShowPublicationModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            {selectedCondition && (
              <View style={styles.conditionPreview}>
                <Text style={styles.previewLabel}>Condition:</Text>
                <Text style={styles.previewValue}>{selectedCondition.display_name}</Text>
                <Text style={styles.previewStats}>
                  {selectedCondition.patient_count} patients • {selectedCondition.assessment_count} assessments
                </Text>
              </View>
            )}
            
            <TextInput
              style={styles.input}
              placeholder="Research Title"
              placeholderTextColor={theme.colors.textMuted}
              value={publicationTitle}
              onChangeText={setPublicationTitle}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              placeholderTextColor={theme.colors.textMuted}
              value={publicationDescription}
              onChangeText={setPublicationDescription}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.priceBox}>
              <Text style={styles.priceLabel}>Publication Fee:</Text>
              <Text style={styles.priceValue}>
                ₹{currentUser?.role === 'org_head' ? conditionDashboard?.pricing?.organization : conditionDashboard?.pricing?.physio}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.submitBtn}
              onPress={handlePublishResearch}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Proceed to Payment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Download Modal */}
      <Modal
        visible={showDownloadModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDownloadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Download Data</Text>
              <TouchableOpacity onPress={() => setShowDownloadModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.fieldLabel}>Data Scope</Text>
            <View style={styles.optionRow}>
              <TouchableOpacity
                style={[styles.optionBtn, downloadScope === 'condition' && styles.optionBtnActive]}
                onPress={() => setDownloadScope('condition')}
              >
                <Text style={[styles.optionText, downloadScope === 'condition' && styles.optionTextActive]}>
                  Single Condition (₹{conditionDashboard?.pricing?.data_download})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionBtn, downloadScope === 'all' && styles.optionBtnActive]}
                onPress={() => setDownloadScope('all')}
              >
                <Text style={[styles.optionText, downloadScope === 'all' && styles.optionTextActive]}>
                  All Data (₹{conditionDashboard?.pricing?.collective_download})
                </Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.fieldLabel}>Format</Text>
            <View style={styles.optionRow}>
              <TouchableOpacity
                style={[styles.optionBtn, downloadType === 'csv' && styles.optionBtnActive]}
                onPress={() => setDownloadType('csv')}
              >
                <MaterialCommunityIcons name="file-delimited" size={20} color={downloadType === 'csv' ? '#fff' : theme.colors.textMuted} />
                <Text style={[styles.optionText, downloadType === 'csv' && styles.optionTextActive]}>CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionBtn, downloadType === 'excel' && styles.optionBtnActive]}
                onPress={() => setDownloadType('excel')}
              >
                <MaterialCommunityIcons name="microsoft-excel" size={20} color={downloadType === 'excel' ? '#fff' : theme.colors.textMuted} />
                <Text style={[styles.optionText, downloadType === 'excel' && styles.optionTextActive]}>Excel</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.submitBtn}
              onPress={handleRequestDownload}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Proceed to Payment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: SCREEN_HEIGHT * 0.9 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complete Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.amountBox}>
                <Text style={styles.amountLabel}>Amount to Pay</Text>
                <Text style={styles.amountValue}>₹{currentAmount}</Text>
              </View>
              
              {paymentInfo?.qr_code && (
                <View style={styles.qrContainer}>
                  <Image 
                    source={{ uri: paymentInfo.qr_code }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                </View>
              )}
              
              <View style={styles.bankDetails}>
                <Text style={styles.bankTitle}>Bank Details</Text>
                <Text style={styles.bankInfo}>UPI: {paymentInfo?.upi_id}</Text>
                <Text style={styles.bankInfo}>Account: {paymentInfo?.account_holder}</Text>
              </View>
              
              <TouchableOpacity style={styles.uploadScreenshotBtn} onPress={pickPaymentScreenshot}>
                <Ionicons name="camera" size={24} color={theme.colors.accent} />
                <Text style={styles.uploadScreenshotText}>
                  {paymentScreenshot ? 'Screenshot Selected ✓' : 'Upload Payment Screenshot'}
                </Text>
              </TouchableOpacity>
              
              {paymentScreenshot && (
                <Image 
                  source={{ uri: paymentScreenshot }}
                  style={styles.screenshotPreview}
                  resizeMode="contain"
                />
              )}
              
              <TouchableOpacity 
                style={[styles.submitBtn, !paymentScreenshot && styles.submitBtnDisabled]}
                onPress={uploadPaymentScreenshot}
                disabled={!paymentScreenshot || uploadingPayment}
              >
                {uploadingPayment ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit for Admin Approval</Text>
                )}
              </TouchableOpacity>
              
              <Text style={styles.noteText}>
                Note: Your request will be reviewed by admin within 24-48 hours.
              </Text>
            </ScrollView>
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
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerBadge: {
    backgroundColor: '#673AB7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  summaryBanner: {
    flexDirection: 'row',
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabScrollView: {
    maxHeight: 50,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  tabContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  tabActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  tabText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.md,
  },
  pricingCard: {
    backgroundColor: '#673AB7',
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  pricingTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  pricingItem: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  pricingNote: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
  collectiveDownloadBtn: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  collectiveInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  collectiveTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  collectiveSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  conditionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
  },
  conditionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  conditionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conditionInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  conditionName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  conditionStats: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  conditionScore: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  scoreLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  conditionMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
    marginTop: theme.spacing.sm,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metricText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  conditionActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: theme.spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 13,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
  },
  emptyText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  requestCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  requestMeta: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  requestAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  requestDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  viewReportBtn: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: theme.spacing.sm,
    borderRadius: 8,
    marginTop: theme.spacing.sm,
  },
  viewReportText: {
    color: '#fff',
    fontWeight: '600',
  },
  downloadDataBtn: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: theme.spacing.sm,
    borderRadius: 8,
    marginTop: theme.spacing.sm,
  },
  downloadDataText: {
    color: '#fff',
    fontWeight: '600',
  },
  statsSection: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: theme.spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  statItem: {
    width: (SCREEN_WIDTH - 64) / 2 - 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: theme.spacing.lg,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  conditionPreview: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  previewLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  previewValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  previewStats: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  input: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: 16,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  optionBtnActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  optionText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  optionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  priceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#673AB7',
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  priceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  priceValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  amountBox: {
    backgroundColor: '#673AB7',
    borderRadius: 12,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  amountLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  amountValue: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '700',
  },
  qrContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  bankDetails: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  bankTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  bankInfo: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  uploadScreenshotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderStyle: 'dashed',
    marginBottom: theme.spacing.md,
  },
  uploadScreenshotText: {
    fontSize: 14,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  screenshotPreview: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    marginBottom: theme.spacing.md,
  },
  noteText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
});
