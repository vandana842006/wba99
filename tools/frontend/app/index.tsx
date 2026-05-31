import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  Alert,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../src/utils/theme';
import { useStore } from '../src/store/useStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LogoImage = require('../assets/images/wba99-logo.png');

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Animated Feature Card Component
const AnimatedFeatureCard = ({ 
  icon, 
  title, 
  subtitle,
  color,
  onPress, 
  locked,
  delay = 0 
}: {
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
  locked?: boolean;
  delay?: number;
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.featureCard, locked && styles.featureCardLocked]}
    >
      <View style={[styles.featureGradient, { backgroundColor: hexToRgba(color, 0.15) }]}>
        <View style={[styles.featureIconContainer, { backgroundColor: hexToRgba(color, 0.3) }]}>
          <MaterialCommunityIcons name={icon as any} size={36} color={color} />
        </View>
        <Text style={[styles.featureTitle, { color: '#FFFFFF' }]}>{title}</Text>
        <Text style={[styles.featureSubtitle, { color: '#A0B4C8' }]}>{subtitle}</Text>
        {locked && (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={12} color="#FFD700" />
            <Text style={styles.lockText}>PRO</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Learn & Certify Card Component
const LearnCertifyCard = ({ 
  icon, 
  title, 
  subtitle,
  description, 
  onPress,
  isHighlighted = false,
  isLoggedIn = false
}: {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  onPress: () => void;
  isHighlighted?: boolean;
  isLoggedIn?: boolean;
}) => {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      activeOpacity={0.8}
      style={[
        styles.learnCard,
        isHighlighted && styles.learnCardHighlighted
      ]}
    >
      <View style={styles.learnCardContent}>
        {/* Icon with lock */}
        <View style={styles.learnIconWrapper}>
          <MaterialCommunityIcons 
            name={icon as any} 
            size={48} 
            color="#CED4DA" 
          />
          {!isLoggedIn && (
            <View style={styles.learnLockIcon}>
              <Ionicons name="lock-closed" size={12} color="#CED4DA" />
            </View>
          )}
        </View>
        
        {/* Title */}
        <Text style={styles.learnCardTitle}>{title}</Text>
        
        {/* Subtitle (Login Required or status) */}
        <Text style={styles.learnLoginRequired}>{subtitle}</Text>
        
        {/* Description */}
        <Text style={styles.learnCardDescription}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const { isLoggedIn, currentUser, logout } = useStore();
  const scrollY = useRef(new Animated.Value(0)).current;
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');

  const navigateTo = useCallback((path: string) => {
    if (Platform.OS === 'web') {
      window.location.href = path;
    } else {
      router.push(path as any);
    }
  }, [router]);

  const navigateToRole = (role: 'admin' | 'physio' | 'patient') => {
    if (isLoggedIn && currentUser) {
      navigateTo(`/${currentUser.role}/dashboard`);
    } else {
      navigateTo(`/auth/login?role=${role}`);
    }
  };

  const navigateToAssessment = (type: string) => {
    if (!isLoggedIn || !currentUser) {
      Alert.alert(
        'Login Required', 
        'Please login to access assessments.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/auth/login?role=physio') }
        ]
      );
      return;
    }
    if (currentUser.role !== 'physio' && currentUser.role !== 'admin') {
      Alert.alert('Access Restricted', 'Only Admins and Physiotherapists can access assessment features.');
      return;
    }
    switch (type) {
      case 'posture':
        router.push('/physio/posture-analysis-ai');
        break;
      case 'walking':
        // AI-powered Camera Walking Analysis with MoveNet pose detection
        router.push('/assessment/camera-walking');
        break;
      case 'running':
        // Same page, running mode
        router.push('/assessment/camera-walking');
        break;
      case 'msk':
        router.push('/assessment/msk');
        break;
      default:
        router.push(`/assessment/${type}` as any);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Hero Section with Gradient */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryLight, theme.colors.primary]}
          style={styles.heroSection}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Top Banner - AI Healthcare with India Flag */}
          <View style={styles.topBannerNew}>
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTextNew}>
                AI BASED ANALYSIS IS THE FUTURE OF{'\n'}INDIAN HEALTHCARE SYSTEM
              </Text>
              <View style={styles.indiaFlag}>
                <View style={[styles.flagStripe, { backgroundColor: '#FF9933' }]} />
                <View style={[styles.flagStripe, { backgroundColor: '#FFFFFF' }]}>
                  <View style={styles.ashokChakra}>
                    <Text style={styles.chakraText}>☸</Text>
                  </View>
                </View>
                <View style={[styles.flagStripe, { backgroundColor: '#138808' }]} />
              </View>
            </View>
          </View>

          {/* Logo & App Name */}
          <View style={styles.logoContainer}>
            <Text style={styles.taglineAbove}>EXERCISE DESIGNING IS AN ART</Text>
            {/* Professional Logo - cropped to show inner gold ring only */}
            <View style={styles.logoWrapper}>
              <Image source={LogoImage} style={styles.logo} resizeMode="cover" />
            </View>
            {/* 3D Golden/Silver Text Effect for WBA99 */}
            <View style={styles.appNameContainer}>
              <Text style={styles.appNameShadow}>WBA99</Text>
              <Text style={styles.appNameHighlight}>WBA99</Text>
              <Text style={styles.appName}>WBA99</Text>
            </View>
            <Text style={styles.tagline}>Advanced MSK/FMS Analysis</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>v2.0 PRO</Text>
            </View>
          </View>

          {/* Auth Section */}
          {isLoggedIn && currentUser ? (
            <View style={styles.loggedInSection}>
              <View style={styles.userCard}>
                <View style={styles.userAvatar}>
                  <Ionicons name="person" size={24} color={theme.colors.accent} />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{currentUser.name}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{currentUser.role.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.authButtons}>
                <TouchableOpacity
                  style={styles.dashboardBtn}
                  onPress={() => router.push(`/${currentUser.role}/dashboard` as any)}
                >
                  <LinearGradient
                    colors={['#00D4FF', '#0099CC']}
                    style={styles.gradientBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="grid" size={18} color="#fff" />
                    <Text style={styles.btnText}>Dashboard</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                  <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
                  <Text style={[styles.btnText, { color: theme.colors.error }]}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.authSection}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.push('/auth/signup')}
              >
                <LinearGradient
                  colors={['#00D4FF', '#0099CC']}
                  style={styles.gradientBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="person-add" size={18} color="#fff" />
                  <Text style={styles.btnText}>Create Account</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.push('/auth/login')}
              >
                <Text style={styles.secondaryBtnText}>Already have an account? Login</Text>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>

        {/* Organization Portal */}
        <TouchableOpacity
          style={styles.orgPortal}
          onPress={() => router.push('/auth/organization-login')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#1E3A5F', '#2A4A6A']}
            style={styles.orgGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.orgIcon}>
              <MaterialCommunityIcons name="domain" size={28} color="#FFD700" />
            </View>
            <View style={styles.orgContent}>
              <Text style={styles.orgTitle}>Organization Portal</Text>
              <Text style={styles.orgDesc}>Clinics & Hospitals</Text>
            </View>
            <View style={styles.orgBadge}>
              <Text style={styles.orgBadgeText}>Enterprise</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Claude Suite - Advanced Clinical Tools */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
              <MaterialCommunityIcons name="robot" size={20} color="#A855F7" />
            </View>
            <Text style={styles.sectionTitle}>Claude Suite</Text>
          </View>
          
          <TouchableOpacity
            style={styles.claudePortal}
            onPress={() => router.push('/claude')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#1E1B4B', '#312E81']}
              style={styles.claudeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.claudeIcon}>
                <MaterialCommunityIcons name="brain" size={32} color="#A855F7" />
              </View>
              <View style={styles.claudeContent}>
                <Text style={styles.claudeTitle}>Advanced Clinical Tools</Text>
                <Text style={styles.claudeDesc}>5 AI-Powered Analysis Modules</Text>
              </View>
              <View style={styles.claudeBadge}>
                <Text style={styles.claudeBadgeText}>NEW</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
          
          <View style={styles.claudeFeatures}>
            <View style={styles.claudeFeatureItem}>
              <MaterialCommunityIcons name="video" size={18} color="#39FF8A" />
              <Text style={styles.claudeFeatureText}>Digital Shadow</Text>
            </View>
            <View style={styles.claudeFeatureItem}>
              <MaterialCommunityIcons name="dumbbell" size={18} color="#FF3D7F" />
              <Text style={styles.claudeFeatureText}>Exercise Maker</Text>
            </View>
            <View style={styles.claudeFeatureItem}>
              <MaterialCommunityIcons name="human" size={18} color="#00D4FF" />
              <Text style={styles.claudeFeatureText}>PhysioScan</Text>
            </View>
            <View style={styles.claudeFeatureItem}>
              <MaterialCommunityIcons name="face-recognition" size={18} color="#FBBF24" />
              <Text style={styles.claudeFeatureText}>Face Analyzer</Text>
            </View>
          </View>
        </View>

        {/* Assessment Features */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <MaterialCommunityIcons name="clipboard-pulse" size={20} color={theme.colors.accent} />
            </View>
            <Text style={styles.sectionTitle}>AI-Powered Assessments</Text>
          </View>
          
          <View style={styles.featuresGrid}>
            <AnimatedFeatureCard
              icon="human"
              title="POSTURE"
              subtitle="AI Analysis"
              color="#00E676"
              onPress={() => navigateToAssessment('posture')}
              locked={!isLoggedIn || (currentUser?.role !== 'physio' && currentUser?.role !== 'admin')}
              delay={100}
            />
            <AnimatedFeatureCard
              icon="walk"
              title="WALKING"
              subtitle="Gait Analysis"
              color="#448AFF"
              onPress={() => navigateToAssessment('walking')}
              locked={!isLoggedIn || (currentUser?.role !== 'physio' && currentUser?.role !== 'admin')}
              delay={200}
            />
            <AnimatedFeatureCard
              icon="run"
              title="RUNNING"
              subtitle="Movement Scan"
              color="#FF5252"
              onPress={() => navigateToAssessment('running')}
              locked={!isLoggedIn || (currentUser?.role !== 'physio' && currentUser?.role !== 'admin')}
              delay={300}
            />
            <AnimatedFeatureCard
              icon="bone"
              title="MSK"
              subtitle="FMS Analysis"
              color="#FFB300"
              onPress={() => navigateToAssessment('msk')}
              locked={!isLoggedIn || (currentUser?.role !== 'physio' && currentUser?.role !== 'admin')}
              delay={400}
            />
          </View>
        </View>

        {/* Learn & Certify Section */}
        <View style={styles.section}>
          <Text style={styles.learnSectionTitle}>Learn & Certify</Text>
          
          <View style={styles.learnCardsContainer}>
            <LearnCertifyCard
              icon="file-document-outline"
              title="Research Blog"
              subtitle={isLoggedIn ? "Access Granted" : "Login Required"}
              description="Latest studies & articles"
              isLoggedIn={isLoggedIn}
              onPress={() => {
                if (isLoggedIn) {
                  navigateTo('/learn/research-blog');
                } else {
                  navigateTo('/auth/login');
                }
              }}
            />
            <LearnCertifyCard
              icon="school-outline"
              title="Education"
              subtitle={isLoggedIn ? "Access Granted" : "Login Required"}
              description="Learn MSK & FMS"
              isLoggedIn={isLoggedIn}
              onPress={() => {
                if (isLoggedIn) {
                  navigateTo('/learn/education');
                } else {
                  navigateTo('/auth/login');
                }
              }}
            />
            <LearnCertifyCard
              icon="medal-outline"
              title="Certification"
              subtitle={isLoggedIn ? "Access Granted" : "Login Required"}
              description="Get certified - 50 MCQs"
              isLoggedIn={isLoggedIn}
              onPress={() => {
                if (isLoggedIn) {
                  navigateTo('/learn/certification');
                } else {
                  navigateTo('/auth/login');
                }
              }}
              isHighlighted={true}
            />
          </View>
        </View>

        {/* Features Highlight */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="sparkles" size={20} color="#FFD700" />
            </View>
            <Text style={styles.sectionTitle}>Premium Features</Text>
          </View>

          <View style={styles.featuresHighlight}>
            <TouchableOpacity 
              style={styles.featureItem}
              onPress={() => {
                if (isLoggedIn && currentUser?.role === 'physio') {
                  router.push('/physio/ai-analysis-hub');
                } else {
                  Alert.alert('Login Required', 'Please login as Physio to access AI Analysis');
                }
              }}
            >
              <Ionicons name="analytics" size={24} color={theme.colors.accent} />
              <Text style={styles.featureItemText}>AI Analysis</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.featureItem}
              onPress={() => {
                if (isLoggedIn && currentUser?.role === 'physio') {
                  router.push('/physio/smart-prescription');
                } else {
                  Alert.alert('Login Required', 'Please login as Physio to access PDF Reports');
                }
              }}
            >
              <Ionicons name="document-text" size={24} color="#00E676" />
              <Text style={styles.featureItemText}>PDF Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.featureItem}
              onPress={() => {
                if (isLoggedIn && currentUser?.role === 'physio') {
                  router.push('/physio/rehab-maker');
                } else {
                  Alert.alert('Login Required', 'Please login as Physio to access Exercise Rx');
                }
              }}
            >
              <Ionicons name="fitness" size={24} color="#FF5252" />
              <Text style={styles.featureItemText}>Exercise Rx</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.featureItem}
              onPress={() => {
                if (isLoggedIn && currentUser?.role === 'physio') {
                  router.push('/physio/ai-assistant');
                } else {
                  Alert.alert('Login Required', 'Please login as Physio to access AI Chat');
                }
              }}
            >
              <Ionicons name="chatbubbles" size={24} color="#FFB300" />
              <Text style={styles.featureItemText}>AI Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 WBA99 - All Rights Reserved</Text>
          <Text style={styles.footerSubtext}>Made with ❤️ in India</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  
  // Hero Section
  heroSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  // New Top Banner Style
  topBannerNew: {
    borderWidth: 2,
    borderColor: '#3A5A7C',
    borderRadius: 12,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    backgroundColor: 'rgba(13, 27, 42, 0.9)',
    overflow: 'hidden',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  bannerTextNew: {
    flex: 1,
    color: '#00D4FF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    lineHeight: 20,
    textTransform: 'uppercase',
  },
  indiaFlag: {
    width: 50,
    height: 35,
    borderRadius: 4,
    overflow: 'hidden',
    marginLeft: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#fff',
  },
  flagStripe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ashokChakra: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chakraText: {
    color: '#000080',
    fontSize: 12,
  },
  topBanner: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  flagGradient: {
    height: 4,
    width: 80,
    borderRadius: 2,
    marginBottom: theme.spacing.sm,
  },
  bannerText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  // Clean logo - single gold ring + brown center
  logoWrapper: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
    backgroundColor: '#0D1B2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 160,
    height: 160,
  },
  taglineAbove: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: '#FFD700',
    letterSpacing: 2,
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
  },
  appNameContainer: {
    position: 'relative',
    marginTop: theme.spacing.md,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appNameShadow: {
    position: 'absolute',
    fontSize: 44,
    fontWeight: '900',
    color: '#1A1A2E',
    letterSpacing: 4,
    top: 4,
    left: 3,
  },
  appNameHighlight: {
    position: 'absolute',
    fontSize: 44,
    fontWeight: '900',
    color: '#B8860B',
    letterSpacing: 4,
    top: 1,
    left: 1,
  },
  appName: {
    fontSize: 44,
    fontWeight: '900',
    color: '#F5F5F5',
    letterSpacing: 4,
  },
  tagline: {
    fontSize: theme.fontSize.md,
    color: '#A0B4C8',
    marginTop: theme.spacing.xs,
  },
  versionBadge: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  versionText: {
    color: '#FFD700',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
  },

  // Auth Section
  loggedInSection: {
    marginTop: theme.spacing.lg,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  userName: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  roleBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: theme.colors.accent + '20',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  roleText: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
  },
  authButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  dashboardBtn: {
    flex: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.error + '40',
  },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  btnText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  authSection: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  primaryBtn: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  secondaryBtnText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },

  // Organization Portal
  orgPortal: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  orgGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  orgIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  orgTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  orgDesc: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  orgBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: '#FFD700',
    borderRadius: theme.borderRadius.sm,
  },
  orgBadgeText: {
    color: '#000',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
  },

  // Sections
  section: {
    padding: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },

  // Features Grid
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  featureCard: {
    width: 165,
    height: 150,
    borderRadius: theme.borderRadius.lg,
    overflow: 'visible',
    marginBottom: theme.spacing.md,
  },
  featureCardLocked: {
    opacity: 0.7,
  },
  featureGradient: {
    flex: 1,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.lg,
  },
  featureIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  featureTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  featureSubtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    marginTop: 2,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 10,
    gap: 4,
  },
  lockText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: theme.fontWeight.bold,
  },

  // Learn & Certify Section
  learnSectionTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: theme.fontWeight.bold,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  learnCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  learnCard: {
    width: '31%',
    minWidth: 100,
    backgroundColor: '#27354A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  learnCardHighlighted: {
    borderWidth: 3,
    borderColor: '#FFC107',
  },
  learnCardContent: {
    alignItems: 'center',
  },
  learnIconWrapper: {
    position: 'relative',
    marginBottom: theme.spacing.md,
    height: 60,
    justifyContent: 'center',
  },
  learnLockIcon: {
    position: 'absolute',
    top: 0,
    right: -8,
    backgroundColor: 'transparent',
  },
  learnCardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: theme.fontWeight.bold,
    textAlign: 'center',
    marginBottom: 6,
  },
  learnLoginRequired: {
    color: '#CED4DA',
    fontSize: 12,
    fontWeight: theme.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: 4,
  },
  learnCardDescription: {
    color: '#808A9C',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },

  // Features Highlight
  featuresHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  featureItem: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  featureItemText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  footerText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  footerSubtext: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    marginTop: theme.spacing.xs,
  },
  
  // Claude Suite Styles
  claudePortal: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  claudeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  claudeIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claudeContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  claudeTitle: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  claudeDesc: {
    color: '#A0B4C8',
    fontSize: theme.fontSize.sm,
    marginTop: 2,
  },
  claudeBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: '#A855F7',
    borderRadius: theme.borderRadius.sm,
  },
  claudeBadgeText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
  },
  claudeFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 27, 75, 0.5)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  claudeFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  claudeFeatureText: {
    color: '#A0B4C8',
    fontSize: theme.fontSize.sm,
  },
});
