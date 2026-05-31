import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../utils/api';
import { useStore } from '../store/useStore';

export interface UserPermissions {
  posture_analysis: boolean;
  walking_analysis: boolean;
  running_analysis: boolean;
  msk_assessment: boolean;
  fms_assessment: boolean;
  ai_analysis: boolean;
  ai_posture_ml: boolean;
  ai_expert_diagnosis: boolean;
  psychology_assessment: boolean;
  education_access: boolean;
  certifications: boolean;
  patient_management: boolean;
  pdf_reports: boolean;
}

export const PERMISSION_KEYS = {
  WALKING_ANALYSIS: 'walking_analysis' as keyof UserPermissions,
  RUNNING_ANALYSIS: 'running_analysis' as keyof UserPermissions,
  AI_ANALYSIS: 'ai_analysis' as keyof UserPermissions,
  AI_POSTURE_ML: 'ai_posture_ml' as keyof UserPermissions,
  MSK_ASSESSMENT: 'msk_assessment' as keyof UserPermissions,
  FMS_ASSESSMENT: 'fms_assessment' as keyof UserPermissions,
  POSTURE_ANALYSIS: 'posture_analysis' as keyof UserPermissions,
};

const DEFAULT_PERMISSIONS: UserPermissions = {
  posture_analysis: true,
  walking_analysis: false,
  running_analysis: false,
  msk_assessment: true,
  fms_assessment: true,
  ai_analysis: false,
  ai_posture_ml: false,
  ai_expert_diagnosis: true,
  psychology_assessment: true,
  education_access: true,
  certifications: true,
  patient_management: true,
  pdf_reports: true,
};

const DEMO_EMAILS = [
  'sarah@wba99.com',
  'admin@wba99.com',
  'demo@wba99.com',
  'test@wba99.com',
  'sportsphysio009@gmail.com',
  'sportsphysio001@gmail.com',
  'wba99physio@gmail.com',
];

export const usePermissions = () => {
  const { currentUser } = useStore();
  const router = useRouter();
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);

  const isDemoAccount = useCallback(() => {
    if (!currentUser?.email) return false;
    return DEMO_EMAILS.includes(currentUser.email.toLowerCase());
  }, [currentUser?.email]);

  const isAdmin = useCallback(() => {
    return currentUser?.role === 'admin';
  }, [currentUser?.role]);

  const fetchPermissions = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    if (isDemoAccount() || isAdmin()) {
      setPermissions({
        ...DEFAULT_PERMISSIONS,
        walking_analysis: true,
        running_analysis: true,
        ai_analysis: true,
        ai_posture_ml: true,
      });
      setLoading(false);
      return;
    }

    try {
      const response = await api.get(`/users/${currentUser.id}/permissions`);
      setPermissions({ ...DEFAULT_PERMISSIONS, ...response.data });
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions(DEFAULT_PERMISSIONS);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, isDemoAccount, isAdmin]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback((permissionKey: keyof UserPermissions): boolean => {
    if (isDemoAccount() || isAdmin()) return true;
    return permissions[permissionKey] ?? false;
  }, [permissions, isDemoAccount, isAdmin]);

  const checkPermissionOrAlert = useCallback((
    permissionKey: keyof UserPermissions,
    featureName: string = 'this feature'
  ): boolean => {
    if (hasPermission(permissionKey)) return true;

    Alert.alert(
      '🔒 Admin Permission Required',
      `Access to ${featureName} requires admin approval.\n\nPlease contact your administrator to enable this feature for your account.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
    return false;
  }, [hasPermission, router]);

  return {
    permissions,
    loading,
    hasPermission,
    checkPermissionOrAlert,
    fetchPermissions,
    isDemoAccount,
    isAdmin,
  };
};
