import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../utils/api';
import { useStore } from '../store/useStore';

// Demo accounts exempt from credits
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

export interface CreditCheckResult {
  success: boolean;
  exempt: boolean;
  message: string;
  credits_deducted: number;
  balance: number;
  credits_required?: number;
}

export function useCredits() {
  const { currentUser } = useStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Check if user is exempt from credit system
  const isExempt = useCallback(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'patient') return true;
    if (DEMO_ACCOUNTS.includes(currentUser.email?.toLowerCase() || '')) return true;
    return false;
  }, [currentUser]);

  // Check and deduct credits for a feature
  const checkAndDeductCredits = useCallback(async (featureKey: string): Promise<CreditCheckResult> => {
    if (!currentUser) {
      return {
        success: false,
        exempt: false,
        message: 'Please login first',
        credits_deducted: 0,
        balance: 0,
      };
    }

    // If exempt, allow immediately
    if (isExempt()) {
      return {
        success: true,
        exempt: true,
        message: 'User exempt from credit system',
        credits_deducted: 0,
        balance: -1,
      };
    }

    setLoading(true);
    try {
      const response = await api.post(`/credits/deduct?user_id=${currentUser.id}&feature_key=${featureKey}`);
      return response.data;
    } catch (error: any) {
      console.error('Credit deduction error:', error);
      return {
        success: false,
        exempt: false,
        message: error.response?.data?.message || 'Failed to check credits',
        credits_deducted: 0,
        balance: 0,
      };
    } finally {
      setLoading(false);
    }
  }, [currentUser, isExempt]);

  // Check credits without deducting
  const checkCredits = useCallback(async (featureKey: string) => {
    if (!currentUser || isExempt()) {
      return { has_credits: true, credits_required: 0, balance: -1 };
    }

    try {
      const response = await api.get(`/credits/check?user_id=${currentUser.id}&feature_key=${featureKey}`);
      return response.data;
    } catch (error) {
      console.error('Credit check error:', error);
      return { has_credits: false, credits_required: 0, balance: 0 };
    }
  }, [currentUser, isExempt]);

  // Get current balance
  const getBalance = useCallback(async () => {
    if (!currentUser) return 0;
    if (isExempt()) return -1; // Unlimited

    try {
      const response = await api.get(`/users/${currentUser.id}/credits`);
      return response.data.credits || 0;
    } catch (error) {
      console.error('Get balance error:', error);
      return 0;
    }
  }, [currentUser, isExempt]);

  // Run feature with credit check
  const runWithCredits = useCallback(async (
    featureKey: string,
    featureName: string,
    onSuccess: () => void | Promise<void>,
    creditsRequired?: number
  ) => {
    if (isExempt()) {
      await onSuccess();
      return;
    }

    // First check if they have enough credits
    const checkResult = await checkCredits(featureKey);
    
    if (!checkResult.has_credits) {
      Alert.alert(
        '⚠️ Insufficient Credits',
        `You need ${checkResult.credits_required} credits for "${featureName}".\n\nYour balance: ${checkResult.balance} credits`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Recharge Now', 
            onPress: () => router.push('/physio/credits-wallet')
          }
        ]
      );
      return;
    }

    // Confirm credit deduction
    Alert.alert(
      '💰 Credit Deduction',
      `"${featureName}" will cost ${checkResult.credits_required} credits.\n\nYour balance: ${checkResult.balance} credits\nAfter: ${checkResult.balance - checkResult.credits_required} credits`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue', 
          onPress: async () => {
            const result = await checkAndDeductCredits(featureKey);
            if (result.success) {
              await onSuccess();
            } else {
              Alert.alert('Error', result.message);
            }
          }
        }
      ]
    );
  }, [isExempt, checkCredits, checkAndDeductCredits, router]);

  // Silent credit deduction (no confirmation)
  const silentDeduct = useCallback(async (featureKey: string): Promise<boolean> => {
    if (isExempt()) return true;

    const result = await checkAndDeductCredits(featureKey);
    if (!result.success) {
      Alert.alert(
        '⚠️ Insufficient Credits',
        result.message,
        [
          { text: 'OK' },
          { 
            text: 'Recharge', 
            onPress: () => router.push('/physio/credits-wallet')
          }
        ]
      );
    }
    return result.success;
  }, [isExempt, checkAndDeductCredits, router]);

  // Get account status
  const getAccountStatus = useCallback(async () => {
    if (!currentUser) return null;
    
    try {
      const response = await api.get(`/users/${currentUser.id}/account-status`);
      return response.data;
    } catch (error) {
      console.error('Account status error:', error);
      return null;
    }
  }, [currentUser]);

  return {
    loading,
    isExempt,
    checkCredits,
    checkAndDeductCredits,
    getBalance,
    runWithCredits,
    silentDeduct,
    getAccountStatus,
  };
}

// Feature keys mapping
export const FEATURE_KEYS = {
  POSTURE_ASSESSMENT: 'posture_assessment',
  WALKING_ASSESSMENT: 'walking_assessment',
  RUNNING_ASSESSMENT: 'running_assessment',
  MSK_ASSESSMENT: 'msk_assessment',
  FMS_ASSESSMENT: 'fms_assessment',
  AI_POSTURE_ANALYSIS: 'ai_posture_analysis',
  AI_RUNNING_ANALYSIS: 'ai_running_analysis',
  AI_EXPERT_DIAGNOSIS: 'ai_expert_diagnosis',
  GONIOMETRY_ROM: 'goniometry_rom',
  PDF_REPORT: 'pdf_report',
  EDUCATION_COURSE: 'education_course',
  RESEARCH_BLOG: 'research_blog',
  CERTIFICATION_EXAM: 'certification_exam',
  GENERATE_CERTIFICATE: 'generate_certificate',
  REHAB_PROGRAM: 'rehab_program',
  SPORTS_ANALYSIS: 'sports_analysis',
  YOGA_ANALYSIS: 'yoga_analysis',
  ATHLETE_LOAD: 'athlete_load',
  ANTHROPOMETRY: 'anthropometry',
  INCLINOMETER: 'inclinometer',
};
