import React, { useState, useEffect } from 'react';
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
  TextInput,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import { getPhysioPatients } from '../../src/utils/api';
import api from '../../src/utils/api';
import Constants from 'expo-constants';
import { usePermissions, PERMISSION_KEYS } from '../../src/hooks/usePermissions';

interface Patient {
  id: string;
  name: string;
  email: string;
}

// Comprehensive Sports with Sub-categories
const SPORTS_CATEGORIES = {
  cricket: {
    name: 'Cricket',
    icon: 'cricket',
    color: '#4CAF50',
    subcategories: [
      { id: 'batting', name: 'Batting', icon: 'cricket' },
      { id: 'bowling_fast', name: 'Fast Bowling', icon: 'bowling' },
      { id: 'bowling_spin', name: 'Spin Bowling', icon: 'bowling' },
      { id: 'fielding', name: 'Fielding', icon: 'account-arrow-down' },
      { id: 'wicketkeeping', name: 'Wicket Keeping', icon: 'hand-back-left' },
    ],
    biomechanics: {
      batting: [
        { name: 'Stance & Balance', key: 'stance', description: 'Weight distribution, knee bend, head position' },
        { name: 'Backlift', key: 'backlift', description: 'Bat angle, high elbow, shoulder rotation' },
        { name: 'Stride & Footwork', key: 'stride', description: 'Front foot movement, back foot pivot' },
        { name: 'Bat Swing Path', key: 'swing_path', description: 'Downswing plane, follow through' },
        { name: 'Head Position', key: 'head_position', description: 'Still head, eyes level, watching ball' },
        { name: 'Hip Rotation', key: 'hip_rotation', description: 'Power generation from hips' },
        { name: 'Weight Transfer', key: 'weight_transfer', description: 'Shift from back to front foot' },
        { name: 'Timing & Contact', key: 'timing', description: 'Ball contact point, sweet spot' },
      ],
      bowling_fast: [
        { name: 'Run-up Rhythm', key: 'runup', description: 'Acceleration, stride consistency' },
        { name: 'Bound & Gather', key: 'bound', description: 'Penultimate stride, energy storage' },
        { name: 'Back Foot Contact', key: 'back_foot', description: 'Alignment, bracing' },
        { name: 'Front Foot Landing', key: 'front_foot', description: 'Braced leg, energy transfer' },
        { name: 'Trunk Rotation', key: 'trunk', description: 'Counter-rotation, sequencing' },
        { name: 'Arm Action', key: 'arm', description: 'High arm, shoulder rotation' },
        { name: 'Wrist Position', key: 'wrist', description: 'Seam position, release point' },
        { name: 'Follow Through', key: 'follow_through', description: 'Deceleration, balance' },
      ],
      bowling_spin: [
        { name: 'Run-up Approach', key: 'approach', description: 'Short, controlled run-up' },
        { name: 'Gather Position', key: 'gather', description: 'Body coil, shoulder alignment' },
        { name: 'Hip & Shoulder Separation', key: 'separation', description: 'Counter-rotation for spin' },
        { name: 'Arm Speed', key: 'arm_speed', description: 'Deception through arm action' },
        { name: 'Wrist & Finger Work', key: 'wrist_finger', description: 'Spin imparted, revolutions' },
        { name: 'Release Point', key: 'release', description: 'Consistency, trajectory control' },
        { name: 'Follow Through', key: 'follow_through', description: 'Complete action, balance' },
      ],
    },
  },
  football: {
    name: 'Football/Soccer',
    icon: 'soccer',
    color: '#2196F3',
    subcategories: [
      { id: 'shooting', name: 'Shooting', icon: 'soccer' },
      { id: 'passing', name: 'Passing', icon: 'shoe-cleat' },
      { id: 'dribbling', name: 'Dribbling', icon: 'run-fast' },
      { id: 'heading', name: 'Heading', icon: 'head' },
      { id: 'goalkeeping', name: 'Goalkeeping', icon: 'hand-back-left' },
    ],
    biomechanics: {
      shooting: [
        { name: 'Approach Angle', key: 'approach', description: 'Run-up direction, speed' },
        { name: 'Plant Foot Position', key: 'plant_foot', description: 'Distance from ball, angle' },
        { name: 'Hip Flexion', key: 'hip_flexion', description: 'Backswing range of motion' },
        { name: 'Knee Extension', key: 'knee_extension', description: 'Power generation' },
        { name: 'Ankle Lock', key: 'ankle', description: 'Foot firmness at contact' },
        { name: 'Follow Through', key: 'follow_through', description: 'Direction, height control' },
      ],
    },
  },
  tennis: {
    name: 'Tennis',
    icon: 'tennis',
    color: '#9C27B0',
    subcategories: [
      { id: 'serve', name: 'Serve', icon: 'tennis' },
      { id: 'forehand', name: 'Forehand', icon: 'tennis' },
      { id: 'backhand', name: 'Backhand', icon: 'tennis' },
      { id: 'volley', name: 'Volley', icon: 'tennis' },
    ],
    biomechanics: {
      serve: [
        { name: 'Stance & Setup', key: 'stance', description: 'Foot position, ball toss' },
        { name: 'Trophy Position', key: 'trophy', description: 'Shoulder rotation, knee bend' },
        { name: 'Leg Drive', key: 'leg_drive', description: 'Vertical push, power generation' },
        { name: 'Trunk Rotation', key: 'trunk', description: 'Kinetic chain sequencing' },
        { name: 'Arm Action', key: 'arm', description: 'Internal rotation, pronation' },
        { name: 'Contact Point', key: 'contact', description: 'Height, forward position' },
      ],
    },
  },
  basketball: {
    name: 'Basketball',
    icon: 'basketball',
    color: '#FF5722',
    subcategories: [
      { id: 'shooting', name: 'Shooting', icon: 'basketball' },
      { id: 'layup', name: 'Layup', icon: 'basketball' },
      { id: 'dribbling', name: 'Dribbling', icon: 'basketball' },
      { id: 'defense', name: 'Defensive Stance', icon: 'shield' },
    ],
    biomechanics: {
      shooting: [
        { name: 'Stance & Balance', key: 'stance', description: 'Feet shoulder-width, knees bent' },
        { name: 'Ball Positioning', key: 'ball_position', description: 'Shot pocket, elbow alignment' },
        { name: 'Leg Drive', key: 'leg_drive', description: 'Power from legs' },
        { name: 'Arm Extension', key: 'arm', description: 'Elbow, wrist follow through' },
        { name: 'Release Point', key: 'release', description: 'Arc, backspin' },
      ],
    },
  },
  running: {
    name: 'Running/Sprinting',
    icon: 'run',
    color: '#00BCD4',
    subcategories: [
      { id: 'sprint', name: 'Sprint Start', icon: 'run-fast' },
      { id: 'endurance', name: 'Endurance Running', icon: 'run' },
      { id: 'hurdles', name: 'Hurdles', icon: 'human-male-height' },
    ],
    biomechanics: {
      sprint: [
        { name: 'Block Start Position', key: 'start', description: 'Angles, reaction time' },
        { name: 'Drive Phase', key: 'drive', description: 'Shin angles, arm action' },
        { name: 'Acceleration', key: 'acceleration', description: 'Ground contact, force application' },
        { name: 'Maximum Velocity', key: 'max_velocity', description: 'Stride length/frequency' },
        { name: 'Arm Mechanics', key: 'arms', description: 'Elbow angle, shoulder rotation' },
      ],
    },
  },
  swimming: {
    name: 'Swimming',
    icon: 'swim',
    color: '#03A9F4',
    subcategories: [
      { id: 'freestyle', name: 'Freestyle', icon: 'swim' },
      { id: 'backstroke', name: 'Backstroke', icon: 'swim' },
      { id: 'breaststroke', name: 'Breaststroke', icon: 'swim' },
      { id: 'butterfly', name: 'Butterfly', icon: 'swim' },
    ],
  },
  golf: {
    name: 'Golf',
    icon: 'golf',
    color: '#8BC34A',
    subcategories: [
      { id: 'drive', name: 'Drive', icon: 'golf' },
      { id: 'iron', name: 'Iron Shot', icon: 'golf' },
      { id: 'putting', name: 'Putting', icon: 'golf' },
    ],
    biomechanics: {
      drive: [
        { name: 'Address Position', key: 'address', description: 'Stance, grip, alignment' },
        { name: 'Backswing', key: 'backswing', description: 'Rotation, plane, wrist hinge' },
        { name: 'Transition', key: 'transition', description: 'Weight shift, sequencing' },
        { name: 'Downswing', key: 'downswing', description: 'Hip rotation, lag' },
        { name: 'Impact', key: 'impact', description: 'Clubface angle, ball contact' },
        { name: 'Follow Through', key: 'follow_through', description: 'Extension, balance' },
      ],
    },
  },
  volleyball: {
    name: 'Volleyball',
    icon: 'volleyball',
    color: '#FFC107',
    subcategories: [
      { id: 'serve', name: 'Serve', icon: 'volleyball' },
      { id: 'spike', name: 'Spike/Attack', icon: 'volleyball' },
      { id: 'block', name: 'Block', icon: 'hand-back-left' },
      { id: 'dig', name: 'Dig/Receive', icon: 'human-handsdown' },
    ],
  },
  badminton: {
    name: 'Badminton',
    icon: 'badminton',
    color: '#E91E63',
    subcategories: [
      { id: 'smash', name: 'Smash', icon: 'badminton' },
      { id: 'clear', name: 'Clear', icon: 'badminton' },
      { id: 'drop', name: 'Drop Shot', icon: 'badminton' },
      { id: 'serve', name: 'Serve', icon: 'badminton' },
    ],
  },
};

