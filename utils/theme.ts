import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useAuth } from './authContext';

const light = {
  bg:              '#F2F2F7',
  surface:         '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  text:            '#090909',
  textSecondary:   '#8E8E93',
  textTertiary:    '#C7C7CC',
  placeholder:     '#C7C7CC',
  accent:          '#007AFF',
  accentSubtle:    'rgba(0,122,255,0.10)',
  destructive:     '#FF3B30',
  success:         '#34C759',
  separator:       '#C6C6C8',
  separatorFine:   'rgba(60,60,67,0.18)',
  fill:            'rgba(120,120,128,0.12)',
  statusSuccessBg: 'rgba(52,199,89,0.12)',
  statusErrorBg:   'rgba(255,59,48,0.10)',
  inputBorder:     '#E5E5EA',
  overlay:         'rgba(0,0,0,0.40)',
  shadowOpacity:   0.06,
  shadowOpacityMedium: 0.10,
  cardBirthday:         '#FFF8EE',
  cardBirthdayBorder:   'rgba(245,166,35,0.38)',
  birthdayDot:          '#F5A623',
  birthdayDotToday:     '#FFFFFF',
};

const dark = {
  bg:              '#000000',
  surface:         '#1C1C1E',
  surfaceElevated: '#2C2C2E',
  text:            '#F5F5F5',
  textSecondary:   '#8E8E93',
  textTertiary:    '#636366',
  placeholder:     '#48484A',
  accent:          '#0A84FF',
  accentSubtle:    'rgba(10,132,255,0.16)',
  destructive:     '#FF453A',
  success:         '#30D158',
  separator:       '#38383A',
  separatorFine:   'rgba(84,84,88,0.50)',
  fill:            'rgba(120,120,128,0.20)',
  statusSuccessBg: 'rgba(48,209,88,0.16)',
  statusErrorBg:   'rgba(255,69,58,0.16)',
  inputBorder:     '#38383A',
  overlay:         'rgba(0,0,0,0.65)',
  shadowOpacity:   0.0,
  shadowOpacityMedium: 0.0,
  cardBirthday:         '#291D00',
  cardBirthdayBorder:   'rgba(245,166,35,0.22)',
  birthdayDot:          '#F5A623',
  birthdayDotToday:     'rgba(245,246,250,0.85)',
};

export type ThemeColors = typeof light;
export type ThemePref = 'system' | 'light' | 'dark';

const THEME_KEY = 'theme_pref';

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  preference: ThemePref;
  setPreference: (pref: ThemePref) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: light,
  isDark: false,
  preference: 'system',
  setPreference: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { licensed } = useAuth();
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePref>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(val => {
      if (val === 'light' || val === 'dark' || val === 'system') {
        setPreferenceState(val);
      }
    }).catch(() => {});
  }, []);

  const setPreference = useCallback(async (pref: ThemePref) => {
    setPreferenceState(pref);
    try { await AsyncStorage.setItem(THEME_KEY, pref); } catch {}
  }, []);

  const isDark = useMemo(() => {
    if (!licensed) return false;
    if (preference === 'dark') return true;
    if (preference === 'light') return false;
    return systemScheme === 'dark';
  }, [licensed, preference, systemScheme]);

  const value = useMemo<ThemeContextValue>(() => ({
    colors: isDark ? dark : light,
    isDark,
    preference,
    setPreference,
  }), [isDark, preference, setPreference]);

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  return useContext(ThemeContext);
}
