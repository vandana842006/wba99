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
  Switch,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import api from '../../src/utils/api';
import { useStore } from '../../src/store/useStore';

interface PhysioUser {
  id: string;
  name: string;
  email: string;
  subscription_status?: string;
  permissions?: PhysioPermissions;
  created_at: string;
}

interface PhysioPermissions {
  ai_analysis: boolean;
  pdf_reports: boolean;
  patient_management: boolean;
  video_analysis: boolean;
  fms_assessment: boolean;
  msk_assessment: boolean;
  anthropometry: boolean;
  walking_analysis: boolean;
  running_analysis: boolean;
  posture_analysis: boolean;
  certifications: boolean;
  education: boolean;
}

const DEFAULT_PERMISSIONS: PhysioPermissions = {
  ai_analysis: true,
  pdf_reports: true,
  patient_management: true,
  video_analysis: true,
  fms_assessment: true,
  msk_assessment: true,
  anthropometry: true,
  walking_analysis: true,
  running_analysis: true,
  posture_analysis: true,
  certifications: true,
  education: true,
};

const PERMISSION_CONFIG = [
  { key: 'ai_analysis', label: 'AI Analysis', icon: 'analytics', description: 'AI-powered pose and gait analysis', color: theme.colors.accent },
  { key: 'pdf_reports', label: 'PDF Reports', icon: 'document-text', description: 'Generate and download PDF reports', color: '#9C27B0' },
  { key: 'patient_management', label: 'Patient Management', icon: 'people', description: 'Add, edit, and manage patients', color: theme.colors.success },
  { key: 'video_analysis', label: 'Video Analysis', icon: 'videocam', description: 'Upload and analyze videos', color: '#FF5722' },
  { key: 'fms_assessment', label: 'FMS Assessment', icon: 'body', description: 'Functional Movement Screen tests', color: theme.colors.warning },
  { key: 'msk_assessment', label: 'MSK Assessment', icon: 'fitness', description: 'Musculoskeletal assessment tools', color: theme.colors.error },
  { key: 'anthropometry', label: 'Anthropometry', icon: 'resize', description: 'Body measurements and inclinometer', color: '#00BCD4' },
  { key: 'walking_analysis', label: 'Walking Analysis', icon: 'walk', description: 'Gait analysis for walking', color: '#4CAF50' },
  { key: 'running_analysis', label: 'Running Analysis', icon: 'speedometer', description: 'Running gait analysis', color: '#E91E63' },
  { key: 'posture_analysis', label: 'Posture Analysis', icon: 'man', description: 'Static posture assessment', color: '#673AB7' },
  { key: 'certifications', label: 'Certifications', icon: 'ribbon', description: 'Access to certification exams', color: '#D4AF37' },
  { key: 'education', label: 'Education', icon: 'book', description: 'Access to courses and materials', color: '#607D8B' },
];

