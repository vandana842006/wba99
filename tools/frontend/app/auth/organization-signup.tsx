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
  Dimensions,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import api from '../../src/utils/api';
import { useStore } from '../../src/store/useStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Subscription Plans
const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 15000,
    credits: 100,
    physios: 5,
    features: ['5 Physio Accounts', '100 Assessment Credits', 'Basic Analytics', 'Email Support'],
    popular: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 35000,
    credits: 300,
    physios: 15,
    features: ['15 Physio Accounts', '300 Assessment Credits', 'Advanced Analytics', 'AI Features', 'Priority Support'],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 75000,
    credits: 1000,
    physios: 50,
    features: ['50 Physio Accounts', '1000 Assessment Credits', 'Full Analytics Suite', 'All AI Features', 'Research Publishing', '24/7 Support'],
    popular: false,
  },
];

export default function OrganizationSignup() {
  const router = useRouter();
  const { setCurrentUser } = useStore();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Choose Path, 2: Demo/Signup Form, 3: Plan Selection, 4: Payment, 5: Success
  const [signupType, setSignupType] = useState<'demo' | 'full' | null>(null);
  
  // Organization details
  const [orgName, setOrgName] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [orgType, setOrgType] = useState('clinic'); // clinic, hospital, sports_center, rehab_center
  
  // Organization head details
  const [headName, setHeadName] = useState('');
  const [headEmail, setHeadEmail] = useState('');
  const [headPhone, setHeadPhone] = useState('');
  const [headPassword, setHeadPassword] = useState('');
  
  // Plan & Payment
  const [selectedPlan, setSelectedPlan] = useState<string>('professional');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'bank'>('upi');
  
  // Demo account login
  const [demoEmail, setDemoEmail] = useState('');

  const ORG_TYPES = [
    { id: 'clinic', label: 'Clinic', icon: 'medical' },
    { id: 'hospital', label: 'Hospital', icon: 'business' },
    { id: 'sports_center', label: 'Sports Center', icon: 'football' },
    { id: 'rehab_center', label: 'Rehab Center', icon: 'fitness' },
  ];

  // Demo Account Login
  const handleDemoLogin = async () => {
    if (!demoEmail.trim()) {
      Alert.alert('Error', 'Please enter your demo email');
      return;
    }

    setLoading(true);
    try {
      // Check if this email has demo access
      const response = await api.post('/organizations/demo-login', {
        email: demoEmail.trim(),
      });

      if (response.data.success) {
        const user = response.data.user;
        setCurrentUser({
          id: user.id,
          email: user.email,
          name: user.name,
          role: 'org_head',
        });
        
        Alert.alert(
          '🎉 Demo Access Granted!',
          'You now have access to the demo organization dashboard.',
          [{ text: 'Continue', onPress: () => router.replace('/organization/dashboard') }]
        );
      }
    } catch (error: any) {
      console.error('Demo login error:', error);
      // If no demo exists, create one
      if (error.response?.status === 404) {
        Alert.alert(
          'Demo Account',
          'No demo account found. Would you like to create a demo account?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Create Demo', onPress: () => createDemoAccount() },
          ]
        );
      } else {
        Alert.alert('Error', error.response?.data?.detail || 'Demo login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const createDemoAccount = async () => {
    setLoading(true);
    try {
      const response = await api.post('/organizations/create-demo', {
        email: demoEmail.trim(),
        name: demoEmail.split('@')[0] || 'Demo User',
      });

      if (response.data.success) {
        const user = response.data.user;
        setCurrentUser({
          id: user.id,
          email: user.email,
          name: user.name,
          role: 'org_head',
        });
        
        Alert.alert(
          '🎉 Demo Account Created!',
          'Your demo account is ready. You have 14 days to explore all features.',
          [{ text: 'Start Exploring', onPress: () => router.replace('/organization/dashboard') }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create demo account');
    } finally {
      setLoading(false);
    }
  };

  // Full Registration
  const validateOrgDetails = () => {
    if (!orgName.trim()) {
      Alert.alert('Error', 'Please enter organization name');
      return false;
    }
    if (!orgEmail.trim() || !orgEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid organization email');
      return false;
    }
    if (!orgPhone.trim() || orgPhone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return false;
    }
    return true;
  };

  const validateHeadDetails = () => {
    if (!headName.trim()) {
      Alert.alert('Error', 'Please enter organization head name');
      return false;
    }
    if (!headEmail.trim() || !headEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return false;
    }
    if (!headPassword.trim() || headPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleFullSignup = async () => {
    setLoading(true);
    try {
      const plan = PLANS.find(p => p.id === selectedPlan);
      
      const response = await api.post('/organizations/signup', {
        organization: {
          name: orgName,
          email: orgEmail,
          phone: orgPhone,
          address: orgAddress,
          type: orgType,
        },
        head: {
          name: headName,
          email: headEmail,
          phone: headPhone,
          password: headPassword,
        },
        plan: selectedPlan,
        payment: {
          method: paymentMethod,
          amount: plan?.price || 0,
        },
      });

      setStep(5); // Success step
    } catch (error: any) {
      console.error('Signup error:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render Step 1: Choose Path
  const renderChoosePath = () => (
    <View style={styles.stepContainer}>
      <View style={styles.headerSection}>
        <MaterialCommunityIcons name="domain" size={60} color={theme.colors.accent} />
        <Text style={styles.mainTitle}>Organization Portal</Text>
        <Text style={styles.subtitle}>Healthcare Management System</Text>
      </View>

      <View style={styles.pathOptions}>
        {/* Demo Account Option */}
        <TouchableOpacity
          style={[styles.pathCard, styles.demoCard]}
          onPress={() => {
            setSignupType('demo');
            setStep(2);
          }}
        >
          <View style={styles.pathIconContainer}>
            <Ionicons name="flash" size={32} color="#FF9800" />
          </View>
          <Text style={styles.pathTitle}>Try Demo</Text>
          <Text style={styles.pathDesc}>Explore all features with a 14-day free trial</Text>
          <View style={styles.pathBadge}>
            <Text style={styles.pathBadgeText}>FREE</Text>
          </View>
        </TouchableOpacity>

        {/* Full Signup Option */}
        <TouchableOpacity
          style={[styles.pathCard, styles.signupCard]}
          onPress={() => {
            setSignupType('full');
            setStep(2);
          }}
        >
          <View style={styles.pathIconContainer}>
            <Ionicons name="business" size={32} color={theme.colors.accent} />
          </View>
          <Text style={styles.pathTitle}>Register Organization</Text>
          <Text style={styles.pathDesc}>Full access with payment & admin approval</Text>
          <View style={[styles.pathBadge, { backgroundColor: theme.colors.accent }]}>
            <Text style={styles.pathBadgeText}>PREMIUM</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Organization Login */}
      <View style={styles.loginSection}>
        <Text style={styles.loginText}>Already have an organization account?</Text>
        <Link href="/auth/organization-login" asChild>
          <Pressable style={styles.loginButton}>
            <Text style={styles.loginButtonText}>Organization Login</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );

  // Render Step 2: Demo or Org Details
  const renderStep2 = () => {
    if (signupType === 'demo') {
      return (
        <View style={styles.stepContainer}>
          <View style={styles.stepHeader}>
            <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.stepTitle}>Demo Access</Text>
          </View>

          <View style={styles.demoContainer}>
            <MaterialCommunityIcons name="test-tube" size={80} color="#FF9800" />
            <Text style={styles.demoTitle}>Try WBA99 Organization Features</Text>
            <Text style={styles.demoDesc}>
              Get instant access to explore all organization features including:
            </Text>
            
            <View style={styles.demoFeatures}>
              {['Multi-Physio Management', 'Patient Analytics', 'AI Research Tools', 'Report Generation', 'Team Coordination'].map((feature, i) => (
                <View key={i} style={styles.demoFeatureItem}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                  <Text style={styles.demoFeatureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={theme.colors.textMuted}
              value={demoEmail}
              onChangeText={setDemoEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleDemoLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="rocket" size={20} color="#fff" />
                  <Text style={styles.primaryButtonText}>Start Free Demo</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.demoNote}>
              * No credit card required. 14-day free trial.
            </Text>
          </View>
        </View>
      );
    }

    // Full Signup - Organization Details
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.stepTitle}>Organization Details</Text>
          <Text style={styles.stepIndicator}>Step 1/4</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Organization Type</Text>
            <View style={styles.orgTypeGrid}>
              {ORG_TYPES.map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.orgTypeCard, orgType === type.id && styles.orgTypeCardActive]}
                  onPress={() => setOrgType(type.id)}
                >
                  <Ionicons 
                    name={type.icon as any} 
                    size={24} 
                    color={orgType === type.id ? '#fff' : theme.colors.textMuted} 
                  />
                  <Text style={[styles.orgTypeText, orgType === type.id && styles.orgTypeTextActive]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Organization Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., City Physiotherapy Clinic"
              placeholderTextColor={theme.colors.textMuted}
              value={orgName}
              onChangeText={setOrgName}
            />

            <Text style={styles.formLabel}>Organization Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="contact@yourorg.com"
              placeholderTextColor={theme.colors.textMuted}
              value={orgEmail}
              onChangeText={setOrgEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.formLabel}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 98765 43210"
              placeholderTextColor={theme.colors.textMuted}
              value={orgPhone}
              onChangeText={setOrgPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.formLabel}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Full address"
              placeholderTextColor={theme.colors.textMuted}
              value={orgAddress}
              onChangeText={setOrgAddress}
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              if (validateOrgDetails()) setStep(3);
            }}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  // Render Step 3: Head Details & Plan Selection
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={() => setStep(2)} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.stepTitle}>Admin & Plan</Text>
        <Text style={styles.stepIndicator}>Step 2/4</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Organization Head Details */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>👤 Organization Head (Admin)</Text>
          
          <Text style={styles.formLabel}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Your full name"
            placeholderTextColor={theme.colors.textMuted}
            value={headName}
            onChangeText={setHeadName}
          />

          <Text style={styles.formLabel}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="your.email@example.com"
            placeholderTextColor={theme.colors.textMuted}
            value={headEmail}
            onChangeText={setHeadEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.formLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="+91 98765 43210"
            placeholderTextColor={theme.colors.textMuted}
            value={headPhone}
            onChangeText={setHeadPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.formLabel}>Password *</Text>
          <TextInput
            style={styles.input}
            placeholder="Minimum 6 characters"
            placeholderTextColor={theme.colors.textMuted}
            value={headPassword}
            onChangeText={setHeadPassword}
            secureTextEntry
          />
        </View>

        {/* Plan Selection */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>💳 Select Plan</Text>
          
          {PLANS.map(plan => (
            <TouchableOpacity
              key={plan.id}
              style={[styles.planCard, selectedPlan === plan.id && styles.planCardActive]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>POPULAR</Text>
                </View>
              )}
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.planPrice}>
                  <Text style={styles.planPriceAmount}>₹{plan.price.toLocaleString()}</Text>
                  <Text style={styles.planPricePeriod}>/month</Text>
                </View>
              </View>
              <View style={styles.planFeatures}>
                {plan.features.map((feature, i) => (
                  <View key={i} style={styles.planFeatureItem}>
                    <Ionicons name="checkmark" size={16} color={theme.colors.success} />
                    <Text style={styles.planFeatureText}>{feature}</Text>
                  </View>
                ))}
              </View>
              {selectedPlan === plan.id && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.accent} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            if (validateHeadDetails()) setStep(4);
          }}
        >
          <Text style={styles.primaryButtonText}>Continue to Payment</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // Render Step 4: Payment
  const renderStep4 = () => {
    const plan = PLANS.find(p => p.id === selectedPlan);
    
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <TouchableOpacity onPress={() => setStep(3)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.stepTitle}>Payment</Text>
          <Text style={styles.stepIndicator}>Step 3/4</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Order Summary */}
          <View style={styles.orderSummary}>
            <Text style={styles.sectionTitle}>📋 Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Organization</Text>
              <Text style={styles.summaryValue}>{orgName}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Plan</Text>
              <Text style={styles.summaryValue}>{plan?.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Credits</Text>
              <Text style={styles.summaryValue}>{plan?.credits} credits</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Physio Seats</Text>
              <Text style={styles.summaryValue}>{plan?.physios} physios</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₹{plan?.price.toLocaleString()}</Text>
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>💳 Payment Method</Text>
            
            <View style={styles.paymentMethods}>
              <TouchableOpacity
                style={[styles.paymentMethodCard, paymentMethod === 'upi' && styles.paymentMethodActive]}
                onPress={() => setPaymentMethod('upi')}
              >
                <MaterialCommunityIcons name="cellphone" size={24} color={paymentMethod === 'upi' ? '#fff' : theme.colors.textMuted} />
                <Text style={[styles.paymentMethodText, paymentMethod === 'upi' && styles.paymentMethodTextActive]}>UPI</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.paymentMethodCard, paymentMethod === 'card' && styles.paymentMethodActive]}
                onPress={() => setPaymentMethod('card')}
              >
                <Ionicons name="card" size={24} color={paymentMethod === 'card' ? '#fff' : theme.colors.textMuted} />
                <Text style={[styles.paymentMethodText, paymentMethod === 'card' && styles.paymentMethodTextActive]}>Card</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.paymentMethodCard, paymentMethod === 'bank' && styles.paymentMethodActive]}
                onPress={() => setPaymentMethod('bank')}
              >
                <Ionicons name="business" size={24} color={paymentMethod === 'bank' ? '#fff' : theme.colors.textMuted} />
                <Text style={[styles.paymentMethodText, paymentMethod === 'bank' && styles.paymentMethodTextActive]}>Bank</Text>
              </TouchableOpacity>
            </View>

            {paymentMethod === 'upi' && (
              <View style={styles.upiContainer}>
                <Text style={styles.upiLabel}>UPI ID</Text>
                <TextInput
                  style={styles.input}
                  placeholder="yourname@upi"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            )}

            {paymentMethod === 'card' && (
              <View style={styles.cardContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Card Number"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                />
                <View style={styles.cardRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginRight: 8 }]}
                    placeholder="MM/YY"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="CVV"
                    placeholderTextColor={theme.colors.textMuted}
                    secureTextEntry
                  />
                </View>
              </View>
            )}
          </View>

          {/* Admin Approval Notice */}
          <View style={styles.approvalNotice}>
            <Ionicons name="information-circle" size={24} color={theme.colors.info} />
            <Text style={styles.approvalText}>
              After payment, your organization will be reviewed by our admin team. 
              Approval typically takes 1-2 business days. You'll receive an email notification.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.payButton, loading && styles.buttonDisabled]}
            onPress={handleFullSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="lock-closed" size={20} color="#fff" />
                <Text style={styles.payButtonText}>Pay ₹{plan?.price.toLocaleString()} & Submit</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.secureNote}>
            🔒 Secure payment - Contact admin for activation
          </Text>
        </ScrollView>
      </View>
    );
  };

  // Render Step 5: Success
  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark-circle" size={100} color={theme.colors.success} />
      </View>
      <Text style={styles.successTitle}>Registration Submitted!</Text>
      <Text style={styles.successDesc}>
        Your organization registration has been submitted successfully. 
        Our admin team will review your application and approve it within 1-2 business days.
      </Text>
      
      <View style={styles.successSteps}>
        <View style={styles.successStep}>
          <View style={[styles.successStepIcon, { backgroundColor: theme.colors.success }]}>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </View>
          <Text style={styles.successStepText}>Registration submitted</Text>
        </View>
        <View style={styles.successStep}>
          <View style={[styles.successStepIcon, { backgroundColor: theme.colors.warning }]}>
            <Ionicons name="time" size={20} color="#fff" />
          </View>
          <Text style={styles.successStepText}>Payment verification (1-2 hours)</Text>
        </View>
        <View style={styles.successStep}>
          <View style={[styles.successStepIcon, { backgroundColor: theme.colors.textMuted }]}>
            <Ionicons name="shield-checkmark" size={20} color="#fff" />
          </View>
          <Text style={styles.successStepText}>Admin approval (1-2 days)</Text>
        </View>
        <View style={styles.successStep}>
          <View style={[styles.successStepIcon, { backgroundColor: theme.colors.textMuted }]}>
            <Ionicons name="mail" size={20} color="#fff" />
          </View>
          <Text style={styles.successStepText}>Email notification with login details</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.replace('/')}
      >
        <Text style={styles.primaryButtonText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {step === 1 && renderChoosePath()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderSuccess()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  stepContainer: {
    flex: 1,
    padding: theme.spacing.md,
  },
  headerSection: {
    alignItems: 'center',
    marginVertical: theme.spacing.xl,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  pathOptions: {
    gap: theme.spacing.md,
  },
  pathCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
  },
  demoCard: {
    borderColor: '#FF9800',
  },
  signupCard: {
    borderColor: theme.colors.accent,
  },
  pathIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  pathTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  pathDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  pathBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    marginTop: theme.spacing.md,
  },
  pathBadgeText: {
    color: '#fff',
    fontSize: theme.fontSize.xs,
    fontWeight: 'bold',
  },
  loginSection: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
  },
  loginText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  loginButton: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  loginButtonText: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  backBtn: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  stepTitle: {
    flex: 1,
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  stepIndicator: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  demoContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  demoTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  demoDesc: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  demoFeatures: {
    marginVertical: theme.spacing.lg,
    alignSelf: 'stretch',
  },
  demoFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  demoFeatureText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
  },
  demoNote: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  formSection: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  formLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  orgTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  orgTypeCard: {
    width: (SCREEN_WIDTH - 56) / 2,
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.cardBorder,
  },
  orgTypeCardActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  orgTypeText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
  orgTypeTextActive: {
    color: '#fff',
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    marginVertical: theme.spacing.md,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  planCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.cardBorder,
    position: 'relative',
  },
  planCardActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent + '10',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: '#FF9800',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  planName: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  planPrice: {
    alignItems: 'flex-end',
  },
  planPriceAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.accent,
  },
  planPricePeriod: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  planFeatures: {
    gap: theme.spacing.xs,
  },
  planFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  planFeatureText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  orderSummary: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  summaryLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
  },
  summaryValue: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    fontWeight: '500',
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  totalLabel: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  totalValue: {
    color: theme.colors.accent,
    fontSize: 24,
    fontWeight: 'bold',
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  paymentMethodCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.cardBorder,
  },
  paymentMethodActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  paymentMethodText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: 4,
  },
  paymentMethodTextActive: {
    color: '#fff',
  },
  upiContainer: {
    marginTop: theme.spacing.md,
  },
  upiLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  cardContainer: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
  },
  approvalNotice: {
    flexDirection: 'row',
    backgroundColor: theme.colors.info + '20',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  approvalText: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  payButton: {
    backgroundColor: theme.colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  payButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  secureNote: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  successIcon: {
    marginBottom: theme.spacing.lg,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  successDesc: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  successSteps: {
    alignSelf: 'stretch',
    marginBottom: theme.spacing.xl,
  },
  successStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  successStepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successStepText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
  },
});
