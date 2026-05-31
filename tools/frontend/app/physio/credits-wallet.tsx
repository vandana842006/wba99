import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';

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

interface Transaction {
  id: string;
  amount: number;
  credits_purchased: number;
  status: string;
  created_at: string;
}

export default function CreditsWallet() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [credits, setCredits] = useState(0);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!currentUser) return;
    
    try {
      const [creditsRes, packagesRes, settingsRes, transactionsRes] = await Promise.all([
        api.get(`/users/${currentUser.id}/credits`),
        api.get('/payment/packages'),
        api.get('/payment/settings'),
        api.get(`/payment/transactions/user/${currentUser.id}`),
      ]);
      
      setCredits(creditsRes.data.credits || 0);
      setPackages(packagesRes.data || []);
      setPaymentSettings(settingsRes.data);
      setTransactions(transactionsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const selectPackage = (pkg: CreditPackage) => {
    if (!paymentSettings?.upi_id) {
      Alert.alert('Payment Not Available', 'Payment is not configured yet. Please contact admin.');
      return;
    }
    setSelectedPackage(pkg);
    setShowPaymentModal(true);
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
    if (!screenshot) {
      Alert.alert('Required', 'Please upload payment screenshot');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/payment/purchase?user_id=${currentUser?.id}&package_id=${selectedPackage?.id}`, {
        screenshot_base64: screenshot,
      });

      Alert.alert(
        'Payment Submitted',
        'Your payment has been submitted for verification. Credits will be added once approved.',
        [{ text: 'OK', onPress: () => {
          setShowPaymentModal(false);
          setSelectedPackage(null);
          setScreenshot(null);
          fetchData();
        }}]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return theme.colors.success;
      case 'rejected': return theme.colors.error;
      default: return theme.colors.warning;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Credits</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Credit Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceIcon}>
            <MaterialCommunityIcons name="wallet" size={40} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.balanceInfo}>
            <Text style={styles.balanceLabel}>Available Credits</Text>
            <Text style={styles.balanceValue}>{credits}</Text>
          </View>
          <View style={styles.balanceDecor}>
            <MaterialCommunityIcons name="currency-inr" size={60} color="rgba(255,255,255,0.1)" />
          </View>
        </View>

        {/* Credit Packages */}
        <Text style={styles.sectionTitle}>💰 Buy Credits</Text>
        <View style={styles.packagesGrid}>
          {packages.map((pkg, index) => (
            <TouchableOpacity
              key={pkg.id}
              style={[styles.packageCard, index === 1 && styles.packageCardPopular]}
              onPress={() => selectPackage(pkg)}
            >
              {index === 1 && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>BEST VALUE</Text>
                </View>
              )}
              <Text style={styles.packageName}>{pkg.name}</Text>
              <Text style={styles.packageCredits}>{pkg.credits}</Text>
              <Text style={styles.packageCreditsLabel}>Credits</Text>
              <Text style={styles.packagePrice}>₹{pkg.price}</Text>
              <Text style={styles.packageDescription}>{pkg.description}</Text>
              <View style={styles.packageButton}>
                <Text style={styles.packageButtonText}>Buy Now</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transaction History */}
        <Text style={styles.sectionTitle}>📜 Transaction History</Text>
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={50} color={theme.colors.textMuted} />
            <Text style={styles.emptyStateText}>No transactions yet</Text>
            <Text style={styles.emptyStateSubtext}>Buy credits to get started</Text>
          </View>
        ) : (
          transactions.slice(0, 10).map((tx) => (
            <View key={tx.id} style={styles.transactionCard}>
              <View style={styles.transactionLeft}>
                <Ionicons
                  name={tx.status === 'verified' ? 'checkmark-circle' : tx.status === 'rejected' ? 'close-circle' : 'time'}
                  size={24}
                  color={getStatusColor(tx.status)}
                />
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>
                    {tx.status === 'verified' ? `+${tx.credits_purchased} Credits` : 
                     tx.status === 'rejected' ? 'Payment Rejected' : 'Pending Verification'}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {new Date(tx.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <Text style={[styles.transactionAmount, { color: getStatusColor(tx.status) }]}>
                ₹{tx.amount}
              </Text>
            </View>
          ))
        )}

        {/* Payment Modal */}
        <Modal visible={showPaymentModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Complete Payment</Text>
                <TouchableOpacity onPress={() => {
                  setShowPaymentModal(false);
                  setSelectedPackage(null);
                  setScreenshot(null);
                }}>
                  <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {selectedPackage && (
                <View style={styles.selectedPackageInfo}>
                  <Text style={styles.selectedPackageName}>{selectedPackage.name}</Text>
                  <Text style={styles.selectedPackageDetails}>
                    {selectedPackage.credits} Credits for ₹{selectedPackage.price}
                  </Text>
                </View>
              )}

              <View style={styles.paymentInstructions}>
                <Text style={styles.instructionTitle}>📱 Pay using UPI</Text>
                
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

                <View style={styles.stepsContainer}>
                  <Text style={styles.step}>1. Open any UPI app (GPay, PhonePe, Paytm)</Text>
                  <Text style={styles.step}>2. Scan QR or enter UPI ID</Text>
                  <Text style={styles.step}>3. Pay ₹{selectedPackage?.price}</Text>
                  <Text style={styles.step}>4. Take screenshot of payment confirmation</Text>
                  <Text style={styles.step}>5. Upload screenshot below</Text>
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

              <TouchableOpacity
                style={[styles.submitButton, (!screenshot || submitting) && styles.buttonDisabled]}
                onPress={submitPayment}
                disabled={!screenshot || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={theme.colors.textPrimary} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.textPrimary} />
                    <Text style={styles.submitButtonText}>Submit for Verification</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  scrollContent: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: theme.spacing.md, color: theme.colors.textSecondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  headerTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  balanceCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: theme.colors.accent, 
    borderRadius: theme.borderRadius.xl, 
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  balanceIcon: { 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    padding: theme.spacing.md, 
    borderRadius: theme.borderRadius.full 
  },
  balanceInfo: { flex: 1, marginLeft: theme.spacing.md },
  balanceLabel: { fontSize: theme.fontSize.sm, color: 'rgba(255,255,255,0.8)' },
  balanceValue: { fontSize: 42, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  balanceDecor: { position: 'absolute', right: -10, top: -10 },
  sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  packagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.xl },
  packageCard: { 
    width: '48%', 
    backgroundColor: theme.colors.card, 
    borderRadius: theme.borderRadius.lg, 
    padding: theme.spacing.md, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  packageCardPopular: { borderColor: theme.colors.warning, borderWidth: 2 },
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
  popularBadgeText: { fontSize: 8, fontWeight: theme.fontWeight.bold, color: theme.colors.primary },
  packageName: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  packageCredits: { fontSize: 36, fontWeight: theme.fontWeight.bold, color: theme.colors.accent },
  packageCreditsLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  packagePrice: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.success },
  packageDescription: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, textAlign: 'center', marginVertical: theme.spacing.sm },
  packageButton: { backgroundColor: theme.colors.accent, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.sm },
  packageButtonText: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  emptyState: { alignItems: 'center', padding: theme.spacing.xl, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg },
  emptyStateText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary, marginTop: theme.spacing.md },
  emptyStateSubtext: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  transactionCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card, 
    borderRadius: theme.borderRadius.md, 
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  transactionLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  transactionInfo: {},
  transactionTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  transactionDate: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted },
  transactionAmount: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.card, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, padding: theme.spacing.xl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  modalTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  selectedPackageInfo: { backgroundColor: theme.colors.primaryLight, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.lg, alignItems: 'center' },
  selectedPackageName: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  selectedPackageDetails: { fontSize: theme.fontSize.md, color: theme.colors.accent },
  paymentInstructions: { marginBottom: theme.spacing.lg },
  instructionTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  qrContainer: { alignItems: 'center', marginBottom: theme.spacing.md },
  qrCode: { width: 180, height: 180, borderRadius: theme.borderRadius.md },
  upiIdContainer: { backgroundColor: theme.colors.primaryLight, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center', marginBottom: theme.spacing.md },
  upiIdLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted },
  upiId: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.accent },
  payToName: { textAlign: 'center', fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.md },
  stepsContainer: { backgroundColor: theme.colors.primaryLight, padding: theme.spacing.md, borderRadius: theme.borderRadius.md },
  step: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
  uploadButton: { 
    backgroundColor: theme.colors.primaryLight, 
    borderRadius: theme.borderRadius.lg, 
    padding: theme.spacing.xl, 
    alignItems: 'center', 
    borderWidth: 2, 
    borderStyle: 'dashed', 
    borderColor: theme.colors.accent,
    marginBottom: theme.spacing.md,
  },
  uploadButtonText: { fontSize: theme.fontSize.md, color: theme.colors.accent, marginTop: theme.spacing.sm },
  screenshotPreview: { width: '100%', height: 200, borderRadius: theme.borderRadius.md },
  changeScreenshotButton: { alignItems: 'center', marginBottom: theme.spacing.md },
  changeScreenshotText: { color: theme.colors.accent, fontSize: theme.fontSize.sm },
  submitButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: theme.colors.success, 
    borderRadius: theme.borderRadius.md, 
    padding: theme.spacing.md, 
    gap: theme.spacing.sm 
  },
  submitButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  buttonDisabled: { opacity: 0.5 },
});
