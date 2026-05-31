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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { getPhysioPatients, getAssessments, getAssignedExercises } from '../../src/utils/api';
import { useStore, User, Assessment, AssignedExercise } from '../../src/store/useStore';
import api from '../../src/utils/api';

// Demo accounts exempt from credit checks
const DEMO_ACCOUNTS = [
  'sarah@wba99.com',
  'admin@wba99.com',
  'sarahpatient@wba99.com',
  'demo@wba99.com',
  'test@wba99.com',
  'sportsphysio009@gmail.com',
  'sportsphysio001@gmail.com',
  'wba99physio@gmail.com',
];

interface AccountStatus {
  status: string;
  credits: number;
  needs_recharge: boolean;
  message: string;
}

export default function PhysioDashboard() {
  const router = useRouter();
  const { currentUser, logout } = useStore();
  const [patients, setPatients] = useState<User[]>([]);
  const [recentAssessments, setRecentAssessments] = useState<Assessment[]>([]);
  const [pendingExercises, setPendingExercises] = useState<AssignedExercise[]>([]);
  const [loading, setLoading] = useState(!!currentUser?.id);
  const [refreshing, setRefreshing] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [profileSettings, setProfileSettings] = useState<{
    clinic_name?: string;
    logo_url?: string;
  } | null>(null);

  const isDemoAccount = () => {
    return DEMO_ACCOUNTS.includes(currentUser?.email?.toLowerCase() || '');
  };

  const fetchProfileSettings = async () => {
    if (!currentUser) return;
    try {
      const response = await api.get(`/users/${currentUser.id}/profile-settings`);
      setProfileSettings(response.data);
    } catch (error) {
      console.error('Error fetching profile settings:', error);
    }
  };

  const fetchAccountStatus = async () => {
    if (!currentUser || isDemoAccount()) {
      setAccountStatus({ status: 'active', credits: -1, needs_recharge: false, message: 'Demo account' });
      return;
    }

    try {
      const response = await api.get(`/users/${currentUser.id}/account-status`);
      setAccountStatus(response.data);
    } catch (error) {
      console.error('Error fetching account status:', error);
    }
  };

  const fetchData = async () => {
    if (!currentUser) return;
    
    try {
      const [patientsRes, assessmentsRes, exercisesRes] = await Promise.all([
        getPhysioPatients(currentUser.id),
        getAssessments({ physio_id: currentUser.id }),
        getAssignedExercises({ physio_id: currentUser.id }),
      ]);
      
      setPatients(patientsRes.data);
      setRecentAssessments(assessmentsRes.data.slice(0, 5));
      setPendingExercises(exercisesRes.data.filter((e: AssignedExercise) => e.status !== 'completed'));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAccountStatus();
    fetchProfileSettings();
  }, [currentUser]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
    fetchAccountStatus();
    fetchProfileSettings();
  };

  // Check if feature access is allowed
  const checkFeatureAccess = (featureName: string, onAllow: () => void) => {
    if (isDemoAccount() || (accountStatus?.status === 'active' && (accountStatus?.credits > 0 || accountStatus?.credits === -1))) {
      onAllow();
      return;
    }

    if (accountStatus?.status === 'pending_recharge') {
      Alert.alert(
        '⚠️ Account Not Activated',
        'Please recharge your account to access this feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Recharge Now', onPress: () => router.push('/physio/credits-wallet') }
        ]
      );
      return;
    }

    if (accountStatus?.credits === 0) {
      Alert.alert(
        '⚠️ Credits Exhausted',
        `You need credits to use "${featureName}". Please recharge your account.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Recharge Now', onPress: () => router.push('/physio/credits-wallet') }
        ]
      );
      return;
    }

    // Allow by default if status check failed
    onAllow();
  };

  const getAssessmentIcon = (type: string) => {
    switch (type) {
      case 'posture':
        return <MaterialCommunityIcons name="human" size={20} color={theme.colors.accent} />;
      case 'walking':
        return <MaterialCommunityIcons name="walk" size={20} color={theme.colors.success} />;
      case 'running':
        return <MaterialCommunityIcons name="run" size={20} color={theme.colors.warning} />;
      case 'msk':
        return <MaterialCommunityIcons name="bone" size={20} color={theme.colors.error} />;
      default:
        return <Ionicons name="clipboard" size={20} color={theme.colors.textSecondary} />;
    }
  };

  // Check if user is logged in - if not, show login prompt
  if (!currentUser?.id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="person-circle" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.loadingText}>Please log in to access the dashboard</Text>
          <TouchableOpacity 
            style={[styles.buyCreditsBtn, { marginTop: 20, paddingHorizontal: 30 }]}
            onPress={() => router.replace('/auth/login?role=physio')}
          >
            <Text style={styles.buyCreditsText}>LOGIN</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading state while data is being fetched (only if user is logged in)
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render credit warning banner
  const renderCreditBanner = () => {
    if (isDemoAccount()) return null;
    
    if (accountStatus?.status === 'pending_recharge') {
      return (
        <TouchableOpacity 
          style={[styles.creditBanner, { backgroundColor: theme.colors.error }]}
          onPress={() => router.push('/physio/credits-wallet')}
        >
          <Ionicons name="warning" size={24} color="#fff" />
          <View style={styles.creditBannerText}>
            <Text style={styles.creditBannerTitle}>Account Not Activated</Text>
            <Text style={styles.creditBannerSubtitle}>Tap to recharge and activate your account</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>
      );
    }

    if (accountStatus?.credits === 0) {
      return (
        <TouchableOpacity 
          style={[styles.creditBanner, { backgroundColor: theme.colors.warning }]}
          onPress={() => router.push('/physio/credits-wallet')}
        >
          <Ionicons name="wallet" size={24} color="#fff" />
          <View style={styles.creditBannerText}>
            <Text style={styles.creditBannerTitle}>Credits Exhausted</Text>
            <Text style={styles.creditBannerSubtitle}>Tap to recharge and continue using features</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>
      );
    }

    if (accountStatus?.credits !== -1 && accountStatus?.credits && accountStatus.credits < 20) {
      return (
        <TouchableOpacity 
          style={[styles.creditBanner, { backgroundColor: theme.colors.accent }]}
          onPress={() => router.push('/physio/credits-wallet')}
        >
          <MaterialCommunityIcons name="wallet-outline" size={24} color="#fff" />
          <View style={styles.creditBannerText}>
            <Text style={styles.creditBannerTitle}>{accountStatus.credits} Credits Remaining</Text>
            <Text style={styles.creditBannerSubtitle}>Low balance - tap to recharge</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
      >
        {/* Organization/Clinic Header */}
        <TouchableOpacity 
          style={styles.organizationSection}
          onPress={() => router.push('/physio/settings')}
        >
          {profileSettings?.logo_url ? (
            <Image 
              source={{ uri: profileSettings.logo_url }}
              style={styles.organizationLogo}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.organizationLogoPlaceholder}>
              <Ionicons name="business" size={32} color={theme.colors.textSecondary} />
            </View>
          )}
          <View style={styles.organizationInfo}>
            <Text style={styles.organizationName}>
              {profileSettings?.clinic_name || 'Set up your clinic'}
            </Text>
            <Text style={styles.organizationHint}>
              {profileSettings?.clinic_name ? 'Tap to edit' : 'Tap to add clinic details'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome, Physio</Text>
            <Text style={styles.nameText}>{currentUser?.name}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/physio/settings')}>
              <Ionicons name="settings" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <Ionicons name="log-out" size={24} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Credit Status Banner */}
        {renderCreditBanner()}

        {/* Credit Status Info - Contact Admin for credits */}
        {!isDemoAccount() && (
          <View style={styles.buyCreditsSection}>
            <View style={styles.buyCreditsLeft}>
              <MaterialCommunityIcons name="wallet" size={36} color={theme.colors.success} />
              <View style={styles.buyCreditsInfo}>
                <Text style={styles.buyCreditsTitle}>💰 Credit Balance</Text>
                <Text style={styles.buyCreditsSubtitle}>
                  {accountStatus?.credits === -1 
                    ? 'Unlimited Access' 
                    : `Balance: ${accountStatus?.credits || 0} credits`}
                </Text>
              </View>
            </View>
            <View style={[styles.buyCreditsBtn, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.buyCreditsText}>Contact Admin for Credits</Text>
            </View>
          </View>
        )}

        {/* Stats Overview */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/physio/patients')}>
            <Ionicons name="people" size={28} color={theme.colors.accent} />
            <Text style={styles.statValue}>{patients.length}</Text>
            <Text style={styles.statLabel}>Patients</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/physio/assessments')}>
            <Ionicons name="clipboard" size={28} color={theme.colors.success} />
            <Text style={styles.statValue}>{recentAssessments.length}</Text>
            <Text style={styles.statLabel}>Assessments</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/physio/assign-exercise')}>
            <Ionicons name="fitness" size={28} color={theme.colors.warning} />
            <Text style={styles.statValue}>{pendingExercises.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/physio/patients')}
          >
            <Ionicons name="people" size={32} color={theme.colors.accent} />
            <Text style={styles.actionTitle}>My Patients</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, { borderColor: theme.colors.success, borderWidth: 2 }]}
            onPress={() => router.push('/physio/add-patient')}
          >
            <Ionicons name="person-add" size={32} color={theme.colors.success} />
            <Text style={styles.actionTitle}>Add Patient</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/physio/smart-prescription')}
          >
            <Ionicons name="document-text" size={32} color={theme.colors.warning} />
            <Text style={styles.actionTitle}>Prescription</Text>
          </TouchableOpacity>
        </View>

        {/* ===== LATEST ANALYSIS SECTION ===== */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="star-circle" size={24} color="#FFD700" />
          <Text style={styles.sectionHeaderText}>Latest Analysis Tools</Text>
          <View style={[styles.featureBadge, { backgroundColor: '#FFD700' }]}>
            <Text style={[styles.featureBadgeText, { color: '#000' }]}>NEW</Text>
          </View>
        </View>

        {/* WBA99 Hub - Tool Directory */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#3b6df0', borderWidth: 2, backgroundColor: '#0A1628' }]}
          onPress={() => router.push('/claude/wba99-hub')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#3b6df0' }]}>
            <MaterialCommunityIcons name="view-dashboard" size={28} color="#fff" />
          </View>
          <View style={styles.featureContent}>
            <Text style={[styles.featureTitle, { color: '#3b6df0' }]}>WBA99 Hub</Text>
            <Text style={styles.featureDesc}>Complete Tool Directory • All Analysis Tools</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#3b6df0' }]}>
            <Text style={[styles.featureBadgeText, { color: '#fff' }]}>HUB</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#3b6df0" />
        </TouchableOpacity>

        {/* WBA99 Full Analysis */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#9C27B0', borderWidth: 2, backgroundColor: '#0A1628' }]}
          onPress={() => router.push('/claude/wba99-full')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#9C27B0' }]}>
            <MaterialCommunityIcons name="body-builder" size={28} color="#fff" />
          </View>
          <View style={styles.featureContent}>
            <Text style={[styles.featureTitle, { color: '#9C27B0' }]}>WBA99 Full Analysis</Text>
            <Text style={styles.featureDesc}>Complete Biomechanics • Posture • Movement</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#9C27B0' }]}>
            <Text style={[styles.featureBadgeText, { color: '#fff' }]}>FULL</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9C27B0" />
        </TouchableOpacity>

        {/* Exercise Template Maker */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#FF5722', borderWidth: 2, backgroundColor: '#0A1628' }]}
          onPress={() => router.push('/claude/exercise-template')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#FF5722' }]}>
            <MaterialCommunityIcons name="clipboard-text" size={28} color="#fff" />
          </View>
          <View style={styles.featureContent}>
            <Text style={[styles.featureTitle, { color: '#FF5722' }]}>Exercise Template Maker</Text>
            <Text style={styles.featureDesc}>AI Exercise Plans • PDF Export • Share</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#FF5722' }]}>
            <Text style={[styles.featureBadgeText, { color: '#fff' }]}>AI</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FF5722" />
        </TouchableOpacity>

        {/* SD Curve V4 */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#00BCD4', borderWidth: 2, backgroundColor: '#0A1628' }]}
          onPress={() => router.push('/claude/sd-curve-v4')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#00BCD4' }]}>
            <MaterialCommunityIcons name="chart-bell-curve" size={28} color="#fff" />
          </View>
          <View style={styles.featureContent}>
            <Text style={[styles.featureTitle, { color: '#00BCD4' }]}>SD Curve V4</Text>
            <Text style={styles.featureDesc}>Strength-Duration • Chronaxie • Neural Analysis</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#00BCD4' }]}>
            <Text style={[styles.featureBadgeText, { color: '#fff' }]}>V4</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#00BCD4" />
        </TouchableOpacity>

        {/* SpineIMU V2 - 9-Axis Spinal Analysis */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#E91E63', borderWidth: 2, backgroundColor: '#0A1628' }]}
          onPress={() => router.push('/claude/spineimu-v2')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#E91E63' }]}>
            <MaterialCommunityIcons name="spine" size={28} color="#fff" />
          </View>
          <View style={styles.featureContent}>
            <Text style={[styles.featureTitle, { color: '#E91E63' }]}>SpineIMU V2</Text>
            <Text style={styles.featureDesc}>9-Axis IMU • C7-S2 Scan • 3D Spine • Cobb Angle • PDF</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#E91E63' }]}>
            <Text style={[styles.featureBadgeText, { color: '#fff' }]}>IMU</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#E91E63" />
        </TouchableOpacity>

        {/* SpineIMU Project X - Advanced Scanner */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#673AB7', borderWidth: 2, backgroundColor: '#0A1628' }]}
          onPress={() => router.push('/claude/spineimu-projectx')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#673AB7' }]}>
            <MaterialCommunityIcons name="axis-arrow" size={28} color="#fff" />
          </View>
          <View style={styles.featureContent}>
            <Text style={[styles.featureTitle, { color: '#673AB7' }]}>SpineIMU Project X</Text>
            <Text style={styles.featureDesc}>Advanced Scanner • Lordosis • Kyphosis • ROM • Reports</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#673AB7' }]}>
            <Text style={[styles.featureBadgeText, { color: '#fff' }]}>X</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#673AB7" />
        </TouchableOpacity>

        {/* Spine Biomechanics - Complete Clinical Assessment */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#4CAF50', borderWidth: 2, backgroundColor: '#0A1628' }]}
          onPress={() => router.push('/physio/spine-biomechanics')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#4CAF50' }]}>
            <MaterialCommunityIcons name="spine" size={28} color="#fff" />
          </View>
          <View style={styles.featureContent}>
            <Text style={[styles.featureTitle, { color: '#4CAF50' }]}>Spine Biomechanics</Text>
            <Text style={styles.featureDesc}>Schober's • Ott's • Chest Exp • SLR • Slump • IMU • PDF</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#4CAF50' }]}>
            <Text style={[styles.featureBadgeText, { color: '#fff' }]}>FULL</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#4CAF50" />
        </TouchableOpacity>

        {/* ===== END LATEST ANALYSIS SECTION ===== */}

        {/* WBA99 Pro - Complete Analysis Suite */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#3b6df0', borderWidth: 2, backgroundColor: '#0A1628' }]}
          onPress={() => router.push('/claude/wba99-pro')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#3b6df0' }]}>
            <MaterialCommunityIcons name="medical-bag" size={28} color="#fff" />
          </View>
          <View style={styles.featureContent}>
            <Text style={[styles.featureTitle, { color: '#3b6df0' }]}>WBA99 Pro Analysis</Text>
            <Text style={styles.featureDesc}>Complete Suite: Gait • Posture • ROM • Cricket • PDF Reports</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#3b6df0' }]}>
            <Text style={[styles.featureBadgeText, { color: '#fff' }]}>PRO</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#3b6df0" />
        </TouchableOpacity>

        {/* Digital Shadow Video - Professional Claude Version */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#39FF14', borderWidth: 2 }]}
          onPress={() => router.push('/claude/digital-shadow')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#0D1B2A' }]}>
            <MaterialCommunityIcons name="motion-outline" size={28} color="#39FF14" />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Digital Shadow Video</Text>
            <Text style={styles.featureDesc}>Ochy-style skeleton tracking • Neon overlay • Joint angles</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#39FF14' }]}>
            <Text style={[styles.featureBadgeText, { color: '#000' }]}>NEW</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#39FF14" />
        </TouchableOpacity>

        {/* AI Pose Analysis Card - NEW */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#9C27B0', borderWidth: 2 }]}
          onPress={() => router.push('/physio/ai-posture-ml')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#9C27B0' }]}>
            <MaterialCommunityIcons name="human" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>AI Posture Analysis (ML)</Text>
            <Text style={styles.featureDesc}>BlazePose 33 landmarks • Manual correction • Full report</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#9C27B0' }]}>
            <Text style={styles.featureBadgeText}>ML</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9C27B0" />
        </TouchableOpacity>

        {/* WBA99 SD Curve AI Analyser - NEW */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#FF5722', borderWidth: 2 }]}
          onPress={() => router.push('/physio/sd-curve-analyser')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#FF5722' }]}>
            <MaterialCommunityIcons name="chart-bell-curve-cumulative" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>SD Curve AI Analyser</Text>
            <Text style={styles.featureDesc}>Strength-Duration curve • Chronaxie • AI interpretation</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#FF5722' }]}>
            <Text style={styles.featureBadgeText}>AI</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FF5722" />
        </TouchableOpacity>

        {/* RESEARCH ANALYTICS ENGINE - NEW */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#00BCD4', borderWidth: 2 }]}
          onPress={() => router.push('/research/analytics-engine')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#00BCD4' }]}>
            <MaterialCommunityIcons name="brain" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Research Analytics Engine</Text>
            <Text style={styles.featureDesc}>AI Analysis • Data Input • Reports • Export</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#00E676' }]}>
            <Text style={styles.featureBadgeText}>AI</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#00BCD4" />
        </TouchableOpacity>

        {/* ADVANCED POSE TAGGING - FEATURED */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#FFD700', borderWidth: 2, backgroundColor: '#141B2D' }]}
          onPress={() => router.push('/physio/advanced-pose-tagging')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#FFD700' }]}>
            <MaterialCommunityIcons name="human-handsup" size={28} color="#000" />
          </View>
          <View style={styles.featureContent}>
            <Text style={[styles.featureTitle, { color: '#FFD700' }]}>Advanced Pose Analysis</Text>
            <Text style={styles.featureDesc}>4 Views • Real-time Angles • CVA • PDF Reports</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#FFD700' }]}>
            <Text style={[styles.featureBadgeText, { color: '#000' }]}>PRO</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FFD700" />
        </TouchableOpacity>

        {/* Universal Angle Tool - FEATURED PRO */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#00F0FF', borderWidth: 2, backgroundColor: '#0A1628' }]}
          onPress={() => router.push('/physio/universal-angle-tool')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#00F0FF' }]}>
            <MaterialCommunityIcons name="angle-acute" size={28} color="#000" />
          </View>
          <View style={styles.featureContent}>
            <Text style={[styles.featureTitle, { color: '#00F0FF' }]}>Universal Angle Tool</Text>
            <Text style={styles.featureDesc}>3-Point ABC • Unlimited angles • Live updates • PDF</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#00FF88' }]}>
            <Text style={[styles.featureBadgeText, { color: '#000' }]}>PRO</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#00F0FF" />
        </TouchableOpacity>

        {/* Manual Posture Tagging Card */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#E91E63', borderWidth: 2 }]}
          onPress={() => router.push('/physio/manual-posture-tagging')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#E91E63' }]}>
            <MaterialCommunityIcons name="crosshairs-gps" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Manual Posture Tagging</Text>
            <Text style={styles.featureDesc}>Zoom • Landmark tagging • Large image upload</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#E91E63' }]}>
            <Text style={styles.featureBadgeText}>NEW</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#E91E63" />
        </TouchableOpacity>

        {/* AI Running Analysis Card - NEW */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#FF6B35', borderWidth: 2 }]}
          onPress={() => router.push('/physio/ai-running-analysis')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#FF6B35' }]}>
            <MaterialCommunityIcons name="run-fast" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>AI Running Analysis</Text>
            <Text style={styles.featureDesc}>Frame-by-frame • Cadence • Hip drop • Foot strike</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#FF6B35' }]}>
            <Text style={styles.featureBadgeText}>GAIT</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FF6B35" />
        </TouchableOpacity>

        {/* AI Analysis Hub Card */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: theme.colors.success }]}
          onPress={() => router.push('/physio/ai-analysis-hub')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: theme.colors.success }]}>
            <MaterialCommunityIcons name="robot" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>AI Analysis Hub</Text>
            <Text style={styles.featureDesc}>Sports, Yoga & Athlete Load Monitoring</Text>
          </View>
          <View style={styles.featureBadge}>
            <Text style={styles.featureBadgeText}>AI</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.colors.success} />
        </TouchableOpacity>

        {/* AI Expert Diagnosis - NEW */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#9C27B0', borderWidth: 2 }]}
          onPress={() => router.push('/physio/ai-expert-diagnosis')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#9C27B0' }]}>
            <MaterialCommunityIcons name="brain" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>AI Expert Diagnosis</Text>
            <Text style={styles.featureDesc}>Differential diagnosis, treatment & nutrition</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#9C27B0' }]}>
            <Text style={styles.featureBadgeText}>EXPERT</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9C27B0" />
        </TouchableOpacity>

        {/* AI Assistant - NEW */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#00BCD4', borderWidth: 2 }]}
          onPress={() => router.push('/physio/ai-assistant')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#00BCD4' }]}>
            <MaterialCommunityIcons name="robot-happy" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>AI Assistant</Text>
            <Text style={styles.featureDesc}>Chat with AI for clinical support & guidance</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#00BCD4' }]}>
            <Text style={styles.featureBadgeText}>CHAT</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#00BCD4" />
        </TouchableOpacity>

        {/* AI Treatment Planner - NEW */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#4CAF50', borderWidth: 2 }]}
          onPress={() => router.push('/physio/ai-treatment-planner')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#4CAF50' }]}>
            <MaterialCommunityIcons name="clipboard-pulse" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>AI Treatment Planner</Text>
            <Text style={styles.featureDesc}>Generate AI-powered treatment plans & exercises</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#4CAF50' }]}>
            <Text style={styles.featureBadgeText}>PLAN</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#4CAF50" />
        </TouchableOpacity>

        {/* Psychology Assessment - NEW */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#E91E63', borderWidth: 2 }]}
          onPress={() => router.push('/physio/psychology-assessment')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#E91E63' }]}>
            <MaterialCommunityIcons name="head-heart" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Sports Psychology</Text>
            <Text style={styles.featureDesc}>Mental readiness, anxiety & performance</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#E91E63' }]}>
            <Text style={styles.featureBadgeText}>PSYCH</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#E91E63" />
        </TouchableOpacity>

        {/* FMS Analysis Card */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#FF6B35', borderWidth: 2 }]}
          onPress={() => router.push('/physio/fms-assessment')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#FF6B35' }]}>
            <MaterialCommunityIcons name="human-handsup" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>FMS Assessment</Text>
            <Text style={styles.featureDesc}>Functional Movement Screen - 7 Tests</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#FF6B35' }]}>
            <Text style={styles.featureBadgeText}>FMS</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FF6B35" />
        </TouchableOpacity>

        {/* Manual Posture Tagging - NEW */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#9C27B0', borderWidth: 2 }]}
          onPress={() => router.push('/physio/manual-tagging')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#9C27B0' }]}>
            <MaterialCommunityIcons name="human-male" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Manual Posture Tagging</Text>
            <Text style={styles.featureDesc}>Professional anatomical landmark analysis</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#9C27B0' }]}>
            <Text style={styles.featureBadgeText}>PRO</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9C27B0" />
        </TouchableOpacity>

        {/* AI Anthropometry Card - NEW */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#00BCD4', borderWidth: 2 }]}
          onPress={() => router.push('/physio/anthropometry')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#00BCD4' }]}>
            <MaterialCommunityIcons name="human-male-height" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>AI Anthropometry</Text>
            <Text style={styles.featureDesc}>Body measurements, BMI & proportions analysis</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#00BCD4' }]}>
            <Text style={styles.featureBadgeText}>AI</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#00BCD4" />
        </TouchableOpacity>

        {/* Digital Inclinometer Card - NEW */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#4CAF50', borderWidth: 2 }]}
          onPress={() => router.push('/physio/inclinometer')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#4CAF50' }]}>
            <MaterialCommunityIcons name="angle-acute" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Digital Inclinometer</Text>
            <Text style={styles.featureDesc}>Measure joint angles using phone sensors</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#4CAF50' }]}>
            <Text style={styles.featureBadgeText}>SENSOR</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#4CAF50" />
        </TouchableOpacity>

        {/* Goniometry & ROM Card - NEW */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#2196F3', borderWidth: 2 }]}
          onPress={() => router.push('/physio/goniometry-rom')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#2196F3' }]}>
            <MaterialCommunityIcons name="ruler" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Goniometry & ROM</Text>
            <Text style={styles.featureDesc}>Full ROM assessment with AI reports</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#2196F3' }]}>
            <Text style={styles.featureBadgeText}>ROM</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#2196F3" />
        </TouchableOpacity>

        {/* Rehab Maker Card - NEW */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#FF5722', borderWidth: 2 }]}
          onPress={() => router.push('/physio/rehab-maker')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#FF5722' }]}>
            <MaterialCommunityIcons name="medical-bag" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Rehab Maker</Text>
            <Text style={styles.featureDesc}>AI Exercise Builder - Mobility/Stretch/Strength</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#FF5722' }]}>
            <Text style={styles.featureBadgeText}>AI</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FF5722" />
        </TouchableOpacity>

        {/* AI Rehab Template Generator - NEW */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#E91E63', borderWidth: 2, backgroundColor: '#141B2D' }]}
          onPress={() => router.push('/physio/ai-rehab-template')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#E91E63' }]}>
            <MaterialCommunityIcons name="robot" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={[styles.featureTitle, { color: '#E91E63' }]}>AI Rehab Template</Text>
            <Text style={styles.featureDesc}>MoveHealth PDF • DOs/DON'Ts • Text-to-Photo • Program Builder</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#E91E63' }]}>
            <Text style={styles.featureBadgeText}>PRO</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#E91E63" />
        </TouchableOpacity>

        {/* Appointments with Patient & Location - NEW */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#00BCD4', borderWidth: 2 }]}
          onPress={() => router.push('/physio/appointments')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#00BCD4' }]}>
            <MaterialCommunityIcons name="calendar-account" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Appointments</Text>
            <Text style={styles.featureDesc}>Patient scheduling • Google Maps • Share & Export</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#00BCD4' }]}>
            <Text style={styles.featureBadgeText}>NEW</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#00BCD4" />
        </TouchableOpacity>

        {/* Schedule & Time Slots - NEW */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#9575CD', borderWidth: 2 }]}
          onPress={() => router.push('/physio/schedule')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#9575CD' }]}>
            <MaterialCommunityIcons name="calendar-clock" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Schedule & Time Slots</Text>
            <Text style={styles.featureDesc}>Manage working hours & appointments</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#9575CD' }]}>
            <Text style={styles.featureBadgeText}>SCHEDULE</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9575CD" />
        </TouchableOpacity>

        {/* Research Analytics - NEW */}
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#673AB7', borderWidth: 2 }]}
          onPress={() => router.push('/physio/research-analytics')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#673AB7' }]}>
            <MaterialCommunityIcons name="chart-timeline-variant" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Research Analytics</Text>
            <Text style={styles.featureDesc}>AI insights, statistics, pre/post comparison, reports</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#673AB7' }]}>
            <Text style={styles.featureBadgeText}>RESEARCH</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#673AB7" />
        </TouchableOpacity>

        {/* Assessment Buttons */}
        <Text style={styles.sectionTitle}>Create Assessment</Text>
        <View style={styles.assessmentGrid}>
          <TouchableOpacity
            style={styles.assessmentButton}
            onPress={() => router.push('/assessment/posture')}
          >
            <MaterialCommunityIcons name="human" size={36} color={theme.colors.textPrimary} />
            <Text style={styles.assessmentButtonText}>Posture</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.assessmentButton}
            onPress={() => router.push('/assessment/walking')}
          >
            <MaterialCommunityIcons name="walk" size={36} color={theme.colors.textPrimary} />
            <Text style={styles.assessmentButtonText}>Walking</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.assessmentButton}
            onPress={() => router.push('/assessment/running')}
          >
            <MaterialCommunityIcons name="run" size={36} color={theme.colors.textPrimary} />
            <Text style={styles.assessmentButtonText}>Running</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.assessmentButton}
            onPress={() => router.push('/assessment/msk')}
          >
            <MaterialCommunityIcons name="bone" size={36} color={theme.colors.textPrimary} />
            <Text style={styles.assessmentButtonText}>M.S.K.</Text>
          </TouchableOpacity>
        </View>

        {/* AI-Powered Analysis Section */}
        <Text style={styles.sectionTitle}>AI-Powered Analysis (with PDF Report)</Text>
        <View style={styles.assessmentGrid}>
          <TouchableOpacity
            style={[styles.assessmentButton, { backgroundColor: '#9C27B0' }]}
            onPress={() => router.push('/physio/posture-analysis-ai')}
          >
            <MaterialCommunityIcons name="human" size={36} color={theme.colors.textPrimary} />
            <Text style={styles.assessmentButtonText}>Posture AI</Text>
            <Text style={styles.aiBadgeSmall}>ML</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.assessmentButton, { backgroundColor: '#9C27B0' }]}
            onPress={() => router.push('/physio/walking-analysis')}
          >
            <MaterialCommunityIcons name="walk" size={36} color={theme.colors.textPrimary} />
            <Text style={styles.assessmentButtonText}>Walking AI</Text>
            <Text style={styles.aiBadgeSmall}>ML</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.assessmentButton, { backgroundColor: '#9C27B0' }]}
            onPress={() => router.push('/physio/ai-pose-analysis')}
          >
            <MaterialCommunityIcons name="run" size={36} color={theme.colors.textPrimary} />
            <Text style={styles.assessmentButtonText}>Running AI</Text>
            <Text style={styles.aiBadgeSmall}>ML</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.assessmentButton, { backgroundColor: '#9C27B0' }]}
            onPress={() => router.push('/assessment/msk')}
          >
            <MaterialCommunityIcons name="bone" size={36} color={theme.colors.textPrimary} />
            <Text style={styles.assessmentButtonText}>M.S.K. AI</Text>
            <Text style={styles.aiBadgeSmall}>ML</Text>
          </TouchableOpacity>
        </View>

        {/* Patient Tracking Section */}
        <Text style={styles.sectionTitle}>Patient Monitoring</Text>
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#FF9800' }]}
          onPress={() => router.push('/physio/patient-tracking-view')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#FF9800' }]}>
            <MaterialCommunityIcons name="chart-line" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Patient Daily Tracking</Text>
            <Text style={styles.featureDesc}>View RPE, Pain, Exercise Completion</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#FF9800' }]}>
            <Text style={styles.featureBadgeText}>RPE</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FF9800" />
        </TouchableOpacity>

        {/* Manual Prescription Upload */}
        <Text style={styles.sectionTitle}>📋 Prescription Management</Text>
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#9C27B0', borderWidth: 2 }]}
          onPress={() => router.push('/physio/manual-prescription-upload')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#9C27B0' }]}>
            <MaterialCommunityIcons name="file-document-edit" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Manual Prescription Upload</Text>
            <Text style={styles.featureDesc}>Upload & analyze prescriptions with AI</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#9C27B0' }]}>
            <Text style={styles.featureBadgeText}>AI</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9C27B0" />
        </TouchableOpacity>

        {/* Research Dashboard */}
        <Text style={styles.sectionTitle}>📊 Research & Analytics</Text>
        <TouchableOpacity
          style={[styles.featureCard, { borderColor: '#673AB7', borderWidth: 2 }]}
          onPress={() => router.push('/physio/research-dashboard')}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: '#673AB7' }]}>
            <MaterialCommunityIcons name="flask" size={28} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Research Dashboard</Text>
            <Text style={styles.featureDesc}>View all patients, tests & outcomes data</Text>
          </View>
          <View style={[styles.featureBadge, { backgroundColor: '#673AB7' }]}>
            <Text style={styles.featureBadgeText}>RESEARCH</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#673AB7" />
        </TouchableOpacity>

        {/* Organization Section - Only visible for org members or org_head */}
        {currentUser?.organization_id && (
          <>
            <Text style={styles.sectionTitle}>🏢 Organization</Text>
            
            {/* Organization Dashboard - For Org Members */}
            <TouchableOpacity
              style={[styles.featureCard, { borderColor: theme.colors.accent, borderWidth: 2 }]}
              onPress={() => router.push('/organization/dashboard')}
            >
              <View style={[styles.featureIconContainer, { backgroundColor: theme.colors.accent }]}>
                <MaterialCommunityIcons name="domain" size={28} color={theme.colors.textPrimary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Organization Dashboard</Text>
                <Text style={styles.featureDesc}>View all physios, patients & research data</Text>
              </View>
              <View style={[styles.featureBadge, { backgroundColor: theme.colors.accent }]}>
                <Text style={styles.featureBadgeText}>ORG</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={theme.colors.accent} />
            </TouchableOpacity>

            {/* Research Dashboard - For Org Members */}
            <TouchableOpacity
              style={[styles.featureCard, { borderColor: '#9C27B0', borderWidth: 2 }]}
              onPress={() => router.push('/organization/research')}
            >
              <View style={[styles.featureIconContainer, { backgroundColor: '#9C27B0' }]}>
                <Ionicons name="flask" size={28} color={theme.colors.textPrimary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Research Dashboard</Text>
                <Text style={styles.featureDesc}>Condition analytics, AI insights & publications</Text>
              </View>
              <View style={[styles.featureBadge, { backgroundColor: '#9C27B0' }]}>
                <Text style={styles.featureBadgeText}>RESEARCH</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#9C27B0" />
            </TouchableOpacity>
          </>
        )}

        {/* Recent Assessments - Compact Card */}
        <TouchableOpacity 
          style={styles.recentAnalysisCard}
          onPress={() => router.push('/physio/recent-analyses')}
        >
          <View style={styles.recentAnalysisIcon}>
            <MaterialCommunityIcons name="clipboard-list" size={28} color={theme.colors.gold} />
          </View>
          <View style={styles.recentAnalysisContent}>
            <Text style={styles.recentAnalysisTitle}>Recent Analyses</Text>
            <Text style={styles.recentAnalysisCount}>
              {recentAssessments.length} assessments • View all
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.colors.gold} />
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
  },
  organizationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  organizationLogo: {
    width: 60,
    height: 40,
    borderRadius: theme.borderRadius.sm,
  },
  organizationLogoPlaceholder: {
    width: 60,
    height: 40,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  organizationInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  organizationName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  organizationHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  welcomeText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  nameText: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  logoutButton: {
    padding: theme.spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginHorizontal: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  statValue: {
    fontSize: 28,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    fontWeight: theme.fontWeight.medium,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  actionCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginHorizontal: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  actionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
  },
  assessmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  assessmentButton: {
    width: '48%',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  assessmentButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
  },
  aiBadgeSmall: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FFD700',
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  assessmentCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  assessmentCardLeft: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assessmentCardContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  assessmentPatient: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  assessmentType: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  assessmentCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  assessmentScore: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  featureDesc: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  featureBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
  },
  featureBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  // Credit Banner Styles
  creditBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  creditBannerText: {
    flex: 1,
  },
  creditBannerTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: '#fff',
  },
  creditBannerSubtitle: {
    fontSize: theme.fontSize.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  // Header Actions
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerBtn: {
    padding: theme.spacing.sm,
  },
  // Buy Credits Section
  buyCreditsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.success,
  },
  buyCreditsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  buyCreditsInfo: {
    flex: 1,
  },
  buyCreditsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  buyCreditsSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  buyCreditsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  buyCreditsText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: '#fff',
  },
  recentAnalysisCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: theme.colors.gold,
  },
  recentAnalysisIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.gold + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  recentAnalysisContent: {
    flex: 1,
  },
  recentAnalysisTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.gold,
  },
  recentAnalysisCount: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
