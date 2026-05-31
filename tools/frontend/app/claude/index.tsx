/**
 * WBA99 Claude Section Dashboard
 * Hub for accessing 5 Claude-generated clinical tools
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type IconName = 'video' | 'video-vintage' | 'dumbbell' | 'human' | 'face-recognition';

interface ToolCard {
  id: string;
  title: string;
  subtitle: string;
  icon: IconName;
  route: string;
  gradient: [string, string];
  description: string;
}

const CLAUDE_TOOLS: ToolCard[] = [
  {
    id: 'digital-shadow',
    title: 'Digital Shadow',
    subtitle: 'Clinical Video Analysis',
    icon: 'video',
    route: '/claude/digital-shadow',
    gradient: ['#39FF8A', '#00B87A'],
    description: 'Full biomechanical analysis with pose detection, gait, ROM & AI psychology',
  },
  {
    id: 'digital-shadow-alt',
    title: 'Digital Shadow V2',
    subtitle: 'Alternative Clinical Suite',
    icon: 'video-vintage',
    route: '/claude/digital-shadow-alt',
    gradient: ['#00D4FF', '#0099CC'],
    description: 'Alternate version of Digital Shadow with different visual effects',
  },
  {
    id: 'exercise-template',
    title: 'Exercise Template',
    subtitle: 'Rehab Plan Maker',
    icon: 'dumbbell',
    route: '/claude/exercise-template',
    gradient: ['#FF3D7F', '#CC2255'],
    description: 'AI-powered exercise prescription and rehabilitation template generator',
  },
  {
    id: 'physioscan',
    title: 'PhysioScan',
    subtitle: 'Bony Landmark Analyzer',
    icon: 'human',
    route: '/claude/physioscan',
    gradient: ['#A855F7', '#7C3AED'],
    description: 'Clinical-grade postural analysis with draggable landmarks & angle measurements',
  },
  {
    id: 'face-analyzer',
    title: 'Face Landmark',
    subtitle: 'Facial Analysis',
    icon: 'face-recognition',
    route: '/claude/face-analyzer',
    gradient: ['#FBBF24', '#F59E0B'],
    description: 'Real-time face mesh detection with symmetry analysis & measurements',
  },
];

export default function ClaudeDashboard() {
  const router = useRouter();

  const handleToolPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>W99</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>CLAUDE SUITE</Text>
              <Text style={styles.headerSubtitle}>Advanced Clinical Tools</Text>
            </View>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>5 Tools</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#00D4FF" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Custom Claude Tools</Text>
            <Text style={styles.infoText}>
              These tools are built with Claude AI and run natively in WebView.
              Data from your backend is automatically integrated.
            </Text>
          </View>
        </View>

        {/* Tool Cards */}
        <Text style={styles.sectionTitle}>Available Tools</Text>
        
        {CLAUDE_TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.id}
            style={styles.toolCard}
            onPress={() => handleToolPress(tool.route)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={tool.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.toolIconContainer}
            >
              <MaterialCommunityIcons name={tool.icon} size={26} color="#FFFFFF" />
            </LinearGradient>
            
            <View style={styles.toolContent}>
              <Text style={styles.toolTitle}>{tool.title}</Text>
              <Text style={styles.toolSubtitle}>{tool.subtitle}</Text>
              <Text style={styles.toolDescription}>{tool.description}</Text>
            </View>
            
            <View style={styles.toolArrow}>
              <Text style={styles.toolArrowText}>→</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Footer Note */}
        <View style={styles.footerNote}>
          <MaterialCommunityIcons name="lock" size={12} color="#3A4F6A" />
          <Text style={styles.footerText}>
            All tools run locally • Camera access required for live analysis
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#010306',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#39FF8A',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(57, 255, 138, 0.08)',
  },
  logoText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 16,
    fontWeight: '800',
    color: '#39FF8A',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#39FF8A',
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#3A4F6A',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  badge: {
    backgroundColor: 'rgba(57, 255, 138, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 138, 0.2)',
  },
  badgeText: {
    color: '#39FF8A',
    fontSize: 11,
    fontWeight: '700',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 212, 255, 0.06)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: '#00D4FF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoText: {
    color: '#8899AA',
    fontSize: 11,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3A4F6A',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A1220',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    gap: 14,
  },
  toolIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolIcon: {
    fontSize: 26,
  },
  toolContent: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D8E4F0',
    marginBottom: 2,
  },
  toolSubtitle: {
    fontSize: 10,
    color: '#39FF8A',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 11,
    color: '#5A6F8A',
    lineHeight: 15,
  },
  toolArrow: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolArrowText: {
    color: '#3A4F6A',
    fontSize: 16,
  },
  footerNote: {
    marginTop: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    color: '#3A4F6A',
    fontSize: 10,
    textAlign: 'center',
  },
});
