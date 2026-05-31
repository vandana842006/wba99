import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';

interface ArticleContent {
  id: number;
  title: string;
  category: string;
  date: string;
  readTime: string;
  author: string;
  content: string[];
  keyPoints: string[];
  references: string[];
}

const ARTICLES: Record<string, ArticleContent> = {
  '1': {
    id: 1,
    title: 'Understanding Functional Movement Screen (FMS)',
    category: 'FMS',
    date: 'Feb 20, 2026',
    readTime: '8 min read',
    author: 'Dr. Prashant Chaturvedi',
    content: [
      'The Functional Movement Screen (FMS) is a screening tool used to evaluate movement patterns and identify limitations and asymmetries. Developed by Gray Cook and Lee Burton, it has become one of the most widely used movement assessments in sports medicine and rehabilitation.',
      
      '**The 7 FMS Tests:**\n\n1. **Deep Squat** - Tests bilateral mobility of hips, knees, and ankles\n2. **Hurdle Step** - Assesses stride mechanics and stability\n3. **Inline Lunge** - Tests hip mobility and trunk stability\n4. **Shoulder Mobility** - Evaluates shoulder ROM\n5. **Active Straight Leg Raise** - Tests hamstring flexibility and core stability\n6. **Trunk Stability Push-up** - Assesses core stability\n7. **Rotary Stability** - Tests multi-plane trunk stability',
      
      '**Scoring System:**\nEach movement is scored from 0-3:\n• 3 = Performs pattern correctly\n• 2 = Performs with compensation\n• 1 = Cannot perform pattern\n• 0 = Pain during movement',
      
      '**Clinical Significance:**\nResearch by Kiesel et al. (2007) found that professional football players with a composite score ≤14 had a significantly higher injury risk. This cut-off score has been validated across multiple populations.',
      
      '**Implementation:**\nThe FMS should be administered in a standardized environment with consistent verbal cues. Each test has specific clearing tests that must be performed when scores of 1 or 2 are achieved.',
    ],
    keyPoints: [
      'FMS identifies movement limitations and asymmetries',
      'Composite score ≤14 indicates increased injury risk',
      'Asymmetries should be addressed before performance training',
      'Pain always scores 0 and requires clinical evaluation',
    ],
    references: [
      'Cook G, et al. Pre-participation screening: The use of fundamental movements as an assessment. N Am J Sports Phys Ther. 2006;1(2):62-72.',
      'Kiesel K, et al. Can serious injury in professional football be predicted by a preseason FMS? N Am J Sports Phys Ther. 2007;2(3):147-158.',
    ],
  },
  '2': {
    id: 2,
    title: 'Biomechanics of Running Gait Analysis',
    category: 'Biomechanics',
    date: 'Feb 18, 2026',
    readTime: '12 min read',
    author: 'Dr. Prashant Chaturvedi',
    content: [
      'Running gait analysis is essential for understanding injury mechanisms and optimizing performance. Unlike walking, running involves a flight phase where both feet are off the ground, creating unique biomechanical demands.',
      
      '**The Running Gait Cycle:**\n\nThe running cycle consists of:\n• **Stance Phase (40%)** - Foot contact to toe-off\n• **Swing Phase (60%)** - Toe-off to next foot contact\n• **Float Phase** - Both feet airborne (absent in walking)',
      
      '**Ground Reaction Forces:**\nDuring running, GRF can reach 2-3x body weight compared to 1-1.5x during walking. The vertical impact peak and loading rate are key variables associated with injury risk.',
      
      '**Key Kinematic Variables:**\n• Foot strike pattern (rearfoot, midfoot, forefoot)\n• Cadence (optimal: 170-180 steps/min)\n• Vertical oscillation\n• Ground contact time\n• Hip drop (Trendelenburg sign)',
      
      '**Common Deviations:**\n• Overstriding (heel striking ahead of COM)\n• Excessive hip adduction (>15°)\n• Contralateral pelvic drop\n• Excessive trunk lean\n• Asymmetrical arm swing',
    ],
    keyPoints: [
      'Running GRF reaches 2-3x body weight',
      'Optimal cadence is 170-180 steps/minute',
      'Overstriding increases injury risk',
      'Hip strength is critical for running mechanics',
    ],
    references: [
      'Novacheck TF. The biomechanics of running. Gait Posture. 1998;7(1):77-95.',
      'Heiderscheit BC, et al. Effects of step rate manipulation on joint mechanics during running. Med Sci Sports Exerc. 2011;43(2):296-302.',
    ],
  },
  '3': {
    id: 3,
    title: 'AI in Musculoskeletal Assessment',
    category: 'Technology',
    date: 'Feb 15, 2026',
    readTime: '10 min read',
    author: 'Dr. Prashant Chaturvedi',
    content: [
      'Artificial Intelligence is transforming musculoskeletal assessment by enabling automated, objective analysis of movement patterns. Computer vision and machine learning algorithms can now analyze posture, gait, and functional movements with increasing accuracy.',
      
      '**Current Applications:**\n\n• **Pose Estimation** - MediaPipe and OpenPose can track 33+ body landmarks in real-time\n• **Gait Analysis** - AI can calculate spatiotemporal parameters from smartphone video\n• **Posture Assessment** - Automated detection of postural deviations\n• **Movement Quality** - ML models trained to score FMS-like patterns',
      
      '**Advantages:**\n• Objective measurements (reduced inter-rater variability)\n• Accessible (smartphone-based)\n• Time-efficient\n• Continuous monitoring capability\n• Data-driven insights',
      
      '**Limitations:**\n• Accuracy varies with lighting and camera angle\n• Cannot palpate or assess tissue quality\n• Limited in complex 3D movements\n• Requires clinical interpretation\n• Privacy and data security concerns',
      
      '**Future Directions:**\nIntegration of AI with wearable sensors, depth cameras, and force plates will enhance accuracy. Predictive models for injury risk are being developed using large datasets.',
    ],
    keyPoints: [
      'AI enables objective, automated movement analysis',
      'Smartphone-based assessment increases accessibility',
      'Clinical judgment remains essential for interpretation',
      'Privacy and accuracy are ongoing concerns',
    ],
    references: [
      'Tack C. Artificial intelligence and machine learning in sports performance. Curr Sports Med Rep. 2021;20(4):181-187.',
      'Cronin NJ. Using deep neural networks for kinematic analysis. J Biomech. 2021;118:110325.',
    ],
  },
  '4': {
    id: 4,
    title: 'Postural Deviations and Their Clinical Implications',
    category: 'Posture',
    date: 'Feb 12, 2026',
    readTime: '15 min read',
    author: 'Dr. Prashant Chaturvedi',
    content: [
      'Postural deviations are common findings in clinical practice and can contribute to musculoskeletal pain syndromes. Understanding these patterns helps guide assessment and treatment strategies.',
      
      '**Upper Crossed Syndrome (UCS):**\nDescribed by Vladimir Janda, UCS involves:\n• Tight: Upper trapezius, levator scapulae, pectorals, SCM\n• Weak: Deep neck flexors, rhomboids, lower trapezius\n• Result: Forward head, rounded shoulders, increased kyphosis',
      
      '**Lower Crossed Syndrome (LCS):**\n• Tight: Hip flexors, thoracolumbar extensors\n• Weak: Abdominals, gluteals\n• Result: Anterior pelvic tilt, hyperlordosis',
      
      '**Clinical Correlations:**\n• Forward head posture → Cervicogenic headache, TMJ dysfunction\n• Thoracic kyphosis → Shoulder impingement\n• Anterior pelvic tilt → Mechanical low back pain\n• Scoliosis → Asymmetrical loading patterns',
      
      '**Assessment Approach:**\n1. Observe in all three planes\n2. Use plumb line for reference\n3. Assess muscle length and strength\n4. Consider functional tasks\n5. Document with photographs',
    ],
    keyPoints: [
      'Janda syndromes describe predictable muscle imbalance patterns',
      'Posture affects load distribution and injury risk',
      'Treatment must address both tight and weak muscles',
      'Static posture alone does not predict pain',
    ],
    references: [
      'Janda V. Muscles and motor control in cervicogenic disorders. In: Grant R, ed. Physical Therapy of the Cervical and Thoracic Spine. 2002.',
      'Kendall FP, et al. Muscles: Testing and Function with Posture and Pain. 5th ed. 2005.',
    ],
  },
  '5': {
    id: 5,
    title: 'Y Balance Test: Reliability and Normative Values',
    category: 'MSK',
    date: 'Feb 10, 2026',
    readTime: '7 min read',
    author: 'Dr. Prashant Chaturvedi',
    content: [
      'The Y Balance Test (YBT) is a reliable screening tool derived from the Star Excursion Balance Test. It assesses dynamic balance and identifies lower extremity injury risk.',
      
      '**Test Protocol:**\nThe patient stands on one leg and reaches in three directions:\n• Anterior\n• Posterolateral (135°)\n• Posteromedial (135°)',
      
      '**Scoring:**\n• Normalize reach distances to limb length\n• Composite Score = (ANT + PL + PM) / (3 × Limb Length) × 100',
      
      '**Reliability:**\n• Intrarater ICC: 0.85-0.91\n• Interrater ICC: 0.80-0.85\n• SEM: 2-3 cm',
      
      '**Cut-off Values:**\n• Composite score <89% → Increased injury risk\n• Anterior asymmetry >4cm → Significant finding\n• Any direction asymmetry >4cm → Warrants investigation',
      
      '**Normative Data:**\nHealthy adults typically score 95-105% composite. Athletes may score higher. Values below 89% warrant intervention.',
    ],
    keyPoints: [
      'YBT has excellent reliability (ICC >0.85)',
      'Composite score <89% indicates injury risk',
      'Anterior reach asymmetry >4cm is significant',
      'Always normalize to limb length',
    ],
    references: [
      'Plisky PJ, et al. Star Excursion Balance Test as a predictor of lower extremity injury. J Orthop Sports Phys Ther. 2006;36(12):911-919.',
      'Gonell AC, et al. Relationship between Y balance test scores and injury in youth soccer. Int J Sports Phys Ther. 2015;10(1):21-28.',
    ],
  },
  '6': {
    id: 6,
    title: 'Shoulder Internal Rotation Deficit (GIRD) in Athletes',
    category: 'Sports Medicine',
    date: 'Feb 8, 2026',
    readTime: '9 min read',
    author: 'Dr. Prashant Chaturvedi',
    content: [
      'Glenohumeral Internal Rotation Deficit (GIRD) is a common finding in overhead athletes. It represents a loss of internal rotation compared to the non-dominant shoulder and is associated with shoulder pathology.',
      
      '**Definition:**\nGIRD = Internal rotation of non-dominant shoulder - Internal rotation of dominant shoulder',
      
      '**Significance:**\n• GIRD >18-20° is clinically significant\n• GIRD >25° indicates high injury risk\n• Associated with: SLAP lesions, internal impingement, posterior capsule tightness',
      
      '**Assessment:**\n• Position: Supine, 90° abduction, 90° elbow flexion\n• Stabilize scapula to prevent substitution\n• Measure IR passively\n• Calculate Total Arc of Motion (TAOM) = IR + ER',
      
      '**Total Arc Concept:**\nA shift in TAOM (decreased IR with increased ER) may be adaptive. Loss of TAOM (>5° compared to opposite side) is pathological.',
      
      '**Management:**\n• Sleeper stretch for posterior capsule\n• Cross-body stretch\n• Thoracic spine mobility\n• Rotator cuff strengthening\n• Scapular stabilization',
    ],
    keyPoints: [
      'GIRD >18° is clinically significant',
      'Assess Total Arc of Motion, not just IR',
      'TAOM loss >5° indicates pathology',
      'Posterior capsule stretching is key treatment',
    ],
    references: [
      'Wilk KE, et al. Deficits in glenohumeral passive ROM increase injury risk in baseball pitchers. Am J Sports Med. 2011;39(2):329-335.',
      'Manske R, et al. Glenohumeral motion deficits: friend or foe? Int J Sports Phys Ther. 2013;8(5):537-553.',
    ],
  },
};

