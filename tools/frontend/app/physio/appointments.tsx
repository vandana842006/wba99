import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
}

interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  patient_email: string;
  date: string;
  time: string;
  duration: number;
  treatment_type: string;
  location: {
    name: string;
    address: string;
    lat?: number;
    lng?: number;
    google_maps_url?: string;
  };
  notes: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  reminder_sent: boolean;
  created_at: string;
}

// Sample patients for demo
const SAMPLE_PATIENTS: Patient[] = [
  { id: '1', name: 'John Smith', phone: '+91 98765 43210', email: 'john@example.com', address: '123 Main St' },
  { id: '2', name: 'Sarah Johnson', phone: '+91 98765 43211', email: 'sarah@example.com', address: '456 Oak Ave' },
  { id: '3', name: 'Michael Brown', phone: '+91 98765 43212', email: 'michael@example.com', address: '789 Pine Rd' },
  { id: '4', name: 'Emily Davis', phone: '+91 98765 43213', email: 'emily@example.com', address: '321 Elm St' },
  { id: '5', name: 'Robert Wilson', phone: '+91 98765 43214', email: 'robert@example.com', address: '654 Maple Dr' },
];

const TREATMENT_TYPES = [
  'Posture Assessment',
  'Gait Analysis',
  'Manual Therapy',
  'Exercise Therapy',
  'Electrotherapy',
  'SD Curve Testing',
  'Follow-up Consultation',
  'Initial Assessment',
  'Sports Rehabilitation',
  'Neurological Rehab',
];

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00'
];

