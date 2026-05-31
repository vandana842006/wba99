import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';

interface ResearchArticle {
  id: string;
  title: string;
  category: string;
  author: string;
  author_role: string;
  organization?: string;
  date: string;
  summary: string;
  content: string;
  readTime: string;
  image?: string;
  status: 'published' | 'pending' | 'rejected';
  views?: number;
}

// Default research articles
const DEFAULT_ARTICLES: ResearchArticle[] = [
  {
    id: '1',
    title: 'Evidence-Based Approaches to Lower Back Pain Management',
    category: 'MSK Research',
    author: 'Dr. Sarah Johnson',
    author_role: 'admin',
    date: '2026-03-15',
    summary: 'A comprehensive review of current evidence-based treatments for chronic lower back pain, including manual therapy techniques, exercise interventions, and emerging modalities.',
    content: 'Lower back pain (LBP) is one of the most prevalent musculoskeletal conditions worldwide...',
    readTime: '8 min',
    status: 'published',
    views: 245,
  },
  {
    id: '2',
    title: 'FMS Screening: Predicting Injury Risk in Athletes',
    category: 'FMS Studies',
    author: 'Dr. Michael Chen',
    author_role: 'physio',
    organization: 'WBA99 Sports Clinic',
    date: '2026-03-10',
    summary: 'New research on the effectiveness of Functional Movement Screening in identifying injury risk factors among professional athletes.',
    content: 'The Functional Movement Screen (FMS) has become a standard tool in sports medicine...',
    readTime: '12 min',
    status: 'published',
    views: 189,
  },
  {
    id: '3',
    title: 'Electrotherapy in Rehabilitation: TENS vs IFT Comparison',
    category: 'Electrotherapy',
    author: 'Dr. Emily Patel',
    author_role: 'physio',
    date: '2026-03-05',
    summary: 'Comparative analysis of TENS and IFT effectiveness in pain management and tissue healing across various musculoskeletal conditions.',
    content: 'Transcutaneous Electrical Nerve Stimulation (TENS) and Interferential Therapy (IFT)...',
    readTime: '10 min',
    status: 'published',
    views: 312,
  },
  {
    id: '4',
    title: 'AI-Powered Posture Assessment: A New Era in Diagnosis',
    category: 'Technology',
    author: 'WBA99 Research Team',
    author_role: 'org_head',
    organization: 'WBA99 Organization',
    date: '2026-02-28',
    summary: 'How artificial intelligence is revolutionizing postural assessment with 94.7% accuracy rates in detecting deviations.',
    content: 'The integration of AI in healthcare has opened new possibilities for accurate diagnosis...',
    readTime: '6 min',
    status: 'published',
    views: 567,
  },
  {
    id: '5',
    title: 'Gait Analysis in Neurological Rehabilitation',
    category: 'Gait Studies',
    author: 'Dr. Lisa Anderson',
    author_role: 'physio',
    date: '2026-02-20',
    summary: 'Video-based gait analysis is transforming neurological rehabilitation outcomes for stroke and Parkinson\'s patients.',
    content: 'Gait analysis has evolved significantly with the advent of video technology...',
    readTime: '15 min',
    status: 'published',
    views: 198,
  },
];

const CATEGORIES = ['All', 'MSK Research', 'FMS Studies', 'Electrotherapy', 'Technology', 'Gait Studies', 'Sports Science', 'Psychology'];