export default function PhysioControlPanel() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [physios, setPhysios] = useState<PhysioUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhysio, setSelectedPhysio] = useState<PhysioUser | null>(null);
  const [permissions, setPermissions] = useState<PhysioPermissions>(DEFAULT_PERMISSIONS);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPhysios();
  }, []);

  const fetchPhysios = async () => {
    try {
      const response = await api.get('/users?role=physio');
      const physiosWithPermissions = response.data.map((p: PhysioUser) => ({
        ...p,
        permissions: p.permissions || DEFAULT_PERMISSIONS,
      }));
      setPhysios(physiosWithPermissions);
    } catch (error) {
      console.error('Error fetching physios:', error);
    } finally {
      setLoading(false);
    }
  };

  const openPhysioSettings = (physio: PhysioUser) => {
    setSelectedPhysio(physio);
    setPermissions(physio.permissions || DEFAULT_PERMISSIONS);
  };

  const handleTogglePermission = (key: keyof PhysioPermissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSavePermissions = async () => {
    if (!selectedPhysio) return;
    
    setSaving(true);
    try {
      // In production, this would call an API endpoint to save permissions
      await api.put(`/users/${selectedPhysio.id}`, {
        permissions: permissions,
      });
      
      // Update local state
      setPhysios(prev => prev.map(p => 
        p.id === selectedPhysio.id ? { ...p, permissions } : p
      ));
      
      Alert.alert('Success', `Permissions updated for ${selectedPhysio.name}`);
      setSelectedPhysio(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleEnableAll = () => {
    const allEnabled: PhysioPermissions = {} as PhysioPermissions;
    Object.keys(DEFAULT_PERMISSIONS).forEach(key => {
      allEnabled[key as keyof PhysioPermissions] = true;
    });
    setPermissions(allEnabled);
  };

  const handleDisableAll = () => {
    const allDisabled: PhysioPermissions = {} as PhysioPermissions;
    Object.keys(DEFAULT_PERMISSIONS).forEach(key => {
      allDisabled[key as keyof PhysioPermissions] = false;
    });
    setPermissions(allDisabled);
  };

  const getActivePermissionsCount = (perms: PhysioPermissions) => {
    return Object.values(perms).filter(Boolean).length;
  };

  const filteredPhysios = physios.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading physios...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Physio Control Panel</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={28} color={theme.colors.accent} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Permission Management</Text>
            <Text style={styles.infoText}>
              Control what features each physiotherapist can access. Toggle permissions on/off for granular control.
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="doctor" size={24} color={theme.colors.accent} />
            <Text style={styles.statValue}>{physios.length}</Text>
            <Text style={styles.statLabel}>Total Physios</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
            <Text style={styles.statValue}>
              {physios.filter(p => p.subscription_status === 'active' || p.subscription_status === 'premium').length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="settings" size={24} color={theme.colors.warning} />
            <Text style={styles.statValue}>{PERMISSION_CONFIG.length}</Text>
            <Text style={styles.statLabel}>Features</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search physios..."
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

        {/* Physio List */}
        <Text style={styles.sectionTitle}>Physiotherapists</Text>
        
        {filteredPhysios.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No physios found</Text>
          </View>
        ) : (
          filteredPhysios.map((physio) => {
            const perms = physio.permissions || DEFAULT_PERMISSIONS;
            const activeCount = getActivePermissionsCount(perms);
            const totalCount = PERMISSION_CONFIG.length;
            
            return (
              <TouchableOpacity
                key={physio.id}
                style={styles.physioCard}
                onPress={() => openPhysioSettings(physio)}
              >
                <View style={styles.physioAvatar}>
                  <Text style={styles.physioAvatarText}>
                    {physio.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.physioInfo}>
                  <Text style={styles.physioName}>{physio.name}</Text>
                  <Text style={styles.physioEmail}>{physio.email}</Text>
                  <View style={styles.permissionSummary}>
                    <View style={styles.permissionBar}>
                      <View 
                        style={[
                          styles.permissionBarFill, 
                          { width: `${(activeCount / totalCount) * 100}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.permissionCount}>
                      {activeCount}/{totalCount} Features
                    </Text>
                  </View>
                </View>
                <View style={styles.physioActions}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: physio.subscription_status === 'active' || physio.subscription_status === 'premium' 
                      ? theme.colors.success + '20' 
                      : theme.colors.warning + '20' 
                    }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: physio.subscription_status === 'active' || physio.subscription_status === 'premium'
                        ? theme.colors.success 
                        : theme.colors.warning 
                      }
                    ]}>
                      {physio.subscription_status || 'Free'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Permission Settings Modal */}
      <Modal visible={!!selectedPhysio} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Permissions</Text>
              <TouchableOpacity onPress={() => setSelectedPhysio(null)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedPhysio && (
              <>
                <View style={styles.physioModalInfo}>
                  <View style={styles.physioAvatarLarge}>
                    <Text style={styles.physioAvatarTextLarge}>
                      {selectedPhysio.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.physioModalName}>{selectedPhysio.name}</Text>
                  <Text style={styles.physioModalEmail}>{selectedPhysio.email}</Text>
                </View>

                <View style={styles.quickActions}>
                  <TouchableOpacity style={styles.quickActionBtn} onPress={handleEnableAll}>
                    <Ionicons name="checkmark-done" size={18} color={theme.colors.success} />
                    <Text style={[styles.quickActionText, { color: theme.colors.success }]}>Enable All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickActionBtn} onPress={handleDisableAll}>
                    <Ionicons name="close" size={18} color={theme.colors.error} />
                    <Text style={[styles.quickActionText, { color: theme.colors.error }]}>Disable All</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.permissionsList}>
                  {PERMISSION_CONFIG.map((config) => (
                    <View key={config.key} style={styles.permissionItem}>
                      <View style={[styles.permissionIcon, { backgroundColor: config.color + '20' }]}>
                        <Ionicons name={config.icon as any} size={20} color={config.color} />
                      </View>
                      <View style={styles.permissionInfo}>
                        <Text style={styles.permissionLabel}>{config.label}</Text>
                        <Text style={styles.permissionDesc}>{config.description}</Text>
                      </View>
                      <Switch
                        value={permissions[config.key as keyof PhysioPermissions]}
                        onValueChange={() => handleTogglePermission(config.key as keyof PhysioPermissions)}
                        trackColor={{ false: theme.colors.cardBorder, true: config.color + '60' }}
                        thumbColor={permissions[config.key as keyof PhysioPermissions] ? config.color : '#f4f3f4'}
                      />
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSavePermissions}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={theme.colors.textPrimary} />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={24} color={theme.colors.textPrimary} />
                      <Text style={styles.saveButtonText}>Save Permissions</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: theme.colors.textSecondary, marginTop: theme.spacing.md },
  scrollContent: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  backButton: { padding: theme.spacing.xs },
  headerTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  
  infoCard: { flexDirection: 'row', backgroundColor: theme.colors.accent + '20', borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.lg, gap: theme.spacing.md },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: 4 },
  infoText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 20 },

  statsRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  statCard: { flex: 1, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.cardBorder },
  statValue: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginTop: theme.spacing.xs },
  statLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.lg, gap: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.cardBorder },
  searchInput: { flex: 1, fontSize: theme.fontSize.md, color: theme.colors.textPrimary },

  sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  
  emptyCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.cardBorder },
  emptyText: { fontSize: theme.fontSize.md, color: theme.colors.textMuted, marginTop: theme.spacing.md },

  physioCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.cardBorder },
  physioAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  physioAvatarText: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  physioInfo: { flex: 1 },
  physioName: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  physioEmail: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginBottom: theme.spacing.xs },
  permissionSummary: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  permissionBar: { flex: 1, height: 4, backgroundColor: theme.colors.cardBorder, borderRadius: 2, maxWidth: 100 },
  permissionBarFill: { height: '100%', backgroundColor: theme.colors.success, borderRadius: 2 },
  permissionCount: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary },
  physioActions: { alignItems: 'flex-end', gap: theme.spacing.xs },
  statusBadge: { paddingHorizontal: theme.spacing.sm, paddingVertical: 2, borderRadius: theme.borderRadius.sm },
  statusText: { fontSize: 10, fontWeight: theme.fontWeight.bold, textTransform: 'capitalize' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.primary, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder },
  modalTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  
  physioModalInfo: { alignItems: 'center', paddingVertical: theme.spacing.lg },
  physioAvatarLarge: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.sm },
  physioAvatarTextLarge: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  physioModalName: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  physioModalEmail: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },

  quickActions: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.lg, paddingBottom: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder },
  quickActionBtn: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  quickActionText: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold },

  permissionsList: { paddingHorizontal: theme.spacing.lg },
  permissionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder },
  permissionIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  permissionInfo: { flex: 1 },
  permissionLabel: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.medium, color: theme.colors.textPrimary },
  permissionDesc: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: 2 },

  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.success, borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, margin: theme.spacing.lg, gap: theme.spacing.sm },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
});
