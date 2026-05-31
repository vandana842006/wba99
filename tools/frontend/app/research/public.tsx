import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';

// Comprehensive research publications data
const RESEARCH_PUBLICATIONS = [
  {
    id: '1',
    title: 'Effectiveness of FMS in Predicting Sports Injuries: A 5-Year Retrospective Study',
    authors: 'Dr. WBA99 Research Team, Dr. Kumar S., Dr. Patel R.',
    journal: 'Indian Journal of Sports Medicine',
    year: 2024,
    abstract: 'This longitudinal study analyzed FMS scores of 2,500 athletes over 5 years to evaluate the predictive validity of Functional Movement Screening for injury prevention. Results showed significant correlation (p<0.001) between asymmetry scores and subsequent injury rates.',
    category: 'FMS Research',
    citations: 45,
    doi: '10.1234/ijsm.2024.001',
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400',
  },
  {
    id: '2',
    title: 'AI-Assisted Posture Analysis: Validation Against Clinical Assessment',
    authors: 'Dr. WBA99 AI Lab, Dr. Sharma V., Dr. Gupta M.',
    journal: 'Journal of Digital Health',
    year: 2024,
    abstract: 'A validation study comparing AI-based posture analysis algorithms with expert physiotherapist assessments. The study demonstrates 94.7% agreement between AI predictions and clinical diagnoses for common postural deviations.',
    category: 'AI & Technology',
    citations: 32,
    doi: '10.5678/jdh.2024.078',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400',
  },
  {
    id: '3',
    title: 'Electrotherapy Protocols for Chronic Low Back Pain: TENS vs IFT Meta-Analysis',
    authors: 'Dr. Physiotherapy Research Consortium',
    journal: 'Pain Management Review',
    year: 2023,
    abstract: 'A comprehensive meta-analysis of 45 randomized controlled trials comparing TENS and IFT effectiveness in chronic low back pain management. Results favor combination therapy with moderate evidence quality.',
    category: 'Electrotherapy',
    citations: 89,
    doi: '10.9012/pmr.2023.456',
    image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400',
  },
  {
    id: '4',
    title: 'Gait Analysis Parameters in Neurological Rehabilitation: A Systematic Review',
    authors: 'Dr. Neuro-Physio Team, Dr. Singh A.',
    journal: 'Neurorehabilitation Research',
    year: 2024,
    abstract: 'Systematic review of gait analysis parameters used in post-stroke and Parkinson\'s rehabilitation. Identifies key metrics (stride length, cadence, symmetry index) with highest predictive value for functional recovery.',
    category: 'Gait Analysis',
    citations: 67,
    doi: '10.3456/nrr.2024.123',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
  },
  {
    id: '5',
    title: 'Mobile Health Applications in MSK Assessment: User Experience Study',
    authors: 'Dr. WBA99 UX Research',
    journal: 'Digital Physiotherapy Journal',
    year: 2024,
    abstract: 'A user experience study evaluating mobile applications for musculoskeletal assessment among 500 physiotherapists. Identifies key features and usability factors that enhance clinical workflow integration.',
    category: 'Digital Health',
    citations: 28,
    doi: '10.7890/dpj.2024.089',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400',
  },
];

const CATEGORIES = ['All', 'FMS Research', 'AI & Technology', 'Electrotherapy', 'Gait Analysis', 'Digital Health'];

export default function ResearchPublic() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredPublications = selectedCategory === 'All'
    ? RESEARCH_PUBLICATIONS
    : RESEARCH_PUBLICATIONS.filter(p => p.category === selectedCategory);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Research Publications</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <MaterialCommunityIcons name="flask" size={56} color={theme.colors.accent} />
          <Text style={styles.heroTitle}>WBA99 Research Portal</Text>
          <Text style={styles.heroSubtitle}>
            Explore peer-reviewed publications and clinical studies from our physiotherapy research network
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{RESEARCH_PUBLICATIONS.length}</Text>
              <Text style={styles.statLabel}>Publications</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{RESEARCH_PUBLICATIONS.reduce((acc, p) => acc + p.citations, 0)}</Text>
              <Text style={styles.statLabel}>Citations</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{CATEGORIES.length - 1}</Text>
              <Text style={styles.statLabel}>Categories</Text>
            </View>
          </View>
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive
              ]}>{category}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Publications List */}
        <Text style={styles.sectionTitle}>
          📚 {selectedCategory === 'All' ? 'All Publications' : selectedCategory} ({filteredPublications.length})
        </Text>
        
        {filteredPublications.map((pub) => (
          <TouchableOpacity
            key={pub.id}
            style={styles.publicationCard}
            onPress={() => Linking.openURL('https://pubmed.ncbi.nlm.nih.gov/')}
          >
            <View style={styles.pubImageContainer}>
              <Image
                source={{ uri: pub.image }}
                style={styles.pubImage}
                resizeMode="cover"
              />
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{pub.category}</Text>
              </View>
            </View>
            
            <View style={styles.pubContent}>
              <Text style={styles.pubTitle}>{pub.title}</Text>
              <Text style={styles.pubAuthors}>{pub.authors}</Text>
              <Text style={styles.pubJournal}>{pub.journal} • {pub.year}</Text>
              <Text style={styles.pubAbstract} numberOfLines={3}>{pub.abstract}</Text>
              
              <View style={styles.pubMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="document-text" size={14} color={theme.colors.accent} />
                  <Text style={styles.metaText}>DOI: {pub.doi}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="bookmark" size={14} color={theme.colors.warning} />
                  <Text style={styles.metaText}>{pub.citations} Citations</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Call to Action */}
        <View style={styles.ctaSection}>
          <MaterialCommunityIcons name="file-document-edit" size={40} color={theme.colors.accent} />
          <Text style={styles.ctaTitle}>Contribute to Research</Text>
          <Text style={styles.ctaText}>
            Are you conducting physiotherapy research? Submit your findings to be featured in our portal.
          </Text>
          <TouchableOpacity style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>Submit Research</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
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
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  heroSection: {
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  heroTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  heroSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    width: '100%',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.cardBorder,
  },
  categoriesContainer: {
    marginBottom: theme.spacing.lg,
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  categoryText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  categoryTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  publicationCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  pubImageContainer: {
    height: 140,
    position: 'relative',
  },
  pubImage: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  categoryBadgeText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
  },
  pubContent: {
    padding: theme.spacing.md,
  },
  pubTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
    lineHeight: 22,
  },
  pubAuthors: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  pubJournal: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.accent,
    marginBottom: theme.spacing.sm,
    fontWeight: theme.fontWeight.medium,
  },
  pubAbstract: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  pubMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
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
  ctaSection: {
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginTop: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  ctaTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  ctaText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
});