export default function ResearchBlogScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [articles, setArticles] = useState<ResearchArticle[]>(DEFAULT_ARTICLES);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<ResearchArticle | null>(null);
  
  // New article form
  const [newArticle, setNewArticle] = useState({
    title: '',
    category: 'MSK Research',
    summary: '',
    content: '',
    image: '',
  });
  const [publishing, setPublishing] = useState(false);

  const canPublish = currentUser && ['admin', 'physio', 'org_head'].includes(currentUser.role);

  const fetchArticles = async () => {
    try {
      const response = await api.get('/research/articles');
      if (response.data && response.data.length > 0) {
        setArticles([...response.data, ...DEFAULT_ARTICLES]);
      }
    } catch (error) {
      console.log('Using default articles');
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchArticles();
    setRefreshing(false);
  };

  const filteredArticles = selectedCategory === 'All'
    ? articles.filter(a => a.status === 'published')
    : articles.filter(a => a.category === selectedCategory && a.status === 'published');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setNewArticle(prev => ({
        ...prev,
        image: `data:image/jpeg;base64,${result.assets[0].base64}`
      }));
    }
  };

  const publishArticle = async () => {
    if (!newArticle.title.trim() || !newArticle.summary.trim() || !newArticle.content.trim()) {
      Alert.alert('Required', 'Please fill in all required fields');
      return;
    }

    setPublishing(true);
    try {
      const articleData = {
        ...newArticle,
        author: currentUser?.name || 'Anonymous',
        author_role: currentUser?.role || 'physio',
        organization: currentUser?.organization_name,
        date: new Date().toISOString().split('T')[0],
        readTime: `${Math.ceil(newArticle.content.length / 1000)} min`,
        status: currentUser?.role === 'admin' ? 'published' : 'pending',
      };

      await api.post('/research/articles', articleData);
      
      Alert.alert(
        'Success!',
        currentUser?.role === 'admin' 
          ? 'Your research has been published!'
          : 'Your research has been submitted for admin approval.',
        [{ text: 'OK', onPress: () => {
          setShowPublishModal(false);
          setNewArticle({ title: '', category: 'MSK Research', summary: '', content: '', image: '' });
          fetchArticles();
        }}]
      );
    } catch (error) {
      // Add locally for demo
      const newArticleData: ResearchArticle = {
        id: Date.now().toString(),
        ...newArticle,
        author: currentUser?.name || 'Anonymous',
        author_role: currentUser?.role || 'physio',
        organization: currentUser?.organization_name,
        date: new Date().toISOString().split('T')[0],
        readTime: `${Math.ceil(newArticle.content.length / 1000)} min`,
        status: currentUser?.role === 'admin' ? 'published' : 'pending',
        views: 0,
      };
      
      setArticles(prev => [newArticleData, ...prev]);
      Alert.alert(
        'Submitted!',
        currentUser?.role === 'admin' 
          ? 'Your research has been published!'
          : 'Your research has been submitted for admin approval.',
        [{ text: 'OK', onPress: () => {
          setShowPublishModal(false);
          setNewArticle({ title: '', category: 'MSK Research', summary: '', content: '', image: '' });
        }}]
      );
    } finally {
      setPublishing(false);
    }
  };

  const openArticle = (article: ResearchArticle) => {
    setSelectedArticle(article);
    setShowArticleModal(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Research Blog</Text>
          {canPublish && (
            <TouchableOpacity onPress={() => setShowPublishModal(true)}>
              <Ionicons name="add-circle" size={28} color={theme.colors.accent} />
            </TouchableOpacity>
          )}
        </View>

        {/* Hero Section */}
        <LinearGradient
          colors={['#1A3A5C', '#0D1B2A']}
          style={styles.heroSection}
        >
          <MaterialCommunityIcons name="file-document-multiple" size={48} color={theme.colors.accent} />
          <Text style={styles.heroTitle}>Latest Research & Studies</Text>
          <Text style={styles.heroSubtitle}>Evidence-based findings in MSK & FMS research</Text>
          {canPublish && (
            <TouchableOpacity 
              style={styles.publishBtn}
              onPress={() => setShowPublishModal(true)}
            >
              <Ionicons name="create" size={18} color="#fff" />
              <Text style={styles.publishBtnText}>Publish Your Research</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>

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

        {/* Articles Count */}
        <Text style={styles.resultsText}>
          {filteredArticles.length} {filteredArticles.length === 1 ? 'Article' : 'Articles'} Found
        </Text>

        {/* Articles List */}
        <View style={styles.articlesList}>
          {filteredArticles.map((article) => (
            <TouchableOpacity
              key={article.id}
              style={styles.articleCard}
              onPress={() => openArticle(article)}
            >
              {article.image ? (
                <Image
                  source={{ uri: article.image }}
                  style={styles.articleImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.articleImage, styles.placeholderImage]}>
                  <MaterialCommunityIcons name="file-document" size={40} color={theme.colors.textMuted} />
                </View>
              )}
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{article.category}</Text>
              </View>
              <View style={styles.articleContent}>
                <Text style={styles.articleTitle}>{article.title}</Text>
                <Text style={styles.articleSummary} numberOfLines={2}>{article.summary}</Text>
                <View style={styles.articleMeta}>
                  <View style={styles.authorInfo}>
                    <Ionicons name="person-circle" size={20} color={theme.colors.accent} />
                    <View>
                      <Text style={styles.authorName}>{article.author}</Text>
                      {article.organization && (
                        <Text style={styles.orgName}>{article.organization}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.metaRight}>
                    <View style={styles.readTime}>
                      <Ionicons name="time" size={14} color={theme.colors.textMuted} />
                      <Text style={styles.readTimeText}>{article.readTime}</Text>
                    </View>
                    {article.views && (
                      <View style={styles.views}>
                        <Ionicons name="eye" size={14} color={theme.colors.textMuted} />
                        <Text style={styles.viewsText}>{article.views}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Publish Modal */}
      <Modal visible={showPublishModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Publish Research</Text>
              <TouchableOpacity onPress={() => setShowPublishModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter research title"
                placeholderTextColor={theme.colors.textMuted}
                value={newArticle.title}
                onChangeText={(text) => setNewArticle(prev => ({ ...prev, title: text }))}
              />

              <Text style={styles.inputLabel}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelect}>
                {CATEGORIES.filter(c => c !== 'All').map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryOption,
                      newArticle.category === cat && styles.categoryOptionActive
                    ]}
                    onPress={() => setNewArticle(prev => ({ ...prev, category: cat }))}
                  >
                    <Text style={[
                      styles.categoryOptionText,
                      newArticle.category === cat && styles.categoryOptionTextActive
                    ]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Summary *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Brief summary of your research (2-3 sentences)"
                placeholderTextColor={theme.colors.textMuted}
                value={newArticle.summary}
                onChangeText={(text) => setNewArticle(prev => ({ ...prev, summary: text }))}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Full Content *</Text>
              <TextInput
                style={[styles.input, styles.textAreaLarge]}
                placeholder="Write your full research content here..."
                placeholderTextColor={theme.colors.textMuted}
                value={newArticle.content}
                onChangeText={(text) => setNewArticle(prev => ({ ...prev, content: text }))}
                multiline
                numberOfLines={10}
              />

              <Text style={styles.inputLabel}>Cover Image (Optional)</Text>
              <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
                {newArticle.image ? (
                  <Image source={{ uri: newArticle.image }} style={styles.uploadedImage} />
                ) : (
                  <>
                    <Ionicons name="image" size={32} color={theme.colors.textMuted} />
                    <Text style={styles.imageUploadText}>Tap to upload image</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color={theme.colors.accent} />
                <Text style={styles.infoText}>
                  {currentUser?.role === 'admin' 
                    ? 'As admin, your research will be published immediately.'
                    : 'Your research will be reviewed by admin before publishing.'}
                </Text>
              </View>

              <TouchableOpacity 
                style={[styles.submitBtn, publishing && styles.submitBtnDisabled]}
                onPress={publishArticle}
                disabled={publishing}
              >
                {publishing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={20} color="#fff" />
                    <Text style={styles.submitBtnText}>Submit Research</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Article Detail Modal */}
      <Modal visible={showArticleModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Research Article</Text>
              <TouchableOpacity onPress={() => setShowArticleModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedArticle && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedArticle.image && (
                  <Image source={{ uri: selectedArticle.image }} style={styles.articleDetailImage} />
                )}
                <View style={styles.articleDetailBadge}>
                  <Text style={styles.articleDetailBadgeText}>{selectedArticle.category}</Text>
                </View>
                <Text style={styles.articleDetailTitle}>{selectedArticle.title}</Text>
                
                <View style={styles.articleDetailMeta}>
                  <View style={styles.authorDetail}>
                    <Ionicons name="person-circle" size={24} color={theme.colors.accent} />
                    <View>
                      <Text style={styles.authorDetailName}>{selectedArticle.author}</Text>
                      {selectedArticle.organization && (
                        <Text style={styles.authorDetailOrg}>{selectedArticle.organization}</Text>
                      )}
                    </View>
                  </View>
                  <Text style={styles.dateText}>{selectedArticle.date}</Text>
                </View>

                <View style={styles.divider} />

                <Text style={styles.articleDetailSummary}>{selectedArticle.summary}</Text>
                
                <View style={styles.divider} />

                <Text style={styles.articleDetailContent}>{selectedArticle.content}</Text>

                <View style={styles.articleStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="time" size={16} color={theme.colors.textMuted} />
                    <Text style={styles.statText}>{selectedArticle.readTime} read</Text>
                  </View>
                  {selectedArticle.views && (
                    <View style={styles.statItem}>
                      <Ionicons name="eye" size={16} color={theme.colors.textMuted} />
                      <Text style={styles.statText}>{selectedArticle.views} views</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
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
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  heroSection: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  heroTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    marginTop: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  publishBtnText: {
    color: '#fff',
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  categoriesContainer: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
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
    color: '#fff',
    fontWeight: theme.fontWeight.semibold,
  },
  resultsText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  articlesList: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
  },
  articleCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  articleImage: {
    height: 150,
    width: '100%',
  },
  placeholderImage: {
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#fff',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
  },
  articleContent: {
    padding: theme.spacing.md,
  },
  articleTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  articleSummary: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  articleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flex: 1,
  },
  authorName: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.semibold,
  },
  orgName: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  metaRight: {
    alignItems: 'flex-end',
  },
  readTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readTimeText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  views: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  viewsText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  // Modal styles
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
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.md,
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  textAreaLarge: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  categorySelect: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  categoryOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  categoryOptionActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  categoryOptionText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  categoryOptionTextActive: {
    color: '#fff',
    fontWeight: theme.fontWeight.semibold,
  },
  imageUpload: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.cardBorder,
    minHeight: 120,
  },
  imageUploadText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
  },
  uploadedImage: {
    width: '100%',
    height: 150,
    borderRadius: theme.borderRadius.md,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  // Article detail styles
  articleDetailImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  articleDetailBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
  },
  articleDetailBadgeText: {
    color: '#fff',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
  },
  articleDetailTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  articleDetailMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  authorDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  authorDetailName: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.semibold,
  },
  authorDetailOrg: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  dateText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.cardBorder,
    marginVertical: theme.spacing.md,
  },
  articleDetailSummary: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  articleDetailContent: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    lineHeight: 26,
  },
  articleStats: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
});