export default function AppointmentsScreen() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>(SAMPLE_PATIENTS);
  
  // Modal states
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  // New appointment form
  const [newPatient, setNewPatient] = useState<Patient | null>(null);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientEmail, setNewPatientEmail] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [duration, setDuration] = useState('30');
  const [treatmentType, setTreatmentType] = useState('');
  const [notes, setNotes] = useState('');
  
  // Location
  const [locationName, setLocationName] = useState('WBA99 Clinic');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationLat, setLocationLat] = useState('');
  const [locationLng, setLocationLng] = useState('');

  // Filter
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'all'>('day');

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/appointments?physio_id=${currentUser?.id}`);
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
      // Load demo data
      setAppointments([
        {
          id: '1',
          patient_id: '1',
          patient_name: 'John Smith',
          patient_phone: '+91 98765 43210',
          patient_email: 'john@example.com',
          date: new Date().toISOString().split('T')[0],
          time: '10:00',
          duration: 30,
          treatment_type: 'Posture Assessment',
          location: {
            name: 'WBA99 Clinic',
            address: '123 Health Street, Medical District',
            lat: 28.6139,
            lng: 77.2090,
            google_maps_url: 'https://maps.google.com/?q=28.6139,77.2090',
          },
          notes: 'Initial assessment for lower back pain',
          status: 'scheduled',
          reminder_sent: false,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          patient_id: '2',
          patient_name: 'Sarah Johnson',
          patient_phone: '+91 98765 43211',
          patient_email: 'sarah@example.com',
          date: new Date().toISOString().split('T')[0],
          time: '11:30',
          duration: 45,
          treatment_type: 'Manual Therapy',
          location: {
            name: 'WBA99 Clinic',
            address: '123 Health Street, Medical District',
            lat: 28.6139,
            lng: 77.2090,
            google_maps_url: 'https://maps.google.com/?q=28.6139,77.2090',
          },
          notes: 'Follow-up session',
          status: 'confirmed',
          reminder_sent: true,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const selectPatient = (patient: Patient) => {
    setNewPatient(patient);
    setNewPatientName(patient.name);
    setNewPatientPhone(patient.phone);
    setNewPatientEmail(patient.email);
    setShowPatientPicker(false);
  };

  const createNewPatient = () => {
    if (!newPatientName.trim()) {
      Alert.alert('Error', 'Please enter patient name');
      return;
    }
    const newP: Patient = {
      id: Date.now().toString(),
      name: newPatientName,
      phone: newPatientPhone,
      email: newPatientEmail,
    };
    setNewPatient(newP);
    setPatients(prev => [...prev, newP]);
    setShowPatientPicker(false);
  };

  const generateGoogleMapsUrl = () => {
    if (locationLat && locationLng) {
      return `https://www.google.com/maps?q=${locationLat},${locationLng}`;
    } else if (locationAddress) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationAddress)}`;
    }
    return '';
  };

  const openLocationInMaps = () => {
    const url = generateGoogleMapsUrl();
    if (url) {
      Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Please enter location address or coordinates');
    }
  };

  const saveAppointment = async () => {
    if (!newPatient && !newPatientName) {
      Alert.alert('Error', 'Please select or enter a patient');
      return;
    }
    if (!treatmentType) {
      Alert.alert('Error', 'Please select treatment type');
      return;
    }

    const appointment: Appointment = {
      id: Date.now().toString(),
      patient_id: newPatient?.id || Date.now().toString(),
      patient_name: newPatientName || newPatient?.name || '',
      patient_phone: newPatientPhone || newPatient?.phone || '',
      patient_email: newPatientEmail || newPatient?.email || '',
      date: selectedDate,
      time: selectedTime,
      duration: parseInt(duration),
      treatment_type: treatmentType,
      location: {
        name: locationName,
        address: locationAddress,
        lat: locationLat ? parseFloat(locationLat) : undefined,
        lng: locationLng ? parseFloat(locationLng) : undefined,
        google_maps_url: generateGoogleMapsUrl(),
      },
      notes,
      status: 'scheduled',
      reminder_sent: false,
      created_at: new Date().toISOString(),
    };

    try {
      const response = await fetch(`${API_URL}/api/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...appointment,
          physio_id: currentUser?.id,
          physio_name: currentUser?.name,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Appointment created successfully!');
      }
    } catch (error) {
      console.error('Error saving appointment:', error);
    }

    setAppointments(prev => [...prev, appointment]);
    resetForm();
    setShowNewAppointment(false);
  };

  const resetForm = () => {
    setNewPatient(null);
    setNewPatientName('');
    setNewPatientPhone('');
    setNewPatientEmail('');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedTime('10:00');
    setDuration('30');
    setTreatmentType('');
    setNotes('');
  };

  const shareAppointment = async (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowShareModal(true);
  };

  const shareViaWhatsApp = async () => {
    if (!selectedAppointment) return;
    
    const message = `
📅 *Appointment Confirmation*

*Patient:* ${selectedAppointment.patient_name}
*Date:* ${selectedAppointment.date}
*Time:* ${selectedAppointment.time}
*Duration:* ${selectedAppointment.duration} minutes
*Treatment:* ${selectedAppointment.treatment_type}

📍 *Location:* ${selectedAppointment.location.name}
${selectedAppointment.location.address}
${selectedAppointment.location.google_maps_url ? `\n🗺️ Maps: ${selectedAppointment.location.google_maps_url}` : ''}

${selectedAppointment.notes ? `📝 Notes: ${selectedAppointment.notes}` : ''}

Thank you for choosing WBA99!
    `.trim();

    const phone = selectedAppointment.patient_phone.replace(/\s/g, '').replace('+', '');
    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
    
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Error', 'WhatsApp is not installed');
    }
    setShowShareModal(false);
  };

  const shareViaSMS = async () => {
    if (!selectedAppointment) return;
    
    const message = `Appointment: ${selectedAppointment.date} at ${selectedAppointment.time}. Treatment: ${selectedAppointment.treatment_type}. Location: ${selectedAppointment.location.address}. Maps: ${selectedAppointment.location.google_maps_url || ''}`;
    
    const url = `sms:${selectedAppointment.patient_phone}?body=${encodeURIComponent(message)}`;
    
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Error', 'Could not open SMS app');
    }
    setShowShareModal(false);
  };

  const shareViaEmail = async () => {
    if (!selectedAppointment) return;
    
    const subject = `Appointment Confirmation - ${selectedAppointment.date}`;
    const body = `
Dear ${selectedAppointment.patient_name},

Your appointment has been scheduled:

Date: ${selectedAppointment.date}
Time: ${selectedAppointment.time}
Duration: ${selectedAppointment.duration} minutes
Treatment: ${selectedAppointment.treatment_type}

Location: ${selectedAppointment.location.name}
Address: ${selectedAppointment.location.address}
${selectedAppointment.location.google_maps_url ? `Google Maps: ${selectedAppointment.location.google_maps_url}` : ''}

${selectedAppointment.notes ? `Notes: ${selectedAppointment.notes}` : ''}

Thank you for choosing WBA99!

Best regards,
${currentUser?.name || 'WBA99 Team'}
    `.trim();

    const url = `mailto:${selectedAppointment.patient_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Error', 'Could not open email app');
    }
    setShowShareModal(false);
  };

  const copyToClipboard = async () => {
    if (!selectedAppointment) return;
    
    const text = `
Appointment Details:
Patient: ${selectedAppointment.patient_name}
Date: ${selectedAppointment.date}
Time: ${selectedAppointment.time}
Treatment: ${selectedAppointment.treatment_type}
Location: ${selectedAppointment.location.name}, ${selectedAppointment.location.address}
Maps: ${selectedAppointment.location.google_maps_url || 'Not available'}
    `.trim();

    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Appointment details copied to clipboard');
    setShowShareModal(false);
  };

  const exportAppointments = async () => {
    const data = appointments.map(a => ({
      Date: a.date,
      Time: a.time,
      Patient: a.patient_name,
      Phone: a.patient_phone,
      Treatment: a.treatment_type,
      Status: a.status,
      Location: `${a.location.name}, ${a.location.address}`,
    }));

    const csv = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n');

    await Clipboard.setStringAsync(csv);
    Alert.alert('Exported', 'Appointments data copied to clipboard as CSV');
  };

  const filteredAppointments = appointments.filter(a => {
    if (viewMode === 'day') return a.date === filterDate;
    if (viewMode === 'week') {
      const appointmentDate = new Date(a.date);
      const filterD = new Date(filterDate);
      const weekStart = new Date(filterD);
      weekStart.setDate(filterD.getDate() - filterD.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return appointmentDate >= weekStart && appointmentDate <= weekEnd;
    }
    return true;
  }).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#4CAF50';
      case 'scheduled': return '#2196F3';
      case 'completed': return '#9E9E9E';
      case 'cancelled': return '#F44336';
      default: return theme.colors.textMuted;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointments</Text>
        <TouchableOpacity onPress={exportAppointments}>
          <Ionicons name="download-outline" size={24} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>

      {/* View Mode Tabs */}
      <View style={styles.viewTabs}>
        {(['day', 'week', 'all'] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.viewTab, viewMode === mode && styles.viewTabActive]}
            onPress={() => setViewMode(mode)}
          >
            <Text style={[styles.viewTabText, viewMode === mode && styles.viewTabTextActive]}>
              {mode === 'day' ? 'Day' : mode === 'week' ? 'Week' : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date Picker (for day/week view) */}
      {viewMode !== 'all' && (
        <View style={styles.datePicker}>
          <TouchableOpacity 
            style={styles.dateNavBtn}
            onPress={() => {
              const d = new Date(filterDate);
              d.setDate(d.getDate() - (viewMode === 'day' ? 1 : 7));
              setFilterDate(d.toISOString().split('T')[0]);
            }}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateDisplay}>
            <Ionicons name="calendar" size={20} color={theme.colors.accent} />
            <Text style={styles.dateText}>
              {viewMode === 'day' 
                ? new Date(filterDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                : `Week of ${new Date(filterDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              }
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.dateNavBtn}
            onPress={() => {
              const d = new Date(filterDate);
              d.setDate(d.getDate() + (viewMode === 'day' ? 1 : 7));
              setFilterDate(d.toISOString().split('T')[0]);
            }}
          >
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Appointments List */}
      <ScrollView style={styles.appointmentsList} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 50 }} />
        ) : filteredAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-blank" size={64} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No appointments for this period</Text>
            <TouchableOpacity style={styles.addFirstBtn} onPress={() => setShowNewAppointment(true)}>
              <Text style={styles.addFirstBtnText}>Add First Appointment</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredAppointments.map((appointment) => (
            <View key={appointment.id} style={styles.appointmentCard}>
              <View style={styles.appointmentTime}>
                <Text style={styles.timeText}>{appointment.time}</Text>
                <Text style={styles.durationText}>{appointment.duration} min</Text>
              </View>
              
              <View style={styles.appointmentDetails}>
                <View style={styles.patientRow}>
                  <Ionicons name="person" size={16} color={theme.colors.textPrimary} />
                  <Text style={styles.patientName}>{appointment.patient_name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
                    <Text style={styles.statusText}>{appointment.status}</Text>
                  </View>
                </View>
                
                <Text style={styles.treatmentText}>{appointment.treatment_type}</Text>
                
                <TouchableOpacity 
                  style={styles.locationRow}
                  onPress={() => appointment.location.google_maps_url && Linking.openURL(appointment.location.google_maps_url)}
                >
                  <Ionicons name="location" size={14} color={theme.colors.accent} />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {appointment.location.name}
                  </Text>
                  <Ionicons name="open-outline" size={14} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.appointmentActions}>
                <TouchableOpacity 
                  style={styles.actionBtn}
                  onPress={() => shareAppointment(appointment)}
                >
                  <Ionicons name="share-outline" size={20} color={theme.colors.accent} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionBtn}
                  onPress={() => Linking.openURL(`tel:${appointment.patient_phone}`)}
                >
                  <Ionicons name="call-outline" size={20} color="#4CAF50" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Appointment FAB */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setShowNewAppointment(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* New Appointment Modal */}
      <Modal visible={showNewAppointment} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Appointment</Text>
              <TouchableOpacity onPress={() => setShowNewAppointment(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Patient Selection */}
              <Text style={styles.inputLabel}>Patient</Text>
              <TouchableOpacity 
                style={styles.selectBtn}
                onPress={() => setShowPatientPicker(true)}
              >
                <Ionicons name="person" size={20} color={theme.colors.accent} />
                <Text style={styles.selectBtnText}>
                  {newPatient ? newPatient.name : 'Select or Add Patient'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>

              {/* Date & Time */}
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.inputLabel}>Date</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedDate}
                    onChangeText={setSelectedDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.inputLabel}>Duration (min)</Text>
                  <TextInput
                    style={styles.input}
                    value={duration}
                    onChangeText={setDuration}
                    keyboardType="numeric"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
              </View>

              {/* Time Slots */}
              <Text style={styles.inputLabel}>Time</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeSlots}>
                {TIME_SLOTS.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[styles.timeSlot, selectedTime === time && styles.timeSlotActive]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Text style={[styles.timeSlotText, selectedTime === time && styles.timeSlotTextActive]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Treatment Type */}
              <Text style={styles.inputLabel}>Treatment Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.treatmentTypes}>
                {TREATMENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.treatmentChip, treatmentType === type && styles.treatmentChipActive]}
                    onPress={() => setTreatmentType(type)}
                  >
                    <Text style={[styles.treatmentChipText, treatmentType === type && styles.treatmentChipTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Location */}
              <Text style={styles.inputLabel}>Location</Text>
              <TouchableOpacity 
                style={styles.selectBtn}
                onPress={() => setShowLocationModal(true)}
              >
                <Ionicons name="location" size={20} color={theme.colors.accent} />
                <Text style={styles.selectBtnText}>
                  {locationName || 'Set Location'}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>

              {/* Notes */}
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                numberOfLines={3}
              />

              {/* Save Button */}
              <TouchableOpacity style={styles.saveBtn} onPress={saveAppointment}>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.saveBtnText}>Create Appointment</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Patient Picker Modal */}
      <Modal visible={showPatientPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Patient</Text>
              <TouchableOpacity onPress={() => setShowPatientPicker(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* New Patient Form */}
            <View style={styles.newPatientForm}>
              <Text style={styles.inputLabel}>Or Add New Patient</Text>
              <TextInput
                style={styles.input}
                value={newPatientName}
                onChangeText={setNewPatientName}
                placeholder="Patient Name"
                placeholderTextColor={theme.colors.textMuted}
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 10 }]}
                  value={newPatientPhone}
                  onChangeText={setNewPatientPhone}
                  placeholder="Phone"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newPatientEmail}
                  onChangeText={setNewPatientEmail}
                  placeholder="Email"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="email-address"
                />
              </View>
              <TouchableOpacity style={styles.addPatientBtn} onPress={createNewPatient}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addPatientBtnText}>Add New Patient</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Existing Patients</Text>
            <FlatList
              data={patients}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.patientItem}
                  onPress={() => selectPatient(item)}
                >
                  <View style={styles.patientAvatar}>
                    <Text style={styles.patientAvatarText}>{item.name[0]}</Text>
                  </View>
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientItemName}>{item.name}</Text>
                    <Text style={styles.patientItemPhone}>{item.phone}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
              style={styles.patientList}
            />
          </View>
        </View>
      </Modal>

      {/* Location Modal */}
      <Modal visible={showLocationModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Location Name</Text>
              <TextInput
                style={styles.input}
                value={locationName}
                onChangeText={setLocationName}
                placeholder="e.g., WBA99 Clinic"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={locationAddress}
                onChangeText={setLocationAddress}
                placeholder="Full address"
                placeholderTextColor={theme.colors.textMuted}
                multiline
              />

              <Text style={styles.inputLabel}>Google Maps Coordinates (Optional)</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 10 }]}
                  value={locationLat}
                  onChangeText={setLocationLat}
                  placeholder="Latitude"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={locationLng}
                  onChangeText={setLocationLng}
                  placeholder="Longitude"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity style={styles.mapsBtn} onPress={openLocationInMaps}>
                <MaterialCommunityIcons name="google-maps" size={24} color="#fff" />
                <Text style={styles.mapsBtnText}>Open in Google Maps</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={() => setShowLocationModal(false)}
              >
                <Ionicons name="checkmark" size={24} color="#fff" />
                <Text style={styles.saveBtnText}>Save Location</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Share Modal */}
      <Modal visible={showShareModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 400 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share Appointment</Text>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.shareOptions}>
              <TouchableOpacity style={styles.shareOption} onPress={shareViaWhatsApp}>
                <View style={[styles.shareIconBg, { backgroundColor: '#25D366' }]}>
                  <Ionicons name="logo-whatsapp" size={28} color="#fff" />
                </View>
                <Text style={styles.shareOptionText}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shareOption} onPress={shareViaSMS}>
                <View style={[styles.shareIconBg, { backgroundColor: '#2196F3' }]}>
                  <MaterialCommunityIcons name="message-text" size={28} color="#fff" />
                </View>
                <Text style={styles.shareOptionText}>SMS</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shareOption} onPress={shareViaEmail}>
                <View style={[styles.shareIconBg, { backgroundColor: '#EA4335' }]}>
                  <MaterialCommunityIcons name="email" size={28} color="#fff" />
                </View>
                <Text style={styles.shareOptionText}>Email</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shareOption} onPress={copyToClipboard}>
                <View style={[styles.shareIconBg, { backgroundColor: '#607D8B' }]}>
                  <Ionicons name="copy" size={28} color="#fff" />
                </View>
                <Text style={styles.shareOptionText}>Copy</Text>
              </TouchableOpacity>
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  viewTabs: {
    flexDirection: 'row',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.card,
  },
  viewTab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  viewTabActive: {
    backgroundColor: theme.colors.accent,
  },
  viewTabText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  viewTabTextActive: {
    color: '#fff',
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  dateNavBtn: {
    padding: theme.spacing.xs,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  dateText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  appointmentsList: {
    flex: 1,
    padding: theme.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  addFirstBtn: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
  },
  addFirstBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  appointmentTime: {
    width: 60,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: theme.colors.cardBorder,
    marginRight: theme.spacing.md,
    paddingRight: theme.spacing.sm,
  },
  timeText: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.accent,
  },
  durationText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  appointmentDetails: {
    flex: 1,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: 4,
  },
  patientName: {
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  treatmentText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    flex: 1,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  appointmentActions: {
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  actionBtn: {
    padding: theme.spacing.xs,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
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
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  halfField: {
    flex: 1,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    gap: theme.spacing.sm,
  },
  selectBtnText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  timeSlots: {
    marginTop: theme.spacing.xs,
  },
  timeSlot: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  timeSlotActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  timeSlotText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  timeSlotTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  treatmentTypes: {
    marginTop: theme.spacing.xs,
  },
  treatmentChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  treatmentChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  treatmentChipText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  treatmentChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
  },
  newPatientForm: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  addPatientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  addPatientBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  patientList: {
    maxHeight: 300,
  },
  patientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  patientAvatarText: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: '#fff',
  },
  patientInfo: {
    flex: 1,
  },
  patientItemName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  patientItemPhone: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  mapsBtnText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  shareOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.lg,
  },
  shareOption: {
    alignItems: 'center',
    width: '25%',
    marginBottom: theme.spacing.md,
  },
  shareIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  shareOptionText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
});
