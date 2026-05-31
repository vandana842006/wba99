import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';

// Certification Programs with colorful borders
const CERTIFICATION_PROGRAMS = [
  {
    id: 'fms',
    name: 'FMS Certification',
    description: 'Functional Movement Screen specialist',
    icon: 'human-handsup',
    color: '#00E676', // Green
    questions: 30,
    time: '45 min',
  },
  {
    id: 'sports-psych',
    name: 'Sports Psychology Certification',
    description: 'Mental performance specialist',
    icon: 'head-heart',
    color: '#FF4081', // Pink
    questions: 30,
    time: '45 min',
  },
  {
    id: 'strength',
    name: 'Strength & Conditioning',
    description: 'S&C specialist certification',
    icon: 'dumbbell',
    color: '#FF9800', // Orange
    questions: 30,
    time: '45 min',
  },
  {
    id: 'massage',
    name: 'Massage Certification',
    description: 'Therapeutic massage specialist exam',
    icon: 'hand-heart',
    color: '#AB47BC', // Purple
    questions: 30,
    time: '45 min',
  },
  {
    id: 'posture',
    name: 'Posture Analysis Certification',
    description: 'Postural assessment specialist',
    icon: 'human-male-height-variant',
    color: '#00BCD4', // Cyan
    questions: 30,
    time: '45 min',
  },
  {
    id: 'gait',
    name: 'Gait Analysis Certification',
    description: 'Walking & running gait specialist',
    icon: 'walk',
    color: '#8BC34A', // Light Green
    questions: 30,
    time: '45 min',
  },
  {
    id: 'special-test',
    name: 'Special Tests Certification',
    description: 'Orthopedic special tests specialist',
    icon: 'stethoscope',
    color: '#F44336', // Red
    questions: 30,
    time: '45 min',
  },
];

// Available Courses with detailed info
const AVAILABLE_COURSES = [
  {
    id: 'posture-fundamentals',
    title: 'Posture Assessment Fundamentals',
    description: 'Learn to identify postural deviations, plumb line assessment, and muscle imbalances with clinical applications.',
    icon: 'human',
    iconBg: '#1E88E5',
    level: 'Beginner',
    levelColor: '#00E676',
    lessons: 8,
    duration: '2.5 hours',
    topics: ['Plumb Line Assessment', 'Upper/Lower Crossed Syndrome', 'Postural Deviations', 'Clinical Applications'],
  },
  {
    id: 'msk-screening',
    title: 'MSK Screening Masterclass',
    description: 'Comprehensive guide to musculoskeletal screening tests including Y Balance, SLHB, and more.',
    icon: 'bandage',
    iconBg: '#E53935',
    level: 'Intermediate',
    levelColor: '#FF9800',
    lessons: 12,
    duration: '4 hours',
    topics: ['Y Balance Test', 'Single Leg Hop Battery', 'Joint Assessment', 'Red Flags'],
  },
  {
    id: 'gait-analysis',
    title: 'Walking Gait Analysis',
    description: 'Understanding the gait cycle, stance and swing phases, and pathological patterns.',
    icon: 'walk',
    iconBg: '#43A047',
    level: 'Intermediate',
    levelColor: '#FF9800',
    lessons: 10,
    duration: '3.5 hours',
    topics: ['Gait Cycle Phases', 'Stance vs Swing', 'Deviations', 'Video Analysis'],
  },
  {
    id: 'fms-course',
    title: 'Functional Movement Screen (FMS)',
    description: 'Master the 7 FMS tests: Deep Squat, Hurdle Step, Lunge, Shoulder Mobility, and more.',
    icon: 'human-handsup',
    iconBg: '#FF8F00',
    level: 'Advanced',
    levelColor: '#FF5252',
    lessons: 14,
    duration: '5 hours',
    topics: ['7 FMS Tests', 'Scoring System', 'Corrective Exercises', 'Clinical Interpretation'],
  },
  {
    id: 'anatomy',
    title: 'Anatomy for Assessment',
    description: 'Essential anatomy knowledge for physical assessment including joints, muscles, and nerves.',
    icon: 'human-male-board',
    iconBg: '#8E24AA',
    level: 'Beginner',
    levelColor: '#00E676',
    lessons: 16,
    duration: '6 hours',
    topics: ['Joint Anatomy', 'Muscle Actions', 'Nerve Supply', 'Surface Landmarks'],
  },
  {
    id: 'electrotherapy',
    title: 'Electrotherapy Fundamentals',
    description: 'TENS, IFT, Ultrasound, Russian current and other therapeutic modalities explained.',
    icon: 'flash',
    iconBg: '#00ACC1',
    level: 'Intermediate',
    levelColor: '#FF9800',
    lessons: 18,
    duration: '7 hours',
    topics: ['TENS Parameters', 'IFT Application', 'Ultrasound Protocol', 'Contraindications'],
  },
  {
    id: 'exercise-rx',
    title: 'Exercise Prescription',
    description: 'Evidence-based exercise prescription for rehabilitation and performance enhancement.',
    icon: 'dumbbell',
    iconBg: '#5E35B1',
    level: 'Advanced',
    levelColor: '#FF5252',
    lessons: 20,
    duration: '8 hours',
    topics: ['Periodization', 'Progressive Overload', 'Rehab Protocols', 'Return to Sport'],
  },
  {
    id: 'sports-psych-course',
    title: 'Sports Psychology Basics',
    description: 'Mental skills training, anxiety management, and performance optimization techniques.',
    icon: 'head-heart',
    iconBg: '#D81B60',
    level: 'Beginner',
    levelColor: '#00E676',
    lessons: 10,
    duration: '3 hours',
    topics: ['Goal Setting', 'Visualization', 'Anxiety Control', 'Focus Strategies'],
  },
  {
    id: 'special-tests',
    title: 'Special Tests Masterclass',
    description: 'Comprehensive guide to orthopedic special tests for clinical assessment and diagnosis.',
    icon: 'stethoscope',
    iconBg: '#F44336',
    level: 'Intermediate',
    levelColor: '#FF9800',
    lessons: 24,
    duration: '10 hours',
    topics: ['Shoulder Tests', 'Knee Tests', 'Hip Tests', 'Spine Tests', 'Ankle Tests', 'Sensitivity & Specificity'],
  },
];

