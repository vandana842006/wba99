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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';
import { saveAssessmentReport } from '../../src/utils/api';
import PatientSelector, { Patient } from '../../src/components/PatientSelector';

// Exercise Categories
const EXERCISE_CATEGORIES = [
  { id: 'mobility', name: 'Mobility', icon: 'human-handsup', color: '#2196F3', description: 'Joint range of motion exercises' },
  { id: 'stretching', name: 'Stretching', icon: 'yoga', color: '#9C27B0', description: 'Flexibility and lengthening exercises' },
  { id: 'strengthening', name: 'Strengthening', icon: 'dumbbell', color: '#FF5722', description: 'Muscle building and resistance exercises' },
];

// Body Parts
const BODY_PARTS = [
  { id: 'neck', name: 'Neck/Cervical', icon: 'head' },
  { id: 'shoulder', name: 'Shoulder', icon: 'arm-flex' },
  { id: 'upper_back', name: 'Upper Back', icon: 'human' },
  { id: 'lower_back', name: 'Lower Back', icon: 'human-male' },
  { id: 'hip', name: 'Hip', icon: 'human-handsdown' },
  { id: 'knee', name: 'Knee', icon: 'human-handsdown' },
  { id: 'ankle', name: 'Ankle/Foot', icon: 'shoe-print' },
  { id: 'wrist', name: 'Wrist/Hand', icon: 'hand-back-left' },
  { id: 'elbow', name: 'Elbow', icon: 'arm-flex-outline' },
  { id: 'full_body', name: 'Full Body', icon: 'human-male-board' },
];

// Exercise Image URLs - Physiotherapy themed illustrations
const EXERCISE_IMAGES: Record<string, string> = {
  'Neck Circles': 'https://cdn-icons-png.flaticon.com/512/2936/2936886.png',
  'Chin Tucks': 'https://cdn-icons-png.flaticon.com/512/2936/2936874.png',
  'Arm Circles': 'https://cdn-icons-png.flaticon.com/512/2548/2548537.png',
  'Wall Slides': 'https://cdn-icons-png.flaticon.com/512/3043/3043928.png',
  'Hip Circles': 'https://cdn-icons-png.flaticon.com/512/2936/2936854.png',
  'Glute Bridge': 'https://cdn-icons-png.flaticon.com/512/2936/2936930.png',
  'Bird Dog': 'https://cdn-icons-png.flaticon.com/512/3048/3048427.png',
  'Plank': 'https://cdn-icons-png.flaticon.com/512/3043/3043941.png',
  'Clamshells': 'https://cdn-icons-png.flaticon.com/512/2936/2936854.png',
  'Cat-Cow Stretch': 'https://cdn-icons-png.flaticon.com/512/2936/2936930.png',
  'Shoulder Stretch': 'https://cdn-icons-png.flaticon.com/512/2548/2548537.png',
  'Hamstring Stretch': 'https://cdn-icons-png.flaticon.com/512/3048/3048427.png',
  'Quad Stretch': 'https://cdn-icons-png.flaticon.com/512/2936/2936854.png',
  'Hip Flexor Stretch': 'https://cdn-icons-png.flaticon.com/512/3043/3043941.png',
  'Calf Raises': 'https://cdn-icons-png.flaticon.com/512/2936/2936874.png',
  'Squats': 'https://cdn-icons-png.flaticon.com/512/3043/3043928.png',
  'Lunges': 'https://cdn-icons-png.flaticon.com/512/2936/2936886.png',
  'default': 'https://cdn-icons-png.flaticon.com/512/2936/2936930.png',
};

// Do's and Don'ts for conditions
const CONDITION_GUIDELINES: Record<string, { dos: string[]; donts: string[] }> = {
  'frozen_shoulder': {
    dos: [
      'Perform exercises within pain-free range',
      'Apply heat before exercises to relax muscles',
      'Use pendulum exercises to maintain mobility',
      'Progress gradually as pain allows',
      'Maintain good posture throughout the day',
      'Sleep with a pillow supporting the arm',
    ],
    donts: [
      'Force movements beyond pain tolerance',
      'Sleep on the affected shoulder',
      'Carry heavy bags on affected side',
      'Perform overhead activities repeatedly',
      'Skip prescribed exercise sessions',
      'Apply ice immediately before stretching',
    ],
  },
  'lower_back_pain': {
    dos: [
      'Maintain neutral spine during exercises',
      'Engage core muscles before movements',
      'Use proper lifting techniques (bend knees)',
      'Take breaks from prolonged sitting',
      'Use lumbar support when sitting',
      'Walk regularly to maintain mobility',
    ],
    donts: [
      'Bend and twist simultaneously',
      'Sit for more than 30 minutes without break',
      'Sleep on stomach without pillow under hips',
      'Lift heavy objects with bent back',
      'Perform high-impact activities initially',
      'Ignore pain signals during exercises',
    ],
  },
  'acl_rehab': {
    dos: [
      'Follow weight-bearing progression as advised',
      'Use ice after exercises to reduce swelling',
      'Wear knee brace as prescribed',
      'Focus on quadriceps strengthening',
      'Practice balance exercises on stable surfaces first',
      'Progress from walking to jogging gradually',
    ],
    donts: [
      'Pivot or twist on the affected leg',
      'Return to sports before clearance',
      'Skip rehabilitation exercises',
      'Ignore swelling or increased pain',
      'Perform deep squats or lunges early',
      'Jump or land on single leg initially',
    ],
  },
  'neck_pain': {
    dos: [
      'Keep screen at eye level',
      'Take breaks every 30 minutes from computer',
      'Use a supportive pillow while sleeping',
      'Perform gentle stretches throughout day',
      'Maintain chin tucked posture',
      'Apply heat for muscle relaxation',
    ],
    donts: [
      'Sleep on stomach',
      'Hold phone between ear and shoulder',
      'Crane neck forward at computer',
      'Carry heavy shoulder bags',
      'Perform aggressive neck rotations',
      'Sleep with too many pillows',
    ],
  },
  'default': {
    dos: [
      'Warm up before exercises',
      'Stay hydrated throughout exercise',
      'Progress exercises gradually',
      'Listen to your body',
      'Maintain proper form and technique',
      'Rest adequately between sessions',
    ],
    donts: [
      'Exercise through sharp pain',
      'Skip warm-up or cool-down',
      'Progress too quickly',
      'Hold breath during exercises',
      'Ignore persistent symptoms',
      'Overtrain affected areas',
    ],
  },
};

