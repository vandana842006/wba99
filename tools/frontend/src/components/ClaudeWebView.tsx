/**
 * Shared WebView wrapper component for Claude tools
 * Uses iframe on web platform for better compatibility
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

interface ClaudeWebViewProps {
  title: string;
  subtitle: string;
  sourceUrl: string;
  accentColor: string;
  onDataInject?: () => any;
}

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                   process.env.EXPO_PUBLIC_BACKEND_URL || 
                   '';

export default function ClaudeWebView({ 
  title, 
  subtitle, 
  sourceUrl, 
  accentColor,
  onDataInject 
}: ClaudeWebViewProps) {
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // For web platform, use a timeout to hide loading since onLoadEnd may not fire
  useEffect(() => {
    if (Platform.OS === 'web') {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    setError(nativeEvent.description || 'Failed to load tool');
    setLoading(false);
  }, []);

  // For web platform, render an iframe directly for better compatibility
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={[styles.backButtonText, { color: accentColor }]}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: accentColor }]}>{title}</Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.openExternalBtn, { borderColor: `${accentColor}33` }]}
            onPress={() => window.open(sourceUrl, '_blank')}
          >
            <Text style={[styles.openExternalText, { color: accentColor }]}>↗ Open</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.webviewContainer}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={accentColor} />
              <Text style={styles.loadingText}>Loading {title}...</Text>
            </View>
          )}
          <iframe
            src={sourceUrl}
            style={{
              flex: 1,
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: '#010306',
            }}
            onLoad={() => setLoading(false)}
            allow="camera; microphone; accelerometer; gyroscope; autoplay; fullscreen"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonText, { color: accentColor }]}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: accentColor }]}>{title}</Text>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.openExternalBtn, { borderColor: `${accentColor}33` }]}
          onPress={() => Linking.openURL(sourceUrl)}
        >
          <Text style={[styles.openExternalText, { color: accentColor }]}>↗ Chrome</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.webviewContainer}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accentColor} />
            <Text style={styles.loadingText}>Loading {title}...</Text>
          </View>
        )}
        
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={[styles.retryButton, { borderColor: `${accentColor}33` }]}
              onPress={() => {
                setError(null);
                setLoading(true);
                webViewRef.current?.reload();
              }}
            >
              <Text style={[styles.retryButtonText, { color: accentColor }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri: sourceUrl }}
            style={styles.webview}
            onLoadEnd={handleLoadEnd}
            onError={handleError}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            originWhitelist={['*']}
            mixedContentMode="always"
            allowFileAccess={true}
            allowUniversalAccessFromFileURLs={true}
            startInLoadingState={false}
            scalesPageToFit={true}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#010306',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: '#3A4F6A',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  headerRight: {
    width: 60,
  },
  openExternalBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    borderWidth: 1,
  },
  openExternalText: {
    fontSize: 12,
    fontWeight: '600',
  },
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#010306',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#010306',
    zIndex: 10,
  },
  loadingText: {
    color: '#3A4F6A',
    fontSize: 12,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    color: '#FF3D7F',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
