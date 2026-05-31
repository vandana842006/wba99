import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';

export default function AddPatientScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    gender: 'male',
    condition: '',
    notes: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Required', 'Please enter patient name');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Required', 'Please enter patient email');
      return false;
    }
    if (!formData.email.includes('@')) {
      Alert.alert('Invalid', 'Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleAddPatient = async () => {
    if (!validateForm()) return;
    if (!currentUser) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    setLoading(true);
    try {
      const patientData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: 'patient',
        physio_id: currentUser.id,
        profile: {
          phone: formData.phone,
          age: formData.age ? parseInt(formData.age) : null,
          gender: formData.gender,
          condition: formData.condition,
          notes: formData.notes,
        },
      };

      await api.post('/users', patientData);
      
      Alert.alert(
        'Success!',
        `Patient "${formData.name}" has been added successfully.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Add patient error:', error);
      if (error.response?.data?.detail?.includes('already exists')) {
        Alert.alert('Error', 'A patient with this email already exists');
      } else {
        Alert.alert('Error', 'Failed to add patient. Please try again.');
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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add New Patient</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="account-plus" size={64} color={theme.colors.accent} />
          </View>

          {/* Form */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Patient Information</Text>

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter patient's full name"
                  placeholderTextColor={theme.colors.textMuted}
                  value={formData.name}
                  onChangeText={(text) => handleInputChange('name', text)}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="patient@email.com"
                  placeholderTextColor={theme.colors.textMuted}
                  value={formData.email}
                  onChangeText={(text) => handleInputChange('email', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="call" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="+91 XXXXXXXXXX"
                  placeholderTextColor={theme.colors.textMuted}
                  value={formData.phone}
                  onChangeText={(text) => handleInputChange('phone', text)}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Age and Gender Row */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: theme.spacing.sm }]}>
                <Text style={styles.inputLabel}>Age</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, { paddingLeft: theme.spacing.md }]}
                    placeholder="Age"
                    placeholderTextColor={theme.colors.textMuted}
                    value={formData.age}
                    onChangeText={(text) => handleInputChange('age', text)}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.inputLabel}>Gender</Text>
                <View style={styles.genderRow}>
                  {['male', 'female', 'other'].map((gender) => (
                    <TouchableOpacity
                      key={gender}
                      style={[
                        styles.genderBtn,
                        formData.gender === gender && styles.genderBtnActive
                      ]}
                      onPress={() => handleInputChange('gender', gender)}
                    >
                      <Ionicons 
                        name={gender === 'male' ? 'male' : gender === 'female' ? 'female' : 'male-female'} 
                        size={18} 
                        color={formData.gender === gender ? theme.colors.textPrimary : theme.colors.textMuted} 
                      />
                      <Text style={[
                        styles.genderBtnText,
                        formData.gender === gender && styles.genderBtnTextActive
                      ]}>
                        {gender.charAt(0).toUpperCase() + gender.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Condition */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Primary Condition/Diagnosis</Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="medical-bag" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Lower back pain, Knee injury"
                  placeholderTextColor={theme.colors.textMuted}
                  value={formData.condition}
                  onChangeText={(text) => handleInputChange('condition', text)}
                />
              </View>
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Additional Notes</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Any additional information about the patient..."
                placeholderTextColor={theme.colors.textMuted}
                value={formData.notes}
                onChangeText={(text) => handleInputChange('notes', text)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleAddPatient}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.textPrimary} />
            ) : (
              <>
                <Ionicons name="person-add" size={24} color={theme.colors.textPrimary} />
                <Text style={styles.submitButtonText}>Add Patient</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={theme.colors.accent} />
            <Text style={styles.infoText}>
              The patient will be added to your list and can login using their email to view their assessments and exercises.
            </Text>
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
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  formSection: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    fontWeight: theme.fontWeight.semibold,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  inputIcon: {
    paddingLeft: theme.spacing.md,
  },
  input: {
    flex: 1,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  genderRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    gap: 4,
  },
  genderBtnActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  genderBtnText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  genderBtnTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  textArea: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    minHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.accent + '20',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});
