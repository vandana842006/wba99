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
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { theme } from '../../src/utils/theme';
import api from '../../src/utils/api';
import { useStore } from '../../src/store/useStore';

interface StudyMaterial {
  id: string;
  title: string;
  description: string;
  category: string;
  file_type: string;
  file_name: string;
  download_count: number;
  created_at: string;
}

const CATEGORIES = [
  { value: 'posture', label: 'Posture' },
  { value: 'msk', label: 'MSK' },
  { value: 'walking', label: 'Walking' },
  { value: 'running', label: 'Running' },
  { value: 'anatomy', label: 'Anatomy' },
  { value: 'biomechanics', label: 'Biomechanics' },
  { value: 'fms', label: 'FMS' },
];

const FILE_TYPES = [
  { value: 'pdf', label: 'PDF Document', icon: 'document-text' },
  { value: 'video', label: 'Video', icon: 'videocam' },
  { value: 'image', label: 'Image', icon: 'image' },
  { value: 'document', label: 'Document', icon: 'document' },
];

export default function EducationManagement() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('posture');
  const [fileType, setFileType] = useState('pdf');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState<string | null>(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await api.get('/study-materials');
      setMaterials(response.data);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        setFileName(file.name);
        
        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: 'base64',
        });
        setFileData(`data:${file.mimeType};base64,${base64}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Required', 'Please fill in title and description');
      return;
    }

    if (!fileUrl && !fileData) {
      Alert.alert('Required', 'Please provide a file URL or upload a file');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/admin/study-materials?admin_id=${currentUser?.id}`, {
        title,
        description,
        category,
        file_type: fileType,
        file_url: fileUrl || null,
        file_data: fileData || null,
        file_name: fileName || title,
      });
      
      Alert.alert('Success', 'Study material added successfully');
      setShowAddModal(false);
      resetForm();
      fetchMaterials();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add study material');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (materialId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this study material?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/study-materials/${materialId}?admin_id=${currentUser?.id}`);
              fetchMaterials();
              Alert.alert('Success', 'Study material deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete study material');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('posture');
    setFileType('pdf');
    setFileUrl('');
    setFileName('');
    setFileData(null);
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      posture: theme.colors.accent,
      msk: theme.colors.error,
      walking: theme.colors.success,
      running: theme.colors.warning,
      anatomy: '#9C27B0',
      biomechanics: '#00BCD4',
      fms: '#FF5722',
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
          <Text style={styles.headerTitle}>Study Materials</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="document-text" size={24} color={theme.colors.accent} />
            <Text style={styles.statValue}>{materials.length}</Text>
            <Text style={styles.statLabel}>Materials</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="download" size={24} color={theme.colors.success} />
            <Text style={styles.statValue}>
              {materials.reduce((sum, m) => sum + (m.download_count || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>Downloads</Text>
          </View>
        </View>

        {/* Materials List */}
        <Text style={styles.sectionTitle}>Uploaded Materials</Text>
        
        {materials.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="folder-open" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No study materials yet</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first material</Text>
          </View>
        ) : (
          materials.map((material) => (
            <View key={material.id} style={styles.materialCard}>
              <View style={styles.materialHeader}>
                <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(material.category) }]}>
                  <Text style={styles.categoryText}>{material.category.toUpperCase()}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(material.id)}>
                  <Ionicons name="trash" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
              <Text style={styles.materialTitle}>{material.title}</Text>
              <Text style={styles.materialDescription} numberOfLines={2}>
                {material.description}
              </Text>
              <View style={styles.materialMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="document" size={14} color={theme.colors.textMuted} />
                  <Text style={styles.metaText}>{material.file_type.toUpperCase()}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="download" size={14} color={theme.colors.textMuted} />
                  <Text style={styles.metaText}>{material.download_count} downloads</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Material Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Study Material</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter title"
                placeholderTextColor={theme.colors.textMuted}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter description"
                placeholderTextColor={theme.colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categorySelector}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryOption,
                      category === cat.value && styles.categoryOptionSelected,
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

              <Text style={styles.inputLabel}>File Type</Text>
              <View style={styles.fileTypeSelector}>
                {FILE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.fileTypeOption,
                      fileType === type.value && styles.fileTypeOptionSelected,
                    ]}
                    onPress={() => setFileType(type.value)}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={20}
                      color={fileType === type.value ? theme.colors.textPrimary : theme.colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.fileTypeText,
                        fileType === type.value && styles.fileTypeTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>File URL (optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="https://example.com/file.pdf"
                placeholderTextColor={theme.colors.textMuted}
                value={fileUrl}
                onChangeText={setFileUrl}
              />

              <Text style={styles.orText}>OR</Text>

              <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
                <Ionicons name="cloud-upload" size={24} color={theme.colors.accent} />
                <Text style={styles.uploadButtonText}>
                  {fileName || 'Upload File'}
                </Text>
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
                    <Text style={styles.submitButtonText}>Add Material</Text>
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
    marginHorizontal: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
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
  materialCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  materialHeader: {
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
  materialTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  materialDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  materialMeta: {
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
    minHeight: 80,
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
    borderColor: theme.colors.cardBorder,
  },
  categoryOptionSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  categoryOptionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  categoryOptionTextSelected: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  fileTypeSelector: {
    gap: theme.spacing.sm,
  },
  fileTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    gap: theme.spacing.sm,
  },
  fileTypeOptionSelected: {
    backgroundColor: theme.colors.accent + '30',
    borderColor: theme.colors.accent,
  },
  fileTypeText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  fileTypeTextSelected: {
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.medium,
  },
  orText: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    marginVertical: theme.spacing.md,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.accent,
    gap: theme.spacing.sm,
  },
  uploadButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.accent,
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
