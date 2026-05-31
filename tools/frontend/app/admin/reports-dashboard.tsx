import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import api from '../../src/utils/api';

interface ReportStats {
  total_reports: number;
  today_reports: number;
  yesterday_reports: number;
  week_reports: number;
  month_reports: number;
  by_type: Record<string, number>;
  by_role: Record<string, number>;
  by_organization: Array<{ name: string; count: number }>;
  daily_trend: Array<{ date: string; count: number }>;
  top_generators: Array<{ id: string; name: string; role: string; count: number }>;
  total_revenue: number;
  today_revenue: number;
}

interface Report {
  id: string;
  report_type: string;
  report_name: string;
  generated_by_name: string;
  generated_by_role: string;
  organization_name?: string;
  patient_name?: string;
  amount_paid: number;
  created_at: string;
  date_str: string;
}

interface PhysioReport {
  physio_id: string;
  physio_name: string;
  role: string;
  organization?: string;
  total_reports: number;
  total_revenue: number;
  report_types: string[];
  last_report: string;
}

interface OrgReport {
  organization_id: string;
  organization_name: string;
  total_reports: number;
  total_revenue: number;
  physio_count: number;
  physios: string[];
  report_types: string[];
}

type TabType = 'overview' | 'reports' | 'physios' | 'organizations';

