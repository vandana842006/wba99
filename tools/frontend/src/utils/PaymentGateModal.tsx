import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { theme } from './theme';
import { useStore } from '../store/useStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface PaymentGateModalProps {
  visible: boolean;
  onClose: () => void;
  onPaymentConfirmed: () => void;
  reportType: 'report' | 'certificate' | 'analysis';
  title?: string;
  patientName?: string;
  patientId?: string;
  reportName?: string;
  analysisData?: any;
}

interface PaymentSettings {
  upi_id: string;
  account_holder_name: string;
  bank_name: string;
  qr_code_image: string | null;
  report_price: number;
  certificate_price: number;
}

export const PaymentGateModal: React.FC<PaymentGateModalProps> = ({
  visible,
  onClose,
  onPaymentConfirmed,
  reportType,
  title = 'Download Full PDF Report',
  patientName,
  patientId,
  reportName,
  analysisData,
}) => {
  const { currentUser } = useStore();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchPaymentSettings();
    }
  }, [visible]);

  const fetchPaymentSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/payment/settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        throw new Error('Failed to fetch');
      }
    } catch (error) {
      console.error('Error fetching payment settings:', error);
      Alert.alert(
        'Error',
        'Failed to load payment details. Please try again.',
        [{ text: 'OK', onPress: onClose }]
      );
    } finally {
      setLoading(false);
    }
  };

  const copyUpiId = async () => {
    if (settings?.upi_id) {
      await Clipboard.setStringAsync(settings.upi_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePaymentConfirmed = async () => {
    setConfirming(true);
    try {
      // Log the report generation to the backend
      const price = getPrice();
      const reportTypeNames: Record<string, string> = {
        'report': 'Posture Analysis Report',
        'certificate': 'Professional Certificate',
        'analysis': 'Clinical Assessment',
      };
      
      // Build query parameters for the API call
      const params = new URLSearchParams({
        report_type: reportType,
        report_name: reportName || reportTypeNames[reportType] || 'PDF Report',
        generated_by_id: currentUser?.id || 'unknown',
        generated_by_name: currentUser?.name || 'Unknown User',
        generated_by_role: currentUser?.role || 'physio',
        payment_status: 'paid',
        amount_paid: price.toString(),
      });
      
      if (currentUser?.organization_id) {
        params.append('organization_id', currentUser.organization_id);
        params.append('organization_name', currentUser.organization_name || '');
      }
      
      if (patientId) params.append('patient_id', patientId);
      if (patientName) params.append('patient_name', patientName);
      
      // Log the report generation
      await fetch(`${API_URL}/api/reports/log?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisData || {}),
      });
      
      console.log('Report logged successfully');
    } catch (error) {
      console.error('Error logging report:', error);
      // Continue with report generation even if logging fails
    }
    
    setConfirming(false);
    onPaymentConfirmed();
  };

  const getPrice = () => {
    if (!settings) return 0;
    switch (reportType) {
      case 'certificate':
        return settings.certificate_price || 200;
      case 'report':
      case 'analysis':
      default:
        return settings.report_price || 500;
    }
  };

  const getDescription = () => {
    switch (reportType) {
      case 'certificate':
        return 'Professional certificate with QR verification';
      case 'analysis':
        return 'Detailed posture analysis • Clinical recommendations • Treatment plan';
      case 'report':
      default:
        return '2-page professional report • Patient photo • Causes • Rehab protocol • Evidence';
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="file-pdf-box" size={32} color={theme.colors.gold} />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>
                WBA99 PhysioScan • {settings?.bank_name || 'UPI Payment'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
              <Text style={styles.loadingText}>Loading payment details...</Text>
            </View>
          ) : settings?.qr_code_image ? (
            <ScrollView contentContainerStyle={styles.content}>
              {/* UPI ID Box */}
              <TouchableOpacity style={styles.upiBox} onPress={copyUpiId}>
                <MaterialCommunityIcons name="bank" size={28} color={theme.colors.accent} />
                <View style={styles.upiInfo}>
                  <Text style={styles.upiLabel}>UPI ID</Text>
                  <Text style={styles.upiId}>{settings.upi_id}</Text>
                </View>
                <View style={[styles.copyBtn, copied && styles.copyBtnActive]}>
                  <Text style={[styles.copyBtnText, copied && styles.copyBtnTextActive]}>
                    {copied ? 'Copied!' : 'Copy'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* QR Code Card */}
              <View style={styles.qrCard}>
                <View style={styles.qrHeader}>
                  <Text style={styles.qrTitle}>{settings.account_holder_name || 'WBA99 ANALYSIS EXPERT'}</Text>
                  <Text style={styles.qrSubtitle}>
                    <MaterialCommunityIcons name="check-decagram" size={14} color={theme.colors.accent} />
                    {' '}ID: {settings.upi_id}
                  </Text>
                  <Text style={styles.qrInstructions}>Scan this QR code with any UPI app to transfer</Text>
                </View>

                <Image
                  source={{ uri: settings.qr_code_image }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />

                <Text style={styles.paymentApps}>GPay • PhonePe • Paytm • Any UPI app</Text>
                <Text style={styles.bankName}>{settings.account_holder_name} • {settings.bank_name}</Text>
              </View>

              {/* Price Box */}
              <View style={styles.priceBox}>
                <Text style={styles.priceLabel}>
                  {reportType === 'certificate' ? 'Certificate' : 'Full Clinical PDF Report'}
                </Text>
                <Text style={styles.price}>₹{getPrice()}</Text>
                <Text style={styles.priceDesc}>{getDescription()}</Text>
              </View>

              {/* Confirm Payment Button */}
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handlePaymentConfirmed}
                disabled={confirming}
              >
                {confirming ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="#000" />
                    <Text style={styles.confirmBtnText}>I have completed the payment</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Warning */}
              <View style={styles.warningBox}>
                <Ionicons name="warning" size={18} color={theme.colors.warning} />
                <Text style={styles.warningText}>
                  Please ensure payment is complete before proceeding. Report generation requires valid payment.
                </Text>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={60} color={theme.colors.error} />
              <Text style={styles.errorTitle}>Payment Not Configured</Text>
              <Text style={styles.errorText}>
                Payment QR code is not set up. Please contact admin to configure payment settings.
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={onClose}>
                <Text style={styles.retryBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '95%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1A3A5C',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: theme.colors.gold,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#1A3A5C',
    borderRadius: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: theme.colors.textMuted,
    marginTop: 15,
  },
  content: {
    padding: 18,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  upiBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    gap: 12,
  },
  upiInfo: {
    flex: 1,
  },
  upiLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginBottom: 2,
  },
  upiId: {
    color: theme.colors.gold,
    fontSize: 16,
    fontWeight: 'bold',
  },
  copyBtn: {
    backgroundColor: theme.colors.accent + '30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyBtnActive: {
    backgroundColor: theme.colors.success,
  },
  copyBtnText: {
    color: theme.colors.accent,
    fontWeight: '600',
    fontSize: 13,
  },
  copyBtnTextActive: {
    color: '#fff',
  },
  qrCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  qrHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  qrTitle: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  qrSubtitle: {
    color: theme.colors.accent,
    fontSize: 12,
    marginTop: 5,
  },
  qrInstructions: {
    color: '#666',
    fontSize: 11,
    marginTop: 8,
  },
  qrImage: {
    width: 220,
    height: 220,
    borderRadius: 8,
  },
  paymentApps: {
    color: '#666',
    fontSize: 11,
    marginTop: 15,
  },
  bankName: {
    color: theme.colors.error,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5,
  },
  priceBox: {
    backgroundColor: theme.colors.gold + '15',
    borderWidth: 2,
    borderColor: theme.colors.gold,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 15,
  },
  priceLabel: {
    color: theme.colors.gold,
    fontSize: 14,
    fontWeight: '600',
  },
  price: {
    color: theme.colors.gold,
    fontSize: 36,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  priceDesc: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.gold,
    padding: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 15,
  },
  confirmBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.warning + '15',
    padding: 12,
    borderRadius: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.warning + '30',
  },
  warningText: {
    flex: 1,
    color: theme.colors.warning,
    fontSize: 11,
    lineHeight: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  errorText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default PaymentGateModal;
