import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/utils/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48;

interface ProgressData {
  date: string;
  painLevel: number;
  mobility: number;
  strength: number;
  overall: number;
}

// Mock progress data - In production, this would come from API
const MOCK_PROGRESS_DATA: ProgressData[] = [
  { date: 'Week 1', painLevel: 8, mobility: 35, strength: 40, overall: 30 },
  { date: 'Week 2', painLevel: 7, mobility: 42, strength: 45, overall: 38 },
  { date: 'Week 3', painLevel: 6, mobility: 50, strength: 52, overall: 48 },
  { date: 'Week 4', painLevel: 5, mobility: 58, strength: 60, overall: 55 },
  { date: 'Week 5', painLevel: 4, mobility: 68, strength: 68, overall: 65 },
  { date: 'Week 6', painLevel: 3, mobility: 75, strength: 75, overall: 72 },
  { date: 'Week 7', painLevel: 2, mobility: 82, strength: 80, overall: 80 },
  { date: 'Week 8', painLevel: 2, mobility: 88, strength: 85, overall: 85 },
];

const BODY_REGIONS = [
  { id: 'neck', name: 'Neck & Cervical', icon: 'head-outline', progress: 78, color: '#FF6B6B' },
  { id: 'shoulder', name: 'Shoulder', icon: 'body-outline', progress: 85, color: '#4ECDC4' },
  { id: 'spine', name: 'Spine & Back', icon: 'accessibility', progress: 72, color: '#45B7D1' },
  { id: 'hip', name: 'Hip & Pelvis', icon: 'man-outline', progress: 68, color: '#96CEB4' },
  { id: 'knee', name: 'Knee', icon: 'walk-outline', progress: 82, color: '#FFEAA7' },
  { id: 'ankle', name: 'Ankle & Foot', icon: 'footsteps-outline', progress: 90, color: '#DDA0DD' },
];

