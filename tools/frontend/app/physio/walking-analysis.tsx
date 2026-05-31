import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import { getPhysioPatients, saveAssessmentReport } from '../../src/utils/api';
import api from '../../src/utils/api';
import { generateWalkingAnalysisPDF, sharePDF } from '../../src/utils/pdfGenerator';
import { usePermissions, PERMISSION_KEYS } from '../../src/hooks/usePermissions';

interface SensorData {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

interface Patient {
  id: string;
  name: string;
  email: string;
}

type ViewType = 'anterior' | 'posterior' | 'lateral_left' | 'lateral_right';

export default function WalkingAnalysisScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  const { hasPermission, loading: permissionLoading } = usePermissions();
  const [permission, requestPermission] = useCameraPermissions();
  
  // Check permission on mount
  useEffect(() => {
    if (!permissionLoading && !hasPermission(PERMISSION_KEYS.WALKING_ANALYSIS)) {
      Alert.alert(
        '🔒 Admin Permission Required',
        'Access to Camera Walking Analysis requires admin approval.\n\nPlease contact your administrator to enable this feature for your account.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [permissionLoading, hasPermission, router]);
  
  // Patient selection
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(true);
  
  // View selection
  const [currentView, setCurrentView] = useState<ViewType>('lateral_right');
  const [completedViews, setCompletedViews] = useState<ViewType[]>([]);
  const [viewResults, setViewResults] = useState<Record<ViewType, any>>({});
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [accelerometerData, setAccelerometerData] = useState<SensorData[]>([]);
  const [gyroscopeData, setGyroscopeData] = useState<SensorData[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Landscape mode
  const [isLandscape, setIsLandscape] = useState(false);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  
  // Final results
  const [showResults, setShowResults] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  
  // Video recording
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  
  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [assessmentSaved, setAssessmentSaved] = useState(false);
  
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const accelSubscription = useRef<any>(null);
  const gyroSubscription = useRef<any>(null);
  const accelDataRef = useRef<SensorData[]>([]);
  const gyroDataRef = useRef<SensorData[]>([]);
  const cameraRef = useRef<any>(null);

  // Fetch QR code on mount
  useEffect(() => {
    fetchQRCode();
  }, []);

  // Fetch patients on mount
  useEffect(() => {
    const fetchPatients = async () => {
      if (currentUser?.role === 'physio' || currentUser?.role === 'admin') {
        try {
          const response = await getPhysioPatients(currentUser.id);
          setPatients(response.data);
        } catch (error) {
          console.error('Error fetching patients:', error);
        }
      }
      setLoadingPatients(false);
    };
    fetchPatients();
  }, [currentUser]);

  // Handle orientation change
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
      setIsLandscape(window.width > window.height);
    });

    return () => subscription?.remove();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (accelSubscription.current) {
        accelSubscription.current.remove();
      }
      if (gyroSubscription.current) {
        gyroSubscription.current.remove();
      }
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      // Reset orientation
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const toggleLandscape = async () => {
    try {
      if (isLandscape) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
      }
      setIsLandscape(!isLandscape);
    } catch (error) {
      console.error('Error changing orientation:', error);
    }
  };

  const startRecording = async () => {
    if (!selectedPatient) {
      Alert.alert('Select Patient', 'Please select a patient before recording');
      return;
    }

    setIsRecording(true);
    setRecordingTime(0);
    accelDataRef.current = [];
    gyroDataRef.current = [];
    setAccelerometerData([]);
    setGyroscopeData([]);

    // Set sensor update interval
    Accelerometer.setUpdateInterval(50); // 20 samples per second
    Gyroscope.setUpdateInterval(50);

    // Start accelerometer
    accelSubscription.current = Accelerometer.addListener((data) => {
      const newData = { ...data, timestamp: Date.now() };
      accelDataRef.current.push(newData);
      setAccelerometerData(prev => [...prev, newData]);
    });

    // Start gyroscope
    gyroSubscription.current = Gyroscope.addListener((data) => {
      const newData = { ...data, timestamp: Date.now() };
      gyroDataRef.current.push(newData);
      setGyroscopeData(prev => [...prev, newData]);
    });

    // Start timer
    recordingInterval.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = async () => {
    setIsRecording(false);

    // Stop sensors
    if (accelSubscription.current) {
      accelSubscription.current.remove();
      accelSubscription.current = null;
    }
    if (gyroSubscription.current) {
      gyroSubscription.current.remove();
      gyroSubscription.current = null;
    }

    // Stop timer
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }

    // Analyze data for current view
    await analyzeViewData();
  };

  const analyzeViewData = async () => {
    const accelData = accelDataRef.current;
    const gyroData = gyroDataRef.current;

    if (accelData.length < 20) {
      Alert.alert('Error', 'Not enough data recorded. Please record for at least 5 seconds.');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await api.post('/camera-walking-analysis', {
        patient_id: selectedPatient?.id,
        physio_id: currentUser?.id,
        accelerometer_data: accelData.map(d => ({ x: d.x, y: d.y, z: d.z })),
        gyroscope_data: gyroData.map(d => ({ x: d.x, y: d.y, z: d.z })),
        video_duration_seconds: recordingTime,
        frames_analyzed: accelData.length,
      });

      // Store results for this view
      setViewResults(prev => ({
        ...prev,
        [currentView]: {
          ...response.data,
          view_type: currentView,
          view_label: getViewLabel(currentView),
        }
      }));

      // Mark view as completed
      if (!completedViews.includes(currentView)) {
        setCompletedViews(prev => [...prev, currentView]);
      }

      Alert.alert(
        'View Completed',
        `${getViewLabel(currentView)} analysis complete! Score: ${response.data.overall_score}%`,
        [
          { text: 'Record Another View', onPress: () => {} },
          { text: 'View All Results', onPress: () => setShowResults(true) },
        ]
      );
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert('Error', 'Failed to analyze walking data');
    } finally {
      setAnalyzing(false);
    }
  };

  const getViewLabel = (view: ViewType) => {
    switch (view) {
      case 'anterior': return 'Anterior (Front)';
      case 'posterior': return 'Posterior (Back)';
      case 'lateral_left': return 'Lateral Left';
      case 'lateral_right': return 'Lateral Right';
    }
  };

  const getViewIcon = (view: ViewType) => {
    switch (view) {
      case 'anterior': return 'body';
      case 'posterior': return 'body-outline';
      case 'lateral_left': return 'arrow-back';
      case 'lateral_right': return 'arrow-forward';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.warning;
    return theme.colors.error;
  };

  const calculateOverallScore = () => {
    const results = Object.values(viewResults);
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, r) => acc + (r.overall_score || 0), 0);
    return Math.round(sum / results.length);
  };

  const fetchQRCode = async () => {
    try {
      const response = await api.get('/qr-codes/active');
      setQrCode(response.data.qr_image_url);
    } catch (error) {
      console.log('No active QR code found');
    }
  };

  const pickPaymentScreenshot = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setPaymentScreenshot(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const submitPaymentProof = async () => {
    if (!paymentScreenshot) {
      Alert.alert('Required', 'Please upload payment screenshot');
      return;
    }

    setSubmittingPayment(true);
    try {
      await api.post('/payment-proofs', {
        physio_id: currentUser?.id,
        patient_id: selectedPatient?.id,
        report_type: 'walking',
        screenshot_url: paymentScreenshot,
        amount: 500,
      });
      
      setPaymentVerified(true);
      setShowPaymentModal(false);
      Alert.alert('Success', 'Payment verified! Generating your report...', [
        { text: 'OK', onPress: () => actualGeneratePDF() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit payment proof');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!selectedPatient || Object.keys(viewResults).length === 0) {
      Alert.alert('Error', 'No analysis data to generate report');
      return;
    }
    
    if (paymentVerified || !qrCode) {
      // Already paid or no QR code set - generate directly
      actualGeneratePDF();
    } else {
      // Show payment modal first
      setShowPaymentModal(true);
    }
  };

  // Save Assessment to Database
  const handleSaveAssessment = async () => {
    if (!selectedPatient || !currentUser?.id) {
      Alert.alert('Error', 'Please select a patient first');
      return;
    }

    if (Object.keys(viewResults).length === 0) {
      Alert.alert('Error', 'Please complete the walking analysis before saving');
      return;
    }

    setSavingAssessment(true);
    try {
      const reportData = {
        physio_id: currentUser.id,
        patient_id: selectedPatient.id,
        assessment_type: 'walking',
        report_data: {
          viewResults,
          overallScore: calculateOverallScore(),
          recordedDuration: recordedDuration,
        },
        summary: `Walking Analysis: Overall Score ${calculateOverallScore()}/100, Views analyzed: ${Object.keys(viewResults).length}`,
      };

      await saveAssessmentReport(reportData);
      setAssessmentSaved(true);
      Alert.alert(
        '✅ Assessment Saved',
        `Walking analysis for ${selectedPatient.name} has been saved successfully.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving assessment:', error);
      Alert.alert('Error', 'Failed to save assessment. Please try again.');
    } finally {
      setSavingAssessment(false);
    }
  };

  const actualGeneratePDF = async () => {
    if (!selectedPatient || Object.keys(viewResults).length === 0) {
      Alert.alert('Error', 'No analysis data to generate report');
      return;
    }

    setGeneratingPDF(true);
    try {
      const pdfUri = await generateWalkingAnalysisPDF(
        {
          name: selectedPatient.name,
          email: selectedPatient.email,
          id: selectedPatient.id,
        },
        currentUser ? {
          name: currentUser.name || 'Unknown',
          email: currentUser.email || '',
        } : null,
        viewResults,
        calculateOverallScore(),
        new Date()
      );

      await sharePDF(pdfUri, `Walking_Analysis_${selectedPatient.name.replace(/\s+/g, '_')}.pdf`);
      Alert.alert('Success', 'PDF report generated and ready to share!');
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert('Error', 'Failed to generate PDF report');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const startVideoRecording = async () => {
    if (cameraRef.current) {
      try {
        setIsVideoRecording(true);
        const video = await cameraRef.current.recordAsync({
          maxDuration: 60,
          quality: '720p',
        });
        setVideoUri(video.uri);
      } catch (error) {
        console.error('Video recording error:', error);
      } finally {
        setIsVideoRecording(false);
      }
    }
  };

  const stopVideoRecording = () => {
    if (cameraRef.current && isVideoRecording) {
      cameraRef.current.stopRecording();
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Initializing camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="camera-outline" size={64} color={theme.colors.textMuted} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera and motion sensor access to analyze walking patterns.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Landscape Recording View
  if (isLandscape && isRecording) {
    return (
      <View style={styles.landscapeContainer}>
        <StatusBar hidden />
        <CameraView style={styles.landscapeCamera} facing="back">
          {/* Overlay */}
          <View style={styles.landscapeOverlay}>
            {/* Top Bar */}
            <View style={styles.landscapeTopBar}>
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>REC</Text>
              </View>
              <Text style={styles.viewLabel}>{getViewLabel(currentView)}</Text>
              <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
            </View>

            {/* Side Stats */}
            <View style={styles.landscapeSideStats}>
              <View style={styles.sideStatItem}>
                <Text style={styles.sideStatValue}>{accelerometerData.length}</Text>
                <Text style={styles.sideStatLabel}>Samples</Text>
              </View>
              <View style={styles.sideStatItem}>
                <Text style={styles.sideStatValue}>{recordingTime}s</Text>
                <Text style={styles.sideStatLabel}>Duration</Text>
              </View>
            </View>

            {/* Patient Info */}
            <View style={styles.landscapePatientInfo}>
              <Ionicons name="person" size={20} color={theme.colors.textPrimary} />
              <Text style={styles.landscapePatientName}>{selectedPatient?.name}</Text>
            </View>

            {/* Stop Button */}
            <TouchableOpacity style={styles.landscapeStopButton} onPress={stopRecording}>
              <Ionicons name="stop" size={40} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  // Results View
  if (showResults) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.resultsHeader}>
            <TouchableOpacity onPress={() => setShowResults(false)}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.resultsTitle}>Walking Analysis Results</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Patient Info */}
          <View style={styles.patientCard}>
            <Ionicons name="person" size={24} color={theme.colors.accent} />
            <View style={styles.patientCardInfo}>
              <Text style={styles.patientCardName}>{selectedPatient?.name}</Text>
              <Text style={styles.patientCardEmail}>{selectedPatient?.email}</Text>
            </View>
          </View>

          {/* Overall Score */}
          <View style={[styles.overallScoreCard, { borderColor: getScoreColor(calculateOverallScore()) }]}>
            <Text style={styles.overallScoreLabel}>Overall Walking Score</Text>
            <Text style={[styles.overallScoreValue, { color: getScoreColor(calculateOverallScore()) }]}>
              {calculateOverallScore()}%
            </Text>
            <Text style={styles.viewsCompleted}>
              {completedViews.length} of 4 views analyzed
            </Text>
          </View>

          {/* View Results */}
          <Text style={styles.sectionTitle}>View Analysis</Text>
          {(['lateral_right', 'lateral_left', 'anterior', 'posterior'] as ViewType[]).map((view) => {
            const result = viewResults[view];
            const isCompleted = completedViews.includes(view);
            
            return (
              <View key={view} style={[styles.viewResultCard, !isCompleted && styles.viewResultCardIncomplete]}>
                <View style={styles.viewResultHeader}>
                  <View style={styles.viewResultIcon}>
                    <Ionicons 
                      name={getViewIcon(view)} 
                      size={24} 
                      color={isCompleted ? theme.colors.accent : theme.colors.textMuted} 
                    />
                  </View>
                  <Text style={styles.viewResultTitle}>{getViewLabel(view)}</Text>
                  {isCompleted ? (
                    <Text style={[styles.viewResultScore, { color: getScoreColor(result?.overall_score || 0) }]}>
                      {result?.overall_score}%
                    </Text>
                  ) : (
                    <Text style={styles.viewResultPending}>Not recorded</Text>
                  )}
                </View>

                {isCompleted && result && (
                  <View style={styles.viewResultMetrics}>
                    <View style={styles.viewMetricItem}>
                      <Text style={styles.viewMetricValue}>{result.step_count}</Text>
                      <Text style={styles.viewMetricLabel}>Steps</Text>
                    </View>
                    <View style={styles.viewMetricItem}>
                      <Text style={styles.viewMetricValue}>{result.cadence}</Text>
                      <Text style={styles.viewMetricLabel}>Cadence</Text>
                    </View>
                    <View style={styles.viewMetricItem}>
                      <Text style={styles.viewMetricValue}>{result.gait_symmetry}%</Text>
                      <Text style={styles.viewMetricLabel}>Symmetry</Text>
                    </View>
                    <View style={styles.viewMetricItem}>
                      <Text style={styles.viewMetricValue}>{result.stability_score}%</Text>
                      <Text style={styles.viewMetricLabel}>Stability</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          {/* Recommendations */}
          {Object.values(viewResults).length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              <View style={styles.recommendationsCard}>
                {Object.values(viewResults).flatMap((r: any, i) => 
                  r.recommendations?.map((rec: string, j: number) => (
                    <View key={`${i}-${j}`} style={styles.recommendationItem}>
                      <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                      <Text style={styles.recommendationText}>{rec}</Text>
                    </View>
                  ))
                ).slice(0, 5)}
              </View>
            </>
          )}

          {/* PDF Export Button */}
          <TouchableOpacity 
            style={styles.pdfButton} 
            onPress={handleGeneratePDF}
            disabled={generatingPDF}
          >
            {generatingPDF ? (
              <ActivityIndicator size="small" color={theme.colors.textPrimary} />
            ) : (
              <>
                <Ionicons name="document-text" size={24} color={theme.colors.textPrimary} />
                <Text style={styles.pdfButtonText}>Generate PDF Report</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Save Assessment Button */}
          <TouchableOpacity
            style={[styles.saveButton, (savingAssessment || assessmentSaved) && styles.buttonDisabled]}
            onPress={handleSaveAssessment}
            disabled={savingAssessment || assessmentSaved}
          >
            {savingAssessment ? (
              <>
                <ActivityIndicator size="small" color={theme.colors.textPrimary} />
                <Text style={styles.saveButtonText}>Saving...</Text>
              </>
            ) : assessmentSaved ? (
              <>
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.textPrimary} />
                <Text style={styles.saveButtonText}>Assessment Saved</Text>
              </>
            ) : (
              <>
                <Ionicons name="save" size={24} color={theme.colors.textPrimary} />
                <Text style={styles.saveButtonText}>Save to Patient Record</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Actions */}
          <View style={styles.resultsActions}>
            <TouchableOpacity style={styles.newAnalysisButton} onPress={() => {
              setShowResults(false);
              setCompletedViews([]);
              setViewResults({});
            }}>
              <Ionicons name="refresh" size={20} color={theme.colors.textPrimary} />
              <Text style={styles.newAnalysisText}>New Analysis</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Main Recording Setup View
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <MaterialCommunityIcons name="walk" size={40} color={theme.colors.accent} />
          <Text style={styles.title}>Walking Analysis</Text>
          <Text style={styles.subtitle}>Multi-view gait analysis with lateral parameters</Text>
        </View>

        {/* Patient Selection */}
        <Text style={styles.sectionTitle}>Patient</Text>
        <TouchableOpacity style={styles.patientSelector} onPress={() => setShowPatientModal(true)}>
          {selectedPatient ? (
            <>
              <Ionicons name="person" size={24} color={theme.colors.accent} />
              <View style={styles.patientSelectorInfo}>
                <Text style={styles.patientSelectorName}>{selectedPatient.name}</Text>
                <Text style={styles.patientSelectorEmail}>{selectedPatient.email}</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
            </>
          ) : (
            <>
              <Ionicons name="person-add" size={24} color={theme.colors.textMuted} />
              <Text style={styles.patientSelectorPlaceholder}>Select a patient</Text>
              <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
            </>
          )}
        </TouchableOpacity>

        {/* View Selection */}
        <Text style={styles.sectionTitle}>Recording View</Text>
        <View style={styles.viewGrid}>
          {(['lateral_right', 'lateral_left', 'anterior', 'posterior'] as ViewType[]).map((view) => (
            <TouchableOpacity
              key={view}
              style={[
                styles.viewButton,
                currentView === view && styles.viewButtonActive,
                completedViews.includes(view) && styles.viewButtonCompleted,
              ]}
              onPress={() => setCurrentView(view)}
            >
              <Ionicons 
                name={getViewIcon(view)} 
                size={28} 
                color={currentView === view ? theme.colors.textPrimary : theme.colors.textSecondary} 
              />
              <Text style={[
                styles.viewButtonText,
                currentView === view && styles.viewButtonTextActive
              ]}>
                {getViewLabel(view).split(' ')[0]}
              </Text>
              {completedViews.includes(view) && (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark" size={12} color={theme.colors.textPrimary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Camera Preview */}
        <View style={styles.cameraContainer}>
          <CameraView style={styles.camera} facing="back">
            <View style={styles.cameraOverlay}>
              <Text style={styles.cameraViewLabel}>{getViewLabel(currentView)}</Text>
            </View>
          </CameraView>
        </View>

        {/* Landscape Toggle */}
        <TouchableOpacity style={styles.landscapeToggle} onPress={toggleLandscape}>
          <Ionicons name="phone-landscape" size={20} color={theme.colors.accent} />
          <Text style={styles.landscapeToggleText}>
            {isLandscape ? 'Switch to Portrait' : 'Switch to Landscape Mode'}
          </Text>
        </TouchableOpacity>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Instructions for {getViewLabel(currentView)}</Text>
          {currentView.includes('lateral') ? (
            <>
              <Text style={styles.instructionText}>• Position camera at hip level, perpendicular to walking path</Text>
              <Text style={styles.instructionText}>• Patient walks parallel to camera (side view)</Text>
              <Text style={styles.instructionText}>• Ensure full body is visible during entire walk</Text>
              <Text style={styles.instructionText}>• Record 15-20 seconds of continuous walking</Text>
            </>
          ) : (
            <>
              <Text style={styles.instructionText}>• Position camera at hip level facing the walking path</Text>
              <Text style={styles.instructionText}>• Patient walks {currentView === 'anterior' ? 'toward' : 'away from'} the camera</Text>
              <Text style={styles.instructionText}>• Maintain steady camera position</Text>
              <Text style={styles.instructionText}>• Record 15-20 seconds of continuous walking</Text>
            </>
          )}
        </View>

        {/* Lateral View Parameters Info */}
        <View style={styles.parametersCard}>
          <Text style={styles.parametersTitle}>Parameters Analyzed</Text>
          <View style={styles.parametersList}>
            <View style={styles.parameterItem}>
              <Ionicons name="footsteps" size={18} color={theme.colors.accent} />
              <Text style={styles.parameterText}>Step Count & Cadence</Text>
            </View>
            <View style={styles.parameterItem}>
              <Ionicons name="git-compare" size={18} color={theme.colors.success} />
              <Text style={styles.parameterText}>Gait Symmetry</Text>
            </View>
            <View style={styles.parameterItem}>
              <Ionicons name="analytics" size={18} color={theme.colors.warning} />
              <Text style={styles.parameterText}>Stride Variability</Text>
            </View>
            <View style={styles.parameterItem}>
              <Ionicons name="shield-checkmark" size={18} color={theme.colors.info} />
              <Text style={styles.parameterText}>Stability Score</Text>
            </View>
            <View style={styles.parameterItem}>
              <MaterialCommunityIcons name="human" size={18} color={theme.colors.error} />
              <Text style={styles.parameterText}>Trunk Rotation</Text>
            </View>
            <View style={styles.parameterItem}>
              <MaterialCommunityIcons name="angle-acute" size={18} color={theme.colors.accent} />
              <Text style={styles.parameterText}>Hip/Knee Angles (Lateral)</Text>
            </View>
          </View>
        </View>

        {/* Control Buttons */}
        <View style={styles.controlsContainer}>
          {!isRecording ? (
            <TouchableOpacity 
              style={[styles.startButton, !selectedPatient && styles.buttonDisabled]} 
              onPress={startRecording}
              disabled={!selectedPatient}
            >
              <Ionicons name="videocam" size={28} color={theme.colors.textPrimary} />
              <Text style={styles.startButtonText}>Start Recording</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
              <Ionicons name="stop" size={28} color={theme.colors.textPrimary} />
              <Text style={styles.stopButtonText}>Stop Recording ({recordingTime}s)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* View Results Button */}
        {completedViews.length > 0 && (
          <TouchableOpacity style={styles.viewResultsButton} onPress={() => setShowResults(true)}>
            <Ionicons name="analytics" size={20} color={theme.colors.accent} />
            <Text style={styles.viewResultsText}>View Results ({completedViews.length} views)</Text>
          </TouchableOpacity>
        )}

        {/* Analyzing Overlay */}
        {analyzing && (
          <View style={styles.analyzingOverlay}>
            <View style={styles.analyzingCard}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
              <Text style={styles.analyzingText}>Analyzing {getViewLabel(currentView)}...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Patient Selection Modal */}
      <Modal
        visible={showPatientModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPatientModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Patient</Text>
              <TouchableOpacity onPress={() => setShowPatientModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {loadingPatients ? (
                <ActivityIndicator size="large" color={theme.colors.accent} />
              ) : patients.length > 0 ? (
                patients.map((patient) => (
                  <TouchableOpacity
                    key={patient.id}
                    style={[
                      styles.patientOption,
                      selectedPatient?.id === patient.id && styles.patientOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedPatient(patient);
                      setShowPatientModal(false);
                    }}
                  >
                    <Ionicons 
                      name="person" 
                      size={24} 
                      color={selectedPatient?.id === patient.id ? theme.colors.accent : theme.colors.textMuted} 
                    />
                    <View style={styles.patientOptionInfo}>
                      <Text style={styles.patientOptionName}>{patient.name}</Text>
                      <Text style={styles.patientOptionEmail}>{patient.email}</Text>
                    </View>
                    {selectedPatient?.id === patient.id && (
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.accent} />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noPatients}>
                  <Ionicons name="people" size={48} color={theme.colors.textMuted} />
                  <Text style={styles.noPatientsText}>No patients assigned to you</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} animationType="slide" transparent={true}>
        <View style={styles.paymentModalOverlay}>
          <View style={styles.paymentModalContent}>
            <View style={styles.paymentModalHeader}>
              <Text style={styles.paymentModalTitle}>Payment Required</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.paymentModalSubtitle}>
              Scan the QR code below to make payment, then upload screenshot to generate your report
            </Text>

            {qrCode && (
              <Image source={{ uri: qrCode }} style={styles.paymentQrImage} />
            )}

            <TouchableOpacity style={styles.paymentScreenshotButton} onPress={pickPaymentScreenshot}>
              {paymentScreenshot ? (
                <Image source={{ uri: paymentScreenshot }} style={styles.paymentScreenshotPreview} />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={32} color={theme.colors.accent} />
                  <Text style={styles.paymentScreenshotButtonText}>Upload Payment Screenshot</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentSubmitButton, !paymentScreenshot && styles.paymentButtonDisabled]}
              onPress={submitPaymentProof}
              disabled={!paymentScreenshot || submittingPayment}
            >
              {submittingPayment ? (
                <ActivityIndicator color={theme.colors.textPrimary} />
              ) : (
                <Text style={styles.paymentSubmitButtonText}>Submit & Generate Report</Text>
              )}
            </TouchableOpacity>
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
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  permissionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  permissionButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
  },
  permissionButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  backIcon: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  patientSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    gap: theme.spacing.md,
  },
  patientSelectorInfo: {
    flex: 1,
  },
  patientSelectorName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  patientSelectorEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  patientSelectorPlaceholder: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
  },
  viewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  viewButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.cardBorder,
    position: 'relative',
  },
  viewButtonActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent + '20',
  },
  viewButtonCompleted: {
    borderColor: theme.colors.success,
  },
  viewButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  viewButtonTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  completedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.colors.success,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    height: 200,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginTop: theme.spacing.md,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cameraViewLabel: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    textAlign: 'center',
  },
  landscapeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
  },
  landscapeToggleText: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.sm,
  },
  instructionsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  instructionsTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  instructionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  parametersCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  parametersTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  parametersList: {
    gap: theme.spacing.sm,
  },
  parameterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  parameterText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  controlsContainer: {
    marginTop: theme.spacing.lg,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.md,
  },
  stopButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  viewResultsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    gap: theme.spacing.sm,
  },
  viewResultsText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.semibold,
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzingCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  analyzingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  // Landscape styles
  landscapeContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  landscapeCamera: {
    flex: 1,
  },
  landscapeOverlay: {
    flex: 1,
    padding: theme.spacing.md,
  },
  landscapeTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.error,
    marginRight: theme.spacing.xs,
  },
  recordingText: {
    color: theme.colors.error,
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.fontSize.sm,
  },
  viewLabel: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.fontSize.md,
  },
  timerText: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.fontSize.xl,
  },
  landscapeSideStats: {
    position: 'absolute',
    right: theme.spacing.md,
    top: '50%',
    transform: [{ translateY: -50 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  sideStatItem: {
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
  },
  sideStatValue: {
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.fontSize.lg,
  },
  sideStatLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
  },
  landscapePatientInfo: {
    position: 'absolute',
    left: theme.spacing.md,
    bottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  landscapePatientName: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.sm,
  },
  landscapeStopButton: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.md,
    backgroundColor: theme.colors.error,
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Results styles
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  resultsTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  patientCardInfo: {
    flex: 1,
  },
  patientCardName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  patientCardEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  overallScoreCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 3,
    marginBottom: theme.spacing.lg,
  },
  overallScoreLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  overallScoreValue: {
    fontSize: 56,
    fontWeight: theme.fontWeight.bold,
    marginVertical: theme.spacing.sm,
  },
  viewsCompleted: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  viewResultCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  viewResultCardIncomplete: {
    opacity: 0.6,
  },
  viewResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewResultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  viewResultTitle: {
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  viewResultScore: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  viewResultPending: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  viewResultMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  viewMetricItem: {
    alignItems: 'center',
  },
  viewMetricValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  viewMetricLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  recommendationsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  recommendationText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.info,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  pdfButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  saveButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resultsActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  newAnalysisButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  newAnalysisText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  backButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  backButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  modalBody: {
    padding: theme.spacing.md,
  },
  patientOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    gap: theme.spacing.md,
  },
  patientOptionSelected: {
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  patientOptionInfo: {
    flex: 1,
  },
  patientOptionName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  patientOptionEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  noPatients: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  noPatientsText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  // Payment Modal styles
  paymentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  paymentModalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  paymentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  paymentModalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  paymentModalSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  paymentQrImage: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  paymentScreenshotButton: {
    borderWidth: 2,
    borderColor: theme.colors.cardBorder,
    borderStyle: 'dashed',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    minHeight: 100,
  },
  paymentScreenshotButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  paymentScreenshotPreview: {
    width: 150,
    height: 100,
    borderRadius: theme.borderRadius.sm,
  },
  paymentSubmitButton: {
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  paymentSubmitButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  paymentButtonDisabled: {
    opacity: 0.5,
  },
});
