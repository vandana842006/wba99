import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';

interface Course {
  id: number;
  title: string;
  description: string;
  sections: number;
  readingTime: string;
  level: string;
  icon: string;
  color: string;
  highlights: string[];
}

const COURSES: Course[] = [
  {
    id: 1,
    title: 'Posture Assessment Fundamentals',
    description: 'Complete guide to identifying postural deviations, plumb line assessment, and muscle imbalances with clinical applications.',
    sections: 6,
    readingTime: '45 min read',
    level: 'Beginner',
    icon: 'human',
    color: theme.colors.accent,
    highlights: ['Plumb Line Assessment', 'Upper/Lower Crossed Syndrome', 'Clinical Documentation'],
  },
  {
    id: 2,
    title: 'MSK Screening Masterclass',
    description: 'Comprehensive guide to musculoskeletal screening tests including Y Balance, SLHB, Knee to Wall, GIRD, and Beighton Score.',
    sections: 6,
    readingTime: '60 min read',
    level: 'Intermediate',
    icon: 'bone',
    color: theme.colors.error,
    highlights: ['Y Balance Test', 'Single Leg Hamstring Bridge', 'GIRD Assessment'],
  },
  {
    id: 3,
    title: 'Walking Gait Analysis',
    description: 'Understanding the complete gait cycle, stance and swing phases, and identifying pathological gait patterns.',
    sections: 5,
    readingTime: '50 min read',
    level: 'Intermediate',
    icon: 'walk',
    color: theme.colors.success,
    highlights: ['Gait Cycle Phases', 'Common Deviations', 'Clinical Documentation'],
  },
  {
    id: 4,
    title: 'Functional Movement Screen (FMS)',
    description: 'Master all 7 FMS tests with detailed scoring criteria: Deep Squat, Hurdle Step, Inline Lunge, and more.',
    sections: 8,
    readingTime: '70 min read',
    level: 'Advanced',
    icon: 'human-handsup',
    color: theme.colors.warning,
    highlights: ['All 7 FMS Tests', 'Scoring Criteria', 'Corrective Strategies'],
  },
  {
    id: 5,
    title: 'Sports Psychology Essentials',
    description: 'Mental performance training for athletes: anxiety management, confidence building, visualization, and team dynamics.',
    sections: 6,
    readingTime: '55 min read',
    level: 'Intermediate',
    icon: 'head-heart',
    color: '#E91E63',
    highlights: ['Mental Readiness', 'Anxiety Management', 'Performance Psychology'],
  },
  {
    id: 6,
    title: 'Strength & Conditioning',
    description: 'Comprehensive S&C programming: periodization, power development, sports-specific training, and injury prevention.',
    sections: 8,
    readingTime: '75 min read',
    level: 'Advanced',
    icon: 'dumbbell',
    color: '#FF5722',
    highlights: ['Periodization', 'Power Training', 'Sports-Specific Programs'],
  },
];

const getLevelColor = (level: string) => {
  switch (level) {
    case 'Beginner': return theme.colors.success;
    case 'Intermediate': return theme.colors.warning;
    case 'Advanced': return theme.colors.error;
    default: return theme.colors.textMuted;
  }
};