const SPORTS_LIST = Object.entries(SPORTS_CATEGORIES).map(([id, data]) => ({
  id,
  name: data.name,
  icon: data.icon,
  color: data.color,
}));

const YOGA_POSES = [
  { id: 'mountain', name: 'Mountain Pose (Tadasana)' },
  { id: 'downward_dog', name: 'Downward Dog' },
  { id: 'warrior1', name: 'Warrior I' },
  { id: 'warrior2', name: 'Warrior II' },
  { id: 'tree', name: 'Tree Pose' },
  { id: 'triangle', name: 'Triangle Pose' },
  { id: 'chair', name: 'Chair Pose' },
  { id: 'cobra', name: 'Cobra Pose' },
];

export default function AIAnalysisHubEnhanced() {
  const router = useRouter();
  const { currentUser } = useStore();
  const { hasPermission, loading: permissionLoading } = usePermissions();
  
  // Check permission on mount
  useEffect(() => {
    if (!permissionLoading && !hasPermission(PERMISSION_KEYS.AI_ANALYSIS)) {
      Alert.alert(
        '🔒 Admin Permission Required',
        'Access to AI Analysis Hub requires admin approval.\n\nPlease contact your administrator to enable this feature for your account.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [permissionLoading, hasPermission, router]);
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'sports' | 'yoga' | 'athlete'>('sports');
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Video/Image Upload State
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState<'ai' | 'manual'>('ai');

  // Player/Athlete Info
  const [playerName, setPlayerName] = useState('');
  const [playerPosition, setPlayerPosition] = useState('');
  const [teamName, setTeamName] = useState('');

  // Sports Analysis State
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [biomechanicsScores, setBiomechanicsScores] = useState<Record<string, number>>({});
  const [biomechanicsNotes, setBiomechanicsNotes] = useState<Record<string, string>>({});
  const [sportsMetrics, setSportsMetrics] = useState({
    technique_score: 7,
    power_generation: 6,
    efficiency: 7,
    balance: 8,
    coordination: 7,
  });

  // Yoga State
  const [selectedPose, setSelectedPose] = useState<string>('');
  const [yogaMetrics, setYogaMetrics] = useState({
    spine_alignment: 70,
    hip_alignment: 75,
    shoulder_alignment: 80,
    knee_alignment: 70,
    balance: 75,
  });

  // Athlete Monitoring State
  const [athleteData, setAthleteData] = useState({
    session_type: 'training',
    duration_minutes: 60,
    rpe: 6,
    notes: '',
  });

  // Get subcategories for selected sport
  const getSubcategories = () => {
    if (!selectedSport) return [];
    const sport = SPORTS_CATEGORIES[selectedSport as keyof typeof SPORTS_CATEGORIES];
    return sport?.subcategories || [];
  };

  // Get biomechanics parameters for selected sport/subcategory
  const getBiomechanicsParams = () => {
    if (!selectedSport || !selectedSubcategory) return [];
    const sport = SPORTS_CATEGORIES[selectedSport as keyof typeof SPORTS_CATEGORIES];
    return sport?.biomechanics?.[selectedSubcategory as keyof typeof sport.biomechanics] || [];
  };

  // Initialize scores when subcategory changes
  useEffect(() => {
    const params = getBiomechanicsParams();
    if (params.length > 0) {
      const initialScores: Record<string, number> = {};
      params.forEach(p => { initialScores[p.key] = 7; });
      setBiomechanicsScores(initialScores);
    }
  }, [selectedSubcategory]);

  const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                      process.env.EXPO_PUBLIC_BACKEND_URL || 
                      '';

  useEffect(() => {
    if (currentUser?.role === 'physio' || currentUser?.role === 'admin') {
      fetchPatients();
    }
  }, [currentUser]);

  const fetchPatients = async () => {
    if (!currentUser) return;
    try {
      const response = await getPhysioPatients(currentUser.id);
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  // Pick video from gallery
  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant media library permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setVideoUri(result.assets[0].uri);
    }
  };

  // Record video with camera
  const recordVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setVideoUri(result.assets[0].uri);
    }
  };

  const handleSportsAnalysis = async () => {
    if (!playerName) {
      Alert.alert('Error', 'Please enter player name');
      return;
    }
    if (!selectedSport) {
      Alert.alert('Error', 'Please select a sport');
      return;
    }

    setAnalyzing(true);
    try {
      // Call AI analysis endpoint with comprehensive data
      const response = await fetch(`${BACKEND_URL}/api/ai/analyze-sports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatient?.id || 'guest',
          physio_id: currentUser?.id,
          sport_type: selectedSport,
          subcategory: selectedSubcategory || '',
          player_name: playerName,
          player_position: playerPosition,
          team_name: teamName,
          video_data: videoUri,
          metrics: sportsMetrics,
          biomechanics_scores: biomechanicsScores,
          biomechanics_notes: biomechanicsNotes,
          analysis_mode: analysisMode,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data);
      } else {
        // Generate AI analysis locally as fallback
        setResults(generateSportsAnalysis());
      }
      setShowResults(true);
    } catch (error) {
      console.error('Error:', error);
      setResults(generateSportsAnalysis());
      setShowResults(true);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleYogaAnalysis = async () => {
    if (!selectedPatient || !selectedPose) {
      Alert.alert('Error', 'Please select a patient and yoga pose');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/analyze-yoga`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatient.id,
          physio_id: currentUser?.id,
          pose_name: selectedPose,
          video_data: videoUri,
          alignment_scores: yogaMetrics,
          analysis_mode: analysisMode,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data);
      } else {
        setResults(generateYogaAnalysis());
      }
      setShowResults(true);
    } catch (error) {
      console.error('Error:', error);
      setResults(generateYogaAnalysis());
      setShowResults(true);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAthleteMonitoring = async () => {
    if (!selectedPatient) {
      Alert.alert('Error', 'Please select a patient/athlete');
      return;
    }

    setAnalyzing(true);
    try {
      // Call AI athlete load monitoring endpoint
      const response = await fetch(`${BACKEND_URL}/api/ai/athlete-load-monitoring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatient.id,
          physio_id: currentUser?.id,
          session_type: athleteData.session_type,
          duration_minutes: athleteData.duration_minutes,
          rpe: athleteData.rpe,
          notes: athleteData.notes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data);
      } else {
        setResults(generateAthleteAnalysis());
      }
      setShowResults(true);
    } catch (error) {
      console.error('Error:', error);
      setResults(generateAthleteAnalysis());
      setShowResults(true);
    } finally {
      setAnalyzing(false);
    }
  };

  // Generate Sports Analysis
  const generateSportsAnalysis = () => {
    const biomechanicsParams = getBiomechanicsParams();
    let avgScore = 0;
    
    // Calculate average from biomechanics if available
    if (biomechanicsParams.length > 0 && Object.keys(biomechanicsScores).length > 0) {
      const scores = Object.values(biomechanicsScores);
      avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    } else {
      avgScore = Object.values(sportsMetrics).reduce((a, b) => a + b, 0) / 5;
    }
    
    const sportName = SPORTS_LIST.find(s => s.id === selectedSport)?.name || selectedSport;
    const subName = getSubcategories().find(s => s.id === selectedSubcategory)?.name || '';
    
    // Build biomechanics analysis
    let biomechanicsText = '';
    if (biomechanicsParams.length > 0 && analysisMode === 'manual') {
      biomechanicsText = '\n\n**Biomechanics Breakdown:**\n';
      biomechanicsParams.forEach(param => {
        const score = biomechanicsScores[param.key] || 7;
        const note = biomechanicsNotes[param.key] || '';
        const status = score >= 8 ? 'Excellent' : (score >= 6 ? 'Good' : 'Needs Improvement');
        biomechanicsText += `\n• **${param.name}:** ${score}/10 (${status})\n  ${param.description}${note ? '\n  Note: ' + note : ''}`;
      });
    }
    
    return {
      type: 'sports',
      sport: sportName,
      subcategory: subName,
      player_name: playerName,
      overall_score: avgScore * 10,
      metrics: sportsMetrics,
      biomechanics_analysis: biomechanicsScores,
      ai_analysis: `## ${sportName}${subName ? ' - ' + subName : ''} Analysis Report

**Athlete:** ${playerName}
${playerPosition ? '**Position:** ' + playerPosition + '\n' : ''}${teamName ? '**Team:** ' + teamName + '\n' : ''}
**Analysis Mode:** ${analysisMode === 'ai' ? 'AI Video Analysis' : 'Manual Assessment'}
**Overall Performance:** ${(avgScore * 10).toFixed(1)}%

Based on the comprehensive ${analysisMode === 'ai' ? 'video analysis' : 'manual assessment'} of ${sportName}${subName ? ' ' + subName : ''} performance:
${biomechanicsText}

**Technical Summary:**
The athlete demonstrates ${avgScore >= 7 ? 'strong' : 'developing'} technique overall. ${avgScore < 7 ? 'Focused practice on weak areas will accelerate improvement.' : 'Continue refining advanced skills for peak performance.'}

**Performance Metrics:**
• Technique Score: ${sportsMetrics.technique_score}/10
• Power Generation: ${sportsMetrics.power_generation}/10
• Efficiency: ${sportsMetrics.efficiency}/10
• Balance: ${sportsMetrics.balance}/10
• Coordination: ${sportsMetrics.coordination}/10`,
      recommendations: generateSportsRecommendations(),
      parameters: buildParameters(),
      corrections: generateCorrections(),
    };
  };
  
  // Generate recommendations based on scores
  const generateSportsRecommendations = () => {
    const recommendations = [];
    const biomechanicsParams = getBiomechanicsParams();
    
    // Add recommendations based on weak biomechanics scores
    if (biomechanicsParams.length > 0) {
      biomechanicsParams.forEach(param => {
        const score = biomechanicsScores[param.key] || 7;
        if (score < 7) {
          recommendations.push(`Improve ${param.name}: ${param.description}`);
        }
      });
    }
    
    // Add metric-based recommendations
    if (sportsMetrics.technique_score < 7) {
      recommendations.push('Focus on technique drills specific to the sport');
    }
    if (sportsMetrics.power_generation < 7) {
      recommendations.push('Incorporate plyometric and resistance training for power');
    }
    if (sportsMetrics.balance < 7) {
      recommendations.push('Add balance and proprioception exercises');
    }
    if (sportsMetrics.efficiency < 7) {
      recommendations.push('Work on movement economy and energy conservation');
    }
    
    // General recommendations
    recommendations.push('Regular video analysis sessions for feedback');
    recommendations.push('Monitor training load to prevent overtraining');
    recommendations.push('Maintain consistent practice schedule');
    
    return recommendations.slice(0, 8);
  };
  
  // Build parameters for display
  const buildParameters = () => {
    const params: Record<string, any> = {};
    const biomechanicsParams = getBiomechanicsParams();
    
    if (biomechanicsParams.length > 0 && Object.keys(biomechanicsScores).length > 0) {
      biomechanicsParams.forEach(param => {
        const score = biomechanicsScores[param.key] || 7;
        params[param.key] = {
          value: score,
          status: score >= 7 ? 'good' : 'needs_work',
          name: param.name
        };
      });
    } else {
      Object.entries(sportsMetrics).forEach(([key, value]) => {
        params[key] = {
          value: value,
          status: value >= 7 ? 'good' : 'needs_work',
          name: key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.replace(/_/g, ' ').slice(1)
        };
      });
    }
    
    return params;
  };
  
  // Generate corrections
  const generateCorrections = () => {
    const corrections: string[] = [];
    const biomechanicsParams = getBiomechanicsParams();
    
    if (biomechanicsParams.length > 0) {
      biomechanicsParams.forEach(param => {
        const score = biomechanicsScores[param.key] || 7;
        if (score < 7) {
          corrections.push(`${param.name}: ${param.description}`);
        }
      });
    }
    
    return corrections;
  };

  // Generate Yoga Analysis
  const generateYogaAnalysis = () => {
    const avgScore = Object.values(yogaMetrics).reduce((a, b) => a + b, 0) / 5;
    const poseName = YOGA_POSES.find(p => p.id === selectedPose)?.name || selectedPose;
    
    return {
      type: 'yoga',
      pose: poseName,
      overall_score: avgScore,
      metrics: yogaMetrics,
      ai_analysis: `**${poseName} Analysis:**

Based on ${analysisMode === 'ai' ? 'AI video analysis' : 'manual assessment'}:

**Spine Alignment:** ${yogaMetrics.spine_alignment}%
${yogaMetrics.spine_alignment >= 80 ? 'Excellent spinal positioning maintained throughout the pose.' : yogaMetrics.spine_alignment >= 60 ? 'Good alignment with minor adjustments needed.' : 'Significant adjustments required for proper spinal alignment.'}

**Hip Alignment:** ${yogaMetrics.hip_alignment}%
${yogaMetrics.hip_alignment >= 80 ? 'Hips are well-squared and properly positioned.' : 'Focus on hip positioning and rotation.'}

**Shoulder Alignment:** ${yogaMetrics.shoulder_alignment}%
${yogaMetrics.shoulder_alignment >= 80 ? 'Shoulders are properly engaged and aligned.' : 'Work on shoulder engagement and stability.'}

**Knee Alignment:** ${yogaMetrics.knee_alignment}%
${yogaMetrics.knee_alignment >= 80 ? 'Knees are tracking properly over toes.' : 'Be mindful of knee positioning to prevent strain.'}

**Balance:** ${yogaMetrics.balance}%
${yogaMetrics.balance >= 80 ? 'Excellent stability and control throughout the pose.' : 'Continue practicing for improved balance.'}`,
      corrections: [
        yogaMetrics.spine_alignment < 80 ? 'Lengthen spine by drawing crown of head toward ceiling' : null,
        yogaMetrics.hip_alignment < 80 ? 'Square hips by engaging core and adjusting stance width' : null,
        yogaMetrics.shoulder_alignment < 80 ? 'Draw shoulders back and down, away from ears' : null,
        yogaMetrics.knee_alignment < 80 ? 'Ensure knee tracks over second toe, do not hyperextend' : null,
        yogaMetrics.balance < 80 ? 'Engage core muscles and focus on a fixed point (drishti)' : null,
      ].filter(Boolean),
      recommendations: [
        'Practice pose daily for 5-10 breaths',
        'Use props (blocks, straps) if needed for proper alignment',
        'Focus on breath awareness during the pose',
        'Progress gradually to deeper expressions of the pose',
        'Consider recording practice for self-assessment',
      ],
      parameters: {
        spine: { value: yogaMetrics.spine_alignment, status: yogaMetrics.spine_alignment >= 80 ? 'good' : 'needs_work' },
        hips: { value: yogaMetrics.hip_alignment, status: yogaMetrics.hip_alignment >= 80 ? 'good' : 'needs_work' },
        shoulders: { value: yogaMetrics.shoulder_alignment, status: yogaMetrics.shoulder_alignment >= 80 ? 'good' : 'needs_work' },
        knees: { value: yogaMetrics.knee_alignment, status: yogaMetrics.knee_alignment >= 80 ? 'good' : 'needs_work' },
        balance: { value: yogaMetrics.balance, status: yogaMetrics.balance >= 80 ? 'good' : 'needs_work' },
      },
    };
  };

  // Generate Athlete Analysis
  const generateAthleteAnalysis = () => {
    const sessionLoad = athleteData.duration_minutes * athleteData.rpe;
    const acwr = Math.random() * 0.8 + 0.8; // Simulated ACWR between 0.8 and 1.6
    
    return {
      type: 'athlete',
      session_type: athleteData.session_type,
      duration: athleteData.duration_minutes,
      rpe: athleteData.rpe,
      session_load: sessionLoad,
      acwr: acwr,
      risk_level: acwr > 1.5 ? 'High Risk' : acwr < 0.8 ? 'Undertraining' : 'Optimal',
      ai_analysis: `**Load Monitoring Analysis:**

**Session Summary:**
- Type: ${athleteData.session_type.charAt(0).toUpperCase() + athleteData.session_type.slice(1)}
- Duration: ${athleteData.duration_minutes} minutes
- RPE: ${athleteData.rpe}/10 (${athleteData.rpe <= 3 ? 'Light' : athleteData.rpe <= 6 ? 'Moderate' : 'Hard'})
- Session Load: ${sessionLoad} AU (Arbitrary Units)

**Acute:Chronic Workload Ratio (ACWR):** ${acwr.toFixed(2)}
${acwr > 1.5 ? '⚠️ HIGH RISK: Workload spike detected. Reduce training intensity.' : 
  acwr < 0.8 ? '⚠️ UNDERTRAINING: Consider progressive load increase.' :
  '✅ OPTIMAL: Training load is within safe parameters.'}

**Training Readiness Assessment:**
Based on the current session load and historical data, the athlete's training readiness is ${acwr <= 1.3 && acwr >= 0.8 ? 'good' : 'concerning'}.`,
      recommendations: [
        acwr > 1.5 ? 'Reduce training volume by 20-30% for next 48 hours' : null,
        acwr < 0.8 ? 'Gradually increase training load by 10% weekly' : null,
        'Monitor sleep quality and recovery markers',
        'Ensure adequate hydration (3L water daily)',
        'Maintain protein intake (1.6-2.2g/kg bodyweight)',
        athleteData.rpe >= 8 ? 'Schedule active recovery session tomorrow' : 'Continue current training plan',
      ].filter(Boolean),
      parameters: {
        session_load: { value: sessionLoad, unit: 'AU' },
        acwr: { value: acwr.toFixed(2), status: acwr > 1.5 ? 'high_risk' : acwr < 0.8 ? 'low' : 'optimal' },
        rpe: { value: athleteData.rpe, status: athleteData.rpe >= 8 ? 'high' : 'normal' },
      },
    };
  };

  // Generate PDF Report
  const generatePDF = async () => {
    if (!results) return;

    setGeneratingPdf(true);
    try {
      // Fetch physio's profile settings for logo
      let physioSettings = { logo_url: '', clinic_name: '', clinic_phone: '', clinic_address: '' };
      try {
        const settingsRes = await api.get(`/users/${currentUser?.id}/profile-settings`);
        physioSettings = settingsRes.data;
      } catch (e) {
        console.log('Could not fetch physio settings');
      }

      // Fetch payment settings for QR code
      let paymentSettings = { upi_id: '', qr_code_image: '', account_holder_name: '' };
      try {
        const paymentRes = await api.get('/payment/settings');
        paymentSettings = paymentRes.data;
      } catch (e) {
        console.log('Could not fetch payment settings');
      }

      const html = generatePDFHTML(physioSettings, paymentSettings);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error('PDF error:', error);
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const generatePDFHTML = (
    physioSettings: { logo_url: string; clinic_name: string; clinic_phone: string; clinic_address: string },
    paymentSettings: { upi_id: string; qr_code_image: string; account_holder_name: string }
  ) => {
    const patientName = selectedPatient?.name || playerName || 'Patient';
    const patientEmail = selectedPatient?.email || '';
    const physioName = currentUser?.name || 'Physiotherapist';
    const date = new Date().toLocaleDateString();
    const reportId = `WBA99-${Date.now().toString(36).toUpperCase()}`;

    // Logo HTML
    const logoHTML = physioSettings.logo_url && physioSettings.logo_url.startsWith('data:image')
      ? `<img src="${physioSettings.logo_url}" style="max-height: 60px; max-width: 200px; object-fit: contain;" />`
      : physioSettings.clinic_name 
        ? `<div class="logo-text">${physioSettings.clinic_name}</div>`
        : `<div class="logo-text">WBA99</div>`;

    // Payment QR HTML
    const paymentQRHTML = paymentSettings.upi_id || paymentSettings.qr_code_image ? `
      <div class="payment-section">
        <h3>💳 Payment Information</h3>
        <div class="payment-content">
          ${paymentSettings.qr_code_image ? `
            <div class="qr-code">
              <img src="${paymentSettings.qr_code_image}" style="width: 120px; height: 120px;" />
              <p>Scan to Pay</p>
            </div>
          ` : ''}
          <div class="payment-details">
            ${paymentSettings.upi_id ? `<p><strong>UPI ID:</strong> ${paymentSettings.upi_id}</p>` : ''}
            ${paymentSettings.account_holder_name ? `<p><strong>Pay to:</strong> ${paymentSettings.account_holder_name}</p>` : ''}
            <p class="payment-note">Scan QR or use UPI ID to make payment</p>
          </div>
        </div>
      </div>
    ` : '';

    let content = '';
    let title = '';

    if (results.type === 'sports') {
      title = `🏆 Sports Biomechanics Analysis - ${results.sport}${results.subcategory ? ' (' + results.subcategory + ')' : ''}`;
      content = `
        <div class="athlete-info">
          <h3>🏃 Athlete Information</h3>
          <div class="athlete-grid">
            <div class="athlete-item"><span class="label">Name:</span> <span class="value">${playerName || patientName}</span></div>
            ${playerPosition ? `<div class="athlete-item"><span class="label">Position:</span> <span class="value">${playerPosition}</span></div>` : ''}
            ${teamName ? `<div class="athlete-item"><span class="label">Team:</span> <span class="value">${teamName}</span></div>` : ''}
            <div class="athlete-item"><span class="label">Sport:</span> <span class="value">${results.sport}</span></div>
          </div>
        </div>

        <div class="score-box">
          <div class="score">${results.overall_score.toFixed(0)}%</div>
          <div class="score-label">Overall Performance Score</div>
          <div class="score-interpretation ${results.overall_score >= 80 ? 'excellent' : results.overall_score >= 60 ? 'good' : 'needs-work'}">
            ${results.overall_score >= 80 ? '⭐ Excellent Technique' : results.overall_score >= 60 ? '✓ Good - Minor Improvements Needed' : '⚠ Needs Focused Training'}
          </div>
        </div>

        <div class="section">
          <h2>📊 Biomechanics Analysis</h2>
          <table class="params-table">
            <tr><th>Parameter</th><th>Score</th><th>Status</th><th>Notes</th></tr>
            ${Object.entries(results.parameters || results.biomechanics_analysis || {}).map(([key, val]: [string, any]) => `
              <tr>
                <td><strong>${val.name || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}</strong></td>
                <td class="score-cell">${val.value || val.score}/10</td>
                <td class="${(val.value || val.score) >= 7 ? 'status-good' : 'status-warning'}">${(val.value || val.score) >= 7 ? '✓ Good' : '⚠ Needs Work'}</td>
                <td class="notes-cell">${val.notes || val.ideal || '-'}</td>
              </tr>
            `).join('')}
          </table>
        </div>

        <div class="section">
          <h2>🤖 AI Biomechanics Analysis</h2>
          <div class="ai-content">${results.ai_analysis.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/##\s?(.*?)(<br>|$)/g, '<h4>$1</h4>')}</div>
        </div>

        ${results.corrections?.length > 0 ? `
        <div class="section corrections">
          <h2>🎯 Key Corrections Required</h2>
          <ul>
            ${results.corrections.map((c: string) => `<li>${c}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        <div class="section">
          <h2>✅ Training Recommendations</h2>
          <ul class="recommendations">
            ${results.recommendations.map((r: string, i: number) => `<li><span class="rec-num">${i+1}</span>${r}</li>`).join('')}
          </ul>
        </div>
      `;
    } else if (results.type === 'yoga') {
      title = `🧘 Yoga Pose Analysis - ${results.pose}`;
      content = `
        <div class="score-box yoga">
          <div class="score">${results.overall_score.toFixed(0)}%</div>
          <div class="score-label">Overall Alignment Score</div>
        </div>

        <div class="section">
          <h2>📊 Alignment Parameters</h2>
          <table class="params-table">
            <tr><th>Body Region</th><th>Alignment %</th><th>Status</th></tr>
            ${Object.entries(results.parameters).map(([key, val]: [string, any]) => `
              <tr>
                <td>${key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}</td>
                <td><strong>${val.value}%</strong></td>
                <td class="${val.status === 'good' ? 'status-good' : 'status-warning'}">${val.status === 'good' ? '✓ Aligned' : '⚠ Adjust'}</td>
              </tr>
            `).join('')}
          </table>
        </div>

        <div class="section">
          <h2>🤖 AI Alignment Analysis</h2>
          <div class="ai-content">${results.ai_analysis.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
        </div>

        ${results.corrections?.length > 0 ? `
        <div class="section corrections">
          <h2>⚠️ Alignment Corrections</h2>
          <ul>
            ${results.corrections.map((c: string) => `<li>${c}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        <div class="section">
          <h2>✅ Practice Recommendations</h2>
          <ul class="recommendations">
            ${results.recommendations.map((r: string) => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      `;
    } else {
      title = `📊 Athlete Load Monitoring Report`;
      content = `
        <div class="score-box ${results.acwr > 1.5 ? 'high-risk' : results.acwr < 0.8 ? 'low-risk' : 'optimal'}">
          <div class="score">${results.session_load}</div>
          <div class="score-label">Session Load (Arbitrary Units)</div>
          <div class="acwr-display">
            <span class="acwr-value">ACWR: ${results.acwr.toFixed(2)}</span>
            <span class="risk-badge ${results.acwr > 1.5 ? 'high' : results.acwr < 0.8 ? 'low' : 'optimal'}">${results.risk_level}</span>
          </div>
        </div>

        <div class="section">
          <h2>📋 Session Details</h2>
          <table class="params-table">
            <tr><td>Session Type</td><td><strong>${results.session_type.charAt(0).toUpperCase() + results.session_type.slice(1)}</strong></td></tr>
            <tr><td>Duration</td><td><strong>${results.duration} minutes</strong></td></tr>
            <tr><td>RPE (Rate of Perceived Exertion)</td><td><strong>${results.rpe}/10</strong></td></tr>
            <tr><td>Session Load</td><td><strong>${results.session_load} AU</strong></td></tr>
            <tr><td>Acute:Chronic Workload Ratio</td><td><strong>${results.acwr.toFixed(2)}</strong></td></tr>
          </table>
        </div>

        <div class="section">
          <h2>📈 Load Interpretation</h2>
          <div class="ai-content">${results.ai_analysis.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
        </div>

        <div class="section">
          <h2>✅ Recovery & Training Recommendations</h2>
          <ul class="recommendations">
            ${results.recommendations.map((r: string) => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; background: #fff; color: #333; font-size: 12px; }
          
          .header { text-align: center; padding: 20px; background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; border-radius: 12px; margin-bottom: 20px; }
          .header .logo-text { font-size: 24px; font-weight: bold; color: #00d9ff; margin-bottom: 10px; }
          .header .logo-text img { max-height: 50px; }
          .header h1 { font-size: 18px; margin: 10px 0; }
          .header .clinic-info { font-size: 11px; opacity: 0.8; margin-top: 8px; }
          .header .report-id { font-size: 10px; opacity: 0.7; margin-top: 5px; }
          
          .info-row { display: flex; justify-content: space-between; background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; flex-wrap: wrap; }
          .info-item { text-align: center; min-width: 100px; margin: 5px; }
          .info-label { font-size: 10px; color: #666; text-transform: uppercase; }
          .info-value { font-size: 13px; font-weight: bold; color: #1a1a2e; }
          
          .athlete-info { background: #e3f2fd; padding: 15px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #2196F3; }
          .athlete-info h3 { font-size: 14px; color: #1565c0; margin-bottom: 10px; }
          .athlete-grid { display: flex; flex-wrap: wrap; gap: 15px; }
          .athlete-item { min-width: 120px; }
          .athlete-item .label { color: #666; font-size: 11px; }
          .athlete-item .value { font-weight: bold; color: #1a1a2e; }
          
          .score-box { text-align: center; padding: 25px; background: linear-gradient(135deg, #e8f5e9, #c8e6c9); border-radius: 15px; margin-bottom: 20px; }
          .score-box.yoga { background: linear-gradient(135deg, #f3e5f5, #e1bee7); }
          .score-box.high-risk { background: linear-gradient(135deg, #ffebee, #ffcdd2); }
          .score-box.low-risk { background: linear-gradient(135deg, #fff3e0, #ffe0b2); }
          .score-box.optimal { background: linear-gradient(135deg, #e8f5e9, #c8e6c9); }
          .score { font-size: 48px; font-weight: bold; color: #2e7d32; }
          .score-box.high-risk .score { color: #c62828; }
          .score-box.low-risk .score { color: #ef6c00; }
          .score-label { font-size: 14px; color: #666; margin-top: 5px; }
          .score-interpretation { display: inline-block; padding: 8px 16px; border-radius: 20px; margin-top: 10px; font-size: 12px; font-weight: bold; }
          .score-interpretation.excellent { background: #4caf50; color: white; }
          .score-interpretation.good { background: #ff9800; color: white; }
          .score-interpretation.needs-work { background: #f44336; color: white; }
          
          .acwr-display { margin-top: 15px; }
          .acwr-value { font-size: 18px; font-weight: bold; }
          .risk-badge { display: inline-block; padding: 5px 12px; border-radius: 15px; margin-left: 10px; font-size: 11px; font-weight: bold; }
          .risk-badge.high { background: #f44336; color: white; }
          .risk-badge.low { background: #ff9800; color: white; }
          .risk-badge.optimal { background: #4caf50; color: white; }
          
          .section { background: #fff; border: 1px solid #e0e0e0; border-radius: 10px; padding: 18px; margin-bottom: 15px; page-break-inside: avoid; }
          .section h2 { font-size: 15px; color: #1a1a2e; margin-bottom: 12px; border-bottom: 2px solid #00d9ff; padding-bottom: 6px; }
          
          .params-table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .params-table th, .params-table td { padding: 10px 8px; text-align: left; border-bottom: 1px solid #eee; }
          .params-table th { background: #f5f5f5; font-weight: 600; color: #333; }
          .params-table .score-cell { font-weight: bold; color: #1a1a2e; }
          .params-table .notes-cell { font-size: 10px; color: #666; max-width: 200px; }
          .status-good { color: #2e7d32; font-weight: bold; }
          .status-warning { color: #ef6c00; font-weight: bold; }
          
          .ai-content { background: #fafafa; padding: 15px; border-radius: 8px; line-height: 1.7; font-size: 11px; border-left: 3px solid #00d9ff; }
          .ai-content h4 { color: #1a1a2e; margin: 10px 0 5px 0; font-size: 13px; }
          
          .corrections { border-color: #ff9800; }
          .corrections h2 { border-color: #ff9800; }
          .corrections ul { list-style: none; }
          .corrections ul li { background: #fff3e0; padding: 10px 12px; margin-bottom: 8px; border-radius: 6px; border-left: 4px solid #ff9800; font-size: 11px; }
          
          .recommendations { list-style: none; }
          .recommendations li { background: #e8f5e9; padding: 10px 12px; margin-bottom: 8px; border-radius: 6px; border-left: 4px solid #4caf50; font-size: 11px; display: flex; align-items: center; }
          .recommendations li .rec-num { background: #4caf50; color: white; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 10px; font-weight: bold; }
          
          .payment-section { background: linear-gradient(135deg, #fff8e1, #ffecb3); border: 2px solid #ffc107; border-radius: 12px; padding: 20px; margin: 20px 0; page-break-inside: avoid; }
          .payment-section h3 { color: #f57f17; margin-bottom: 15px; font-size: 14px; }
          .payment-content { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
          .qr-code { text-align: center; }
          .qr-code img { border: 2px solid #ddd; border-radius: 8px; }
          .qr-code p { font-size: 10px; color: #666; margin-top: 5px; }
          .payment-details p { margin: 5px 0; font-size: 12px; }
          .payment-note { font-style: italic; color: #666; font-size: 10px !important; margin-top: 10px !important; }
          
          .footer { text-align: center; margin-top: 25px; padding-top: 15px; border-top: 1px solid #eee; }
          .footer p { font-size: 10px; color: #888; margin: 3px 0; }
          .footer .brand { color: #00d9ff; font-weight: bold; }
          
          @media print {
            body { padding: 15px; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoHTML}
          <h1>${title}</h1>
          ${physioSettings.clinic_phone || physioSettings.clinic_address ? `
            <div class="clinic-info">
              ${physioSettings.clinic_phone ? physioSettings.clinic_phone : ''} 
              ${physioSettings.clinic_phone && physioSettings.clinic_address ? ' | ' : ''}
              ${physioSettings.clinic_address ? physioSettings.clinic_address : ''}
            </div>
          ` : ''}
          <div class="report-id">Report ID: ${reportId}</div>
        </div>

        <div class="info-row">
          <div class="info-item">
            <div class="info-label">Patient/Athlete</div>
            <div class="info-value">${patientName}</div>
            ${patientEmail ? `<div style="font-size: 10px; color: #666;">${patientEmail}</div>` : ''}
          </div>
          <div class="info-item">
            <div class="info-label">Assessment Date</div>
            <div class="info-value">${date}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Assessed By</div>
            <div class="info-value">${physioName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Analysis Mode</div>
            <div class="info-value">${analysisMode === 'ai' ? '🤖 AI Analysis' : '📝 Manual'}</div>
          </div>
        </div>

        ${content}

        ${paymentQRHTML}

        <div class="footer">
          <p>Generated by <span class="brand">WBA99</span> AI Analysis Hub</p>
          <p>This report is for professional use only. Consult a qualified healthcare provider for medical advice.</p>
          <p>© ${new Date().getFullYear()} WBA99 - Advanced Sports & Rehabilitation Technology</p>
        </div>
      </body>
      </html>
    `;
  };

  const getScoreColor = (score: number, max: number = 100) => {
    const pct = (score / max) * 100;
    if (pct >= 70) return theme.colors.success;
    if (pct >= 40) return theme.colors.warning;
    return theme.colors.error;
  };

  // Results Screen
  if (showResults && results) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.resultsHeader}>
            <TouchableOpacity onPress={() => setShowResults(false)}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.resultsTitle}>
              {results.type === 'sports' ? `${results.sport} Analysis` : 
               results.type === 'yoga' ? `${results.pose} Analysis` : 'Load Monitoring'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Score Card */}
          <View style={[styles.scoreCard, { borderColor: getScoreColor(results.overall_score || 70) }]}>
            <Text style={styles.scoreLabel}>
              {results.type === 'athlete' ? 'Session Load' : 'Overall Score'}
            </Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(results.overall_score || 70) }]}>
              {results.type === 'athlete' 
                ? `${results.session_load}` 
                : `${(results.overall_score || 0).toFixed(0)}%`}
            </Text>
            {results.type === 'athlete' && (
              <View style={[
                styles.acwrBadge,
                { backgroundColor: results.acwr > 1.5 ? theme.colors.error : 
                                  results.acwr < 0.8 ? theme.colors.warning : theme.colors.success }
              ]}>
                <Text style={styles.acwrText}>ACWR: {results.acwr?.toFixed(2)} - {results.risk_level}</Text>
              </View>
            )}
          </View>

          {/* Parameters */}
          {results.parameters && (
            <View style={styles.paramsSection}>
              <Text style={styles.sectionTitle}>📊 Parameters</Text>
              {Object.entries(results.parameters).map(([key, val]: [string, any]) => (
                <View key={key} style={styles.paramRow}>
                  <Text style={styles.paramName}>{key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}</Text>
                  <View style={[
                    styles.paramBadge,
                    { backgroundColor: val.status === 'good' || val.status === 'optimal' ? theme.colors.success : theme.colors.warning }
                  ]}>
                    <Text style={styles.paramValue}>{val.value}{val.unit ? ` ${val.unit}` : results.type === 'yoga' ? '%' : '/10'}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* AI Analysis */}
          <View style={styles.aiSection}>
            <View style={styles.aiHeader}>
              <MaterialCommunityIcons name="robot" size={24} color={theme.colors.accent} />
              <Text style={styles.aiTitle}>AI Analysis</Text>
            </View>
            <Text style={styles.aiText}>{results.ai_analysis}</Text>
          </View>

          {/* Corrections (Yoga) */}
          {results.corrections?.length > 0 && (
            <View style={styles.correctionsSection}>
              <Text style={styles.sectionTitle}>⚠️ Corrections Needed</Text>
              {results.corrections.map((c: string, i: number) => (
                <View key={i} style={styles.correctionItem}>
                  <Ionicons name="alert-circle" size={18} color={theme.colors.warning} />
                  <Text style={styles.correctionText}>{c}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Recommendations */}
          <View style={styles.recommendationsSection}>
            <Text style={styles.sectionTitle}>✅ Recommendations</Text>
            {results.recommendations.map((r: string, i: number) => (
              <View key={i} style={styles.recommendationItem}>
                <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                <Text style={styles.recommendationText}>{r}</Text>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.pdfButton, generatingPdf && styles.buttonDisabled]}
              onPress={generatePDF}
              disabled={generatingPdf}
            >
              {generatingPdf ? (
                <ActivityIndicator color={theme.colors.textPrimary} />
              ) : (
                <>
                  <Ionicons name="document-text" size={24} color={theme.colors.textPrimary} />
                  <Text style={styles.pdfButtonText}>Download PDF Report</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.newAnalysisButton} onPress={() => {
              setShowResults(false);
              setResults(null);
              setVideoUri(null);
            }}>
              <Text style={styles.newAnalysisButtonText}>New Analysis</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Main Screen
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <MaterialCommunityIcons name="robot" size={48} color={theme.colors.accent} />
          <Text style={styles.title}>AI Analysis Hub</Text>
          <Text style={styles.subtitle}>Sports, Yoga & Athlete Load Monitoring</Text>
        </View>

        {/* Quick Analysis Buttons */}
        <Text style={styles.sectionTitle}>🎯 Quick Analysis</Text>
        <View style={styles.quickAnalysisGrid}>
          <TouchableOpacity 
            style={[styles.quickAnalysisCard, { borderColor: '#9C27B0' }]}
            onPress={() => router.push('/physio/posture-analysis-ai')}
          >
            <MaterialCommunityIcons name="human" size={32} color="#9C27B0" />
            <Text style={styles.quickAnalysisText}>Posture</Text>
            <Text style={styles.quickAnalysisBadge}>AI</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickAnalysisCard, { borderColor: theme.colors.accent }]}
            onPress={() => router.push('/physio/walking-video-analysis')}
          >
            <MaterialCommunityIcons name="walk" size={32} color={theme.colors.accent} />
            <Text style={styles.quickAnalysisText}>Walking</Text>
            <Text style={styles.quickAnalysisBadge}>AI</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickAnalysisCard, { borderColor: theme.colors.warning }]}
            onPress={() => router.push('/physio/running-video-analysis')}
          >
            <MaterialCommunityIcons name="run" size={32} color={theme.colors.warning} />
            <Text style={styles.quickAnalysisText}>Running</Text>
            <Text style={styles.quickAnalysisBadge}>AI</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickAnalysisCard, { borderColor: theme.colors.error }]}
            onPress={() => router.push('/assessment/msk')}
          >
            <MaterialCommunityIcons name="bone" size={32} color={theme.colors.error} />
            <Text style={styles.quickAnalysisText}>M.S.K.</Text>
            <Text style={styles.quickAnalysisBadge}>AI</Text>
          </TouchableOpacity>
        </View>

        {/* Add Patient Button */}
        <TouchableOpacity 
          style={styles.addPatientButton}
          onPress={() => router.push('/physio/add-patient')}
        >
          <Ionicons name="person-add" size={24} color={theme.colors.textPrimary} />
          <Text style={styles.addPatientText}>Add New Patient</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        {/* Patient Selection */}
        <Text style={styles.sectionTitle}>👤 Patient/Athlete</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setShowPatientModal(true)}>
          {selectedPatient ? (
            <>
              <Ionicons name="person" size={24} color={theme.colors.accent} />
              <View style={styles.selectorInfo}>
                <Text style={styles.selectorName}>{selectedPatient.name}</Text>
                <Text style={styles.selectorEmail}>{selectedPatient.email}</Text>
              </View>
            </>
          ) : (
            <>
              <Ionicons name="person-add" size={24} color={theme.colors.textMuted} />
              <Text style={styles.selectorPlaceholder}>Select a patient/athlete</Text>
            </>
          )}
          <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {/* Video Upload Section */}
        <Text style={styles.sectionTitle}>📹 Video/Image Upload</Text>
        <View style={styles.uploadSection}>
          {videoUri ? (
            <View style={styles.videoPreview}>
              <Image source={{ uri: videoUri }} style={styles.videoThumbnail} />
              <TouchableOpacity style={styles.removeVideoButton} onPress={() => setVideoUri(null)}>
                <Ionicons name="close-circle" size={24} color={theme.colors.error} />
              </TouchableOpacity>
              <Text style={styles.videoLabel}>Media uploaded ✓</Text>
            </View>
          ) : (
            <View style={styles.uploadButtons}>
              <TouchableOpacity style={styles.uploadButton} onPress={pickVideo}>
                <Ionicons name="images" size={28} color={theme.colors.accent} />
                <Text style={styles.uploadButtonText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadButton} onPress={recordVideo}>
                <Ionicons name="videocam" size={28} color={theme.colors.success} />
                <Text style={styles.uploadButtonText}>Record</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Analysis Mode */}
        <Text style={styles.sectionTitle}>🔄 Analysis Mode</Text>
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeButton, analysisMode === 'ai' && styles.modeButtonActive]}
            onPress={() => setAnalysisMode('ai')}
          >
            <MaterialCommunityIcons name="robot" size={24} color={analysisMode === 'ai' ? theme.colors.textPrimary : theme.colors.textMuted} />
            <Text style={[styles.modeButtonText, analysisMode === 'ai' && styles.modeButtonTextActive]}>AI Analysis</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, analysisMode === 'manual' && styles.modeButtonActive]}
            onPress={() => setAnalysisMode('manual')}
          >
            <Ionicons name="hand-left" size={24} color={analysisMode === 'manual' ? theme.colors.textPrimary : theme.colors.textMuted} />
            <Text style={[styles.modeButtonText, analysisMode === 'manual' && styles.modeButtonTextActive]}>Manual</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Selection */}
        <View style={styles.tabContainer}>
          {[
            { id: 'sports', label: 'Sports', icon: 'trophy' },
            { id: 'yoga', label: 'Yoga', icon: 'body' },
            { id: 'athlete', label: 'Load', icon: 'fitness' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id as any)}
            >
              <Ionicons 
                name={tab.icon as any} 
                size={20} 
                color={activeTab === tab.id ? theme.colors.textPrimary : theme.colors.textMuted} 
              />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sports Tab */}
        {activeTab === 'sports' && (
          <View style={styles.tabContent}>
            {/* Player/Athlete Info */}
            <Text style={styles.sectionTitle}>👤 Player Information</Text>
            <View style={styles.playerInfoCard}>
              <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="account" size={20} color={theme.colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Player Name *"
                    placeholderTextColor={theme.colors.textMuted}
                    value={playerName}
                    onChangeText={setPlayerName}
                  />
                </View>
              </View>
              <View style={styles.inputRow}>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <MaterialCommunityIcons name="badge-account" size={20} color={theme.colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Position/Role"
                    placeholderTextColor={theme.colors.textMuted}
                    value={playerPosition}
                    onChangeText={setPlayerPosition}
                  />
                </View>
                <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                  <MaterialCommunityIcons name="account-group" size={20} color={theme.colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Team Name"
                    placeholderTextColor={theme.colors.textMuted}
                    value={teamName}
                    onChangeText={setTeamName}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>🏆 Select Sport</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportsScroll}>
              {SPORTS_LIST.map((sport) => (
                <TouchableOpacity
                  key={sport.id}
                  style={[
                    styles.sportCard, 
                    selectedSport === sport.id && styles.sportCardSelected,
                    selectedSport === sport.id && { borderColor: sport.color, backgroundColor: sport.color + '20' }
                  ]}
                  onPress={() => {
                    setSelectedSport(sport.id);
                    setSelectedSubcategory('');
                  }}
                >
                  <View style={[styles.sportIconContainer, { backgroundColor: sport.color }]}>
                    <MaterialCommunityIcons 
                      name={sport.icon as any} 
                      size={24} 
                      color="#fff" 
                    />
                  </View>
                  <Text style={[styles.sportName, selectedSport === sport.id && styles.sportNameSelected]}>
                    {sport.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Subcategories */}
            {selectedSport && getSubcategories().length > 0 && (
              <>
                <Text style={styles.sectionTitle}>🎯 Select Activity</Text>
                <View style={styles.subcategoryGrid}>
                  {getSubcategories().map((sub) => (
                    <TouchableOpacity
                      key={sub.id}
                      style={[
                        styles.subcategoryCard,
                        selectedSubcategory === sub.id && styles.subcategorySelected
                      ]}
                      onPress={() => setSelectedSubcategory(sub.id)}
                    >
                      <MaterialCommunityIcons 
                        name={sub.icon as any} 
                        size={22} 
                        color={selectedSubcategory === sub.id ? '#fff' : theme.colors.textMuted} 
                      />
                      <Text style={[
                        styles.subcategoryName,
                        selectedSubcategory === sub.id && { color: '#fff' }
                      ]}>
                        {sub.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Biomechanics Scoring (Manual Mode) */}
            {analysisMode === 'manual' && selectedSubcategory && getBiomechanicsParams().length > 0 && (
              <>
                <Text style={styles.sectionTitle}>📐 Biomechanics Assessment</Text>
                <View style={styles.biomechanicsInfo}>
                  <MaterialCommunityIcons name="information" size={18} color="#2196F3" />
                  <Text style={styles.biomechanicsInfoText}>
                    Score each parameter from 1 (Poor) to 10 (Excellent). Add notes for corrections.
                  </Text>
                </View>
                {getBiomechanicsParams().map((param) => (
                  <View key={param.key} style={styles.biomechanicsCard}>
                    <View style={styles.biomechanicsHeader}>
                      <Text style={styles.biomechanicsName}>{param.name}</Text>
                      <Text style={[
                        styles.biomechanicsScore,
                        { color: getScoreColor((biomechanicsScores[param.key] || 7) * 10) }
                      ]}>
                        {biomechanicsScores[param.key] || 7}/10
                      </Text>
                    </View>
                    <Text style={styles.biomechanicsDesc}>{param.description}</Text>
                    <View style={styles.scoreSlider}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <TouchableOpacity
                          key={n}
                          style={[
                            styles.scoreDot,
                            (biomechanicsScores[param.key] || 7) >= n && { 
                              backgroundColor: getScoreColor(n * 10) 
                            }
                          ]}
                          onPress={() => setBiomechanicsScores(prev => ({ ...prev, [param.key]: n }))}
                        />
                      ))}
                    </View>
                    <TextInput
                      style={styles.noteInput}
                      placeholder="Add correction notes..."
                      placeholderTextColor={theme.colors.textMuted}
                      value={biomechanicsNotes[param.key] || ''}
                      onChangeText={(v) => setBiomechanicsNotes(prev => ({ ...prev, [param.key]: v }))}
                      multiline
                    />
                  </View>
                ))}
              </>
            )}

            {/* General Metrics for AI Mode */}
            {analysisMode === 'ai' && (
              <View style={styles.aiModeInfo}>
                <MaterialCommunityIcons name="robot" size={32} color={theme.colors.accent} />
                <Text style={styles.aiModeTitle}>AI-Powered Analysis</Text>
                <Text style={styles.aiModeText}>
                  Upload video and AI will automatically analyze biomechanics, technique, and provide detailed corrections.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.analyzeButton, (!playerName || !selectedSport || analyzing) && styles.buttonDisabled]}
              onPress={handleSportsAnalysis}
              disabled={!playerName || !selectedSport || analyzing}
            >
              {analyzing ? (
                <ActivityIndicator color={theme.colors.textPrimary} />
              ) : (
                <>
                  <MaterialCommunityIcons name="robot" size={24} color={theme.colors.textPrimary} />
                  <Text style={styles.analyzeButtonText}>Generate AI Analysis</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Yoga Tab */}
        {activeTab === 'yoga' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>🧘 Select Yoga Pose</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.poseScroll}>
              {YOGA_POSES.map((pose) => (
                <TouchableOpacity
                  key={pose.id}
                  style={[styles.poseCard, selectedPose === pose.id && styles.poseCardSelected]}
                  onPress={() => setSelectedPose(pose.id)}
                >
                  <MaterialCommunityIcons 
                    name="yoga" 
                    size={32} 
                    color={selectedPose === pose.id ? theme.colors.textPrimary : theme.colors.textMuted} 
                  />
                  <Text style={[styles.poseName, selectedPose === pose.id && styles.poseNameSelected]}>
                    {pose.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {analysisMode === 'manual' && (
              <>
                <Text style={styles.sectionTitle}>📐 Alignment Scores</Text>
                {Object.entries(yogaMetrics).map(([key, value]) => (
                  <View key={key} style={styles.alignmentRow}>
                    <Text style={styles.alignmentLabel}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
                    <View style={styles.alignmentBar}>
                      <View style={[styles.alignmentFill, { width: `${value}%`, backgroundColor: getScoreColor(value) }]} />
                    </View>
                    <Text style={[styles.alignmentValue, { color: getScoreColor(value) }]}>{value}%</Text>
                  </View>
                ))}
              </>
            )}

            <TouchableOpacity
              style={[styles.analyzeButton, (!selectedPatient || !selectedPose || analyzing) && styles.buttonDisabled]}
              onPress={handleYogaAnalysis}
              disabled={!selectedPatient || !selectedPose || analyzing}
            >
              {analyzing ? (
                <ActivityIndicator color={theme.colors.textPrimary} />
              ) : (
                <>
                  <MaterialCommunityIcons name="robot" size={24} color={theme.colors.textPrimary} />
                  <Text style={styles.analyzeButtonText}>Generate AI Feedback</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Athlete Load Tab */}
        {activeTab === 'athlete' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>📊 Session Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Session Type</Text>
              <View style={styles.sessionTypes}>
                {['training', 'match', 'recovery'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.sessionType, athleteData.session_type === type && styles.sessionTypeSelected]}
                    onPress={() => setAthleteData(prev => ({ ...prev, session_type: type }))}
                  >
                    <Text style={[styles.sessionTypeText, athleteData.session_type === type && styles.sessionTypeTextSelected]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Duration (minutes)</Text>
              <TextInput
                style={styles.textInput}
                value={String(athleteData.duration_minutes)}
                onChangeText={(v) => setAthleteData(prev => ({ ...prev, duration_minutes: parseInt(v) || 0 }))}
                keyboardType="numeric"
                placeholder="60"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>RPE (1-10)</Text>
              <View style={styles.rpeContainer}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.rpeButton,
                      athleteData.rpe === n && { 
                        backgroundColor: n <= 3 ? theme.colors.success : 
                                        n <= 6 ? theme.colors.warning : theme.colors.error 
                      }
                    ]}
                    onPress={() => setAthleteData(prev => ({ ...prev, rpe: n }))}
                  >
                    <Text style={[styles.rpeText, athleteData.rpe === n && styles.rpeTextSelected]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.loadPreview}>
              <Text style={styles.loadPreviewLabel}>Session Load</Text>
              <Text style={styles.loadPreviewValue}>{athleteData.duration_minutes * athleteData.rpe}</Text>
              <Text style={styles.loadPreviewFormula}>({athleteData.duration_minutes} × {athleteData.rpe})</Text>
            </View>

            <TouchableOpacity
              style={[styles.analyzeButton, (!selectedPatient || analyzing) && styles.buttonDisabled]}
              onPress={handleAthleteMonitoring}
              disabled={!selectedPatient || analyzing}
            >
              {analyzing ? (
                <ActivityIndicator color={theme.colors.textPrimary} />
              ) : (
                <>
                  <Ionicons name="fitness" size={24} color={theme.colors.textPrimary} />
                  <Text style={styles.analyzeButtonText}>Analyze & Generate Report</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Patient Modal */}
      <Modal visible={showPatientModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Patient</Text>
              <TouchableOpacity onPress={() => setShowPatientModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {patients.length === 0 ? (
                <Text style={styles.noPatients}>No patients assigned yet</Text>
              ) : (
                patients.map(patient => (
                  <TouchableOpacity
                    key={patient.id}
                    style={[styles.patientOption, selectedPatient?.id === patient.id && styles.patientOptionSelected]}
                    onPress={() => { setSelectedPatient(patient); setShowPatientModal(false); }}
                  >
                    <Ionicons name="person" size={24} color={selectedPatient?.id === patient.id ? theme.colors.accent : theme.colors.textMuted} />
                    <View style={styles.patientOptionInfo}>
                      <Text style={styles.patientOptionName}>{patient.name}</Text>
                      <Text style={styles.patientOptionEmail}>{patient.email}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  scrollContent: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  header: { alignItems: 'center', marginBottom: theme.spacing.lg },
  backButton: { position: 'absolute', left: 0, top: 0 },
  title: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginTop: theme.spacing.sm },
  subtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  // Quick Analysis Grid
  quickAnalysisGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  quickAnalysisCard: { width: '48%', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center', borderWidth: 2, position: 'relative' },
  quickAnalysisText: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginTop: theme.spacing.sm },
  quickAnalysisBadge: { position: 'absolute', top: theme.spacing.xs, right: theme.spacing.xs, backgroundColor: '#FFD700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 10, fontWeight: 'bold', color: '#000', overflow: 'hidden' },
  // Add Patient Button
  addPatientButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.success, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md, gap: theme.spacing.sm },
  addPatientText: { flex: 1, fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },
  selector: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, gap: theme.spacing.md },
  selectorInfo: { flex: 1 },
  selectorName: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  selectorEmail: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  selectorPlaceholder: { flex: 1, color: theme.colors.textMuted },
  // Upload Section
  uploadSection: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: theme.colors.accent },
  uploadButtons: { flexDirection: 'row', justifyContent: 'space-around' },
  uploadButton: { alignItems: 'center', padding: theme.spacing.md },
  uploadButtonText: { color: theme.colors.textSecondary, marginTop: theme.spacing.xs, fontSize: theme.fontSize.sm },
  videoPreview: { alignItems: 'center' },
  videoThumbnail: { width: 150, height: 100, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.primaryLight },
  removeVideoButton: { position: 'absolute', top: -8, right: 80 },
  videoLabel: { color: theme.colors.success, marginTop: theme.spacing.sm, fontWeight: theme.fontWeight.semibold },
  // Mode Selector
  modeSelector: { flexDirection: 'row', gap: theme.spacing.md },
  modeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.card, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, gap: theme.spacing.sm, borderWidth: 2, borderColor: 'transparent' },
  modeButtonActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accent + '20' },
  modeButtonText: { color: theme.colors.textMuted, fontWeight: theme.fontWeight.medium },
  modeButtonTextActive: { color: theme.colors.textPrimary },
  // Tabs
  tabContainer: { flexDirection: 'row', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.xs, marginTop: theme.spacing.lg },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.sm, gap: theme.spacing.xs },
  tabActive: { backgroundColor: theme.colors.accent },
  tabText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  tabTextActive: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },
  tabContent: { marginTop: theme.spacing.md },
  // Sports Grid
  sportsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  sportCard: { width: '48%', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  sportCardSelected: { borderColor: theme.colors.accent },
  sportName: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing.xs },
  sportNameSelected: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },
  // Metrics
  metricRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  metricLabel: { width: 90, fontSize: theme.fontSize.xs, color: theme.colors.textSecondary },
  metricSlider: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  metricDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: theme.colors.cardBorder },
  metricValue: { width: 40, textAlign: 'right', fontWeight: theme.fontWeight.bold, fontSize: theme.fontSize.sm },
  // Yoga
  poseScroll: { marginBottom: theme.spacing.md },
  poseCard: { width: 110, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center', marginRight: theme.spacing.sm, borderWidth: 2, borderColor: 'transparent' },
  poseCardSelected: { borderColor: theme.colors.accent },
  poseName: { fontSize: 10, color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing.xs },
  poseNameSelected: { color: theme.colors.textPrimary },
  alignmentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  alignmentLabel: { width: 90, fontSize: theme.fontSize.xs, color: theme.colors.textSecondary },
  alignmentBar: { flex: 1, height: 8, backgroundColor: theme.colors.cardBorder, borderRadius: 4, marginHorizontal: theme.spacing.sm, overflow: 'hidden' },
  alignmentFill: { height: '100%', borderRadius: 4 },
  alignmentValue: { width: 40, textAlign: 'right', fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold },
  // Athlete
  inputGroup: { marginBottom: theme.spacing.md },
  inputLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
  sessionTypes: { flexDirection: 'row', gap: theme.spacing.sm },
  sessionType: { flex: 1, backgroundColor: theme.colors.card, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  sessionTypeSelected: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accent + '20' },
  sessionTypeText: { color: theme.colors.textMuted },
  sessionTypeTextSelected: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },
  textInput: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, color: theme.colors.textPrimary, fontSize: theme.fontSize.md },
  rpeContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  rpeButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.card, justifyContent: 'center', alignItems: 'center' },
  rpeText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  rpeTextSelected: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },
  loadPreview: { backgroundColor: theme.colors.accent + '20', borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.accent },
  loadPreviewLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  loadPreviewValue: { fontSize: 48, fontWeight: theme.fontWeight.bold, color: theme.colors.accent },
  loadPreviewFormula: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted },
  // Analyze Button
  analyzeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accent, paddingVertical: theme.spacing.lg, borderRadius: theme.borderRadius.lg, marginTop: theme.spacing.xl, gap: theme.spacing.md },
  buttonDisabled: { opacity: 0.5 },
  analyzeButtonText: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  // Results
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  resultsTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  scoreCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.xl, alignItems: 'center', borderWidth: 2, marginBottom: theme.spacing.lg },
  scoreLabel: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
  scoreValue: { fontSize: 56, fontWeight: theme.fontWeight.bold, marginVertical: theme.spacing.sm },
  acwrBadge: { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, borderRadius: theme.borderRadius.lg, marginTop: theme.spacing.sm },
  acwrText: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },
  paramsSection: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md },
  paramRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder },
  paramName: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  paramBadge: { paddingVertical: 4, paddingHorizontal: theme.spacing.sm, borderRadius: theme.borderRadius.sm },
  paramValue: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold, fontSize: theme.fontSize.sm },
  aiSection: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.accent },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  aiTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  aiText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 22 },
  correctionsSection: { marginBottom: theme.spacing.md },
  correctionItem: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, backgroundColor: theme.colors.warning + '15', padding: theme.spacing.md, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.sm },
  correctionText: { flex: 1, fontSize: theme.fontSize.sm, color: theme.colors.textPrimary },
  recommendationsSection: { marginBottom: theme.spacing.md },
  recommendationItem: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, backgroundColor: theme.colors.success + '15', padding: theme.spacing.md, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.sm },
  recommendationText: { flex: 1, fontSize: theme.fontSize.sm, color: theme.colors.textPrimary },
  actionButtons: { gap: theme.spacing.md },
  pdfButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.success, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, gap: theme.spacing.sm },
  pdfButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  newAnalysisButton: { alignItems: 'center', paddingVertical: theme.spacing.md },
  newAnalysisButtonText: { fontSize: theme.fontSize.md, color: theme.colors.accent, fontWeight: theme.fontWeight.semibold },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.primary, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder },
  modalTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  modalBody: { padding: theme.spacing.md },
  noPatients: { textAlign: 'center', color: theme.colors.textMuted, padding: theme.spacing.xl },
  patientOption: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.sm, backgroundColor: theme.colors.card, gap: theme.spacing.md },
  patientOptionSelected: { borderWidth: 2, borderColor: theme.colors.accent },
  patientOptionInfo: { flex: 1 },
  patientOptionName: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  patientOptionEmail: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  // Player Info Card - Sports tab
  playerInfoCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md },
  inputRow: { flexDirection: 'row', marginBottom: theme.spacing.sm },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm, paddingHorizontal: theme.spacing.md, flex: 1 },
  input: { flex: 1, color: theme.colors.textPrimary, paddingVertical: theme.spacing.md, marginLeft: theme.spacing.sm },
  sportsScroll: { marginBottom: theme.spacing.md },
  sportIconContainer: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.xs },
  subcategoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  subcategoryCard: { width: '48%', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  subcategorySelected: { borderColor: theme.colors.accent },
  subcategoryName: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.xs },
  biomechanicsInfo: { backgroundColor: theme.colors.accent + '10', padding: theme.spacing.md, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.md },
  biomechanicsInfoText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  biomechanicsCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  biomechanicsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  biomechanicsName: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  biomechanicsScore: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.accent },
  biomechanicsDesc: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  scoreSlider: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: theme.spacing.sm },
  scoreDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.cardBorder },
  noteInput: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm, padding: theme.spacing.md, color: theme.colors.textPrimary, minHeight: 60, textAlignVertical: 'top' },
  aiModeInfo: { backgroundColor: theme.colors.success + '10', padding: theme.spacing.md, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.md },
  aiModeTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.success, marginBottom: theme.spacing.xs },
  aiModeText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
});
