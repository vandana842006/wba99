import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import api from '../../src/utils/api';
import { useStore } from '../../src/store/useStore';

export default function OrganizationLogin() {
  const router = useRouter();
  const { setCurrentUser } = useStore();
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/organizations/login', {
        email: email.trim(),
        password: password.trim(),
      });

      if (response.data.success) {
        const { user, organization } = response.data;
        
        setCurrentUser({
          id: user.id,
          email: user.email,
          name: user.name,
          role: 'org_head',
          organization_id: organization.id,
        });

        Alert.alert(
          '✅ Login Successful',
          `Welcome back to ${organization.name}!`,
          [{ text: 'Continue', onPress: () => router.replace('/organization/dashboard') }]
        );
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.response?.status === 403) {
        Alert.alert(
          '⏳ Pending Approval',
          'Your organization is still pending admin approval. You will receive an email once approved.',
          [{ text: 'OK' }]
        );
      } else if (error.response?.status === 401) {
        Alert.alert('Error', 'Invalid email or password');
      } else {
        Alert.alert('Error', error.response?.data?.detail || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Link href="/" asChild>
              <Pressable style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
              </Pressable>
            </Link>
          </View>

          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons name="domain" size={60} color={theme.colors.accent} />
            </View>
            <Text style={styles.title}>Organization Login</Text>
            <Text style={styles.subtitle}>Access your organization dashboard</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Organization Head Email"
                placeholderTextColor={theme.colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={theme.colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color={theme.colors.textMuted} 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="log-in" size={20} color="#fff" />
                  <Text style={styles.loginButtonText}>Login</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Quick Demo Access */}
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>New to WBA99?</Text>
            <Link href="/auth/organization-signup" asChild>
              <Pressable style={styles.demoButton}>
                <Ionicons name="flash" size={20} color="#FF9800" />
                <Text style={styles.demoButtonText}>Try Demo Account</Text>
              </Pressable>
            </Link>
          </View>

          {/* Sign Up Link */}
          <View style={styles.signupSection}>
            <Text style={styles.signupText}>Don't have an organization account?</Text>
            <Link href="/auth/organization-signup" asChild>
              <Pressable style={styles.signupButton}>
                <Text style={styles.signupButtonText}>Register Your Organization</Text>
              </Pressable>
            </Link>
          </View>

          {/* Status Info */}
          <View style={styles.statusSection}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: theme.colors.success }]} />
              <Text style={styles.statusText}>Active organizations can login</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: theme.colors.warning }]} />
              <Text style={styles.statusText}>Pending organizations await approval</Text>
            </View>
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
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 50,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 3,
    borderColor: theme.colors.accent,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  formContainer: {
    marginBottom: theme.spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  inputIcon: {
    paddingHorizontal: theme.spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingRight: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
  },
  eyeButton: {
    padding: theme.spacing.md,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.lg,
  },
  forgotPasswordText: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.sm,
  },
  loginButton: {
    backgroundColor: theme.colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.cardBorder,
  },
  dividerText: {
    color: theme.colors.textMuted,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.sm,
  },
  demoSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  demoTitle: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.sm,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800' + '20',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  demoButtonText: {
    color: '#FF9800',
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
  },
  signupSection: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  signupText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  signupButton: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  signupButtonText: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
  },
  statusSection: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
  },
});
