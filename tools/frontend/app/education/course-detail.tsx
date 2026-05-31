import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';

interface Section {
  id: number;
  title: string;
  content: string;
  keyPoints: string[];
  clinicalTips?: string[];
  image?: string;
}

interface CourseContent {
  id: number;
  title: string;
  description: string;
  totalSections: number;
  readingTime: string;
  level: string;
  icon: string;
  color: string;
  instructor: string;
  overview: string;
  learningObjectives: string[];
  sections: Section[];
  references: string[];
}

const COURSE_DATA: Record<string, CourseContent> = {
  '1': {
    id: 1,
    title: 'Posture Assessment Fundamentals',
    description: 'Complete guide to identifying postural deviations, plumb line assessment, and muscle imbalances.',
    totalSections: 6,
    readingTime: '45 min read',
    level: 'Beginner',
    icon: 'human',
    color: theme.colors.accent,
    instructor: 'Dr. Prashant Chaturvedi',
    overview: 'This comprehensive course covers the fundamentals of posture assessment from all anatomical views. You will learn to identify common postural deviations, understand their clinical implications, and develop skills for accurate documentation.',
    learningObjectives: [
      'Understand ideal postural alignment in all planes',
      'Master plumb line assessment technique',
      'Identify upper and lower crossed syndromes',
      'Recognize muscle imbalances and their patterns',
      'Document findings accurately for treatment planning'
    ],
    sections: [
      {
        id: 1,
        title: 'Introduction to Posture Assessment',
        content: `Posture assessment is a fundamental skill in physiotherapy that helps identify musculoskeletal imbalances and guides treatment planning.

**What is Posture?**
Posture refers to the position in which we hold our bodies while standing, sitting, or lying down. Good posture is the correct alignment of body parts supported by the right amount of muscle tension against gravity.

**Why Assess Posture?**
• Identify muscle imbalances before they cause injury
• Determine root causes of pain and dysfunction
• Track progress during rehabilitation
• Develop targeted treatment plans
• Prevent future musculoskeletal problems

**The Three Anatomical Planes:**
1. **Sagittal Plane** - Divides body into left and right (viewed from side)
2. **Frontal/Coronal Plane** - Divides body into front and back (viewed from front/back)
3. **Transverse Plane** - Divides body into upper and lower (viewed from above)`,
        keyPoints: [
          'Posture assessment should be performed in all three planes',
          'Always assess in a well-lit environment',
          'Patient should wear minimal, form-fitting clothing',
          'Use consistent landmarks for reliable measurements'
        ],
        clinicalTips: [
          'Have the patient stand naturally - avoid asking them to "stand straight"',
          'Allow 30 seconds for the patient to settle into their natural stance',
          'Take photos for documentation and progress tracking'
        ]
      },
      {
        id: 2,
        title: 'Anatomical Landmarks & Plumb Line',
        content: `The plumb line is a vertical reference line used to assess postural alignment. It helps identify deviations from ideal alignment.

**Ideal Plumb Line Alignment (Lateral View):**
The plumb line should pass through:
• Slightly anterior to the lateral malleolus
• Anterior to the axis of the knee joint
• Slightly posterior to the axis of the hip joint
• Bodies of the lumbar vertebrae
• Shoulder joint (acromion process)
• Bodies of the cervical vertebrae
• External auditory meatus (ear canal)
• Slightly posterior to the apex of the coronal suture

**Ideal Plumb Line Alignment (Posterior View):**
The line should bisect:
• The head symmetrically
• Cervical spinous processes
• Thoracic spinous processes
• Lumbar spinous processes
• Gluteal cleft
• Equal distance between both knees
• Equal distance between both ankles

**Key Anatomical Landmarks:**
• **Ear** - External auditory meatus
• **Shoulder** - Acromion process
• **Hip** - Greater trochanter
• **Knee** - Lateral condyle of femur
• **Ankle** - Lateral malleolus`,
        keyPoints: [
          'Plumb line provides objective reference for assessment',
          'Deviations indicate postural compensations',
          'Always assess from multiple views',
          'Document deviations in centimeters from plumb line'
        ],
        clinicalTips: [
          'Use a weighted string or posture grid for accuracy',
          'Mark landmarks with stickers for photo documentation',
          'Compare left and right sides for asymmetries'
        ]
      },
      {
        id: 3,
        title: 'Anterior View Assessment',
        content: `The anterior (front) view assessment helps identify lateral asymmetries and rotational components of posture.

**What to Observe:**

**Head & Neck:**
• Head tilt (ear to shoulder)
• Head rotation (chin position)
• Facial symmetry

**Shoulders:**
• Shoulder height symmetry
• Clavicle position
• Acromion process level

**Trunk:**
• Chest symmetry
• Rib cage position
• Waist angle symmetry
• Umbilicus position (should be centered)

**Pelvis:**
• ASIS (Anterior Superior Iliac Spine) height
• Pubic symphysis alignment
• Hip position

**Lower Extremities:**
• Knee alignment (valgus/varus)
• Patella position
• Tibial rotation
• Foot position (pronation/supination)
• Toe alignment

**Common Findings:**
• **Lateral head tilt** - May indicate upper cervical dysfunction or scoliosis
• **Uneven shoulders** - Could suggest scoliosis, muscle imbalance, or leg length discrepancy
• **Hip hiking** - Often compensatory for leg length difference`,
        keyPoints: [
          'Check for symmetry between left and right sides',
          'Note rotational components',
          'Observe arm position and carrying angle',
          'Check weight distribution between feet'
        ],
        clinicalTips: [
          'Use a posture grid with horizontal lines',
          'Ask patient to close eyes to eliminate visual compensation',
          'Check if asymmetries reduce when sitting (leg length vs spinal cause)'
        ]
      },
      {
        id: 4,
        title: 'Posterior View Assessment',
        content: `The posterior (back) view is essential for identifying spinal deviations, pelvic tilts, and lower extremity alignment issues.

**What to Observe:**

**Head & Neck:**
• Head position relative to shoulders
• Cervical spine alignment

**Shoulders & Scapulae:**
• Shoulder height symmetry
• Scapular position (winging, tipping)
• Scapular height comparison
• Distance from spine to medial scapular border

**Spine:**
• Cervical lordosis
• Thoracic kyphosis
• Lumbar lordosis
• Scoliotic curves (lateral deviation)
• Spinous process alignment

**Pelvis:**
• PSIS (Posterior Superior Iliac Spine) height
• Iliac crest height
• Gluteal fold symmetry
• Sacral position

**Lower Extremities:**
• Knee alignment
• Achilles tendon angle
• Calcaneal (heel) position
• Rearfoot alignment

**Scoliosis Screening:**
The Adam's Forward Bend Test is performed from this view:
1. Patient bends forward at waist with arms hanging
2. Observe for rib hump or lumbar prominence
3. Indicates rotational component of scoliosis`,
        keyPoints: [
          'Scapular position reveals upper body dysfunction patterns',
          'PSIS level indicates pelvic symmetry',
          'Spinal curves should be smooth without sharp angles',
          'Perform Adam\'s test for scoliosis screening'
        ],
        clinicalTips: [
          'Use finger palpation to locate spinous processes',
          'Mark bony landmarks with erasable markers',
          'Observe muscle bulk symmetry (atrophy patterns)'
        ]
      },
      {
        id: 5,
        title: 'Upper Crossed Syndrome',
        content: `Upper Crossed Syndrome (UCS) is a common postural pattern characterized by specific muscle imbalances in the upper body.

**Definition:**
UCS was first described by Dr. Vladimir Janda. It involves a pattern of alternating tight and weak muscles forming an "X" pattern when viewed from the side.

**Muscle Imbalance Pattern:**

**TIGHT/OVERACTIVE Muscles:**
• Upper trapezius
• Levator scapulae
• Pectoralis major & minor
• Sternocleidomastoid (SCM)
• Suboccipital muscles

**WEAK/INHIBITED Muscles:**
• Deep cervical flexors (longus colli, longus capitis)
• Rhomboids
• Middle & lower trapezius
• Serratus anterior

**Postural Signs of UCS:**
• Forward head posture
• Increased cervical lordosis
• Rounded shoulders (protracted scapulae)
• Increased thoracic kyphosis
• Elevated and protracted shoulders
• Winging of scapulae

**Associated Conditions:**
• Cervicogenic headaches
• Temporomandibular joint (TMJ) dysfunction
• Thoracic outlet syndrome
• Shoulder impingement
• Neck and upper back pain

**Treatment Approach:**
1. Release/stretch tight muscles
2. Activate/strengthen weak muscles
3. Postural re-education
4. Ergonomic modifications
5. Movement pattern correction`,
        keyPoints: [
          'UCS creates predictable pain patterns',
          'Treatment must address both tight and weak muscles',
          'Posture correction alone is not sufficient',
          'Ergonomic modifications are essential for lasting change'
        ],
        clinicalTips: [
          'Check for forward head posture using wall test',
          'Assess deep neck flexor endurance with chin tuck test',
          'Evaluate scapular stability with wall push-up'
        ]
      },
      {
        id: 6,
        title: 'Lower Crossed Syndrome',
        content: `Lower Crossed Syndrome (LCS) is a postural pattern affecting the lumbopelvic region, commonly seen in sedentary individuals.

**Definition:**
Like UCS, Lower Crossed Syndrome was described by Dr. Vladimir Janda. It involves a predictable pattern of tight and weak muscles in the lower body.

**Muscle Imbalance Pattern:**

**TIGHT/OVERACTIVE Muscles:**
• Hip flexors (iliopsoas, rectus femoris)
• Thoracolumbar extensors (erector spinae)
• Quadratus lumborum
• Tensor fasciae latae (TFL)

**WEAK/INHIBITED Muscles:**
• Abdominal muscles (especially deep core)
• Gluteus maximus
• Gluteus medius
• Hamstrings (in some cases)

**Postural Signs of LCS:**
• Anterior pelvic tilt
• Increased lumbar lordosis (hyperlordosis)
• Hip flexion contracture
• Protruding abdomen
• Flat buttocks appearance
• Knee hyperextension (in standing)

**Associated Conditions:**
• Low back pain (mechanical)
• Facet joint irritation
• SI joint dysfunction
• Hip impingement
• Piriformis syndrome
• IT band syndrome

**Thomas Test for Hip Flexor Tightness:**
1. Patient lies supine with one knee to chest
2. Opposite thigh should remain flat on table
3. Thigh rising indicates tight hip flexors
4. Knee extending indicates tight rectus femoris

**Treatment Approach:**
1. Hip flexor stretching (Thomas stretch, half-kneeling stretch)
2. Glute activation exercises (bridges, clamshells)
3. Core stabilization (dead bugs, planks)
4. Hip hinging pattern education
5. Postural awareness training`,
        keyPoints: [
          'LCS is extremely common in desk workers',
          'Anterior pelvic tilt is the hallmark sign',
          'Gluteal weakness contributes to many lower extremity issues',
          'Core stabilization is essential for correction'
        ],
        clinicalTips: [
          'Use Thomas test to identify hip flexor involvement',
          'Check gluteal activation with single leg bridge',
          'Assess core control with leg lowering test',
          'Consider sitting posture and duration as contributing factors'
        ]
      }
    ],
    references: [
      'Kendall FP, McCreary EK, Provance PG. Muscles: Testing and Function with Posture and Pain. 5th ed.',
      'Janda V. Muscles and Motor Control in Cervicogenic Disorders.',
      'Sahrmann S. Diagnosis and Treatment of Movement Impairment Syndromes.',
      'Neumann DA. Kinesiology of the Musculoskeletal System. 3rd ed.'
    ]
  },
  '2': {
    id: 2,
    title: 'MSK Screening Masterclass',
    description: 'Comprehensive guide to musculoskeletal screening tests including Y Balance, SLHB, and clinical interpretation.',
    totalSections: 6,
    readingTime: '60 min read',
    level: 'Intermediate',
    icon: 'bone',
    color: theme.colors.error,
    instructor: 'Dr. Prashant Chaturvedi',
    overview: 'Master the essential MSK screening tests used in clinical practice and sports settings. This course covers evidence-based assessment tools with detailed instructions for administration, scoring, and clinical interpretation.',
    learningObjectives: [
      'Administer Y Balance Test correctly',
      'Perform and score Single Leg Hamstring Bridge',
      'Execute Knee to Wall Test accurately',
      'Understand GIRD assessment in overhead athletes',
      'Apply Beighton Score for hypermobility',
      'Interpret results and plan interventions'
    ],
    sections: [
      {
        id: 1,
        title: 'Introduction to MSK Screening',
        content: `Musculoskeletal screening is a systematic approach to identify injury risk factors, movement dysfunctions, and areas requiring intervention.

**Purpose of MSK Screening:**
• Identify athletes/patients at risk for injury
• Establish baseline measurements
• Guide training and rehabilitation programs
• Track progress over time
• Support return-to-sport decisions

**Key Principles:**
1. **Standardization** - Consistent testing protocols ensure reliable results
2. **Bilateral Comparison** - Most tests compare left vs right
3. **Normative Data** - Results compared to population norms
4. **Clinical Correlation** - Test results must match clinical findings

**When to Screen:**
• Pre-season/Pre-participation
• Post-injury (return-to-play decisions)
• Periodically during training
• When symptoms emerge

**Categories of MSK Tests:**
• **Balance/Stability** - Y Balance, Single Leg Stance
• **Strength** - SLHB, Hip Strength Tests
• **Mobility** - Knee to Wall, GIRD, Thomas Test
• **Hypermobility** - Beighton Score
• **Movement Quality** - FMS, Single Leg Squat`,
        keyPoints: [
          'Screening identifies risk before injury occurs',
          'Standardized protocols ensure consistent results',
          'Bilateral comparison reveals asymmetries',
          'Results guide individualized programs'
        ],
        clinicalTips: [
          'Always warm up the patient before screening',
          'Use the same tester for pre/post comparisons',
          'Document environmental conditions',
          'Allow adequate rest between tests'
        ]
      },
      {
        id: 2,
        title: 'Y Balance Test (YBT)',
        content: `The Y Balance Test is a dynamic balance assessment that identifies lower extremity asymmetries and injury risk.

**Equipment Needed:**
• Y Balance Test kit or tape measure
• Athletic tape to mark directions
• Non-slip surface

**Test Setup:**
Create a Y shape with three reach directions:
• **Anterior** - Straight ahead
• **Posterolateral** - Behind and to the outside (at 135°)
• **Posteromedial** - Behind and to the inside (at 135°)

**Testing Protocol:**
1. Measure limb length (ASIS to medial malleolus)
2. Patient stands on one leg at center
3. Reaches as far as possible in each direction
4. Lightly touch the reach indicator
5. Return to start without losing balance
6. Perform 3 trials each direction
7. Record maximum reach distance

**Scoring:**
• **Composite Score** = (Anterior + Posterolateral + Posteromedial) / (3 × Limb Length) × 100

**Cut-off Values for Injury Risk:**
• Composite score < 89% = Increased injury risk
• Anterior reach asymmetry > 4cm = Increased injury risk
• Any direction asymmetry > 4cm = Notable finding

**Common Errors:**
• Heel lift on stance leg
• Loss of balance (foot touching down)
• Kicking or throwing motion with reach
• Not returning to start position`,
        keyPoints: [
          'Composite score < 89% indicates higher injury risk',
          'Anterior asymmetry > 4cm is significant',
          'Always measure limb length for normalization',
          'Allow 6 practice trials before testing'
        ],
        clinicalTips: [
          'Practice trials significantly improve scores',
          'Test the uninvolved side first post-injury',
          'Monitor for compensatory trunk movements',
          'Consider fatigue effects in serial testing'
        ]
      },
      {
        id: 3,
        title: 'Single Leg Hamstring Bridge (SLHB)',
        content: `The Single Leg Hamstring Bridge (SLHB) test assesses hamstring and gluteal endurance, identifying weakness and asymmetries.

**Test Purpose:**
• Assess hamstring endurance
• Identify gluteal weakness
• Detect bilateral asymmetries
• Screen for hamstring injury risk

**Test Setup:**
• Patient supine on floor/mat
• Arms crossed over chest
• Knee bent to 20° (heel on elevated surface ~60cm)
• Hip at 0° extension

**Testing Protocol:**
1. Patient lifts hips to create straight line from shoulder to knee
2. Extends opposite leg to match test leg
3. Performs bridging repetitions at 1 per second (metronome)
4. Continue until:
   - Unable to maintain form
   - Experiences cramping
   - Falls behind pace
5. Record total repetitions

**Scoring Criteria:**
• **Excellent**: >30 repetitions
• **Good**: 25-30 repetitions
• **Fair**: 20-24 repetitions
• **Poor**: <20 repetitions

**Asymmetry Threshold:**
• >15% difference between sides = Significant asymmetry
• >20% difference = High injury risk

**Termination Criteria:**
• Hips drop below horizontal
• Cramping in hamstring/calf
• Unable to maintain pace
• Compensatory movements (rotation, arching)`,
        keyPoints: [
          'Tests hamstring AND gluteal function together',
          '>15% asymmetry is clinically significant',
          'Cramping suggests muscle fatigue/weakness',
          'Test correlates with hamstring injury risk'
        ],
        clinicalTips: [
          'Standardize heel height (approximately 60cm)',
          'Use metronome for consistent pace',
          'Monitor for hip drop and rotation',
          'Note if cramping occurs (location and onset time)'
        ]
      },
      {
        id: 4,
        title: 'Knee to Wall Test',
        content: `The Knee to Wall Test (KWT), also known as the Weight-Bearing Lunge Test, measures ankle dorsiflexion range of motion.

**Clinical Significance:**
• Limited ankle dorsiflexion affects:
  - Squat depth
  - Landing mechanics
  - Running gait
  - Injury risk (ACL, ankle sprains)

**Test Setup:**
• Patient faces wall
• Test foot placed 5cm from wall
• Heel must remain on ground

**Testing Protocol:**
1. Start with foot 5cm from wall
2. Patient lunges knee toward wall
3. Knee should touch wall while heel stays down
4. If successful, move foot back 1cm
5. Repeat until knee cannot touch wall
6. Record maximum distance from wall

**Alternative Method (Angle Measurement):**
• Use inclinometer on tibia
• Measure angle of tibia to vertical
• Record in degrees

**Normative Values:**
• **>10cm** from wall = Good mobility
• **7-10cm** = Moderate limitation
• **<7cm** = Significant limitation
• **<5cm** = Severely limited

**Angle Norms:**
• Normal: 35-45° of dorsiflexion
• Limited: <35°
• Hypermobile: >45°

**Causes of Limited Dorsiflexion:**
• Soleus/gastrocnemius tightness
• Joint capsule restriction
• Anterior ankle impingement
• Previous ankle injury/immobilization`,
        keyPoints: [
          'Critical for squat and landing mechanics',
          'Asymmetry increases injury risk',
          'Test in both knee bent and straight positions',
          'Compare to contralateral side'
        ],
        clinicalTips: [
          'Check both bent knee (soleus) and straight knee (gastroc)',
          'Palpate anterior ankle for bony block',
          'Consider subtalar joint contribution',
          'Use this test to monitor intervention progress'
        ]
      },
      {
        id: 5,
        title: 'GIRD Assessment',
        content: `Glenohumeral Internal Rotation Deficit (GIRD) is a loss of internal rotation compared to the non-dominant shoulder, common in overhead athletes.

**Definition:**
GIRD = Loss of internal rotation in the dominant shoulder compared to non-dominant shoulder

**Clinical Significance:**
• GIRD >18-20° associated with increased injury risk
• Linked to:
  - Shoulder impingement
  - SLAP lesions
  - Internal impingement
  - Posterior shoulder tightness

**Test Position:**
• Patient supine
• Shoulder abducted 90°
• Elbow flexed 90°
• Scapula stabilized

**Testing Protocol:**
1. Stabilize scapula (prevent anterior tilt)
2. Passively internally rotate shoulder
3. Stop when scapula begins to move
4. Measure angle from vertical
5. Repeat on both sides

**Measurements:**
• **Internal Rotation (IR)** - Usually 70-90° normal
• **External Rotation (ER)** - Usually 90-100° normal
• **Total Arc of Motion (TAOM)** = IR + ER

**Key Findings:**
• **GIRD >18°** = Clinically significant
• **GIRD >25°** = High injury risk
• **TAOM asymmetry >5°** = Notable finding
• **ER Gain** = Increased ER on dominant side (common, adaptive)

**GIRD Types:**
1. **Pathological GIRD** - True soft tissue loss (capsular, muscular)
2. **Anatomical GIRD** - Humeral retroversion (bony adaptation)

**Treatment Considerations:**
• Sleeper stretch for posterior capsule
• Cross-body stretch
• Thoracic spine mobility
• Scapular stabilization
• Rotator cuff strengthening`,
        keyPoints: [
          'GIRD >18° is clinically significant',
          'Always assess Total Arc of Motion',
          'Scapular stabilization is critical for accuracy',
          'Distinguish pathological from anatomical GIRD'
        ],
        clinicalTips: [
          'Compare TAOM, not just IR alone',
          'Assess with scapula firmly stabilized',
          'Consider sport-specific demands',
          'Monitor sleeper stretch effectiveness'
        ]
      },
      {
        id: 6,
        title: 'Beighton Score',
        content: `The Beighton Score is a simple clinical tool to assess generalized joint hypermobility.

**Scoring System (Maximum 9 points):**

**Bilateral Tests (1 point each side):**
1. **Passive fifth finger extension >90°**
   - Patient rests hand flat on table
   - Examiner extends small finger past 90°
   
2. **Passive thumb to forearm**
   - Patient flexes wrist and pulls thumb toward forearm
   - Thumb should touch the forearm

3. **Elbow hyperextension >10°**
   - Arms fully extended
   - Measure angle beyond 180°

4. **Knee hyperextension >10°**
   - Legs fully extended
   - Measure angle beyond 180°

**Unilateral Test (1 point):**
5. **Forward flexion with palms on floor**
   - Patient stands with knees straight
   - Bends forward to touch floor
   - Palms flat on ground = 1 point

**Interpretation:**
• **Score ≥4** = Generalized joint hypermobility
• **Score ≥5** with symptoms = Consider hypermobility spectrum disorder
• **Score ≥6** = Significant hypermobility

**Clinical Implications of Hypermobility:**
• Increased risk of:
  - Joint subluxations/dislocations
  - Sprains and strains
  - Chronic pain syndromes
  - Early osteoarthritis
  
• Training considerations:
  - Focus on stability over mobility
  - Avoid end-range stretching
  - Emphasize proprioception
  - Controlled strength training

**Associated Conditions:**
• Hypermobile Ehlers-Danlos Syndrome (hEDS)
• Hypermobility Spectrum Disorders (HSD)
• Marfan Syndrome
• Osteogenesis Imperfecta`,
        keyPoints: [
          'Score ≥4 indicates generalized hypermobility',
          'Hypermobile patients need stability training',
          'Avoid aggressive stretching protocols',
          'Consider genetic conditions if score very high'
        ],
        clinicalTips: [
          'Test all joints even if first few are positive',
          'Document score for baseline comparison',
          'Ask about family history of hypermobility',
          'Modify exercise programs for hypermobile patients'
        ]
      }
    ],
    references: [
      'Plisky PJ, et al. Star Excursion Balance Test as a predictor of lower extremity injury.',
      'Freckleton G, Pizzari T. Risk factors for hamstring muscle strain injury in sport.',
      'Wilk KE, et al. Glenohumeral internal rotation deficit in overhead athletes.',
      'Beighton P, Solomon L, Soskolne CL. Articular mobility in an African population.'
    ]
  },
  '3': {
    id: 3,
    title: 'Walking Gait Analysis',
    description: 'Understanding the gait cycle, stance and swing phases, and identifying pathological patterns.',
    totalSections: 5,
    readingTime: '50 min read',
    level: 'Intermediate',
    icon: 'walk',
    color: theme.colors.success,
    instructor: 'Dr. Prashant Chaturvedi',
    overview: 'Learn to analyze walking gait patterns with clinical precision. This course covers normal gait mechanics, common deviations, and systematic assessment approaches.',
    learningObjectives: [
      'Understand the complete gait cycle',
      'Identify stance and swing phase components',
      'Recognize common gait deviations',
      'Correlate gait findings with pathology',
      'Document gait analysis findings'
    ],
    sections: [
      {
        id: 1,
        title: 'The Gait Cycle Overview',
        content: `The gait cycle is the period from initial contact of one foot to the subsequent initial contact of the same foot.

**Gait Cycle Phases:**
The gait cycle is divided into two main phases:

**1. STANCE PHASE (60% of cycle)**
The period when the foot is in contact with the ground.
• Provides stability and support
• Allows forward progression
• Absorbs impact forces

**2. SWING PHASE (40% of cycle)**
The period when the foot is off the ground advancing forward.
• Allows limb clearance
• Positions foot for next contact
• Requires less energy than stance

**Key Temporal Parameters:**
• **Stride Length** - Distance from heel strike to same heel strike (typically 1.2-1.5m)
• **Step Length** - Distance from one heel strike to opposite heel strike
• **Cadence** - Steps per minute (normal: 100-120 steps/min)
• **Velocity** - Speed of walking (normal: 1.2-1.4 m/s)
• **Step Width** - Lateral distance between feet (normal: 5-10cm)

**Double Support & Single Support:**
• **Double Support** - Both feet on ground (20% of cycle, occurs twice)
• **Single Support** - One foot on ground (40% per side)
• Double support decreases with speed; absent in running`,
        keyPoints: [
          'Stance = 60%, Swing = 40% at normal speed',
          'Double support decreases as speed increases',
          'Stride length equals two step lengths',
          'Normal cadence is 100-120 steps/minute'
        ]
      },
      {
        id: 2,
        title: 'Stance Phase Details',
        content: `The stance phase is divided into five distinct sub-phases:

**1. INITIAL CONTACT (0-2% of cycle)**
• Heel contacts ground
• Ankle: Neutral (0°)
• Knee: Extended or slight flexion (0-5°)
• Hip: Flexed 30°
• Function: Shock absorption begins

**2. LOADING RESPONSE (2-12% of cycle)**
• Foot flat on ground
• Ankle: Plantarflexes to 10°
• Knee: Flexes to 15-20° (shock absorption)
• Hip: Begins extension
• Function: Weight acceptance, stability

**3. MIDSTANCE (12-31% of cycle)**
• Body over stance foot
• Ankle: Dorsiflexes 5-10°
• Knee: Extends toward 0°
• Hip: Neutral (0°)
• Function: Single limb support, forward progression

**4. TERMINAL STANCE (31-50% of cycle)**
• Heel rises off ground
• Ankle: Dorsiflexes to 10°
• Knee: Extended
• Hip: Extends to 10-20° hyperextension
• Function: Push-off preparation

**5. PRE-SWING (50-62% of cycle)**
• Toe-off occurs
• Ankle: Plantarflexes to 20°
• Knee: Flexes to 40°
• Hip: Neutral
• Function: Propulsion, swing initiation

**Muscle Activity During Stance:**
• **Initial Contact**: Tibialis anterior (eccentric)
• **Loading Response**: Quadriceps (eccentric)
• **Midstance**: Gluteus medius, hip abductors
• **Terminal Stance**: Gastrocnemius, soleus
• **Pre-swing**: Hip flexors initiating`,
        keyPoints: [
          'Initial contact should occur with heel',
          'Loading response requires eccentric quad control',
          'Midstance demands hip abductor strength',
          'Pre-swing requires adequate push-off'
        ]
      },
      {
        id: 3,
        title: 'Swing Phase Details',
        content: `The swing phase allows the limb to advance forward while the opposite limb provides support.

**1. INITIAL SWING (62-75% of cycle)**
• Foot leaves ground
• Ankle: Dorsiflexes to neutral
• Knee: Flexes to 60°
• Hip: Flexes to 20°
• Function: Foot clearance, limb advancement

**2. MID-SWING (75-87% of cycle)**
• Swinging limb passes stance limb
• Ankle: Neutral (0°)
• Knee: Flexes to 60° then begins extending
• Hip: Flexes to 30°
• Function: Maximum hip flexion, limb advancement

**3. TERMINAL SWING (87-100% of cycle)**
• Limb prepares for initial contact
• Ankle: Neutral (0°)
• Knee: Extends fully
• Hip: Flexed 30°
• Function: Prepares for ground contact

**Key Muscle Activity:**
• **Initial Swing**: 
  - Iliopsoas, rectus femoris (hip flexion)
  - Tibialis anterior (dorsiflexion)
  - Short head biceps femoris (knee flexion)

• **Mid-Swing**:
  - Tibialis anterior (maintains dorsiflexion)
  - Iliopsoas continues

• **Terminal Swing**:
  - Hamstrings (decelerate knee extension)
  - Tibialis anterior (prepares for contact)
  - Quadriceps (prepare for weight acceptance)

**Swing Phase Requirements:**
• Adequate hip flexor strength
• Sufficient knee flexion ROM
• Active ankle dorsiflexion
• Trunk stability for pelvis control`,
        keyPoints: [
          'Swing requires hip flexion power',
          'Knee must flex 60° for foot clearance',
          'Ankle dorsiflexion prevents foot drop',
          'Terminal swing decelerates the limb'
        ]
      },
      {
        id: 4,
        title: 'Common Gait Deviations',
        content: `Recognizing gait deviations is essential for identifying underlying dysfunction.

**ANTALGIC GAIT**
• Shortened stance phase on painful side
• Reduced stride length
• Decreased velocity
• Causes: Pain from any source

**TRENDELENBURG GAIT**
• Pelvis drops on swing side
• Trunk leans toward stance side
• Waddling appearance if bilateral
• Cause: Weak hip abductors (glut medius)

**COMPENSATED TRENDELENBURG**
• Trunk leans toward weak stance limb
• Maintains level pelvis
• Reduces demand on hip abductors
• Cause: Same as Trendelenburg

**FOOT DROP/STEPPAGE GAIT**
• Excessive hip and knee flexion
• Foot slaps at initial contact
• High-stepping pattern
• Cause: Peroneal nerve palsy, L4-5 radiculopathy

**CIRCUMDUCTION**
• Lateral swing of leg during swing phase
• Forms semicircle pattern
• Compensates for leg length or weakness
• Causes: Stroke, limb length discrepancy

**VAULTING**
• Rising on toes of stance limb
• Compensates for long swing limb
• Increases energy expenditure
• Cause: Limb length discrepancy, hip/knee stiffness

**CROUCH GAIT**
• Excessive knee flexion throughout
• Forward trunk lean
• Short steps
• Causes: Cerebral palsy, quadriceps weakness

**SCISSORING**
• Legs cross midline during swing
• Narrow base of support
• Causes: Spastic cerebral palsy, stroke`,
        keyPoints: [
          'Antalgic gait is shortened on painful side',
          'Trendelenburg indicates hip abductor weakness',
          'Foot drop requires steppage compensation',
          'Circumduction suggests stiff or long limb'
        ],
        clinicalTips: [
          'Observe from front, back, and side views',
          'Use slow-motion video for analysis',
          'Compare left and right symmetry',
          'Note changes with fatigue'
        ]
      },
      {
        id: 5,
        title: 'Gait Analysis Documentation',
        content: `Systematic documentation ensures comprehensive gait assessment.

**OBSERVATIONAL GAIT ANALYSIS FORMAT:**

**1. General Observations:**
• Walking aids used
• Velocity (slow/normal/fast)
• Cadence
• Stride characteristics
• Overall symmetry
• Arm swing

**2. Sagittal Plane (Side View):**
• Head/trunk position
• Pelvic tilt
• Hip range of motion
• Knee flexion/extension pattern
• Ankle dorsiflexion/plantarflexion
• Heel strike and toe-off

**3. Frontal Plane (Front/Back View):**
• Head position
• Shoulder level
• Pelvic drop/hike
• Knee valgus/varus
• Foot progression angle
• Base of support width

**4. Transverse Plane:**
• Pelvic rotation
• Trunk rotation
• Arm swing symmetry
• Foot rotation

**SYSTEMATIC APPROACH:**
Use anatomical regions:
• Head & Neck
• Trunk
• Pelvis
• Hip
• Knee
• Ankle/Foot

**DOCUMENTATION TEMPLATE:**
"Patient demonstrates [velocity] gait with [aids]. Stance phase shows [findings]. Swing phase demonstrates [findings]. Deviations include [specific findings]. Suspected causes include [clinical reasoning]."`,
        keyPoints: [
          'Document from all three planes',
          'Note any assistive devices',
          'Compare bilateral symmetry',
          'Correlate findings with clinical presentation'
        ],
        clinicalTips: [
          'Video recording allows repeated analysis',
          'Use standardized documentation forms',
          'Note environmental conditions',
          'Re-assess after intervention'
        ]
      }
    ],
    references: [
      'Perry J, Burnfield JM. Gait Analysis: Normal and Pathological Function. 2nd ed.',
      'Whittle MW. Gait Analysis: An Introduction. 5th ed.',
      'Neumann DA. Kinesiology of the Musculoskeletal System. 3rd ed.'
    ]
  },
  '4': {
    id: 4,
    title: 'Functional Movement Screen (FMS)',
    description: 'Master all 7 FMS tests with detailed scoring criteria and clinical applications.',
    totalSections: 8,
    readingTime: '70 min read',
    level: 'Advanced',
    icon: 'human-handsup',
    color: theme.colors.warning,
    instructor: 'Dr. Prashant Chaturvedi',
    overview: 'Become proficient in administering and scoring all 7 FMS tests. Learn to identify movement dysfunctions, understand scoring criteria, and develop corrective strategies based on findings.',
    learningObjectives: [
      'Administer all 7 FMS tests correctly',
      'Score each movement pattern accurately',
      'Identify movement dysfunctions',
      'Interpret composite scores',
      'Develop corrective exercise strategies'
    ],
    sections: [
      {
        id: 1,
        title: 'FMS Introduction & Overview',
        content: `The Functional Movement Screen (FMS) is a ranking and grading system that documents movement patterns essential to normal function.

**What is the FMS?**
• Developed by Gray Cook and Lee Burton
• Screens 7 fundamental movement patterns
• Identifies limitations and asymmetries
• Guides corrective exercise selection

**Why Use FMS?**
• Identifies injury risk factors
• Establishes movement baseline
• Guides exercise programming
• Tracks progress objectively
• Easy to administer

**The 7 FMS Tests:**
1. Deep Squat
2. Hurdle Step
3. Inline Lunge
4. Shoulder Mobility
5. Active Straight Leg Raise
6. Trunk Stability Push-Up
7. Rotary Stability

**Scoring System:**
Each test is scored 0-3:
• **3** = Performs movement correctly without compensation
• **2** = Performs movement with compensation
• **1** = Cannot perform movement pattern
• **0** = Pain during any portion of the movement

**Key Principles:**
• Test PATTERN, not performance
• Pain always scores 0
• Asymmetry scores based on lower side
• Clear tests only performed after 1 or 2 score

**Cut-off Scores:**
• **Total Score ≤14** = Increased injury risk
• **Asymmetry** = Score differs between sides
• **Pain (0 score)** = Requires clinical evaluation`,
        keyPoints: [
          'FMS tests movement quality, not quantity',
          'Score ≤14 indicates increased injury risk',
          'Pain always scores zero',
          'Asymmetries should be addressed'
        ]
      },
      {
        id: 2,
        title: 'Deep Squat',
        content: `The Deep Squat tests bilateral, symmetrical mobility of the hips, knees, and ankles.

**Equipment:**
• Dowel rod or PVC pipe
• FMS kit (optional)

**Starting Position:**
• Feet shoulder-width apart, toes forward
• Dowel held overhead with elbows at 90°
• Arms pressed overhead, elbows locked

**Movement:**
• Descend as deep as possible
• Heels remain on floor
• Maintain dowel position overhead
• Knees track over toes

**SCORING CRITERIA:**

**Score 3:**
• Torso parallel with tibia
• Femur below horizontal
• Knees aligned over feet
• Dowel aligned over feet
• Heels flat

**Score 2 (with heel lift):**
If unable to score 3, place 2x6 board under heels:
• Torso parallel with tibia
• Femur below horizontal
• Knees aligned over feet
• Dowel aligned over feet

**Score 1:**
• Unable to achieve position even with heel lift
• Compensations present:
  - Torso not parallel to tibia
  - Femur not below horizontal
  - Knees not aligned over feet
  - Lumbar flexion

**Score 0:**
• Pain during any portion

**What Deep Squat Assesses:**
• Ankle dorsiflexion
• Hip flexion
• Knee flexion
• Thoracic extension
• Shoulder mobility
• Core stability`,
        keyPoints: [
          'Tests bilateral hip, knee, ankle mobility',
          'Heel lift modification if score <3',
          'Torso should parallel tibia',
          'Dowel must stay over feet'
        ]
      },
      {
        id: 3,
        title: 'Hurdle Step',
        content: `The Hurdle Step assesses stride mechanics and single-leg stability.

**Equipment:**
• Dowel rod
• Hurdle (string tied to uprights at tibial tuberosity height)

**Setup:**
• Measure tibial tuberosity height
• Set hurdle at this height
• Patient stands with toes at base of hurdle

**Starting Position:**
• Feet together, toes touching hurdle base
• Dowel across shoulders behind neck

**Movement:**
• Step over hurdle
• Touch heel to floor on other side
• Return to start position
• Do not touch hurdle

**SCORING CRITERIA:**

**Score 3:**
• Hips, knees, ankles remain aligned in sagittal plane
• Minimal movement in lumbar spine
• Dowel remains parallel to floor
• Knee clears hurdle without hip hiking

**Score 2:**
• Movement in lumbar spine
• Dowel not parallel
• Alignment lost between hip, knee, ankle
• Contact with hurdle

**Score 1:**
• Loss of balance
• Contact between foot and hurdle
• Significant hip hiking

**Score 0:**
• Pain during movement

**Bilateral Comparison:**
Test both legs and record the lower score.

**What Hurdle Step Assesses:**
• Hip flexion/extension mobility
• Hip abductor stability
• Ankle dorsiflexion
• Core stability
• Single-leg balance`,
        keyPoints: [
          'Hurdle height = tibial tuberosity',
          'Tests single-leg stance stability',
          'Watch for hip hiking compensation',
          'Compare both sides'
        ]
      },
      {
        id: 4,
        title: 'Inline Lunge',
        content: `The Inline Lunge assesses hip and ankle mobility with trunk stability in a narrow base.

**Equipment:**
• Dowel rod
• 2x6 board (or FMS kit)

**Setup:**
• Measure tibial length (tibial tuberosity to floor)
• This distance determines step length

**Starting Position:**
• Front foot on board, toes at zero mark
• Back foot placed at tibial length mark
• Dowel held behind back (touching head, thoracic, sacrum)
• Opposite hand to front leg holds at lumbar curve

**Movement:**
• Lower back knee to touch board behind front heel
• Return to standing
• Maintain three points of contact with dowel

**SCORING CRITERIA:**

**Score 3:**
• Dowel maintains contact at head, T-spine, sacrum
• Dowel remains vertical
• Knee touches behind front heel
• No torso movement

**Score 2:**
• Dowel loses contact(s)
• Dowel not vertical
• Movement in torso
• Knee does not touch behind heel

**Score 1:**
• Loss of balance
• Dowel contacts not maintained
• Unable to touch knee down

**Score 0:**
• Pain during movement

**What Inline Lunge Assesses:**
• Hip flexor flexibility
• Quadriceps flexibility
• Hip abductor/adductor function
• Ankle stability
• Core stability
• Thoracic spine mobility`,
        keyPoints: [
          'Step length = tibial length',
          'Dowel must maintain 3 points contact',
          'Narrow base challenges stability',
          'Knee touches behind heel'
        ]
      },
      {
        id: 5,
        title: 'Shoulder Mobility',
        content: `The Shoulder Mobility test assesses bilateral shoulder range of motion combining internal rotation, adduction, and extension with external rotation and flexion.

**Equipment:**
• Measuring tape
• Patient's hand span measurement

**Setup:**
• Measure hand span (tip of thumb to tip of fifth finger)
• This is the reference measurement

**Starting Position:**
• Standing
• Make a fist with both hands (thumbs inside)

**Movement:**
• One hand reaches overhead and down behind back
• Other hand reaches behind back and up
• Attempt to bring fists as close as possible
• Measure distance between closest bony points

**SCORING CRITERIA:**

**Score 3:**
• Fists within one hand span

**Score 2:**
• Fists within 1.5 hand spans

**Score 1:**
• Fists not within 1.5 hand spans

**Score 0:**
• Pain during movement

**CLEARING TEST (Impingement Test):**
Performed only if score is 1 or 2:
• Place palm on opposite shoulder
• Attempt to raise elbow toward ceiling
• If pain = score 0

**Bilateral Testing:**
• Test both arms in top position
• Record the lower score

**What This Test Assesses:**
• Shoulder flexion/extension
• Internal/external rotation
• Scapular mobility
• Thoracic spine extension
• Postural awareness`,
        keyPoints: [
          'Use hand span as reference measurement',
          'Always perform clearing test',
          'Pain in clearing test = score 0',
          'Test both directions'
        ]
      },
      {
        id: 6,
        title: 'Active Straight Leg Raise',
        content: `The Active Straight Leg Raise (ASLR) tests active hip flexion while maintaining core stability.

**Equipment:**
• Dowel rod
• 2x6 board (to measure midpoint)

**Setup:**
• Find midpoint between ASIS and knee joint center
• Place dowel at this landmark perpendicular to body

**Starting Position:**
• Supine on floor
• Arms at sides, palms up
• Both legs extended
• Ankles dorsiflexed

**Movement:**
• Lift test leg with ankle dorsiflexed
• Keep knee straight
• Opposite leg remains flat on floor
• Note position relative to dowel at midpoint

**SCORING CRITERIA:**

**Score 3:**
• Ankle/malleolus passes the dowel (beyond midpoint)
• Opposite leg remains flat

**Score 2:**
• Ankle/malleolus between midpoint and knee
• Opposite leg remains flat

**Score 1:**
• Ankle/malleolus does not reach knee level
• Opposite leg rises off floor

**Score 0:**
• Pain during movement

**Bilateral Testing:**
• Test both legs
• Record the lower score

**What ASLR Assesses:**
• Active hip flexion with knee extended
• Hamstring/gastroc-soleus flexibility
• Contralateral hip extension
• Core stability during leg movement
• Pelvis stability`,
        keyPoints: [
          'Midpoint = between ASIS and knee center',
          'Opposite leg must stay flat',
          'Ankle must be dorsiflexed',
          'Tests hamstring flexibility AND core control'
        ]
      },
      {
        id: 7,
        title: 'Trunk Stability Push-Up',
        content: `The Trunk Stability Push-Up tests core stability during a closed-chain upper body movement.

**Equipment:**
• None

**Starting Position:**
• Prone position (face down)
• **Men**: Thumbs at forehead level
• **Women**: Thumbs at chin level
• Legs together, ankles dorsiflexed

**Movement:**
• Perform single push-up
• Lift body as one unit
• No lag or sag in spine
• Chest and stomach must lift together

**SCORING CRITERIA:**

**Score 3:**
• **Men**: One push-up with thumbs at forehead
• **Women**: One push-up with thumbs at chin
• Body lifts as unit with no spine movement

**Score 2:**
• **Men**: One push-up with thumbs at chin
• **Women**: One push-up with thumbs at clavicle
• Body lifts as unit with no spine movement

**Score 1:**
• Unable to perform push-up with modifications
• Any spinal sag or lag

**Score 0:**
• Pain during movement

**CLEARING TEST (Extension Clearing):**
Performed only if score is 1 or 2:
• Press up into prone extension (cobra position)
• If pain = score 0

**What This Test Assesses:**
• Core stability (anterior/posterior)
• Upper body strength
• Ability to maintain neutral spine under load
• Reflexive stabilization patterns`,
        keyPoints: [
          'Body must lift as one unit',
          'No lag or sag in spine allowed',
          'Different standards for men/women',
          'Clearing test required for scores 1-2'
        ]
      },
      {
        id: 8,
        title: 'Rotary Stability',
        content: `The Rotary Stability test assesses multi-plane trunk stability during combined upper and lower extremity movement.

**Equipment:**
• 2x6 board

**Starting Position:**
• Quadruped (hands and knees)
• Hands under shoulders, knees under hips
• 2x6 board placed between hands and knees
• Thumbs, knees, and toes touching board

**Movement (Unilateral Pattern):**
• Extend same-side arm and leg simultaneously
• Touch elbow to knee over the board
• Return to start position
• Repeat on opposite side

**SCORING CRITERIA:**

**Score 3:**
• Unilateral (same side) arm/leg
• Elbow and knee touch over board
• Spine remains parallel to board
• No loss of balance

**Score 2:**
• Diagonal (opposite) arm/leg pattern
• Elbow and knee touch
• Spine remains parallel to board
• No loss of balance

**Score 1:**
• Unable to perform diagonal pattern
• Loss of balance
• Inability to touch elbow to knee
• Spine rotation or side-bending

**Score 0:**
• Pain during movement

**CLEARING TEST (Flexion Clearing):**
Performed only if score is 1 or 2:
• Rock back onto heels (child's pose)
• Chest to thighs position
• If pain = score 0

**What This Test Assesses:**
• Multi-plane core stability
• Weight transfer ability
• Neuromuscular coordination
• Reflexive stabilization
• Upper-lower body coordination`,
        keyPoints: [
          'Unilateral pattern = score 3',
          'Diagonal pattern = score 2',
          'Spine must stay parallel to board',
          'Most challenging FMS test'
        ]
      }
    ],
    references: [
      'Cook G, et al. Functional Movement Screening: The use of fundamental movements as an assessment of function.',
      'Cook G. Movement: Functional Movement Systems.',
      'Kiesel K, et al. Can serious injury in professional football be predicted by a preseason FMS score?'
    ]
  },
  '5': {
    id: 5,
    title: 'Sports Psychology Essentials',
    description: 'Mental performance training for athletes covering anxiety management, confidence building, and peak performance strategies.',
    totalSections: 6,
    readingTime: '55 min read',
    level: 'Intermediate',
    icon: 'head-heart',
    color: '#E91E63',
    instructor: 'Dr. Prashant Chaturvedi',
    overview: 'This course provides a comprehensive foundation in sports psychology, covering mental skills training, anxiety management, motivation theories, and practical techniques to enhance athletic performance.',
    learningObjectives: [
      'Understand the psychological factors affecting athletic performance',
      'Apply anxiety management and arousal control techniques',
      'Develop mental toughness and resilience strategies',
      'Master visualization and imagery techniques',
      'Implement goal-setting frameworks for athletes',
      'Recognize signs of burnout and overtraining'
    ],
    sections: [
      {
        id: 1,
        title: 'Introduction to Sports Psychology',
        content: `Sports psychology is the scientific study of psychological factors that influence sports performance and physical activity participation.

**What is Sports Psychology?**
Sports psychology examines how psychological factors affect athletic performance and how participation in sports affects psychological development, health, and well-being.

**Key Areas of Focus:**
• Performance enhancement
• Mental skills training
• Team dynamics and cohesion
• Injury rehabilitation psychology
• Career transitions
• Youth sport development

**The Mental Game:**
Research consistently shows that elite athletes attribute 50-90% of their success to mental factors. Technical and physical skills alone are not enough for peak performance.

**Mental Skills:**
• Concentration and focus
• Confidence and self-belief
• Emotional control
• Goal setting
• Visualization/imagery
• Self-talk management`,
        keyPoints: [
          'Mental factors account for 50-90% of elite performance',
          'Sports psychology applies to all levels of athletes',
          'Mental skills can be trained like physical skills',
          'Both performance and well-being are important'
        ],
        clinicalTips: [
          'Assess mental readiness alongside physical readiness',
          'Normalize discussions about mental performance',
          'Integrate mental skills into regular training'
        ]
      },
      {
        id: 2,
        title: 'Anxiety and Arousal Management',
        content: `Understanding and managing anxiety is crucial for optimal athletic performance.

**Types of Anxiety:**
• **Cognitive Anxiety** - Worry, negative thoughts, fear of failure
• **Somatic Anxiety** - Physical symptoms (butterflies, sweating, muscle tension)
• **Trait Anxiety** - Personality tendency toward anxiety
• **State Anxiety** - Situation-specific anxiety

**Inverted-U Hypothesis:**
Performance increases with arousal up to an optimal point, then decreases with further arousal. This optimal level varies by:
• Task complexity (simple tasks tolerate higher arousal)
• Skill level (experts tolerate higher arousal)
• Individual differences

**Anxiety Management Techniques:**

**1. Progressive Muscle Relaxation (PMR)**
• Systematically tense and release muscle groups
• 15-20 minutes daily practice
• Reduces somatic anxiety

**2. Diaphragmatic Breathing**
• Breathe deeply into belly, not chest
• 4-count inhale, 6-count exhale
• Activates parasympathetic system

**3. Centering**
• Brief focusing technique (30 seconds)
• Focus on breathing and center of gravity
• Used immediately before performance

**4. Cognitive Restructuring**
• Identify negative thoughts
• Challenge irrational beliefs
• Replace with rational alternatives`,
        keyPoints: [
          'Distinguish cognitive from somatic anxiety',
          'Optimal arousal varies by task and individual',
          'PMR effectively reduces physical anxiety symptoms',
          'Centering is ideal for pre-performance moments'
        ],
        clinicalTips: [
          'Teach breathing techniques during low-stress training',
          'Practice relaxation skills daily, not just before competition',
          'Help athletes identify their optimal arousal zone'
        ]
      },
      {
        id: 3,
        title: 'Confidence and Self-Efficacy',
        content: `Confidence is one of the most consistent predictors of athletic success.

**Self-Efficacy (Bandura, 1977):**
The belief in one's capability to execute behaviors necessary to produce specific outcomes.

**Sources of Self-Efficacy:**

**1. Performance Accomplishments (Most Powerful)**
• Past successes build confidence
• Structured progression of challenges
• Mastery experiences

**2. Vicarious Experiences**
• Observing similar others succeed
• Video of successful performances
• Role models and mentors

**3. Verbal Persuasion**
• Encouragement from respected sources
• Realistic and specific feedback
• Positive coaching

**4. Physiological States**
• Interpreting arousal as energizing vs. debilitating
• Physical fitness and readiness
• Managing fatigue and pain

**Building Confidence:**
• Set and achieve progressive goals
• Focus on controllables
• Develop pre-performance routines
• Use positive self-talk
• Prepare thoroughly
• Recall past successes

**Confidence Profiling:**
Rate confidence in specific skills rather than general confidence. Target training to areas of lowest confidence.`,
        keyPoints: [
          'Past success is the strongest confidence builder',
          'Confidence is skill-specific, not general',
          'Thorough preparation supports confidence',
          'Confidence can be developed systematically'
        ],
        clinicalTips: [
          'Help athletes create a "confidence resume" of past successes',
          'Use video of successful performances',
          'Address confidence gaps with targeted training'
        ]
      },
      {
        id: 4,
        title: 'Visualization and Mental Imagery',
        content: `Mental imagery is a powerful technique used by elite athletes to enhance performance.

**What is Imagery?**
Creating or recreating experiences in the mind using all senses - visual, auditory, kinesthetic, olfactory, and gustatory.

**Types of Imagery:**
• **Internal (First-person)** - Seeing through your own eyes
• **External (Third-person)** - Watching yourself from outside
• Both are effective; preference varies individually

**PETTLEP Model (Holmes & Collins, 2001):**
• **P**hysical - Match physical position
• **E**nvironment - Include competition environment
• **T**ask - Rehearse actual task
• **T**iming - Real-time speed
• **L**earning - Update as skills improve
• **E**motion - Include emotional components
• **P**erspective - Internal or external view

**Uses of Imagery:**
• Skill acquisition and refinement
• Strategy rehearsal
• Competition preparation
• Confidence building
• Injury rehabilitation
• Arousal regulation

**Imagery Guidelines:**
• Practice regularly (10-15 minutes daily)
• Use all senses
• Include successful outcomes
• Make it vivid and controllable
• Start with relaxation
• Use scripts initially`,
        keyPoints: [
          'Imagery activates similar neural pathways to physical practice',
          'Use all senses, not just visual',
          'PETTLEP model improves imagery effectiveness',
          'Regular practice improves imagery ability'
        ],
        clinicalTips: [
          'Assess imagery ability before prescription',
          'Start with familiar, simple scenarios',
          'Use guided imagery scripts for beginners'
        ]
      },
      {
        id: 5,
        title: 'Goal Setting for Athletes',
        content: `Effective goal setting is fundamental to athletic success and motivation.

**SMART Goals:**
• **S**pecific - Clear and precise
• **M**easurable - Quantifiable
• **A**chievable - Realistic but challenging
• **R**elevant - Aligned with values and objectives
• **T**ime-bound - Clear deadline

**Types of Goals:**

**1. Outcome Goals**
• End result focused (win championship)
• Less control, depends on others
• Use sparingly

**2. Performance Goals**
• Personal standards (run 5K in 20:00)
• More controllable
• Objective measurement

**3. Process Goals**
• Behaviors and actions (keep elbow high)
• Most controllable
• Focus of attention during performance

**Goal Setting Principles:**
• Balance all three goal types
• Write goals down
• Make goals public (accountability)
• Set short, medium, and long-term goals
• Include goals for practice, not just competition
• Review and adjust regularly

**Goal Ladder:**
Create stepping stones from current level to ultimate goal. Each step should be challenging but achievable.`,
        keyPoints: [
          'Process goals are most controllable',
          'Balance outcome, performance, and process goals',
          'Written goals are more effective',
          'Regular review and adjustment is essential'
        ],
        clinicalTips: [
          'Start with process goals for skill development',
          'Help athletes break down large goals',
          'Review goals weekly during rehabilitation'
        ]
      },
      {
        id: 6,
        title: 'Mental Toughness and Resilience',
        content: `Mental toughness enables athletes to perform consistently regardless of circumstances.

**Definition:**
Mental toughness is the ability to perform toward the upper range of talent and skill regardless of competitive circumstances.

**4 Cs Model (Clough et al., 2002):**
• **Control** - Emotional control and life control
• **Commitment** - Goal-directed persistence
• **Challenge** - Viewing difficulties as opportunities
• **Confidence** - Self-belief and interpersonal confidence

**Developing Mental Toughness:**

**1. Adversity Training**
• Train in challenging conditions
• Simulate pressure situations
• Learn from setbacks

**2. Self-Talk Management**
• Identify negative self-talk patterns
• Develop instructional cue words
• Practice motivational statements

**3. Focus Control**
• Develop concentration routines
• Practice refocusing techniques
• Use cue words to redirect attention

**4. Emotional Regulation**
• Recognize emotional triggers
• Develop coping strategies
• Practice acceptance-based approaches

**Resilience:**
The ability to recover from setbacks, adapt to change, and keep going in the face of adversity.

**Building Resilience:**
• Develop strong support networks
• Maintain perspective on sport
• Cultivate multiple identities beyond athlete
• Learn from failure
• Practice gratitude and optimism`,
        keyPoints: [
          'Mental toughness can be developed through training',
          'The 4 Cs provide a framework for development',
          'Adversity in training builds competition resilience',
          'Identity beyond sport supports long-term resilience'
        ],
        clinicalTips: [
          'Normalize setbacks as part of development',
          'Help athletes develop coping strategies proactively',
          'Address athlete identity issues, especially post-injury'
        ]
      }
    ],
    references: [
      'Weinberg RS, Gould D. Foundations of Sport and Exercise Psychology. 7th ed.',
      'Vealey RS. Confidence in Sport. In: Tenenbaum G, Eklund RC, eds. Handbook of Sport Psychology.',
      'Holmes PS, Collins DJ. The PETTLEP approach to motor imagery. J Appl Sport Psychol. 2001;13(1):60-83.'
    ]
  },
  '6': {
    id: 6,
    title: 'Strength & Conditioning Certification',
    description: 'Comprehensive S&C programming based on ASCA and CSCS standards: periodization, power development, and sports-specific training.',
    totalSections: 8,
    readingTime: '75 min read',
    level: 'Advanced',
    icon: 'dumbbell',
    color: '#FF5722',
    instructor: 'Dr. Prashant Chaturvedi',
    overview: 'This course covers the essential knowledge for strength and conditioning professionals, aligned with ASCA (Australian Strength & Conditioning Association) and NSCA CSCS (Certified Strength and Conditioning Specialist) standards.',
    learningObjectives: [
      'Understand principles of training adaptation',
      'Design periodized training programs',
      'Apply biomechanical principles to exercise selection',
      'Implement power and speed development protocols',
      'Program for sport-specific demands',
      'Assess and monitor athlete performance',
      'Understand nutrition for performance',
      'Apply injury prevention strategies'
    ],
    sections: [
      {
        id: 1,
        title: 'Foundations of Strength & Conditioning',
        content: `Strength and conditioning is the physical and physiological development of athletes for elite sport performance.

**Role of the S&C Coach:**
• Develop physical capacities (strength, power, speed, endurance)
• Reduce injury risk through physical preparation
• Enhance sport-specific performance qualities
• Monitor athlete readiness and recovery

**Key Professional Bodies:**
• **NSCA** - National Strength and Conditioning Association (USA)
• **ASCA** - Australian Strength and Conditioning Association
• **UKSCA** - UK Strength and Conditioning Association

**CSCS Certification (NSCA):**
The gold standard certification requiring:
• Bachelor's degree
• Current CPR/AED certification
• Pass scientific foundations and practical/applied exam
• Continuing education credits

**Principles of Training:**
• **Specificity** - Train movements/systems used in sport
• **Overload** - Progressive increase in stress
• **Variation** - Manipulate variables to prevent plateaus
• **Reversibility** - Use it or lose it
• **Individuality** - Personalize programs`,
        keyPoints: [
          'S&C coaches develop physical capacities for sport',
          'CSCS is the industry standard certification',
          'Training must be specific to sport demands',
          'Progressive overload drives adaptation'
        ],
        clinicalTips: [
          'Always assess before prescribing',
          'Communication with sport coaches is essential',
          'Document all programs and progressions'
        ]
      },
      {
        id: 2,
        title: 'Periodization Fundamentals',
        content: `Periodization is the systematic planning of athletic training to achieve peak performance at the right time.

**Why Periodize?**
• Prevent overtraining and staleness
• Peak for important competitions
• Develop multiple physical qualities
• Manage fatigue and recovery
• Long-term athlete development

**Traditional (Linear) Periodization:**
Volume decreases, intensity increases over time.

**Macrocycle** (Annual Plan)
↓
**Mesocycle** (3-6 weeks)
↓
**Microcycle** (1 week)
↓
**Training Session**

**Phases of Traditional Periodization:**
1. **General Preparatory Phase** - High volume, low intensity, general fitness
2. **Specific Preparatory Phase** - Moderate volume, increasing intensity
3. **Competition Phase** - Low volume, high intensity, sport-specific
4. **Transition Phase** - Active rest, recovery

**Undulating (Non-Linear) Periodization:**
Frequent variation of volume and intensity within a week.
Example:
• Monday: Power (low volume, high intensity)
• Wednesday: Hypertrophy (high volume, moderate intensity)
• Friday: Strength (moderate volume, high intensity)

**Block Periodization:**
Concentrated blocks focusing on one quality:
• Accumulation Block: Volume/work capacity
• Transmutation Block: Sport-specific strength
• Realization Block: Competition peaking`,
        keyPoints: [
          'Periodization prevents overtraining and optimizes peaking',
          'Traditional periodization suits individual sports',
          'Undulating periodization suits team sports with long seasons',
          'Block periodization for elite athletes'
        ],
        clinicalTips: [
          'Match periodization model to competition schedule',
          'Monitor training load throughout mesocycles',
          'Adjust based on athlete response'
        ]
      },
      {
        id: 3,
        title: 'Strength Development',
        content: `Strength is the foundation for power, speed, and injury resilience.

**Types of Strength:**
• **Maximal Strength** - Maximum force production (1RM)
• **Relative Strength** - Strength per kg body weight
• **Strength Endurance** - Repeated force production
• **Reactive Strength** - Force in stretch-shortening cycle

**Strength Training Variables:**
• **Load**: 70-100% 1RM for strength
• **Volume**: 3-6 sets × 1-6 reps
• **Rest**: 2-5 minutes between sets
• **Frequency**: 2-4 sessions per muscle group/week

**Key Exercises:**
**Lower Body:**
• Back Squat - King of lower body exercises
• Deadlift - Posterior chain development
• Romanian Deadlift - Hamstring emphasis
• Bulgarian Split Squat - Single-leg strength

**Upper Body:**
• Bench Press - Horizontal push
• Bent-Over Row - Horizontal pull
• Overhead Press - Vertical push
• Pull-Up/Chin-Up - Vertical pull

**Strength Phases:**
1. **Anatomical Adaptation** (2-4 weeks) - Prepare tissues
2. **Hypertrophy** (4-6 weeks) - Build muscle mass
3. **Maximal Strength** (4-6 weeks) - Peak force production
4. **Maintenance** - In-season strength preservation`,
        keyPoints: [
          'Strength underpins all other physical qualities',
          'Load 70-100% 1RM for strength development',
          'Compound exercises most effective',
          'Phase training from hypertrophy to maximal strength'
        ],
        clinicalTips: [
          'Teach technique before adding load',
          'Use autoregulation (RPE) for daily load adjustments',
          'Monitor for signs of overreaching'
        ]
      },
      {
        id: 4,
        title: 'Power Development',
        content: `Power is the rate of force development - critical for explosive athletic movements.

**Power = Force × Velocity**

**Force-Velocity Curve:**
Training across the force-velocity spectrum:
• **High Force/Low Velocity**: Heavy squats (>85% 1RM)
• **Strength-Speed**: Loaded jumps (30-60% 1RM)
• **Speed-Strength**: Plyometrics, med ball throws
• **High Velocity/Low Force**: Sprinting, unloaded jumps

**Plyometric Training:**
Utilizes the stretch-shortening cycle (SSC):
• **Eccentric Phase**: Muscle lengthens, stores elastic energy
• **Amortization Phase**: Transition (keep short!)
• **Concentric Phase**: Explosive force production

**Plyometric Progression:**
1. **Low Intensity**: Box jumps, skipping
2. **Moderate**: Countermovement jumps, bounds
3. **High Intensity**: Depth jumps, reactive jumps

**Olympic Lifts:**
• Clean and derivatives
• Snatch and derivatives
• Develops rate of force development
• Requires technical coaching

**Power Training Guidelines:**
• Perform when fresh (early in session)
• Full recovery between sets (2-5 minutes)
• Quality over quantity
• Progress intensity before volume
• 3-6 sets × 1-5 reps`,
        keyPoints: [
          'Power = Force × Velocity',
          'Train across the force-velocity spectrum',
          'Plyometrics develop reactive strength',
          'Olympic lifts develop rate of force development'
        ],
        clinicalTips: [
          'Establish strength base before power training',
          'Teach landing mechanics before jumping',
          'Monitor ground contact times in plyometrics'
        ]
      },
      {
        id: 5,
        title: 'Speed and Agility',
        content: `Speed and agility are critical for most field and court sports.

**Speed Components:**
• **Acceleration** - 0-30m, forward lean, drive phase
• **Maximum Velocity** - 30-60m, upright posture
• **Speed Endurance** - Maintaining speed under fatigue

**Sprint Mechanics:**
**Acceleration Phase:**
• 45° forward lean
• Powerful arm drive
• Triple extension (ankle, knee, hip)
• Shin angles positive

**Maximum Velocity Phase:**
• Upright posture
• High knee lift
• Dorsiflexed ankle
• Minimal ground contact time

**Speed Training:**
• Short sprints (10-40m) with full recovery
• Hill sprints for acceleration
• Resisted sprinting (sleds, bands)
• Assisted sprinting (downhill, bands)

**Agility vs Change of Direction:**
• **Change of Direction (COD)**: Pre-planned direction changes
• **Agility**: Reactive, stimulus-response

**Agility Components:**
• Physical: Strength, power, technique
• Cognitive: Anticipation, pattern recognition, decision-making

**Agility Training:**
• Closed drills (cones, ladders) - Technique
• Open drills (reactive) - Decision-making
• Sport-specific scenarios`,
        keyPoints: [
          'Acceleration and max velocity have different mechanics',
          'Strength supports speed development',
          'True agility requires reactive decision-making',
          'Technical proficiency precedes speed work'
        ],
        clinicalTips: [
          'Video analysis helps identify mechanical faults',
          'Full recovery essential for speed quality',
          'Progress from closed to open agility drills'
        ]
      },
      {
        id: 6,
        title: 'Energy System Development',
        content: `Understanding energy systems is essential for sport-specific conditioning.

**Three Energy Systems:**

**1. Phosphagen System (ATP-PC)**
• Duration: 0-10 seconds
• Intensity: Maximal
• Recovery: 3-5 minutes
• Sports: Weightlifting, sprinting, jumping

**2. Glycolytic System**
• Duration: 10 seconds - 2 minutes
• Intensity: High
• Recovery: 1-3 minutes
• Sports: 400m, wrestling, repeated sprints

**3. Oxidative System**
• Duration: >2 minutes
• Intensity: Low-moderate
• Recovery: Variable
• Sports: Marathon, cycling, soccer (base)

**Conditioning Guidelines:**

**Aerobic Base:**
• Long slow distance (LSD): 60-70% HRmax, 30-60 min
• Tempo runs: 75-85% HRmax, 20-40 min
• Develops mitochondrial density, capillary network

**High-Intensity Interval Training (HIIT):**
• Work:Rest ratios based on energy system
• ATP-PC: 1:12-20 (10s work : 2-3 min rest)
• Glycolytic: 1:3-5 (30s work : 90-150s rest)
• Oxidative: 1:1-2 (3-5 min work : 3-5 min rest)

**Sport-Specific Conditioning:**
Analyze sport demands:
• Work:rest ratios
• Duration of efforts
• Recovery between efforts
• Total playing time`,
        keyPoints: [
          'Match training to sport energy demands',
          'Aerobic base supports anaerobic recovery',
          'Work:rest ratios determine energy system trained',
          'Progress from general to sport-specific conditioning'
        ],
        clinicalTips: [
          'Use time-motion analysis for sport demands',
          'Monitor heart rate recovery as fitness indicator',
          'Avoid excessive aerobic work for power athletes'
        ]
      },
      {
        id: 7,
        title: 'Testing and Monitoring',
        content: `Assessment guides programming and measures progress.

**Testing Principles:**
• **Validity** - Measures what it claims to measure
• **Reliability** - Consistent results
• **Specificity** - Relevant to sport demands
• **Standardization** - Consistent protocols

**Common S&C Tests:**

**Strength:**
• 1RM Testing (squat, bench, deadlift)
• Predicted 1RM from submaximal loads
• Isometric mid-thigh pull (force plate)

**Power:**
• Countermovement jump (CMJ)
• Squat jump (SJ)
• Reactive strength index (RSI)
• Medicine ball throw

**Speed:**
• 10m, 20m, 40m sprint times
• Flying 10m/20m (max velocity)
• Timing gates or smartphone apps

**Agility:**
• 5-10-5 Pro Agility
• T-Test
• 505 Change of Direction

**Endurance:**
• Yo-Yo Intermittent Recovery Test
• 30-15 Intermittent Fitness Test
• Time trials (sport-specific distances)

**Monitoring Training Load:**
• Session RPE × Duration = Training Load
• Acute:Chronic Workload Ratio (ACWR)
• Heart Rate Variability (HRV)
• Wellness questionnaires`,
        keyPoints: [
          'Valid and reliable tests guide programming',
          'Test what matters for the sport',
          'Monitor load to prevent overtraining',
          'Regular testing tracks progress'
        ],
        clinicalTips: [
          'Establish baseline before training begins',
          'Use consistent testing protocols',
          'ACWR between 0.8-1.3 is optimal'
        ]
      },
      {
        id: 8,
        title: 'Program Design',
        content: `Effective program design integrates all training components.

**Needs Analysis:**
1. Sport demands (physical, physiological, biomechanical)
2. Individual athlete assessment
3. Training history and experience
4. Time available (season phase)
5. Equipment and facilities

**Program Design Variables:**
• Exercise selection
• Exercise order
• Load and volume
• Rest intervals
• Frequency
• Periodization model

**Exercise Order:**
1. Power/Olympic lifts (most technical, CNS demanding)
2. Compound strength exercises
3. Assistance/isolation exercises
4. Core training
5. Conditioning (if same session)

**Sample Weekly Structure (Team Sport - Pre-Season):**

**Monday - Lower Body Strength:**
• Back Squat: 4×5 @80%
• Romanian Deadlift: 3×8
• Bulgarian Split Squat: 3×8/leg
• Nordic Hamstring: 3×6

**Tuesday - Upper Body + Power:**
• Bench Press: 4×5 @80%
• Pull-Ups: 4×8
• DB Row: 3×10
• Med Ball Throws: 3×8

**Wednesday - Speed/Agility:**
• Sprint technique drills
• Acceleration: 6×20m
• COD drills

**Thursday - Lower Body Power:**
• Hang Clean: 4×3 @70%
• Box Jumps: 4×5
• Trap Bar Deadlift: 3×5 @85%
• Single Leg Bounds: 3×6/leg

**Friday - Upper Body + Conditioning:**
• Push Press: 4×5
• Bent-Over Row: 4×6
• Conditioning: Sport-specific HIIT`,
        keyPoints: [
          'Needs analysis drives program design',
          'Exercise order affects performance',
          'Balance strength, power, and conditioning',
          'Individualize based on assessment'
        ],
        clinicalTips: [
          'Start conservative, progress systematically',
          'Build in recovery sessions',
          'Communicate with sport coaches on total load'
        ]
      }
    ],
    references: [
      'Haff GG, Triplett NT. Essentials of Strength Training and Conditioning (NSCA). 4th ed.',
      'Bompa TO, Buzzichelli C. Periodization: Theory and Methodology of Training. 6th ed.',
      'Joyce D, Lewindon D. High-Performance Training for Sports.',
      'ASCA Position Stand on Strength and Conditioning Practices.'
    ]
  }
};

