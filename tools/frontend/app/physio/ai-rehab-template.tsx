import React, { useState, useRef } from 'react';
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
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import { PaymentGateModal } from '../../src/utils/PaymentGateModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Interface definitions
interface ExerciseData {
  name: string;
  image: string;
  category: string;
  bodyPart: string;
  description: string;
  instructions: string[];
  sets: string;
  reps: string;
  hold: string;
  frequency: string;
  dos: string[];
  donts: string[];
}

interface SelectedExercise extends ExerciseData {
  customSets?: string;
  customReps?: string;
  customHold?: string;
  customNotes?: string;
}

type TabType = 'ai-template' | 'quick-convert';

// Comprehensive Exercise Database with Images, Instructions, Do's and Don'ts
const EXERCISE_DATABASE: Record<string, ExerciseData> = {
  // NECK EXERCISES
  'neck circles': {
    name: 'Neck Circles',
    image: 'https://images.pexels.com/photos/5473182/pexels-photo-5473182.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Mobility',
    bodyPart: 'Neck',
    description: 'Gentle circular movements of the neck to improve cervical mobility and reduce stiffness.',
    instructions: [
      'Sit or stand with good posture, shoulders relaxed',
      'Slowly drop your chin towards your chest',
      'Roll your head to the right, bringing ear towards shoulder',
      'Continue rolling head back, looking up at ceiling',
      'Roll head to left shoulder, then back to start',
      'Repeat in opposite direction',
    ],
    sets: '2-3',
    reps: '10 each direction',
    hold: '-',
    frequency: '2-3 times daily',
    dos: [
      'Move slowly and controlled',
      'Keep shoulders relaxed and down',
      'Breathe normally throughout',
      'Stop if you feel dizziness',
    ],
    donts: [
      'Do not force the movement',
      'Avoid jerky or fast movements',
      'Do not push through sharp pain',
      'Avoid if you have cervical instability',
    ],
  },
  'chin tucks': {
    name: 'Chin Tucks',
    image: 'https://images.pexels.com/photos/5473186/pexels-photo-5473186.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Strengthening',
    bodyPart: 'Neck',
    description: 'Strengthens deep neck flexors and corrects forward head posture.',
    instructions: [
      'Sit or stand with back against wall',
      'Keep eyes looking straight ahead',
      'Gently draw chin straight back (make double chin)',
      'Feel stretch at base of skull',
      'Hold position, then relax',
    ],
    sets: '3',
    reps: '10-15',
    hold: '5-10 seconds',
    frequency: 'Every hour during desk work',
    dos: [
      'Keep eyes level - don\'t look down',
      'Maintain good posture',
      'Feel stretch at back of neck',
      'Can do against wall for feedback',
    ],
    donts: [
      'Do not tilt head up or down',
      'Avoid jutting jaw forward',
      'Do not strain neck muscles',
      'Avoid holding breath',
    ],
  },
  'upper trap stretch': {
    name: 'Upper Trapezius Stretch',
    image: 'https://images.pexels.com/photos/4498574/pexels-photo-4498574.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Stretching',
    bodyPart: 'Neck/Shoulder',
    description: 'Stretches the upper trapezius muscle to relieve neck and shoulder tension.',
    instructions: [
      'Sit with good posture on a chair',
      'Hold onto chair seat with right hand',
      'Tilt head to left, bringing left ear towards left shoulder',
      'Use left hand to gently increase stretch',
      'Keep shoulders level and relaxed',
      'Hold stretch, then repeat on other side',
    ],
    sets: '2-3',
    reps: '3 each side',
    hold: '30 seconds',
    frequency: '2-3 times daily',
    dos: [
      'Keep opposite shoulder down',
      'Breathe deeply during stretch',
      'Feel stretch along neck/shoulder',
      'Progress gradually',
    ],
    donts: [
      'Do not pull aggressively',
      'Avoid rotating head during stretch',
      'Do not hunch shoulders',
      'Avoid bouncing movements',
    ],
  },
  // SHOULDER EXERCISES
  'shoulder circles': {
    name: 'Shoulder Circles',
    image: 'https://images.pexels.com/photos/5473177/pexels-photo-5473177.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Mobility',
    bodyPart: 'Shoulder',
    description: 'Improves shoulder mobility and warms up the shoulder joint.',
    instructions: [
      'Stand with arms relaxed at sides',
      'Slowly lift shoulders towards ears',
      'Roll shoulders back and down',
      'Continue in circular motion',
      'Reverse direction after set',
    ],
    sets: '2',
    reps: '15 each direction',
    hold: '-',
    frequency: 'Before exercise or hourly',
    dos: [
      'Make large, full circles',
      'Move slowly and deliberately',
      'Keep neck relaxed',
      'Breathe naturally',
    ],
    donts: [
      'Do not shrug aggressively',
      'Avoid tensing neck muscles',
      'Do not rush movements',
      'Avoid if acute shoulder pain',
    ],
  },
  'wall slides': {
    name: 'Wall Slides',
    image: 'https://images.pexels.com/photos/6456141/pexels-photo-6456141.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Mobility/Strengthening',
    bodyPart: 'Shoulder',
    description: 'Improves shoulder flexion and scapular control against gravity.',
    instructions: [
      'Stand with back flat against wall',
      'Arms at sides, elbows bent 90 degrees',
      'Press forearms and back of hands to wall',
      'Slowly slide arms up wall above head',
      'Maintain contact with wall throughout',
      'Slide back down to starting position',
    ],
    sets: '3',
    reps: '10-15',
    hold: '2 seconds at top',
    frequency: 'Daily',
    dos: [
      'Keep back flat against wall',
      'Maintain forearm contact',
      'Move through pain-free range',
      'Squeeze shoulder blades together',
    ],
    donts: [
      'Do not arch lower back',
      'Avoid losing wall contact',
      'Do not shrug shoulders',
      'Avoid pushing through pain',
    ],
  },
  'pendulum exercise': {
    name: 'Pendulum Exercise (Codman\'s)',
    image: 'https://images.pexels.com/photos/6456151/pexels-photo-6456151.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Mobility',
    bodyPart: 'Shoulder',
    description: 'Gentle shoulder mobilization using gravity and body momentum.',
    instructions: [
      'Stand beside table, bend forward at waist',
      'Support yourself with unaffected arm on table',
      'Let affected arm hang straight down relaxed',
      'Gently rock body to swing arm in circles',
      'Let momentum move arm - do not use shoulder muscles',
      'Perform circles, forward/back, and side to side',
    ],
    sets: '2-3',
    reps: '20 each direction',
    hold: '-',
    frequency: '3-4 times daily',
    dos: [
      'Keep arm completely relaxed',
      'Use body to generate movement',
      'Start with small circles, progress larger',
      'Can hold light weight to assist',
    ],
    donts: [
      'Do not actively move shoulder',
      'Avoid forcing range of motion',
      'Do not hold breath',
      'Avoid if it increases pain significantly',
    ],
  },
  // BACK EXERCISES
  'cat cow stretch': {
    name: 'Cat-Cow Stretch',
    image: 'https://images.pexels.com/photos/4056723/pexels-photo-4056723.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Mobility/Stretching',
    bodyPart: 'Spine',
    description: 'Mobilizes the entire spine and relieves back stiffness.',
    instructions: [
      'Start on hands and knees (tabletop position)',
      'Hands under shoulders, knees under hips',
      'COW: Inhale, drop belly, lift head and tailbone',
      'CAT: Exhale, round spine up, tuck chin and pelvis',
      'Flow smoothly between positions with breath',
    ],
    sets: '2-3',
    reps: '10-15 cycles',
    hold: '2-3 seconds each position',
    frequency: 'Morning and evening',
    dos: [
      'Move with your breath',
      'Feel movement through entire spine',
      'Keep arms straight but not locked',
      'Maintain neutral wrist position',
    ],
    donts: [
      'Do not force extreme ranges',
      'Avoid jerky movements',
      'Do not hold breath',
      'Avoid if acute disc herniation',
    ],
  },
  'bird dog': {
    name: 'Bird Dog Exercise',
    image: 'https://images.pexels.com/photos/6456300/pexels-photo-6456300.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Strengthening',
    bodyPart: 'Core/Back',
    description: 'Strengthens core stabilizers and improves balance and coordination.',
    instructions: [
      'Start on hands and knees (tabletop)',
      'Engage core - draw belly button to spine',
      'Slowly extend right arm forward',
      'Simultaneously extend left leg back',
      'Keep hips and shoulders level',
      'Hold briefly, return to start',
      'Repeat with opposite arm and leg',
    ],
    sets: '3',
    reps: '10 each side',
    hold: '3-5 seconds',
    frequency: 'Daily',
    dos: [
      'Keep spine neutral throughout',
      'Move slowly and controlled',
      'Engage core before moving limbs',
      'Keep head aligned with spine',
    ],
    donts: [
      'Do not let hips rotate or drop',
      'Avoid arching lower back',
      'Do not lift limbs too high',
      'Avoid rushing repetitions',
    ],
  },
  'glute bridge': {
    name: 'Glute Bridge',
    image: 'https://images.pexels.com/photos/6456270/pexels-photo-6456270.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Strengthening',
    bodyPart: 'Glutes/Back',
    description: 'Strengthens gluteal muscles and stabilizes the pelvis and lower back.',
    instructions: [
      'Lie on back, knees bent, feet flat on floor',
      'Feet hip-width apart, arms at sides',
      'Engage core and squeeze glutes',
      'Lift hips until body forms straight line from knees to shoulders',
      'Hold at top, then lower slowly',
    ],
    sets: '3',
    reps: '12-15',
    hold: '2-3 seconds at top',
    frequency: 'Daily',
    dos: [
      'Push through heels',
      'Squeeze glutes at top',
      'Keep core engaged throughout',
      'Lower with control',
    ],
    donts: [
      'Do not hyperextend lower back',
      'Avoid pushing through toes',
      'Do not let knees cave in',
      'Avoid holding breath',
    ],
  },
  'dead bug': {
    name: 'Dead Bug Exercise',
    image: 'https://images.pexels.com/photos/6456258/pexels-photo-6456258.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Strengthening',
    bodyPart: 'Core',
    description: 'Core stabilization exercise that teaches proper spinal control.',
    instructions: [
      'Lie on back, arms extended to ceiling',
      'Bring legs up with hips and knees at 90 degrees',
      'Press lower back into floor',
      'Slowly lower opposite arm and leg',
      'Keep lower back pressed into floor',
      'Return to start, repeat other side',
    ],
    sets: '3',
    reps: '10 each side',
    hold: '2 seconds',
    frequency: 'Daily',
    dos: [
      'Keep lower back pressed to floor',
      'Move slowly and controlled',
      'Breathe normally',
      'Only go as far as control allows',
    ],
    donts: [
      'Do not let back arch',
      'Avoid moving too quickly',
      'Do not hold breath',
      'Avoid using momentum',
    ],
  },
  // HIP EXERCISES
  'hip flexor stretch': {
    name: 'Hip Flexor Stretch (Kneeling)',
    image: 'https://images.pexels.com/photos/6456150/pexels-photo-6456150.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Stretching',
    bodyPart: 'Hip',
    description: 'Stretches the hip flexor muscles which are often tight from sitting.',
    instructions: [
      'Kneel on right knee, left foot forward (half-kneeling)',
      'Keep torso upright',
      'Tuck pelvis under (posterior pelvic tilt)',
      'Shift weight forward until stretch felt in right hip',
      'Keep chest lifted',
      'Hold, then switch sides',
    ],
    sets: '2-3',
    reps: '3 each side',
    hold: '30-60 seconds',
    frequency: '2-3 times daily',
    dos: [
      'Keep torso upright',
      'Tuck pelvis under for more stretch',
      'Engage glute on stretching side',
      'Breathe deeply during stretch',
    ],
    donts: [
      'Do not lean forward excessively',
      'Avoid arching lower back',
      'Do not bounce',
      'Avoid knee pain - use padding',
    ],
  },
  'clamshells': {
    name: 'Clamshell Exercise',
    image: 'https://images.pexels.com/photos/6456289/pexels-photo-6456289.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Strengthening',
    bodyPart: 'Hip',
    description: 'Strengthens hip abductors and external rotators for hip stability.',
    instructions: [
      'Lie on side with hips and knees bent 45 degrees',
      'Keep feet together and stacked',
      'Lift top knee up while keeping feet together',
      'Open like a clamshell without rolling back',
      'Lower slowly back to start',
    ],
    sets: '3',
    reps: '15-20 each side',
    hold: '2 seconds at top',
    frequency: 'Daily',
    dos: [
      'Keep feet together throughout',
      'Move from hip, not waist',
      'Control the lowering phase',
      'Can add resistance band for progression',
    ],
    donts: [
      'Do not roll pelvis back',
      'Avoid rushing repetitions',
      'Do not use momentum',
      'Avoid hiking hip',
    ],
  },
  'pigeon stretch': {
    name: 'Pigeon Stretch',
    image: 'https://images.pexels.com/photos/6456157/pexels-photo-6456157.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Stretching',
    bodyPart: 'Hip/Glute',
    description: 'Deep stretch for piriformis and hip external rotators.',
    instructions: [
      'Start in tabletop position',
      'Bring right knee forward behind right wrist',
      'Extend left leg straight back',
      'Square hips towards floor',
      'Walk hands forward to deepen stretch',
      'Hold, then switch sides',
    ],
    sets: '2',
    reps: '2-3 each side',
    hold: '60-90 seconds',
    frequency: 'Daily',
    dos: [
      'Keep hips square to floor',
      'Use props under hip if needed',
      'Breathe deeply into stretch',
      'Progress depth gradually',
    ],
    donts: [
      'Do not force depth',
      'Avoid if knee pain occurs',
      'Do not let hip twist up',
      'Avoid bouncing',
    ],
  },
  // KNEE EXERCISES
  'quad sets': {
    name: 'Quad Sets (Isometric)',
    image: 'https://images.pexels.com/photos/6456231/pexels-photo-6456231.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Strengthening',
    bodyPart: 'Knee/Quadriceps',
    description: 'Isometric quadriceps strengthening fundamental for knee rehabilitation.',
    instructions: [
      'Sit or lie with leg straight',
      'Place small towel roll under knee',
      'Tighten thigh muscle, pushing knee into towel',
      'Try to straighten knee completely',
      'Hold contraction, then relax',
    ],
    sets: '3',
    reps: '10-15',
    hold: '5-10 seconds',
    frequency: 'Multiple times daily',
    dos: [
      'Contract muscle firmly',
      'See/feel kneecap move up',
      'Keep ankle relaxed',
      'Progress hold time',
    ],
    donts: [
      'Do not hold breath',
      'Avoid contracting calf',
      'Do not lift leg',
      'Avoid pain',
    ],
  },
  'straight leg raise': {
    name: 'Straight Leg Raise',
    image: 'https://images.pexels.com/photos/6456215/pexels-photo-6456215.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Strengthening',
    bodyPart: 'Hip/Quadriceps',
    description: 'Strengthens hip flexors and quadriceps while protecting the knee.',
    instructions: [
      'Lie on back, one knee bent, other leg straight',
      'Tighten thigh of straight leg (quad set)',
      'Keeping knee straight, lift leg to height of bent knee',
      'Hold briefly at top',
      'Lower slowly with control',
    ],
    sets: '3',
    reps: '10-15 each leg',
    hold: '2 seconds at top',
    frequency: 'Daily',
    dos: [
      'Lock knee before lifting',
      'Keep toes pointed up',
      'Lift smoothly',
      'Control the lowering',
    ],
    donts: [
      'Do not bend the knee',
      'Avoid arching back',
      'Do not drop leg quickly',
      'Avoid if increases knee pain',
    ],
  },
  'hamstring curl': {
    name: 'Hamstring Curl (Standing)',
    image: 'https://images.pexels.com/photos/6456247/pexels-photo-6456247.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Strengthening',
    bodyPart: 'Hamstrings',
    description: 'Strengthens the hamstring muscles at the back of the thigh.',
    instructions: [
      'Stand holding onto chair or wall for balance',
      'Shift weight to left leg',
      'Bend right knee, bringing heel towards buttock',
      'Keep thighs parallel',
      'Lower slowly back down',
      'Complete reps, then switch legs',
    ],
    sets: '3',
    reps: '12-15 each leg',
    hold: '1-2 seconds',
    frequency: 'Daily',
    dos: [
      'Keep knees together',
      'Move through full range',
      'Control the movement',
      'Can add ankle weight',
    ],
    donts: [
      'Do not swing leg',
      'Avoid arching back',
      'Do not lean forward',
      'Avoid locking standing knee',
    ],
  },
  // ANKLE EXERCISES
  'ankle circles': {
    name: 'Ankle Circles',
    image: 'https://images.pexels.com/photos/6456203/pexels-photo-6456203.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Mobility',
    bodyPart: 'Ankle',
    description: 'Improves ankle mobility and circulation.',
    instructions: [
      'Sit with leg extended or elevated',
      'Slowly rotate foot in circles',
      'Make circles as large as possible',
      'Complete circles in one direction',
      'Reverse and repeat',
    ],
    sets: '2',
    reps: '15-20 each direction',
    hold: '-',
    frequency: 'Several times daily',
    dos: [
      'Move through full range',
      'Keep leg still - move only ankle',
      'Go slowly for better control',
      'Can do elevated to reduce swelling',
    ],
    donts: [
      'Do not rush movements',
      'Avoid if acute injury',
      'Do not force painful ranges',
      'Avoid moving entire leg',
    ],
  },
  'calf raises': {
    name: 'Calf Raises',
    image: 'https://images.pexels.com/photos/6456199/pexels-photo-6456199.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Strengthening',
    bodyPart: 'Calf/Ankle',
    description: 'Strengthens calf muscles and improves ankle stability.',
    instructions: [
      'Stand with feet hip-width apart',
      'Hold wall or chair for balance',
      'Rise up onto toes as high as possible',
      'Hold briefly at top',
      'Lower slowly with control',
    ],
    sets: '3',
    reps: '15-20',
    hold: '1-2 seconds',
    frequency: 'Daily',
    dos: [
      'Rise as high as possible',
      'Keep knees straight',
      'Lower slowly (3 seconds)',
      'Can progress to single leg',
    ],
    donts: [
      'Do not bounce',
      'Avoid rolling ankles out',
      'Do not rush down',
      'Avoid if Achilles pain',
    ],
  },
  'toe raises': {
    name: 'Toe Raises (Tibialis Anterior)',
    image: 'https://images.pexels.com/photos/6456195/pexels-photo-6456195.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Strengthening',
    bodyPart: 'Shin/Ankle',
    description: 'Strengthens muscles at front of shin for ankle dorsiflexion.',
    instructions: [
      'Stand with back against wall',
      'Feet about 12 inches from wall',
      'Keeping heels on floor, lift toes up',
      'Hold briefly at top',
      'Lower toes back down',
    ],
    sets: '3',
    reps: '15-20',
    hold: '1-2 seconds',
    frequency: 'Daily',
    dos: [
      'Keep heels on floor',
      'Lift toes as high as possible',
      'Control the movement',
      'Feel front of shin working',
    ],
    donts: [
      'Do not lean forward',
      'Avoid lifting heels',
      'Do not rush',
      'Avoid if shin splints acute',
    ],
  },
  // GENERAL EXERCISES
  'squats': {
    name: 'Bodyweight Squats',
    image: 'https://images.pexels.com/photos/6456262/pexels-photo-6456262.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Strengthening',
    bodyPart: 'Lower Body',
    description: 'Functional exercise strengthening quads, glutes, and core.',
    instructions: [
      'Stand with feet shoulder-width apart',
      'Keep chest up and core engaged',
      'Push hips back as if sitting in chair',
      'Bend knees and lower body',
      'Go as deep as comfortable with good form',
      'Push through heels to stand',
    ],
    sets: '3',
    reps: '12-15',
    hold: '-',
    frequency: '3-4 times per week',
    dos: [
      'Keep knees tracking over toes',
      'Maintain neutral spine',
      'Push through heels',
      'Breathe out as you stand',
    ],
    donts: [
      'Do not let knees cave in',
      'Avoid rounding lower back',
      'Do not rise onto toes',
      'Avoid going too deep initially',
    ],
  },
  'lunges': {
    name: 'Forward Lunges',
    image: 'https://images.pexels.com/photos/6456275/pexels-photo-6456275.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Strengthening',
    bodyPart: 'Lower Body',
    description: 'Single leg exercise for strength, balance, and coordination.',
    instructions: [
      'Stand tall with feet hip-width apart',
      'Step forward with right leg',
      'Lower body until both knees at 90 degrees',
      'Front knee over ankle, not past toes',
      'Push through front heel to return to start',
      'Alternate legs',
    ],
    sets: '3',
    reps: '10 each leg',
    hold: '-',
    frequency: '3-4 times per week',
    dos: [
      'Keep torso upright',
      'Step far enough forward',
      'Control the descent',
      'Push through front heel',
    ],
    donts: [
      'Do not let knee go past toes',
      'Avoid leaning forward',
      'Do not let back knee slam floor',
      'Avoid if significant knee pain',
    ],
  },
  'plank': {
    name: 'Plank Hold',
    image: 'https://images.pexels.com/photos/6456284/pexels-photo-6456284.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Strengthening',
    bodyPart: 'Core',
    description: 'Isometric core exercise for total core stabilization.',
    instructions: [
      'Start in push-up position or on forearms',
      'Keep body in straight line from head to heels',
      'Engage core - draw belly button to spine',
      'Keep hips level - not too high or low',
      'Hold position while breathing normally',
    ],
    sets: '3',
    reps: '1',
    hold: '20-60 seconds',
    frequency: 'Daily',
    dos: [
      'Keep body in straight line',
      'Engage core throughout',
      'Breathe normally',
      'Start with shorter holds',
    ],
    donts: [
      'Do not let hips sag',
      'Avoid raising buttocks too high',
      'Do not hold breath',
      'Avoid neck strain - look down',
    ],
  },
};

