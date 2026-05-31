import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  Linking,
  Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

// Base URL for all WBA99 tools - these need to be hosted somewhere accessible
const TOOLS_BASE_URL = 'https://customer-assets.emergentagent.com/job_5871a3c5-4f99-4196-bbc7-bd1bdb34be19/artifacts/';

// Tool definitions from WBA99 Hub
const TOOL_CATEGORIES = [
  {
    title: 'WBA99 Pro (Unified Builds)',
    tools: [
      { 
        name: 'WBA99 Pro V5', 
        icon: '🏆', 
        desc: 'All-in-one: Shadow · Posture · Cricket · ROM · Gait · Inclinometer · PDF', 
        tags: ['LATEST', 'V5'],
        file: '089cfpdm_wba99-pro-v5-final.html',
        color: '#FFD700'
      },
      { 
        name: 'WBA99 Hub', 
        icon: '📚', 
        desc: 'Tool Directory - All 35 tools listed', 
        tags: ['HUB'],
        file: 'a6ec60ts_wba99-hub.html',
        color: '#3b6df0'
      },
    ]
  },
  {
    title: 'SpineIMU Analysis',
    tools: [
      { 
        name: 'SpineIMU V2', 
        icon: '📱', 
        desc: '9-Axis IMU · C7-S2 Scan · 3D Spine · Cobb Angle', 
        tags: ['IMU', 'V2'],
        file: 'e16y22dq_wba99-spineimu-v2.html',
        color: '#E91E63'
      },
      { 
        name: 'SpineIMU Project X', 
        icon: '🦴', 
        desc: 'Advanced Scanner · Lordosis · Kyphosis · ROM', 
        tags: ['PROJECT X'],
        file: 'tx5mdfr6_wba99-spineimu-projectx_1.html',
        color: '#673AB7'
      },
    ]
  },
  {
    title: 'Exercise & Templates',
    tools: [
      { 
        name: 'Exercise Template Maker', 
        icon: '📝', 
        desc: 'AI Exercise Plans · PDF Export · Share', 
        tags: ['AI'],
        file: 'qd5kfstk_wba99-exercise-template-maker.html',
        color: '#FF5722'
      },
    ]
  },
];

// In-app routes for tools that have native screens
const IN_APP_ROUTES: { [key: string]: string } = {
  'spine-biomechanics': '/physio/spine-biomechanics',
  'sd-curve-analyser': '/physio/sd-curve-analyser',
  'universal-angle-tool': '/physio/universal-angle-tool',
  'manual-tagging': '/physio/manual-tagging',
};

