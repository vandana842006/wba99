import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

const HTML_URL = 'https://customer-assets.emergentagent.com/job_5871a3c5-4f99-4196-bbc7-bd1bdb34be19/artifacts/x64oh4lm_WBA99_SD_Curve_v4.jsx.txt';

export default function SDCurveV4Screen() {
  const router = useRouter();

  const openInChrome = () => {
    Linking.openURL(HTML_URL).catch(() => {
      Alert.alert('Error', 'Could not open in browser');
    });
  };

  const goToBuiltInAnalyser = () => {
    router.push('/physio/sd-curve-analyser');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>SD Curve V4</Text>
          <Text style={styles.headerSubtitle}>Strength-Duration Analysis</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <MaterialCommunityIcons name="chart-bell-curve" size={60} color="#00BCD4" />
          <Text style={styles.cardTitle}>SD Curve Analysis</Text>
          <Text style={styles.cardDesc}>
            The SD Curve V4 file requires a browser to render properly.
            Choose an option below:
          </Text>
        </View>

        <TouchableOpacity style={styles.optionBtn} onPress={goToBuiltInAnalyser}>
          <View style={[styles.optionIcon, { backgroundColor: '#22C55E20' }]}>
            <MaterialCommunityIcons name="application" size={28} color="#22C55E" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Built-in SD Curve Analyser</Text>
            <Text style={styles.optionDesc}>Use the native app version with full features</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#22C55E" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionBtn} onPress={openInChrome}>
          <View style={[styles.optionIcon, { backgroundColor: '#00BCD420' }]}>
            <MaterialCommunityIcons name="google-chrome" size={28} color="#00BCD4" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Open V4 in Chrome</Text>
            <Text style={styles.optionDesc}>View the JSX version in external browser</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#00BCD4" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1b2a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#00BCD4',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a3a5c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00BCD4',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#8BA5B5',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  cardDesc: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
    marginLeft: 14,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  optionDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
});
