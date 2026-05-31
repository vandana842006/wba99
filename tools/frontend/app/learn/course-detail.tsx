import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Professional Course Content with Full Detailed Material
const COURSE_CONTENT: { [key: string]: any } = {
  'posture-fundamentals': {
    title: 'Posture Assessment Fundamentals',
    description: 'Complete professional course on postural assessment techniques, deviations identification, and clinical applications for physiotherapists.',
    icon: 'human',
    iconBg: '#1E88E5',
    level: 'Beginner',
    duration: '4.5 hours',
    instructor: 'WBA99 Clinical Team',
    students: 2847,
    rating: 4.9,
    lessons: [
      {
        id: 1,
        title: 'Introduction to Postural Assessment',
        duration: '25 min',
        type: 'lesson',
        image: 'https://images.pexels.com/photos/5793651/pexels-photo-5793651.jpeg?auto=compress&cs=tinysrgb&w=600',
        content: `INTRODUCTION TO POSTURAL ASSESSMENT

What is Posture?
Posture is the alignment and positioning of the body in relation to gravity. It refers to how we hold our bodies while standing, sitting, lying down, or during movement.

Why Assess Posture?
• Identify muscle imbalances before they cause pain
• Detect structural abnormalities and compensations
• Guide treatment planning and exercise prescription
• Monitor progress throughout rehabilitation
• Prevent injury through early intervention

Types of Posture:
1. Static Posture: Position when standing, sitting, or lying still
2. Dynamic Posture: Alignment during movement (walking, running, lifting)

The Kinetic Chain Concept:
The body functions as an interconnected system. A problem in one area affects other regions. For example:
• Flat feet → Knee valgus → Hip internal rotation → Low back pain
• Forward head → Rounded shoulders → Thoracic kyphosis → Shoulder impingement

Assessment Environment:
• Well-lit room with neutral background
• Patient in minimal clothing (shorts, sports bra/tank)
• Remove shoes and socks
• Have plumb line or posture grid available
• Camera for documentation (with consent)

Key Assessment Positions:
• Anterior view (front)
• Posterior view (back)
• Lateral view (side) - both left and right
• Assess in relaxed standing position first

Clinical Documentation:
Always document your findings systematically:
• Date and time of assessment
• Patient demographics
• Specific deviations observed
• Photographs when possible
• Correlation with symptoms`,
      },
      {
        id: 2,
        title: 'Anatomical Landmarks & Reference Points',
        duration: '30 min',
        type: 'lesson',
        image: 'https://images.unsplash.com/photo-1641380140345-a8b91e58d4e0?w=600',
        content: `ANATOMICAL LANDMARKS FOR POSTURE ASSESSMENT

Understanding anatomical landmarks is fundamental to accurate postural assessment.

HEAD & CERVICAL SPINE:
• External auditory meatus (ear canal)
• Mastoid process
• Cervical vertebrae (C7 spinous process is most prominent)
• Occiput (base of skull)

SHOULDER COMPLEX:
• Acromion process (tip of shoulder)
• Spine of scapula
• Inferior angle of scapula
• Medial border of scapula
• Clavicles (collar bones)

THORACIC & LUMBAR SPINE:
• Spinous processes (T1-T12, L1-L5)
• Thoracolumbar junction (T12-L1)
• Paraspinal muscles
• Rib angles

PELVIS:
• ASIS (Anterior Superior Iliac Spine) - front of hip bone
• PSIS (Posterior Superior Iliac Spine) - back of pelvis
• Iliac crests - top of hip bones
• Greater trochanter - side of hip
• Pubic symphysis

LOWER EXTREMITY:
• Patella (kneecap)
• Tibial tuberosity
• Medial and lateral malleoli (ankle bones)
• Calcaneus (heel bone)
• Navicular (inside of foot)

PALPATION TECHNIQUES:
1. Use flat fingers, not poking pressure
2. Compare bilaterally (left vs right)
3. Note any tenderness or asymmetry
4. Ask patient about sensitivity
5. Document differences in millimeters or degrees

COMMON PALPATION ERRORS:
• Pressing too hard (causes guarding)
• Not comparing both sides
• Rushing through assessment
• Missing subtle asymmetries
• Not considering soft tissue vs bony landmarks`,
      },
      {
        id: 3,
        title: 'The Plumb Line Assessment',
        duration: '35 min',
        type: 'lesson',
        image: 'https://images.unsplash.com/photo-1651163586078-06e9e9867661?w=600',
        content: `THE PLUMB LINE ASSESSMENT

The plumb line is a vertical reference line used to assess postural alignment. It represents the line of gravity.

SETTING UP:
• Hang a weighted string from ceiling or use a posture grid
• Patient stands in relaxed, comfortable position
• Feet hip-width apart, arms at sides
• Looking straight ahead at eye level

LATERAL VIEW (Side) - IDEAL ALIGNMENT:
The plumb line should pass through:
1. External auditory meatus (ear)
2. Through cervical vertebral bodies
3. Through the shoulder joint (glenohumeral)
4. Through or slightly behind hip joint
5. Slightly anterior to knee joint axis
6. Slightly anterior to lateral malleolus

ANTERIOR VIEW (Front) - IDEAL ALIGNMENT:
The line should:
• Bisect the body into equal halves
• Pass through:
  - Midline of face (nose, chin)
  - Manubrium and xiphoid process
  - Umbilicus
  - Pubic symphysis
  - Equal distance between knees and feet

POSTERIOR VIEW (Back) - IDEAL ALIGNMENT:
• Centered between spinous processes
• Equal height of shoulders
• Equal height of scapular inferior angles
• Equal height of iliac crests
• Equal distance from spine to medial scapular borders
• Gluteal cleft should be vertical

DEVIATIONS TO NOTE:

Forward Deviations:
• Forward head posture - ear anterior to plumb line
• Rounded shoulders - shoulder anterior to line
• Anterior pelvic tilt - hip anterior to line

Backward Deviations:
• Military posture - excessive cervical lordosis
• Posterior pelvic tilt - hip posterior to line
• Knee hyperextension

Lateral Deviations:
• Lateral shift - whole body shifted left or right
• Hip hiking - one hip higher
• Shoulder elevation - one shoulder higher
• Head tilt - ear to shoulder

DOCUMENTATION:
Record deviations in degrees or distances (cm/inches) from the plumb line.`,
      },
      {
        id: 4,
        title: 'Upper Crossed Syndrome (UCS)',
        duration: '40 min',
        type: 'lesson',
        image: 'https://images.pexels.com/photos/4506072/pexels-photo-4506072.jpeg?auto=compress&cs=tinysrgb&w=600',
        content: `UPPER CROSSED SYNDROME (UCS)

First described by Dr. Vladimir Janda, UCS is a predictable pattern of muscle imbalance affecting the head, neck, and shoulders.

THE "X" PATTERN:
Imagine an X drawn across the upper body:
• Tight/Overactive muscles form one diagonal
• Weak/Inhibited muscles form the other diagonal

TIGHT/OVERACTIVE MUSCLES:
1. Suboccipitals (base of skull)
   - Cause: Constant head-forward position
   - Effect: Cervicogenic headaches

2. Upper Trapezius
   - Cause: Stress, poor posture, computer work
   - Effect: Neck pain, shoulder elevation

3. Levator Scapulae
   - Cause: Shoulder shrugging, stress
   - Effect: Neck stiffness, limited rotation

4. Pectoralis Major & Minor
   - Cause: Slouched sitting, texting
   - Effect: Rounded shoulders, breathing restriction

5. SCM (Sternocleidomastoid)
   - Cause: Forward head posture
   - Effect: Jaw tension, headaches

WEAK/INHIBITED MUSCLES:
1. Deep Cervical Flexors
   - Longus colli and longus capitis
   - Effect: Poor neck stability, forward head

2. Lower Trapezius
   - Effect: Scapular winging, poor control

3. Middle Trapezius
   - Effect: Protracted scapulae

4. Serratus Anterior
   - Effect: Scapular winging

5. Rhomboids
   - Effect: Rounded shoulders

CLINICAL PRESENTATION:
• Forward head posture (FHP)
• Cervical hyperlordosis
• Thoracic kyphosis (rounded upper back)
• Protracted and elevated scapulae
• Internally rotated humeri

ASSOCIATED CONDITIONS:
• Tension headaches
• Neck pain
• Shoulder impingement
• Thoracic outlet syndrome
• Temporomandibular joint (TMJ) dysfunction

ASSESSMENT TESTS:
• Cervical flexion test (weak deep flexors)
• Wall angel test (pectoral tightness)
• Scapular position assessment

TREATMENT APPROACH:
1. Stretch tight muscles (pecs, upper traps, levator)
2. Strengthen weak muscles (deep neck flexors, lower traps)
3. Postural re-education
4. Ergonomic modifications
5. Manual therapy as needed`,
      },
      {
        id: 5,
        title: 'Lower Crossed Syndrome (LCS)',
        duration: '40 min',
        type: 'lesson',
        image: 'https://images.unsplash.com/photo-1712068980119-bdeb8353d16c?w=600',
        content: `LOWER CROSSED SYNDROME (LCS)

LCS is a muscle imbalance pattern affecting the lumbar-pelvic-hip complex, also described by Dr. Janda.

THE "X" PATTERN IN LOWER BODY:
Similar to UCS, muscles form an X pattern across the pelvis.

TIGHT/OVERACTIVE MUSCLES:
1. Hip Flexors (Iliopsoas Complex)
   - Iliacus and Psoas major
   - Cause: Prolonged sitting, hip flexion activities
   - Effect: Pulls pelvis into anterior tilt

2. Rectus Femoris
   - One of the quadriceps (crosses hip and knee)
   - Effect: Contributes to anterior pelvic tilt

3. TFL (Tensor Fasciae Latae)
   - Lateral hip/thigh
   - Effect: Lateral hip tightness, IT band issues

4. Lumbar Erector Spinae
   - Low back extensors
   - Effect: Increased lumbar lordosis

5. Quadratus Lumborum
   - Deep lateral trunk muscle
   - Effect: Lateral pelvic tilt if unilateral

WEAK/INHIBITED MUSCLES:
1. Gluteus Maximus
   - Primary hip extensor
   - Effect: Poor hip extension power

2. Gluteus Medius
   - Hip abductor, pelvis stabilizer
   - Effect: Trendelenburg gait, hip drop

3. Abdominal Muscles
   - Rectus abdominis, obliques, transverse abdominis
   - Effect: Poor core stability

4. Hamstrings (Relatively)
   - May be lengthened or inhibited

CLINICAL PRESENTATION:
• Anterior pelvic tilt (>10-15 degrees)
• Increased lumbar lordosis (hyperlordosis)
• Protruding abdomen
• Tight hip flexors (positive Thomas test)
• Weak gluteals (difficulty with hip extension)

ASSOCIATED CONDITIONS:
• Low back pain
• Sacroiliac joint dysfunction
• Hip labral tears
• Piriformis syndrome
• Hamstring strains

ASSESSMENT TESTS:
1. Thomas Test - hip flexor length
2. Modified Thomas Test - rectus femoris
3. Ober Test - IT band/TFL tightness
4. Prone Hip Extension - gluteal activation
5. Bridging Assessment - gluteal strength

TREATMENT APPROACH:
1. Stretch hip flexors, TFL, low back extensors
2. Strengthen glutes, core, hamstrings
3. Hip mobility exercises
4. Core stabilization program
5. Movement retraining (hip hinge patterns)
6. Sitting posture modifications`,
      },
      {
        id: 6,
        title: 'Common Postural Deviation Types',
        duration: '45 min',
        type: 'lesson',
        image: 'https://images.unsplash.com/photo-1655712779546-a1c0ea613cd8?w=600',
        content: `COMMON POSTURAL DEVIATION TYPES

Understanding different postural types helps in identifying patterns and guiding treatment.

1. KYPHOSIS-LORDOSIS POSTURE
Characteristics:
• Increased thoracic kyphosis (hunchback)
• Increased lumbar lordosis (sway back)
• Anterior pelvic tilt
• Forward head posture
• May have slight knee hyperextension

Muscle Imbalances:
• Short: Hip flexors, thoracic extensors, neck extensors
• Long: External obliques, hamstrings, upper back extensors, neck flexors

Common Causes:
• Prolonged sitting
• Weak core musculature
• Habitual poor posture

2. FLAT-BACK POSTURE
Characteristics:
• Decreased or absent lumbar lordosis (flat low back)
• Posterior pelvic tilt
• Flexed hips and trunk
• Forward head posture
• May have thoracic kyphosis

Muscle Imbalances:
• Short: Hamstrings, abdominals, hip extensors
• Long: Iliopsoas, lumbar extensors

Common Causes:
• Constant sitting with slouched posture
• Over-strengthening of abdominals without balance
• Degenerative disc disease

3. SWAY-BACK POSTURE
Characteristics:
• Long kyphosis extending into lumbar region
• Posterior displacement of upper trunk
• Anterior displacement of pelvis (pelvis thrust forward)
• Hips in hyperextension
• Knees in hyperextension or slight flexion

Muscle Imbalances:
• Short: Upper abdominals, hip extensors, lower lumbar extensors
• Long: External obliques, hip flexors, upper lumbar extensors, neck flexors

Common Causes:
• Habitual standing with weight on heels
• Weak hip flexors
• Prolonged standing

4. MILITARY (LORDOTIC) POSTURE
Characteristics:
• Exaggerated lumbar lordosis
• Exaggerated cervical lordosis
• Anterior pelvic tilt
• Chest thrust forward
• Head positioned posteriorly

Muscle Imbalances:
• Short: Hip flexors, lumbar extensors, cervical extensors
• Long: Abdominals, hip extensors, anterior neck muscles

5. SCOLIOSIS
Characteristics:
• Lateral curvature of spine (C-curve or S-curve)
• Rotational component
• Rib hump on convex side
• Uneven shoulders and/or hips
• Can be structural or functional

Types:
• Structural (fixed) - bone/disc abnormality
• Functional (flexible) - muscle imbalance, leg length discrepancy

Assessment Tools:
• Adam's Forward Bend Test
• Scoliometer
• X-ray (Cobb angle measurement)

CLINICAL CORRELATION:
Match the postural type with patient symptoms:
• Kyphosis-lordosis: Low back pain, neck pain
• Flat-back: Low back stiffness, difficulty standing upright
• Sway-back: Low back pain, hip flexor weakness
• Scoliosis: Asymmetrical pain, breathing issues (severe cases)`,
      },
      {
        id: 7,
        title: 'Clinical Assessment Protocol',
        duration: '35 min',
        type: 'lesson',
        image: 'https://images.unsplash.com/photo-1648638810954-281a6439675b?w=600',
        content: `CLINICAL ASSESSMENT PROTOCOL

A systematic approach ensures thorough and consistent postural assessment.

STEP 1: PATIENT HISTORY
• Chief complaint and onset
• Aggravating and relieving factors
• Occupational activities
• Recreational activities
• Previous injuries or surgeries
• Current exercise routine
• Sleep position

STEP 2: OBSERVATION (Standing)
Anterior View:
• Head position (tilt, rotation)
• Shoulder height
• Clavicle position
• Rib cage symmetry
• Waist angle
• ASIS level
• Knee alignment (valgus/varus)
• Foot position (pronation/supination)

Lateral View (Both sides):
• Head position (forward/backward)
• Cervical curve
• Thoracic curve
• Lumbar curve
• Pelvic tilt
• Knee position (hyperextension/flexion)
• Ankle alignment

Posterior View:
• Head position
• Shoulder height
• Scapular position
• Spine alignment
• PSIS level
• Gluteal fold level
• Popliteal creases
• Heel position

STEP 3: ACTIVE MOVEMENTS
• Cervical ROM (flexion, extension, lateral flexion, rotation)
• Thoracic rotation
• Lumbar flexion/extension
• Hip flexion/extension
• Note any compensations or limitations

STEP 4: SPECIAL TESTS
• Adam's Forward Bend (scoliosis)
• Thomas Test (hip flexor tightness)
• Ober Test (IT band/TFL)
• Wall Angel (pectoral/shoulder mobility)
• Cervical Flexion (deep neck flexor strength)

STEP 5: MUSCLE LENGTH TESTING
• Hamstrings (90-90 test)
• Hip flexors (Thomas test)
• Pectorals (corner stretch position)
• Upper trapezius/levator scapulae

STEP 6: MUSCLE STRENGTH TESTING
• Core (plank hold, curl-up)
• Gluteals (bridge, prone hip extension)
• Scapular stabilizers

STEP 7: DOCUMENTATION
• Use standardized forms
• Take photographs (with consent)
• Measure deviations objectively
• Note correlations with symptoms

STEP 8: CLINICAL REASONING
• Identify primary vs secondary problems
• Determine tissue involved
• Consider contributing factors
• Plan treatment approach`,
      },
      {
        id: 8,
        title: 'Treatment Planning & Exercise Prescription',
        duration: '40 min',
        type: 'lesson',
        image: 'https://images.unsplash.com/photo-1648638810948-f3bf2cccdde9?w=600',
        content: `TREATMENT PLANNING & EXERCISE PRESCRIPTION

Based on assessment findings, develop a targeted treatment plan.

TREATMENT PRINCIPLES:
1. Address pain first if present
2. Release/stretch tight structures
3. Activate/strengthen weak muscles
4. Re-educate movement patterns
5. Maintain gains with ongoing exercise

PHASE 1: RELEASE & MOBILIZE (Weeks 1-2)
Goals:
• Reduce muscle tension
• Improve joint mobility
• Decrease pain

Techniques:
• Self-myofascial release (foam rolling)
• Static stretching (30-60 seconds)
• Joint mobilizations (manual therapy)
• Heat therapy before stretching

Example Stretches:
• Pectoral doorway stretch
• Upper trapezius stretch
• Hip flexor lunge stretch
• Piriformis stretch
• Cat-camel for spine mobility

PHASE 2: ACTIVATE & STRENGTHEN (Weeks 2-6)
Goals:
• Activate inhibited muscles
• Build strength in weak areas
• Improve neuromuscular control

Key Exercises:
For UCS:
• Chin tucks (deep neck flexor activation)
• Prone Y-T-W raises (lower/middle trap)
• Wall slides (serratus anterior)
• Scapular squeezes

For LCS:
• Glute bridges (gluteus maximus)
• Clamshells (gluteus medius)
• Dead bugs (core stability)
• Bird dogs (core + hip)
• Plank variations

PHASE 3: INTEGRATION (Weeks 4-8)
Goals:
• Integrate new patterns into function
• Progress to functional movements
• Build endurance

Exercises:
• Squats with proper form
• Deadlift patterns
• Lunges with trunk control
• Overhead reaching patterns
• Push-up progressions

PHASE 4: MAINTENANCE (Ongoing)
Goals:
• Maintain gains achieved
• Prevent recurrence
• Lifestyle modifications

Recommendations:
• Daily stretching routine (10-15 min)
• Strengthening 2-3x/week
• Ergonomic modifications
• Regular posture breaks
• Mindful movement throughout day

EXERCISE PRESCRIPTION PARAMETERS:
Stretching:
• Hold 30-60 seconds
• 2-3 repetitions
• Daily or 2x daily

Strengthening:
• 2-3 sets x 10-15 reps
• Progress resistance gradually
• 2-4 times per week

MONITORING PROGRESS:
• Re-assess posture every 4-6 weeks
• Document changes with photos
• Adjust program based on findings
• Celebrate improvements with patient`,
      },
      {
        id: 9,
        title: 'Case Studies & Clinical Application',
        duration: '30 min',
        type: 'lesson',
        image: 'https://images.pexels.com/photos/5793651/pexels-photo-5793651.jpeg?auto=compress&cs=tinysrgb&w=600',
        content: `CASE STUDIES & CLINICAL APPLICATION

CASE 1: Office Worker with Neck Pain
Patient: 35-year-old female, desk job

Chief Complaint:
• Neck pain and stiffness, worse at end of day
• Tension headaches 2-3x/week
• Difficulty looking up

Postural Findings:
• Forward head posture (2 inches anterior)
• Rounded shoulders
• Elevated right shoulder
• Thoracic kyphosis
• Protracted scapulae

Assessment Results:
• Positive chin tuck test (weak deep flexors)
• Tight pectorals (limited wall angel)
• Weak lower trapezius
• Limited cervical extension

Diagnosis: Upper Crossed Syndrome

Treatment Plan:
Week 1-2:
• Self-massage to suboccipitals
• Pec stretching 3x/day
• Upper trap stretches
• Ergonomic workstation setup

Week 3-6:
• Chin tucks 3x15/day
• Prone Y-T-W 2x10
• Wall slides 2x10
• Postural taping

Week 7-12:
• Progress strengthening
• Integration exercises
• Maintenance program

Outcome: 80% improvement in neck pain at 8 weeks

---

CASE 2: Runner with Low Back Pain
Patient: 28-year-old male, recreational runner (30 miles/week)

Chief Complaint:
• Low back pain during and after running
• Tight hip flexors
• Difficulty with hip extension

Postural Findings:
• Anterior pelvic tilt (15 degrees)
• Increased lumbar lordosis
• Bilateral hip flexor tightness
• Weak gluteals

Assessment Results:
• Positive Thomas test bilaterally
• Weak single-leg bridge
• Poor hip extension in prone
• Weak core stability

Diagnosis: Lower Crossed Syndrome

Treatment Plan:
Week 1-3:
• Hip flexor stretching program
• Foam rolling IT band/quads
• Glute activation exercises
• Reduce running volume 50%

Week 4-8:
• Progressive glute strengthening
• Core stability program
• Running gait retraining
• Gradual return to mileage

Week 9-12:
• Full return to running
• Maintenance exercises
• Form drills

Outcome: Pain-free running at 10 weeks

---

KEY TAKEAWAYS:
• Always correlate posture with symptoms
• Address root cause, not just symptoms
• Progress systematically
• Include patient education
• Monitor and modify as needed`,
      },
      {
        id: 10,
        title: 'Final Assessment Quiz',
        duration: '20 min',
        type: 'quiz',
        questions: 25,
        passingScore: 80,
        topics: ['Plumb line assessment', 'UCS & LCS', 'Postural types', 'Treatment planning', 'Clinical application'],
      },
    ],
  },
  'msk-screening': {
    title: 'MSK Screening Masterclass',
    description: 'Comprehensive musculoskeletal screening course covering Y-Balance, Single Leg Hop Battery, FMS clearing tests, and injury risk assessment.',
    icon: 'bandage',
    iconBg: '#E53935',
    level: 'Intermediate',
    duration: '6 hours',
    instructor: 'WBA99 Sports Medicine',
    students: 1923,
    rating: 4.8,
    lessons: [
      {
        id: 1,
        title: 'Introduction to MSK Screening',
        duration: '25 min',
        type: 'lesson',
        image: 'https://images.pexels.com/photos/5793651/pexels-photo-5793651.jpeg?auto=compress&cs=tinysrgb&w=600',
        content: `MUSCULOSKELETAL SCREENING OVERVIEW

What is MSK Screening?
Systematic evaluation of the musculoskeletal system to identify injury risk factors, movement dysfunctions, and baseline function.

Purpose of Screening:
• Pre-participation assessment
• Injury risk identification
• Baseline establishment
• Return-to-sport clearance
• Program design guidance

Key Screening Components:
1. Health History Questionnaire
2. Movement Quality Assessment (FMS)
3. Dynamic Balance Testing (Y-Balance)
4. Power/Function Testing (Hop Tests)
5. Joint-Specific Special Tests

When to Screen:
• Pre-season (athletes)
• Pre-employment (workers)
• Post-injury (return to activity)
• Periodically (monitoring)

Evidence-Based Approach:
Modern MSK screening combines:
• Validated screening tools
• Clinical reasoning
• Sport/activity-specific demands
• Individual risk factors

Documentation Standards:
• Use standardized forms
• Record all measurements
• Calculate limb symmetry indices
• Track changes over time`,
      },
      {
        id: 2,
        title: 'Y-Balance Test Protocol',
        duration: '40 min',
        type: 'lesson',
        image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600',
        content: `Y-BALANCE TEST (YBT)

The Y-Balance Test assesses dynamic balance and identifies lower extremity asymmetries.

EQUIPMENT NEEDED:
• Y-Balance Test Kit (or tape measure)
• Athletic tape for floor markings
• Recording sheet

SETUP:
Create Y pattern with 3 reach directions:
• Anterior (forward)
• Posterolateral (back and to the side)
• Posteromedial (back and toward midline)
Angles: Anterior 0°, Posterolateral 135°, Posteromedial 135° (from anterior)

TESTING PROTOCOL:
1. Measure limb length (ASIS to medial malleolus)
2. Practice trials (4-6 per direction)
3. Record 3 trials per direction per leg
4. Use best of 3 trials for scoring

INSTRUCTIONS TO PATIENT:
"Stand on one leg with hands on hips. Reach as far as possible with the free leg in each direction. Touch lightly and return to start without losing balance."

SCORING:
• Composite Score = (Ant + PM + PL) / (3 x limb length) x 100
• Asymmetry = |Right - Left| for each direction

CUT-OFF VALUES (Risk Predictors):
• Anterior asymmetry > 4 cm = increased injury risk
• Composite score < 89% = increased injury risk

COMMON ERRORS:
• Lifting stance heel
• Placing weight on reach foot
• Losing balance
• Hands off hips
• Moving stance foot

CLINICAL INTERPRETATION:
Anterior reach deficit may indicate:
• Ankle dorsiflexion limitation
• Quad weakness
• Fear of anterior loading

Posterolateral/Posteromedial deficits:
• Hip abductor weakness
• Core stability issues
• Hamstring/glute weakness`,
      },
      {
        id: 3,
        title: 'Single Leg Hop Battery',
        duration: '45 min',
        type: 'lesson',
        image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600',
        content: `SINGLE LEG HOP BATTERY (SLHB)

A series of hop tests used to assess lower extremity power, stability, and readiness for return to sport.

THE FOUR HOP TESTS:

1. SINGLE HOP FOR DISTANCE
Setup: Start behind line on one leg
Instruction: Hop as far as possible, land on same leg, stick landing
Measure: Distance from start line to heel
Trials: 2 per leg, use best

2. TRIPLE HOP FOR DISTANCE
Setup: Same as single hop
Instruction: Perform 3 consecutive hops, land on same leg
Measure: Total distance from start to final landing
Trials: 2 per leg, use best

3. CROSSOVER HOP FOR DISTANCE
Setup: Tape line on floor
Instruction: Hop 3 times, crossing over center line each hop
Measure: Total distance covered
Trials: 2 per leg, use best

4. 6-METER TIMED HOP
Setup: Mark 6-meter distance
Instruction: Hop as fast as possible over distance
Measure: Time to complete
Trials: 2 per leg, use best (fastest)

LIMB SYMMETRY INDEX (LSI):
LSI = (Involved limb / Uninvolved limb) x 100

CRITERIA FOR RETURN TO SPORT:
• LSI > 90% on ALL hop tests
• Some protocols require > 95%
• Quality of movement also assessed

QUALITATIVE ASSESSMENT:
Watch for:
• Knee valgus on landing
• Trunk lean
• Loss of balance
• Stiff landing
• Hesitation or fear

PROGRESSIONS:
If not ready for hop testing:
1. Single leg stance (eyes open, then closed)
2. Single leg squat
3. Step downs
4. Small hops
5. Full hop testing

SAFETY CONSIDERATIONS:
• Adequate healing time post-injury
• No pain during testing
• Good single leg squat control first
• Physician clearance if post-surgical`,
      },
      {
        id: 4,
        title: 'Functional Movement Screen (FMS) Basics',
        duration: '50 min',
        type: 'lesson',
        image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600',
        content: `FUNCTIONAL MOVEMENT SCREEN (FMS)

The FMS is a ranking and grading system that identifies movement pattern limitations.

THE 7 FMS TESTS:

1. DEEP SQUAT
Tests: Bilateral, symmetrical mobility of hips, knees, ankles
Scoring:
3 - Perfect depth, torso parallel to tibia
2 - Needs heel lift to achieve
1 - Cannot achieve with heel lift
0 - Pain

2. HURDLE STEP
Tests: Stride mechanics, hip mobility, stability
Scoring:
3 - Hip, knee, ankle aligned, no compensation
2 - Alignment lost OR contact with hurdle
1 - Loss of balance OR contact with hurdle
0 - Pain

3. INLINE LUNGE
Tests: Hip and ankle mobility, knee stability, quad flexibility
Scoring:
3 - Dowel contacts maintained, no torso movement
2 - Lost contact OR compensation
1 - Loss of balance
0 - Pain

4. SHOULDER MOBILITY
Tests: Shoulder ROM, scapular function
Scoring:
3 - Fists within one hand length
2 - Fists within 1.5 hand lengths
1 - Fists not within 1.5 hand lengths
0 - Pain

5. ACTIVE STRAIGHT LEG RAISE (ASLR)
Tests: Hamstring/gastroc flexibility, pelvic stability
Scoring:
3 - Malleolus passes mid-thigh
2 - Malleolus between mid-thigh and joint line
1 - Malleolus below joint line
0 - Pain

6. TRUNK STABILITY PUSH-UP
Tests: Core stability during upper body movement
Scoring:
3 - Men: thumbs at forehead / Women: thumbs at chin
2 - Men: thumbs at chin / Women: thumbs at clavicle
1 - Unable to perform
0 - Pain

7. ROTARY STABILITY
Tests: Multi-plane trunk stability
Scoring:
3 - Ipsilateral repetitions (same side arm/leg)
2 - Diagonal repetitions (opposite arm/leg)
1 - Unable to perform diagonal
0 - Pain

TOTAL SCORE: Max 21 points
Cut-off: Score < 14 = increased injury risk

CLEARING TESTS:
• Shoulder impingement clearing (with shoulder mobility)
• Prone press-up (with trunk stability)
• Quadruped spine flexion (with rotary stability)
If pain on clearing test = 0 for that movement`,
      },
      {
        id: 5,
        title: 'Risk Stratification & Clinical Decision Making',
        duration: '35 min',
        type: 'lesson',
        image: 'https://images.pexels.com/photos/4506072/pexels-photo-4506072.jpeg?auto=compress&cs=tinysrgb&w=600',
        content: `RISK STRATIFICATION & CLINICAL DECISION MAKING

Combining screening results to make informed decisions.

INTEGRATING RESULTS:

Low Risk Indicators:
• FMS score ≥ 14
• Y-Balance composite ≥ 89%
• Y-Balance asymmetry < 4 cm
• Hop test LSI > 90%
• No pain on any test

Moderate Risk Indicators:
• FMS score 12-14
• Y-Balance composite 84-89%
• Y-Balance asymmetry 4-6 cm
• Hop test LSI 85-90%
• Movement compensations present

High Risk Indicators:
• FMS score < 12
• Y-Balance composite < 84%
• Y-Balance asymmetry > 6 cm
• Hop test LSI < 85%
• Pain on any test

DECISION FRAMEWORK:

For Pre-Season Screening:
High Risk → Refer to sports medicine, modify training
Moderate Risk → Implement corrective program, monitor
Low Risk → Clear for full participation, maintenance

For Return to Sport:
High Risk → Not cleared, continue rehab
Moderate Risk → Gradual return, sport-specific progression
Low Risk → Cleared for full return

CORRECTIVE STRATEGIES:

FMS < 14:
• Address mobility limitations
• Work on stability/motor control
• Gradual progression to complex movements

Y-Balance Deficits:
• Single leg balance progressions
• Hip and ankle mobility
• Core stability training
• Sport-specific balance drills

Hop Test Deficits:
• Plyometric progressions
• Power development
• Confidence building
• Movement quality focus

DOCUMENTATION & COMMUNICATION:
• Clear report to athlete/patient
• Communication with coaches/trainers
• Specific exercise prescription
• Follow-up timeline established`,
      },
      {
        id: 6,
        title: 'MSK Screening Quiz',
        duration: '20 min',
        type: 'quiz',
        questions: 20,
        passingScore: 75,
        topics: ['Y-Balance Test', 'Hop Tests', 'FMS', 'Risk Stratification'],
      },
    ],
  },
  'gait-analysis': {
    title: 'Walking Gait Analysis',
    description: 'Professional course on gait cycle phases, normal vs pathological patterns, and clinical gait assessment techniques.',
    icon: 'walk',
    iconBg: '#43A047',
    level: 'Intermediate',
    duration: '5 hours',
    instructor: 'WBA99 Movement Lab',
    students: 1654,
    rating: 4.7,
    lessons: [
      {
        id: 1,
        title: 'The Gait Cycle Explained',
        duration: '35 min',
        type: 'lesson',
        image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600',
        content: `THE GAIT CYCLE

Definition: One complete cycle of events from initial contact of one foot to the next initial contact of the same foot.

BASIC DIVISIONS:
Stance Phase: 60% of gait cycle
• Foot is in contact with ground
• Provides support and propulsion

Swing Phase: 40% of gait cycle
• Foot is off the ground
• Limb advances forward

STANCE PHASE SUB-DIVISIONS:

1. Initial Contact (0-2%)
• First contact with ground (normally heel)
• Hip flexed 30°, knee extended
• Ankle in neutral/slight plantarflexion

2. Loading Response (2-12%)
• Foot flat on ground
• Shock absorption
• Knee flexes 15-20°
• Ankle plantarflexes then dorsiflexes

3. Mid Stance (12-31%)
• Body passes over stance limb
• Single limb support begins
• Hip extends, knee extends
• Ankle dorsiflexes 5-10°

4. Terminal Stance (31-50%)
• Heel rises from ground
• Body advances forward
• Hip hyperextends 10-20°
• Ankle dorsiflexes then plantarflexes

5. Pre-Swing (50-62%)
• Preparation for toe-off
• Rapid knee flexion
• Hip begins flexion
• Ankle plantarflexion (push-off)

SWING PHASE SUB-DIVISIONS:

6. Initial Swing (62-75%)
• Toe-off occurs
• Hip and knee flex rapidly
• Ankle dorsiflexes to neutral

7. Mid Swing (75-87%)
• Limb advances forward
• Hip continues flexion
• Knee extends
• Ankle maintained neutral

8. Terminal Swing (87-100%)
• Preparation for contact
• Hip flexed 30°
• Knee extends fully
• Ankle neutral/slight dorsiflexion

KEY GAIT PARAMETERS:
• Cadence: 90-120 steps/minute
• Step length: 35-41 cm
• Stride length: 70-82 cm
• Walking velocity: 1.2-1.4 m/s`,
      },
      {
        id: 2,
        title: 'Joint Kinematics During Gait',
        duration: '40 min',
        type: 'lesson',
        image: 'https://images.unsplash.com/photo-1712068980119-bdeb8353d16c?w=600',
        content: `JOINT KINEMATICS DURING GAIT

Understanding joint angles and movements throughout the gait cycle.

HIP JOINT:
Sagittal Plane:
• Initial contact: 30° flexion
• Loading response: 30° flexion maintained
• Mid stance: 0° (neutral)
• Terminal stance: 10-20° hyperextension
• Swing: Returns to 30° flexion

Frontal Plane:
• Pelvis drops 5° on swing side (controlled by stance hip abductors)
• Hip adduction during stance

Transverse Plane:
• Internal rotation during loading
• External rotation during terminal stance

KNEE JOINT:
Sagittal Plane:
• Initial contact: 0-5° flexion
• Loading response: 15-20° flexion (shock absorption)
• Mid stance: Extends to 0-5°
• Terminal stance: Slight flexion begins
• Pre-swing: 35-40° flexion
• Swing: 60-70° peak flexion
• Terminal swing: Extension to 0°

Frontal Plane:
• Minimal valgus stress during stance

Transverse Plane:
• Slight rotation with tibiofemoral movement

ANKLE/FOOT:
Sagittal Plane:
• Initial contact: Neutral to slight plantarflexion
• Loading response: Plantarflexes (foot flat)
• Mid stance: Dorsiflexes 5-10°
• Terminal stance: 10° dorsiflexion
• Pre-swing: 20° plantarflexion (push-off)
• Swing: Returns to neutral

FOOT MECHANICS:
• Heel strike: Calcaneus contacts first
• Foot flat: Controlled pronation
• Mid stance: Neutral to slight supination
• Heel rise: Re-supination
• Toe-off: Push through 1st ray

TRUNK & PELVIS:
• Counter-rotation between pelvis and thorax
• Pelvis rotates 4° forward with swing leg
• Lateral trunk lean 2° toward stance leg`,
      },
      {
        id: 3,
        title: 'Common Gait Deviations',
        duration: '45 min',
        type: 'lesson',
        image: 'https://images.pexels.com/photos/5793651/pexels-photo-5793651.jpeg?auto=compress&cs=tinysrgb&w=600',
        content: `COMMON GAIT DEVIATIONS

Identifying pathological gait patterns and their causes.

ANTALGIC GAIT
Description: Painful, limping gait with shortened stance phase on affected side
Causes: Hip/knee arthritis, joint injury, post-surgical
Key Feature: Quick weight transfer off painful limb

TRENDELENBURG GAIT
Description: Pelvis drops on swing side during stance
Causes: Hip abductor weakness (glute medius)
Key Feature: Lateral trunk lean toward stance leg to compensate

COMPENSATED TRENDELENBURG
Description: Trunk leans toward weak hip during stance
Causes: Same as Trendelenburg, but with compensation
Key Feature: No pelvic drop due to trunk lean

CIRCUMDUCTION GAIT
Description: Swing leg swings out to side in arc
Causes: Weak hip flexors, stiff knee, drop foot
Key Feature: Hip hiking and external rotation

STEPPAGE GAIT (Drop Foot)
Description: High knee lift to clear foot during swing
Causes: Peroneal nerve palsy, L4-L5 radiculopathy
Key Feature: Foot slap at initial contact

SCISSORING GAIT
Description: Legs cross midline during swing
Causes: Cerebral palsy, spasticity, adductor tightness
Key Feature: Narrow base of support

ATAXIC GAIT
Description: Uncoordinated, wide-based, staggering
Causes: Cerebellar dysfunction, vestibular disorders
Key Feature: Unable to walk heel-to-toe

PARKINSONIAN GAIT
Description: Shuffling, festinating (accelerating)
Causes: Parkinson's disease, parkinsonism
Key Features: Reduced arm swing, forward flexed posture

WADDLING GAIT
Description: Exaggerated trunk rotation, side-to-side
Causes: Bilateral hip weakness, muscular dystrophy
Key Feature: Bilateral Trendelenburg pattern

ASSESSMENT APPROACH:
1. Observe from all planes (sagittal, frontal, transverse)
2. Watch multiple cycles
3. Correlate with clinical findings
4. Consider compensations vs. primary deviations`,
      },
      {
        id: 4,
        title: 'Clinical Gait Assessment Protocol',
        duration: '35 min',
        type: 'lesson',
        image: 'https://images.pexels.com/photos/4506072/pexels-photo-4506072.jpeg?auto=compress&cs=tinysrgb&w=600',
        content: `CLINICAL GAIT ASSESSMENT PROTOCOL

Systematic approach to gait evaluation in clinical practice.

PREPARATION:
• Clear walkway (minimum 10 meters)
• Good lighting
• Patient in shorts and bare feet
• Camera/video setup (with consent)

STEP 1: STANDING ASSESSMENT
Before walking, assess:
• Posture
• Leg length discrepancy
• Joint alignment
• Muscle tone

STEP 2: OBSERVATION - SAGITTAL PLANE
Watch from the side for:
• Head/trunk position
• Hip flexion/extension range
• Knee flexion/extension pattern
• Ankle dorsiflexion/plantarflexion
• Step length symmetry
• Arm swing

STEP 3: OBSERVATION - FRONTAL PLANE
Watch from front and back for:
• Trunk lateral lean
• Pelvic drop/elevation
• Hip abduction/adduction
• Knee valgus/varus
• Foot pronation/supination
• Base of support width

STEP 4: OBSERVATION - TRANSVERSE PLANE
Watch from above/below for:
• Pelvic rotation
• Hip internal/external rotation
• Toe in/toe out angle
• Trunk counter-rotation

STEP 5: GAIT TIMING & DISTANCE
Measure:
• Cadence (steps per minute)
• Walking speed (meters per second)
• Step length (cm)
• Stride length (cm)
• Base of support (cm)

STEP 6: FUNCTIONAL TESTS
• Turn 180 degrees (count steps)
• Walk on heels
• Walk on toes
• Tandem walk (heel-to-toe)
• Walk backwards
• Stairs (ascent/descent)

STEP 7: VIDEO ANALYSIS
If available:
• Slow motion review
• Frame-by-frame analysis
• Joint angle measurement
• Comparison to baseline

DOCUMENTATION:
Record findings systematically, noting:
• Phase of gait affected
• Planes of deviation
• Potential causes
• Functional impact
• Treatment implications`,
      },
      {
        id: 5,
        title: 'Gait Analysis Quiz',
        duration: '15 min',
        type: 'quiz',
        questions: 15,
        passingScore: 70,
        topics: ['Gait Cycle', 'Kinematics', 'Deviations', 'Assessment'],
      },
    ],
  },
  'fms-course': {
    title: 'Functional Movement Screen (FMS)',
    description: 'Complete FMS certification preparation course covering all 7 tests, scoring criteria, corrective strategies, and clinical application.',
    icon: 'human-handsup',
    iconBg: '#FF8F00',
    level: 'Advanced',
    duration: '8 hours',
    instructor: 'WBA99 Performance',
    students: 2156,
    rating: 4.9,
    lessons: [
      {
        id: 1,
        title: 'FMS Philosophy & Principles',
        duration: '30 min',
        type: 'lesson',
        image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600',
        content: `FMS PHILOSOPHY & PRINCIPLES

Created by Gray Cook and Lee Burton, the FMS is a screening tool to identify movement pattern limitations.

CORE PRINCIPLES:
1. Movement is fundamental - screens basic patterns
2. Pain must be addressed first
3. Asymmetries increase injury risk
4. Movement quality before quantity
5. Correctives should address patterns, not parts

THE 7 MOVEMENT PATTERNS:
The FMS assesses fundamental human movements:
1. Deep Squat - bilateral, symmetrical
2. Hurdle Step - stepping/stride mechanics
3. Inline Lunge - deceleration, direction change
4. Shoulder Mobility - upper extremity function
5. ASLR - hip mobility with core stability
6. Trunk Stability Push-up - core stability with upper push
7. Rotary Stability - multi-plane core stability

SCORING SYSTEM:
3 = Can perform perfectly
2 = Can perform with compensation
1 = Cannot perform pattern
0 = Pain during movement

Total possible score: 21 points
Risk cut-off: Score < 14 = increased injury risk

KEY CONCEPTS:
• Don't add strength to dysfunction
• Find the weak link in the chain
• Address mobility before stability
• Primitive patterns support complex movements

WHO BENEFITS FROM FMS:
• Athletes (pre-season screening)
• Military/tactical populations
• Fitness clients
• Workers (job-specific screening)
• Rehabilitation (discharge planning)`,
      },
      {
        id: 2,
        title: 'Deep Squat Assessment',
        duration: '40 min',
        type: 'lesson',
        image: 'https://images.unsplash.com/photo-1651163586078-06e9e9867661?w=600',
        content: `DEEP SQUAT ASSESSMENT

The Deep Squat tests bilateral, symmetrical mobility of the hips, knees, and ankles.

EQUIPMENT:
• Dowel rod

STARTING POSITION:
• Feet shoulder-width apart, toes forward
• Dowel held overhead with elbows at 90°

MOVEMENT:
• Descend as deep as possible
• Heels remain on floor
• Dowel stays overhead
• Return to start

SCORING CRITERIA:

Score 3 (Perfect):
• Upper torso parallel to tibia
• Femur below horizontal
• Knees aligned over feet
• Dowel aligned over feet
• Heels on ground

Score 2 (Compensation):
Repeat with board under heels
• If achieves 3 criteria with heel lift = Score 2
• Compensations present

Score 1 (Dysfunction):
• Cannot achieve pattern even with heel lift
• Major compensations present

Score 0:
• Pain during movement

COMMON COMPENSATIONS:
• Forward trunk lean
• Heels rise
• Knees cave inward (valgus)
• Arms fall forward
• Low back rounds

MOVEMENT IMPLICATIONS:
Poor deep squat may indicate:
• Ankle dorsiflexion limitation
• Hip flexion limitation
• Thoracic spine stiffness
• Poor core stability

CORRECTIVE STRATEGIES:
• Ankle mobility drills
• Hip flexor stretching
• Thoracic spine mobility
• Goblet squat progressions
• Core stability work`,
      },
      {
        id: 3,
        title: 'Hurdle Step & Inline Lunge',
        duration: '45 min',
        type: 'lesson',
        image: 'https://images.unsplash.com/photo-1712068980119-bdeb8353d16c?w=600',
        content: `HURDLE STEP & INLINE LUNGE

Two patterns testing unilateral function and stride mechanics.

HURDLE STEP
Equipment: Hurdle (set at tibial tuberosity height), dowel

Starting Position:
• Toes touching base of hurdle
• Dowel across shoulders behind neck

Movement:
• Step over hurdle
• Touch heel to floor
• Return to start without touching hurdle
• Test both legs

Scoring:
3 - Hip, knee, ankle aligned; no movement of spine/dowel
2 - Alignment lost OR contact with hurdle
1 - Loss of balance OR contact with hurdle; cannot achieve
0 - Pain

Common Faults:
• Hip hiking (weak hip flexor)
• Leaning trunk (compensating for balance)
• Knee valgus (hip weakness)
• Losing balance

---

INLINE LUNGE
Equipment: 2x6 board, dowel

Starting Position:
• Both feet on board, one forward
• Distance between feet = tibial length
• Dowel behind back touching head, thoracic spine, sacrum
• Opposite hand to front foot holds dowel at head

Movement:
• Descend until back knee touches board
• Return to start
• Test both legs

Scoring:
3 - Dowel contacts maintained; no torso movement; knee touches board behind front heel
2 - Lost dowel contact OR torso movement
1 - Loss of balance
0 - Pain

Common Faults:
• Losing balance (core/hip stability)
• Knee deviation (hip weakness)
• Torso rotation (hip mobility)
• Heel rises (ankle mobility)

Combined Implications:
These tests assess:
• Single leg stance stability
• Hip flexor function
• Hip mobility
• Ankle stability
• Core control during movement`,
      },
      {
        id: 4,
        title: 'Shoulder Mobility & ASLR',
        duration: '40 min',
        type: 'lesson',
        image: 'https://images.pexels.com/photos/4506072/pexels-photo-4506072.jpeg?auto=compress&cs=tinysrgb&w=600',
        content: `SHOULDER MOBILITY & ASLR

Two tests assessing extremity mobility with core stability.

SHOULDER MOBILITY TEST
Equipment: Measuring device (ruler/tape)

Starting Position:
• Standing naturally

Movement:
• Make fist (thumb inside)
• One arm overhead, other behind back
• Reach toward each other
• Measure distance between fists
• Test both sides

Scoring:
3 - Fists within one hand length
2 - Fists within 1.5 hand lengths
1 - Fists not within 1.5 hand lengths
0 - Pain

Hand length = measured from wrist crease to fingertip

CLEARING TEST:
• Place hand on opposite shoulder
• Lift elbow without shrugging
• If PAIN = Score 0 for shoulder mobility

Common Issues:
• Asymmetry between sides
• Limited internal or external rotation
• Scapular dysfunction

---

ACTIVE STRAIGHT LEG RAISE (ASLR)
Equipment: Board (2x6), dowel

Starting Position:
• Supine, arms at sides
• Feet together, toes up
• Board under knees

Movement:
• Raise one leg with knee straight
• Keep opposite leg down
• Measure malleolus position relative to landmarks
• Test both legs

Scoring:
3 - Malleolus passes mid-thigh (between ASIS and knee joint line)
2 - Malleolus between mid-thigh and knee joint line
1 - Malleolus below knee joint line
0 - Pain

Key Observations:
• Knee stays straight
• Opposite leg stays down
• Low back doesn't arch

Common Issues:
• Hamstring tightness
• Hip flexor tightness (opposite leg lifts)
• Poor core control (back arches)

Clinical Correlation:
• ASLR limitation with good hamstring length = core stability issue
• ASLR limitation with poor hamstring length = flexibility issue`,
      },
      {
        id: 5,
        title: 'Trunk Stability Push-up & Rotary Stability',
        duration: '45 min',
        type: 'lesson',
        image: 'https://images.unsplash.com/photo-1655712779546-a1c0ea613cd8?w=600',
        content: `TRUNK STABILITY PUSH-UP & ROTARY STABILITY

Core stability tests assessing trunk control during movement.

TRUNK STABILITY PUSH-UP
Equipment: None

Starting Position (Men):
Score 3 attempt: Thumbs aligned with forehead
Score 2 attempt: Thumbs aligned with chin

Starting Position (Women):
Score 3 attempt: Thumbs aligned with chin
Score 2 attempt: Thumbs aligned with clavicle

Movement:
• Perform single push-up
• Body rises as unit (no sag or pike)
• Test appropriate hand position

Scoring:
3 - Performs at highest hand position
2 - Performs at modified hand position
1 - Unable to perform even at modified position
0 - Pain

CLEARING TEST:
• Prone press-up (extension)
• Push upper body up, keep pelvis down
• If PAIN = Score 0

Key Observations:
• Body stays rigid (no sagging)
• Symmetric movement
• No excessive hip hiking

---

ROTARY STABILITY TEST
Equipment: 2x6 board

Starting Position:
• Quadruped (hands and knees)
• Hands and knees on board
• Back flat, parallel to floor

Movement Level 1 (Score 3):
• Extend ipsilateral arm and leg (same side)
• Touch elbow to knee over board
• Return to start

Movement Level 2 (Score 2):
• Extend contralateral arm and leg (opposite)
• Touch elbow to knee over board
• Return to start

Scoring:
3 - Performs ipsilateral (same side) correctly
2 - Performs contralateral (diagonal) correctly
1 - Cannot perform diagonal pattern
0 - Pain

CLEARING TEST:
• Quadruped position
• Rock back toward heels (spine flexion)
• If PAIN = Score 0

Key Observations:
• No rotation of trunk
• Balance maintained
• Smooth movement pattern

Clinical Significance:
These tests assess:
• Anti-rotation strength
• Anti-extension control
• Multi-plane stability
• Core coordination`,
      },
      {
        id: 6,
        title: 'Corrective Exercise Programming',
        duration: '50 min',
        type: 'lesson',
        image: 'https://images.unsplash.com/photo-1648638810948-f3bf2cccdde9?w=600',
        content: `CORRECTIVE EXERCISE PROGRAMMING

Using FMS results to design targeted corrective programs.

CORRECTIVE FRAMEWORK:
1. Address pain first (refer if needed)
2. Restore mobility
3. Develop stability
4. Integrate patterns
5. Add load/complexity

CORRECTIVE PRIORITIES:
Address asymmetries before composite score

Example:
• Shoulder Mobility: Right = 2, Left = 3
• Address right side first

PATTERN-SPECIFIC CORRECTIVES:

DEEP SQUAT (Score 1 or 2):
Mobility Focus:
• Ankle mobilizations
• Hip flexor stretching
• Thoracic spine rotation
• Lat stretching

Stability/Motor Control:
• Goblet squat holds
• Box squat progressions
• Core activation during squat

HURDLE STEP (Score 1 or 2):
• Single leg balance
• Hip flexor strengthening
• Hip hiking correction
• Core stability with leg movement

INLINE LUNGE (Score 1 or 2):
• Split squat progressions
• Hip mobility work
• Core control in lunge
• Balance on unstable surfaces

SHOULDER MOBILITY (Score 1 or 2):
• Sleeper stretch
• Cross-body stretch
• Thoracic spine mobility
• Scapular stability exercises

ASLR (Score 1 or 2):
• Active stretching vs passive stretching
• Core bracing with leg raises
• Hip flexor activation
• Hamstring active flexibility

TRUNK STABILITY PUSH-UP (Score 1):
• Plank progressions
• Dead bugs
• Tall kneeling exercises
• Push-up regressions

ROTARY STABILITY (Score 1):
• Bird dogs
• Pallof press variations
• Anti-rotation holds
• Quadruped progressions

PROGRAM DESIGN:
• 2-4 corrective exercises before training
• Focus on weakest pattern
• Re-test every 4-6 weeks
• Progress when score improves`,
      },
      {
        id: 7,
        title: 'FMS Certification Quiz',
        duration: '25 min',
        type: 'quiz',
        questions: 30,
        passingScore: 80,
        topics: ['All 7 FMS Tests', 'Scoring', 'Clearing Tests', 'Correctives'],
      },
    ],
  },
  'anatomy': {
    title: 'Anatomy for Assessment',
    description: 'Essential anatomy knowledge for physiotherapists covering joints, muscles, and nerves with clinical correlation.',
    icon: 'human-male-board',
    iconBg: '#8E24AA',
    level: 'Beginner',
    duration: '8 hours',
    instructor: 'WBA99 Anatomy Team',
    students: 3241,
    rating: 4.8,
    lessons: [
      { id: 1, title: 'Musculoskeletal System Overview', duration: '30 min', type: 'lesson', image: 'https://images.pexels.com/photos/5793651/pexels-photo-5793651.jpeg?auto=compress&cs=tinysrgb&w=600', content: `MUSCULOSKELETAL SYSTEM OVERVIEW

THE SKELETAL SYSTEM
The adult human skeleton consists of 206 bones organized into:

AXIAL SKELETON (80 bones):
• Skull (22 bones) - cranial and facial bones
• Vertebral column (26 bones) - 7 cervical, 12 thoracic, 5 lumbar, sacrum, coccyx
• Thoracic cage (25 bones) - sternum and 24 ribs

APPENDICULAR SKELETON (126 bones):
• Upper limbs (64 bones) - shoulder girdle, arm, forearm, hand
• Lower limbs (62 bones) - pelvic girdle, thigh, leg, foot

BONE CLASSIFICATION BY SHAPE:
1. Long bones - femur, humerus, tibia (lever action)
2. Short bones - carpals, tarsals (stability)
3. Flat bones - skull, scapula, ribs (protection)
4. Irregular bones - vertebrae, pelvis (complex functions)
5. Sesamoid bones - patella (reduce friction)

JOINT CLASSIFICATION:

By Structure:
• Fibrous - sutures, syndesmosis (no movement/slight)
• Cartilaginous - symphysis, synchondrosis (limited movement)
• Synovial - freely movable joints

Synovial Joint Types:
1. Ball & socket - hip, shoulder (multi-axial)
2. Hinge - elbow, knee (flexion/extension)
3. Pivot - atlantoaxial (rotation)
4. Condyloid - wrist (biaxial)
5. Saddle - thumb CMC (biaxial)
6. Plane/Gliding - intercarpal (sliding)

MUSCLE TISSUE TYPES:
• Skeletal muscle - voluntary, striated
• Cardiac muscle - involuntary, striated
• Smooth muscle - involuntary, non-striated

SKELETAL MUSCLE STRUCTURE:
Muscle → Fascicle → Muscle fiber → Myofibril → Sarcomere

Key Proteins:
• Actin (thin filaments)
• Myosin (thick filaments)
• Titin (elastic component)

MUSCLE ACTIONS:
• Agonist (prime mover) - produces movement
• Antagonist - opposes movement
• Synergist - assists agonist
• Stabilizer/Fixator - stabilizes origin

CLINICAL RELEVANCE:
Understanding anatomy is essential for:
• Accurate assessment and diagnosis
• Safe and effective treatment
• Patient education
• Injury prevention strategies` },
      { id: 2, title: 'Shoulder Complex Anatomy', duration: '45 min', type: 'lesson', image: 'https://images.pexels.com/photos/4506072/pexels-photo-4506072.jpeg?auto=compress&cs=tinysrgb&w=600', content: `SHOULDER COMPLEX ANATOMY

The shoulder complex consists of 4 joints working together for maximum mobility.

1. GLENOHUMERAL (GH) JOINT
Type: Ball and socket synovial joint
Articulation: Humeral head + Glenoid fossa of scapula

Characteristics:
• Most mobile joint in the body
• Sacrifices stability for mobility
• Glenoid labrum deepens socket by 50%

Ligaments:
• Superior GH ligament - limits inferior translation
• Middle GH ligament - limits external rotation
• Inferior GH ligament - most important stabilizer
• Coracohumeral ligament - limits external rotation

Normal ROM:
• Flexion: 180°
• Extension: 45-60°
• Abduction: 180°
• Adduction: 30-45°
• Internal rotation: 70-90°
• External rotation: 90°

2. ACROMIOCLAVICULAR (AC) JOINT
Type: Plane synovial joint
Articulation: Acromion + Lateral clavicle

Ligaments:
• AC ligaments (superior/inferior) - horizontal stability
• Coracoclavicular ligaments:
  - Conoid (medial) - vertical stability
  - Trapezoid (lateral) - vertical stability

Clinical: AC joint sprains graded I-VI

3. STERNOCLAVICULAR (SC) JOINT
Type: Saddle synovial joint
Articulation: Medial clavicle + Manubrium + 1st costal cartilage

Only bony connection between upper limb and axial skeleton

Ligaments:
• Anterior/Posterior SC ligaments
• Interclavicular ligament
• Costoclavicular ligament

4. SCAPULOTHORACIC JOINT
Type: "Functional" joint (not true joint)
Articulation: Scapula glides on thoracic wall

Movements:
• Elevation/Depression
• Protraction/Retraction
• Upward/Downward rotation

ROTATOR CUFF MUSCLES (SITS):
• Supraspinatus - abduction initiation (0-15°)
• Infraspinatus - external rotation
• Teres minor - external rotation
• Subscapularis - internal rotation

Function: Dynamic stabilizers, compress humeral head into glenoid

OTHER KEY MUSCLES:
• Deltoid (anterior/middle/posterior)
• Pectoralis major
• Latissimus dorsi
• Trapezius (upper/middle/lower)
• Serratus anterior
• Rhomboids (major/minor)
• Levator scapulae

NERVE SUPPLY:
• Axillary nerve (C5-6) - deltoid, teres minor
• Suprascapular nerve (C5-6) - supraspinatus, infraspinatus
• Subscapular nerves - subscapularis, teres major
• Long thoracic nerve (C5-7) - serratus anterior
• Dorsal scapular nerve (C5) - rhomboids

BLOOD SUPPLY:
• Subclavian artery → Axillary artery
• Branches: Thoracoacromial, lateral thoracic, subscapular, circumflex humeral arteries` },
      { id: 3, title: 'Elbow & Wrist Anatomy', duration: '35 min', type: 'lesson', image: 'https://images.unsplash.com/photo-1648638810954-281a6439675b?w=600', content: `ELBOW & WRIST ANATOMY

ELBOW JOINT COMPLEX
The elbow consists of 3 articulations within one joint capsule:

1. HUMEROULNAR JOINT
Type: Hinge synovial joint
Articulation: Trochlea of humerus + Trochlear notch of ulna
Movement: Flexion/Extension

2. HUMERORADIAL JOINT
Type: Ball and socket (but functions as hinge)
Articulation: Capitulum of humerus + Radial head
Movement: Flexion/Extension

3. PROXIMAL RADIOULNAR JOINT
Type: Pivot synovial joint
Articulation: Radial head + Radial notch of ulna
Movement: Pronation/Supination

ELBOW LIGAMENTS:
• Medial (Ulnar) Collateral Ligament (MCL):
  - Anterior bundle (most important) - resists valgus
  - Posterior bundle
  - Transverse bundle
• Lateral (Radial) Collateral Ligament (LCL)
• Annular ligament - holds radial head

NORMAL ELBOW ROM:
• Flexion: 140-150°
• Extension: 0° (or slight hyperextension)
• Pronation: 80-90°
• Supination: 80-90°

CARRYING ANGLE:
• Normal: Males 5-10°, Females 10-15° valgus
• Cubitus valgus: Increased angle
• Cubitus varus: Decreased angle

ELBOW MUSCLES:
Flexors:
• Biceps brachii (also supinates)
• Brachialis (pure flexor)
• Brachioradialis

Extensors:
• Triceps brachii
• Anconeus

WRIST JOINT (RADIOCARPAL)
Type: Condyloid synovial joint
Articulation: Distal radius + Scaphoid, Lunate, Triquetrum

CARPAL BONES (8 total):
Proximal row (lateral to medial):
• Scaphoid - most commonly fractured
• Lunate - most commonly dislocated
• Triquetrum
• Pisiform (sesamoid)

Distal row (lateral to medial):
• Trapezium
• Trapezoid
• Capitate (largest)
• Hamate (has hook)

Mnemonic: "So Long To Pinky, Here Comes The Thumb"

WRIST LIGAMENTS:
• Palmar radiocarpal ligaments (stronger)
• Dorsal radiocarpal ligaments
• Radial/Ulnar collateral ligaments
• Intercarpal ligaments

WRIST ROM:
• Flexion: 80°
• Extension: 70°
• Radial deviation: 20°
• Ulnar deviation: 30°

CARPAL TUNNEL:
Boundaries:
• Floor: Carpal bones
• Roof: Flexor retinaculum

Contents (9 tendons + 1 nerve):
• Median nerve
• 4 FDS tendons
• 4 FDP tendons
• FPL tendon

NERVE SUPPLY:
• Median nerve - most of wrist/hand
• Ulnar nerve - medial hand
• Radial nerve - dorsal sensation` },
      { id: 4, title: 'Spine Anatomy', duration: '50 min', type: 'lesson', image: 'https://images.unsplash.com/photo-1641380140345-a8b91e58d4e0?w=600', content: `SPINE ANATOMY

VERTEBRAL COLUMN OVERVIEW
33 vertebrae total:
• 7 Cervical (C1-C7)
• 12 Thoracic (T1-T12)
• 5 Lumbar (L1-L5)
• 5 Sacral (fused into sacrum)
• 4 Coccygeal (fused into coccyx)

SPINAL CURVES:
• Cervical lordosis (secondary curve)
• Thoracic kyphosis (primary curve)
• Lumbar lordosis (secondary curve)
• Sacral kyphosis (primary curve)

TYPICAL VERTEBRA ANATOMY:
• Body (weight-bearing)
• Vertebral arch (protects spinal cord)
  - Pedicles (2)
  - Laminae (2)
• Processes:
  - Spinous process (1)
  - Transverse processes (2)
  - Articular processes (4)
• Vertebral foramen

CERVICAL VERTEBRAE (C1-C7)
Unique Features:
• Smallest bodies
• Transverse foramen (vertebral artery)
• Bifid spinous processes (C2-C6)

C1 (Atlas):
• No body, no spinous process
• Ring-shaped
• Supports skull

C2 (Axis):
• Dens (odontoid process)
• Allows head rotation

C7 (Vertebra Prominens):
• Long, non-bifid spinous process
• Easily palpable

THORACIC VERTEBRAE (T1-T12)
Unique Features:
• Costal facets for rib articulation
• Heart-shaped bodies
• Long, inferiorly pointing spinous processes
• Limited mobility due to rib cage

LUMBAR VERTEBRAE (L1-L5)
Unique Features:
• Largest bodies (weight-bearing)
• Short, thick spinous processes
• Wide vertebral canal
• No transverse foramen

INTERVERTEBRAL DISC
Structure:
• Nucleus pulposus (inner gel - 80% water)
• Annulus fibrosus (outer rings)

Functions:
• Shock absorption
• Allow spinal movement
• Maintain vertebral spacing

Disc Herniation:
• Posterolateral most common
• Can compress nerve roots

SPINAL LIGAMENTS:
• Anterior longitudinal ligament (ALL)
  - Limits extension
  - Strongest spinal ligament
• Posterior longitudinal ligament (PLL)
  - Limits flexion
  - Narrower, weaker
• Ligamentum flavum
  - Connects laminae
  - Very elastic
• Interspinous ligaments
• Supraspinous ligament
• Intertransverse ligaments

FACET (ZYGAPOPHYSEAL) JOINTS:
Type: Plane synovial joints

Orientation varies by region:
• Cervical: 45° - allows rotation
• Thoracic: 60° (frontal) - limits flexion
• Lumbar: 90° (sagittal) - limits rotation

SPINAL CORD & NERVES:
• Spinal cord ends at L1-L2 (conus medullaris)
• Cauda equina below L2
• 31 pairs of spinal nerves:
  - 8 cervical
  - 12 thoracic
  - 5 lumbar
  - 5 sacral
  - 1 coccygeal

MUSCLES:
Erector spinae group:
• Iliocostalis
• Longissimus
• Spinalis

Deep stabilizers:
• Multifidus
• Rotatores
• Transversus abdominis` },
      { id: 5, title: 'Hip & Pelvis Anatomy', duration: '45 min', type: 'lesson', image: 'https://images.unsplash.com/photo-1712068980119-bdeb8353d16c?w=600', content: `HIP & PELVIS ANATOMY

PELVIC GIRDLE
Composed of 3 bones:
• 2 Innominate (hip) bones
• Sacrum

Each innominate bone has 3 parts:
• Ilium (superior)
• Ischium (posteroinferior)
• Pubis (anteroinferior)

These fuse at the acetabulum by age 15-17.

PELVIC LANDMARKS:
Anterior:
• ASIS (Anterior Superior Iliac Spine)
• AIIS (Anterior Inferior Iliac Spine)
• Pubic tubercle
• Pubic symphysis

Posterior:
• PSIS (Posterior Superior Iliac Spine)
• PIIS (Posterior Inferior Iliac Spine)
• Ischial tuberosity
• Sacral promontory

SACROILIAC (SI) JOINT
Type: Synovial (anterior), Syndesmosis (posterior)
Articulation: Sacrum + Ilium

Characteristics:
• Minimal movement (2-4mm)
• Strong ligamentous support
• Transfers load between spine and lower limbs

SI Ligaments:
• Anterior SI ligament
• Posterior SI ligament
• Interosseous SI ligament (strongest)
• Sacrotuberous ligament
• Sacrospinous ligament

HIP JOINT (COXOFEMORAL)
Type: Ball and socket synovial joint
Articulation: Femoral head + Acetabulum

Characteristics:
• Very stable joint
• Acetabular labrum deepens socket
• Designed for weight-bearing

Ligaments:
• Iliofemoral (Y ligament of Bigelow)
  - Strongest ligament in body
  - Limits extension and external rotation
• Pubofemoral ligament
  - Limits abduction and extension
• Ischiofemoral ligament
  - Limits internal rotation and extension
• Ligamentum teres (ligament of head of femur)
  - Contains artery to femoral head

HIP ROM:
• Flexion: 120° (with knee flexed)
• Extension: 20-30°
• Abduction: 45°
• Adduction: 20-30°
• Internal rotation: 35-45°
• External rotation: 45°

HIP MUSCLES:

Flexors:
• Iliopsoas (primary flexor)
  - Iliacus
  - Psoas major
• Rectus femoris
• Sartorius
• TFL

Extensors:
• Gluteus maximus (primary)
• Hamstrings (semimembranosus, semitendinosus, biceps femoris)

Abductors:
• Gluteus medius (primary)
• Gluteus minimus
• TFL

Adductors:
• Adductor magnus
• Adductor longus
• Adductor brevis
• Gracilis
• Pectineus

External Rotators (Deep 6):
• Piriformis
• Obturator internus
• Obturator externus
• Gemellus superior
• Gemellus inferior
• Quadratus femoris

Internal Rotators:
• Gluteus medius (anterior fibers)
• Gluteus minimus
• TFL

NERVE SUPPLY:
• Femoral nerve (L2-4) - anterior thigh
• Obturator nerve (L2-4) - medial thigh
• Sciatic nerve (L4-S3) - posterior thigh
• Superior gluteal nerve (L4-S1) - glut med/min
• Inferior gluteal nerve (L5-S2) - glut max

BLOOD SUPPLY:
• Medial/Lateral circumflex femoral arteries
• Superior/Inferior gluteal arteries
• Obturator artery` },
      { id: 6, title: 'Knee & Lower Leg Anatomy', duration: '40 min', type: 'lesson', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600', content: `KNEE & LOWER LEG ANATOMY

KNEE JOINT COMPLEX
The knee is the largest and most complex joint in the body.

ARTICULATIONS:
1. Tibiofemoral joint
   Type: Modified hinge (allows some rotation)
   Articulation: Femoral condyles + Tibial plateau

2. Patellofemoral joint
   Type: Plane synovial
   Articulation: Patella + Femoral trochlea

MENISCI (Fibrocartilage):
Medial Meniscus:
• C-shaped
• Attached to MCL
• Less mobile
• More commonly injured

Lateral Meniscus:
• O-shaped
• Not attached to LCL
• More mobile
• Protected by popliteus

Functions:
• Shock absorption
• Load distribution
• Joint stability
• Lubrication

LIGAMENTS:

Cruciate Ligaments (intra-articular):
• ACL (Anterior Cruciate Ligament)
  - Prevents anterior tibial translation
  - Prevents excessive rotation
  - Blood supply poor (slow healing)
  
• PCL (Posterior Cruciate Ligament)
  - Prevents posterior tibial translation
  - Strongest knee ligament

Collateral Ligaments (extra-articular):
• MCL (Medial Collateral Ligament)
  - Resists valgus stress
  - Attached to medial meniscus
  
• LCL (Lateral Collateral Ligament)
  - Resists varus stress
  - Cord-like structure

KNEE ROM:
• Flexion: 135-150°
• Extension: 0° (5-10° hyperextension normal)
• Internal rotation: 10° (knee flexed)
• External rotation: 20-30° (knee flexed)

SCREW-HOME MECHANISM:
• Terminal extension causes automatic external rotation of tibia
• Locks knee in full extension
• Popliteus unlocks knee to initiate flexion

MUSCLES:

Quadriceps (knee extensors):
• Rectus femoris (only biarticular)
• Vastus medialis (VMO)
• Vastus lateralis
• Vastus intermedius

Hamstrings (knee flexors):
• Biceps femoris
• Semimembranosus
• Semitendinosus

Other:
• Popliteus - unlocks knee, internal rotation
• Gastrocnemius - weak knee flexor

PATELLA:
• Largest sesamoid bone
• Increases mechanical advantage of quadriceps by 50%
• Q-angle: Normal 10-15° (females slightly higher)

LEG COMPARTMENTS:

Anterior Compartment:
• Tibialis anterior
• Extensor hallucis longus
• Extensor digitorum longus
• Peroneus tertius
• Deep peroneal nerve
• Anterior tibial artery

Lateral Compartment:
• Peroneus longus
• Peroneus brevis
• Superficial peroneal nerve

Posterior Compartment:
Superficial:
• Gastrocnemius
• Soleus
• Plantaris

Deep:
• Tibialis posterior
• Flexor digitorum longus
• Flexor hallucis longus
• Popliteus
• Tibial nerve
• Posterior tibial artery

NERVE SUPPLY:
• Femoral nerve (L2-4) - quadriceps
• Sciatic nerve splits into:
  - Tibial nerve (L4-S3)
  - Common peroneal nerve (L4-S2)` },
      { id: 7, title: 'Ankle & Foot Anatomy', duration: '35 min', type: 'lesson', image: 'https://images.unsplash.com/photo-1651163586078-06e9e9867661?w=600', content: `ANKLE & FOOT ANATOMY

ANKLE JOINT (TALOCRURAL)
Type: Hinge synovial joint
Articulation: Distal tibia/fibula + Talus (ankle mortise)

Movement:
• Dorsiflexion: 20°
• Plantarflexion: 50°

Mortise Stability:
• Medial malleolus (tibia)
• Lateral malleolus (fibula - extends further distally)
• Talus wider anteriorly (more stable in dorsiflexion)

ANKLE LIGAMENTS:

Lateral Ligaments (commonly injured):
• ATFL (Anterior Talofibular Ligament)
  - Most commonly sprained
  - Weakest lateral ligament
  - Tests: Anterior drawer
  
• CFL (Calcaneofibular Ligament)
  - Second most commonly injured
  - Tests: Talar tilt
  
• PTFL (Posterior Talofibular Ligament)
  - Strongest lateral ligament
  - Rarely injured alone

Medial Ligament (Deltoid):
• Very strong, fan-shaped
• 4 parts: tibionavicular, tibiocalcaneal, anterior/posterior tibiotalar
• Resists eversion

SUBTALAR JOINT
Type: Plane synovial
Articulation: Talus + Calcaneus

Movements:
• Inversion: 20-35°
• Eversion: 10-15°

TRANSVERSE TARSAL JOINT (CHOPART)
Consists of:
• Talonavicular joint
• Calcaneocuboid joint

Allows pronation/supination of forefoot

TARSAL BONES (7):
• Talus (no muscle attachments)
• Calcaneus (largest)
• Navicular
• Cuboid
• Cuneiforms (medial, intermediate, lateral)

METATARSALS (5):
• 1st: Largest, bears most weight
• 2nd: Longest
• 5th: Tuberosity (peroneus brevis insertion)

PHALANGES (14):
• Great toe: 2 (proximal, distal)
• Toes 2-5: 3 each (proximal, middle, distal)

FOOT ARCHES:

Medial Longitudinal Arch:
• Highest arch
• Calcaneus → Talus → Navicular → Cuneiforms → Metatarsals 1-3
• Key support: Spring ligament, tibialis posterior
• "Shock absorber"

Lateral Longitudinal Arch:
• Lower, more rigid
• Calcaneus → Cuboid → Metatarsals 4-5
• Support: Long/short plantar ligaments

Transverse Arch:
• At metatarsal heads
• Support: Peroneus longus, transverse ligaments

PLANTAR FASCIA:
• Thick fibrous band
• Origin: Calcaneal tuberosity
• Insertion: Proximal phalanges
• Windlass mechanism: Toe extension tightens fascia

MUSCLES:

Extrinsic (from leg):
• Tibialis anterior (dorsiflexion, inversion)
• Tibialis posterior (plantarflexion, inversion)
• Peroneus longus/brevis (eversion)
• Gastrocnemius/Soleus (plantarflexion)
• FDL, FHL, EDL, EHL (toe movement)

Intrinsic (4 layers):
Layer 1: Abductor hallucis, flexor digitorum brevis, abductor digiti minimi
Layer 2: Quadratus plantae, lumbricals
Layer 3: Flexor hallucis brevis, adductor hallucis, flexor digiti minimi
Layer 4: Interossei (plantar and dorsal)

NERVE SUPPLY:
• Tibial nerve → Medial/Lateral plantar nerves (sole)
• Deep peroneal nerve (1st web space)
• Superficial peroneal nerve (dorsum)
• Sural nerve (lateral foot)

BLOOD SUPPLY:
• Posterior tibial artery → Plantar arteries
• Dorsalis pedis artery (palpable on dorsum)` },
      { id: 8, title: 'Anatomy Quiz', duration: '20 min', type: 'quiz', questions: 40, passingScore: 70, topics: ['All regions'] },
    ],
  },
  'electrotherapy': {
    title: 'Electrotherapy Fundamentals',
    description: 'Complete guide to TENS, IFT, Ultrasound, and other therapeutic electrical modalities.',
    icon: 'flash',
    iconBg: '#00ACC1',
    level: 'Intermediate',
    duration: '7 hours',
    instructor: 'WBA99 Modalities',
    students: 1876,
    rating: 4.6,
    lessons: [
      { id: 1, title: 'Introduction to Electrotherapy', duration: '25 min', type: 'lesson', image: 'https://images.pexels.com/photos/5793651/pexels-photo-5793651.jpeg?auto=compress&cs=tinysrgb&w=600', content: `INTRODUCTION TO ELECTROTHERAPY

WHAT IS ELECTROTHERAPY?
Electrotherapy is the use of electrical energy for therapeutic purposes in rehabilitation and pain management.

BASIC ELECTRICAL CONCEPTS:

Current (I):
• Measured in Amperes (A) or milliamperes (mA)
• Flow of electrons through a conductor
• Types: Direct Current (DC), Alternating Current (AC)

Voltage (V):
• Measured in Volts (V)
• Electrical pressure or potential difference
• Drives current through tissue

Resistance (R):
• Measured in Ohms (Ω)
• Opposition to current flow
• Varies by tissue type

Ohm's Law: V = I × R

TYPES OF ELECTRICAL CURRENT:

1. Direct Current (DC):
• Continuous, unidirectional flow
• Used for: Iontophoresis, wound healing
• Examples: Galvanic stimulation

2. Alternating Current (AC):
• Bidirectional, cyclical flow
• Frequency measured in Hz
• Used for: TENS, IFT, muscle stimulation

3. Pulsed Current:
• Interrupted current flow
• Can be DC or AC based
• Most commonly used in therapy

WAVEFORM PARAMETERS:

Phase Duration (Pulse Width):
• Duration of each phase (microseconds)
• Affects depth of penetration
• Longer = deeper, more motor recruitment

Frequency (Hz):
• Number of pulses per second
• Low frequency: 1-10 Hz (motor, endorphin)
• High frequency: 50-150 Hz (sensory, gate control)

Amplitude (Intensity):
• Strength of current
• Measured in mA
• Determines sensory/motor response

TISSUE IMPEDANCE:
• Fat: High resistance
• Muscle: Low resistance
• Bone: Very high resistance
• Nerve: Low resistance

PHYSIOLOGICAL EFFECTS:
1. Sensory nerve stimulation
2. Motor nerve stimulation
3. Chemical effects (ion movement)
4. Thermal effects (deep heating)

GENERAL CONTRAINDICATIONS:
• Pacemakers/implanted devices
• Over malignancy
• Pregnancy (over abdomen)
• Active hemorrhage
• Thrombophlebitis
• Infection
• Skin conditions at electrode site` },
      { id: 2, title: 'TENS Therapy', duration: '40 min', type: 'lesson', image: 'https://images.pexels.com/photos/4506072/pexels-photo-4506072.jpeg?auto=compress&cs=tinysrgb&w=600', content: `TENS - TRANSCUTANEOUS ELECTRICAL NERVE STIMULATION

MECHANISM OF ACTION:

1. Gate Control Theory (High Frequency TENS):
• Stimulates large diameter Aβ sensory fibers
• "Closes the gate" at spinal cord level
• Blocks pain signal transmission to brain
• Fast onset, short duration relief

2. Endogenous Opioid Release (Low Frequency TENS):
• Stimulates Aδ and C fibers
• Triggers release of endorphins and enkephalins
• Slower onset, longer lasting relief
• Similar to acupuncture analgesia

TYPES OF TENS:

1. Conventional (High Frequency) TENS:
• Frequency: 50-150 Hz
• Pulse width: 50-100 μs
• Intensity: Sensory level (tingling)
• Duration: 20-60 min, can use continuously
• Onset: Immediate
• Mechanism: Gate control

2. Acupuncture-like (Low Frequency) TENS:
• Frequency: 1-10 Hz
• Pulse width: 200-300 μs
• Intensity: Motor level (muscle twitch)
• Duration: 20-30 min
• Onset: Delayed (15-30 min)
• Mechanism: Endorphin release

3. Burst Mode TENS:
• Bursts of high frequency pulses
• Delivered at low frequency rate
• Combines benefits of both modes
• Good for chronic pain

4. Brief Intense TENS:
• Frequency: 100-150 Hz
• Pulse width: 150-250 μs
• Intensity: Highest tolerable
• Duration: 15-30 min
• Used before painful procedures

ELECTRODE PLACEMENT:

Options:
1. Over painful area (local)
2. Along dermatome of pain
3. Over peripheral nerve supplying area
4. Contralateral to pain
5. Acupuncture/trigger points

Spacing:
• Minimum 1 inch (2.5 cm) apart
• Larger spacing = deeper stimulation

CLINICAL APPLICATIONS:
• Acute pain (post-operative)
• Chronic pain (low back pain)
• Arthritis
• Neuropathic pain
• Labor pain
• Phantom limb pain

TENS CONTRAINDICATIONS:
• Pacemaker (especially demand-type)
• Over carotid sinus
• During pregnancy (over uterus)
• Epilepsy (not over neck)
• Over eyes
• Over larynx
• Impaired sensation (use caution)

ADVANTAGES:
• Non-invasive
• Few side effects
• Patient can self-administer
• Cost-effective
• No drug interactions` },
      { id: 3, title: 'Interferential Therapy (IFT)', duration: '35 min', type: 'lesson', image: 'https://images.unsplash.com/photo-1648638810954-281a6439675b?w=600', content: `INTERFERENTIAL THERAPY (IFT)

PRINCIPLES OF IFT:
IFT uses two medium-frequency currents that "interfere" with each other in the tissues to produce a therapeutic beat frequency.

HOW IT WORKS:
• Two circuits with slightly different frequencies
• Example: Circuit 1 = 4000 Hz, Circuit 2 = 4100 Hz
• When currents cross in tissue, they create a beat frequency
• Beat frequency = difference = 100 Hz
• This low-frequency beat produces therapeutic effect

WHY USE MEDIUM FREQUENCY?
• Lower skin impedance at higher frequencies
• Less sensory discomfort
• Deeper tissue penetration
• Can deliver higher current intensities comfortably

ELECTRODE ARRANGEMENTS:

1. Quadripolar (4-pole):
• Two sets of electrodes creating an X pattern
• Currents intersect at target tissue
• Best depth and crossover effect
• Most common clinical setup

2. Bipolar (2-pole/Premodulated):
• Interference created within machine
• Single pair of electrodes
• Easier to apply
• Less depth of effect

TREATMENT PARAMETERS:

Beat Frequencies:
• 1-10 Hz: Stimulates muscle contraction, endorphin release
• 10-25 Hz: Muscle relaxation, spasm reduction
• 25-50 Hz: Circulation enhancement
• 50-100 Hz: Pain control (gate mechanism)
• 80-100 Hz: Most common for pain relief

Sweep/Spectrum:
• Varies beat frequency automatically
• Prevents accommodation
• Example: 80-100 Hz sweep

Treatment Time:
• Acute: 10-15 minutes
• Chronic: 15-30 minutes
• Can be used daily

PHYSIOLOGICAL EFFECTS:

1. Pain Modulation:
• Gate control (high frequency)
• Endorphin release (low frequency)

2. Muscle Effects:
• Muscle relaxation
• Reduction of spasm
• Muscle strengthening (low frequency)

3. Circulatory Effects:
• Increased blood flow
• Reduced edema
• Enhanced healing

CLINICAL APPLICATIONS:
• Acute and chronic pain
• Muscle spasm
• Joint stiffness
• Soft tissue injuries
• Post-surgical rehabilitation
• Sports injuries
• Circulatory disorders

CONTRAINDICATIONS:
• Pacemakers
• Over pregnant uterus
• Malignancy
• Active hemorrhage
• Thrombosis/thrombophlebitis
• Metal implants (precaution)
• Impaired sensation

ADVANTAGES OVER TENS:
• Deeper penetration
• More comfortable at higher intensities
• Treats larger areas
• Better for deep structures` },
      { id: 4, title: 'Therapeutic Ultrasound', duration: '45 min', type: 'lesson', image: 'https://images.unsplash.com/photo-1641380140345-a8b91e58d4e0?w=600', content: `THERAPEUTIC ULTRASOUND

WHAT IS ULTRASOUND?
Therapeutic ultrasound uses high-frequency sound waves (beyond human hearing) to produce thermal and non-thermal effects in tissues.

PHYSICS OF ULTRASOUND:

Frequency:
• 1 MHz: Deep tissues (3-5 cm depth)
• 3 MHz: Superficial tissues (1-2 cm depth)
• Higher frequency = less penetration

Sound Wave Properties:
• Longitudinal compression waves
• Require medium to travel (coupling gel)
• Absorbed by tissues at different rates

TISSUE ABSORPTION:
High absorption (most heating):
• Bone periosteum
• Tendons
• Ligaments
• Joint capsule
• Scar tissue

Low absorption:
• Fat
• Blood
• Cartilage

ULTRASOUND EFFECTS:

Thermal Effects:
• Deep tissue heating
• Increased blood flow
• Enhanced tissue extensibility
• Reduced muscle spasm
• Increased collagen flexibility

Non-Thermal Effects:
• Cavitation (stable/unstable)
• Acoustic streaming
• Microstreaming
• Enhanced cell membrane permeability
• Accelerated healing

TREATMENT PARAMETERS:

Duty Cycle:
• Continuous (100%): Thermal effects
• Pulsed (20-50%): Non-thermal effects

Intensity:
• Low: 0.1-0.5 W/cm²
• Medium: 0.5-1.5 W/cm²
• High: 1.5-2.0 W/cm²

Acute conditions: Pulsed, low intensity
Chronic conditions: Continuous, higher intensity

Treatment Area:
• ERA (Effective Radiating Area) = sound head size
• Treat 2x ERA in 5 minutes
• Keep sound head moving (1-4 cm/sec)

Treatment Duration:
• Acute: 3-5 minutes
• Chronic: 5-10 minutes
• Large areas: May need longer

APPLICATION TECHNIQUE:

1. Direct Contact:
• Coupling gel on skin
• Sound head in contact
• Circular or linear strokes
• Most common method

2. Underwater:
• For irregular surfaces (hands, feet)
• Water at 1-3 cm distance
• No air bubbles

3. Gel Pad/Bladder:
• For irregular surfaces
• Maintains coupling

CLINICAL INDICATIONS:
• Soft tissue injuries (sprains, strains)
• Tendinopathies
• Bursitis
• Joint contractures
• Scar tissue
• Trigger points
• Muscle spasm
• Fracture healing (low intensity pulsed)

CONTRAINDICATIONS:
Absolute:
• Over malignancy
• Over eyes
• Over testes/ovaries
• Over pregnant uterus
• Over pacemaker
• Active hemorrhage
• Thrombophlebitis

Relative:
• Metal implants
• Acute inflammation (use pulsed)
• Bone fracture (depends on stage)
• Epiphyseal plates in children

PHONOPHORESIS:
• Using ultrasound to drive medications into tissue
• Common drugs: Hydrocortisone, lidocaine
• Coupling medium contains drug
• Enhanced transdermal delivery` },
      { id: 5, title: 'NMES & Russian Current', duration: '30 min', type: 'lesson', image: 'https://images.unsplash.com/photo-1712068980119-bdeb8353d16c?w=600', content: `NEUROMUSCULAR ELECTRICAL STIMULATION (NMES)

DEFINITION:
NMES is the application of electrical current to produce muscle contraction for strengthening, re-education, or preventing atrophy.

MECHANISM:
• Electrical current depolarizes motor nerves
• Causes muscle contraction
• Bypasses voluntary control
• Recruits Type II fibers first (opposite of voluntary)

PARAMETERS FOR STRENGTH:

Frequency:
• 35-80 Hz for tetanic contraction
• 50 Hz most common

Pulse Duration:
• 200-400 μs (microseconds)
• Longer for larger muscles

On/Off Time:
• On time: 10-15 seconds
• Off time: 50-120 seconds
• Ratio 1:3 to 1:5 for strengthening
• Prevents fatigue

Ramp:
• Gradual increase/decrease of intensity
• 2-4 seconds ramp up/down
• More comfortable, prevents injury

Intensity:
• Maximum tolerable
• Must produce strong contraction
• 50-60% MVC minimum for strengthening

RUSSIAN CURRENT (MEDIUM FREQUENCY):

Developed by Yakov Kots in 1970s.

Characteristics:
• 2500 Hz carrier frequency
• Delivered in 50 bursts per second
• 10 ms on, 10 ms off (50% duty cycle)
• Produces tetanic contraction at 50 Hz

Advantages:
• Comfortable at high intensities
• Deep muscle penetration
• Effective for strengthening
• Less sensory stimulation

Traditional Parameters:
• 10 sec on, 50 sec off (1:5)
• 10 contractions per session
• 10 sessions for strengthening program

CLINICAL APPLICATIONS:

1. Muscle Strengthening:
• Post-surgical quadriceps weakness
• ACL reconstruction rehab
• Patellofemoral syndrome
• General weakness

2. Muscle Re-education:
• Post-stroke motor learning
• After prolonged immobilization
• Muscle inhibition

3. Atrophy Prevention:
• During immobilization
• Post-injury
• Bed rest

4. Spasticity Management:
• Stimulation of antagonist muscles
• Reciprocal inhibition

5. Range of Motion:
• Functional electrical stimulation (FES)
• Active assisted movement

ELECTRODE PLACEMENT:
• Motor point - most efficient contraction
• Over muscle belly
• Along muscle fibers
• One electrode proximal, one distal

MOTOR POINTS:
• Location where motor nerve enters muscle
• Requires least current for contraction
• Usually at muscle belly, proximal 1/3
• Use motor point charts

CONTRAINDICATIONS:
• Pacemakers
• Over carotid sinus
• Active cancer
• Pregnancy (over uterus)
• Areas of hemorrhage
• Thrombosis

PRECAUTIONS:
• Impaired sensation
• Skin irritation
• Patient inability to communicate
• Cognitive impairment` },
      { id: 6, title: 'Contraindications & Safety', duration: '25 min', type: 'lesson', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600', content: `ELECTROTHERAPY CONTRAINDICATIONS & SAFETY

ABSOLUTE CONTRAINDICATIONS:
These conditions mean the modality should NEVER be used.

1. PACEMAKERS & IMPLANTED DEVICES:
• Cardiac pacemakers (especially demand-type)
• Implanted defibrillators
• Insulin pumps
• Spinal cord stimulators
• Cochlear implants
Risk: Interference with device function, malfunction

2. OVER MALIGNANCY:
• Known or suspected cancer
• Metastatic disease
Risk: May increase blood flow, potentially spreading cancer cells

3. PREGNANCY:
• Over the pregnant uterus
• Low back and abdomen
Risk: Unknown effects on fetus, potential uterine contraction

4. OVER CAROTID SINUS:
• Anterior neck/throat area
Risk: Vasovagal response, blood pressure drop, syncope

5. ACTIVE HEMORRHAGE:
• Bleeding disorders
• Recent injury with bleeding
Risk: Increased blood flow may worsen bleeding

6. THROMBOPHLEBITIS/DVT:
• Blood clots in veins
• Suspected DVT
Risk: Dislodging clot, pulmonary embolism

RELATIVE CONTRAINDICATIONS:
Use with caution, modify treatment, or avoid in specific areas.

1. IMPAIRED SENSATION:
• Diabetes neuropathy
• Stroke
• Spinal cord injury
Risk: Cannot provide feedback on intensity, may cause burns

2. IMPAIRED COGNITION:
• Dementia
• Confusion
• Communication barriers
Risk: Cannot report problems

3. METAL IMPLANTS:
• Joint replacements
• Plates and screws
• Surgical clips
Risk: May concentrate current, potential heating

4. SKIN CONDITIONS:
• Open wounds
• Rashes
• Dermatitis
Risk: Skin damage, increased current concentration

5. INFECTION:
• Local infection
• Fever
Risk: May spread infection, increase inflammation

6. EPILEPSY:
• Avoid head and neck stimulation
Risk: May trigger seizure

SPECIFIC PRECAUTIONS BY MODALITY:

TENS:
• Avoid over eyes
• Avoid over larynx/pharynx
• Avoid over areas with reduced sensation
• Check skin before and after

ULTRASOUND:
• Avoid over eyes, testes, ovaries
• Avoid over epiphyseal plates in children
• Never apply without coupling medium
• Never apply to stationary head (hot spots)
• Avoid over spinal cord post-laminectomy
• Avoid over joint replacements (cement heating)

IFT:
• Check for skin reactions
• Don't cross currents over heart
• Avoid over metal implants

NMES:
• Ensure adequate muscle mass
• Start with low intensity
• Monitor for fatigue
• Check skin condition

SAFETY PROTOCOLS:

Pre-Treatment:
• Review medical history
• Check contraindications
• Inspect skin condition
• Test sensation
• Explain procedure to patient
• Obtain informed consent

During Treatment:
• Start with low parameters
• Monitor patient response
• Watch for adverse reactions
• Stay in communication

Post-Treatment:
• Inspect treatment area
• Document response
• Educate patient on self-monitoring
• Schedule follow-up

ADVERSE REACTIONS:
• Skin burns
• Skin irritation/rash
• Pain increase
• Dizziness
• Nausea
• Muscle soreness

DOCUMENTATION:
• Treatment date and time
• Modality used
• Parameters (frequency, intensity, duration)
• Electrode placement
• Patient response
• Any adverse reactions` },
      { id: 7, title: 'Electrotherapy Quiz', duration: '15 min', type: 'quiz', questions: 25, passingScore: 75, topics: ['TENS', 'IFT', 'Ultrasound', 'Safety'] },
    ],
  },
  'exercise-rx': {
    title: 'Exercise Prescription',
    description: 'Evidence-based exercise programming for rehabilitation and performance enhancement.',
    icon: 'dumbbell',
    iconBg: '#5E35B1',
    level: 'Advanced',
    duration: '10 hours',
    instructor: 'WBA99 Performance',
    students: 2089,
    rating: 4.9,
    lessons: [
      { id: 1, title: 'Principles of Exercise Prescription', duration: '35 min', type: 'lesson', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600', content: `PRINCIPLES OF EXERCISE PRESCRIPTION

THE FITT-VP PRINCIPLE:
A framework for designing safe and effective exercise programs.

F - FREQUENCY:
• How often exercise is performed
• Depends on: Goals, fitness level, recovery capacity
• General guidelines:
  - Aerobic: 3-5 days/week
  - Strength: 2-4 days/week
  - Flexibility: Daily or 2-3x/week

I - INTENSITY:
• How hard the exercise is
• Methods to measure:
  - Heart rate (% HRmax, HRR)
  - RPE (Rate of Perceived Exertion)
  - %1RM for resistance training
  - METs (Metabolic Equivalents)

T - TIME:
• Duration of exercise session
• Aerobic: 20-60 minutes
• Strength: 20-60 minutes
• Flexibility: Hold 15-60 seconds

T - TYPE:
• Mode of exercise
• Specific to goals
• Consider: Preference, equipment access, limitations

V - VOLUME:
• Total amount of exercise
• Sets × Reps × Load (strength)
• Duration × Frequency (aerobic)

P - PROGRESSION:
• Gradual increase in demands
• Avoid too rapid progression
• 10% rule for aerobic volume

PRINCIPLES OF TRAINING:

1. Specificity (SAID Principle):
• Specific Adaptation to Imposed Demands
• Training must be specific to goal
• Energy system specific
• Movement pattern specific

2. Overload:
• Must exceed current capacity to adapt
• Progressive increase in stress
• Methods: Increase load, volume, frequency

3. Progression:
• Systematic increase in training demands
• Allows continued adaptation
• Avoid plateaus

4. Reversibility:
• "Use it or lose it"
• Detraining occurs without stimulus
• Aerobic fitness lost faster than strength

5. Individuality:
• Each person responds differently
• Genetics, training history, age affect response
• Customize programs

6. Recovery:
• Adaptation occurs during rest
• Adequate sleep (7-9 hours)
• Nutrition timing
• Active recovery

GENERAL ADAPTATION SYNDROME (GAS):
Hans Selye's model of stress response:

Phase 1 - Alarm:
• Initial response to training stress
• Temporary decrease in performance
• Inflammatory response

Phase 2 - Resistance:
• Body adapts to stress
• Performance improves
• Supercompensation

Phase 3 - Exhaustion:
• If stress continues without recovery
• Overtraining occurs
• Performance declines

SETTING GOALS:
Use SMART goals:
• Specific
• Measurable
• Achievable
• Relevant
• Time-bound

EXERCISE PRESCRIPTION COMPONENTS:
1. Warm-up (5-10 min)
2. Conditioning (20-60 min)
3. Cool-down (5-10 min)
4. Flexibility work

SPECIAL POPULATIONS:
Modify programs for:
• Older adults
• Pregnant women
• Cardiac patients
• Diabetics
• Pediatric patients` },
      { id: 2, title: 'Strength Training Fundamentals', duration: '45 min', type: 'lesson', image: 'https://images.pexels.com/photos/5793651/pexels-photo-5793651.jpeg?auto=compress&cs=tinysrgb&w=600', content: `STRENGTH TRAINING FUNDAMENTALS

MUSCLE FIBER TYPES:

Type I (Slow-Twitch):
• Fatigue resistant
• Oxidative metabolism
• Endurance activities
• Smaller cross-sectional area
• Red in color (myoglobin)

Type IIa (Fast-Twitch Oxidative):
• Moderate fatigue resistance
• Both aerobic and anaerobic
• Intermediate power
• Can convert to Type I with training

Type IIx (Fast-Twitch Glycolytic):
• Low fatigue resistance
• Anaerobic metabolism
• High power output
• Largest fibers
• Pale in color

STRENGTH TRAINING VARIABLES:

1. Load (Intensity):
• Expressed as %1RM
• Light: <67% 1RM (≥12 reps)
• Moderate: 67-85% 1RM (6-12 reps)
• Heavy: >85% 1RM (≤6 reps)

2. Volume:
• Sets × Reps × Load
• Beginners: 1-3 sets
• Intermediate: 3-4 sets
• Advanced: 4-6+ sets

3. Rest Periods:
• Strength/Power: 2-5 minutes
• Hypertrophy: 1-2 minutes
• Endurance: <1 minute

4. Frequency:
• Each muscle group: 2-3x/week
• Allow 48-72 hours between sessions
• Split routines for advanced

REP RANGES FOR GOALS:

Strength:
• 1-6 reps @ 85-100% 1RM
• Long rest (3-5 min)
• Neural adaptations primary

Hypertrophy (Size):
• 8-12 reps @ 67-85% 1RM
• Moderate rest (1-2 min)
• Time under tension important

Muscular Endurance:
• 15-25+ reps @ <67% 1RM
• Short rest (<1 min)
• Metabolic stress

EXERCISE SELECTION:

Compound (Multi-joint):
• Squat, deadlift, bench press
• Multiple muscles involved
• Greater hormonal response
• More functional

Isolation (Single-joint):
• Bicep curl, leg extension
• Target specific muscles
• Good for weak points
• Rehab applications

EXERCISE ORDER:
1. Compound before isolation
2. Large muscle groups before small
3. High skill before low skill
4. Power exercises first (if included)
5. Alternating push/pull

PROGRESSION METHODS:

Linear Progression:
• Add weight each session
• Best for beginners
• Example: Add 5 lbs/week

Double Progression:
• First increase reps
• Then increase load
• Example: 8 reps → 12 reps → increase weight

Undulating Periodization:
• Vary intensity within week
• Heavy/Light/Moderate days

TEMPO:
Format: Eccentric/Pause/Concentric/Pause
• Example: 3/1/2/0
• Eccentric: Muscle lengthening (lowering)
• Concentric: Muscle shortening (lifting)
• Longer eccentric = more muscle damage (hypertrophy)

BREATHING:
• Exhale on exertion (concentric)
• Inhale on eccentric
• Valsalva for heavy lifts (trained individuals)

COMMON MISTAKES:
• Too much volume too soon
• Poor form for heavier loads
• Neglecting compound movements
• Inadequate rest periods
• Not tracking progress` },
      { id: 3, title: 'Periodization Concepts', duration: '40 min', type: 'lesson', image: 'https://images.pexels.com/photos/4506072/pexels-photo-4506072.jpeg?auto=compress&cs=tinysrgb&w=600', content: `PERIODIZATION CONCEPTS

WHAT IS PERIODIZATION?
Systematic planning of athletic training that involves progressive cycling of various aspects of a training program during a specific period.

PURPOSE:
• Prevent overtraining
• Peak for competition
• Ensure continued adaptation
• Manage fatigue and recovery
• Address multiple fitness qualities

PERIODIZATION PERIODS:

Macrocycle:
• Longest training period
• Usually 1 year or competition season
• Contains multiple mesocycles
• Overall program structure

Mesocycle:
• 3-6 weeks typically
• Focused on specific quality
• Accumulation, transmutation, realization phases
• Contains multiple microcycles

Microcycle:
• Usually 1 week
• Most detailed planning level
• Day-to-day training structure

TYPES OF PERIODIZATION:

1. LINEAR (CLASSIC) PERIODIZATION:
Structure: Progresses from high volume/low intensity to low volume/high intensity

Phases:
• Hypertrophy: 3-4 sets × 10-12 reps @ 65-75% 1RM
• Strength: 3-5 sets × 4-6 reps @ 80-90% 1RM
• Power: 3-5 sets × 2-4 reps @ 85-95% 1RM
• Peaking: 1-3 sets × 1-3 reps @ 95%+ 1RM

Advantages:
• Simple to plan
• Good for beginners
• Clear progression

Disadvantages:
• Some qualities may detrain
• Less variety
• May not suit all goals

2. UNDULATING (NON-LINEAR) PERIODIZATION:

Daily Undulating (DUP):
• Varies training daily
• Example week:
  - Monday: Hypertrophy (3×10)
  - Wednesday: Strength (5×5)
  - Friday: Power (4×3)

Weekly Undulating:
• Varies training weekly
• Week 1: Hypertrophy focus
• Week 2: Strength focus
• Week 3: Power focus

Advantages:
• Maintains all qualities
• More variety/motivation
• Better for advanced athletes

3. BLOCK PERIODIZATION:

Developed by Verkhoshansky & Issurin

Blocks (3-4 weeks each):
• Accumulation: High volume, general preparation
• Transmutation: Sport-specific, moderate volume
• Realization: Low volume, high intensity, peaking

Advantages:
• Concentrated loading
• Good for elite athletes
• Clear training emphasis

4. CONJUGATE/CONCURRENT:
• Train multiple qualities simultaneously
• Popularized by Westside Barbell
• Max effort and dynamic effort days
• Exercise rotation

SAMPLE LINEAR PERIODIZATION:
12-Week Program:

Weeks 1-4: Hypertrophy
• 4 sets × 10-12 reps
• 70% 1RM
• 90 sec rest

Weeks 5-8: Strength
• 4 sets × 6-8 reps
• 80% 1RM
• 2-3 min rest

Weeks 9-11: Power
• 4 sets × 3-5 reps
• 85-90% 1RM
• 3-5 min rest

Week 12: Deload/Testing
• Reduced volume
• Test new 1RM

DELOAD WEEKS:
• Planned recovery weeks
• Reduced volume (40-60%)
• Maintains intensity
• Every 3-6 weeks
• Allows supercompensation` },
      { id: 4, title: 'Rehab-Specific Programming', duration: '50 min', type: 'lesson', image: 'https://images.unsplash.com/photo-1648638810954-281a6439675b?w=600', content: `REHABILITATION-SPECIFIC PROGRAMMING

PHASES OF REHABILITATION:

PHASE 1 - ACUTE/PROTECTION
Goals:
• Protect healing tissue
• Control pain and swelling
• Maintain fitness elsewhere
• Prevent muscle atrophy

Interventions:
• PRICE/POLICE protocol
• Gentle AROM within limits
• Isometrics at multiple angles
• Modalities for pain/swelling
• Education

Timeline: 0-7 days (varies by injury)

PHASE 2 - CONTROLLED MOTION
Goals:
• Restore ROM progressively
• Begin strengthening
• Normalize gait (if applicable)
• Address compensations

Interventions:
• AROM progressing to PROM
• Open kinetic chain exercises
• Low-load isotonics
• Pool therapy
• Scar mobilization

Timeline: 1-3 weeks (varies)

PHASE 3 - STRENGTHENING
Goals:
• Restore full strength
• Improve neuromuscular control
• Progress functional activities
• Address all deficits

Interventions:
• Progressive resistance training
• CKC exercises
• Proprioceptive training
• Sport-specific movements begin

Timeline: 3-8 weeks (varies)

PHASE 4 - RETURN TO ACTIVITY
Goals:
• Full strength and ROM
• Sport/activity-specific preparation
• Confidence building
• Injury prevention

Interventions:
• Plyometrics
• Agility training
• Sport-specific drills
• Graduated return to play

Timeline: 8+ weeks to full return

TISSUE HEALING TIMELINES:

Muscle:
• Acute: 0-3 days
• Repair: 3-21 days
• Remodeling: 21-60 days

Tendon:
• Reactive: 0-10 days
• Disrepair: 10-21 days
• Degenerative: Ongoing if not addressed
• Full healing: 3-6 months

Ligament:
• Similar to tendon
• Full healing: 6-12 months
• May never reach full strength

Bone:
• Inflammatory: 0-7 days
• Soft callus: 1-3 weeks
• Hard callus: 3-8 weeks
• Remodeling: Months to years

DOSAGE IN REHAB:

Early Stages:
• High frequency, low intensity
• Multiple short sessions
• Focus on motor learning

Later Stages:
• Lower frequency, higher intensity
• Longer sessions
• Progressive overload

REP RANGES:
• Motor control: 15-25 reps, 1-3 sets
• Endurance: 12-20 reps, 2-3 sets
• Hypertrophy: 8-12 reps, 3-4 sets
• Strength: 4-8 reps, 3-5 sets

CRITERIA-BASED PROGRESSION:
Don't progress until:
• Pain-free with current exercise
• Full ROM achieved
• Strength within 10% of other side
• Good movement quality
• Passing functional tests

KEY PRINCIPLES:
1. Don't stress healing tissues too early
2. Maintain what you can
3. Progress systematically
4. Address the whole kinetic chain
5. Include proprioception early
6. Educate the patient
7. Set realistic expectations` },
      { id: 5, title: 'Return to Sport Protocols', duration: '45 min', type: 'lesson', image: 'https://images.unsplash.com/photo-1641380140345-a8b91e58d4e0?w=600', content: `RETURN TO SPORT PROTOCOLS

CRITERIA-BASED APPROACH:
Time-based protocols are being replaced by criteria-based progressions that ensure readiness.

RTS DECISION FRAMEWORK:

1. Biological Healing:
• Is tissue healed enough for demands?
• Imaging if needed
• Clinical tests

2. Physical Readiness:
• Strength symmetry (LSI >90%)
• ROM restored
• Passing functional tests

3. Psychological Readiness:
• Confidence in movement
• No fear/apprehension
• Motivated to return

4. Sport-Specific Skills:
• Can perform required movements
• Reactive ability restored
• Contact tolerance (if applicable)

OBJECTIVE CRITERIA:

Strength Testing:
• Isokinetic testing
• Handheld dynamometry
• 1RM testing
• LSI ≥90% (some say ≥95%)

Hop Tests (Lower Extremity):
• Single hop for distance
• Triple hop for distance
• Crossover hop
• 6-meter timed hop
• LSI ≥90% all tests

Y-Balance Test:
• Composite score ≥89%
• Asymmetry <4 cm anterior reach

Functional Tests:
• Single leg squat quality
• Drop jump quality
• Change of direction tests
• Sport-specific movements

ACL EXAMPLE PROTOCOL:

Phase 1 (0-2 weeks):
• ROM goals
• Quadriceps activation
• Gait normalization

Phase 2 (2-6 weeks):
• Full ROM
• CKC strengthening
• Pool running

Phase 3 (6-12 weeks):
• Progressive strengthening
• Balance training
• Jogging progression

Phase 4 (3-6 months):
• Running program
• Agility introduction
• Plyometric progression

Phase 5 (6-9 months):
• Sport-specific drills
• Contact progression
• Testing battery

RTS Criteria:
• Time from surgery: ≥9 months
• Quad LSI ≥90%
• Hop test LSI ≥90%
• Y-Balance composite ≥89%
• Passed psychological readiness
• Sport-specific testing passed

RUNNING PROGRESSION:
Phase 1: Walk/Jog
• Walk 5 min
• Jog 1 min / Walk 2 min × 5
• Progress jog time

Phase 2: Continuous Run
• 10-15 min easy jog
• Progress to 20-30 min
• No pain/swelling

Phase 3: Interval Training
• 4×400m @ 70%
• Progress intensity
• Add hills

Phase 4: Sprints
• 10×40m @ 80%
• Progress to 100%
• Add sport-specific runs

AGILITY PROGRESSION:
Level 1: Planned, Low Speed
• Figure 8 walking
• Box drills
• Cone drills at 50%

Level 2: Planned, Higher Speed
• Same drills at 75-100%
• Add cutting patterns
• Sport-specific patterns

Level 3: Reactive
• Mirror drills
• Ball reaction
• Opponent reaction

PLYOMETRIC PROGRESSION:
Level 1: Low Intensity
• Jump rope
• Line hops
• Box step-downs

Level 2: Moderate Intensity
• Box jumps (land and stick)
• Squat jumps
• Lateral bounds

Level 3: High Intensity
• Depth jumps
• Single leg hops
• Reactive jumps

MONITORING:
• Daily questionnaires
• Subjective feedback
• Objective measures (jump height, etc.)
• Load management (GPS in team sports)

RED FLAGS:
• Pain during or after activity
• Swelling
• Giving way sensation
• Decreased performance
• Psychological distress` },
      { id: 6, title: 'Exercise RX Quiz', duration: '20 min', type: 'quiz', questions: 30, passingScore: 80, topics: ['Programming', 'Periodization', 'RTS'] },
    ],
  },
  'sports-psych-course': {
    title: 'Sports Psychology Basics',
    description: 'Mental skills training, anxiety management, and performance optimization for athletes.',
    icon: 'head-heart',
    iconBg: '#D81B60',
    level: 'Beginner',
    duration: '4 hours',
    instructor: 'WBA99 Mental Performance',
    students: 1432,
    rating: 4.7,
    lessons: [
      { id: 1, title: 'Introduction to Sports Psychology', duration: '25 min', type: 'lesson', image: 'https://images.pexels.com/photos/5793651/pexels-photo-5793651.jpeg?auto=compress&cs=tinysrgb&w=600', content: `INTRODUCTION TO SPORTS PSYCHOLOGY

WHAT IS SPORTS PSYCHOLOGY?
The scientific study of people and their behaviors in sport and exercise contexts, and the practical application of that knowledge.

KEY AREAS:

1. Performance Enhancement:
• Mental skills training
• Optimal arousal and focus
• Consistency under pressure

2. Personal Development:
• Life skills through sport
• Character building
• Career transitions

3. Health and Well-being:
• Exercise psychology
• Injury rehabilitation
• Mental health in sport

THE MIND-BODY CONNECTION:
• Thoughts affect performance
• Physical state affects mental state
• Bidirectional relationship
• Can train both aspects

MENTAL SKILLS TRAINING:
Core skills taught:
• Goal setting
• Imagery/visualization
• Self-talk
• Arousal regulation
• Concentration/focus
• Confidence building
• Pre-performance routines

PSYCHOLOGICAL CHARACTERISTICS OF EXCELLENCE:
Research shows elite athletes have:
• High self-confidence
• Effective concentration
• Ability to control emotions
• Strong commitment/motivation
• Optimal arousal levels
• Clear goal orientation

THE FOUR Cs OF MENTAL TOUGHNESS:
1. Control - over emotions and performance
2. Commitment - to goals and training
3. Challenge - viewing obstacles as opportunities
4. Confidence - belief in abilities

WORKING WITH ATHLETES:
As a physiotherapist, you can:
• Recognize mental barriers to recovery
• Use basic mental skills techniques
• Refer to sport psychologist when needed
• Support confidence during rehabilitation
• Help manage fear of re-injury

MYTHS VS REALITY:

Myth: Mental skills are innate - you either have them or you don't
Reality: Mental skills can be learned and improved with practice

Myth: Mental training is only for elite athletes
Reality: All levels benefit from mental skills training

Myth: You only need mental training when struggling
Reality: Best integrated proactively into training

INTEGRATION WITH PHYSICAL THERAPY:
• Address fear avoidance behaviors
• Build confidence in movement
• Manage pain perception
• Improve adherence to exercises
• Support return to sport transition` },
      { id: 2, title: 'Goal Setting Strategies', duration: '30 min', type: 'lesson', image: 'https://images.pexels.com/photos/4506072/pexels-photo-4506072.jpeg?auto=compress&cs=tinysrgb&w=600', content: `GOAL SETTING STRATEGIES

WHY SET GOALS?
• Provides direction and focus
• Increases motivation
• Enhances commitment
• Improves self-confidence
• Reduces anxiety
• Structures training

TYPES OF GOALS:

1. OUTCOME GOALS:
• Focus on end result
• Often comparing to others
• "Win the championship"
• Least controllable
• Can increase anxiety

2. PERFORMANCE GOALS:
• Focus on personal standards
• Independent of others
• "Run a 4-minute mile"
• More controllable
• Reduce anxiety

3. PROCESS GOALS:
• Focus on actions/techniques
• During performance
• "Keep knees over toes on landing"
• Most controllable
• Build skills

SMART GOAL FRAMEWORK:

S - Specific:
• Clear and well-defined
• What exactly do you want?
• Bad: "Get stronger"
• Good: "Increase squat 1RM by 20kg"

M - Measurable:
• Quantifiable outcomes
• Track progress objectively
• Include numbers/times/distances

A - Achievable:
• Challenging but realistic
• Consider current abilities
• Not too easy, not impossible

R - Relevant:
• Meaningful to the athlete
• Aligned with values
• Connected to bigger picture

T - Time-bound:
• Clear deadline
• Creates urgency
• Short, medium, long-term goals

GOAL SETTING PROCESS:

Step 1: Dream Goal (Long-term)
• Where do you want to be in 1-5 years?
• The ultimate achievement
• Provides overall direction

Step 2: Performance Goals (Medium-term)
• What performances lead to dream goal?
• 3-12 month targets
• Stepping stones

Step 3: Process Goals (Short-term)
• Daily/weekly actions
• What do you control?
• Building blocks

Step 4: Write them down
• Makes them real
• Review regularly
• Display visibly

Step 5: Share goals
• Accountability
• Support network
• Coach/therapist involvement

REHABILITATION GOAL SETTING:
Example - ACL Reconstruction:

Long-term (9-12 months):
• Return to competitive sport

Medium-term (3-6 months):
• Jog without pain
• Single leg squat pain-free
• 90% strength symmetry

Short-term (Weekly):
• Complete exercises 5x/week
• Walk 30 minutes daily
• Achieve full extension

Process (Daily):
• Perform quad sets 100x/day
• Ice after exercises
• Log exercises in app

COMMON MISTAKES:
• Too many goals at once
• Only outcome goals
• Not written down
• Not reviewed/adjusted
• Too easy or too hard
• Not personally meaningful

GOAL REVIEW:
• Weekly: Process goals
• Monthly: Short-term goals
• Quarterly: Medium-term goals
• Annually: Long-term goals
• Adjust as needed` },
      { id: 3, title: 'Visualization & Mental Imagery', duration: '35 min', type: 'lesson', image: 'https://images.unsplash.com/photo-1648638810954-281a6439675b?w=600', content: `VISUALIZATION & MENTAL IMAGERY

WHAT IS IMAGERY?
Creating or recreating an experience in the mind using all senses - without actual physical movement.

THEORETICAL FOUNDATIONS:

1. Psychoneuromuscular Theory:
• Imagining movement creates neural impulses
• Same pathways activated as actual movement
• "Muscle memory" enhancement
• EMG activity during imagery

2. Symbolic Learning Theory:
• Mental rehearsal creates blueprint
• Cognitive coding of movement
• Pattern recognition
• Motor program development

3. Bioinformational Theory:
• Images contain response propositions
• Stimulus + Response components
• Must feel the image, not just see it
• Emotional content important

TYPES OF IMAGERY:

1. Internal (First-Person):
• Through your own eyes
• Feel the movement
• Kinesthetic focus
• Better for fine motor skills

2. External (Third-Person):
• Watching yourself
• Like video analysis
• Better for form/technique
• Good for learning new skills

Both perspectives can be effective - use what works!

PETTLEP MODEL:
Framework for effective imagery:

P - Physical:
• Match physical state
• Wear sport clothes
• Hold equipment
• Adopt posture

E - Environment:
• Imagine real competition venue
• Sounds, sights, smells
• Crowd, weather, surfaces

T - Task:
• Specific to what you're practicing
• Relevant to skill level
• Match difficulty

T - Timing:
• Real-time speed (usually)
• Slow motion for learning
• Match competition tempo

L - Learning:
• Update images as you improve
• Progress with skill level
• Adapt to changes

E - Emotion:
• Include feelings
• Confidence, determination
• Manage anxiety

P - Perspective:
• Internal or external
• Experiment with both
• Use most effective

IMAGERY USES:

Skill Practice:
• Rehearse techniques
• Learn new movements
• Perfect form

Competition Preparation:
• Visualize success
• Practice scenarios
• Build confidence

Healing/Recovery:
• Visualize healing tissue
• Pain management
• Rehabilitation exercises

Arousal Control:
• Calming imagery for anxiety
• Energizing imagery for motivation
• Performance state

Problem Solving:
• Work through challenges
• Find solutions mentally
• Prepare for obstacles

IMAGERY SCRIPT EXAMPLE:
Knee Rehabilitation - Confident Walking:

"Close your eyes and take three deep breaths...
Feel your feet firmly on the ground...
You're about to walk across a room...
See yourself standing tall, confident...
Feel the strength in your knee...
Take that first step - notice how stable you feel...
Your knee moves smoothly, naturally...
Each step feels easier...
You're walking normally, confidently...
Feel the satisfaction of this achievement...
Take a few more steps, enjoying the freedom...
Open your eyes feeling confident in your knee."

PRACTICE GUIDELINES:
• Start with 5-10 minutes
• Build to 15-20 minutes
• Practice 3-5x per week
• Quiet environment initially
• Progress to varied settings
• Make it vivid and detailed
• Include all senses` },
      { id: 4, title: 'Anxiety Management', duration: '35 min', type: 'lesson', image: 'https://images.unsplash.com/photo-1641380140345-a8b91e58d4e0?w=600', content: `ANXIETY MANAGEMENT

UNDERSTANDING ANXIETY:

Trait Anxiety:
• Personality characteristic
• General tendency to perceive situations as threatening
• Relatively stable over time

State Anxiety:
• Situational response
• Varies moment to moment
• Response to specific stressor

Components:
• Cognitive (worry, negative thoughts)
• Somatic (physical symptoms)

INVERTED-U HYPOTHESIS:
• Too little arousal = poor performance
• Too much arousal = poor performance
• Optimal arousal = best performance
• "Zone" varies by individual and task

INDIVIDUAL ZONES OF OPTIMAL FUNCTIONING (IZOF):
• Each athlete has unique optimal zone
• Some perform best when calm
• Others need high arousal
• Must find your zone

ANXIETY SYMPTOMS:

Cognitive:
• Worry about performance
• Negative self-talk
• Concentration difficulties
• Fear of failure
• Mind going blank

Somatic:
• Increased heart rate
• Sweaty palms
• Muscle tension
• Butterflies in stomach
• Rapid breathing
• Trembling

ANXIETY REDUCTION TECHNIQUES:

1. BREATHING TECHNIQUES:

Diaphragmatic Breathing:
• Breathe from diaphragm, not chest
• Hand on belly rises
• Slow, controlled breaths
• 4-7-8 pattern (inhale-hold-exhale)

Centering:
• Focus on center of body
• Breathe to that point
• Release tension downward
• Feel grounded

2. PROGRESSIVE MUSCLE RELAXATION (PMR):
• Systematically tense and release muscles
• Learn to recognize tension
• 16 muscle group sequence
• Practice daily, use before competition

Steps:
• Tense muscle group 5-7 seconds
• Release and feel relaxation 20-30 seconds
• Notice difference
• Progress through body

3. COGNITIVE RESTRUCTURING:
• Identify negative thoughts
• Challenge their validity
• Replace with positive/realistic thoughts
• Build helpful thinking patterns

Example:
Negative: "I'm going to mess this up"
Challenge: "What evidence is there for this?"
Reframe: "I've prepared well, I can do this"

4. SELF-TALK:
Types:
• Instructional ("Keep head still")
• Motivational ("You've got this")

Guidelines:
• Keep it short
• Make it positive
• Practice regularly
• Use cue words

5. PRE-PERFORMANCE ROUTINES:
• Consistent sequence of actions
• Creates familiarity
• Focuses attention
• Manages arousal
• Develops automaticity

REHABILITATION APPLICATION:
Managing Fear of Re-injury:
• Acknowledge the fear is normal
• Gradual exposure to movements
• Build confidence through success
• Use imagery for scary movements
• Challenge catastrophic thinking
• Celebrate progress` },
      { id: 5, title: 'Building Confidence', duration: '30 min', type: 'lesson', image: 'https://images.unsplash.com/photo-1712068980119-bdeb8353d16c?w=600', content: `BUILDING CONFIDENCE

WHAT IS SELF-CONFIDENCE?
The belief that you can successfully perform a desired behavior.

SELF-EFFICACY (Bandura):
Task-specific confidence - belief in ability to perform specific task in specific situation.

SOURCES OF SELF-EFFICACY:

1. Performance Accomplishments (Strongest):
• Past success builds confidence
• Mastery experiences
• Progressive challenges
• Success breeds success

Application:
• Set achievable goals
• Progress gradually
• Celebrate successes
• Build on wins

2. Vicarious Experience:
• Watching others succeed
• Modeling
• "If they can, I can"
• Most effective with similar others

Application:
• Watch successful rehab stories
• Find relatable role models
• Video of similar patients
• Peer support groups

3. Verbal Persuasion:
• Encouragement from others
• Feedback and support
• Believed experts
• Realistic praise

Application:
• Positive feedback
• Highlight progress
• Therapist confidence
• Support system

4. Physiological States:
• Physical sensations interpreted
• Arousal can be positive or negative
• Feeling strong vs. feeling weak
• Energy level affects confidence

Application:
• Interpret butterflies as excitement
• Notice strength gains
• Reduce pain/discomfort
• Optimal physical state

5. Emotional States:
• Mood affects confidence
• Positive emotions build confidence
• Negative emotions decrease it

Application:
• Manage anxiety
• Create positive environment
• Celebrate achievements
• Address mental health

6. Imaginal Experiences:
• Visualization of success
• Mental rehearsal
• Seeing yourself succeed

Application:
• Imagery training
• Visualize successful outcomes
• Mental practice of movements

CONFIDENCE-BUILDING STRATEGIES:

1. Success Log:
• Record achievements daily
• Review regularly
• Focus on progress
• Evidence of capability

2. Strengths Awareness:
• Identify personal strengths
• Focus on what you do well
• Apply strengths to challenges

3. Positive Self-Talk:
• Replace negative with positive
• Affirmations
• "I can" statements
• Evidence-based confidence

4. Preparation:
• Being well-prepared builds confidence
• Know what to expect
• Practice thoroughly
• Have a plan

5. Body Language:
• Power posing (2 minutes)
• Stand tall
• Open posture
• Act confident, feel confident

6. Focus on Controllables:
• Effort
• Attitude
• Preparation
• Response to challenges

CONFIDENCE IN REHABILITATION:
Common barriers:
• Previous failed attempts
• Fear of pain
• Uncertainty about healing
• Comparison to pre-injury

Solutions:
• Gradual progression
• Clear milestones
• Objective measures
• Focus on process
• Celebrate small wins
• Therapist belief in patient` },
      { id: 6, title: 'Psychology Quiz', duration: '15 min', type: 'quiz', questions: 20, passingScore: 70, topics: ['Goals', 'Visualization', 'Anxiety'] },
    ],
  },
  'special-tests': {
    title: 'Special Tests Masterclass',
    description: 'Comprehensive guide to orthopedic special tests with sensitivity, specificity, and clinical reasoning.',
    icon: 'stethoscope',
    iconBg: '#F44336',
    level: 'Intermediate',
    duration: '12 hours',
    instructor: 'WBA99 Clinical Team',
    students: 2567,
    rating: 4.9,
    lessons: [
      { id: 1, title: 'Shoulder Special Tests', duration: '50 min', type: 'lesson', image: 'https://images.pexels.com/photos/5793651/pexels-photo-5793651.jpeg?auto=compress&cs=tinysrgb&w=600', content: `SHOULDER SPECIAL TESTS

ROTATOR CUFF TESTS:

1. EMPTY CAN TEST (Jobe's Test):
Purpose: Supraspinatus pathology
Position: Arm at 90° abduction, 30° horizontal adduction, thumb down
Procedure: Patient resists downward pressure
Positive: Weakness or pain
Sensitivity: 77% | Specificity: 68%

2. FULL CAN TEST:
Purpose: Supraspinatus (alternative to empty can)
Position: Same position but thumb up
Procedure: Patient resists downward pressure
Positive: Weakness or pain
Often less painful than empty can

3. DROP ARM TEST:
Purpose: Rotator cuff tear (especially supraspinatus)
Position: Arm passively abducted to 90°
Procedure: Patient slowly lowers arm
Positive: Arm drops suddenly or unable to control descent
Sensitivity: 27% | Specificity: 88%

4. EXTERNAL ROTATION LAG SIGN:
Purpose: Infraspinatus/teres minor tear
Position: Elbow at 90°, shoulder maximally externally rotated
Procedure: Patient maintains position when released
Positive: Arm drops into internal rotation

5. LIFT-OFF TEST (Gerber):
Purpose: Subscapularis tear
Position: Hand behind back, palm facing out
Procedure: Patient lifts hand off back
Positive: Unable to lift off
Sensitivity: 62% | Specificity: 100%

6. BELLY PRESS TEST:
Purpose: Subscapularis (alternative)
Position: Hand on abdomen, elbow forward
Procedure: Press into belly while keeping wrist straight
Positive: Wrist flexes or elbow drops back

IMPINGEMENT TESTS:

7. NEER'S IMPINGEMENT TEST:
Purpose: Subacromial impingement
Position: Stabilize scapula, arm in internal rotation
Procedure: Passively flex shoulder fully
Positive: Pain in anterior/lateral shoulder
Sensitivity: 79% | Specificity: 53%

8. HAWKINS-KENNEDY TEST:
Purpose: Subacromial impingement
Position: Shoulder and elbow at 90° flexion
Procedure: Passively internally rotate shoulder
Positive: Pain in anterior shoulder
Sensitivity: 80% | Specificity: 56%

LABRAL TESTS:

9. O'BRIEN'S TEST (Active Compression):
Purpose: SLAP lesion, AC joint pathology
Position: Arm at 90° flexion, 10-15° adduction, full internal rotation
Procedure: Resist downward force, repeat in supination
Positive: Pain with pronation, relieved with supination (SLAP)
         Pain not relieved = AC joint
Sensitivity: 67% | Specificity: 51%

10. ANTERIOR APPREHENSION TEST:
Purpose: Anterior instability
Position: Supine, arm at 90° abduction, elbow flexed
Procedure: Externally rotate shoulder
Positive: Apprehension or pain
Sensitivity: 72% | Specificity: 96%

11. RELOCATION TEST:
Purpose: Confirms anterior instability
Position: After positive apprehension
Procedure: Apply posterior force to humeral head
Positive: Apprehension/pain relieved
Sensitivity: 81% | Specificity: 92%

ACROMIOCLAVICULAR JOINT:

12. AC JOINT PALPATION:
Purpose: AC joint pathology
Procedure: Direct palpation over AC joint
Positive: Point tenderness

13. CROSS-BODY ADDUCTION:
Purpose: AC joint pathology
Procedure: Passively adduct arm across body
Positive: Pain at AC joint
Sensitivity: 77% | Specificity: 79%

BICEPS TESTS:

14. SPEED'S TEST:
Purpose: Biceps tendinopathy/SLAP
Position: Arm at 90° flexion, elbow extended, forearm supinated
Procedure: Resist forward flexion
Positive: Pain in bicipital groove
Sensitivity: 32% | Specificity: 75%

15. YERGASON'S TEST:
Purpose: Biceps tendon instability
Position: Elbow flexed 90°, arm at side
Procedure: Resist supination and external rotation
Positive: Pain or tendon subluxation` },
      { id: 2, title: 'Elbow & Wrist Tests', duration: '35 min', type: 'lesson', image: 'https://images.pexels.com/photos/4506072/pexels-photo-4506072.jpeg?auto=compress&cs=tinysrgb&w=600', content: `ELBOW & WRIST SPECIAL TESTS

LATERAL ELBOW:

1. COZEN'S TEST:
Purpose: Lateral epicondylitis (Tennis elbow)
Position: Elbow extended, forearm pronated, wrist in fist
Procedure: Resist wrist extension
Positive: Pain at lateral epicondyle
Sensitivity: 84% | Specificity: 45%

2. MILL'S TEST:
Purpose: Lateral epicondylitis
Position: Elbow extended, forearm pronated
Procedure: Passively flex wrist
Positive: Pain at lateral epicondyle

3. MAUDSLEY'S TEST:
Purpose: Lateral epicondylitis
Position: Elbow extended
Procedure: Resist middle finger extension
Positive: Pain at lateral epicondyle

MEDIAL ELBOW:

4. MEDIAL EPICONDYLITIS TEST:
Purpose: Golfer's elbow
Position: Elbow extended, forearm supinated
Procedure: Resist wrist flexion
Positive: Pain at medial epicondyle

5. VALGUS STRESS TEST:
Purpose: MCL integrity
Position: Elbow slightly flexed (20-30°)
Procedure: Apply valgus force
Positive: Gapping, pain, or instability
Test at 0° and 30° flexion

6. MOVING VALGUS STRESS TEST:
Purpose: MCL (throwing athletes)
Position: Shoulder at 90° abduction
Procedure: Apply valgus while moving from flexion to extension
Positive: Pain at medial elbow between 70-120° flexion

LIGAMENT TESTS:

7. VARUS STRESS TEST:
Purpose: LCL integrity
Position: Elbow slightly flexed
Procedure: Apply varus force
Positive: Gapping or instability

8. POSTEROLATERAL ROTARY INSTABILITY TEST:
Purpose: LCL complex instability
Position: Supine, arm overhead
Procedure: Supinate forearm, apply valgus and axial compression while flexing
Positive: Apprehension, subluxation

NERVE TESTS:

9. TINEL'S SIGN (Elbow):
Purpose: Cubital tunnel syndrome (ulnar nerve)
Position: Elbow flexed
Procedure: Tap over cubital tunnel
Positive: Tingling into ring and small fingers

10. ELBOW FLEXION TEST:
Purpose: Cubital tunnel syndrome
Position: Full elbow flexion for 60 seconds
Positive: Paresthesias in ulnar nerve distribution

WRIST TESTS:

11. FINKELSTEIN'S TEST:
Purpose: De Quervain's tenosynovitis
Position: Make fist with thumb inside
Procedure: Passively ulnar deviate wrist
Positive: Pain over radial styloid
Sensitivity: 81% | Specificity: 50%

12. PHALEN'S TEST:
Purpose: Carpal tunnel syndrome
Position: Wrists in full flexion for 60 seconds
Positive: Tingling in median nerve distribution
Sensitivity: 68% | Specificity: 73%

13. REVERSE PHALEN'S:
Purpose: Carpal tunnel syndrome
Position: Wrists in full extension for 60 seconds
Positive: Same as Phalen's

14. TINEL'S SIGN (Wrist):
Purpose: Carpal tunnel syndrome
Position: Wrist neutral
Procedure: Tap over carpal tunnel
Positive: Tingling in median nerve distribution
Sensitivity: 50% | Specificity: 77%

15. WATSON'S TEST (Scaphoid Shift):
Purpose: Scapholunate instability
Position: Wrist in ulnar deviation
Procedure: Pressure on scaphoid tubercle while moving to radial deviation
Positive: Pain, palpable clunk, or apprehension

16. PIANO KEY TEST:
Purpose: DRUJ instability
Procedure: Press down on distal ulna like piano key
Positive: Increased mobility compared to other side

17. TRIANGULAR FIBROCARTILAGE COMPLEX (TFCC) TEST:
Purpose: TFCC injury
Position: Neutral wrist
Procedure: Axial load with ulnar deviation and rotation
Positive: Pain on ulnar side of wrist` },
      { id: 3, title: 'Cervical Spine Tests', duration: '40 min', type: 'lesson', image: 'https://images.unsplash.com/photo-1648638810954-281a6439675b?w=600', content: `CERVICAL SPINE SPECIAL TESTS

NEUROLOGICAL TESTS:

1. SPURLING'S TEST:
Purpose: Cervical radiculopathy
Position: Sitting, cervical spine extended and laterally flexed
Procedure: Apply axial compression
Positive: Reproduction of radicular symptoms into arm
Sensitivity: 50% | Specificity: 86%

2. UPPER LIMB TENSION TEST (ULTT) / BRACHIAL PLEXUS TENSION:
Purpose: Neural tissue mechanosensitivity
ULTT1 (Median nerve):
• Shoulder depression, abduction 110°
• Elbow extension
• Wrist/finger extension
• Forearm supination
• Add cervical lateral flexion away

ULTT2a (Median nerve):
• Similar but different shoulder position

ULTT2b (Radial nerve):
• Shoulder depression, abduction
• Elbow extension
• Forearm pronation
• Wrist/finger flexion

ULTT3 (Ulnar nerve):
• Shoulder depression, abduction
• Elbow flexion
• Wrist extension
• Cervical lateral flexion away

Positive: Reproduction of symptoms, different from other side

3. DISTRACTION TEST:
Purpose: Cervical radiculopathy
Position: Supine
Procedure: Apply gentle axial distraction
Positive: Relief of radicular symptoms
Sensitivity: 44% | Specificity: 90%

VASCULAR TESTS:

4. VERTEBRAL ARTERY TEST (VBI Testing):
Purpose: Vertebrobasilar insufficiency screening
CRITICAL: Perform before cervical manipulation

Test Positions:
• Sustained rotation
• Sustained extension
• Combined rotation and extension

Hold each position 10-30 seconds

5 D's and 3 N's (Symptoms to watch for):
• Dizziness
• Diplopia (double vision)
• Dysarthria (slurred speech)
• Dysphagia (difficulty swallowing)
• Drop attacks
• Nausea
• Numbness
• Nystagmus

Positive: Any of above symptoms
If positive: DO NOT proceed with manipulation

INSTABILITY TESTS:

5. SHARP-PURSER TEST:
Purpose: Atlantoaxial instability (C1-C2)
Position: Sitting, cervical spine slightly flexed
Procedure: Posterior pressure on forehead
Positive: Sliding sensation, clunk
Caution: Use in suspected RA, Down syndrome

6. ALAR LIGAMENT TEST:
Purpose: Upper cervical instability
Position: Sitting
Procedure: Fix C2, side-bend head
Positive: Excessive movement, no firm end-feel

7. TRANSVERSE LIGAMENT TEST:
Purpose: Transverse ligament integrity
Position: Supine
Procedure: Support occiput, lift anteriorly
Positive: Soft end-feel, symptoms

RED FLAGS - Upper Cervical:
• Trauma
• RA patient
• Down syndrome
• Congenital anomalies
• Previous cervical surgery

MUSCLE TESTS:

8. CRANIOCERVICAL FLEXION TEST:
Purpose: Deep neck flexor strength/endurance
Position: Supine, pressure biofeedback under neck
Procedure: Nod chin to 22, 24, 26, 28, 30 mmHg - hold 10 sec each
Positive: Inability to hold, substitution patterns

SPECIAL CONSIDERATIONS:
• Always screen for red flags
• VBI testing before manipulation
• Document neurological status
• Consider imaging when indicated` },
      { id: 4, title: 'Lumbar Spine Tests', duration: '45 min', type: 'lesson', image: 'https://images.unsplash.com/photo-1641380140345-a8b91e58d4e0?w=600', content: `LUMBAR SPINE SPECIAL TESTS

NEUROLOGICAL TESTS:

1. STRAIGHT LEG RAISE (SLR) / LASÈGUE'S TEST:
Purpose: Lumbar disc herniation, sciatic nerve tension
Position: Supine
Procedure: Passively raise straight leg
Positive: Radicular pain 30-70° (below knee)
Sensitivity: 91% | Specificity: 26%

Sensitizing maneuvers:
• Dorsiflexion of ankle
• Internal rotation of hip
• Add cervical flexion

2. CROSSED STRAIGHT LEG RAISE:
Purpose: Large disc herniation
Position: Supine
Procedure: Raise opposite (asymptomatic) leg
Positive: Symptoms in affected leg
Sensitivity: 29% | Specificity: 88%
Highly specific for disc herniation

3. SLUMP TEST:
Purpose: Neural tension, dural mobility
Position: Sitting on edge of table
Procedure:
1. Slump thoracic/lumbar spine
2. Flex cervical spine
3. Extend knee
4. Dorsiflex ankle
5. Release cervical flexion

Positive: Reproduction of symptoms, relieved by cervical extension
Sensitivity: 84% | Specificity: 83%

4. PRONE KNEE BEND (Femoral Nerve Stretch):
Purpose: Upper lumbar disc herniation (L2-L4), femoral nerve
Position: Prone
Procedure: Flex knee, extend hip
Positive: Pain in anterior thigh

SACROILIAC JOINT TESTS:

5. SACRAL THRUST:
Purpose: SI joint dysfunction
Position: Prone
Procedure: Posterior pressure on sacrum
Positive: Pain in SI region

6. THIGH THRUST:
Purpose: SI joint dysfunction
Position: Supine, hip flexed 90°
Procedure: Posterior force through femur
Positive: Pain in SI region
Sensitivity: 88% | Specificity: 69%

7. GAENSLEN'S TEST:
Purpose: SI joint dysfunction
Position: Supine, affected side at edge of table
Procedure: Flex opposite hip, extend affected hip off table
Positive: Pain in SI region
Sensitivity: 71% | Specificity: 26%

8. COMPRESSION TEST:
Purpose: SI joint dysfunction
Position: Side-lying
Procedure: Downward pressure on iliac crest
Positive: Pain in SI region

9. DISTRACTION TEST:
Purpose: SI joint dysfunction
Position: Supine
Procedure: Outward pressure on ASISs
Positive: Pain in SI region

SI Joint Cluster:
3+ positive of the following suggests SI dysfunction:
• Thigh thrust
• Sacral thrust
• Compression
• Distraction
• Gaenslen's

INSTABILITY TESTS:

10. PRONE INSTABILITY TEST:
Purpose: Lumbar instability
Position: Prone with legs off table, feet on floor
Procedure: 
1. PA pressure on lumbar spine - note pain
2. Patient lifts legs off floor - repeat PA
Positive: Pain with feet down, relieved with feet up (muscles active)
Sensitivity: 72% | Specificity: 58%

11. ABERRANT MOVEMENT PATTERNS:
Signs suggesting instability during ROM:
• Painful arc during flexion
• Gower's sign (hands on thighs)
• Instability catch
• Reversal of lumbopelvic rhythm

SPECIAL TESTS:

12. SEATED SLUMP VS SUPINE SLR:
Purpose: Differentiate true vs functional limitation
If supine SLR is significantly more limited than seated slump, consider non-organic findings

13. WADDELL'S SIGNS:
Non-organic findings suggesting psychological component:
• Superficial tenderness
• Simulation tests (axial loading, rotation)
• Distraction tests
• Regional disturbances
• Overreaction

3+ positive signs suggests non-organic component` },
      { id: 5, title: 'Hip Special Tests', duration: '40 min', type: 'lesson', image: 'https://images.unsplash.com/photo-1712068980119-bdeb8353d16c?w=600', content: `HIP SPECIAL TESTS

LABRAL TESTS:

1. FADIR TEST (Flexion, Adduction, Internal Rotation):
Purpose: Femoroacetabular impingement (FAI), labral tear
Position: Supine
Procedure: Flex hip 90°, adduct, internally rotate
Positive: Anterior groin pain
Sensitivity: 94-99% | Specificity: 5-8%
Very sensitive, not specific

2. FABER TEST (Patrick's Test):
Purpose: Hip pathology, SI joint
Position: Supine, heel on opposite knee (figure-4)
Procedure: Push down on flexed knee
Positive: 
• Groin pain = hip joint
• Posterior pain = SI joint
Measure distance from knee to table for comparison
Sensitivity: 77% | Specificity: 100% (for labral tears)

3. SCOUR TEST (Quadrant Test):
Purpose: Labral lesion, articular surface pathology
Position: Supine
Procedure: Flex and adduct hip, apply axial compression
Move hip in circular pattern (scouring)
Positive: Pain, clicking, reproduction of symptoms

4. RESISTED SLR:
Purpose: Labral tear, hip flexor pathology
Position: Supine
Procedure: Resist hip flexion with knee extended
Positive: Deep groin pain (with other positive tests suggests labrum)

IMPINGEMENT TESTS:

5. ANTERIOR IMPINGEMENT TEST:
Purpose: Cam or pincer impingement
Position: Supine
Procedure: Flex hip 90°, internally rotate
Positive: Anterior groin pain
Similar to FADIR

6. POSTERIOR IMPINGEMENT TEST:
Purpose: Posterior hip impingement
Position: Supine at edge of table
Procedure: Extend hip, externally rotate
Positive: Posterior hip/buttock pain

MUSCLE TESTS:

7. THOMAS TEST:
Purpose: Hip flexor (iliopsoas) tightness
Position: Supine, pull one knee to chest
Procedure: Observe opposite leg
Positive: 
• Thigh rises off table = iliopsoas tightness
• Knee extends = rectus femoris tightness
Normal: Thigh flat, knee flexed 80°

8. OBER'S TEST:
Purpose: IT band / TFL tightness
Position: Side-lying, bottom leg flexed
Procedure: Abduct and extend top leg, allow to drop
Positive: Leg stays abducted (doesn't drop to table)

9. PIRIFORMIS TEST:
Purpose: Piriformis tightness/syndrome
Position: Side-lying, hip flexed 60°, knee flexed
Procedure: Push knee toward table (adduction)
Positive: Buttock pain or tightness

10. 90-90 HAMSTRING TEST:
Purpose: Hamstring length
Position: Supine, hip and knee at 90°
Procedure: Extend knee
Positive: Unable to fully extend
Measure angle from vertical

TRENDELENBURG TEST:

11. TRENDELENBURG TEST:
Purpose: Hip abductor (glute medius) weakness
Position: Standing on one leg
Procedure: Observe pelvis during single leg stance
Positive: Pelvis drops on unsupported side
Indicates weakness of stance leg hip abductors

SPECIAL TESTS:

12. LOG ROLL TEST:
Purpose: Hip joint pathology
Position: Supine, leg relaxed
Procedure: Gently roll leg in/out
Positive: Pain with minimal rotation suggests intra-articular pathology
Most sensitive for serious hip pathology

13. CRAIG'S TEST:
Purpose: Femoral anteversion/retroversion
Position: Prone, knee flexed 90°
Procedure: Palpate greater trochanter, rotate hip until GT is most lateral
Measure angle of tibia from vertical
Normal: 8-15° anteversion
>15° = excessive anteversion
<8° = retroversion

HIP JOINT CLUSTER:
For osteoarthritis diagnosis:
• Squat causes lateral or anterior pain
• Active hip flexion causes lateral or anterior pain
• Scour test positive
• Active hip extension causes pain
• Passive internal rotation ≤25°` },
      { id: 6, title: 'Knee Special Tests', duration: '55 min', type: 'lesson', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600', content: `KNEE SPECIAL TESTS

ACL TESTS:

1. ANTERIOR DRAWER TEST:
Purpose: ACL integrity
Position: Supine, hip 45°, knee 90°, foot stabilized
Procedure: Pull tibia anteriorly
Positive: Excessive anterior translation
Sensitivity: 55% | Specificity: 92%
Grading: 1+ (3-5mm), 2+ (6-10mm), 3+ (>10mm)

2. LACHMAN TEST:
Purpose: ACL integrity (GOLD STANDARD)
Position: Supine, knee 20-30° flexion
Procedure: Stabilize femur, translate tibia anteriorly
Positive: Excessive translation, soft end-feel
Sensitivity: 87% | Specificity: 93%
Most sensitive ACL test

3. PIVOT SHIFT TEST:
Purpose: ACL rotatory instability
Position: Supine, leg relaxed
Procedure: Internal rotation + valgus force, flex from extension
Positive: Clunk as tibia reduces around 30° flexion
Sensitivity: 38% | Specificity: 98%
Most specific ACL test

PCL TESTS:

4. POSTERIOR DRAWER TEST:
Purpose: PCL integrity
Position: Same as anterior drawer
Procedure: Push tibia posteriorly
Positive: Excessive posterior translation

5. POSTERIOR SAG SIGN (Godfrey's Sign):
Purpose: PCL injury
Position: Supine, hips and knees at 90°
Procedure: Support legs, observe tibial position
Positive: Affected tibia sags posteriorly

6. QUADRICEPS ACTIVE TEST:
Purpose: PCL injury
Position: Supine, knee 90°, foot stabilized
Procedure: Patient contracts quadriceps
Positive: Tibia translates anteriorly (was sagged)

COLLATERAL LIGAMENT TESTS:

7. VALGUS STRESS TEST (MCL):
Purpose: MCL integrity
Position: Supine
Procedure: Apply valgus force at 0° and 30° flexion
Positive:
• Gapping at 30° only = MCL injury
• Gapping at 0° and 30° = MCL + cruciate involvement
Grading: 1+ (0-5mm), 2+ (6-10mm), 3+ (>10mm)

8. VARUS STRESS TEST (LCL):
Purpose: LCL integrity
Position: Supine
Procedure: Apply varus force at 0° and 30° flexion
Positive: Gapping, pain, instability

MENISCUS TESTS:

9. McMURRAY'S TEST:
Purpose: Meniscal tear
Position: Supine
Procedure: 
• Medial meniscus: Flex knee fully, externally rotate tibia, extend while applying valgus
• Lateral meniscus: Flex fully, internally rotate, extend while applying varus
Positive: Click, catch, or pain at joint line
Sensitivity: 61% | Specificity: 84%

10. APLEY'S COMPRESSION TEST:
Purpose: Meniscal tear
Position: Prone, knee flexed 90°
Procedure: Apply axial compression while rotating tibia
Positive: Pain at joint line
Sensitivity: 38% | Specificity: 89%

11. THESSALY TEST:
Purpose: Meniscal tear
Position: Standing on one leg, knee at 20° flexion
Procedure: Rotate knee internal/external 3 times
Positive: Joint line pain, catching, locking
Sensitivity: 90% | Specificity: 96%
Better than McMurray when patient can perform

12. JOINT LINE TENDERNESS:
Purpose: Meniscal injury
Procedure: Palpate joint lines
Positive: Point tenderness at medial or lateral joint line
Sensitivity: 83% | Specificity: 30%
Very sensitive, not specific

PATELLOFEMORAL TESTS:

13. CLARKE'S SIGN (Patellar Grind):
Purpose: Chondromalacia, patellofemoral pain
Position: Supine, knee extended
Procedure: Press patella into trochlea, ask patient to contract quad
Positive: Pain, crepitus
Often positive even in normal knees - use cautiously

14. PATELLAR APPREHENSION TEST:
Purpose: Patellar instability
Position: Supine, knee extended or slightly flexed
Procedure: Push patella laterally
Positive: Apprehension, guarding

15. PATELLAR TILT TEST:
Purpose: Lateral retinacular tightness
Position: Supine, knee extended
Procedure: Lift lateral patellar edge
Positive: Unable to tilt to neutral or beyond` },
      { id: 7, title: 'Ankle & Foot Tests', duration: '35 min', type: 'lesson', image: 'https://images.unsplash.com/photo-1651163586078-06e9e9867661?w=600', content: `ANKLE & FOOT SPECIAL TESTS

LIGAMENT TESTS:

1. ANTERIOR DRAWER TEST (Ankle):
Purpose: ATFL integrity
Position: Supine or sitting, knee flexed, ankle neutral
Procedure: Stabilize tibia, draw talus/calcaneus anteriorly
Positive: Excessive anterior translation, soft end-feel
Sensitivity: 73% | Specificity: 97%
Most important test for lateral ankle sprain

2. TALAR TILT TEST (Inversion Stress):
Purpose: CFL integrity, lateral ankle stability
Position: Supine, ankle neutral
Procedure: Invert calcaneus while stabilizing tibia
Positive: Excessive tilt compared to other side
Test at neutral (CFL) and plantarflexed (ATFL)

3. EXTERNAL ROTATION STRESS TEST (Kleiger's):
Purpose: Syndesmosis injury (high ankle sprain)
Position: Sitting, knee at 90°
Procedure: Externally rotate foot while stabilizing leg
Positive: Pain at syndesmosis (between tibia and fibula)
Sensitivity: 20% | Specificity: 84%

4. SQUEEZE TEST:
Purpose: Syndesmosis injury
Position: Any
Procedure: Squeeze tibia and fibula together at mid-calf
Positive: Pain at syndesmosis
Sensitivity: 30% | Specificity: 93%

5. COTTON TEST (Fibular Translation):
Purpose: Syndesmosis injury
Position: Supine
Procedure: Translate talus medially and laterally
Positive: Excessive translation, pain

DELTOID LIGAMENT:

6. EVERSION STRESS TEST:
Purpose: Deltoid ligament integrity
Position: Supine, ankle neutral
Procedure: Evert foot while stabilizing tibia
Positive: Gapping, pain, instability

ACHILLES TENDON:

7. THOMPSON TEST (Squeeze Test):
Purpose: Achilles tendon rupture
Position: Prone, feet hanging over edge
Procedure: Squeeze calf muscle belly
Positive: No plantarflexion of foot
Sensitivity: 96% | Specificity: 93%
GOLD STANDARD for complete Achilles rupture

8. MATLES TEST:
Purpose: Achilles tendon rupture
Position: Prone, knees flexed to 90°
Procedure: Compare resting ankle position
Positive: Affected side falls into dorsiflexion

TARSAL TUNNEL:

9. TINEL'S SIGN (Ankle):
Purpose: Tarsal tunnel syndrome (tibial nerve)
Position: Any
Procedure: Tap posterior to medial malleolus
Positive: Tingling into plantar foot

10. DORSIFLEXION-EVERSION TEST:
Purpose: Tarsal tunnel syndrome
Position: Sitting
Procedure: Maximally dorsiflex and evert ankle for 30 seconds
Positive: Reproduction of paresthesias

FOREFOOT:

11. MORTON'S TEST:
Purpose: Morton's neuroma
Position: Any
Procedure: Squeeze metatarsal heads together
Positive: Pain, click (Mulder's click) in web space

12. METATARSAL SQUEEZE TEST:
Purpose: Metatarsal stress fracture
Procedure: Squeeze metatarsals together
Positive: Point pain at fracture site

PLANTAR FASCIA:

13. WINDLASS TEST:
Purpose: Plantar fasciitis
Position: Sitting or standing
Procedure: Dorsiflex first toe
Positive: Pain at medial heel/plantar fascia insertion
Sensitivity: 100% | Specificity: 100%

SUBTALAR JOINT:

14. SUBTALAR ROCK:
Purpose: Subtalar joint stiffness/hypermobility
Position: Prone or supine
Procedure: Invert and evert calcaneus
Compare to other side
Assess: Quality and quantity of movement

TOE TESTS:

15. GRIND TEST (1ST MTP):
Purpose: Hallux rigidus, 1st MTP arthritis
Position: Any
Procedure: Axial compression while rotating 1st toe
Positive: Pain, crepitus at MTP joint` },
      { id: 8, title: 'Special Tests Quiz', duration: '25 min', type: 'quiz', questions: 50, passingScore: 75, topics: ['All joint regions'] },
    ],
  },
};

export default function CourseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);

  const course = COURSE_CONTENT[id as string];

  if (!course) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>Course not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const progress = Math.round((completedLessons.length / course.lessons.length) * 100);

  const openLesson = (lesson: any) => {
    setSelectedLesson(lesson);
    setShowLessonModal(true);
  };

  const markComplete = (lessonId: number) => {
    if (!completedLessons.includes(lessonId)) {
      setCompletedLessons([...completedLessons, lessonId]);
    }
    setShowLessonModal(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Course Details</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Hero Section */}
        <View style={[styles.heroSection, { backgroundColor: course.iconBg }]}>
          <View style={styles.heroIconContainer}>
            <MaterialCommunityIcons name={course.icon as any} size={48} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>{course.title}</Text>
          <Text style={styles.heroDescription}>{course.description}</Text>
          
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="school" size={16} color="#fff" />
              <Text style={styles.metaText}>{course.level}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time" size={16} color="#fff" />
              <Text style={styles.metaText}>{course.duration}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="book" size={16} color="#fff" />
              <Text style={styles.metaText}>{course.lessons.length} Lessons</Text>
            </View>
          </View>

          {/* Instructor & Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="person" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.statText}>{course.instructor}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="people" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.statText}>{course.students?.toLocaleString() || '1000+'} enrolled</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.statText}>{course.rating || '4.8'}</Text>
            </View>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Your Progress</Text>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: course.iconBg }]} />
          </View>
          <Text style={styles.progressText}>{completedLessons.length} of {course.lessons.length} lessons completed</Text>
        </View>

        {/* Lessons List */}
        <Text style={styles.sectionTitle}>Course Content</Text>
        <View style={styles.lessonsList}>
          {course.lessons.map((lesson: any, index: number) => (
            <TouchableOpacity
              key={lesson.id}
              style={[
                styles.lessonCard,
                completedLessons.includes(lesson.id) && styles.lessonCardCompleted
              ]}
              onPress={() => openLesson(lesson)}
            >
              {lesson.image && (
                <Image source={{ uri: lesson.image }} style={styles.lessonImage} />
              )}
              <View style={styles.lessonContent}>
                <View style={styles.lessonHeader}>
                  <View style={[styles.lessonNumber, { backgroundColor: course.iconBg }]}>
                    <Text style={styles.lessonNumberText}>{index + 1}</Text>
                  </View>
                  {completedLessons.includes(lesson.id) && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                  )}
                </View>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                <View style={styles.lessonMeta}>
                  <View style={styles.lessonMetaItem}>
                    <Ionicons 
                      name={lesson.type === 'quiz' ? 'help-circle' : 'document-text'} 
                      size={14} 
                      color={theme.colors.textMuted} 
                    />
                    <Text style={styles.lessonMetaText}>
                      {lesson.type === 'quiz' ? `${lesson.questions} Questions` : lesson.duration}
                    </Text>
                  </View>
                  {lesson.type === 'quiz' && lesson.passingScore && (
                    <View style={styles.lessonMetaItem}>
                      <Ionicons name="trophy" size={14} color={theme.colors.textMuted} />
                      <Text style={styles.lessonMetaText}>Pass: {lesson.passingScore}%</Text>
                    </View>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Lesson Modal */}
      <Modal visible={showLessonModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>{selectedLesson?.title}</Text>
              <TouchableOpacity onPress={() => setShowLessonModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedLesson?.image && (
                <Image source={{ uri: selectedLesson.image }} style={styles.lessonDetailImage} />
              )}
              
              {selectedLesson?.type === 'lesson' ? (
                <View style={styles.lessonContentSection}>
                  <Text style={styles.lessonContentText}>
                    {selectedLesson?.content}
                  </Text>
                </View>
              ) : (
                <View style={styles.quizPlaceholder}>
                  <MaterialCommunityIcons name="help-circle-outline" size={48} color={theme.colors.accent} />
                  <Text style={styles.quizText}>Quiz: {selectedLesson?.questions} Questions</Text>
                  <Text style={styles.quizSubtext}>Passing Score: {selectedLesson?.passingScore || 70}%</Text>
                  {selectedLesson?.topics && (
                    <View style={styles.topicsList}>
                      <Text style={styles.topicsTitle}>Topics Covered:</Text>
                      {selectedLesson.topics.map((topic: string, idx: number) => (
                        <Text key={idx} style={styles.topicItem}>• {topic}</Text>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity 
                style={[styles.completeBtn, { backgroundColor: course.iconBg }]}
                onPress={() => markComplete(selectedLesson?.id)}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.completeBtnText}>
                  {completedLessons.includes(selectedLesson?.id) ? 'Completed' : 'Mark as Complete'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
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
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  backBtn: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  heroSection: {
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  heroTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  heroDescription: {
    fontSize: theme.fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  metaText: {
    color: '#fff',
    fontSize: theme.fontSize.sm,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    justifyContent: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: theme.fontSize.xs,
  },
  progressSection: {
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  progressTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  progressPercent: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.accent,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  lessonsList: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  lessonCardCompleted: {
    borderColor: theme.colors.success + '50',
    backgroundColor: theme.colors.success + '10',
  },
  lessonImage: {
    width: 90,
    height: 90,
  },
  lessonContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  lessonNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonNumberText: {
    color: '#fff',
    fontSize: theme.fontSize.xs,
    fontWeight: 'bold',
  },
  lessonTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  lessonMeta: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  lessonMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lessonMetaText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
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
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: theme.spacing.md,
  },
  lessonDetailImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  lessonContentSection: {
    marginBottom: theme.spacing.lg,
  },
  lessonContentText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 26,
  },
  quizPlaceholder: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  quizText: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  quizSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  topicsList: {
    marginTop: theme.spacing.md,
    alignSelf: 'stretch',
  },
  topicsTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.accent,
    marginBottom: theme.spacing.sm,
  },
  topicItem: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xxl,
  },
  completeBtnText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
  },
});
