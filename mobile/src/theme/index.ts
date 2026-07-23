// Theme Configuration - KIKI Design System
import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  default: {
    regular: {
      fontFamily: 'System',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500' as const,
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300' as const,
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '100' as const,
    },
  },
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#10b981',
    primaryContainer: '#059669',
    secondary: '#3b82f6',
    secondaryContainer: '#2563eb',
    tertiary: '#f59e0b',
    tertiaryContainer: '#d97706',
    surface: '#f9fafb',
    surfaceVariant: '#f3f4f6',
    background: '#ffffff',
    error: '#ef4444',
    errorContainer: '#fecaca',
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onSurface: '#030712',
    onSurfaceVariant: '#374151',
    onBackground: '#030712',
    outline: '#d1d5db',
    outlineVariant: '#9ca3af',
    inverseSurface: '#030712',
    inverseOnSurface: '#f9fafb',
    inversePrimary: '#10b981',
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: 12,
  animation: {
    scale: 1.0,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#10b981',
    primaryContainer: '#059669',
    secondary: '#3b82f6',
    secondaryContainer: '#2563eb',
    tertiary: '#f59e0b',
    tertiaryContainer: '#d97706',
    surface: '#111827',
    surfaceVariant: '#1f2937',
    background: '#030712',
    error: '#ef4444',
    errorContainer: '#991b1b',
    onPrimary: '#030712',
    onSecondary: '#030712',
    onSurface: '#f9fafb',
    onSurfaceVariant: '#d1d5db',
    onBackground: '#f9fafb',
    outline: '#4b5563',
    outlineVariant: '#6b7280',
    inverseSurface: '#f9fafb',
    inverseOnSurface: '#030712',
    inversePrimary: '#10b981',
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.7)',
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: 12,
  animation: {
    scale: 1.0,
  },
};

export const theme = {
  light: lightTheme,
  dark: darkTheme,
};

// KIKI Design Tokens (matching web platform)
export const K = {
  mint: '#10b981',
  blue: '#3b82f6',
  gold: '#f59e0b',
  teal: '#14b8a6',
  danger: '#ef4444',
  warn: '#f59e0b',
  t1: '#f9fafb',
  t2: '#9ca3af',
  t3: '#6b7280',
  g950: '#030712',
  g900: '#111827',
  g850: '#1f2937',
  cardBorder: '#1f2937',
  cardHover: '#1a2332',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const typography = {
  displayLarge: { fontSize: 57, fontWeight: '400', lineHeight: 64 },
  displayMedium: { fontSize: 45, fontWeight: '400', lineHeight: 52 },
  displaySmall: { fontSize: 36, fontWeight: '400', lineHeight: 44 },
  headlineLarge: { fontSize: 32, fontWeight: '600', lineHeight: 40 },
  headlineMedium: { fontSize: 28, fontWeight: '600', lineHeight: 36 },
  headlineSmall: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  titleLarge: { fontSize: 22, fontWeight: '500', lineHeight: 28 },
  titleMedium: { fontSize: 16, fontWeight: '500', lineHeight: 24 },
  titleSmall: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  bodyLarge: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyMedium: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  bodySmall: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  labelLarge: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  labelMedium: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
  labelSmall: { fontSize: 11, fontWeight: '500', lineHeight: 16 },
};