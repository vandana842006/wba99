import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store/useStore';
import { theme } from '../../src/utils/theme';

interface SensorDevice {
  id: string;
  name: string;
  type: 'posture' | 'gait' | 'strength' | 'balance';
  status: 'connected' | 'disconnected' | 'scanning';
  lastSync?: string;
  dataPoints?: number;
  icon: string;
}

const mockDevices: SensorDevice[] = [
  {
    id: '1',
    name: 'WBA99 Posture Sensor',
    type: 'posture',
    status: 'connected',
    lastSync: '2 min ago',
    dataPoints: 1247,
    icon: 'human-handsup',
  },
  {
    id: '2',
    name: 'WBA99 Gait Analyzer',
    type: 'gait',
    status: 'disconnected',
    lastSync: '1 hour ago',
    dataPoints: 892,
    icon: 'walk',
  },
  {
    id: '3',
    name: 'WBA99 Force Plate',
    type: 'strength',
    status: 'disconnected',
    lastSync: '3 days ago',
    dataPoints: 456,
    icon: 'weight-lifter',
  },
  {
    id: '4',
    name: 'WBA99 Balance Board',
    type: 'balance',
    status: 'disconnected',
    lastSync: '1 week ago',
    dataPoints: 234,
    icon: 'scale-balance',
  },
];

export default function SensorImportScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [devices, setDevices] = useState<SensorDevice[]>(mockDevices);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);

  const handleScan = () => {
    setScanning(true);
    Alert.alert(
      'Scanning for Devices',
      'Please ensure your WBA99 sensors are powered on and in pairing mode.',
      [{ text: 'OK' }]
    );
    setTimeout(() => {
      setScanning(false);
      // Simulate finding a device
      setDevices(prev => prev.map(d => 
        d.id === '2' ? { ...d, status: 'connected' as const } : d
      ));
    }, 3000);
  };

  const handleImport = async (device: SensorDevice) => {
    if (device.status !== 'connected') {
      Alert.alert('Device Not Connected', 'Please connect the device first before importing data.');
      return;
    }
    
    setImporting(device.id);
    
    // Simulate import
    setTimeout(() => {
      setImporting(null);
      Alert.alert(
        'Import Complete',
        `Successfully imported ${device.dataPoints} data points from ${device.name} into the Research Engine.`,
        [{ text: 'OK' }]
      );
    }, 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return '#22C55E';
      case 'scanning': return '#F59E0B';
      default: return '#EF4444';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'posture': return '#00BCD4';
      case 'gait': return '#9C27B0';
      case 'strength': return '#FF5722';
      case 'balance': return '#4CAF50';
      default: return theme.colors.primary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Sensor Integration</Text>
          <Text style={styles.headerSubtitle}>WBA99 Device Management</Text>
        </View>
        <TouchableOpacity 
          style={[styles.scanBtn, scanning && styles.scanBtnActive]}
          onPress={handleScan}
          disabled={scanning}
        >
          {scanning ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialCommunityIcons name="bluetooth-audio" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Connection Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <MaterialCommunityIcons name="access-point-network" size={32} color="#00BCD4" />
          </View>
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>WBA99 Sensor Network</Text>
            <Text style={styles.statusText}>
              {devices.filter(d => d.status === 'connected').length} of {devices.length} devices connected
            </Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: devices.some(d => d.status === 'connected') ? '#22C55E20' : '#EF444420' }
          ]}>
            <View style={[
              styles.statusDot,
              { backgroundColor: devices.some(d => d.status === 'connected') ? '#22C55E' : '#EF4444' }
            ]} />
            <Text style={[
              styles.statusBadgeText,
              { color: devices.some(d => d.status === 'connected') ? '#22C55E' : '#EF4444' }
            ]}>
              {devices.some(d => d.status === 'connected') ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Devices List */}
        <Text style={styles.sectionTitle}>Available Devices</Text>
        
        {devices.map(device => (
          <View key={device.id} style={styles.deviceCard}>
            <View style={[styles.deviceIcon, { backgroundColor: getTypeColor(device.type) + '20' }]}>
              <MaterialCommunityIcons 
                name={device.icon as any} 
                size={28} 
                color={getTypeColor(device.type)} 
              />
            </View>
            
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>{device.name}</Text>
              <View style={styles.deviceMeta}>
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDotSmall, { backgroundColor: getStatusColor(device.status) }]} />
                  <Text style={[styles.statusTextSmall, { color: getStatusColor(device.status) }]}>
                    {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                  </Text>
                </View>
                {device.lastSync && (
                  <Text style={styles.lastSync}>Last sync: {device.lastSync}</Text>
                )}
              </View>
              {device.dataPoints && (
                <Text style={styles.dataPoints}>{device.dataPoints.toLocaleString()} data points available</Text>
              )}
            </View>
            
            <TouchableOpacity 
              style={[
                styles.importBtn,
                device.status !== 'connected' && styles.importBtnDisabled,
                importing === device.id && styles.importBtnLoading
              ]}
              onPress={() => handleImport(device)}
              disabled={importing === device.id || device.status !== 'connected'}
            >
              {importing === device.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons 
                    name="database-import" 
                    size={18} 
                    color={device.status === 'connected' ? '#fff' : '#666'} 
                  />
                  <Text style={[
                    styles.importBtnText,
                    device.status !== 'connected' && styles.importBtnTextDisabled
                  ]}>
                    Import
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ))}

        {/* Quick Import Section */}
        <View style={styles.quickImportSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#00BCD420' }]}>
              <MaterialCommunityIcons name="database-sync" size={24} color="#00BCD4" />
            </View>
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionTitle}>Sync All Devices</Text>
              <Text style={styles.quickActionDesc}>Import all available data from connected devices</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#9C27B020' }]}>
              <MaterialCommunityIcons name="clock-outline" size={24} color="#9C27B0" />
            </View>
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionTitle}>Schedule Auto-Sync</Text>
              <Text style={styles.quickActionDesc}>Set up automatic data synchronization</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#FF572220' }]}>
              <MaterialCommunityIcons name="cog-outline" size={24} color="#FF5722" />
            </View>
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionTitle}>Device Settings</Text>
              <Text style={styles.quickActionDesc}>Configure sensor calibration and preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <MaterialCommunityIcons name="help-circle-outline" size={20} color={theme.colors.textMuted} />
          <Text style={styles.helpText}>
            Need help setting up your WBA99 sensors? Visit our support documentation or contact technical support.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  scanBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00BCD4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBtnActive: {
    backgroundColor: '#F59E0B',
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#00BCD440',
  },
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00BCD420',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  statusTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.textPrimary,
  },
  statusText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold as any,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  deviceIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  deviceName: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.textPrimary,
  },
  deviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTextSmall: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium as any,
  },
  lastSync: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  dataPoints: {
    fontSize: theme.fontSize.xs,
    color: '#00BCD4',
    marginTop: 4,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00BCD4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  importBtnDisabled: {
    backgroundColor: theme.colors.border,
  },
  importBtnLoading: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
  },
  importBtnText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold as any,
    color: '#fff',
  },
  importBtnTextDisabled: {
    color: '#666',
  },
  quickImportSection: {
    marginTop: theme.spacing.lg,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  quickActionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.textPrimary,
  },
  quickActionDesc: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  helpText: {
    flex: 1,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
});
