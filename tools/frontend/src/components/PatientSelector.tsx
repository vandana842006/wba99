import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';
import api from '../utils/api';

export interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  created_at?: string;
}

interface PatientSelectorProps {
  physioId: string;
  selectedPatient: Patient | null;
  onSelectPatient: (patient: Patient) => void;
  label?: string;
  placeholder?: string;
}

export default function PatientSelector({
  physioId,
  selectedPatient,
  onSelectPatient,
  label = 'Select Patient',
  placeholder = 'Tap to select a patient',
}: PatientSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (modalVisible && physioId) {
      fetchPatients();
    }
  }, [modalVisible, physioId]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = patients.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.phone?.includes(searchQuery)
      );
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients(patients);
    }
  }, [searchQuery, patients]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/users?role=patient&physio_id=${physioId}`);
      setPatients(response.data || []);
      setFilteredPatients(response.data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
      setPatients([]);
      setFilteredPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    onSelectPatient(patient);
    setModalVisible(false);
    setSearchQuery('');
  };

  const renderPatientItem = ({ item }: { item: Patient }) => (
    <TouchableOpacity
      style={[
        styles.patientItem,
        selectedPatient?.id === item.id && styles.patientItemSelected,
      ]}
      onPress={() => handleSelectPatient(item)}
    >
      <View style={styles.patientAvatar}>
        <Ionicons name="person" size={24} color={theme.colors.accent} />
      </View>
      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>{item.name}</Text>
        {item.email && <Text style={styles.patientEmail}>{item.email}</Text>}
        {item.phone && <Text style={styles.patientPhone}>{item.phone}</Text>}
      </View>
      {selectedPatient?.id === item.id && (
        <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
      >
        {selectedPatient ? (
          <View style={styles.selectedPatient}>
            <Ionicons name="person" size={20} color={theme.colors.accent} />
            <Text style={styles.selectedPatientName}>{selectedPatient.name}</Text>
          </View>
        ) : (
          <Text style={styles.placeholder}>{placeholder}</Text>
        )}
        <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Patient</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search patients..."
                placeholderTextColor={theme.colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.accent} />
                <Text style={styles.loadingText}>Loading patients...</Text>
              </View>
            ) : filteredPatients.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people" size={48} color={theme.colors.textSecondary} />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No patients found' : 'No patients yet'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery ? 'Try a different search' : 'Add patients from the dashboard'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredPatients}
                renderItem={renderPatientItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.patientList}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  placeholder: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
  },
  selectedPatient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedPatientName: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    margin: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    padding: theme.spacing.sm,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
  },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
  patientList: {
    padding: theme.spacing.md,
  },
  patientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  patientItemSelected: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.secondary,
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  patientEmail: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  patientPhone: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
});