export default function CourseDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [expandedSection, setExpandedSection] = useState<number | null>(1);
  
  const courseId = Array.isArray(id) ? id[0] : id || '1';
  const course = COURSE_DATA[courseId] || COURSE_DATA['1'];

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner': return theme.colors.success;
      case 'Intermediate': return theme.colors.warning;
      case 'Advanced': return theme.colors.error;
      default: return theme.colors.textMuted;
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
          <Text style={styles.headerTitle} numberOfLines={1}>Course Content</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Course Banner */}
        <View style={[styles.bannerCard, { borderColor: course.color }]}>
          <View style={[styles.bannerIcon, { backgroundColor: course.color + '20' }]}>
            <MaterialCommunityIcons name={course.icon as any} size={48} color={course.color} />
          </View>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.courseDescription}>{course.description}</Text>
          
          <View style={styles.courseMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="document-text" size={16} color={theme.colors.textMuted} />
              <Text style={styles.metaText}>{course.totalSections} Sections</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time" size={16} color={theme.colors.textMuted} />
              <Text style={styles.metaText}>{course.readingTime}</Text>
            </View>
            <View style={[styles.levelBadge, { backgroundColor: getLevelColor(course.level) }]}>
              <Text style={styles.levelText}>{course.level}</Text>
            </View>
          </View>

          <View style={styles.instructorRow}>
            <Ionicons name="person" size={16} color={theme.colors.accent} />
            <Text style={styles.instructorText}>Instructor: {course.instructor}</Text>
          </View>
        </View>

        {/* Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📖 Course Overview</Text>
          <Text style={styles.overviewText}>{course.overview}</Text>
        </View>

        {/* Learning Objectives */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Learning Objectives</Text>
          {course.learningObjectives.map((point, index) => (
            <View key={index} style={styles.learningPoint}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={styles.learningPointText}>{point}</Text>
            </View>
          ))}
        </View>

        {/* Course Content Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Course Content</Text>
          {course.sections.map((section, index) => (
            <View key={section.id} style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              >
                <View style={[styles.sectionNumber, { backgroundColor: course.color }]}>
                  <Text style={styles.sectionNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.sectionTitleText}>{section.title}</Text>
                <Ionicons
                  name={expandedSection === section.id ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>
              
              {expandedSection === section.id && (
                <View style={styles.sectionContent}>
                  {/* Main Content */}
                  <Text style={styles.contentText}>{section.content}</Text>
                  
                  {/* Key Points */}
                  <View style={styles.keyPointsContainer}>
                    <Text style={styles.keyPointsTitle}>📌 Key Points</Text>
                    {section.keyPoints.map((point, idx) => (
                      <View key={idx} style={styles.keyPoint}>
                        <View style={styles.bulletPoint} />
                        <Text style={styles.keyPointText}>{point}</Text>
                      </View>
                    ))}
                  </View>
                  
                  {/* Clinical Tips */}
                  {section.clinicalTips && section.clinicalTips.length > 0 && (
                    <View style={styles.clinicalTipsContainer}>
                      <Text style={styles.clinicalTipsTitle}>💡 Clinical Tips</Text>
                      {section.clinicalTips.map((tip, idx) => (
                        <View key={idx} style={styles.clinicalTip}>
                          <Ionicons name="bulb" size={16} color={theme.colors.warning} />
                          <Text style={styles.clinicalTipText}>{tip}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* References */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 References</Text>
          {course.references.map((ref, index) => (
            <Text key={index} style={styles.referenceText}>
              {index + 1}. {ref}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  scrollContent: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  backButton: { padding: theme.spacing.xs },
  headerTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, flex: 1, textAlign: 'center' },
  
  bannerCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.lg, borderWidth: 2, alignItems: 'center' },
  bannerIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.md },
  courseTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, textAlign: 'center', marginBottom: theme.spacing.sm },
  courseDescription: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.md, lineHeight: 22 },
  courseMeta: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  levelBadge: { paddingHorizontal: theme.spacing.sm, paddingVertical: 4, borderRadius: theme.borderRadius.sm },
  levelText: { fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  instructorRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  instructorText: { fontSize: theme.fontSize.sm, color: theme.colors.accent },

  section: { marginBottom: theme.spacing.lg },
  sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  overviewText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, lineHeight: 24 },
  
  learningPoint: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  learningPointText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, flex: 1, lineHeight: 22 },

  sectionCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.cardBorder, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md },
  sectionNumber: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  sectionNumberText: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  sectionTitleText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.medium, color: theme.colors.textPrimary, flex: 1 },
  
  sectionContent: { padding: theme.spacing.md, paddingTop: 0, borderTopWidth: 1, borderTopColor: theme.colors.cardBorder },
  contentText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, lineHeight: 26, marginBottom: theme.spacing.md },
  
  keyPointsContainer: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md },
  keyPointsTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  keyPoint: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: theme.spacing.xs },
  bulletPoint: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.accent, marginTop: 8, marginRight: theme.spacing.sm },
  keyPointText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, flex: 1, lineHeight: 22 },
  
  clinicalTipsContainer: { backgroundColor: theme.colors.warning + '15', borderRadius: theme.borderRadius.md, padding: theme.spacing.md, borderLeftWidth: 4, borderLeftColor: theme.colors.warning },
  clinicalTipsTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.warning, marginBottom: theme.spacing.sm },
  clinicalTip: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, marginBottom: theme.spacing.xs },
  clinicalTipText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, flex: 1, lineHeight: 22 },
  
  referenceText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, lineHeight: 22, marginBottom: theme.spacing.xs },
});
