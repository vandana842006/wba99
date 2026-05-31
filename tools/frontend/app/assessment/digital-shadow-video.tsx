/**
 * WBA99 Digital Shadow Video - Full Body Pose Detection
 * Uses the working Claude HTML for professional video tracking
 */

import React from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

// Your working Claude HTML file
const CLAUDE_HTML_URL = 'https://customer-assets.emergentagent.com/job_5871a3c5-4f99-4196-bbc7-bd1bdb34be19/artifacts/s33ziom3_wba99-shadow-v3-biomech-report.html';

export default function DigitalShadowVideo() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Digital Shadow Video</Text>
          <Text style={styles.subtitle}>Full Body Pose Detection</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Claude WebView with working video tracking */}
      {Platform.OS === 'web' ? (
        <View style={styles.webview}>
          <iframe
            src={CLAUDE_HTML_URL}
            style={{ flex: 1, width: '100%', height: '100%', border: 'none' }}
            allow="camera; microphone; accelerometer; gyroscope"
          />
        </View>
      ) : (
        <WebView
          source={{ uri: CLAUDE_HTML_URL }}
          style={styles.webview}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowFileAccess={true}
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true}
          originWhitelist={['*']}
          mixedContentMode="always"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: '#00D9FF',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
});
