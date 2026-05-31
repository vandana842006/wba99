import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Get the backend URL from environment/config only - no hardcoded fallbacks
const getBackendUrl = () => {
  // Try expo config extra first (for APK builds)
  if (Constants.expoConfig?.extra?.backendUrl) {
    return Constants.expoConfig.extra.backendUrl;
  }
  // Try environment variable
  if (Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL) {
    return Constants.expoConfig.extra.EXPO_PUBLIC_BACKEND_URL;
  }
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }
  // For web/same-origin deployment - use relative URL
  if (Platform.OS === 'web') {
    return '';
  }
  // For mobile without config - log warning and use empty (will fail gracefully)
  console.warn('No backend URL configured. Set EXPO_PUBLIC_BACKEND_URL in environment.');
  return '';
};

const API_URL = getBackendUrl();

console.log('API URL configured:', API_URL || '(relative)'); // Debug log

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// User APIs
export const createUser = (data: { name: string; email: string; role: string; phone?: string; physio_id?: string; account_activated?: boolean }) =>
  api.post('/users', data);

export const loginUser = (data: { email: string; role: string }) =>
  api.post('/users/login', data);

export const getUsers = (role?: string) =>
  api.get('/users', { params: role ? { role } : {} });

export const getUser = (userId: string) =>
  api.get(`/users/${userId}`);

export const getPhysioPatients = (physioId: string) =>
  api.get(`/users/physio/${physioId}/patients`);

export const assignPatientToPhysio = (userId: string, physioId: string) =>
  api.put(`/users/${userId}/assign-physio/${physioId}`);

export const deleteUser = (userId: string) =>
  api.delete(`/users/${userId}`);

// Assessment APIs
export const createAssessment = (data: {
  patient_id: string;
  physio_id?: string;
  assessment_type: string;
  data: Record<string, any>;
}) => api.post('/assessments', data);

export const getAssessments = (params?: {
  patient_id?: string;
  physio_id?: string;
  assessment_type?: string;
}) => api.get('/assessments', { params });

export const getAssessment = (assessmentId: string) =>
  api.get(`/assessments/${assessmentId}`);

export const deleteAssessment = (assessmentId: string) =>
  api.delete(`/assessments/${assessmentId}`);

// Exercise APIs
export const createExercise = (data: {
  name: string;
  description: string;
  category: string;
  instructions?: string[];
  duration_minutes?: number;
}) => api.post('/exercises', data);

export const getExercises = (category?: string) =>
  api.get('/exercises', { params: category ? { category } : {} });

export const getExercise = (exerciseId: string) =>
  api.get(`/exercises/${exerciseId}`);

export const deleteExercise = (exerciseId: string) =>
  api.delete(`/exercises/${exerciseId}`);

// Assigned Exercise APIs
export const assignExercise = (data: {
  patient_id: string;
  exercise_id: string;
  physio_id: string;
  due_date?: string;
  notes?: string;
}) => api.post('/assigned-exercises', data);

export const getAssignedExercises = (params?: {
  patient_id?: string;
  physio_id?: string;
  status?: string;
}) => api.get('/assigned-exercises', { params });

export const updateAssignmentStatus = (assignmentId: string, status: string) =>
  api.put(`/assigned-exercises/${assignmentId}/status`, null, { params: { status } });

export const deleteAssignedExercise = (assignmentId: string) =>
  api.delete(`/assigned-exercises/${assignmentId}`);

// Prescription APIs
export const createPrescription = (data: {
  patient_id: string;
  physio_id: string;
  title: string;
  diagnosis?: string;
  goals?: string[];
  exercises: Array<{
    exercise_id: string;
    custom_sets?: number;
    custom_reps?: number;
    custom_hold_seconds?: number;
    custom_rest_seconds?: number;
    custom_frequency_per_day?: number;
    custom_frequency_per_week?: number;
    custom_intensity?: string;
    custom_notes?: string;
    order?: number;
  }>;
  total_duration_weeks?: number;
  special_instructions?: string;
  precautions?: string[];
  follow_up_date?: string;
}) => api.post('/prescriptions', data);

export const getPrescriptions = (params?: {
  patient_id?: string;
  physio_id?: string;
  status?: string;
}) => api.get('/prescriptions', { params });

export const getPrescription = (prescriptionId: string) =>
  api.get(`/prescriptions/${prescriptionId}`);

export const updatePrescriptionStatus = (prescriptionId: string, status: string) =>
  api.put(`/prescriptions/${prescriptionId}/status`, null, { params: { status } });

export const deletePrescription = (prescriptionId: string) =>
  api.delete(`/prescriptions/${prescriptionId}`);

// Analytics APIs
export const getAnalyticsOverview = () =>
  api.get('/analytics/overview');

export const getPatientAnalytics = (patientId: string) =>
  api.get(`/analytics/patient/${patientId}`);

// Seed Database
export const seedDatabase = () =>
  api.post('/seed');

// Health Metrics APIs
export const createHealthMetrics = (data: {
  patient_id: string;
  recorded_by?: string;
  date?: string;
  load_monitoring: number;
  training_load_notes?: string;
  resting_heart_rate: number;
  max_heart_rate?: number;
  heart_rate_variability?: number;
  hydration_level: number;
  water_intake_liters: number;
  sleep_quality: number;
  sleep_duration_hours: number;
  sleep_notes?: string;
  protein_intake_grams: number;
  protein_target_grams: number;
  notes?: string;
}) => api.post('/health-metrics', data);

export const getHealthMetrics = (params?: {
  patient_id?: string;
  recorded_by?: string;
}) => api.get('/health-metrics', { params });

export const getLatestHealthMetrics = (patientId: string) =>
  api.get(`/health-metrics/patient/${patientId}/latest`);

export const getHealthTrends = (patientId: string, days: number = 30) =>
  api.get(`/health-metrics/patient/${patientId}/trends`, { params: { days } });

export const deleteHealthMetrics = (metricsId: string) =>
  api.delete(`/health-metrics/${metricsId}`);

// Assessment Reports API
export interface AssessmentReportData {
  patient_id: string;
  patient_name?: string;
  physio_id: string;
  physio_name?: string;
  assessment_type: string;
  data?: Record<string, any>;
  report_data?: Record<string, any>;
  summary?: string;
  ai_analysis?: Record<string, any> | null;
  recommendations?: string[];
  total_score?: number;
  percentage?: number;
  risk_level?: string;
}

export const saveAssessmentReport = (data: AssessmentReportData) =>
  api.post('/assessment-reports', data);

export const getAssessmentReports = (params?: {
  patient_id?: string;
  physio_id?: string;
  assessment_type?: string;
}) => api.get('/assessment-reports', { params });

export const getAssessmentReport = (reportId: string) =>
  api.get(`/assessment-reports/${reportId}`);

export const getPatientReports = (patientId: string) =>
  api.get(`/patient-reports/${patientId}`);

export const getPhysioReports = (physioId: string) =>
  api.get(`/physio-reports/${physioId}`);

export default api;
