import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';

interface BlogPost {
  id: number;
  title: string;
  category: string;
  date: string;
  readTime: string;
  summary: string;
  icon: string;
}

const BLOG_POSTS: BlogPost[] = [
  {
    id: 1,
    title: 'Understanding Functional Movement Screen (FMS)',
    category: 'FMS',
    date: 'Feb 20, 2026',
    readTime: '8 min read',
    summary: 'A comprehensive guide to the 7 fundamental movement patterns assessed in FMS and their clinical significance.',
    icon: 'human-handsup',
  },
  {
    id: 2,
    title: 'Biomechanics of Running Gait Analysis',
    category: 'Biomechanics',
    date: 'Feb 18, 2026',
    readTime: '12 min read',
    summary: 'Understanding ground reaction forces, joint angles, and muscle activation patterns during the running cycle.',
    icon: 'run',
  },
  {
    id: 3,
    title: 'AI in Musculoskeletal Assessment',
    category: 'Technology',
    date: 'Feb 15, 2026',
    readTime: '10 min read',
    summary: 'How machine learning and computer vision are revolutionizing physical therapy assessments.',
    icon: 'robot',
  },
  {
    id: 4,
    title: 'Postural Deviations and Their Clinical Implications',
    category: 'Posture',
    date: 'Feb 12, 2026',
    readTime: '15 min read',
    summary: 'Identifying common postural abnormalities and their relationship to musculoskeletal pain syndromes.',
    icon: 'human',
  },
  {
    id: 5,
    title: 'Y Balance Test: Reliability and Normative Values',
    category: 'MSK',
    date: 'Feb 10, 2026',
    readTime: '7 min read',
    summary: 'Research findings on the Y Balance Test including ICC values and injury risk prediction.',
    icon: 'scale-balance',
  },
  {
    id: 6,
    title: 'Shoulder Internal Rotation Deficit (GIRD) in Athletes',
    category: 'Sports Medicine',
    date: 'Feb 8, 2026',
    readTime: '9 min read',
    summary: 'Assessment and management of glenohumeral internal rotation deficit in overhead athletes.',
    icon: 'arm-flex',
  },
  {
    id: 7,
    title: 'Core Stability: Beyond the Plank Test',
    category: 'Assessment',
    date: 'Feb 5, 2026',
    readTime: '11 min read',
    summary: 'Evidence-based approaches to assessing and training core stability for injury prevention.',
    icon: 'dumbbell',
  },
  {
    id: 8,
    title: 'Walking Gait Analysis: A Clinical Approach',
    category: 'Gait',
    date: 'Feb 2, 2026',
    readTime: '14 min read',
    summary: 'Systematic approach to observational gait analysis including common pathological patterns.',
    icon: 'walk',
  },
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'FMS': return theme.colors.warning;
    case 'Biomechanics': return '#9C27B0';
    case 'Technology': return theme.colors.accent;
    case 'Posture': return theme.colors.success;
    case 'MSK': return theme.colors.error;
    case 'Sports Medicine': return '#FF5722';
    case 'Assessment': return '#607D8B';
    case 'Gait': return '#00BCD4';
    default: return theme.colors.textMuted;
  }
};

export default function ResearchBlog() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Research Blog</Text>
        </View>

        {/* Intro */}
        <View style={styles.introCard}>
          <Ionicons name="document-text" size={40} color={theme.colors.accent} />
          <Text style={styles.introTitle}>Latest Research & Articles</Text>
          <Text style={styles.introText}>
            Stay updated with the latest findings in MSK assessment, biomechanics, and physical therapy.
          </Text>
        </View>

        {/* Blog Posts */}
        {BLOG_POSTS.map((post) => (
          <TouchableOpacity
            key={post.id}
            style={styles.blogCard}
            onPress={() => router.push(`/education/article-detail?id=${post.id}`)}
          >
            <View style={styles.blogHeader}>
              <View style={[styles.blogIconContainer, { backgroundColor: getCategoryColor(post.category) + '30' }]}>
                <MaterialCommunityIcons 
                  name={post.icon as any} 
                  size={24} 
                  color={getCategoryColor(post.category)} 
                />
              </View>
              <View style={styles.blogMeta}>
                <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(post.category) }]}>
                  <Text style={styles.categoryText}>{post.category}</Text>
                </View>
                <Text style={styles.blogDate}>{post.date} · {post.readTime}</Text>
              </View>
            </View>
            <Text style={styles.blogTitle}>{post.title}</Text>
            <Text style={styles.blogSummary}>{post.summary}</Text>
            <View style={styles.readMoreRow}>
              <Text style={styles.readMoreText}>Read Article</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.colors.accent} />
            </View>
          </TouchableOpacity>
        ))}

        {/* External Resources */}
        <View style={styles.resourcesCard}>
          <Text style={styles.resourcesTitle}>External Resources</Text>
          <TouchableOpacity 
            style={styles.resourceLink}
            onPress={() => Linking.openURL('https://www.jospt.org')}
          >
            <Ionicons name="link" size={20} color={theme.colors.accent} />
            <Text style={styles.resourceLinkText}>Journal of Orthopaedic & Sports PT</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.resourceLink}
            onPress={() => Linking.openURL('https://www.physio-pedia.com')}
          >
            <Ionicons name="link" size={20} color={theme.colors.accent} />
            <Text style={styles.resourceLinkText}>Physiopedia</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.resourceLink}
            onPress={() => Linking.openURL('https://www.functionalmovement.com')}
          >
            <Ionicons name="link" size={20} color={theme.colors.accent} />
            <Text style={styles.resourceLinkText}>Functional Movement Systems</Text>
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
  },
  introCard: {
    backgroundColor: theme.colors.accent + '15',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.accent + '30',
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
  blogCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  blogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  blogIconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  blogMeta: {
    flex: 1,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  blogDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  blogTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  blogSummary: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  readMoreText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.medium,
  },
  resourcesCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  resourcesTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  resourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  resourceLinkText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.accent,
  },
});