export default function WBA99HubScreen() {
  const router = useRouter();

  const openTool = (tool: any) => {
    const url = TOOLS_BASE_URL + tool.file;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open tool in browser. Please try again.');
    });
  };

  const openInAppTool = (route: string) => {
    router.push(route as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>WBA99 Hub</Text>
          <Text style={styles.headerSubtitle}>All Tools & Versions</Text>
        </View>
        <View style={styles.statsBox}>
          <Text style={styles.statsNumber}>35</Text>
          <Text style={styles.statsLabel}>Tools</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <MaterialCommunityIcons name="information" size={20} color="#00BCD4" />
          <Text style={styles.infoText}>
            Tools will open in Chrome browser for full functionality
          </Text>
        </View>

        {/* In-App Native Tools Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📱 Native App Tools</Text>
          <Text style={styles.sectionDesc}>Built into the app - no browser needed</Text>
        </View>

        <TouchableOpacity 
          style={styles.toolCard}
          onPress={() => openInAppTool('/physio/spine-biomechanics')}
        >
          <View style={[styles.toolIcon, { backgroundColor: '#4CAF5020' }]}>
            <Text style={styles.toolEmoji}>🦴</Text>
          </View>
          <View style={styles.toolInfo}>
            <Text style={styles.toolName}>Spine Biomechanics</Text>
            <Text style={styles.toolDesc}>Schober's · Ott's · Chest Exp · SLR · Slump · IMU</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: '#4CAF50' }]}>
            <Text style={styles.tagText}>NATIVE</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#4CAF50" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.toolCard}
          onPress={() => openInAppTool('/physio/sd-curve-analyser')}
        >
          <View style={[styles.toolIcon, { backgroundColor: '#00BCD420' }]}>
            <Text style={styles.toolEmoji}>📈</Text>
          </View>
          <View style={styles.toolInfo}>
            <Text style={styles.toolName}>SD Curve Analyser</Text>
            <Text style={styles.toolDesc}>Strength-Duration · Chronaxie · Neural Analysis</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: '#00BCD4' }]}>
            <Text style={styles.tagText}>NATIVE</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#00BCD4" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.toolCard}
          onPress={() => openInAppTool('/physio/universal-angle-tool')}
        >
          <View style={[styles.toolIcon, { backgroundColor: '#FF572220' }]}>
            <Text style={styles.toolEmoji}>📐</Text>
          </View>
          <View style={styles.toolInfo}>
            <Text style={styles.toolName}>Universal Angle Tool</Text>
            <Text style={styles.toolDesc}>PhysioScan · Joint Angles · ROM · PDF Reports</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: '#FF5722' }]}>
            <Text style={styles.tagText}>NATIVE</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FF5722" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.toolCard}
          onPress={() => openInAppTool('/physio/manual-tagging')}
        >
          <View style={[styles.toolIcon, { backgroundColor: '#9C27B020' }]}>
            <Text style={styles.toolEmoji}>🏷️</Text>
          </View>
          <View style={styles.toolInfo}>
            <Text style={styles.toolName}>Manual Posture Tagging</Text>
            <Text style={styles.toolDesc}>Landmark Tagging · Grid Overlay · PDF Reports</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: '#9C27B0' }]}>
            <Text style={styles.tagText}>NATIVE</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9C27B0" />
        </TouchableOpacity>

        {/* External Tools Categories */}
        {TOOL_CATEGORIES.map((category, catIndex) => (
          <View key={catIndex}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{category.title}</Text>
              <Text style={styles.sectionDesc}>Opens in Chrome browser</Text>
            </View>

            {category.tools.map((tool, toolIndex) => (
              <TouchableOpacity 
                key={toolIndex}
                style={styles.toolCard}
                onPress={() => openTool(tool)}
              >
                <View style={[styles.toolIcon, { backgroundColor: tool.color + '20' }]}>
                  <Text style={styles.toolEmoji}>{tool.icon}</Text>
                </View>
                <View style={styles.toolInfo}>
                  <Text style={styles.toolName}>{tool.name}</Text>
                  <Text style={styles.toolDesc}>{tool.desc}</Text>
                </View>
                <View style={styles.tagsContainer}>
                  {tool.tags.map((tag, tagIndex) => (
                    <View key={tagIndex} style={[styles.tag, { backgroundColor: tool.color }]}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
                <MaterialCommunityIcons name="google-chrome" size={20} color={tool.color} />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Original Hub Link */}
        <View style={styles.originalHubSection}>
          <Text style={styles.originalHubTitle}>Want to see all 35 tools?</Text>
          <TouchableOpacity 
            style={styles.originalHubBtn}
            onPress={() => Linking.openURL(TOOLS_BASE_URL + 'a6ec60ts_wba99-hub.html')}
          >
            <MaterialCommunityIcons name="google-chrome" size={24} color="#fff" />
            <Text style={styles.originalHubBtnText}>Open Full Hub in Chrome</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
    borderBottomColor: '#3b6df0',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#3b6df0',
    marginTop: 2,
  },
  statsBox: {
    backgroundColor: '#3b6df020',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  statsNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b6df0',
  },
  statsLabel: {
    fontSize: 9,
    color: '#8BA5B5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00BCD410',
    borderLeftWidth: 3,
    borderLeftColor: '#00BCD4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#8BA5B5',
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  sectionDesc: {
    fontSize: 10,
    color: '#8BA5B5',
    marginTop: 2,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolEmoji: {
    fontSize: 24,
  },
  toolInfo: {
    flex: 1,
    marginLeft: 12,
  },
  toolName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  toolDesc: {
    fontSize: 10,
    color: '#8BA5B5',
    marginTop: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginRight: 8,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#fff',
  },
  originalHubSection: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3b6df040',
  },
  originalHubTitle: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 12,
  },
  originalHubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b6df0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 10,
  },
  originalHubBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
});
