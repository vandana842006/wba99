import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import api from '../../src/utils/api';
import { useStore } from '../../src/store/useStore';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  summary: string;
  category: string;
  author_name: string;
  is_published: boolean;
  read_time: string;
  views: number;
  created_at: string;
}

const CATEGORIES = [
  { value: 'fms', label: 'FMS' },
  { value: 'biomechanics', label: 'Biomechanics' },
  { value: 'technology', label: 'Technology' },
  { value: 'posture', label: 'Posture' },
  { value: 'msk', label: 'MSK' },
  { value: 'sports_medicine', label: 'Sports Medicine' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'gait', label: 'Gait' },
];

export default function BlogManagement() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState('fms');
  const [isPublished, setIsPublished] = useState(true);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const response = await api.get(`/admin/blogs?admin_id=${currentUser?.id}`);
      setBlogs(response.data);
    } catch (error) {
      // Try public endpoint
      try {
        const publicResponse = await api.get('/blogs');
        setBlogs(publicResponse.data);
      } catch (err) {
        console.error('Error fetching blogs:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || !summary.trim()) {
      Alert.alert('Required', 'Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      if (editingBlog) {
        await api.put(`/admin/blogs/${editingBlog.id}?admin_id=${currentUser?.id}`, {
          title,
          content,
          summary,
          category,
          is_published: isPublished,
        });
        Alert.alert('Success', 'Blog post updated');
      } else {
        await api.post(`/admin/blogs?admin_id=${currentUser?.id}`, {
          title,
          content,
          summary,
          category,
          is_published: isPublished,
        });
        Alert.alert('Success', 'Blog post created');
      }
      
      setShowAddModal(false);
      resetForm();
      fetchBlogs();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save blog post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (blog: BlogPost) => {
    setEditingBlog(blog);
    setTitle(blog.title);
    setContent(blog.content);
    setSummary(blog.summary);
    setCategory(blog.category);
    setIsPublished(blog.is_published);
    setShowAddModal(true);
  };

  const handleDelete = async (blogId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this blog post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/blogs/${blogId}?admin_id=${currentUser?.id}`);
              fetchBlogs();
              Alert.alert('Success', 'Blog post deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete blog post');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setSummary('');
    setCategory('fms');
    setIsPublished(true);
    setEditingBlog(null);
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      fms: theme.colors.warning,
      biomechanics: '#9C27B0',
      technology: theme.colors.accent,
      posture: theme.colors.success,
      msk: theme.colors.error,
      sports_medicine: '#FF5722',
      assessment: '#607D8B',
      gait: '#00BCD4',
    };
    return colors[cat] || theme.colors.textMuted;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Blog Management</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => {
              resetForm();
              setShowAddModal(true);
            }}
          >
            <Ionicons name="add" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="document-text" size={24} color={theme.colors.accent} />
            <Text style={styles.statValue}>{blogs.length}</Text>
            <Text style={styles.statLabel}>Total Posts</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="eye" size={24} color={theme.colors.success} />
            <Text style={styles.statValue}>
              {blogs.reduce((sum, b) => sum + (b.views || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>Total Views</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.warning} />
            <Text style={styles.statValue}>
              {blogs.filter(b => b.is_published).length}
            </Text>
            <Text style={styles.statLabel}>Published</Text>
          </View>
        </View>

        {/* Blog List */}
        <Text style={styles.sectionTitle}>Blog Posts</Text>
        
        {blogs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No blog posts yet</Text>
            <Text style={styles.emptySubtext}>Tap + to create your first post</Text>
          </View>
        ) : (
          blogs.map((blog) => (
            <View key={blog.id} style={styles.blogCard}>
              <View style={styles.blogHeader}>
                <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(blog.category) }]}>
                  <Text style={styles.categoryText}>{blog.category.replace('_', ' ').toUpperCase()}</Text>
                </View>
                <View style={styles.blogActions}>
                  {!blog.is_published && (
                    <View style={styles.draftBadge}>
                      <Text style={styles.draftText}>DRAFT</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => handleEdit(blog)} style={styles.actionBtn}>
                    <Ionicons name="pencil" size={18} color={theme.colors.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(blog.id)} style={styles.actionBtn}>
                    <Ionicons name="trash" size={18} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.blogTitle}>{blog.title}</Text>
              <Text style={styles.blogSummary} numberOfLines={2}>
                {blog.summary}
              </Text>
              <View style={styles.blogMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="time" size={14} color={theme.colors.textMuted} />
                  <Text style={styles.metaText}>{blog.read_time}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="eye" size={14} color={theme.colors.textMuted} />
                  <Text style={styles.metaText}>{blog.views} views</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="person" size={14} color={theme.colors.textMuted} />
                  <Text style={styles.metaText}>{blog.author_name}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingBlog ? 'Edit Blog Post' : 'Create Blog Post'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowAddModal(false);
                resetForm();
              }}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter blog title"
                placeholderTextColor={theme.colors.textMuted}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.inputLabel}>Summary *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Brief summary of the post"
                placeholderTextColor={theme.colors.textMuted}
                value={summary}
                onChangeText={setSummary}
                multiline
                numberOfLines={2}
              />

              <Text style={styles.inputLabel}>Content *</Text>
              <TextInput
                style={[styles.textInput, styles.contentArea]}
                placeholder="Write your blog content here..."
                placeholderTextColor={theme.colors.textMuted}
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={10}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categorySelector}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryOption,
                      category === cat.value && styles.categoryOptionSelected,
                      { borderColor: getCategoryColor(cat.value) }
                    ]}
                    onPress={() => setCategory(cat.value)}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        category === cat.value && styles.categoryOptionTextSelected,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.publishToggle}
                onPress={() => setIsPublished(!isPublished)}
              >
                <View style={[styles.checkbox, isPublished && styles.checkboxChecked]}>
                  {isPublished && <Ionicons name="checkmark" size={16} color={theme.colors.textPrimary} />}
                </View>
                <Text style={styles.publishText}>Publish immediately</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={theme.colors.textPrimary} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={24} color={theme.colors.textPrimary} />
                    <Text style={styles.submitButtonText}>
                      {editingBlog ? 'Update Post' : 'Create Post'}
                    </Text>
                  </>
                )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
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
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: theme.colors.success,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  statValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  blogActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  draftBadge: {
    backgroundColor: theme.colors.textMuted,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  draftText: {
    fontSize: 10,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  actionBtn: {
    padding: 4,
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
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  blogMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  modalScroll: {
    padding: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  textInput: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  contentArea: {
    minHeight: 200,
    textAlignVertical: 'top',
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  categoryOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
  },
  categoryOptionSelected: {
    backgroundColor: theme.colors.accent + '30',
  },
  categoryOptionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  categoryOptionTextSelected: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  publishToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  publishText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
});
