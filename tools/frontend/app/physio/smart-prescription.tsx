import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../src/utils/theme';
import { getPhysioPatients, getExercises } from '../../src/utils/api';
import { useStore, User, Exercise } from '../../src/store/useStore';
import Constants from 'expo-constants';

interface NutritionItem {
  name: string;
  value: string;
  unit: string;
  frequency: string;
  icon: string;
}

interface ExerciseItem {
  name: string;
  frequency: string;
  sets: string;
  reps: string;
  duration: string;
  notes: string;
  aiDescription?: string;
}

interface ElectrotherapyItem {
  modality: string;
  parameters: string;
  duration: string;
  frequency: string;
  area: string;
  notes: string;
}

// Electrotherapy modalities with default parameters
const ELECTROTHERAPY_MODALITIES = [
  { name: 'TENS', category: 'Electrical', defaultParams: 'Frequency: 80-120 Hz, Pulse: 50-100 µs', icon: 'flash' },
  { name: 'IFT', category: 'Electrical', defaultParams: 'Frequency: 4000 Hz, AMF: 80-120 Hz', icon: 'pulse' },
  { name: 'Ultrasound', category: 'Thermal', defaultParams: 'Frequency: 1-3 MHz, Intensity: 0.5-2 W/cm²', icon: 'radio' },
  { name: 'Russian Current', category: 'Electrical', defaultParams: 'Frequency: 2500 Hz, Burst: 50 Hz', icon: 'flash-outline' },
  { name: 'Faradic Current', category: 'Electrical', defaultParams: 'Pulse: 0.1-1 ms, Frequency: 30-100 Hz', icon: 'flash-sharp' },
  { name: 'Galvanic Current', category: 'Electrical', defaultParams: 'Intensity: 1-5 mA, Continuous DC', icon: 'battery-charging' },
  { name: 'SD Curve', category: 'Diagnostic', defaultParams: 'Duration: 0.01-1000 ms', icon: 'analytics' },
  { name: 'Cryotherapy', category: 'Thermal', defaultParams: 'Temperature: -10 to 0°C, Duration: 10-20 min', icon: 'snow' },
  { name: 'Shock Wave', category: 'Mechanical', defaultParams: 'Pressure: 1-5 bar, Frequency: 1-21 Hz', icon: 'thunderstorm' },
  { name: 'Laser Therapy', category: 'Light', defaultParams: 'Wavelength: 600-1000 nm, Power: 5-500 mW', icon: 'flashlight' },
  { name: 'Magnetic Therapy', category: 'Magnetic', defaultParams: 'Intensity: 5-100 Gauss, Frequency: 1-100 Hz', icon: 'magnet' },
];