export default function ArticleDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const articleId = Array.isArray(id) ? id[0] : id || '1';
  const article = ARTICLES[articleId] || ARTICLES['1'];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'FMS': return theme.colors.warning;
      case 'Biomechanics': return theme.colors.success;
      case 'Technology': return theme.colors.accent;
      case 'Posture': return '#9C27B0';
      case 'MSK': return theme.colors.error;
      case 'Sports Medicine': return '#00BCD4';
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
          <Text style={styles.headerTitle}>Article</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Article Header */}
        <View style={styles.articleHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(article.category) }]}>
            <Text style={styles.categoryText}>{article.category}</Text>
          </View>
          <Text style={styles.articleTitle}>{article.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="person" size={14} color={theme.colors.textMuted} />
            <Text style={styles.metaText}>{article.author}</Text>
            <Text style={styles.metaDivider}>•</Text>
            <Ionicons name="calendar" size={14} color={theme.colors.textMuted} />
            <Text style={styles.metaText}>{article.date}</Text>
            <Text style={styles.metaDivider}>•</Text>
            <Ionicons name="time" size={14} color={theme.colors.textMuted} />
            <Text style={styles.metaText}>{article.readTime}</Text>
          </View>
        </View>

        {/* Article Content */}
        <View style={styles.contentSection}>
          {article.content.map((paragraph, index) => (
            <Text key={index} style={styles.paragraph}>{paragraph}</Text>
          ))}
        </View>

        {/* Key Points */}
        <View style={styles.keyPointsCard}>
          <Text style={styles.keyPointsTitle}>📌 Key Takeaways</Text>
          {article.keyPoints.map((point, index) => (
            <View key={index} style={styles.keyPointRow}>
              <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
              <Text style={styles.keyPointText}>{point}</Text>
            </View>
          ))}
        </View>

        {/* References */}
        <View style={styles.referencesSection}>
          <Text style={styles.referencesTitle}>📚 References</Text>
          {article.references.map((ref, index) => (
            <Text key={index} style={styles.referenceText}>{index + 1}. {ref}</Text>
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
  headerTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  
  articleHeader: { marginBottom: theme.spacing.lg },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: theme.spacing.sm, paddingVertical: 4, borderRadius: theme.borderRadius.sm, marginBottom: theme.spacing.sm },
  categoryText: { fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  articleTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, lineHeight: 30, marginBottom: theme.spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  metaText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  metaDivider: { color: theme.colors.textMuted },
  
  contentSection: { marginBottom: theme.spacing.lg },
  paragraph: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, lineHeight: 26, marginBottom: theme.spacing.md },
  
  keyPointsCard: { backgroundColor: theme.colors.success + '15', borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.success + '30' },
  keyPointsTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  keyPointRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, marginBottom: theme.spacing.xs },
  keyPointText: { flex: 1, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 22 },
  
  referencesSection: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  referencesTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  referenceText: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, lineHeight: 20, marginBottom: theme.spacing.xs },
});
