import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../src/utils/theme';
import { createUser } from '../../src/utils/api';
import { useStore, UserRole } from '../../src/store/useStore';
import api from '../../src/utils/api';

const LogoImage = require('../../assets/images/wba99-logo.png');

// Whitelist of allowed admin emails
const ALLOWED_ADMIN_EMAILS = [
  'sportsphysio009@gmail.com',
  'sportsphysio001@gmail.com',
  'wba99physio@gmail.com',
  'admin@wba99.com',
];

// Demo accounts that don't need recharge
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

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  description: string;
}

interface PaymentSettings {
  upi_id: string;
  account_holder_name: string;
  qr_code_image: string;
}

export default function SignupScreen() {
  const router = useRouter();
  const { setCurrentUser } = useStore();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');
  const [loading, setLoading] = useState(false);
  
  // Animations
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(30)).current;
  
  useEffect(() => {
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
  
  // Recharge flow for physio
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);

  const isAdminEmailAllowed = (emailToCheck: string) => {
    return ALLOWED_ADMIN_EMAILS.includes(emailToCheck.toLowerCase().trim());
  };

  const isDemoAccount = (emailToCheck: string) => {
    return DEMO_ACCOUNTS.includes(emailToCheck.toLowerCase().trim());
  };

  const fetchPaymentData = async () => {
    setLoadingPackages(true);
    try {
      const [packagesRes, settingsRes] = await Promise.all([
        api.get('/payment/packages'),
        api.get('/payment/settings'),
      ]);
      setPackages(packagesRes.data || []);
      setPaymentSettings(settingsRes.data);
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoadingPackages(false);
    }
  };

  const handleSignup = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    // Check admin email restriction
    if (selectedRole === 'admin' && !isAdminEmailAllowed(email)) {
      Alert.alert(
        'Admin Access Restricted', 
        'Admin registration is restricted to authorized email addresses only. Please contact WBA99 support if you need admin access.'
      );
      return;
    }

    setLoading(true);
    try {
      const response = await createUser({
        name: name.trim(),
        email: email.trim(),
        role: selectedRole,
        phone: phone.trim() || undefined,
        account_activated: selectedRole !== 'physio' || isDemoAccount(email), // Non-physio or demo accounts are auto-activated
      });

      // If physio and not demo account, show recharge modal
      if (selectedRole === 'physio' && !isDemoAccount(email)) {
        setPendingUser(response.data);
        await fetchPaymentData();
        setShowRechargeModal(true);
        setLoading(false);
        return;
      }
      
      // For patients, admin, or demo physios - direct login
      setCurrentUser(response.data);
      Alert.alert('Success', `Welcome to WBA99, ${response.data.name}!`);
      router.replace(`/${selectedRole}/dashboard` as any);
    } catch (error: any) {
      console.error('Signup error:', error);
      const message = error.response?.data?.detail || 'Signup failed. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const uploadScreenshot = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setScreenshot(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const submitPayment = async () => {
    if (!screenshot || !selectedPackage || !pendingUser) {
      Alert.alert('Required', 'Please select a package and upload payment screenshot');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/payment/purchase?user_id=${pendingUser.id}&package_id=${selectedPackage.id}`, {
        screenshot_base64: screenshot,
      });

      Alert.alert(
        '✅ Payment Submitted!',
        'Your payment has been submitted for verification. Once approved by admin, your account will be activated and credits will be added.\n\nYou will receive a notification when your account is ready.',
        [{ text: 'OK', onPress: () => {
          setShowRechargeModal(false);
          router.replace('/auth/login');
        }}]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const skipRecharge = () => {
    Alert.alert(
      'Account Pending',
      'Your account has been created but will remain inactive until you recharge. You can recharge later from the Credits section.',
      [
        { text: 'Recharge Now', style: 'cancel' },
        { 
          text: 'Skip for Now', 
          onPress: () => {
            setShowRechargeModal(false);
            router.replace('/auth/login');
          }
        }
      ]
    );
  };

  const RoleButton = ({ role, label, icon }: { role: UserRole; label: string; icon: string }) => (
    <TouchableOpacity
      style={[styles.roleButton, selectedRole === role && styles.roleButtonActive]}
      onPress={() => setSelectedRole(role)}
    >
      <Ionicons
        name={icon as any}
        size={24}
        color={selectedRole === role ? theme.colors.textPrimary : theme.colors.textSecondary}
      />
      <Text style={[styles.roleButtonText, selectedRole === role && styles.roleButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

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

          {/* Logo Section with 3D Metallic Text */}
          <Animated.View style={[styles.logoSection, { transform: [{ scale: logoScale }] }]}>
            <Text style={styles.taglineAbove}>EXERCISE DESIGNING IS AN ART</Text>
            <View style={styles.logoGlow}>
              <Image source={LogoImage} style={styles.logo} resizeMode="contain" />
            </View>
            {/* 3D Golden/Silver Text for WBA99 */}
            <View style={styles.appNameContainer}>
              <Text style={styles.appNameShadow}>WBA99</Text>
              <Text style={styles.appNameHighlight}>WBA99</Text>
              <Text style={styles.appName}>WBA99</Text>
            </View>
            <Text style={styles.subtitleText}>Create Your Account</Text>
          </Animated.View>

          {/* Form Section */}
          <Animated.View 
            style={[
              styles.form, 
              { 
                opacity: formOpacity,
                transform: [{ translateY: formTranslateY }]
              }
            ]}
          >
            <Text style={styles.label}>I am a</Text>
            <View style={styles.roleContainer}>
              <RoleButton role="admin" label="Admin" icon="settings" />
              <RoleButton role="physio" label="Physio" icon="medical" />
              <RoleButton role="patient" label="Patient" icon="person" />
            </View>

            {selectedRole === 'physio' && (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color={theme.colors.warning} />
                <Text style={styles.infoText}>
                  Physio accounts require credit recharge to activate. You'll be prompted to recharge after signup.
                </Text>
              </View>
            )}

            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor={theme.colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={theme.colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={styles.label}>Phone (Optional)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Enter your phone number"
                placeholderTextColor={theme.colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity
              style={styles.signupButton}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={loading ? ['#555', '#444'] : ['#00D4FF', '#0099CC']}
                style={styles.signupGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={22} color="#fff" />
                    <Text style={styles.signupButtonText}>SIGN UP</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/auth/login')}>
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Recharge Modal for New Physios */}
      <Modal visible={showRechargeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>🎉 Account Created!</Text>
                  <Text style={styles.modalSubtitle}>
                    Activate your account with a credit recharge
                  </Text>
                </View>
              </View>

              <View style={styles.welcomeBox}>
                <MaterialCommunityIcons name="account-check" size={40} color={theme.colors.success} />
                <View style={styles.welcomeTextContainer}>
                  <Text style={styles.welcomeName}>Welcome, {pendingUser?.name}!</Text>
                  <Text style={styles.welcomeInfo}>
                    To access all physio features, please recharge your account with credits.
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>💰 Select Credit Package</Text>
              
              {loadingPackages ? (
                <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginVertical: 20 }} />
              ) : packages.length === 0 ? (
                <View style={styles.noPackagesBox}>
                  <Ionicons name="alert-circle" size={40} color={theme.colors.warning} />
                  <Text style={styles.noPackagesText}>
                    Payment packages not configured yet. Please contact admin or try again later.
                  </Text>
                </View>
              ) : (
                <View style={styles.packagesGrid}>
                  {packages.map((pkg, index) => (
                    <TouchableOpacity
                      key={pkg.id}
                      style={[
                        styles.packageCard,
                        selectedPackage?.id === pkg.id && styles.packageCardSelected,
                        index === 1 && styles.packageCardPopular,
                      ]}
                      onPress={() => setSelectedPackage(pkg)}
                    >
                      {index === 1 && (
                        <View style={styles.popularBadge}>
                          <Text style={styles.popularBadgeText}>BEST VALUE</Text>
                        </View>
                      )}
                      {selectedPackage?.id === pkg.id && (
                        <View style={styles.selectedBadge}>
                          <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                        </View>
                      )}
                      <Text style={styles.packageName}>{pkg.name}</Text>
                      <Text style={styles.packageCredits}>{pkg.credits}</Text>
                      <Text style={styles.packageCreditsLabel}>Credits</Text>
                      <Text style={styles.packagePrice}>₹{pkg.price}</Text>
                      <Text style={styles.packageDescription}>{pkg.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {selectedPackage && paymentSettings?.upi_id && (
                <>
                  <Text style={styles.sectionTitle}>📱 Complete Payment</Text>
                  <View style={styles.paymentInstructions}>
                    {paymentSettings?.qr_code_image ? (
                      <View style={styles.qrContainer}>
                        <Image source={{ uri: paymentSettings.qr_code_image }} style={styles.qrCode} />
                      </View>
                    ) : (
                      <View style={styles.upiIdContainer}>
                        <Text style={styles.upiIdLabel}>UPI ID</Text>
                        <Text style={styles.upiId}>{paymentSettings?.upi_id}</Text>
                      </View>
                    )}

                    <Text style={styles.payToName}>Pay to: {paymentSettings?.account_holder_name}</Text>
                    <Text style={styles.amountToPay}>Amount: ₹{selectedPackage.price}</Text>

                    <View style={styles.stepsContainer}>
                      <Text style={styles.step}>1. Open any UPI app (GPay, PhonePe, Paytm)</Text>
                      <Text style={styles.step}>2. Scan QR or enter UPI ID</Text>
                      <Text style={styles.step}>3. Pay ₹{selectedPackage.price}</Text>
                      <Text style={styles.step}>4. Take screenshot & upload below</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.uploadButton} onPress={uploadScreenshot}>
                    {screenshot ? (
                      <Image source={{ uri: screenshot }} style={styles.screenshotPreview} />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload" size={32} color={theme.colors.accent} />
                        <Text style={styles.uploadButtonText}>Upload Payment Screenshot</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {screenshot && (
                    <TouchableOpacity
                      style={styles.changeScreenshotButton}
                      onPress={() => setScreenshot(null)}
                    >
                      <Text style={styles.changeScreenshotText}>Change Screenshot</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.submitButton, (!screenshot || !selectedPackage || submitting) && styles.buttonDisabled]}
                  onPress={submitPayment}
                  disabled={!screenshot || !selectedPackage || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={theme.colors.textPrimary} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.textPrimary} />
                      <Text style={styles.submitButtonText}>Submit & Activate Account</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.skipButton} onPress={skipRecharge}>
                  <Text style={styles.skipButtonText}>Skip for Now (Account will remain inactive)</Text>
                </TouchableOpacity>
              </View>
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
  
  // Logo Section with 3D Text
  logoSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
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
    padding: 5,
    borderRadius: 65,
    backgroundColor: '#0D1B2A',
    borderWidth: 4,
    borderColor: '#D4AF37',
    overflow: 'hidden',
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
  
  // Form
  form: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  roleButton: {
    flex: 1,
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  roleButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accentLight,
  },
  roleButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  roleButtonTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.semibold,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.warning,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    paddingVertical: theme.spacing.md,
    marginLeft: theme.spacing.sm,
  },
  signupButton: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  signupGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: '#fff',
    letterSpacing: 1,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
  loginLink: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    marginTop: 50,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
  },
  modalHeader: {
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  welcomeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  welcomeInfo: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  noPackagesBox: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  noPackagesText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  packagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  packageCard: {
    width: '48%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.cardBorder,
    position: 'relative',
  },
  packageCardSelected: {
    borderColor: theme.colors.success,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  packageCardPopular: {
    borderColor: theme.colors.warning,
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: theme.colors.warning,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderBottomLeftRadius: theme.borderRadius.sm,
    borderTopRightRadius: theme.borderRadius.md,
  },
  popularBadgeText: {
    fontSize: 8,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  selectedBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  packageName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  packageCredits: {
    fontSize: 36,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
  },
  packageCreditsLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  packagePrice: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
  },
  packageDescription: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  paymentInstructions: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  qrCode: {
    width: 180,
    height: 180,
    borderRadius: theme.borderRadius.md,
  },
  upiIdContainer: {
    backgroundColor: theme.colors.primaryLight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  upiIdLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  upiId: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
  },
  payToName: {
    textAlign: 'center',
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  amountToPay: {
    textAlign: 'center',
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
    marginBottom: theme.spacing.md,
  },
  stepsContainer: {
    backgroundColor: theme.colors.primaryLight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  step: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  uploadButton: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.accent,
    marginBottom: theme.spacing.md,
  },
  uploadButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.accent,
    marginTop: theme.spacing.sm,
  },
  screenshotPreview: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
  },
  changeScreenshotButton: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  changeScreenshotText: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.sm,
  },
  modalActions: {
    marginTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  submitButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  skipButton: {
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  skipButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
});
