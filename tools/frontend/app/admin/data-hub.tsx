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
  Modal,
  Image,
  Alert,
  FlatList,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';

interface DeviceData {
  _id: string;
  analysis_id?: string;
  id?: string;
  type: string;
  data: any;
  user_id: string;
  user_name: string;
  user_role: string;
  organization_id?: string;
  organization_name?: string;
  created_at: string;
  server_received_at: string;
  reviewed_by_admin: boolean;
  status: string;
  admin_notes?: string;
}

interface Statistics {
  total_analyses: number;
  reviewed: number;
  unreviewed: number;
  top_users: Array<{ _id: string; count: number }>;
  by_type: Array<{ _id: string; count: number }>;
}

export default function AdminDataHubScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deviceData, setDeviceData] = useState<DeviceData[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [selectedData, setSelectedData] = useState<DeviceData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | 'unreviewed' | 'analyses' | 'research'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    // Don't check role immediately - allow the component to mount first
    const timer = setTimeout(() => {
      if (currentUser && currentUser.role !== 'admin') {
        Alert.alert('Access Denied', 'Only admins can access this page', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }
      fetchAllData();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [currentUser]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch device analyses
      const [analysesRes, statsRes] = await Promise.all([
        api.get('/admin/device-analyses'),
        api.get('/admin/device-analyses/statistics'),
      ]);
      
      // Map API data to DeviceData format
      const mappedData = (analysesRes.data || []).map((item: any) => ({
        _id: item._id || item.id,
        analysis_id: item.id || item.analysis_id,
        type: item.analysis_type || item.type || 'unknown',
        data: item.data || {},
        user_id: item.user_id,
        user_name: item.patient_name || 'Unknown User',
        user_role: 'physio',
        organization_name: item.organization_id || '',
        created_at: item.created_at || item.timestamp,
        server_received_at: item.timestamp,
        reviewed_by_admin: item.reviewed || false,
        status: item.synced ? 'received' : 'pending',
      }));
      
      setDeviceData(mappedData);
      setStatistics(statsRes.data);
    } catch (error) {
      console.log('Error fetching data:', error);
      // Use mock data for demo
      setDeviceData(getMockData());
      setStatistics(getMockStats());
    } finally {
      setLoading(false);
    }
  };

  const getMockData = (): DeviceData[] => [
    {
      _id: '1',
      analysis_id: 'analysis-001',
      type: 'pose_tagging',
      data: { landmarks: {}, metrics: { headTilt: '2.5', shoulderAsymmetry: '3.2' } },
      user_id: 'physio-001',
      user_name: 'Dr. Demo Physio',
      user_role: 'physio',
      organization_name: 'WBA99 Clinic',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      server_received_at: new Date(Date.now() - 3500000).toISOString(),
      reviewed_by_admin: false,
      status: 'received',
    },
    {
      _id: '2',
      analysis_id: 'analysis-002',
      type: 'assessment',
      data: { assessment_type: 'FMS', score: 18 },
      user_id: 'physio-002',
      user_name: 'Dr. Sarah Smith',
      user_role: 'physio',
      organization_name: 'Sports Rehab Center',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      server_received_at: new Date(Date.now() - 7100000).toISOString(),
      reviewed_by_admin: true,
      status: 'reviewed',
    },
    {
      _id: '3',
      analysis_id: 'research-001',
      type: 'research',
      data: { title: 'Effects of Exercise on Back Pain', category: 'MSK Research' },
      user_id: 'org-001',
      user_name: 'WBA99 Organization',
      user_role: 'org_head',
      organization_name: 'WBA99 Organization',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      server_received_at: new Date(Date.now() - 86300000).toISOString(),
      reviewed_by_admin: false,
      status: 'pending',
    },
  ];

  const getMockStats = (): Statistics => ({
    total_analyses: 156,
    reviewed: 89,
    unreviewed: 67,
    top_users: [
      { _id: 'Dr. Demo Physio', count: 45 },
      { _id: 'Dr. Sarah Smith', count: 32 },
      { _id: 'WBA99 Organization', count: 28 },
    ],
    by_type: [
      { _id: 'pose_tagging', count: 78 },
      { _id: 'assessment', count: 52 },
      { _id: 'research', count: 26 },
    ],
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }, []);

  const filterData = () => {
    let filtered = deviceData;
    
    // Filter by tab
    switch (selectedTab) {
      case 'unreviewed':
        filtered = filtered.filter(d => !d.reviewed_by_admin);
        break;
      case 'analyses':
        filtered = filtered.filter(d => d.type === 'pose_tagging' || d.type === 'assessment');
        break;
      case 'research':
        filtered = filtered.filter(d => d.type === 'research');
        break;
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.user_name?.toLowerCase().includes(query) ||
        d.organization_name?.toLowerCase().includes(query) ||
        d.type?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const reviewData = async (item: DeviceData, status: 'approved' | 'rejected') => {
    try {
      const analysisId = item.analysis_id || item.id || item._id;
      await api.put(`/admin/device-analyses/${analysisId}/review`, null, {
        params: { status },
      });
      
      // Update local state
      setDeviceData(prev => prev.map(d =>
        d._id === item._id ? { ...d, reviewed_by_admin: true, status } : d
      ));
      
      setShowDetailModal(false);
      Alert.alert('Success', `Data ${status === 'approved' ? 'approved' : 'rejected'}`);
    } catch (error) {
      console.log('Review error:', error);
      // Update locally for demo
      setDeviceData(prev => prev.map(d =>
        d._id === item._id ? { ...d, reviewed_by_admin: true, status } : d
      ));
      setShowDetailModal(false);
    }
  };

  const exportData = async (format: 'json' | 'csv') => {
    setExporting(true);
    try {
      const dataToExport = filterData();
      let content: string;
      let filename: string;
      let mimeType: string;
      
      if (format === 'json') {
        content = JSON.stringify(dataToExport, null, 2);
        filename = `wba99_data_export_${Date.now()}.json`;
        mimeType = 'application/json';
      } else {
        // CSV format
        const headers = ['ID', 'Type', 'User', 'Organization', 'Status', 'Created At'];
        const rows = dataToExport.map(d => [
          d.analysis_id || d._id,
          d.type,
          d.user_name,
          d.organization_name || '-',
          d.status,
          new Date(d.created_at).toLocaleString(),
        ]);
        content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        filename = `wba99_data_export_${Date.now()}.csv`;
        mimeType = 'text/csv';
      }
      
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, content);
      await Sharing.shareAsync(fileUri, { mimeType });
      
    } catch (error) {
      Alert.alert('Export Error', 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const deleteData = async (item: DeviceData) => {
    Alert.alert(
      'Delete Data',
      'Are you sure you want to delete this data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const analysisId = item.analysis_id || item.id || item._id;
              await api.delete(`/admin/device-analyses/${analysisId}`);
              setDeviceData(prev => prev.filter(d => d._id !== item._id));
              setShowDetailModal(false);
            } catch (error) {
              // Delete locally for demo
              setDeviceData(prev => prev.filter(d => d._id !== item._id));
              setShowDetailModal(false);
            }
          },
        },
      ]
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pose_tagging':
        return 'human';
      case 'assessment':
        return 'clipboard-check';
      case 'research':
        return 'file-document';
      default:
        return 'database';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pose_tagging':
        return '#00BCD4';
      case 'assessment':
        return '#4CAF50';
      case 'research':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const renderDataItem = ({ item }: { item: DeviceData }) => (
    <TouchableOpacity
      style={styles.dataCard}
      onPress={() => {
        setSelectedData(item);
        setShowDetailModal(true);
      }}
    >
      <View style={styles.dataCardHeader}>
        <View style={[styles.typeIcon, { backgroundColor: getTypeColor(item.type) + '20' }]}>
          <MaterialCommunityIcons
            name={getTypeIcon(item.type) as any}
            size={24}
            color={getTypeColor(item.type)}
          />
        </View>
        <View style={styles.dataCardInfo}>
          <Text style={styles.dataCardType}>{item.type.replace('_', ' ').toUpperCase()}</Text>
          <Text style={styles.dataCardUser}>{item.user_name}</Text>
          {item.organization_name && (
            <Text style={styles.dataCardOrg}>{item.organization_name}</Text>
          )}
        </View>
        <View style={styles.dataCardStatus}>
          {item.reviewed_by_admin ? (
            <View style={[styles.statusBadge, { backgroundColor: '#4CAF5020' }]}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={[styles.statusText, { color: '#4CAF50' }]}>Reviewed</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: '#FF980020' }]}>
              <Ionicons name="time" size={16} color="#FF9800" />
              <Text style={[styles.statusText, { color: '#FF9800' }]}>Pending</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.dataCardFooter}>
        <Text style={styles.dataCardTime}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading data hub...</Text>
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
        <Text style={styles.headerTitle}>Data Hub</Text>
        <TouchableOpacity onPress={() => exportData('csv')} disabled={exporting}>
          {exporting ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : (
            <Ionicons name="download" size={24} color={theme.colors.accent} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
      >
        {/* Statistics Cards */}
        {statistics && (
          <View style={styles.statsContainer}>
            <LinearGradient
              colors={['#1A3A5C', '#0D1B2A']}
              style={styles.statsCard}
            >
              <Text style={styles.statsValue}>{statistics.total_analyses}</Text>
              <Text style={styles.statsLabel}>Total Data</Text>
            </LinearGradient>
            <LinearGradient
              colors={['#00796B', '#004D40']}
              style={styles.statsCard}
            >
              <Text style={styles.statsValue}>{statistics.reviewed}</Text>
              <Text style={styles.statsLabel}>Reviewed</Text>
            </LinearGradient>
            <LinearGradient
              colors={['#FF6F00', '#E65100']}
              style={styles.statsCard}
            >
              <Text style={styles.statsValue}>{statistics.unreviewed}</Text>
              <Text style={styles.statsLabel}>Pending</Text>
            </LinearGradient>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by user, organization, type..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
          {[
            { key: 'all', label: 'All Data', icon: 'apps' },
            { key: 'unreviewed', label: 'Pending Review', icon: 'time' },
            { key: 'analyses', label: 'Analyses', icon: 'analytics' },
            { key: 'research', label: 'Research', icon: 'document-text' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, selectedTab === tab.key && styles.tabActive]}
              onPress={() => setSelectedTab(tab.key as any)}
            >
              <Ionicons
                name={tab.icon as any}
                size={18}
                color={selectedTab === tab.key ? '#fff' : theme.colors.textMuted}
              />
              <Text style={[styles.tabText, selectedTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Data List */}
        <View style={styles.dataList}>
          <Text style={styles.listTitle}>
            {filterData().length} {filterData().length === 1 ? 'Record' : 'Records'}
          </Text>
          {filterData().map((item) => (
            <View key={item._id}>
              {renderDataItem({ item })}
            </View>
          ))}
        </View>

        {/* Top Contributors */}
        {statistics && statistics.top_users.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Contributors</Text>
            {statistics.top_users.map((user, index) => (
              <View key={index} style={styles.contributorRow}>
                <View style={styles.contributorRank}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <Text style={styles.contributorName}>{user._id || 'Unknown'}</Text>
                <Text style={styles.contributorCount}>{user.count} records</Text>
              </View>
            ))}
          </View>
        )}

        {/* Export Options */}
        <View style={styles.exportSection}>
          <Text style={styles.sectionTitle}>Export Data</Text>
          <View style={styles.exportButtons}>
            <TouchableOpacity
              style={styles.exportBtn}
              onPress={() => exportData('json')}
              disabled={exporting}
            >
              <MaterialCommunityIcons name="code-json" size={24} color={theme.colors.accent} />
              <Text style={styles.exportBtnText}>Export JSON</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exportBtn}
              onPress={() => exportData('csv')}
              disabled={exporting}
            >
              <MaterialCommunityIcons name="file-excel" size={24} color="#4CAF50" />
              <Text style={styles.exportBtnText}>Export CSV</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Data Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedData && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailValue}>
                    {selectedData.type.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Submitted By</Text>
                  <Text style={styles.detailValue}>{selectedData.user_name}</Text>
                  <Text style={styles.detailSubvalue}>
                    Role: {selectedData.user_role}
                  </Text>
                  {selectedData.organization_name && (
                    <Text style={styles.detailSubvalue}>
                      Org: {selectedData.organization_name}
                    </Text>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Timestamps</Text>
                  <Text style={styles.detailSubvalue}>
                    Created: {new Date(selectedData.created_at).toLocaleString()}
                  </Text>
                  <Text style={styles.detailSubvalue}>
                    Received: {new Date(selectedData.server_received_at).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Data Content</Text>
                  <View style={styles.dataPreview}>
                    <Text style={styles.dataPreviewText}>
                      {JSON.stringify(selectedData.data, null, 2)}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                {!selectedData.reviewed_by_admin && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => reviewData(selectedData, 'approved')}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.actionBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => reviewData(selectedData, 'rejected')}
                    >
                      <Ionicons name="close-circle" size={20} color="#fff" />
                      <Text style={styles.actionBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => deleteData(selectedData)}
                >
                  <Ionicons name="trash" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Delete</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
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
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  statsCard: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  statsValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsLabel: {
    fontSize: theme.fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
  },
  tabsContainer: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
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
  dataList: {
    paddingHorizontal: theme.spacing.md,
  },
  listTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  dataCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  dataCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  dataCardInfo: {
    flex: 1,
  },
  dataCardType: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  dataCardUser: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  dataCardOrg: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  dataCardStatus: {
    marginLeft: theme.spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
  },
  dataCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  dataCardTime: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  section: {
    padding: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  contributorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  contributorRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  rankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: theme.fontSize.sm,
  },
  contributorName: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  contributorCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  exportSection: {
    padding: theme.spacing.md,
  },
  exportButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    gap: theme.spacing.sm,
  },
  exportBtnText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    marginTop: 60,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  detailSection: {
    marginBottom: theme.spacing.lg,
  },
  detailLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  detailValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  detailSubvalue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  dataPreview: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    maxHeight: 200,
  },
  dataPreviewText: {
    fontFamily: 'monospace',
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  approveBtn: {
    backgroundColor: '#4CAF50',
  },
  rejectBtn: {
    backgroundColor: '#FF5252',
  },
  deleteBtn: {
    backgroundColor: '#757575',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xxl,
  },
});