// More exercise aliases for matching
const EXERCISE_ALIASES: Record<string, string> = {
  'neck rotation': 'neck circles',
  'chin retraction': 'chin tucks',
  'trap stretch': 'upper trap stretch',
  'shoulder rotation': 'shoulder circles',
  'arm circles': 'shoulder circles',
  'wall angels': 'wall slides',
  'codmans': 'pendulum exercise',
  'codman': 'pendulum exercise',
  'cat camel': 'cat cow stretch',
  'cat-camel': 'cat cow stretch',
  'quadruped': 'bird dog',
  'bridge': 'glute bridge',
  'hip bridge': 'glute bridge',
  'dead bugs': 'dead bug',
  'psoas stretch': 'hip flexor stretch',
  'iliopsoas stretch': 'hip flexor stretch',
  'clam': 'clamshells',
  'clamshell': 'clamshells',
  'piriformis stretch': 'pigeon stretch',
  'quad set': 'quad sets',
  'quadricep sets': 'quad sets',
  'slr': 'straight leg raise',
  'leg raise': 'straight leg raise',
  'hamstring curls': 'hamstring curl',
  'leg curl': 'hamstring curl',
  'ankle rotation': 'ankle circles',
  'heel raises': 'calf raises',
  'calf raise': 'calf raises',
  'toe raise': 'toe raises',
  'dorsiflexion': 'toe raises',
  'squat': 'squats',
  'lunge': 'lunges',
  'forward lunge': 'lunges',
  'planks': 'plank',
  'front plank': 'plank',
};