// Pre-built Exercise Templates
const EXERCISE_TEMPLATES: Record<string, Record<string, Exercise[]>> = {
  mobility: {
    neck: [
      { id: 'm1', name: 'Neck Circles', sets: '2', reps: '10 each way', hold: '', notes: 'Slow controlled circles' },
      { id: 'm2', name: 'Chin Tucks', sets: '3', reps: '10', hold: '5 sec', notes: 'Retract chin towards spine' },
      { id: 'm3', name: 'Neck Flexion/Extension', sets: '2', reps: '10', hold: '', notes: 'Look up and down slowly' },
    ],
    shoulder: [
      { id: 'm4', name: 'Arm Circles', sets: '2', reps: '15 each way', hold: '', notes: 'Small to large circles' },
      { id: 'm5', name: 'Wall Slides', sets: '3', reps: '10', hold: '2 sec', notes: 'Back flat against wall' },
      { id: 'm6', name: 'Shoulder CAR', sets: '2', reps: '5 each', hold: '', notes: 'Controlled articular rotations' },
    ],
    hip: [
      { id: 'm7', name: 'Hip Circles', sets: '2', reps: '10 each way', hold: '', notes: 'Standing hip rotations' },
      { id: 'm8', name: '90/90 Transitions', sets: '3', reps: '8 each side', hold: '', notes: 'Smooth hip rotation' },
      { id: 'm9', name: 'Hip CAR', sets: '2', reps: '5 each', hold: '', notes: 'Full ROM hip circles' },
    ],
    knee: [
      { id: 'm10', name: 'Knee Flexion/Extension', sets: '3', reps: '15', hold: '', notes: 'Seated knee bends' },
      { id: 'm11', name: 'Heel Slides', sets: '3', reps: '10', hold: '', notes: 'Supine sliding motion' },
    ],
    ankle: [
      { id: 'm12', name: 'Ankle Circles', sets: '2', reps: '10 each way', hold: '', notes: 'Full ROM circles' },
      { id: 'm13', name: 'Ankle Pumps', sets: '3', reps: '20', hold: '', notes: 'Point and flex' },
    ],
  },
  stretching: {
    neck: [
      { id: 's1', name: 'Upper Trap Stretch', sets: '2', reps: '3 each side', hold: '30 sec', notes: 'Ear to shoulder' },
      { id: 's2', name: 'Levator Scapulae Stretch', sets: '2', reps: '3 each side', hold: '30 sec', notes: 'Look into armpit' },
      { id: 's3', name: 'SCM Stretch', sets: '2', reps: '3 each side', hold: '20 sec', notes: 'Rotate and extend' },
    ],
    shoulder: [
      { id: 's4', name: 'Cross Body Stretch', sets: '2', reps: '3 each arm', hold: '30 sec', notes: 'Pull arm across chest' },
      { id: 's5', name: 'Doorway Pec Stretch', sets: '3', reps: '2 each side', hold: '30 sec', notes: 'Arm at 90 degrees' },
      { id: 's6', name: 'Sleeper Stretch', sets: '2', reps: '3 each side', hold: '30 sec', notes: 'Internal rotation stretch' },
    ],
    hip: [
      { id: 's7', name: 'Hip Flexor Stretch', sets: '2', reps: '3 each side', hold: '30 sec', notes: 'Half kneeling position' },
      { id: 's8', name: 'Piriformis Stretch', sets: '2', reps: '3 each side', hold: '30 sec', notes: 'Figure 4 position' },
      { id: 's9', name: 'Pigeon Stretch', sets: '2', reps: '2 each side', hold: '60 sec', notes: 'Deep hip opener' },
    ],
    lower_back: [
      { id: 's10', name: 'Cat-Cow Stretch', sets: '2', reps: '10', hold: '', notes: 'Alternate flexion/extension' },
      { id: 's11', name: 'Child\'s Pose', sets: '3', reps: '1', hold: '30 sec', notes: 'Relaxation stretch' },
      { id: 's12', name: 'Knee to Chest', sets: '2', reps: '3 each side', hold: '30 sec', notes: 'Single leg pull' },
    ],
  },
  strengthening: {
    shoulder: [
      { id: 'st1', name: 'External Rotation', sets: '3', reps: '12', hold: '', notes: 'Use resistance band' },
      { id: 'st2', name: 'Internal Rotation', sets: '3', reps: '12', hold: '', notes: 'Use resistance band' },
      { id: 'st3', name: 'Scaption', sets: '3', reps: '10', hold: '', notes: 'Raise at 30° angle' },
      { id: 'st4', name: 'Rows', sets: '3', reps: '12', hold: '', notes: 'Band or dumbbell' },
    ],
    hip: [
      { id: 'st5', name: 'Clamshells', sets: '3', reps: '15 each side', hold: '', notes: 'Side-lying with band' },
      { id: 'st6', name: 'Glute Bridge', sets: '3', reps: '12', hold: '3 sec', notes: 'Squeeze glutes at top' },
      { id: 'st7', name: 'Side-lying Hip Abduction', sets: '3', reps: '12 each', hold: '', notes: 'Keep leg straight' },
      { id: 'st8', name: 'Monster Walks', sets: '2', reps: '20 steps', hold: '', notes: 'Band around knees' },
    ],
    knee: [
      { id: 'st9', name: 'Quad Sets', sets: '3', reps: '10', hold: '5 sec', notes: 'Tighten quad muscle' },
      { id: 'st10', name: 'Straight Leg Raise', sets: '3', reps: '10 each', hold: '', notes: 'Lock knee, lift leg' },
      { id: 'st11', name: 'Terminal Knee Extension', sets: '3', reps: '15', hold: '', notes: 'Band around knee' },
      { id: 'st12', name: 'Step Ups', sets: '3', reps: '10 each leg', hold: '', notes: 'Use step or box' },
    ],
    lower_back: [
      { id: 'st13', name: 'Bird Dog', sets: '3', reps: '10 each side', hold: '5 sec', notes: 'Opposite arm/leg' },
      { id: 'st14', name: 'Dead Bug', sets: '3', reps: '10 each side', hold: '', notes: 'Maintain neutral spine' },
      { id: 'st15', name: 'Plank', sets: '3', reps: '1', hold: '30 sec', notes: 'Keep body straight' },
      { id: 'st16', name: 'Superman', sets: '3', reps: '10', hold: '3 sec', notes: 'Lift arms and legs' },
    ],
    ankle: [
      { id: 'st17', name: 'Calf Raises', sets: '3', reps: '15', hold: '', notes: 'Single or double leg' },
      { id: 'st18', name: 'Toe Raises', sets: '3', reps: '15', hold: '', notes: 'Lift toes off ground' },
      { id: 'st19', name: 'Resistance Band Dorsiflexion', sets: '3', reps: '12', hold: '', notes: 'Pull toes up against band' },
    ],
  },
};

