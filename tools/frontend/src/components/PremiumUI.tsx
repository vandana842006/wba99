import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../utils/theme';

// Premium Gradient Button
interface GradientButtonProps {
  title: string;
  onPress: () => void;
  icon?: string;
  iconFamily?: 'ionicons' | 'material';
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'success' | 'warning' | 'gold' | 'danger';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  icon,
  iconFamily = 'ionicons',
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const getGradientColors = () => {
    switch (variant) {
      case 'success':
        return ['#00E676', '#00C853'];
      case 'warning':
        return ['#FFB300', '#FF8F00'];
      case 'gold':
        return ['#FFD700', '#FFA500'];
      case 'danger':
        return ['#FF5252', '#D32F2F'];
      default:
        return ['#00D4FF', '#0099CC'];
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { padding: 10, fontSize: 14, iconSize: 18 };
      case 'large':
        return { padding: 18, fontSize: 18, iconSize: 26 };
      default:
        return { padding: 14, fontSize: 16, iconSize: 22 };
    }
  };

  const sizeStyles = getSizeStyles();

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const IconComponent = iconFamily === 'material' ? MaterialCommunityIcons : Ionicons;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={disabled ? ['#555', '#444'] : getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradientButton,
            { padding: sizeStyles.padding },
            disabled && styles.disabledButton,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              {icon && (
                <IconComponent
                  name={icon as any}
                  size={sizeStyles.iconSize}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
              )}
              <Text style={[styles.buttonText, { fontSize: sizeStyles.fontSize }]}>
                {title}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Premium Card with Glass Effect
interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  accentColor?: string;
  showGlow?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  onPress,
  accentColor,
  showGlow = false,
}) => {
  const CardContent = (
    <View
      style={[
        styles.glassCard,
        accentColor && { borderLeftColor: accentColor, borderLeftWidth: 4 },
        showGlow && { boxShadow: `0px 0px 15px ${accentColor || theme.colors.accent}50` },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
};

// Premium Stats Card
interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  iconFamily?: 'ionicons' | 'material';
  color?: string;
  trend?: { value: number; isPositive: boolean };
  onPress?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  iconFamily = 'ionicons',
  color = theme.colors.accent,
  trend,
  onPress,
}) => {
  const IconComponent = iconFamily === 'material' ? MaterialCommunityIcons : Ionicons;

  return (
    <GlassCard onPress={onPress} style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <IconComponent name={icon as any} size={28} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {trend && (
        <View style={[styles.trendBadge, { backgroundColor: trend.isPositive ? theme.colors.success + '20' : theme.colors.error + '20' }]}>
          <Ionicons
            name={trend.isPositive ? 'trending-up' : 'trending-down'}
            size={12}
            color={trend.isPositive ? theme.colors.success : theme.colors.error}
          />
          <Text style={[styles.trendText, { color: trend.isPositive ? theme.colors.success : theme.colors.error }]}>
            {trend.value}%
          </Text>
        </View>
      )}
    </GlassCard>
  );
};

// Premium Section Header
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  iconFamily?: 'ionicons' | 'material';
  action?: { label: string; onPress: () => void };
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  iconFamily = 'ionicons',
  action,
}) => {
  const IconComponent = iconFamily === 'material' ? MaterialCommunityIcons : Ionicons;

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        {icon && (
          <View style={styles.sectionIconContainer}>
            <IconComponent name={icon as any} size={20} color={theme.colors.accent} />
          </View>
        )}
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {action && (
        <TouchableOpacity onPress={action.onPress} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{action.label}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.accent} />
        </TouchableOpacity>
      )}
    </View>
  );
};

// Premium Badge
interface BadgeProps {
  text: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'gold';
  size?: 'small' | 'medium';
}

export const Badge: React.FC<BadgeProps> = ({
  text,
  variant = 'primary',
  size = 'small',
}) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: theme.colors.success + '20', text: theme.colors.success };
      case 'warning':
        return { bg: theme.colors.warning + '20', text: theme.colors.warning };
      case 'danger':
        return { bg: theme.colors.error + '20', text: theme.colors.error };
      case 'info':
        return { bg: theme.colors.info + '20', text: theme.colors.info };
      case 'gold':
        return { bg: '#FFD70020', text: '#FFD700' };
      default:
        return { bg: theme.colors.accent + '20', text: theme.colors.accent };
    }
  };

  const colors = getColors();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg },
        size === 'medium' && styles.badgeMedium,
      ]}
    >
      <Text style={[styles.badgeText, { color: colors.text }, size === 'medium' && styles.badgeTextMedium]}>
        {text}
      </Text>
    </View>
  );
};

// Premium Empty State
interface EmptyStateProps {
  icon: string;
  iconFamily?: 'ionicons' | 'material';
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  iconFamily = 'ionicons',
  title,
  message,
  action,
}) => {
  const IconComponent = iconFamily === 'material' ? MaterialCommunityIcons : Ionicons;

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <IconComponent name={icon as any} size={48} color={theme.colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {action && (
        <GradientButton
          title={action.label}
          onPress={action.onPress}
          variant="primary"
          size="small"
          style={{ marginTop: 16 }}
        />
      )}
    </View>
  );
};

// Premium Loading Overlay
interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Loading...',
}) => {
  if (!visible) return null;

  return (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={styles.loadingText}>{message}</Text>
      </View>
    </View>
  );
};

// Premium Feature Card
interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
  iconFamily?: 'ionicons' | 'material';
  color: string;
  onPress: () => void;
  badge?: string;
  disabled?: boolean;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon,
  iconFamily = 'ionicons',
  color,
  onPress,
  badge,
  disabled = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const IconComponent = iconFamily === 'material' ? MaterialCommunityIcons : Ionicons;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.9}
      >
        <View style={[styles.featureCard, disabled && styles.featureCardDisabled]}>
          <View style={[styles.featureIconContainer, { backgroundColor: color + '20' }]}>
            <IconComponent name={icon as any} size={32} color={color} />
          </View>
          <View style={styles.featureContent}>
            <View style={styles.featureTitleRow}>
              <Text style={styles.featureTitle}>{title}</Text>
              {badge && <Badge text={badge} variant="gold" />}
            </View>
            <Text style={styles.featureDescription}>{description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.colors.textMuted} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Gradient Button
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: theme.fontWeight.bold,
  },
  disabledButton: {
    opacity: 0.6,
  },

  // Glass Card
  glassCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    elevation: 4,
  },

  // Stat Card
  statCard: {
    alignItems: 'center',
    padding: theme.spacing.md,
    minWidth: 100,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  statTitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: theme.spacing.xs,
  },
  trendText: {
    fontSize: 10,
    fontWeight: theme.fontWeight.bold,
    marginLeft: 2,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionActionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    marginRight: 4,
  },

  // Badge
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeMedium: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: theme.fontWeight.bold,
  },
  badgeTextMedium: {
    fontSize: 12,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  emptyMessage: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },

  // Loading Overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
  },

  // Feature Card
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.sm,
  },
  featureCardDisabled: {
    opacity: 0.5,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  featureDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
