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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';

interface ProfileSettings {
  clinic_name: string;
  clinic_address: string;
  clinic_phone: string;
  clinic_email: string;
  logo_url: string;
  signature_url: string;
  name: string;
  email: string;
}

export default function PhysioSettings() {
  const router = useRouter();
  const { currentUser, logout } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ProfileSettings>({
    clinic_name: '',
    clinic_address: '',
    clinic_phone: '',
    clinic_email: '',
    logo_url: '',
    signature_url: '',
    name: '',
    email: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    if (!currentUser) return;
    
    try {
      const response = await api.get(`/users/${currentUser.id}/profile-settings`);
      setSettings({
        clinic_name: response.data.clinic_name || '',
        clinic_address: response.data.clinic_address || '',
        clinic_phone: response.data.clinic_phone || '',
        clinic_email: response.data.clinic_email || '',
        logo_url: response.data.logo_url || '',
        signature_url: response.data.signature_url || '',
        name: response.data.name || currentUser.name || '',
        email: response.data.email || currentUser.email || '',
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (type: 'logo' | 'signature') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'logo' ? [3, 1] : [4, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      
      if (type === 'logo') {
        setSettings({ ...settings, logo_url: base64Image });
      } else {
        setSettings({ ...settings, signature_url: base64Image });
      }
    }
  };

  const saveSettings = async () => {
    if (!currentUser) return;
    
    setSaving(true);
    try {
      await api.put(`/users/${currentUser.id}/profile-settings`, {
        clinic_name: settings.clinic_name,
        clinic_address: settings.clinic_address,
        clinic_phone: settings.clinic_phone,
        clinic_email: settings.clinic_email,
        logo_url: settings.logo_url,
        signature_url: settings.signature_url,
      });
      
      Alert.alert('✅ Success', 'Settings saved successfully! Your logo will appear on all PDFs and reports.');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const removeImage = (type: 'logo' | 'signature') => {
    Alert.alert(
      'Remove Image',
      `Are you sure you want to remove your ${type}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            if (type === 'logo') {
              setSettings({ ...settings, logo_url: '' });
            } else {
              setSettings({ ...settings, signature_url: '' });
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile Settings</Text>
            <TouchableOpacity onPress={saveSettings} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Ionicons name="checkmark" size={24} color={theme.colors.accent} />
              )}
            </TouchableOpacity>
          </View>

          {/* Logo Upload Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏥 Clinic/Practice Logo</Text>
            <Text style={styles.sectionSubtitle}>
              This logo will appear on all your PDF reports, certificates, and documents
            </Text>
            
            <View style={styles.logoContainer}>
              {settings.logo_url ? (
                <View style={styles.logoPreviewContainer}>
                  <Image 
                    source={{ uri: settings.logo_url }} 
                    style={styles.logoPreview}
                    resizeMode="contain"
                  />
                  <View style={styles.logoActions}>
                    <TouchableOpacity 
                      style={styles.logoActionBtn} 
                      onPress={() => pickImage('logo')}
                    >
                      <Ionicons name="create" size={18} color={theme.colors.accent} />
                      <Text style={styles.logoActionText}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.logoActionBtn, { borderColor: theme.colors.error }]} 
                      onPress={() => removeImage('logo')}
                    >
                      <Ionicons name="trash" size={18} color={theme.colors.error} />
                      <Text style={[styles.logoActionText, { color: theme.colors.error }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage('logo')}>
                  <MaterialCommunityIcons name="cloud-upload" size={40} color={theme.colors.accent} />
                  <Text style={styles.uploadText}>Tap to Upload Logo</Text>
                  <Text style={styles.uploadHint}>Recommended: 300x100 pixels (3:1 ratio)</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Signature Upload Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✍️ Digital Signature</Text>
            <Text style={styles.sectionSubtitle}>
              Your signature will appear on reports and certificates
            </Text>
            
            <View style={styles.logoContainer}>
              {settings.signature_url ? (
                <View style={styles.logoPreviewContainer}>
                  <Image 
                    source={{ uri: settings.signature_url }} 
                    style={styles.signaturePreview}
                    resizeMode="contain"
                  />
                  <View style={styles.logoActions}>
                    <TouchableOpacity 
                      style={styles.logoActionBtn} 
                      onPress={() => pickImage('signature')}
                    >
                      <Ionicons name="create" size={18} color={theme.colors.accent} />
                      <Text style={styles.logoActionText}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.logoActionBtn, { borderColor: theme.colors.error }]} 
                      onPress={() => removeImage('signature')}
                    >
                      <Ionicons name="trash" size={18} color={theme.colors.error} />
                      <Text style={[styles.logoActionText, { color: theme.colors.error }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage('signature')}>
                  <MaterialCommunityIcons name="draw" size={40} color={theme.colors.accent} />
                  <Text style={styles.uploadText}>Tap to Upload Signature</Text>
                  <Text style={styles.uploadHint}>Recommended: Transparent background PNG</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Clinic Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Clinic Details</Text>
            <Text style={styles.sectionSubtitle}>
              This information will appear on your reports
            </Text>

            <Text style={styles.inputLabel}>Clinic/Practice Name</Text>
            <TextInput
              style={styles.input}
              value={settings.clinic_name}
              onChangeText={(text) => setSettings({ ...settings, clinic_name: text })}
              placeholder="Enter clinic name"
              placeholderTextColor={theme.colors.textMuted}
            />

            <Text style={styles.inputLabel}>Address</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={settings.clinic_address}
              onChangeText={(text) => setSettings({ ...settings, clinic_address: text })}
              placeholder="Enter full address"
              placeholderTextColor={theme.colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={settings.clinic_phone}
              onChangeText={(text) => setSettings({ ...settings, clinic_phone: text })}
              placeholder="Enter phone number"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={settings.clinic_email}
              onChangeText={(text) => setSettings({ ...settings, clinic_email: text })}
              placeholder="Enter clinic email"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Preview Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👁️ Report Header Preview</Text>
            <View style={styles.previewCard}>
              {settings.logo_url ? (
                <Image 
                  source={{ uri: settings.logo_url }} 
                  style={styles.previewLogo}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.previewLogoPlaceholder}>
                  <Text style={styles.previewLogoText}>YOUR LOGO</Text>
                </View>
              )}
              <View style={styles.previewInfo}>
                <Text style={styles.previewClinicName}>
                  {settings.clinic_name || 'Your Clinic Name'}
                </Text>
                <Text style={styles.previewDetail}>
                  {settings.clinic_address || 'Clinic Address'}
                </Text>
                <Text style={styles.previewDetail}>
                  {settings.clinic_phone || 'Phone'} | {settings.clinic_email || 'Email'}
                </Text>
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={saveSettings}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={theme.colors.textPrimary} />
            ) : (
              <>
                <Ionicons name="save" size={20} color={theme.colors.textPrimary} />
                <Text style={styles.saveButtonText}>Save Settings</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Quick Links */}
          <View style={styles.quickLinks}>
            <TouchableOpacity 
              style={styles.quickLinkBtn}
              onPress={() => router.push('/physio/credits-wallet')}
            >
              <MaterialCommunityIcons name="wallet" size={24} color={theme.colors.warning} />
              <Text style={styles.quickLinkText}>Credits & Wallet</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickLinkBtn}
              onPress={() => {
                Alert.alert('Logout', 'Are you sure you want to logout?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Logout', style: 'destructive', onPress: logout }
                ]);
              }}
            >
              <Ionicons name="log-out" size={24} color={theme.colors.error} />
              <Text style={[styles.quickLinkText, { color: theme.colors.error }]}>Logout</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
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
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  section: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoPreviewContainer: {
    width: '100%',
    alignItems: 'center',
  },
  logoPreview: {
    width: '100%',
    height: 100,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  signaturePreview: {
    width: '100%',
    height: 60,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  logoActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  logoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    gap: theme.spacing.xs,
  },
  logoActionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
  },
  uploadButton: {
    width: '100%',
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.accent,
  },
  uploadText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.semibold,
    marginTop: theme.spacing.sm,
  },
  uploadHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  input: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  previewLogo: {
    width: 80,
    height: 40,
  },
  previewLogoPlaceholder: {
    width: 80,
    height: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  previewLogoText: {
    fontSize: 8,
    color: '#999',
  },
  previewInfo: {
    flex: 1,
  },
  previewClinicName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  previewDetail: {
    fontSize: 8,
    color: '#666',
    marginTop: 2,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  quickLinks: {
    gap: theme.spacing.sm,
  },
  quickLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  quickLinkText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
});
