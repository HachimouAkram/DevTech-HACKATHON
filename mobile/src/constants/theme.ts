import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0f172a',
    textSecondary: '#475569',
    background: '#f8fafc',
    backgroundElement: '#ffffff',
    backgroundSelected: '#e2e8f0',
    border: '#e2e8f0',
    primary: '#2563eb',
    secondary: '#0ea5e9',
    danger: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    card: '#ffffff',
    inputBg: '#ffffff',
    placeholder: '#94a3b8',
  },
  dark: {
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    background: '#0f172a',
    backgroundElement: '#1e293b',
    backgroundSelected: '#334155',
    border: '#334155',
    primary: '#3b82f6',
    secondary: '#38bdf8',
    danger: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    card: '#1e293b',
    inputBg: '#334155',
    placeholder: '#475569',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