export default function PatientProgress() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'overall' | 'pain' | 'mobility' | 'strength'>('overall');
  const [progressData, setProgressData] = useState<ProgressData[]>(MOCK_PROGRESS_DATA);
  const [timeRange, setTimeRange] = useState<'4w' | '8w' | '12w' | 'all'>('8w');

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 800);
  }, []);

  const getMetricData = () => {
    switch (selectedMetric) {
      case 'pain':
        return progressData.map(d => ({ ...d, value: 100 - (d.painLevel * 10) })); // Invert pain (lower is better)
      case 'mobility':
        return progressData.map(d => ({ ...d, value: d.mobility }));
      case 'strength':
        return progressData.map(d => ({ ...d, value: d.strength }));
      default:
        return progressData.map(d => ({ ...d, value: d.overall }));
    }
  };

  const metricData = getMetricData();
  const currentValue = metricData[metricData.length - 1]?.value || 0;
  const startValue = metricData[0]?.value || 0;
  const improvement = currentValue - startValue;

  const renderBar3D = (value: number, index: number, maxValue: number = 100) => {
    const height = (value / maxValue) * 150;
    const barWidth = (CHART_WIDTH - 60) / progressData.length - 8;
    
    return (
      <View key={index} style={styles.barContainer}>
        {/* 3D Effect - Side */}
        <View style={[styles.bar3DSide, { height, width: 8, backgroundColor: theme.colors.accent + '60' }]} />
        {/* Main Bar */}
        <View style={[styles.bar3DMain, { height, width: barWidth, backgroundColor: theme.colors.accent }]}>
          {/* Gradient overlay for 3D effect */}
          <View style={[styles.barGradient, { height: height * 0.3 }]} />
        </View>
        {/* 3D Effect - Top */}
        <View style={[styles.bar3DTop, { width: barWidth + 8, backgroundColor: theme.colors.accent + 'CC' }]} />
        <Text style={styles.barLabel}>{progressData[index]?.date.replace('Week ', 'W')}</Text>
      </View>
    );
  };

  const renderLineChart = () => {
    const maxValue = Math.max(...metricData.map(d => d.value), 100);
    const points = metricData.map((d, i) => ({
      x: (i / (metricData.length - 1)) * (CHART_WIDTH - 40) + 20,
      y: 180 - (d.value / maxValue) * 160,
    }));

    return (
      <View style={styles.lineChartContainer}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((val, i) => (
          <View key={i} style={[styles.gridLine, { bottom: (val / 100) * 160 + 20 }]}>
            <Text style={styles.gridLabel}>{val}%</Text>
          </View>
        ))}
        
        {/* Area fill with gradient effect */}
        <View style={styles.areaFill}>
          {points.map((point, i) => (
            <View
              key={i}
              style={[
                styles.areaBar,
                {
                  left: point.x - 3,
                  height: 180 - point.y,
                  bottom: 0,
                },
              ]}
            />
          ))}
        </View>

        {/* Line */}
        {points.map((point, i) => {
          if (i === 0) return null;
          const prevPoint = points[i - 1];
          const length = Math.sqrt(
            Math.pow(point.x - prevPoint.x, 2) + Math.pow(point.y - prevPoint.y, 2)
          );
          const angle = Math.atan2(point.y - prevPoint.y, point.x - prevPoint.x);
          
          return (
            <View
              key={i}
              style={[
                styles.lineSegment,
                {
                  width: length,
                  left: prevPoint.x,
                  top: prevPoint.y,
                  transform: [{ rotate: `${angle}rad` }],
                },
              ]}
            />
          );
        })}

        {/* Data points with glow effect */}
        {points.map((point, i) => (
          <View key={i} style={[styles.dataPointGlow, { left: point.x - 12, top: point.y - 12 }]}>
            <View style={styles.dataPoint}>
              <Text style={styles.dataPointValue}>{metricData[i].value}</Text>
            </View>
          </View>
        ))}

        {/* X-axis labels */}
        {metricData.map((d, i) => (
          <Text
            key={i}
            style={[
              styles.xAxisLabel,
              { left: points[i].x - 15 },
            ]}
          >
            {d.date.replace('Week ', 'W')}
          </Text>
        ))}
      </View>
    );
  };

  const renderRadarChart = () => {
    const metrics = [
      { label: 'Mobility', value: progressData[progressData.length - 1]?.mobility || 0 },
      { label: 'Strength', value: progressData[progressData.length - 1]?.strength || 0 },
      { label: 'Flexibility', value: 78 },
      { label: 'Balance', value: 82 },
      { label: 'Endurance', value: 70 },
      { label: 'Pain Free', value: 100 - (progressData[progressData.length - 1]?.painLevel || 0) * 10 },
    ];

    const centerX = 140;
    const centerY = 120;
    const radius = 80;
    const angleStep = (2 * Math.PI) / metrics.length;

    return (
      <View style={styles.radarContainer}>
        {/* Background circles */}
        {[20, 40, 60, 80, 100].map((r, i) => (
          <View
            key={i}
            style={[
              styles.radarCircle,
              {
                width: (r / 100) * radius * 2,
                height: (r / 100) * radius * 2,
                borderRadius: (r / 100) * radius,
                left: centerX - (r / 100) * radius,
                top: centerY - (r / 100) * radius,
              },
            ]}
          />
        ))}

        {/* Axis lines and labels */}
        {metrics.map((metric, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          const labelX = centerX + Math.cos(angle) * (radius + 25);
          const labelY = centerY + Math.sin(angle) * (radius + 25);

          return (
            <React.Fragment key={i}>
              <View
                style={[
                  styles.radarAxis,
                  {
                    width: radius,
                    left: centerX,
                    top: centerY,
                    transform: [{ rotate: `${angle + Math.PI / 2}rad` }],
                    transformOrigin: '0 0',
                  },
                ]}
              />
              <Text
                style={[
                  styles.radarLabel,
                  {
                    left: labelX - 30,
                    top: labelY - 8,
                  },
                ]}
              >
                {metric.label}
              </Text>
            </React.Fragment>
          );
        })}

        {/* Data polygon */}
        {metrics.map((metric, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const r = (metric.value / 100) * radius;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          return (
            <View
              key={i}
              style={[
                styles.radarDataPoint,
                {
                  left: x - 6,
                  top: y - 6,
                },
              ]}
            >
              <Text style={styles.radarDataValue}>{metric.value}</Text>
            </View>
          );
        })}

        {/* Center score */}
        <View style={styles.radarCenter}>
          <Text style={styles.radarCenterValue}>{currentValue}%</Text>
          <Text style={styles.radarCenterLabel}>Overall</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Analyzing your progress...</Text>
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
          <Text style={styles.headerTitle}>My Progress</Text>
          <TouchableOpacity style={styles.shareButton}>
            <Ionicons name="share-outline" size={24} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Summary Card with 3D Effect */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryGlow} />
          <View style={styles.summaryContent}>
            <View style={styles.summaryMain}>
              <Text style={styles.summaryLabel}>Overall Improvement</Text>
              <Text style={styles.summaryValue}>+{improvement}%</Text>
              <View style={styles.summaryBadge}>
                <Ionicons name="trending-up" size={16} color={theme.colors.success} />
                <Text style={styles.summaryBadgeText}>Great Progress!</Text>
              </View>
            </View>
            <View style={styles.summaryCircle}>
              <View style={styles.summaryCircleInner}>
                <Text style={styles.summaryCircleValue}>{currentValue}%</Text>
                <Text style={styles.summaryCircleLabel}>Current</Text>
              </View>
              {/* Circular progress */}
              <View style={[styles.circleProgress, { transform: [{ rotate: `${currentValue * 3.6}deg` }] }]} />
            </View>
          </View>
        </View>

        {/* Metric Selector */}
        <View style={styles.metricSelector}>
          {[
            { key: 'overall', label: 'Overall', icon: 'analytics' },
            { key: 'pain', label: 'Pain', icon: 'fitness' },
            { key: 'mobility', label: 'Mobility', icon: 'body' },
            { key: 'strength', label: 'Strength', icon: 'barbell' },
          ].map((metric) => (
            <TouchableOpacity
              key={metric.key}
              style={[
                styles.metricButton,
                selectedMetric === metric.key && styles.metricButtonActive,
              ]}
              onPress={() => setSelectedMetric(metric.key as any)}
            >
              <Ionicons
                name={metric.icon as any}
                size={18}
                color={selectedMetric === metric.key ? theme.colors.textPrimary : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.metricButtonText,
                  selectedMetric === metric.key && styles.metricButtonTextActive,
                ]}
              >
                {metric.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 3D Bar Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weekly Progress</Text>
          <Text style={styles.chartSubtitle}>3D Visualization</Text>
          <View style={styles.barChartContainer}>
            {metricData.map((d, i) => renderBar3D(d.value, i))}
          </View>
        </View>

        {/* Line Chart with Area */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Trend Analysis</Text>
          <Text style={styles.chartSubtitle}>8 Week Overview</Text>
          {renderLineChart()}
        </View>

        {/* Radar Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Performance Radar</Text>
          <Text style={styles.chartSubtitle}>Multi-dimensional Analysis</Text>
          {renderRadarChart()}
        </View>

        {/* Body Region Progress */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Body Region Progress</Text>
          <Ionicons name="body" size={20} color={theme.colors.accent} />
        </View>

        <View style={styles.regionsGrid}>
          {BODY_REGIONS.map((region) => (
            <View key={region.id} style={styles.regionCard}>
              <View style={[styles.regionIcon, { backgroundColor: region.color + '30' }]}>
                <Ionicons name={region.icon as any} size={24} color={region.color} />
              </View>
              <Text style={styles.regionName}>{region.name}</Text>
              <View style={styles.regionProgressBar}>
                <View
                  style={[
                    styles.regionProgressFill,
                    { width: `${region.progress}%`, backgroundColor: region.color },
                  ]}
                />
              </View>
              <Text style={styles.regionProgressText}>{region.progress}%</Text>
            </View>
          ))}
        </View>

        {/* Milestones */}
        <View style={styles.milestonesCard}>
          <Text style={styles.milestonesTitle}>🏆 Milestones Achieved</Text>
          <View style={styles.milestonesList}>
            {[
              { title: 'First Week Complete', date: 'Week 1', icon: 'flag' },
              { title: 'Pain Reduced by 50%', date: 'Week 4', icon: 'heart' },
              { title: 'Mobility Goal Reached', date: 'Week 6', icon: 'walk' },
              { title: '80% Overall Progress', date: 'Week 7', icon: 'trophy' },
            ].map((milestone, i) => (
              <View key={i} style={styles.milestoneItem}>
                <View style={styles.milestoneIcon}>
                  <Ionicons name={milestone.icon as any} size={20} color={theme.colors.warning} />
                </View>
                <View style={styles.milestoneInfo}>
                  <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                  <Text style={styles.milestoneDate}>{milestone.date}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/patient/history')}>
            <Ionicons name="time" size={24} color={theme.colors.textPrimary} />
            <Text style={styles.actionButtonText}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]}>
            <Ionicons name="download" size={24} color={theme.colors.textPrimary} />
            <Text style={styles.actionButtonText}>Export PDF</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: theme.colors.textSecondary, marginTop: theme.spacing.md },
  scrollContent: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  backButton: { padding: theme.spacing.xs },
  headerTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  shareButton: { padding: theme.spacing.xs },
  
  // Summary Card with 3D
  summaryCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.cardBorder, overflow: 'hidden', position: 'relative' },
  summaryGlow: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: theme.colors.accent + '20' },
  summaryContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryMain: { flex: 1 },
  summaryLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginBottom: theme.spacing.xs },
  summaryValue: { fontSize: 48, fontWeight: theme.fontWeight.bold, color: theme.colors.success },
  summaryBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.success + '20', paddingHorizontal: theme.spacing.sm, paddingVertical: 4, borderRadius: theme.borderRadius.sm, alignSelf: 'flex-start', marginTop: theme.spacing.sm, gap: 4 },
  summaryBadgeText: { fontSize: theme.fontSize.xs, color: theme.colors.success, fontWeight: theme.fontWeight.bold },
  summaryCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 8, borderColor: theme.colors.cardBorder, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  summaryCircleInner: { alignItems: 'center' },
  summaryCircleValue: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  summaryCircleLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted },
  circleProgress: { position: 'absolute', top: -8, left: -8, right: -8, bottom: -8, borderRadius: 58, borderWidth: 8, borderColor: theme.colors.accent, borderTopColor: 'transparent', borderRightColor: 'transparent' },

  // Metric Selector
  metricSelector: { flexDirection: 'row', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: 4, marginBottom: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.cardBorder },
  metricButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.sm, gap: 4 },
  metricButtonActive: { backgroundColor: theme.colors.accent },
  metricButtonText: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted },
  metricButtonTextActive: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },

  // Chart Card
  chartCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.cardBorder },
  chartTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  chartSubtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginBottom: theme.spacing.md },

  // 3D Bar Chart
  barChartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 200, paddingTop: 20 },
  barContainer: { alignItems: 'center', position: 'relative' },
  bar3DMain: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  bar3DSide: { position: 'absolute', right: '100%', bottom: 0, borderTopLeftRadius: 4, transform: [{ skewY: '-45deg' }], transformOrigin: 'bottom right' },
  bar3DTop: { position: 'absolute', top: -4, height: 8, borderRadius: 2, transform: [{ skewX: '-45deg' }] },
  barGradient: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.3)', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barLabel: { fontSize: 10, color: theme.colors.textMuted, marginTop: theme.spacing.xs },

  // Line Chart
  lineChartContainer: { height: 220, position: 'relative', marginTop: theme.spacing.md },
  gridLine: { position: 'absolute', left: 30, right: 0, height: 1, backgroundColor: theme.colors.cardBorder, flexDirection: 'row', alignItems: 'center' },
  gridLabel: { position: 'absolute', left: -30, fontSize: 10, color: theme.colors.textMuted, width: 25, textAlign: 'right' },
  areaFill: { position: 'absolute', bottom: 20, left: 0, right: 0, height: 160 },
  areaBar: { position: 'absolute', width: 6, backgroundColor: theme.colors.accent + '30', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  lineSegment: { position: 'absolute', height: 3, backgroundColor: theme.colors.accent, borderRadius: 1.5, transformOrigin: 'left center' },
  dataPointGlow: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.accent + '30', justifyContent: 'center', alignItems: 'center' },
  dataPoint: { width: 16, height: 16, borderRadius: 8, backgroundColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center' },
  dataPointValue: { fontSize: 8, color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },
  xAxisLabel: { position: 'absolute', bottom: 0, fontSize: 10, color: theme.colors.textMuted, width: 30, textAlign: 'center' },

  // Radar Chart
  radarContainer: { height: 280, position: 'relative' },
  radarCircle: { position: 'absolute', borderWidth: 1, borderColor: theme.colors.cardBorder, borderStyle: 'dashed' },
  radarAxis: { position: 'absolute', height: 1, backgroundColor: theme.colors.cardBorder },
  radarLabel: { position: 'absolute', fontSize: 10, color: theme.colors.textSecondary, width: 60, textAlign: 'center' },
  radarDataPoint: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.accent },
  radarDataValue: { position: 'absolute', top: -16, fontSize: 10, color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },
  radarCenter: { position: 'absolute', top: 100, left: 110, width: 60, height: 40, justifyContent: 'center', alignItems: 'center' },
  radarCenterValue: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.accent },
  radarCenterLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted },

  // Body Regions
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
  regionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  regionCard: { width: '48%', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.cardBorder },
  regionIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.sm },
  regionName: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.textPrimary, marginBottom: theme.spacing.xs },
  regionProgressBar: { height: 6, backgroundColor: theme.colors.cardBorder, borderRadius: 3, marginBottom: theme.spacing.xs },
  regionProgressFill: { height: '100%', borderRadius: 3 },
  regionProgressText: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textSecondary },

  // Milestones
  milestonesCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.cardBorder },
  milestonesTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  milestonesList: { gap: theme.spacing.sm },
  milestoneItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm, padding: theme.spacing.sm },
  milestoneIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.warning + '20', justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.sm },
  milestoneInfo: { flex: 1 },
  milestoneTitle: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.textPrimary },
  milestoneDate: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted },

  // Actions
  actionsRow: { flexDirection: 'row', gap: theme.spacing.md },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, gap: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.cardBorder },
  actionButtonPrimary: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  actionButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
});