// AI Template Conditions
const AI_CONDITIONS = [
  { id: 'frozen_shoulder', name: 'Frozen Shoulder', icon: 'arm-flex' },
  { id: 'rotator_cuff', name: 'Rotator Cuff Injury', icon: 'arm-flex-outline' },
  { id: 'lower_back_pain', name: 'Lower Back Pain', icon: 'human-male' },
  { id: 'sciatica', name: 'Sciatica', icon: 'flash' },
  { id: 'neck_pain', name: 'Neck Pain/Cervicalgia', icon: 'head' },
  { id: 'knee_osteoarthritis', name: 'Knee Osteoarthritis', icon: 'walk' },
  { id: 'acl_rehab', name: 'ACL Rehabilitation', icon: 'bandage' },
  { id: 'ankle_sprain', name: 'Ankle Sprain', icon: 'shoe-print' },
  { id: 'postural_correction', name: 'Postural Correction', icon: 'human' },
  { id: 'hip_replacement', name: 'Hip Replacement Rehab', icon: 'human-handsdown' },
];

export default function AIRehabTemplateScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('ai-template');
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // AI Template state
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('');
  const [generatedExercises, setGeneratedExercises] = useState<SelectedExercise[]>([]);
  
  // Quick Convert state
  const [exerciseText, setExerciseText] = useState('');
  const [convertedExercises, setConvertedExercises] = useState<SelectedExercise[]>([]);
  const [showExerciseDetail, setShowExerciseDetail] = useState(false);
  const [selectedExerciseDetail, setSelectedExerciseDetail] = useState<SelectedExercise | null>(null);

  // Program Settings State - moved to top
  const [programName, setProgramName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [frequency, setFrequency] = useState(['Monday', 'Wednesday', 'Friday']);
  const [sessionsPerDay, setSessionsPerDay] = useState('2');
  const [showProgramSettings, setShowProgramSettings] = useState(false);

  const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const toggleDay = (day: string) => {
    setFrequency(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const findExercise = (name: string): ExerciseData | null => {
    const normalizedName = name.toLowerCase().trim();
    
    // Direct match
    if (EXERCISE_DATABASE[normalizedName]) {
      return EXERCISE_DATABASE[normalizedName];
    }
    
    // Check aliases
    if (EXERCISE_ALIASES[normalizedName]) {
      return EXERCISE_DATABASE[EXERCISE_ALIASES[normalizedName]];
    }
    
    // Partial match
    for (const [key, exercise] of Object.entries(EXERCISE_DATABASE)) {
      if (key.includes(normalizedName) || normalizedName.includes(key)) {
        return exercise;
      }
      if (exercise.name.toLowerCase().includes(normalizedName)) {
        return exercise;
      }
    }
    
    return null;
  };

  const generateAITemplate = () => {
    if (!selectedCondition) {
      Alert.alert('Select Condition', 'Please select a condition to generate template');
      return;
    }

    setLoading(true);
    
    // Simulated AI generation based on condition
    setTimeout(() => {
      let exercises: SelectedExercise[] = [];
      
      const getExercise = (key: string, customProps: Partial<SelectedExercise> = {}): SelectedExercise | null => {
        const exercise = EXERCISE_DATABASE[key];
        if (!exercise) {
          console.warn(`Exercise not found: ${key}`);
          return null;
        }
        return { ...exercise, ...customProps };
      };
      
      switch (selectedCondition) {
        case 'frozen_shoulder':
          exercises = [
            getExercise('pendulum exercise', { customNotes: 'Start with this gentle exercise' }),
            getExercise('wall slides', { customReps: '8-10', customNotes: 'Progress as tolerated' }),
            getExercise('shoulder circles', { customSets: '3', customNotes: 'Warm up exercise' }),
          ].filter((e): e is SelectedExercise => e !== null);
          break;
        case 'lower_back_pain':
          exercises = [
            getExercise('cat cow stretch', { customNotes: 'Morning mobility routine' }),
            getExercise('bird dog', { customReps: '8 each side', customNotes: 'Core stability' }),
            getExercise('glute bridge', { customNotes: 'Glute activation' }),
            getExercise('dead bug', { customSets: '2', customNotes: 'Progress gradually' }),
          ].filter((e): e is SelectedExercise => e !== null);
          break;
        case 'sciatica':
          exercises = [
            getExercise('pigeon stretch', { customNotes: 'Sciatic nerve relief' }),
            getExercise('hip flexor stretch', { customNotes: 'Hip mobility' }),
            getExercise('cat cow stretch', { customNotes: 'Spinal mobility' }),
            getExercise('glute bridge', { customNotes: 'Glute activation' }),
          ].filter((e): e is SelectedExercise => e !== null);
          break;
        case 'rotator_cuff':
          exercises = [
            getExercise('pendulum exercise', { customNotes: 'Gentle warm-up' }),
            getExercise('wall slides', { customNotes: 'Scapular control' }),
            getExercise('shoulder circles', { customNotes: 'ROM maintenance' }),
          ].filter((e): e is SelectedExercise => e !== null);
          break;
        case 'neck_pain':
          exercises = [
            getExercise('chin tucks', { customNotes: 'Do at desk hourly' }),
            getExercise('upper trap stretch', { customNotes: 'Tension relief' }),
            getExercise('neck circles', { customSets: '2', customReps: '5 each way', customNotes: 'Gentle only' }),
          ].filter((e): e is SelectedExercise => e !== null);
          break;
        case 'knee_osteoarthritis':
          exercises = [
            getExercise('quad sets', { customNotes: 'Foundation exercise' }),
            getExercise('straight leg raise', { customReps: '10', customNotes: 'Quad strengthening' }),
            getExercise('hamstring curl', { customNotes: 'Balance quad work' }),
            getExercise('calf raises', { customSets: '2', customNotes: 'Lower leg strength' }),
          ].filter((e): e is SelectedExercise => e !== null);
          break;
        case 'acl_rehab':
          exercises = [
            getExercise('quad sets', { customNotes: 'Start immediately post-op' }),
            getExercise('straight leg raise', { customNotes: 'Once quad control achieved' }),
            getExercise('glute bridge', { customNotes: 'Hip strengthening' }),
            getExercise('calf raises', { customNotes: 'Maintain calf strength' }),
          ].filter((e): e is SelectedExercise => e !== null);
          break;
        case 'ankle_sprain':
          exercises = [
            getExercise('ankle circles', { customNotes: 'Early mobility' }),
            getExercise('calf raises', { customNotes: 'Strengthen after pain reduces' }),
            getExercise('toe raises', { customNotes: 'Anterior tibialis' }),
          ].filter((e): e is SelectedExercise => e !== null);
          break;
        case 'postural_correction':
          exercises = [
            getExercise('chin tucks', { customNotes: 'Neck posture' }),
            getExercise('cat cow stretch', { customNotes: 'Spine mobility' }),
            getExercise('plank', { customNotes: 'Core stability' }),
            getExercise('glute bridge', { customNotes: 'Hip activation' }),
          ].filter((e): e is SelectedExercise => e !== null);
          break;
        case 'hip_replacement':
          exercises = [
            getExercise('glute bridge', { customNotes: 'Post-op hip strengthening' }),
            getExercise('quad sets', { customNotes: 'Quad maintenance' }),
            getExercise('straight leg raise', { customNotes: 'After approval from surgeon' }),
            getExercise('calf raises', { customNotes: 'General leg strength' }),
          ].filter((e): e is SelectedExercise => e !== null);
          break;
        default:
          exercises = [
            getExercise('cat cow stretch'),
            getExercise('glute bridge'),
            getExercise('plank'),
          ].filter((e): e is SelectedExercise => e !== null);
      }
      
      console.log('Generated exercises:', exercises.length, exercises.map(e => e.name));
      setGeneratedExercises(exercises);
      setLoading(false);
    }, 1500);
  };

  const convertExerciseNames = () => {
    if (!exerciseText.trim()) {
      Alert.alert('Enter Exercises', 'Please enter exercise names to convert');
      return;
    }

    setLoading(true);
    
    const lines = exerciseText.split('\n').filter(line => line.trim());
    const converted: SelectedExercise[] = [];
    const notFound: string[] = [];
    
    for (const line of lines) {
      const exercise = findExercise(line);
      if (exercise) {
        converted.push({ ...exercise });
      } else {
        notFound.push(line);
      }
    }
    
    setConvertedExercises(converted);
    setLoading(false);
    
    if (notFound.length > 0) {
      Alert.alert(
        'Some Exercises Not Found',
        `Could not find images for:\n${notFound.join('\n')}\n\nThe rest have been converted.`
      );
    }
  };

  const generatePDF = async (exercises: SelectedExercise[], title: string) => {
    setShowPaymentModal(true);
  };

  const createAndSharePDF = async (exercises: SelectedExercise[], title: string) => {
    setLoading(true);
    
    try {
      const currentDate = new Date().toLocaleDateString();
      const conditionForPDF = selectedCondition ? 
        AI_CONDITIONS.find(c => c.id === selectedCondition)?.name : 'General Rehabilitation';
      const programTitle = programName || `${conditionForPDF} Program`;
      const physioPhone = currentUser?.phone || '8103277774';
      
      // Program Overview Page - Exercise List Summary (first page of MoveHealth style)
      const exerciseListHtml = exercises.map((ex, i) => `
        <div class="exercise-list-item">
          <div class="exercise-list-number">${i + 1}</div>
          <div class="exercise-list-content">
            <div class="exercise-list-name">${ex.name}</div>
            <div class="exercise-list-params">${ex.customReps || ex.reps}${ex.hold !== '-' ? ` • ${ex.customHold || ex.hold} rest` : ''} • ${ex.customSets || ex.sets} sets${ex.bodyPart === 'Shoulder' || ex.name.toLowerCase().includes('band') ? ' • Yellow exercise band' : ''}</div>
          </div>
        </div>
      `).join('');

      // Exercise Detail Cards - 2-column grid layout (MoveHealth App style)
      const exerciseCardsHtml = exercises.map((ex, i) => `
        <div class="exercise-card">
          <div class="card-header">
            <span class="card-number">${i + 1}</span>
            <div class="card-title-section">
              <div class="card-title">${ex.name}</div>
              <div class="card-params">${ex.customReps || ex.reps} • ${ex.customHold || ex.hold !== '-' ? ex.hold + ' rest' : '60 seconds rest'} • ${ex.customSets || ex.sets} sets${ex.bodyPart === 'Shoulder' || ex.name.toLowerCase().includes('band') ? ' • Yellow exercise band' : ''}</div>
            </div>
          </div>
          <div class="card-image-container">
            <img src="${ex.image}" alt="${ex.name}" class="card-image" onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'height:180px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#999;\\'>Exercise Image</div>'"/>
          </div>
          <div class="card-body">
            <div class="how-to-perform">How to perform</div>
            <ol class="instructions-list">
              ${ex.instructions.slice(0, 5).map(inst => `<li>${inst}</li>`).join('')}
            </ol>
          </div>
        </div>
      `).join('');

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${programTitle}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.4; background: #fff; font-size: 11px; }
    
    /* Header Bar - MoveHealth Style */
    .header-bar { background: linear-gradient(90deg, #666 0%, #888 100%); color: white; padding: 8px 15px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 0; }
    .header-left { display: flex; align-items: center; gap: 5px; }
    .header-logo { font-weight: bold; font-size: 14px; }
    .header-logo span { color: #FF5722; }
    .header-right { text-align: right; font-size: 11px; }
    .header-right-name { font-weight: bold; }
    
    /* Orange Divider Line */
    .orange-divider { height: 4px; background: #FF5722; margin-bottom: 20px; }
    
    /* Program Overview Section */
    .program-overview { padding: 20px 15px; page-break-after: always; }
    .program-label { font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 2px; }
    .program-name { font-size: 28px; font-weight: bold; color: #333; margin-bottom: 15px; }
    
    .program-meta { display: flex; gap: 40px; margin-bottom: 20px; border-bottom: 1px solid #e0e0e0; padding-bottom: 15px; }
    .meta-section { }
    .meta-label { font-size: 10px; color: #666; text-transform: uppercase; }
    .meta-value { font-size: 13px; font-weight: bold; color: #333; margin-top: 2px; }
    
    /* Exercise Count */
    .exercise-count { font-size: 13px; color: #333; margin-bottom: 12px; border-bottom: 1px solid #FF5722; padding-bottom: 8px; }
    
    /* Exercise List on Overview Page */
    .exercise-list-item { display: flex; align-items: center; background: #f8f8f8; border-radius: 8px; padding: 12px; margin-bottom: 8px; border: 1px solid #e8e8e8; }
    .exercise-list-number { background: #FF5722; color: white; width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; margin-right: 12px; flex-shrink: 0; }
    .exercise-list-content { flex: 1; }
    .exercise-list-name { font-weight: bold; font-size: 13px; color: #333; }
    .exercise-list-params { font-size: 11px; color: #666; margin-top: 2px; }
    
    /* Exercise Cards Page */
    .exercises-page { padding: 0; }
    .exercises-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; padding: 15px; }
    
    .exercise-card { background: #fff; border-radius: 10px; overflow: hidden; border: 1px solid #e0e0e0; page-break-inside: avoid; }
    .card-header { background: #f8f8f8; padding: 10px 12px; border-bottom: 1px solid #e8e8e8; }
    .card-number { background: #FF5722; color: white; width: 22px; height: 22px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; margin-right: 8px; vertical-align: middle; }
    .card-title-section { display: inline-block; vertical-align: middle; max-width: calc(100% - 35px); }
    .card-title { font-weight: bold; font-size: 12px; color: #1565C0; }
    .card-params { font-size: 10px; color: #666; margin-top: 2px; }
    
    .card-image-container { width: 100%; height: 160px; overflow: hidden; background: #f5f5f5; }
    .card-image { width: 100%; height: 100%; object-fit: cover; }
    
    .card-body { padding: 12px; }
    .how-to-perform { font-weight: bold; font-size: 11px; color: #333; margin-bottom: 8px; }
    .instructions-list { padding-left: 16px; font-size: 10px; color: #555; }
    .instructions-list li { margin-bottom: 4px; line-height: 1.4; }
    
    /* Footer on each page */
    .page-footer { background: linear-gradient(90deg, #666 0%, #888 100%); padding: 8px 15px; display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
    .footer-left { color: white; font-size: 12px; font-weight: bold; }
    .footer-left span { color: #FF5722; }
    .footer-right { color: white; text-align: right; font-size: 11px; }
    
    /* Page number badge */
    .page-number { position: absolute; top: 8px; left: 8px; background: #666; color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
  </style>
</head>
<body>
  <!-- PAGE 1: Program Overview -->
  <div class="header-bar">
    <div class="header-left">
      <span class="header-logo">Move<span>Health</span> App</span>
    </div>
    <div class="header-right">
      <div class="header-right-name">wba99 analys</div>
      <div>${currentUser?.name || 'Physiotherapist'} | ${physioPhone}</div>
    </div>
  </div>
  <div class="orange-divider"></div>
  
  <div class="program-overview">
    <div class="page-number" style="position:relative;display:inline-block;margin-bottom:15px;background:#666;color:white;padding:4px 8px;border-radius:4px;font-size:10px;">1</div>
    
    <div class="program-label">Program Name</div>
    <div class="program-name">${programTitle}</div>
    
    <div class="program-label">Time Period</div>
    <div class="meta-value" style="margin-bottom:15px;font-size:16px;">${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}</div>
    
    <div class="program-meta">
      <div class="meta-section">
        <div class="meta-label">How Often</div>
        <div class="meta-value">${frequency.join(', ')}</div>
      </div>
      <div class="meta-section">
        <div class="meta-label">When</div>
        <div class="meta-value">${sessionsPerDay} sessions per day</div>
      </div>
    </div>
    
    <div class="exercise-count">You have ${exercises.length} exercises</div>
    
    ${exerciseListHtml}
  </div>
  
  <div class="page-footer">
    <div class="footer-left">Move<span>Health</span> App</div>
    <div class="footer-right">
      <div>wba99 analys</div>
      <div>${currentUser?.name || 'Physiotherapist'} | ${physioPhone}</div>
    </div>
  </div>
  
  <!-- PAGE 2+: Exercise Detail Cards -->
  <div style="page-break-before: always;"></div>
  
  <div class="header-bar">
    <div class="header-left">
      <span class="header-logo">Move<span>Health</span> App</span>
    </div>
    <div class="header-right">
      <div class="header-right-name">wba99 analys</div>
      <div>${currentUser?.name || 'Physiotherapist'} | ${physioPhone}</div>
    </div>
  </div>
  <div class="orange-divider"></div>
  
  <div class="exercises-page">
    <div class="exercises-grid">
      ${exerciseCardsHtml}
    </div>
  </div>
  
  <div class="page-footer">
    <div class="footer-left">Move<span>Health</span> App</div>
    <div class="footer-right">
      <div>wba99 analys</div>
      <div>${currentUser?.name || 'Physiotherapist'} | ${physioPhone}</div>
    </div>
  </div>
  
  <!-- QR Verification Page -->
  <div style="page-break-before: always;"></div>
  <div class="header-bar">
    <div class="header-left">
      <span class="header-logo">Move<span>Health</span> App</span>
    </div>
    <div class="header-right">
      <div class="header-right-name">wba99 analys</div>
      <div>${currentUser?.name || 'Physiotherapist'} | ${physioPhone}</div>
    </div>
  </div>
  <div class="orange-divider"></div>
  
  <div style="padding: 30px; text-align: center;">
    <h2 style="color: #333; margin-bottom: 20px;">Program Verification</h2>
    <p style="color: #666; margin-bottom: 20px;">Scan to verify this exercise program</p>
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=WBA99-REHAB-${Date.now()}-${programTitle.replace(/\s/g, '-')}" width="150" height="150" style="border: 2px solid #FF5722; border-radius: 10px; padding: 10px;" />
    <p style="margin-top: 20px; font-size: 12px; color: #666;">
      <strong>Patient:</strong> ${patientName || 'Not specified'}<br>
      <strong>Prescribed:</strong> ${currentDate}<br>
      <strong>Physiotherapist:</strong> ${currentUser?.name || 'WBA99'}
    </p>
    
    <div style="margin-top: 30px; padding: 20px; background: #f5f5f5; border-radius: 10px; text-align: left;">
      <h3 style="color: #FF5722; margin-bottom: 10px;">Important Notes</h3>
      <ul style="font-size: 11px; color: #555; padding-left: 20px;">
        <li>Follow the exercise program as prescribed</li>
        <li>Stop any exercise that causes sharp pain</li>
        <li>Complete all sessions as indicated</li>
        <li>Contact your physiotherapist if symptoms worsen</li>
      </ul>
    </div>
  </div>
  
  <div class="page-footer">
    <div class="footer-left">Move<span>Health</span> App</div>
    <div class="footer-right">
      <div>wba99 analys</div>
      <div>${currentUser?.name || 'Physiotherapist'} | ${physioPhone}</div>
    </div>
  </div>
</body>
</html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Rehab Program',
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (error) {
      console.error('PDF error:', error);
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setLoading(false);
      setShowPaymentModal(false);
    }
  };

  const viewExerciseDetail = (exercise: SelectedExercise) => {
    setSelectedExerciseDetail(exercise);
    setShowExerciseDetail(true);
  };

  const renderAITemplateTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Program Settings Section */}
      <TouchableOpacity 
        style={styles.programSettingsCard}
        onPress={() => setShowProgramSettings(!showProgramSettings)}
      >
        <View style={styles.programSettingsHeader}>
          <MaterialCommunityIcons name="calendar-clock" size={24} color="#FF5722" />
          <View style={styles.programSettingsInfo}>
            <Text style={styles.programSettingsTitle}>Program Settings</Text>
            <Text style={styles.programSettingsSubtitle}>
              {programName || 'Set program name'} • {formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}
            </Text>
          </View>
          <Ionicons name={showProgramSettings ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textMuted} />
        </View>
      </TouchableOpacity>

      {showProgramSettings && (
        <View style={styles.programSettingsExpanded}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Program Name</Text>
            <TextInput
              style={styles.input}
              value={programName}
              onChangeText={setProgramName}
              placeholder="e.g., Hip Rehabilitation Program"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateInput}>
              <Text style={styles.inputLabel}>Start Date</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <View style={styles.dateInput}>
              <Text style={styles.inputLabel}>End Date</Text>
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>How Often (Select Days)</Text>
            <View style={styles.daysGrid}>
              {DAYS_OF_WEEK.map(day => (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayButton, frequency.includes(day) && styles.dayButtonActive]}
                  onPress={() => toggleDay(day)}
                >
                  <Text style={[styles.dayButtonText, frequency.includes(day) && styles.dayButtonTextActive]}>
                    {day.substring(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Sessions Per Day</Text>
            <View style={styles.sessionsRow}>
              {['1', '2', '3', '4'].map(num => (
                <TouchableOpacity
                  key={num}
                  style={[styles.sessionButton, sessionsPerDay === num && styles.sessionButtonActive]}
                  onPress={() => setSessionsPerDay(num)}
                >
                  <Text style={[styles.sessionButtonText, sessionsPerDay === num && styles.sessionButtonTextActive]}>
                    {num} {num === '1' ? 'session' : 'sessions'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Condition</Text>
        <Text style={styles.sectionDesc}>Choose a condition to generate AI-powered exercise template</Text>
        
        <View style={styles.conditionGrid}>
          {AI_CONDITIONS.map((condition) => (
            <TouchableOpacity
              key={condition.id}
              style={[
                styles.conditionCard,
                selectedCondition === condition.id && styles.conditionCardActive
              ]}
              onPress={() => setSelectedCondition(condition.id)}
            >
              <MaterialCommunityIcons 
                name={condition.icon as any} 
                size={28} 
                color={selectedCondition === condition.id ? '#fff' : theme.colors.accent} 
              />
              <Text style={[
                styles.conditionName,
                selectedCondition === condition.id && styles.conditionNameActive
              ]}>
                {condition.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient Name (Optional)</Text>
        <TextInput
          style={styles.input}
          value={patientName}
          onChangeText={setPatientName}
          placeholder="Enter patient name for personalized report"
          placeholderTextColor={theme.colors.textMuted}
        />
      </View>

      <TouchableOpacity 
        style={[styles.generateBtn, !selectedCondition && styles.generateBtnDisabled]}
        onPress={generateAITemplate}
        disabled={loading || !selectedCondition}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MaterialCommunityIcons name="robot" size={24} color="#fff" />
            <Text style={styles.generateBtnText}>Generate AI Template</Text>
          </>
        )}
      </TouchableOpacity>

      {generatedExercises.length > 0 && (
        <View style={styles.resultsSection}>
          <Text style={styles.resultsSectionTitle}>Generated Exercise Program</Text>
          <Text style={styles.resultsCount}>{generatedExercises.length} exercises with images, instructions, do's & don'ts</Text>
          
          {/* Program Preview Card */}
          <View style={styles.programPreviewCard}>
            <View style={styles.programPreviewHeader}>
              <Text style={styles.programPreviewTitle}>{programName || 'Rehabilitation Program'}</Text>
              <Text style={styles.programPreviewMeta}>
                {formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}
              </Text>
            </View>
            <View style={styles.programPreviewStats}>
              <View style={styles.programPreviewStat}>
                <Text style={styles.programPreviewStatValue}>{generatedExercises.length}</Text>
                <Text style={styles.programPreviewStatLabel}>Exercises</Text>
              </View>
              <View style={styles.programPreviewStat}>
                <Text style={styles.programPreviewStatValue}>{frequency.length}</Text>
                <Text style={styles.programPreviewStatLabel}>Days/Week</Text>
              </View>
              <View style={styles.programPreviewStat}>
                <Text style={styles.programPreviewStatValue}>{sessionsPerDay}</Text>
                <Text style={styles.programPreviewStatLabel}>Sessions/Day</Text>
              </View>
            </View>
          </View>
          
          {generatedExercises.map((exercise, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.exerciseResultCard}
              onPress={() => viewExerciseDetail(exercise)}
            >
              <Image source={{ uri: exercise.image }} style={styles.exerciseThumb} />
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseCategory}>{exercise.category} • {exercise.bodyPart}</Text>
                <View style={styles.exerciseParams}>
                  <Text style={styles.paramText}>Sets: {exercise.customSets || exercise.sets}</Text>
                  <Text style={styles.paramText}>Reps: {exercise.customReps || exercise.reps}</Text>
                  {exercise.hold !== '-' && <Text style={styles.paramText}>Hold: {exercise.hold}</Text>}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity 
            style={styles.downloadBtn}
            onPress={() => generatePDF(generatedExercises, 'AI Generated Rehab Program')}
          >
            <Ionicons name="download" size={24} color="#fff" />
            <Text style={styles.downloadBtnText}>Download MoveHealth PDF</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  const renderQuickConvertTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Exercise Converter</Text>
        <Text style={styles.sectionDesc}>
          Just type exercise names (one per line) and we'll automatically find matching images, instructions, do's and don'ts
        </Text>
        
        <TextInput
          style={[styles.input, styles.textArea]}
          value={exerciseText}
          onChangeText={setExerciseText}
          placeholder={`Enter exercise names, one per line:\n\nExample:\nChin Tucks\nCat Cow\nGlute Bridge\nPlank\nSquats`}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          numberOfLines={8}
        />
        
        <View style={styles.exampleBox}>
          <Text style={styles.exampleTitle}>Supported Exercises:</Text>
          <Text style={styles.exampleText}>
            Neck: Chin Tucks, Neck Circles, Upper Trap Stretch{'\n'}
            Shoulder: Wall Slides, Pendulum, Shoulder Circles{'\n'}
            Back: Cat Cow, Bird Dog, Dead Bug, Glute Bridge{'\n'}
            Hip: Hip Flexor Stretch, Clamshells, Pigeon Stretch{'\n'}
            Knee: Quad Sets, Straight Leg Raise, Hamstring Curl{'\n'}
            Ankle: Ankle Circles, Calf Raises, Toe Raises{'\n'}
            General: Squats, Lunges, Plank
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.generateBtn, styles.convertBtn]}
        onPress={convertExerciseNames}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MaterialCommunityIcons name="image-search" size={24} color="#fff" />
            <Text style={styles.generateBtnText}>Convert to Visual Template</Text>
          </>
        )}
      </TouchableOpacity>

      {convertedExercises.length > 0 && (
        <View style={styles.resultsSection}>
          <Text style={styles.resultsSectionTitle}>Converted Exercises</Text>
          <Text style={styles.resultsCount}>{convertedExercises.length} exercises matched with full details</Text>
          
          {convertedExercises.map((exercise, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.exerciseResultCard}
              onPress={() => viewExerciseDetail(exercise)}
            >
              <Image source={{ uri: exercise.image }} style={styles.exerciseThumb} />
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseCategory}>{exercise.category} • {exercise.bodyPart}</Text>
                <Text style={styles.exerciseDesc} numberOfLines={2}>{exercise.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity 
            style={styles.downloadBtn}
            onPress={() => generatePDF(convertedExercises, 'Custom Rehab Program')}
          >
            <Ionicons name="download" size={24} color="#fff" />
            <Text style={styles.downloadBtnText}>Download PDF with Payment</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Rehab Template</Text>
        <MaterialCommunityIcons name="robot" size={24} color={theme.colors.accent} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ai-template' && styles.tabActive]}
          onPress={() => setActiveTab('ai-template')}
        >
          <MaterialCommunityIcons 
            name="brain" 
            size={20} 
            color={activeTab === 'ai-template' ? '#fff' : theme.colors.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === 'ai-template' && styles.tabTextActive]}>
            AI Template
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'quick-convert' && styles.tabActive]}
          onPress={() => setActiveTab('quick-convert')}
        >
          <MaterialCommunityIcons 
            name="image-search" 
            size={20} 
            color={activeTab === 'quick-convert' ? '#fff' : theme.colors.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === 'quick-convert' && styles.tabTextActive]}>
            Quick Convert
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'ai-template' ? renderAITemplateTab() : renderQuickConvertTab()}

      {/* Exercise Detail Modal */}
      <Modal visible={showExerciseDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedExerciseDetail?.name}</Text>
              <TouchableOpacity onPress={() => setShowExerciseDetail(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            {selectedExerciseDetail && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Image source={{ uri: selectedExerciseDetail.image }} style={styles.detailImage} />
                
                <View style={styles.detailBadges}>
                  <View style={[styles.detailBadge, { backgroundColor: '#2196F3' }]}>
                    <Text style={styles.detailBadgeText}>{selectedExerciseDetail.category}</Text>
                  </View>
                  <View style={[styles.detailBadge, { backgroundColor: '#4CAF50' }]}>
                    <Text style={styles.detailBadgeText}>{selectedExerciseDetail.bodyPart}</Text>
                  </View>
                </View>
                
                <Text style={styles.detailDescription}>{selectedExerciseDetail.description}</Text>
                
                <View style={styles.detailParams}>
                  <View style={styles.detailParamItem}>
                    <Text style={styles.detailParamLabel}>Sets</Text>
                    <Text style={styles.detailParamValue}>{selectedExerciseDetail.sets}</Text>
                  </View>
                  <View style={styles.detailParamItem}>
                    <Text style={styles.detailParamLabel}>Reps</Text>
                    <Text style={styles.detailParamValue}>{selectedExerciseDetail.reps}</Text>
                  </View>
                  <View style={styles.detailParamItem}>
                    <Text style={styles.detailParamLabel}>Hold</Text>
                    <Text style={styles.detailParamValue}>{selectedExerciseDetail.hold}</Text>
                  </View>
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Instructions</Text>
                  {selectedExerciseDetail.instructions.map((inst, i) => (
                    <View key={i} style={styles.instructionItem}>
                      <Text style={styles.instructionNumber}>{i + 1}</Text>
                      <Text style={styles.instructionText}>{inst}</Text>
                    </View>
                  ))}
                </View>
                
                <View style={styles.guidelinesRow}>
                  <View style={[styles.guidelineBox, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                    <Text style={[styles.guidelineTitle, { color: '#4CAF50' }]}>✅ Do's</Text>
                    {selectedExerciseDetail.dos.map((d, i) => (
                      <Text key={i} style={styles.guidelineItem}>• {d}</Text>
                    ))}
                  </View>
                  <View style={[styles.guidelineBox, { backgroundColor: 'rgba(244, 67, 54, 0.1)' }]}>
                    <Text style={[styles.guidelineTitle, { color: '#F44336' }]}>❌ Don'ts</Text>
                    {selectedExerciseDetail.donts.map((d, i) => (
                      <Text key={i} style={styles.guidelineItem}>• {d}</Text>
                    ))}
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <PaymentGateModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentConfirmed={() => createAndSharePDF(
          activeTab === 'ai-template' ? generatedExercises : convertedExercises,
          activeTab === 'ai-template' ? 'AI Generated Rehab Program' : 'Custom Rehab Program'
        )}
        reportType="report"
        title="Rehab Exercise Program PDF"
        patientName={patientName}
        reportName="Rehab Exercise Program"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  // Program Settings Styles
  programSettingsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: '#FF5722',
  },
  programSettingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  programSettingsInfo: {
    flex: 1,
  },
  programSettingsTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  programSettingsSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  programSettingsExpanded: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  dateInput: {
    flex: 1,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  dayButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  dayButtonActive: {
    backgroundColor: '#FF5722',
    borderColor: '#FF5722',
  },
  dayButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  dayButtonTextActive: {
    color: '#fff',
  },
  sessionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  sessionButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  sessionButtonActive: {
    backgroundColor: '#FF5722',
    borderColor: '#FF5722',
  },
  sessionButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  sessionButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  // Program Preview Card
  programPreviewCard: {
    backgroundColor: '#FF572215',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: '#FF5722',
  },
  programPreviewHeader: {
    marginBottom: theme.spacing.sm,
  },
  programPreviewTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  programPreviewMeta: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  programPreviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#FF572230',
  },
  programPreviewStat: {
    alignItems: 'center',
  },
  programPreviewStatValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  programPreviewStatLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  tabBar: {
    flexDirection: 'row',
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.card,
    gap: theme.spacing.xs,
  },
  tabActive: {
    backgroundColor: theme.colors.accent,
  },
  tabText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  sectionDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  conditionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  conditionCard: {
    width: (SCREEN_WIDTH - 48 - 16) / 3,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.cardBorder,
  },
  conditionCardActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  conditionName: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  conditionNameActive: {
    color: '#fff',
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
  textArea: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  exampleBox: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
  },
  exampleTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: 'bold',
    color: theme.colors.accent,
    marginBottom: theme.spacing.xs,
  },
  exampleText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C4DFF',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  generateBtnDisabled: {
    opacity: 0.5,
  },
  convertBtn: {
    backgroundColor: '#00BCD4',
  },
  generateBtnText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
  },
  resultsSection: {
    marginTop: theme.spacing.lg,
  },
  resultsSectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  resultsCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  exerciseResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  exerciseThumb: {
    width: 70,
    height: 70,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.md,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  exerciseCategory: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.accent,
    marginTop: 2,
  },
  exerciseDesc: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  exerciseParams: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: 4,
  },
  paramText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E88E5',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    marginTop: 50,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  detailImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  detailBadges: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  detailBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    borderRadius: 20,
  },
  detailBadgeText: {
    color: '#fff',
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  detailDescription: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
    fontStyle: 'italic',
  },
  detailParams: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  detailParamItem: {
    alignItems: 'center',
  },
  detailParamLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  detailParamValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.accent,
    marginTop: 4,
  },
  detailSection: {
    marginBottom: theme.spacing.md,
  },
  detailSectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xs,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.accent,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: theme.fontSize.sm,
    fontWeight: 'bold',
    marginRight: theme.spacing.sm,
  },
  instructionText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  guidelinesRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  guidelineBox: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  guidelineTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: 'bold',
    marginBottom: theme.spacing.sm,
  },
  guidelineItem: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    lineHeight: 16,
  },
});
