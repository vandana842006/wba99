import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../src/utils/theme';
import { loginUser } from '../../src/utils/api';
import { useStore, UserRole, useHydration } from '../../src/store/useStore';
import api from '../../src/utils/api';

const LogoImage = require('../../assets/images/wba99-logo.png');

// Demo accounts that bypass credit check
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

const roles: { id: UserRole; label: string; icon: string; color: string; description: string }[] = [
  { id: 'admin', label: 'Admin', icon: 'shield-checkmark', color: '#FF5252', description: 'System Administrator' },
  { id: 'physio', label: 'Physio', icon: 'medical', color: '#00E676', description: 'Physiotherapist' },
  { id: 'patient', label: 'Patient', icon: 'person', color: '#448AFF', description: 'Patient Access' },
];

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setCurrentUser } = useStore();
  const hydrated = useHydration();
  
  const [isMounted, setIsMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Animations
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(30)).current;
  
  useEffect(() => {
    setIsMounted(true);
    
    // Animate on mount
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.spring(formTranslateY, {
        toValue: 0,
        friction: 8,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  useEffect(() => {
    if (params.role && ['admin', 'physio', 'patient'].includes(params.role as string)) {
      setSelectedRole(params.role as UserRole);
    }
  }, [params.role]);

  const isDemoAccount = (emailToCheck: string) => {
    return DEMO_ACCOUNTS.includes(emailToCheck.toLowerCase().trim());
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setLoading(true);
    console.log('Login attempt:', email.trim(), selectedRole);
    
    try {
      const response = await loginUser({ email: email.trim(), role: selectedRole });
      console.log('Login response:', response.data);
      const user = response.data;
      
      if (!user || !user.id) {
        throw new Error('Invalid user data received');
      }
      
      // Set user in state
      setCurrentUser(user);
      console.log('User set in state:', user.name, user.role);
      
      // Wait for state to persist before navigating
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const targetRoute = `/${selectedRole}/dashboard`;
      console.log('Navigating to:', targetRoute);
      
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // Use router for web to maintain state
        router.replace(targetRoute as any);
      } else {
        router.replace(targetRoute as any);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      let message = 'Login failed. ';
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        message += 'Cannot connect to server.';
      } else if (error.response?.status === 404) {
        message += 'User not found. Please sign up first.';
      } else if (error.response?.data?.detail) {
        message += error.response.data.detail;
      } else {
        message += 'Please check your credentials.';
      }
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const selectedRoleInfo = roles.find(r => r.id === selectedRole);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header with Back Button */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Logo Section */}
          <Animated.View style={[styles.logoSection, { transform: [{ scale: logoScale }] }]}>
            <Text style={styles.taglineAbove}>EXERCISE DESIGNING IS AN ART</Text>
            <View style={styles.logoGlow}>
              <Image source={LogoImage} style={styles.logo} resizeMode="contain" />
            </View>
            {/* 3D Golden Text for WBA99 */}
            <View style={styles.appNameContainer}>
              <Text style={styles.appNameShadow}>WBA99</Text>
              <Text style={styles.appNameHighlight}>WBA99</Text>
              <Text style={styles.appName}>WBA99</Text>
            </View>
            <Text style={styles.subtitleText}>Sign in to continue</Text>
          </Animated.View>

          {/* Form Section */}
          <Animated.View 
            style={[
              styles.formSection, 
              { 
                opacity: formOpacity,
                transform: [{ translateY: formTranslateY }]
              }
            ]}
          >
            {/* Role Selection */}
            <Text style={styles.sectionLabel}>Select Your Role</Text>
            <View style={styles.roleGrid}>
              {roles.map((role) => (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.roleCard,
                    selectedRole === role.id && styles.roleCardSelected,
                    selectedRole === role.id && { borderColor: role.color },
                  ]}
                  onPress={() => setSelectedRole(role.id)}
                  activeOpacity={0.8}
                >
                  <View 
                    style={[
                      styles.roleIconContainer,
                      { backgroundColor: role.color + '20' },
                      selectedRole === role.id && { backgroundColor: role.color + '40' }
                    ]}
                  >
                    <Ionicons 
                      name={role.icon as any} 
                      size={24} 
                      color={selectedRole === role.id ? role.color : theme.colors.textMuted} 
                    />
                  </View>
                  <Text 
                    style={[
                      styles.roleLabel,
                      selectedRole === role.id && { color: role.color }
                    ]}
                  >
                    {role.label}
                  </Text>
                  {selectedRole === role.id && (
                    <View style={[styles.roleCheck, { backgroundColor: role.color }]}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Email Input */}
            <Text style={styles.sectionLabel}>Email Address</Text>
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Ionicons name="mail" size={20} color={theme.colors.textMuted} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={theme.colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleLogin}
                returnKeyType="go"
              />
              {email.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => setEmail('')}
                >
                  <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Login Button */}
            <Pressable
              style={({ pressed }) => [
                styles.loginButton,
                pressed && { opacity: 0.8 }
              ]}
              onPress={() => {
                console.log('Login button pressed');
                handleLogin();
              }}
              disabled={loading}
              testID="login-button"
              accessibilityRole="button"
              accessibilityLabel="Login"
            >
              <LinearGradient
                colors={loading ? ['#555', '#444'] : ['#00D4FF', '#0099CC']}
                style={styles.loginGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="log-in" size={22} color="#fff" />
                    <Text style={styles.loginText}>LOGIN</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            {/* Sign Up Link */}
            <View style={styles.signupSection}>
              <Text style={styles.signupText}>Don't have an account?</Text>
              <TouchableOpacity onPress={() => router.push('/auth/signup')}>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Secure Login • WBA99 v2.0</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.lg,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Logo Section
  logoSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  taglineAbove: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: '#FFD700',
    letterSpacing: 2,
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
  },
  logoGlow: {
    padding: 4,
    borderRadius: 60,
    backgroundColor: '#0D1B2A',
    borderWidth: 4,
    borderColor: '#D4AF37',
    overflow: 'hidden',
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#0D1B2A',
  },
  appNameContainer: {
    position: 'relative',
    marginTop: theme.spacing.md,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appNameShadow: {
    position: 'absolute',
    fontSize: 34,
    fontWeight: '900',
    color: '#1A1A2E',
    letterSpacing: 4,
    top: 3,
    left: 2,
  },
  appNameHighlight: {
    position: 'absolute',
    fontSize: 34,
    fontWeight: '900',
    color: '#B8860B',
    letterSpacing: 4,
    top: 1,
    left: 1,
  },
  appName: {
    fontSize: 34,
    fontWeight: '900',
    color: '#F5F5F5',
    letterSpacing: 4,
  },
  subtitleText: {
    fontSize: theme.fontSize.md,
    color: '#A0B4C8',
    marginTop: theme.spacing.xs,
  },
  
  // Form Section
  formSection: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  
  // Role Grid
  roleGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  roleCard: {
    flex: 1,
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleCardSelected: {
    backgroundColor: theme.colors.cardHover,
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  roleLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  roleCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  inputIcon: {
    paddingLeft: theme.spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
  },
  clearButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.xs,
  },
  
  // Demo Info
  demoInfo: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.accent + '30',
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  demoTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.accent,
  },
  demoAccounts: {
    gap: theme.spacing.xs,
  },
  demoAccount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  demoEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  demoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  demoBadgeText: {
    fontSize: 10,
    fontWeight: theme.fontWeight.bold,
  },
  
  // Login Button
  loginButton: {
    marginTop: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  loginGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  loginText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: '#fff',
    letterSpacing: 1,
  },
  
  // Signup Section
  signupSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  signupText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  signupLink: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    marginTop: theme.spacing.xl,
  },
  footerText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
});
