import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface PaymentSettings {
  id: string;
  upi_id: string;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  qr_code_image: string | null;
  report_price: number;
  certificate_price: number;
}

export default function AdminPaymentSettingsScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PaymentSettings>({
    id: 'payment_settings',
    upi_id: '',
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    qr_code_image: null,
    report_price: 500,
    certificate_price: 200,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/payment/settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({
          ...prev,
          ...data,
        }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickQRImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setSettings(prev => ({
          ...prev,
          qr_code_image: base64Image,
        }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const saveSettings = async () => {
    if (!settings.upi_id || !settings.account_holder_name) {
      Alert.alert('Error', 'Please fill UPI ID and Account Holder Name');
      return;
    }

    if (!settings.qr_code_image) {
      Alert.alert('Error', 'Please upload a Payment QR Code image');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/payment/settings?admin_id=${currentUser?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        Alert.alert('Success', 'Payment settings saved successfully!');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save payment settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Settings</Text>
        <TouchableOpacity 
          style={styles.saveBtn}
          onPress={saveSettings}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* QR Code Upload Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="qrcode" size={24} color={theme.colors.gold} />
            <Text style={styles.sectionTitle}>Payment QR Code</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Upload your UPI payment QR code. This will be shown to users before generating reports and certificates.
          </Text>

          <TouchableOpacity style={styles.qrUploadArea} onPress={pickQRImage}>
            {settings.qr_code_image ? (
              <Image 
                source={{ uri: settings.qr_code_image }} 
                style={styles.qrPreview}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Ionicons name="cloud-upload" size={48} color={theme.colors.accent} />
                <Text style={styles.qrPlaceholderText}>Tap to upload QR Code</Text>
              </View>
            )}
          </TouchableOpacity>

          {settings.qr_code_image && (
            <TouchableOpacity 
              style={styles.changeQrBtn}
              onPress={pickQRImage}
            >
              <Ionicons name="camera" size={18} color={theme.colors.accent} />
              <Text style={styles.changeQrText}>Change QR Code</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* UPI Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="bank" size={24} color={theme.colors.success} />
            <Text style={styles.sectionTitle}>UPI Details</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>UPI ID *</Text>
            <TextInput
              style={styles.input}
              value={settings.upi_id}
              onChangeText={(text) => setSettings(prev => ({ ...prev, upi_id: text }))}
              placeholder="example@upi"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Account Holder Name *</Text>
            <TextInput
              style={styles.input}
              value={settings.account_holder_name}
              onChangeText={(text) => setSettings(prev => ({ ...prev, account_holder_name: text }))}
              placeholder="John Doe"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bank Name</Text>
            <TextInput
              style={styles.input}
              value={settings.bank_name}
              onChangeText={(text) => setSettings(prev => ({ ...prev, bank_name: text }))}
              placeholder="IDFC First Bank"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="currency-inr" size={24} color={theme.colors.warning} />
            <Text style={styles.sectionTitle}>Pricing</Text>
          </View>

          <View style={styles.priceRow}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Report Price</Text>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.priceInput}
                  value={String(settings.report_price)}
                  onChangeText={(text) => setSettings(prev => ({ ...prev, report_price: parseInt(text) || 0 }))}
                  keyboardType="numeric"
                  placeholder="500"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Certificate Price</Text>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.priceInput}
                  value={String(settings.certificate_price)}
                  onChangeText={(text) => setSettings(prev => ({ ...prev, certificate_price: parseInt(text) || 0 }))}
                  keyboardType="numeric"
                  placeholder="200"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Preview Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="eye" size={24} color={theme.colors.accent} />
            <Text style={styles.sectionTitle}>Preview</Text>
          </View>
          <Text style={styles.sectionDesc}>This is how users will see the payment screen:</Text>

          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <MaterialCommunityIcons name="file-pdf-box" size={28} color={theme.colors.gold} />
              <View>
                <Text style={styles.previewTitle}>Download Full PDF Report</Text>
                <Text style={styles.previewSubtitle}>WBA99 PhysioScan • {settings.bank_name || 'Bank'}</Text>
              </View>
            </View>

            <View style={styles.previewUpiBox}>
              <MaterialCommunityIcons name="bank" size={24} color={theme.colors.accent} />
              <View style={styles.previewUpiInfo}>
                <Text style={styles.previewUpiLabel}>UPI ID</Text>
                <Text style={styles.previewUpiId}>{settings.upi_id || 'example@upi'}</Text>
              </View>
              <View style={styles.copyBadge}>
                <Text style={styles.copyBadgeText}>Copy</Text>
              </View>
            </View>

            {settings.qr_code_image && (
              <Image 
                source={{ uri: settings.qr_code_image }}
                style={styles.previewQr}
                resizeMode="contain"
              />
            )}

            <View style={styles.previewPriceBox}>
              <Text style={styles.previewPriceLabel}>Full Clinical PDF Report</Text>
              <Text style={styles.previewPrice}>₹{settings.report_price}</Text>
              <Text style={styles.previewPriceDesc}>
                2-page professional report • Patient photo • Causes • Rehab protocol • Evidence
              </Text>
            </View>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={theme.colors.accent} />
          <Text style={styles.infoText}>
            This QR code will be displayed to users before they can generate any PDF report, analysis report, or certificate. Users must scan and pay before downloading.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'ios' ? 10 : 35,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1A3A5C',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.gold,
  },
  saveBtn: {
    backgroundColor: theme.colors.gold,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  content: {
    padding: 15,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  sectionDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 15,
  },
  qrUploadArea: {
    backgroundColor: '#0A1628',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.accent + '40',
    borderStyle: 'dashed',
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  qrPlaceholder: {
    alignItems: 'center',
    gap: 10,
    padding: 30,
  },
  qrPlaceholderText: {
    color: theme.colors.accent,
    fontSize: 14,
  },
  qrPreview: {
    width: '100%',
    height: 250,
  },
  changeQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    padding: 10,
    backgroundColor: theme.colors.accent + '20',
    borderRadius: 8,
  },
  changeQrText: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0A1628',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1A3A5C',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 15,
  },
  priceItem: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 6,
    fontWeight: '600',
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A1628',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1A3A5C',
    overflow: 'hidden',
  },
  currencySymbol: {
    color: theme.colors.gold,
    fontSize: 18,
    fontWeight: 'bold',
    paddingLeft: 12,
    paddingRight: 5,
  },
  priceInput: {
    flex: 1,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewCard: {
    backgroundColor: '#0A1628',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: theme.colors.gold + '40',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
  },
  previewTitle: {
    color: theme.colors.gold,
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  previewUpiBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141B2D',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    gap: 10,
  },
  previewUpiInfo: {
    flex: 1,
  },
  previewUpiLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
  },
  previewUpiId: {
    color: theme.colors.gold,
    fontSize: 14,
    fontWeight: 'bold',
  },
  copyBadge: {
    backgroundColor: theme.colors.accent + '30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  copyBadgeText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  previewQr: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 15,
  },
  previewPriceBox: {
    backgroundColor: theme.colors.gold + '10',
    borderWidth: 1,
    borderColor: theme.colors.gold,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  previewPriceLabel: {
    color: theme.colors.gold,
    fontSize: 14,
    fontWeight: '600',
  },
  previewPrice: {
    color: theme.colors.gold,
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  previewPriceDesc: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: theme.colors.accent + '15',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.accent + '30',
  },
  infoText: {
    flex: 1,
    color: theme.colors.accent,
    fontSize: 12,
    lineHeight: 18,
  },
});