export default function AdminReportsDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [physioReports, setPhysioReports] = useState<PhysioReport[]>([]);
  const [orgReports, setOrgReports] = useState<OrgReport[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, reportsRes, physioRes, orgRes] = await Promise.all([
        api.get('/admin/reports/statistics'),
        api.get('/admin/reports?limit=50'),
        api.get('/admin/reports/by-physio'),
        api.get('/admin/reports/by-organization'),
      ]);
      
      setStats(statsRes.data);
      setReports(reportsRes.data.reports || []);
      setPhysioReports(physioRes.data || []);
      setOrgReports(orgRes.data || []);
    } catch (error) {
      console.error('Error fetching reports data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, { name: string; color: string }> = {
      posture: { name: 'human', color: '#4CAF50' },
      gait: { name: 'walk', color: '#2196F3' },
      fms: { name: 'run', color: '#FF9800' },
      rom: { name: 'rotate-3d-variant', color: '#9C27B0' },
      certification: { name: 'certificate', color: '#FFD700' },
      assessment: { name: 'clipboard-check', color: '#00BCD4' },
    };
    return icons[type] || { name: 'file-document', color: '#607D8B' };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading Reports Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Reports Dashboard</Text>
          <Text style={styles.headerSubtitle}>All Reports & Analytics</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={22} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['overview', 'reports', 'physios', 'organizations'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'physios' ? 'Physios' : tab === 'organizations' ? 'Orgs' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
      >
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, { backgroundColor: '#1E88E5' }]}>
                <MaterialCommunityIcons name="file-document-multiple" size={28} color="#fff" />
                <Text style={styles.summaryValue}>{stats.total_reports}</Text>
                <Text style={styles.summaryLabel}>Total Reports</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#43A047' }]}>
                <Ionicons name="today" size={28} color="#fff" />
                <Text style={styles.summaryValue}>{stats.today_reports}</Text>
                <Text style={styles.summaryLabel}>Today</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#FF9800' }]}>
                <MaterialCommunityIcons name="calendar-week" size={28} color="#fff" />
                <Text style={styles.summaryValue}>{stats.week_reports}</Text>
                <Text style={styles.summaryLabel}>This Week</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#9C27B0' }]}>
                <MaterialCommunityIcons name="currency-inr" size={28} color="#fff" />
                <Text style={styles.summaryValue}>₹{stats.total_revenue.toLocaleString()}</Text>
                <Text style={styles.summaryLabel}>Total Revenue</Text>
              </View>
            </View>

            {/* By Report Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reports by Type</Text>
              <View style={styles.typeGrid}>
                {Object.entries(stats.by_type).map(([type, count]) => {
                  const icon = getTypeIcon(type);
                  return (
                    <View key={type} style={styles.typeCard}>
                      <MaterialCommunityIcons name={icon.name as any} size={24} color={icon.color} />
                      <Text style={styles.typeCount}>{count}</Text>
                      <Text style={styles.typeLabel}>{type.toUpperCase()}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* By Role */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reports by Role</Text>
              <View style={styles.roleList}>
                {Object.entries(stats.by_role).map(([role, count]) => (
                  <View key={role} style={styles.roleItem}>
                    <View style={styles.roleInfo}>
                      <FontAwesome5 
                        name={role === 'physio' ? 'user-md' : role === 'org_physio' ? 'users' : 'user-cog'} 
                        size={18} 
                        color={role === 'physio' ? '#4CAF50' : role === 'org_physio' ? '#2196F3' : '#FFD700'} 
                      />
                      <Text style={styles.roleName}>
                        {role === 'physio' ? 'Direct Physios' : role === 'org_physio' ? 'Org Physios' : role.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.roleCount}>
                      <Text style={styles.roleCountText}>{count}</Text>
                      <Text style={styles.roleCountLabel}>reports</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Top Organizations */}
            {stats.by_organization.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Organizations</Text>
                {stats.by_organization.map((org, index) => (
                  <View key={org.name} style={styles.orgItem}>
                    <View style={[styles.orgRank, { backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32' }]}>
                      <Text style={styles.orgRankText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.orgName}>{org.name}</Text>
                    <Text style={styles.orgCount}>{org.count} reports</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Top Generators */}
            {stats.top_generators && stats.top_generators.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Report Generators</Text>
                {stats.top_generators.slice(0, 5).map((gen, index) => (
                  <View key={gen.id} style={styles.generatorItem}>
                    <View style={styles.generatorInfo}>
                      <FontAwesome5 name="user-md" size={16} color={theme.colors.accent} />
                      <View>
                        <Text style={styles.generatorName}>{gen.name}</Text>
                        <Text style={styles.generatorRole}>{gen.role}</Text>
                      </View>
                    </View>
                    <View style={styles.generatorCount}>
                      <Text style={styles.generatorCountText}>{gen.count}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Daily Trend */}
            {stats.daily_trend.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Daily Trend (Last 7 Days)</Text>
                <View style={styles.trendContainer}>
                  {stats.daily_trend.map((day, index) => (
                    <View key={day.date} style={styles.trendBar}>
                      <View 
                        style={[
                          styles.trendFill, 
                          { height: Math.max(20, (day.count / Math.max(...stats.daily_trend.map(d => d.count))) * 80) }
                        ]} 
                      />
                      <Text style={styles.trendCount}>{day.count}</Text>
                      <Text style={styles.trendDate}>{day.date.slice(5)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Reports ({reports.length})</Text>
            {reports.map((report) => {
              const icon = getTypeIcon(report.report_type);
              return (
                <View key={report.id} style={styles.reportItem}>
                  <View style={[styles.reportIcon, { backgroundColor: icon.color + '20' }]}>
                    <MaterialCommunityIcons name={icon.name as any} size={22} color={icon.color} />
                  </View>
                  <View style={styles.reportInfo}>
                    <Text style={styles.reportName}>{report.report_name}</Text>
                    <View style={styles.reportMeta}>
                      <Text style={styles.reportMetaText}>
                        <FontAwesome5 name="user-md" size={10} color={theme.colors.textMuted} /> {report.generated_by_name}
                      </Text>
                      {report.organization_name && (
                        <Text style={styles.reportMetaText}>
                          <FontAwesome5 name="building" size={10} color={theme.colors.textMuted} /> {report.organization_name}
                        </Text>
                      )}
                    </View>
                    <View style={styles.reportMeta}>
                      <Text style={styles.reportMetaText}>
                        <Ionicons name="person" size={10} color={theme.colors.textMuted} /> {report.patient_name || 'N/A'}
                      </Text>
                      <Text style={styles.reportDate}>{formatDate(report.created_at)} {formatTime(report.created_at)}</Text>
                    </View>
                  </View>
                  <View style={styles.reportAmount}>
                    <Text style={styles.reportAmountText}>₹{report.amount_paid}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Physios Tab */}
        {activeTab === 'physios' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reports by Physio ({physioReports.length})</Text>
            {physioReports.map((physio) => (
              <View key={physio.physio_id} style={styles.physioCard}>
                <View style={styles.physioHeader}>
                  <View style={styles.physioAvatar}>
                    <FontAwesome5 name="user-md" size={20} color="#fff" />
                  </View>
                  <View style={styles.physioInfo}>
                    <Text style={styles.physioName}>{physio.physio_name}</Text>
                    <Text style={styles.physioRole}>
                      {physio.role === 'org_physio' ? 'Organization Physio' : 'Direct Physio'}
                      {physio.organization && ` • ${physio.organization}`}
                    </Text>
                  </View>
                </View>
                <View style={styles.physioStats}>
                  <View style={styles.physioStatItem}>
                    <Text style={styles.physioStatValue}>{physio.total_reports}</Text>
                    <Text style={styles.physioStatLabel}>Reports</Text>
                  </View>
                  <View style={styles.physioStatItem}>
                    <Text style={styles.physioStatValue}>₹{physio.total_revenue.toLocaleString()}</Text>
                    <Text style={styles.physioStatLabel}>Revenue</Text>
                  </View>
                  <View style={styles.physioStatItem}>
                    <Text style={styles.physioStatValue}>{physio.report_types.length}</Text>
                    <Text style={styles.physioStatLabel}>Types</Text>
                  </View>
                </View>
                <View style={styles.physioTypes}>
                  {physio.report_types.map((type) => (
                    <View key={type} style={[styles.typeTag, { backgroundColor: getTypeIcon(type).color + '20' }]}>
                      <Text style={[styles.typeTagText, { color: getTypeIcon(type).color }]}>{type}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Organizations Tab */}
        {activeTab === 'organizations' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reports by Organization ({orgReports.length})</Text>
            {orgReports.length === 0 ? (
              <View style={styles.emptyState}>
                <FontAwesome5 name="building" size={40} color={theme.colors.textMuted} />
                <Text style={styles.emptyStateText}>No organization reports yet</Text>
              </View>
            ) : (
              orgReports.map((org) => (
                <View key={org.organization_id} style={styles.orgCard}>
                  <View style={styles.orgCardHeader}>
                    <View style={styles.orgCardIcon}>
                      <FontAwesome5 name="building" size={20} color="#fff" />
                    </View>
                    <View style={styles.orgCardInfo}>
                      <Text style={styles.orgCardName}>{org.organization_name}</Text>
                      <Text style={styles.orgCardPhysios}>{org.physio_count} Physios</Text>
                    </View>
                  </View>
                  <View style={styles.orgCardStats}>
                    <View style={styles.orgCardStatItem}>
                      <Text style={styles.orgCardStatValue}>{org.total_reports}</Text>
                      <Text style={styles.orgCardStatLabel}>Total Reports</Text>
                    </View>
                    <View style={styles.orgCardStatItem}>
                      <Text style={styles.orgCardStatValue}>₹{org.total_revenue.toLocaleString()}</Text>
                      <Text style={styles.orgCardStatLabel}>Revenue</Text>
                    </View>
                  </View>
                  <View style={styles.orgCardPhysioList}>
                    <Text style={styles.orgCardPhysioLabel}>Physios:</Text>
                    <Text style={styles.orgCardPhysioNames}>{org.physios.join(', ')}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textMuted,
    marginTop: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'ios' ? 10 : 35,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1A3A5C',
  },
  backBtn: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.gold,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  refreshBtn: {
    padding: 8,
  },
  tabs: {
    flexDirection: 'row',
    padding: 10,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: theme.colors.accent,
  },
  tabText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    width: '48%',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  section: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.gold,
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    width: '31%',
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  typeCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 6,
  },
  typeLabel: {
    fontSize: 9,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  roleList: {
    gap: 10,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 10,
  },
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  roleCount: {
    alignItems: 'flex-end',
  },
  roleCountText: {
    color: theme.colors.gold,
    fontSize: 18,
    fontWeight: 'bold',
  },
  roleCountLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
  },
  orgItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 10,
  },
  orgRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgRankText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  orgName: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  orgCount: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  generatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  generatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  generatorName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  generatorRole: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  generatorCount: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  generatorCountText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  trendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 20,
  },
  trendBar: {
    flex: 1,
    alignItems: 'center',
  },
  trendFill: {
    width: 30,
    backgroundColor: theme.colors.accent,
    borderRadius: 5,
  },
  trendCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5,
  },
  trendDate: {
    color: theme.colors.textMuted,
    fontSize: 9,
    marginTop: 2,
  },
  reportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    gap: 12,
  },
  reportIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportInfo: {
    flex: 1,
  },
  reportName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  reportMeta: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  reportMetaText: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  reportDate: {
    color: theme.colors.textMuted,
    fontSize: 10,
  },
  reportAmount: {
    backgroundColor: theme.colors.gold + '20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reportAmountText: {
    color: theme.colors.gold,
    fontWeight: 'bold',
    fontSize: 13,
  },
  physioCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },
  physioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
  },
  physioAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  physioInfo: {
    flex: 1,
  },
  physioName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  physioRole: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  physioStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#1A3A5C',
    paddingTop: 12,
    marginBottom: 12,
  },
  physioStatItem: {
    alignItems: 'center',
  },
  physioStatValue: {
    color: theme.colors.gold,
    fontSize: 18,
    fontWeight: 'bold',
  },
  physioStatLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  physioTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    color: theme.colors.textMuted,
    marginTop: 15,
  },
  orgCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },
  orgCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
  },
  orgCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgCardInfo: {
    flex: 1,
  },
  orgCardName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  orgCardPhysios: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  orgCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1A3A5C',
    paddingVertical: 12,
    marginBottom: 12,
  },
  orgCardStatItem: {
    alignItems: 'center',
  },
  orgCardStatValue: {
    color: theme.colors.gold,
    fontSize: 18,
    fontWeight: 'bold',
  },
  orgCardStatLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  orgCardPhysioList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  orgCardPhysioLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  orgCardPhysioNames: {
    color: theme.colors.accent,
    fontSize: 11,
    flex: 1,
  },
});