interface Exercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  hold: string;
  notes: string;
  isCustom?: boolean;
}

interface RehabProgram {
  patient_name: string;
  patient_id: string;
  condition: string;
  category: string;
  bodyPart: string;
  exercises: Exercise[];
  frequency: string;
  duration: string;
  precautions: string;
}

export default function RehabMaker() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [condition, setCondition] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [frequency, setFrequency] = useState('Daily');
  const [duration, setDuration] = useState('4 weeks');
  const [precautions, setPrecautions] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [assessmentSaved, setAssessmentSaved] = useState(false);
  const [customExercise, setCustomExercise] = useState<Exercise>({
    id: '',
    name: '',
    sets: '3',
    reps: '10',
    hold: '',
    notes: '',
    isCustom: true,
  });

  const getCategoryColor = () => {
    const cat = EXERCISE_CATEGORIES.find(c => c.id === selectedCategory);
    return cat?.color || theme.colors.accent;
  };

  const getAvailableExercises = () => {
    if (!selectedCategory || !selectedBodyPart) return [];
    return EXERCISE_TEMPLATES[selectedCategory]?.[selectedBodyPart] || [];
  };

  const toggleExercise = (exercise: Exercise) => {
    const exists = selectedExercises.find(e => e.id === exercise.id);
    if (exists) {
      setSelectedExercises(prev => prev.filter(e => e.id !== exercise.id));
    } else {
      setSelectedExercises(prev => [...prev, { ...exercise }]);
    }
  };

  const addCustomExercise = () => {
    if (!customExercise.name) {
      Alert.alert('Required', 'Please enter exercise name');
      return;
    }
    const newExercise = {
      ...customExercise,
      id: `custom_${Date.now()}`,
    };
    setSelectedExercises(prev => [...prev, newExercise]);
    setShowAddModal(false);
    setCustomExercise({
      id: '',
      name: '',
      sets: '3',
      reps: '10',
      hold: '',
      notes: '',
      isCustom: true,
    });
  };

  const updateExerciseParam = (exerciseId: string, field: keyof Exercise, value: string) => {
    setSelectedExercises(prev =>
      prev.map(e => (e.id === exerciseId ? { ...e, [field]: value } : e))
    );
  };

  const removeExercise = (exerciseId: string) => {
    setSelectedExercises(prev => prev.filter(e => e.id !== exerciseId));
  };

  const generateAIProgram = async () => {
    if (!condition || !selectedBodyPart) {
      Alert.alert('Required', 'Please enter condition and select body part');
      return;
    }

    setGeneratingAI(true);
    try {
      const response = await api.post('/ai/generate-rehab-program', {
        condition: condition,
        body_part: selectedBodyPart,
        category: selectedCategory || 'all',
        patient_info: selectedPatient?.name || 'Unknown',
      });

      const { exercises, frequency: aiFrequency, duration: aiDuration, precautions: aiPrecautions } = response.data;
      
      // Map AI exercises to our format
      const aiExercises: Exercise[] = exercises.map((ex: any, idx: number) => ({
        id: `ai_${idx}`,
        name: ex.name,
        sets: ex.sets || '3',
        reps: ex.reps || '10',
        hold: ex.hold || '',
        notes: ex.notes || '',
        isCustom: false,
      }));

      setSelectedExercises(prev => [...prev, ...aiExercises]);
      if (aiFrequency) setFrequency(aiFrequency);
      if (aiDuration) setDuration(aiDuration);
      if (aiPrecautions) setPrecautions(aiPrecautions);

      Alert.alert('Success', `Added ${aiExercises.length} AI-recommended exercises`);
    } catch (error) {
      console.error('AI generation error:', error);
      // Fallback to template-based exercises
      const templates = getAvailableExercises();
      if (templates.length > 0) {
        setSelectedExercises(prev => [...prev, ...templates]);
        Alert.alert('Added Template Exercises', `Added ${templates.length} exercises from our library`);
      } else {
        Alert.alert('No Exercises Found', 'Please select exercises manually or try different options');
      }
    } finally {
      setGeneratingAI(false);
    }
  };

  // Save Assessment to Database
  const handleSaveAssessment = async () => {
    if (!selectedPatient || !currentUser?.id) {
      Alert.alert('Error', 'Please select a patient first');
      return;
    }

    if (selectedExercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise before saving');
      return;
    }

    setSavingAssessment(true);
    try {
      const reportData = {
        physio_id: currentUser.id,
        patient_id: selectedPatient.id,
        assessment_type: 'rehab_prescription',
        report_data: {
          condition,
          category: selectedCategory,
          bodyPart: selectedBodyPart,
          exercises: selectedExercises,
          frequency,
          duration,
          precautions,
        },
        summary: `Rehab Prescription: ${condition || 'General'} - ${selectedExercises.length} exercises, ${frequency}, ${duration}`,
      };

      await saveAssessmentReport(reportData);
      setAssessmentSaved(true);
      Alert.alert(
        '✅ Prescription Saved',
        `Rehab prescription for ${selectedPatient.name} has been saved successfully.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving assessment:', error);
      Alert.alert('Error', 'Failed to save prescription. Please try again.');
    } finally {
      setSavingAssessment(false);
    }
  };

  const generatePDF = async () => {
    if (selectedExercises.length === 0) {
      Alert.alert('No Exercises', 'Please add at least one exercise');
      return;
    }

    const currentDate = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const reportId = `WBA99-REHAB-${Date.now().toString(36).toUpperCase()}`;
    const categoryName = EXERCISE_CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Rehabilitation';
    const bodyPartName = BODY_PARTS.find(b => b.id === selectedBodyPart)?.name || 'General';
    const categoryColor = getCategoryColor();

    // Get Do's and Don'ts for condition
    const conditionKey = condition.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
    let guidelines = CONDITION_GUIDELINES['default'];
    for (const key of Object.keys(CONDITION_GUIDELINES)) {
      if (conditionKey.includes(key) || key.includes(conditionKey)) {
        guidelines = CONDITION_GUIDELINES[key];
        break;
      }
    }

    // Generate exercises HTML with images
    const exercisesHtml = selectedExercises.map((ex, idx) => {
      const imageUrl = EXERCISE_IMAGES[ex.name] || EXERCISE_IMAGES['default'];
      return `
      <div class="exercise-card">
        <div class="exercise-image-container">
          <img src="${imageUrl}" alt="${ex.name}" class="exercise-image" onerror="this.style.display='none'"/>
          <div class="exercise-number-badge">${idx + 1}</div>
        </div>
        <div class="exercise-content">
          <div class="exercise-name">${ex.name}</div>
          <div class="exercise-params">
            <div class="param-box">
              <span class="param-label">Sets</span>
              <span class="param-value">${ex.sets}</span>
            </div>
            <div class="param-box">
              <span class="param-label">Reps</span>
              <span class="param-value">${ex.reps}</span>
            </div>
            ${ex.hold ? `
            <div class="param-box">
              <span class="param-label">Hold</span>
              <span class="param-value">${ex.hold}</span>
            </div>
            ` : ''}
          </div>
          ${ex.notes ? `<div class="exercise-notes">💡 ${ex.notes}</div>` : ''}
        </div>
      </div>
    `}).join('');

    // Generate Do's list
    const dosHtml = guidelines.dos.map(item => `<li class="do-item">✓ ${item}</li>`).join('');
    
    // Generate Don'ts list
    const dontsHtml = guidelines.donts.map(item => `<li class="dont-item">✗ ${item}</li>`).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.4; background: #fff; }
    
    /* Header */
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid ${categoryColor}; padding-bottom: 15px; margin-bottom: 15px; }
    .logo-section { display: flex; align-items: center; gap: 10px; }
    .logo { font-size: 32px; font-weight: bold; color: ${categoryColor}; }
    .logo-sub { font-size: 11px; color: #666; }
    .report-meta { text-align: right; font-size: 10px; color: #666; }
    
    /* Title Section */
    .title-section { background: linear-gradient(135deg, ${categoryColor}, ${categoryColor}cc); color: white; padding: 20px; border-radius: 12px; margin-bottom: 15px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
    .title { font-size: 26px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
    .subtitle { font-size: 14px; opacity: 0.95; }
    
    /* Patient Info */
    .patient-info { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 15px; }
    .info-box { background: linear-gradient(135deg, #f8f9fa, #fff); border-radius: 8px; padding: 12px; border-left: 4px solid ${categoryColor}; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .info-label { font-size: 9px; color: #666; text-transform: uppercase; margin-bottom: 4px; font-weight: 600; }
    .info-value { font-size: 14px; font-weight: bold; color: #333; }
    
    /* Schedule Box */
    .schedule-box { background: linear-gradient(135deg, #e8f5e9, #f1f8e9); border-radius: 10px; padding: 15px; margin-bottom: 15px; border: 2px solid #4CAF50; }
    .schedule-title { font-size: 14px; font-weight: bold; color: #2e7d32; margin-bottom: 10px; }
    .schedule-grid { display: flex; gap: 30px; }
    .schedule-item { display: flex; flex-direction: column; }
    .schedule-label { font-size: 10px; color: #666; }
    .schedule-value { font-size: 16px; font-weight: bold; color: #2e7d32; }
    
    /* Section Title */
    .section-title { font-size: 16px; font-weight: bold; color: ${categoryColor}; margin: 20px 0 12px; padding-bottom: 8px; border-bottom: 3px solid ${categoryColor}; display: flex; align-items: center; gap: 8px; }
    
    /* Exercise Cards */
    .exercises-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .exercise-card { background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 3px 12px rgba(0,0,0,0.08); border: 1px solid #e0e0e0; page-break-inside: avoid; }
    .exercise-image-container { position: relative; height: 100px; background: linear-gradient(135deg, #f5f5f5, #e0e0e0); overflow: hidden; }
    .exercise-image { width: 100%; height: 100%; object-fit: cover; }
    .exercise-number-badge { position: absolute; top: 8px; left: 8px; width: 28px; height: 28px; background: ${categoryColor}; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
    .exercise-content { padding: 12px; }
    .exercise-name { font-size: 13px; font-weight: bold; color: #333; margin-bottom: 8px; }
    .exercise-params { display: flex; gap: 8px; margin-bottom: 8px; }
    .param-box { background: ${categoryColor}15; border-radius: 6px; padding: 5px 10px; text-align: center; flex: 1; }
    .param-label { font-size: 8px; color: #666; display: block; text-transform: uppercase; }
    .param-value { font-size: 12px; font-weight: bold; color: ${categoryColor}; }
    .exercise-notes { font-size: 10px; color: #666; background: #f9f9f9; padding: 6px 8px; border-radius: 4px; border-left: 3px solid ${categoryColor}; }
    
    /* Do's and Don'ts Section */
    .guidelines-section { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; page-break-inside: avoid; }
    .dos-box { background: linear-gradient(135deg, #e8f5e9, #f1f8e9); border-radius: 10px; padding: 15px; border: 2px solid #4CAF50; }
    .donts-box { background: linear-gradient(135deg, #ffebee, #fce4ec); border-radius: 10px; padding: 15px; border: 2px solid #f44336; }
    .guidelines-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
    .dos-title { color: #2e7d32; }
    .donts-title { color: #c62828; }
    .guidelines-list { list-style: none; padding: 0; }
    .guidelines-list li { font-size: 11px; padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,0.05); }
    .do-item { color: #2e7d32; }
    .dont-item { color: #c62828; }
    
    /* Precautions */
    .precautions { background: linear-gradient(135deg, #fff3e0, #ffe0b2); border-radius: 10px; padding: 15px; margin-top: 15px; border: 2px solid #ff9800; }
    .precautions-title { font-size: 14px; font-weight: bold; color: #e65100; margin-bottom: 8px; }
    .precautions-text { font-size: 11px; color: #5d4037; }
    
    /* Footer */
    .footer { margin-top: 20px; padding-top: 12px; border-top: 2px solid #e0e0e0; display: flex; justify-content: space-between; font-size: 9px; color: #999; }
    .footer-logo { font-weight: bold; color: ${categoryColor}; }
    
    /* Professional Badge */
    .professional-badge { position: absolute; top: 10px; right: 10px; background: linear-gradient(135deg, gold, #ffc107); color: #333; font-size: 8px; padding: 4px 10px; border-radius: 12px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      <div>
        <div class="logo">WBA99</div>
        <div class="logo-sub">Professional Rehabilitation Program</div>
      </div>
    </div>
    <div class="report-meta">
      <p><strong>Report ID:</strong> ${reportId}</p>
      <p><strong>Date:</strong> ${currentDate}</p>
      <p><strong>Total Exercises:</strong> ${selectedExercises.length}</p>
      <p><strong>Category:</strong> ${categoryName}</p>
    </div>
  </div>

  <div class="title-section">
    <div class="title">${categoryName} Exercise Program</div>
    <div class="subtitle">${bodyPartName} Rehabilitation Protocol</div>
  </div>

  <div class="patient-info">
    <div class="info-box">
      <div class="info-label">Patient Name</div>
      <div class="info-value">${selectedPatient?.name || 'Not specified'}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Condition / Diagnosis</div>
      <div class="info-value">${condition || 'General Rehabilitation'}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Target Area</div>
      <div class="info-value">${bodyPartName}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Exercise Type</div>
      <div class="info-value">${categoryName}</div>
    </div>
  </div>

  <div class="schedule-box">
    <div class="schedule-title">📅 Recommended Schedule</div>
    <div class="schedule-grid">
      <div class="schedule-item">
        <span class="schedule-label">Frequency</span>
        <span class="schedule-value">${frequency}</span>
      </div>
      <div class="schedule-item">
        <span class="schedule-label">Program Duration</span>
        <span class="schedule-value">${duration}</span>
      </div>
      <div class="schedule-item">
        <span class="schedule-label">Session Time</span>
        <span class="schedule-value">15-20 min</span>
      </div>
    </div>
  </div>

  <div class="section-title">💪 Exercise Program</div>
  <div class="exercises-grid">
    ${exercisesHtml}
  </div>

  <div class="guidelines-section">
    <div class="dos-box">
      <div class="guidelines-title dos-title">✅ DO's - Best Practices</div>
      <ul class="guidelines-list">
        ${dosHtml}
      </ul>
    </div>
    <div class="donts-box">
      <div class="guidelines-title donts-title">❌ DON'Ts - Avoid These</div>
      <ul class="guidelines-list">
        ${dontsHtml}
      </ul>
    </div>
  </div>

  ${precautions ? `
  <div class="precautions">
    <div class="precautions-title">⚠️ Special Precautions & Notes</div>
    <div class="precautions-text">${precautions}</div>
  </div>
  ` : ''}

  <!-- AI Analysis Section -->
  <div class="ai-section" style="background: linear-gradient(135deg, #1a237e, #311b92); border-radius: 12px; padding: 20px; margin-top: 20px; color: white; page-break-inside: avoid;">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
      <span style="font-size: 24px;">🤖</span>
      <span style="font-size: 18px; font-weight: bold;">AI-Powered Analysis</span>
      <span style="background: #00e676; color: #1a237e; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: bold; margin-left: auto;">POWERED BY AI</span>
    </div>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
      <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; text-align: center;">
        <div style="font-size: 24px; margin-bottom: 5px;">📊</div>
        <div style="font-size: 12px; font-weight: bold;">Progress Tracking</div>
        <div style="font-size: 10px; opacity: 0.8;">AI monitors your improvement daily</div>
      </div>
      <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; text-align: center;">
        <div style="font-size: 24px; margin-bottom: 5px;">🎯</div>
        <div style="font-size: 12px; font-weight: bold;">Personalized Adaptation</div>
        <div style="font-size: 10px; opacity: 0.8;">Program adjusts to your recovery</div>
      </div>
      <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; text-align: center;">
        <div style="font-size: 24px; margin-bottom: 5px;">🔔</div>
        <div style="font-size: 12px; font-weight: bold;">Smart Reminders</div>
        <div style="font-size: 10px; opacity: 0.8;">Never miss your exercises</div>
      </div>
    </div>
    <div style="margin-top: 15px; padding: 12px; background: rgba(0,230,118,0.2); border-radius: 8px; border-left: 4px solid #00e676;">
      <div style="font-size: 11px; font-weight: bold; margin-bottom: 5px;">🌟 AI Recommendation Score</div>
      <div style="font-size: 10px; opacity: 0.9;">This program is optimized for ${condition || 'rehabilitation'} based on evidence-based protocols and machine learning analysis of similar cases.</div>
    </div>
  </div>

  <!-- Payment Section with QR -->
  <div class="payment-section" style="margin-top: 20px; page-break-inside: avoid;">
    <div style="background: linear-gradient(135deg, #fff, #f5f5f5); border-radius: 12px; padding: 20px; border: 2px dashed ${categoryColor};">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="flex: 1;">
          <div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
            <span>💳</span>
            <span>Payment Information</span>
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 15px;">
            For online payment, scan the QR code or use the UPI ID below.
          </div>
          <div style="background: #f0f0f0; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
            <div style="font-size: 10px; color: #666; margin-bottom: 4px;">UPI ID</div>
            <div style="font-size: 14px; font-weight: bold; color: #333;">wba99clinic@paytm</div>
          </div>
          <div style="background: #f0f0f0; border-radius: 8px; padding: 12px;">
            <div style="font-size: 10px; color: #666; margin-bottom: 4px;">Bank Transfer</div>
            <div style="font-size: 11px; color: #333;">A/C: XXXX XXXX XXXX 1234</div>
            <div style="font-size: 11px; color: #333;">IFSC: SBIN0001234</div>
          </div>
        </div>
        <div style="text-align: center; margin-left: 20px;">
          <div style="width: 120px; height: 120px; background: #fff; border: 2px solid #333; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
            <svg viewBox="0 0 100 100" width="100" height="100" style="padding: 10px;">
              <!-- QR Code Pattern (simplified representation) -->
              <rect x="10" y="10" width="20" height="20" fill="#333"/>
              <rect x="70" y="10" width="20" height="20" fill="#333"/>
              <rect x="10" y="70" width="20" height="20" fill="#333"/>
              <rect x="35" y="10" width="5" height="5" fill="#333"/>
              <rect x="45" y="10" width="5" height="5" fill="#333"/>
              <rect x="55" y="10" width="5" height="5" fill="#333"/>
              <rect x="35" y="35" width="30" height="30" fill="#333"/>
              <rect x="40" y="40" width="20" height="20" fill="#fff"/>
              <rect x="45" y="45" width="10" height="10" fill="#333"/>
              <rect x="10" y="35" width="5" height="5" fill="#333"/>
              <rect x="20" y="40" width="5" height="5" fill="#333"/>
              <rect x="85" y="35" width="5" height="5" fill="#333"/>
              <rect x="75" y="45" width="5" height="5" fill="#333"/>
              <rect x="85" y="55" width="5" height="5" fill="#333"/>
              <rect x="35" y="75" width="5" height="5" fill="#333"/>
              <rect x="45" y="80" width="5" height="5" fill="#333"/>
              <rect x="55" y="75" width="5" height="5" fill="#333"/>
              <rect x="75" y="75" width="5" height="5" fill="#333"/>
              <rect x="85" y="85" width="5" height="5" fill="#333"/>
            </svg>
          </div>
          <div style="font-size: 10px; color: #666;">Scan to Pay</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Clinic Contact Section -->
  <div style="margin-top: 20px; background: linear-gradient(135deg, ${categoryColor}10, ${categoryColor}05); border-radius: 12px; padding: 15px; border: 1px solid ${categoryColor}30;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 14px; font-weight: bold; color: ${categoryColor};">📞 Need Help? Contact Us</div>
        <div style="font-size: 11px; color: #666; margin-top: 5px;">Phone: +91 98765 43210 | Email: support@wba99.com</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 10px; color: #666;">Follow-up Appointment</div>
        <div style="font-size: 12px; font-weight: bold; color: #333;">Book via WBA99 App</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <span class="footer-logo">WBA99 Expert Analysis India</span>
    <span>AI-Powered Rehabilitation Program</span>
    <span>www.wba99.com</span>
  </div>
</body>
</html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Rehab Program - ${selectedPatient?.name || 'Patient'}` });
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rehab Maker</Text>
          <TouchableOpacity onPress={generatePDF} style={styles.pdfButton}>
            <Ionicons name="document-text" size={24} color={theme.colors.success} />
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="medical-bag" size={32} color={theme.colors.accent} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>AI Exercise Builder</Text>
            <Text style={styles.infoText}>Create custom rehabilitation programs with AI assistance</Text>
          </View>
        </View>

        {/* Patient Selector */}
        <PatientSelector
          physioId={currentUser?.id || ''}
          selectedPatient={selectedPatient}
          onSelectPatient={setSelectedPatient}
          label="Select Patient"
          placeholder="Tap to select a patient"
        />

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Condition / Diagnosis</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Frozen Shoulder, ACL Rehab, Lower Back Pain"
            placeholderTextColor={theme.colors.textMuted}
            value={condition}
            onChangeText={setCondition}
          />
        </View>

        {/* Exercise Category */}
        <Text style={styles.sectionTitle}>🏋️ Exercise Category</Text>
        <View style={styles.categoryGrid}>
          {EXERCISE_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryCard,
                selectedCategory === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '15' },
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <View style={[styles.categoryIcon, { backgroundColor: cat.color }]}>
                <MaterialCommunityIcons name={cat.icon as any} size={24} color="#fff" />
              </View>
              <Text style={[styles.categoryName, selectedCategory === cat.id && { color: cat.color }]}>
                {cat.name}
              </Text>
              <Text style={styles.categoryDesc}>{cat.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Body Part Selection */}
        <Text style={styles.sectionTitle}>🦴 Target Body Part</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bodyPartScroll}>
          {BODY_PARTS.map(part => (
            <TouchableOpacity
              key={part.id}
              style={[
                styles.bodyPartButton,
                selectedBodyPart === part.id && { backgroundColor: getCategoryColor(), borderColor: getCategoryColor() },
              ]}
              onPress={() => setSelectedBodyPart(part.id)}
            >
              <MaterialCommunityIcons
                name={part.icon as any}
                size={20}
                color={selectedBodyPart === part.id ? '#fff' : theme.colors.textMuted}
              />
              <Text style={[
                styles.bodyPartText,
                selectedBodyPart === part.id && { color: '#fff' },
              ]}>
                {part.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* AI Generate Button */}
        <TouchableOpacity
          style={[styles.aiButton, (!condition || !selectedBodyPart) && styles.buttonDisabled]}
          onPress={generateAIProgram}
          disabled={generatingAI || !condition || !selectedBodyPart}
        >
          {generatingAI ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="robot" size={24} color="#fff" />
              <Text style={styles.aiButtonText}>Generate AI Program</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Available Exercises */}
        {selectedCategory && selectedBodyPart && (
          <View style={styles.exerciseSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📋 Available Exercises</Text>
              <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Custom</Text>
              </TouchableOpacity>
            </View>

            {getAvailableExercises().map(exercise => {
              const isSelected = selectedExercises.some(e => e.id === exercise.id);
              return (
                <TouchableOpacity
                  key={exercise.id}
                  style={[styles.exerciseItem, isSelected && { borderColor: getCategoryColor(), backgroundColor: getCategoryColor() + '10' }]}
                  onPress={() => toggleExercise(exercise)}
                >
                  <View style={[styles.checkbox, isSelected && { backgroundColor: getCategoryColor(), borderColor: getCategoryColor() }]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseParams}>
                      {exercise.sets} sets × {exercise.reps} {exercise.hold ? `• Hold ${exercise.hold}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {getAvailableExercises().length === 0 && (
              <View style={styles.noExercises}>
                <MaterialCommunityIcons name="information-outline" size={32} color={theme.colors.textMuted} />
                <Text style={styles.noExercisesText}>No preset exercises for this combination</Text>
                <Text style={styles.noExercisesHint}>Use AI Generate or add custom exercises</Text>
              </View>
            )}
          </View>
        )}

        {/* Selected Exercises */}
        {selectedExercises.length > 0 && (
          <View style={styles.selectedSection}>
            <Text style={styles.sectionTitle}>✅ Selected Exercises ({selectedExercises.length})</Text>
            {selectedExercises.map((exercise, idx) => (
              <View key={exercise.id} style={styles.selectedExercise}>
                <View style={[styles.exerciseNumber, { backgroundColor: getCategoryColor() }]}>
                  <Text style={styles.exerciseNumberText}>{idx + 1}</Text>
                </View>
                <View style={styles.selectedExerciseContent}>
                  <Text style={styles.selectedExerciseName}>{exercise.name}</Text>
                  <View style={styles.paramInputs}>
                    <View style={styles.paramInput}>
                      <Text style={styles.paramLabel}>Sets</Text>
                      <TextInput
                        style={styles.paramField}
                        value={exercise.sets}
                        onChangeText={(v) => updateExerciseParam(exercise.id, 'sets', v)}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.paramInput}>
                      <Text style={styles.paramLabel}>Reps</Text>
                      <TextInput
                        style={styles.paramField}
                        value={exercise.reps}
                        onChangeText={(v) => updateExerciseParam(exercise.id, 'reps', v)}
                      />
                    </View>
                    <View style={styles.paramInput}>
                      <Text style={styles.paramLabel}>Hold</Text>
                      <TextInput
                        style={styles.paramField}
                        value={exercise.hold}
                        onChangeText={(v) => updateExerciseParam(exercise.id, 'hold', v)}
                        placeholder="sec"
                        placeholderTextColor={theme.colors.textMuted}
                      />
                    </View>
                  </View>
                  <TextInput
                    style={styles.notesInput}
                    value={exercise.notes}
                    onChangeText={(v) => updateExerciseParam(exercise.id, 'notes', v)}
                    placeholder="Notes..."
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
                <TouchableOpacity onPress={() => removeExercise(exercise.id)} style={styles.removeButton}>
                  <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Program Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>⚙️ Program Settings</Text>
          <View style={styles.settingsRow}>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Frequency</Text>
              <View style={styles.settingOptions}>
                {['Daily', '2x/day', '3x/week', 'As needed'].map(freq => (
                  <TouchableOpacity
                    key={freq}
                    style={[styles.settingOption, frequency === freq && { backgroundColor: getCategoryColor() }]}
                    onPress={() => setFrequency(freq)}
                  >
                    <Text style={[styles.settingOptionText, frequency === freq && { color: '#fff' }]}>{freq}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.settingsRow}>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Duration</Text>
              <View style={styles.settingOptions}>
                {['2 weeks', '4 weeks', '6 weeks', '8 weeks'].map(dur => (
                  <TouchableOpacity
                    key={dur}
                    style={[styles.settingOption, duration === dur && { backgroundColor: getCategoryColor() }]}
                    onPress={() => setDuration(dur)}
                  >
                    <Text style={[styles.settingOptionText, duration === dur && { color: '#fff' }]}>{dur}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Precautions & Notes</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              placeholder="Any precautions, contraindications, or special instructions..."
              placeholderTextColor={theme.colors.textMuted}
              value={precautions}
              onChangeText={setPrecautions}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Generate PDF Button */}
        <TouchableOpacity
          style={[styles.generateButton, selectedExercises.length === 0 && styles.buttonDisabled]}
          onPress={generatePDF}
          disabled={selectedExercises.length === 0}
        >
          <Ionicons name="document-text" size={24} color="#fff" />
          <Text style={styles.generateButtonText}>Generate PDF Report</Text>
        </TouchableOpacity>

        {/* Save Prescription Button */}
        <TouchableOpacity
          style={[styles.saveButton, (savingAssessment || assessmentSaved || selectedExercises.length === 0) && styles.buttonDisabled]}
          onPress={handleSaveAssessment}
          disabled={savingAssessment || assessmentSaved || selectedExercises.length === 0}
        >
          {savingAssessment ? (
            <>
              <ActivityIndicator color="#fff" />
              <Text style={styles.saveButtonText}>Saving...</Text>
            </>
          ) : assessmentSaved ? (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.saveButtonText}>Prescription Saved</Text>
            </>
          ) : (
            <>
              <Ionicons name="save" size={24} color="#fff" />
              <Text style={styles.saveButtonText}>Save to Patient Record</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Custom Exercise Modal */}
        <Modal visible={showAddModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Custom Exercise</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder="Exercise Name"
                placeholderTextColor={theme.colors.textMuted}
                value={customExercise.name}
                onChangeText={(v) => setCustomExercise(prev => ({ ...prev, name: v }))}
              />

              <View style={styles.modalRow}>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Sets</Text>
                  <TextInput
                    style={styles.modalSmallInput}
                    value={customExercise.sets}
                    onChangeText={(v) => setCustomExercise(prev => ({ ...prev, sets: v }))}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Reps</Text>
                  <TextInput
                    style={styles.modalSmallInput}
                    value={customExercise.reps}
                    onChangeText={(v) => setCustomExercise(prev => ({ ...prev, reps: v }))}
                  />
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Hold</Text>
                  <TextInput
                    style={styles.modalSmallInput}
                    value={customExercise.hold}
                    onChangeText={(v) => setCustomExercise(prev => ({ ...prev, hold: v }))}
                    placeholder="sec"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
              </View>

              <TextInput
                style={[styles.modalInput, { minHeight: 60 }]}
                placeholder="Notes / Instructions"
                placeholderTextColor={theme.colors.textMuted}
                value={customExercise.notes}
                onChangeText={(v) => setCustomExercise(prev => ({ ...prev, notes: v }))}
                multiline
              />

              <TouchableOpacity style={styles.modalAddButton} onPress={addCustomExercise}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.modalAddButtonText}>Add Exercise</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  backButton: { padding: theme.spacing.xs },
  headerTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  pdfButton: { padding: theme.spacing.xs },

  infoCard: { flexDirection: 'row', backgroundColor: theme.colors.accent + '20', borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.lg, gap: theme.spacing.md, alignItems: 'center' },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  infoText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 4 },

  inputSection: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  inputLabel: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  input: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm, padding: theme.spacing.md, color: theme.colors.textPrimary, fontSize: theme.fontSize.md, borderWidth: 1, borderColor: theme.colors.cardBorder },

  sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md, marginTop: theme.spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md, marginTop: theme.spacing.md },

  categoryGrid: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  categoryCard: { flex: 1, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center', borderWidth: 2, borderColor: theme.colors.cardBorder },
  categoryIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.sm },
  categoryName: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: 4 },
  categoryDesc: { fontSize: 9, color: theme.colors.textMuted, textAlign: 'center' },

  bodyPartScroll: { marginBottom: theme.spacing.lg },
  bodyPartButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, marginRight: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.cardBorder, gap: 6 },
  bodyPartText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },

  aiButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#9C27B0', borderRadius: theme.borderRadius.md, padding: theme.spacing.md, gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  aiButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: '#fff' },

  exerciseSection: { marginBottom: theme.spacing.lg },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.accent, borderRadius: theme.borderRadius.sm, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, gap: 4 },
  addButtonText: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: '#fff' },

  exerciseItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 2, borderColor: theme.colors.cardBorder },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: theme.colors.cardBorder, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  exerciseParams: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 2 },

  noExercises: { alignItems: 'center', padding: theme.spacing.xl, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md },
  noExercisesText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  noExercisesHint: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 4 },

  selectedSection: { marginBottom: theme.spacing.lg },
  selectedExercise: { flexDirection: 'row', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.cardBorder },
  exerciseNumber: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  exerciseNumberText: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: '#fff' },
  selectedExerciseContent: { flex: 1 },
  selectedExerciseName: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  paramInputs: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  paramInput: { flex: 1 },
  paramLabel: { fontSize: 10, color: theme.colors.textMuted, marginBottom: 2 },
  paramField: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm, paddingHorizontal: theme.spacing.sm, paddingVertical: 6, color: theme.colors.textPrimary, fontSize: theme.fontSize.sm, borderWidth: 1, borderColor: theme.colors.cardBorder, textAlign: 'center' },
  notesInput: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm, paddingHorizontal: theme.spacing.sm, paddingVertical: 6, color: theme.colors.textPrimary, fontSize: theme.fontSize.sm, borderWidth: 1, borderColor: theme.colors.cardBorder },
  removeButton: { padding: theme.spacing.sm },

  settingsSection: { marginBottom: theme.spacing.lg },
  settingsRow: { marginBottom: theme.spacing.md },
  settingItem: {},
  settingLabel: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  settingOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  settingOption: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.sm, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.cardBorder },
  settingOptionText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },

  generateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.success, borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, gap: theme.spacing.sm },
  generateButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: '#fff' },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accent, borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  saveButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: '#fff' },
  buttonDisabled: { opacity: 0.5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  modalContent: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.xl, width: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  modalTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  modalInput: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm, padding: theme.spacing.md, color: theme.colors.textPrimary, fontSize: theme.fontSize.md, borderWidth: 1, borderColor: theme.colors.cardBorder, marginBottom: theme.spacing.md },
  modalRow: { flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.md },
  modalField: { flex: 1 },
  modalLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginBottom: 4 },
  modalSmallInput: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm, padding: theme.spacing.sm, color: theme.colors.textPrimary, fontSize: theme.fontSize.md, borderWidth: 1, borderColor: theme.colors.cardBorder, textAlign: 'center' },
  modalAddButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.success, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, gap: theme.spacing.sm },
  modalAddButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: '#fff' },
});