export default function SmartPrescriptionScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  
  // Patient Selection
  const [patients, setPatients] = useState<User[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  
  // Prescription Details
  const [prescriptionTitle, setPrescriptionTitle] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  
  // Nutrition Items
  const [nutritionItems, setNutritionItems] = useState<NutritionItem[]>([
    { name: 'Water', value: '3', unit: 'Liters', frequency: 'Daily', icon: 'water' },
    { name: 'Protein', value: '1.5', unit: 'g/kg bodyweight', frequency: 'Daily', icon: 'food-steak' },
    { name: 'Electrolytes', value: '1', unit: 'sachet', frequency: 'After exercise', icon: 'lightning-bolt' },
  ]);
  
  // Exercise Items
  const [exerciseItems, setExerciseItems] = useState<ExerciseItem[]>([]);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseFrequency, setNewExerciseFrequency] = useState('3x/week');
  const [newExerciseSets, setNewExerciseSets] = useState('3');
  const [newExerciseReps, setNewExerciseReps] = useState('10');
  const [newExerciseDuration, setNewExerciseDuration] = useState('');
  const [newExerciseNotes, setNewExerciseNotes] = useState('');
  
  // Electrotherapy Items
  const [electrotherapyItems, setElectrotherapyItems] = useState<ElectrotherapyItem[]>([]);
  const [showModalitySelector, setShowModalitySelector] = useState(false);
  const [selectedModality, setSelectedModality] = useState<string>('');
  const [newElectroParams, setNewElectroParams] = useState('');
  const [newElectroDuration, setNewElectroDuration] = useState('15 min');
  const [newElectroFrequency, setNewElectroFrequency] = useState('Daily');
  const [newElectroArea, setNewElectroArea] = useState('');
  const [newElectroNotes, setNewElectroNotes] = useState('');
  const [customModality, setCustomModality] = useState('');
  
  // Additional Instructions
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  
  // Equipment from backend
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  
  // State
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                      process.env.EXPO_PUBLIC_BACKEND_URL || 
                      '';

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      try {
        const patientsRes = await getPhysioPatients(currentUser.id);
        setPatients(patientsRes.data);
        
        // Fetch equipment list
        const equipmentRes = await fetch(`${BACKEND_URL}/api/equipment/devices`);
        if (equipmentRes.ok) {
          const equipment = await equipmentRes.json();
          setEquipmentList(equipment);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  // Add nutrition item
  const addNutritionItem = () => {
    setNutritionItems([...nutritionItems, {
      name: '',
      value: '',
      unit: '',
      frequency: 'Daily',
      icon: 'pill',
    }]);
  };

  // Update nutrition item
  const updateNutritionItem = (index: number, field: keyof NutritionItem, value: string) => {
    const updated = [...nutritionItems];
    updated[index] = { ...updated[index], [field]: value };
    setNutritionItems(updated);
  };

  // Remove nutrition item
  const removeNutritionItem = (index: number) => {
    setNutritionItems(nutritionItems.filter((_, i) => i !== index));
  };

  // Add exercise
  const addExercise = () => {
    if (!newExerciseName.trim()) {
      Alert.alert('Error', 'Please enter exercise name');
      return;
    }
    
    setExerciseItems([...exerciseItems, {
      name: newExerciseName,
      frequency: newExerciseFrequency,
      sets: newExerciseSets,
      reps: newExerciseReps,
      duration: newExerciseDuration,
      notes: newExerciseNotes,
    }]);
    
    // Reset form
    setNewExerciseName('');
    setNewExerciseFrequency('3x/week');
    setNewExerciseSets('3');
    setNewExerciseReps('10');
    setNewExerciseDuration('');
    setNewExerciseNotes('');
  };

  // Remove exercise
  const removeExercise = (index: number) => {
    setExerciseItems(exerciseItems.filter((_, i) => i !== index));
  };

  // Add electrotherapy modality
  const addElectrotherapy = () => {
    const modality = customModality.trim() || selectedModality;
    if (!modality) {
      Alert.alert('Error', 'Please select or enter a modality');
      return;
    }
    
    const modalityData = ELECTROTHERAPY_MODALITIES.find(m => m.name === selectedModality);
    const params = newElectroParams || modalityData?.defaultParams || '';
    
    setElectrotherapyItems([...electrotherapyItems, {
      modality: modality,
      parameters: params,
      duration: newElectroDuration,
      frequency: newElectroFrequency,
      area: newElectroArea,
      notes: newElectroNotes,
    }]);
    
    // Reset form
    setSelectedModality('');
    setCustomModality('');
    setNewElectroParams('');
    setNewElectroDuration('15 min');
    setNewElectroFrequency('Daily');
    setNewElectroArea('');
    setNewElectroNotes('');
    setShowModalitySelector(false);
  };

  // Remove electrotherapy
  const removeElectrotherapy = (index: number) => {
    setElectrotherapyItems(electrotherapyItems.filter((_, i) => i !== index));
  };

  // Generate AI parameters for electrotherapy
  const generateAIElectroParams = async (modality: string) => {
    const modalityData = ELECTROTHERAPY_MODALITIES.find(m => m.name === modality);
    if (modalityData) {
      setNewElectroParams(modalityData.defaultParams);
    }
  };

  // Generate AI descriptions for exercises
  const generateAIDescriptions = async () => {
    if (exerciseItems.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/generate-prescription-descriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercises: exerciseItems.map(e => ({
            name: e.name,
            frequency: e.frequency,
            sets: e.sets,
            reps: e.reps,
            duration: e.duration,
            notes: e.notes,
          })),
          nutrition: nutritionItems,
          diagnosis: diagnosis,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update exercises with AI descriptions
        const updatedExercises = exerciseItems.map((exercise, index) => ({
          ...exercise,
          aiDescription: data.descriptions[index] || generateDefaultDescription(exercise),
        }));
        setExerciseItems(updatedExercises);
        Alert.alert('Success', 'AI descriptions generated!');
      } else {
        // Use default descriptions
        const updatedExercises = exerciseItems.map(exercise => ({
          ...exercise,
          aiDescription: generateDefaultDescription(exercise),
        }));
        setExerciseItems(updatedExercises);
        Alert.alert('Success', 'Descriptions generated!');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      // Use default descriptions on error
      const updatedExercises = exerciseItems.map(exercise => ({
        ...exercise,
        aiDescription: generateDefaultDescription(exercise),
      }));
      setExerciseItems(updatedExercises);
      Alert.alert('Success', 'Descriptions generated!');
    } finally {
      setGenerating(false);
    }
  };

  // Generate default description
  const generateDefaultDescription = (exercise: ExerciseItem): string => {
    const descriptions: Record<string, string> = {
      'wall angels': 'Stand with your back against a wall, feet shoulder-width apart. Place arms against the wall in a "goalpost" position. Slowly slide arms up and down while maintaining contact with the wall. This exercise improves shoulder mobility and posture by strengthening upper back muscles.',
      'plank': 'Start in a push-up position with forearms on the ground. Keep your body in a straight line from head to heels. Engage your core and hold the position. This exercise strengthens the core, shoulders, and improves overall stability.',
      'squats': 'Stand with feet shoulder-width apart. Lower your body by bending knees and pushing hips back as if sitting in a chair. Keep your chest up and knees tracking over toes. Return to standing. This exercise strengthens quadriceps, glutes, and improves lower body function.',
      'lunges': 'Step forward with one leg, lowering your hips until both knees are bent at 90 degrees. Keep your front knee directly above your ankle. Push back to starting position. This exercise improves leg strength, balance, and hip flexibility.',
      'bridge': 'Lie on your back with knees bent and feet flat on floor. Lift your hips toward the ceiling, squeezing glutes at the top. Lower slowly. This exercise strengthens glutes, hamstrings, and supports lower back health.',
      'cat-cow stretch': 'Start on hands and knees. Alternate between arching your back (cat) and dropping your belly while lifting your head (cow). This exercise improves spinal mobility and reduces back stiffness.',
      'bird dog': 'Start on hands and knees. Extend opposite arm and leg while keeping core engaged and back flat. Hold briefly, then switch sides. This exercise improves core stability and balance.',
      'clamshells': 'Lie on your side with knees bent at 45 degrees. Keep feet together and lift top knee while keeping pelvis stable. This exercise strengthens hip abductors and improves hip stability.',
    };

    const lowerName = exercise.name.toLowerCase();
    for (const [key, desc] of Object.entries(descriptions)) {
      if (lowerName.includes(key)) {
        return desc;
      }
    }

    return `Perform ${exercise.name} as instructed by your physiotherapist. Complete ${exercise.sets} sets of ${exercise.reps} repetitions${exercise.duration ? ` or hold for ${exercise.duration}` : ''}. ${exercise.notes || 'Focus on proper form and controlled movements.'}`;
  };

  // Generate PDF
  const generatePDF = async () => {
    if (!selectedPatient) {
      Alert.alert('Error', 'Please select a patient');
      return;
    }
    if (exerciseItems.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }

    // Generate descriptions if not already done
    if (exerciseItems.some(e => !e.aiDescription)) {
      const updatedExercises = exerciseItems.map(exercise => ({
        ...exercise,
        aiDescription: exercise.aiDescription || generateDefaultDescription(exercise),
      }));
      setExerciseItems(updatedExercises);
    }

    setGeneratingPdf(true);
    try {
      const patientName = patients.find(p => p.id === selectedPatient)?.name || 'Patient';
      const physioName = currentUser?.name || 'Physiotherapist';
      const html = generatePrescriptionHTML(patientName, physioName);
      
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
      
      Alert.alert('Success', 'Prescription PDF generated and ready to share!');
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Generate HTML for PDF
  const generatePrescriptionHTML = (patientName: string, physioName: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; background: #fff; color: #333; }
        .header { text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; border-radius: 10px; }
        .header h1 { font-size: 24px; margin-bottom: 5px; }
        .header p { opacity: 0.9; font-size: 14px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; }
        .info-item { text-align: center; }
        .info-label { font-size: 12px; color: #666; margin-bottom: 5px; }
        .info-value { font-size: 16px; font-weight: bold; color: #1a1a2e; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 18px; font-weight: bold; color: #1a1a2e; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #00d9ff; display: flex; align-items: center; gap: 10px; }
        .nutrition-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        .nutrition-card { background: #e8f5e9; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #c8e6c9; }
        .nutrition-name { font-size: 14px; font-weight: bold; color: #2e7d32; margin-bottom: 5px; }
        .nutrition-value { font-size: 20px; font-weight: bold; color: #1b5e20; }
        .nutrition-unit { font-size: 12px; color: #666; }
        .nutrition-freq { font-size: 11px; color: #888; margin-top: 5px; }
        .exercise-card { background: #fff; border: 1px solid #e0e0e0; border-radius: 10px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .exercise-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .exercise-name { font-size: 18px; font-weight: bold; color: #1a1a2e; }
        .exercise-freq { background: #00d9ff; color: #fff; padding: 4px 10px; border-radius: 15px; font-size: 12px; font-weight: bold; }
        .exercise-params { display: flex; gap: 20px; margin-bottom: 15px; background: #f8f9fa; padding: 10px 15px; border-radius: 5px; }
        .param { text-align: center; }
        .param-value { font-size: 18px; font-weight: bold; color: #00d9ff; }
        .param-label { font-size: 11px; color: #666; }
        .exercise-description { font-size: 14px; line-height: 1.6; color: #555; padding: 15px; background: #fff3e0; border-radius: 8px; border-left: 4px solid #ff9800; }
        .exercise-image { width: 100%; height: 150px; background: linear-gradient(135deg, #e3f2fd, #bbdefb); border-radius: 8px; margin-bottom: 15px; display: flex; align-items: center; justify-content: center; color: #1565c0; font-size: 48px; }
        .instructions { background: #e3f2fd; padding: 20px; border-radius: 10px; border: 1px solid #90caf9; }
        .instructions h3 { color: #1565c0; margin-bottom: 10px; }
        .instructions p { font-size: 14px; line-height: 1.6; color: #333; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
        .footer p { font-size: 12px; color: #888; }
        .signature { display: flex; justify-content: space-between; margin-top: 40px; }
        .sig-box { width: 45%; }
        .sig-line { border-bottom: 1px solid #333; margin-bottom: 5px; height: 40px; }
        .sig-label { font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏥 Exercise & Nutrition Prescription</h1>
        <p>WBA99 Physiotherapy Assessment</p>
      </div>

      <div class="info-row">
        <div class="info-item">
          <div class="info-label">Patient Name</div>
          <div class="info-value">${patientName}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Date</div>
          <div class="info-value">${new Date().toLocaleDateString()}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Prescribed By</div>
          <div class="info-value">${physioName}</div>
        </div>
      </div>

      ${diagnosis ? `
      <div class="section">
        <div class="section-title">📋 Diagnosis</div>
        <p style="font-size: 15px; color: #555;">${diagnosis}</p>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-title">💧 Nutrition & Hydration</div>
        <div class="nutrition-grid">
          ${nutritionItems.map(item => `
            <div class="nutrition-card">
              <div class="nutrition-name">${item.name}</div>
              <div class="nutrition-value">${item.value}</div>
              <div class="nutrition-unit">${item.unit}</div>
              <div class="nutrition-freq">${item.frequency}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="section">
        <div class="section-title">🏋️ Exercise Program</div>
        ${exerciseItems.map((exercise, index) => `
          <div class="exercise-card">
            <div class="exercise-image">🏃</div>
            <div class="exercise-header">
              <div class="exercise-name">${index + 1}. ${exercise.name}</div>
              <div class="exercise-freq">${exercise.frequency}</div>
            </div>
            <div class="exercise-params">
              <div class="param">
                <div class="param-value">${exercise.sets}</div>
                <div class="param-label">Sets</div>
              </div>
              <div class="param">
                <div class="param-value">${exercise.reps}</div>
                <div class="param-label">Reps</div>
              </div>
              ${exercise.duration ? `
              <div class="param">
                <div class="param-value">${exercise.duration}</div>
                <div class="param-label">Duration</div>
              </div>
              ` : ''}
            </div>
            <div class="exercise-description">
              <strong>How to perform:</strong><br>
              ${exercise.aiDescription || generateDefaultDescription(exercise)}
            </div>
          </div>
        `).join('')}
      </div>

      ${additionalInstructions ? `
      <div class="section">
        <div class="instructions">
          <h3>📌 Additional Instructions</h3>
          <p>${additionalInstructions}</p>
        </div>
      </div>
      ` : ''}

      ${electrotherapyItems.length > 0 ? `
      <div class="section">
        <div class="section-title">⚡ Electrotherapy Protocol</div>
        ${electrotherapyItems.map((item, index) => `
          <div class="exercise-card" style="border-left: 4px solid #9C27B0;">
            <div class="exercise-header">
              <div class="exercise-name">${index + 1}. ${item.modality}</div>
              <div class="exercise-freq" style="background: #9C27B0;">${item.frequency}</div>
            </div>
            <div class="exercise-params">
              <div class="param">
                <div class="param-value">${item.duration}</div>
                <div class="param-label">Duration</div>
              </div>
              <div class="param">
                <div class="param-value">${item.area || 'Target Area'}</div>
                <div class="param-label">Area</div>
              </div>
            </div>
            <div class="exercise-description" style="background: #f3e5f5; border-left-color: #9C27B0;">
              <strong>Parameters:</strong> ${item.parameters}<br>
              ${item.notes ? `<strong>Notes:</strong> ${item.notes}` : ''}
            </div>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <div class="signature">
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-label">Patient Signature</div>
        </div>
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-label">Physiotherapist Signature</div>
        </div>
      </div>

      <div class="footer">
        <p>Generated by WBA99 Physiotherapy System</p>
        <p>This prescription is valid for 4 weeks from the date of issue.</p>
      </div>
    </body>
    </html>
  `;

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
            <Text style={styles.headerTitle}>Smart Prescription</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Patient Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Select Patient</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowPatientSelector(!showPatientSelector)}
            >
              <Text style={styles.selectorText}>
                {selectedPatient
                  ? patients.find(p => p.id === selectedPatient)?.name || 'Select Patient'
                  : 'Select Patient'}
              </Text>
              <Ionicons name={showPatientSelector ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            {showPatientSelector && (
              <View style={styles.selectorList}>
                {patients.map(patient => (
                  <TouchableOpacity
                    key={patient.id}
                    style={[styles.selectorOption, selectedPatient === patient.id && styles.selectorOptionSelected]}
                    onPress={() => { setSelectedPatient(patient.id); setShowPatientSelector(false); }}
                  >
                    <Text style={[styles.selectorOptionText, selectedPatient === patient.id && styles.selectorOptionTextSelected]}>
                      {patient.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Diagnosis */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Diagnosis / Condition</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Lower back pain, Postural dysfunction"
              placeholderTextColor={theme.colors.textMuted}
              value={diagnosis}
              onChangeText={setDiagnosis}
            />
          </View>

          {/* Nutrition Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💧 Nutrition & Hydration</Text>
            {nutritionItems.map((item, index) => (
              <View key={index} style={styles.nutritionCard}>
                <View style={styles.nutritionRow}>
                  <TextInput
                    style={[styles.nutritionInput, { flex: 2 }]}
                    placeholder="Name (e.g., Water)"
                    placeholderTextColor={theme.colors.textMuted}
                    value={item.name}
                    onChangeText={(v) => updateNutritionItem(index, 'name', v)}
                  />
                  <TextInput
                    style={[styles.nutritionInput, { flex: 1 }]}
                    placeholder="Amount"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="decimal-pad"
                    value={item.value}
                    onChangeText={(v) => updateNutritionItem(index, 'value', v)}
                  />
                  <TextInput
                    style={[styles.nutritionInput, { flex: 1 }]}
                    placeholder="Unit"
                    placeholderTextColor={theme.colors.textMuted}
                    value={item.unit}
                    onChangeText={(v) => updateNutritionItem(index, 'unit', v)}
                  />
                  <TouchableOpacity onPress={() => removeNutritionItem(index)}>
                    <Ionicons name="trash" size={20} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.nutritionFrequency}
                  placeholder="Frequency (e.g., Daily, After exercise)"
                  placeholderTextColor={theme.colors.textMuted}
                  value={item.frequency}
                  onChangeText={(v) => updateNutritionItem(index, 'frequency', v)}
                />
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={addNutritionItem}>
              <Ionicons name="add-circle" size={20} color={theme.colors.accent} />
              <Text style={styles.addButtonText}>Add Nutrition Item</Text>
            </TouchableOpacity>
          </View>

          {/* Exercise Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏋️ Exercises</Text>
            
            {/* Added Exercises */}
            {exerciseItems.map((exercise, index) => (
              <View key={index} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <TouchableOpacity onPress={() => removeExercise(index)}>
                    <Ionicons name="close-circle" size={22} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
                <View style={styles.exerciseParams}>
                  <View style={styles.paramBadge}>
                    <Text style={styles.paramText}>{exercise.sets} sets</Text>
                  </View>
                  <View style={styles.paramBadge}>
                    <Text style={styles.paramText}>{exercise.reps} reps</Text>
                  </View>
                  <View style={styles.paramBadge}>
                    <Text style={styles.paramText}>{exercise.frequency}</Text>
                  </View>
                </View>
                {exercise.aiDescription && (
                  <View style={styles.aiDescriptionBox}>
                    <Text style={styles.aiDescriptionLabel}>AI Description:</Text>
                    <Text style={styles.aiDescriptionText}>{exercise.aiDescription}</Text>
                  </View>
                )}
              </View>
            ))}

            {/* Add New Exercise Form */}
            <View style={styles.newExerciseForm}>
              <Text style={styles.formLabel}>Add Exercise</Text>
              <TextInput
                style={styles.input}
                placeholder="Exercise name (e.g., Wall Angels, Plank)"
                placeholderTextColor={theme.colors.textMuted}
                value={newExerciseName}
                onChangeText={setNewExerciseName}
              />
              <View style={styles.exerciseFormRow}>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Sets</Text>
                  <TextInput
                    style={styles.smallInput}
                    placeholder="3"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numeric"
                    value={newExerciseSets}
                    onChangeText={setNewExerciseSets}
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Reps</Text>
                  <TextInput
                    style={styles.smallInput}
                    placeholder="10"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numeric"
                    value={newExerciseReps}
                    onChangeText={setNewExerciseReps}
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Frequency</Text>
                  <TextInput
                    style={styles.smallInput}
                    placeholder="3x/week"
                    placeholderTextColor={theme.colors.textMuted}
                    value={newExerciseFrequency}
                    onChangeText={setNewExerciseFrequency}
                  />
                </View>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Notes (optional)"
                placeholderTextColor={theme.colors.textMuted}
                value={newExerciseNotes}
                onChangeText={setNewExerciseNotes}
              />
              <TouchableOpacity style={styles.addExerciseButton} onPress={addExercise}>
                <Ionicons name="add" size={20} color={theme.colors.textPrimary} />
                <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Electrotherapy Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Electrotherapy & Modalities</Text>
            
            {/* Added Electrotherapy Items */}
            {electrotherapyItems.map((item, index) => (
              <View key={index} style={styles.electroCard}>
                <View style={styles.electroHeader}>
                  <View style={styles.electroTitleRow}>
                    <Ionicons name="flash" size={20} color={theme.colors.accent} />
                    <Text style={styles.electroName}>{item.modality}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeElectrotherapy(index)}>
                    <Ionicons name="close-circle" size={22} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.electroParams}>{item.parameters}</Text>
                <View style={styles.electroDetailsRow}>
                  <View style={styles.electroDetail}>
                    <Ionicons name="time" size={14} color={theme.colors.textMuted} />
                    <Text style={styles.electroDetailText}>{item.duration}</Text>
                  </View>
                  <View style={styles.electroDetail}>
                    <Ionicons name="calendar" size={14} color={theme.colors.textMuted} />
                    <Text style={styles.electroDetailText}>{item.frequency}</Text>
                  </View>
                  {item.area && (
                    <View style={styles.electroDetail}>
                      <Ionicons name="body" size={14} color={theme.colors.textMuted} />
                      <Text style={styles.electroDetailText}>{item.area}</Text>
                    </View>
                  )}
                </View>
                {item.notes && (
                  <Text style={styles.electroNotes}>{item.notes}</Text>
                )}
              </View>
            ))}

            {/* Add Electrotherapy Form */}
            <View style={styles.newExerciseForm}>
              <Text style={styles.formLabel}>Add Electrotherapy Modality</Text>
              
              {/* Modality Selector */}
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowModalitySelector(!showModalitySelector)}
              >
                <Text style={styles.selectorText}>
                  {selectedModality || 'Select Modality'}
                </Text>
                <Ionicons name={showModalitySelector ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              
              {showModalitySelector && (
                <View style={styles.modalityList}>
                  {/* Electrical Category */}
                  <Text style={styles.categoryLabel}>Electrical Therapy</Text>
                  {ELECTROTHERAPY_MODALITIES.filter(m => m.category === 'Electrical').map((modality, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.modalityOption, selectedModality === modality.name && styles.modalityOptionSelected]}
                      onPress={() => {
                        setSelectedModality(modality.name);
                        setNewElectroParams(modality.defaultParams);
                        setShowModalitySelector(false);
                      }}
                    >
                      <Ionicons name={modality.icon as any} size={18} color={selectedModality === modality.name ? theme.colors.accent : theme.colors.textSecondary} />
                      <Text style={[styles.modalityOptionText, selectedModality === modality.name && styles.modalityOptionTextSelected]}>
                        {modality.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  
                  {/* Thermal Category */}
                  <Text style={styles.categoryLabel}>Thermal Therapy</Text>
                  {ELECTROTHERAPY_MODALITIES.filter(m => m.category === 'Thermal').map((modality, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.modalityOption, selectedModality === modality.name && styles.modalityOptionSelected]}
                      onPress={() => {
                        setSelectedModality(modality.name);
                        setNewElectroParams(modality.defaultParams);
                        setShowModalitySelector(false);
                      }}
                    >
                      <Ionicons name={modality.icon as any} size={18} color={selectedModality === modality.name ? theme.colors.accent : theme.colors.textSecondary} />
                      <Text style={[styles.modalityOptionText, selectedModality === modality.name && styles.modalityOptionTextSelected]}>
                        {modality.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  
                  {/* Mechanical/Light/Magnetic */}
                  <Text style={styles.categoryLabel}>Other Modalities</Text>
                  {ELECTROTHERAPY_MODALITIES.filter(m => ['Mechanical', 'Light', 'Magnetic', 'Diagnostic'].includes(m.category)).map((modality, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.modalityOption, selectedModality === modality.name && styles.modalityOptionSelected]}
                      onPress={() => {
                        setSelectedModality(modality.name);
                        setNewElectroParams(modality.defaultParams);
                        setShowModalitySelector(false);
                      }}
                    >
                      <Ionicons name={modality.icon as any} size={18} color={selectedModality === modality.name ? theme.colors.accent : theme.colors.textSecondary} />
                      <Text style={[styles.modalityOptionText, selectedModality === modality.name && styles.modalityOptionTextSelected]}>
                        {modality.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {/* Custom Modality */}
              <TextInput
                style={styles.input}
                placeholder="Or enter custom modality name"
                placeholderTextColor={theme.colors.textMuted}
                value={customModality}
                onChangeText={setCustomModality}
              />
              
              {/* Parameters */}
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                placeholder="Parameters (AI will suggest default values)"
                placeholderTextColor={theme.colors.textMuted}
                multiline
                value={newElectroParams}
                onChangeText={setNewElectroParams}
              />
              
              {/* Duration, Frequency, Area Row */}
              <View style={styles.exerciseFormRow}>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Duration</Text>
                  <TextInput
                    style={styles.smallInput}
                    placeholder="15 min"
                    placeholderTextColor={theme.colors.textMuted}
                    value={newElectroDuration}
                    onChangeText={setNewElectroDuration}
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Frequency</Text>
                  <TextInput
                    style={styles.smallInput}
                    placeholder="Daily"
                    placeholderTextColor={theme.colors.textMuted}
                    value={newElectroFrequency}
                    onChangeText={setNewElectroFrequency}
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Area</Text>
                  <TextInput
                    style={styles.smallInput}
                    placeholder="Lower back"
                    placeholderTextColor={theme.colors.textMuted}
                    value={newElectroArea}
                    onChangeText={setNewElectroArea}
                  />
                </View>
              </View>
              
              <TextInput
                style={styles.input}
                placeholder="Notes (optional)"
                placeholderTextColor={theme.colors.textMuted}
                value={newElectroNotes}
                onChangeText={setNewElectroNotes}
              />
              
              <TouchableOpacity style={styles.addElectroButton} onPress={addElectrotherapy}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.addElectroButtonText}>Add Electrotherapy</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Additional Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Additional Instructions</Text>
            <TextInput
              style={[styles.input, { minHeight: 100 }]}
              placeholder="Any special instructions, precautions, or notes for the patient..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              value={additionalInstructions}
              onChangeText={setAdditionalInstructions}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.aiButton, generating && styles.buttonDisabled]}
              onPress={generateAIDescriptions}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator color={theme.colors.textPrimary} />
              ) : (
                <>
                  <MaterialCommunityIcons name="robot" size={24} color={theme.colors.textPrimary} />
                  <Text style={styles.aiButtonText}>Generate AI Descriptions</Text>
                </>
              )}
            </TouchableOpacity>

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
                  <Text style={styles.pdfButtonText}>Generate & Share PDF</Text>
                </>
              )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  selectorText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  selectorList: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  selectorOption: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  selectorOptionSelected: {
    backgroundColor: theme.colors.accent + '20',
  },
  selectorOptionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  selectorOptionTextSelected: {
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.semibold,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  // Nutrition
  nutritionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  nutritionInput: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.sm,
  },
  nutritionFrequency: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
  },
  addButtonText: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  // Exercise
  exerciseCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  exerciseName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  exerciseParams: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  paramBadge: {
    backgroundColor: theme.colors.accent + '20',
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  paramText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.medium,
  },
  aiDescriptionBox: {
    backgroundColor: theme.colors.warning + '15',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },
  aiDescriptionLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.warning,
    fontWeight: theme.fontWeight.bold,
    marginBottom: 4,
  },
  aiDescriptionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  // New Exercise Form
  newExerciseForm: {
    backgroundColor: theme.colors.accent + '10',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.accent + '30',
  },
  formLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
    marginBottom: theme.spacing.sm,
  },
  exerciseFormRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginVertical: theme.spacing.sm,
  },
  formField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  smallInput: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  addExerciseButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  // Action Buttons
  actionButtons: {
    gap: theme.spacing.md,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9C27B0',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  aiButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  pdfButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  // Electrotherapy Styles
  electroCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.accent + '40',
  },
  electroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  electroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  electroName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
  },
  electroParams: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    paddingLeft: theme.spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.accent + '40',
  },
  electroDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  electroDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  electroDetailText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  electroNotes: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
  modalityList: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    maxHeight: 350,
  },
  categoryLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: 4,
    backgroundColor: theme.colors.primaryLight,
  },
  modalityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  modalityOptionSelected: {
    backgroundColor: theme.colors.accent + '20',
  },
  modalityOptionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  modalityOptionTextSelected: {
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.semibold,
  },
  addElectroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  addElectroButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: '#FFFFFF',
  },
});
