// WBA99 Theme - Premium Dark Blue Modern Design
export const theme = {
  colors: {
    // Primary colors - Deep Professional Blue
    primary: '#0A1628',
    primaryLight: '#1A2942',
    primaryDark: '#050D1A',
    
    // Accent colors - Premium Cyan/Teal
    accent: '#00D4FF',
    accentLight: '#48E5FF',
    accentDark: '#0099CC',
    
    // Premium Gold accent
    gold: '#FFD700',
    goldLight: '#FFE44D',
    goldDark: '#CC9900',
    
    // Card colors - Glass-like effect
    card: '#152238',
    cardHover: '#1E3A5F',
    cardBorder: '#2A4A6A',
    cardGlass: 'rgba(21, 34, 56, 0.85)',
    
    // Text colors
    textPrimary: '#FFFFFF',
    textSecondary: '#A0B4C8',
    textMuted: '#6B8299',
    textAccent: '#00D4FF',
    
    // Status colors - Vibrant
    success: '#00E676',
    successLight: '#69F0AE',
    warning: '#FFB300',
    warningLight: '#FFD54F',
    error: '#FF5252',
    errorLight: '#FF8A80',
    info: '#448AFF',
    infoLight: '#82B1FF',
    
    // Background with gradient support
    background: '#0A1628',
    surface: '#152238',
    surfaceLight: '#1E3A5F',
    
    // Gradients
    gradientStart: '#0A1628',
    gradientMid: '#152238',
    gradientEnd: '#1A2942',
    gradientAccent: 'linear-gradient(135deg, #00D4FF 0%, #0099CC 100%)',
    gradientGold: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    gradientSuccess: 'linear-gradient(135deg, #00E676 0%, #00C853 100%)',
    
    // Additional colors
    secondary: '#2A4A6A',
    tertiary: '#3D5A80',
    
    // Overlay
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(0, 0, 0, 0.4)',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
  
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    full: 9999,
  },
  
  fontSize: {
    xxs: 10,
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    title: 40,
    hero: 48,
  },
  
  fontWeight: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  
  shadow: {
    sm: {
      elevation: 2,
      boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.2)',
    },
    md: {
      elevation: 4,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
    },
    lg: {
      elevation: 8,
      boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
    },
    glow: {
      elevation: 10,
      boxShadow: '0px 0px 15px rgba(0, 212, 255, 0.5)',
    },
    goldGlow: {
      elevation: 10,
      boxShadow: '0px 0px 15px rgba(255, 215, 0, 0.5)',
    },
  },
  
  // Animation timings
  animation: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
};

export type Theme = typeof theme;