export default function Courses() {
  const router = useRouter();
  const { currentUser } = useStore();
  const isAdmin = currentUser?.role === 'admin';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Education</Text>
          {isAdmin && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={14} color={theme.colors.textPrimary} />
              <Text style={styles.adminBadgeText}>Admin Access</Text>
            </View>
          )}
        </View>

        {/* Admin Access Banner */}
        {isAdmin && (
          <View style={styles.adminBanner}>
            <Ionicons name="star" size={20} color={theme.colors.warning} />
            <Text style={styles.adminBannerText}>
              Full Admin Access - All courses and certifications unlocked
            </Text>
          </View>
        )}

        {/* Intro */}
        <View style={styles.introCard}>
          <Ionicons name="school" size={40} color={theme.colors.success} />
          <Text style={styles.introTitle}>Learning Center</Text>
          <Text style={styles.introText}>
            Comprehensive courses on MSK assessment, biomechanics, and movement analysis.
          </Text>
        </View>

        {/* Certification Banners */}
        <Text style={styles.sectionTitle}>Certifications</Text>
        
        <TouchableOpacity 
          style={styles.certBanner}
          onPress={() => router.push('/education/certification')}
        >
          <View style={styles.certBannerLeft}>
            <Ionicons name="ribbon" size={32} color={theme.colors.warning} />
          </View>
          <View style={styles.certBannerContent}>
            <Text style={styles.certBannerTitle}>General Certification</Text>
            <Text style={styles.certBannerText}>Complete MSK/FMS exam - 30 questions</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.colors.warning} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.certBanner, { borderColor: theme.colors.error }]}
          onPress={() => router.push('/education/certification-exam?type=msk')}
        >
          <View style={styles.certBannerLeft}>
            <MaterialCommunityIcons name="bone" size={32} color={theme.colors.error} />
          </View>
          <View style={styles.certBannerContent}>
            <Text style={styles.certBannerTitle}>MSK Certification</Text>
            <Text style={styles.certBannerText}>Musculoskeletal specialist exam</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.colors.error} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.certBanner, { borderColor: theme.colors.success }]}
          onPress={() => router.push('/education/certification-exam?type=fms')}
        >
          <View style={styles.certBannerLeft}>
            <MaterialCommunityIcons name="human-handsup" size={32} color={theme.colors.success} />
          </View>
          <View style={styles.certBannerContent}>
            <Text style={styles.certBannerTitle}>FMS Certification</Text>
            <Text style={styles.certBannerText}>Functional Movement Screen specialist</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.colors.success} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.certBanner, { borderColor: '#E91E63' }]}
          onPress={() => router.push('/education/certification-exam?type=psychology')}
        >
          <View style={styles.certBannerLeft}>
            <MaterialCommunityIcons name="head-heart" size={32} color="#E91E63" />
          </View>
          <View style={styles.certBannerContent}>
            <Text style={styles.certBannerTitle}>Sports Psychology Certification</Text>
            <Text style={styles.certBannerText}>Mental performance specialist</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#E91E63" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.certBanner, { borderColor: '#FF5722' }]}
          onPress={() => router.push('/education/certification-exam?type=snc')}
        >
          <View style={styles.certBannerLeft}>
            <MaterialCommunityIcons name="dumbbell" size={32} color="#FF5722" />
          </View>
          <View style={styles.certBannerContent}>
            <Text style={styles.certBannerTitle}>Strength & Conditioning</Text>
            <Text style={styles.certBannerText}>S&C specialist certification</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FF5722" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.certBanner, { borderColor: '#9C27B0' }]}
          onPress={() => router.push('/education/certification-exam?type=massage')}
        >
          <View style={styles.certBannerLeft}>
            <MaterialCommunityIcons name="hand-heart" size={32} color="#9C27B0" />
          </View>
          <View style={styles.certBannerContent}>
            <Text style={styles.certBannerTitle}>Massage Certification</Text>
            <Text style={styles.certBannerText}>Therapeutic massage specialist exam</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9C27B0" />
        </TouchableOpacity>

        {/* Course Categories */}
        <Text style={styles.sectionTitle}>Available Courses</Text>

        {COURSES.map((course) => (
          <TouchableOpacity
            key={course.id}
            style={styles.courseCard}
            onPress={() => router.push(`/education/course-detail?id=${course.id}`)}
          >
            <View style={[styles.courseIconContainer, { backgroundColor: course.color + '20' }]}>
              <MaterialCommunityIcons 
                name={course.icon as any} 
                size={32} 
                color={course.color} 
              />
            </View>
            <View style={styles.courseContent}>
              <View style={styles.courseHeader}>
                <Text style={styles.courseTitle}>{course.title}</Text>
                <View style={[styles.levelBadge, { backgroundColor: getLevelColor(course.level) }]}>
                  <Text style={styles.levelText}>{course.level}</Text>
                </View>
              </View>
              <Text style={styles.courseDescription}>{course.description}</Text>
              <View style={styles.highlightsRow}>
                {course.highlights.slice(0, 2).map((h, i) => (
                  <View key={i} style={styles.highlightBadge}>
                    <Text style={styles.highlightText}>{h}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.courseMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="document-text" size={14} color={theme.colors.textMuted} />
                  <Text style={styles.metaText}>{course.sections} Sections</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="time" size={14} color={theme.colors.textMuted} />
                  <Text style={styles.metaText}>{course.readingTime}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Quick Links */}
        <View style={styles.quickLinksCard}>
          <Text style={styles.quickLinksTitle}>Quick Links</Text>
          <TouchableOpacity 
            style={styles.quickLink}
            onPress={() => router.push('/education/research-blog')}
          >
            <Ionicons name="document-text" size={20} color={theme.colors.accent} />
            <Text style={styles.quickLinkText}>Research Blog</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickLink}
            onPress={() => router.push('/education/certification')}
          >
            <Ionicons name="ribbon" size={20} color={theme.colors.warning} />
            <Text style={styles.quickLinkText}>General Certification</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickLink}
            onPress={() => router.push('/education/certification-exam?type=msk')}
          >
            <MaterialCommunityIcons name="bone" size={20} color={theme.colors.error} />
            <Text style={styles.quickLinkText}>MSK Certification</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickLink}
            onPress={() => router.push('/education/certification-exam?type=fms')}
          >
            <MaterialCommunityIcons name="human-handsup" size={20} color={theme.colors.success} />
            <Text style={styles.quickLinkText}>FMS Certification</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
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
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    marginRight: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  adminBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning + '20',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    gap: theme.spacing.sm,
  },
  adminBannerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.warning,
    fontWeight: theme.fontWeight.medium,
    flex: 1,
  },
  introCard: {
    backgroundColor: theme.colors.success + '15',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.success + '30',
  },
  introTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
  },
  introText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  certBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning + '15',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.warning,
  },
  certBannerLeft: {
    marginRight: theme.spacing.md,
  },
  certBannerContent: {
    flex: 1,
  },
  certBannerTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  certBannerText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  courseCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  courseIconContainer: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  courseContent: {
    flex: 1,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
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
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  levelText: {
    fontSize: 10,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  courseDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  courseMeta: {
    flexDirection: 'row',
    gap: theme.spacing.md,
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
  highlightsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  highlightBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  highlightText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  quickLinksCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  quickLinksTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  quickLinkText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.sm,
  },
});