export default function EducationScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [selectedTab, setSelectedTab] = useState<'certifications' | 'courses'>('certifications');

  const startCertification = (cert: typeof CERTIFICATION_PROGRAMS[0]) => {
    Alert.alert(
      `Start ${cert.name}`,
      `This exam contains ${cert.questions} questions. Time limit: ${cert.time}.\n\nAre you ready to begin?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Exam', 
          onPress: () => router.push(`/learn/certification?id=${cert.id}`)
        }
      ]
    );
  };

  const openCourse = (course: typeof AVAILABLE_COURSES[0]) => {
    router.push(`/learn/course-detail?id=${course.id}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>education/courses</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Yellow Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarFill} />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'certifications' && styles.tabActive]}
            onPress={() => setSelectedTab('certifications')}
          >
            <MaterialCommunityIcons 
              name="certificate" 
              size={20} 
              color={selectedTab === 'certifications' ? theme.colors.accent : theme.colors.textMuted} 
            />
            <Text style={[styles.tabText, selectedTab === 'certifications' && styles.tabTextActive]}>
              Certifications
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'courses' && styles.tabActive]}
            onPress={() => setSelectedTab('courses')}
          >
            <MaterialCommunityIcons 
              name="book-open-variant" 
              size={20} 
              color={selectedTab === 'courses' ? theme.colors.accent : theme.colors.textMuted} 
            />
            <Text style={[styles.tabText, selectedTab === 'courses' && styles.tabTextActive]}>
              Courses
            </Text>
          </TouchableOpacity>
        </View>

        {selectedTab === 'certifications' ? (
          <>
            {/* Certification Cards */}
            <View style={styles.certificationsList}>
              {CERTIFICATION_PROGRAMS.map((cert) => (
                <TouchableOpacity
                  key={cert.id}
                  style={[styles.certCard, { borderColor: cert.color }]}
                  onPress={() => startCertification(cert)}
                >
                  <MaterialCommunityIcons 
                    name={cert.icon as any} 
                    size={32} 
                    color={cert.color} 
                    style={styles.certIcon}
                  />
                  <View style={styles.certContent}>
                    <Text style={styles.certTitle}>{cert.name}</Text>
                    <Text style={styles.certDesc}>{cert.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={cert.color} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Certification Info */}
            <View style={styles.infoCard}>
              <MaterialCommunityIcons name="information" size={20} color={theme.colors.accent} />
              <View style={styles.infoContent}>
                <Text style={styles.infoText}>Each certification exam has 30 MCQs</Text>
                <Text style={styles.infoText}>Time limit: 45 minutes per exam</Text>
                <Text style={styles.infoText}>Passing score: 70%</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            {/* Available Courses Section Title */}
            <Text style={styles.sectionTitle}>Available Courses</Text>

            {/* Course Cards */}
            <View style={styles.coursesList}>
              {AVAILABLE_COURSES.map((course) => (
                <TouchableOpacity
                  key={course.id}
                  style={styles.courseCard}
                  onPress={() => openCourse(course)}
                >
                  <View style={[styles.courseIconContainer, { backgroundColor: course.iconBg }]}>
                    <MaterialCommunityIcons 
                      name={course.icon as any} 
                      size={28} 
                      color="#FFFFFF" 
                    />
                  </View>
                  <View style={styles.courseContent}>
                    <View style={styles.courseTitleRow}>
                      <Text style={styles.courseTitle}>{course.title}</Text>
                      <View style={[styles.levelBadge, { backgroundColor: course.levelColor }]}>
                        <Text style={styles.levelText}>{course.level}</Text>
                      </View>
                    </View>
                    <Text style={styles.courseDesc} numberOfLines={2}>{course.description}</Text>
                    <View style={styles.courseMeta}>
                      <View style={styles.metaItem}>
                        <Ionicons name="book-outline" size={14} color={theme.colors.textMuted} />
                        <Text style={styles.metaText}>{course.lessons} Lessons</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} />
                        <Text style={styles.metaText}>{course.duration}</Text>
                      </View>
                    </View>
                    {/* Progress bar placeholder */}
                    <View style={styles.courseProgress}>
                      <View style={[styles.courseProgressFill, { width: '0%', backgroundColor: course.iconBg }]} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
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
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: theme.colors.primaryLight,
  },
  progressBarFill: {
    height: '100%',
    width: '100%',
    backgroundColor: '#FFD700',
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  tabActive: {
    backgroundColor: theme.colors.accent + '20',
    borderColor: theme.colors.accent,
  },
  tabText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontWeight: theme.fontWeight.semibold,
  },
  tabTextActive: {
    color: theme.colors.accent,
  },
  certificationsList: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  certCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 2,
    borderLeftWidth: 4,
  },
  certIcon: {
    marginRight: theme.spacing.md,
  },
  certContent: {
    flex: 1,
  },
  certTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  certDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    gap: theme.spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  coursesList: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
  },
  courseCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  courseIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  courseContent: {
    flex: 1,
  },
  courseTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  courseTitle: {
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginRight: theme.spacing.sm,
  },
  levelBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
  },
  levelText: {
    fontSize: 10,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  courseDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  courseMeta: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  courseProgress: {
    height: 3,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  courseProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
