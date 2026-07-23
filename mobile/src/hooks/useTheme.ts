// Theme Hook - Theme Management
import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Appearance, ColorSchemeName } from 'react-native';
import { setTheme } from '../stores/slices/uiSlice';
import { RootState, AppDispatch } from '../stores';
import { lightTheme, darkTheme } from '../theme';

export const useTheme = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { theme: themeMode } = useSelector((state: RootState) => state.ui);

  const colorScheme = Appearance.getColorScheme();
  const effectiveTheme = themeMode === 'system' 
    ? (colorScheme === 'dark' ? darkTheme : lightTheme)
    : (themeMode === 'dark' ? darkTheme : lightTheme);

  const setThemeMode = useCallback((mode: 'light' | 'dark' | 'system') => {
    dispatch(setTheme(mode));
  }, [dispatch]);

  useEffect(() => {
    const subscription = Appearance.addColorSchemeListener(({ colorScheme }) => {
      if (themeMode === 'system') {
        // Theme will update automatically via effectiveTheme
      }
    });
    return () => subscription.remove();
  }, [themeMode]);

  return {
    theme: effectiveTheme,
    themeMode,
    setThemeMode,
    isDark: effectiveTheme === darkTheme,
    colors: effectiveTheme.colors,
    spacing: {
      xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
    },
    borderRadius: {
      sm: 4, md: 8, lg: 12, xl: 16, xxl: 24, full: 9999,
    },
    shadows: {
      sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
      md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
      lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
    },
    typography: {
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
    },
  };
};

export const useColorScheme = () => {
  const { isDark } = useTheme();
  return isDark ? 'dark' : 'light';
};