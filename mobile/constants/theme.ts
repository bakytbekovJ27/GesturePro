import { MD3DarkTheme } from 'react-native-paper';

const palette = {
  background: '#071018',
  backgroundAlt: '#0D1724',
  surface: '#101C2B',
  surfaceElevated: '#152437',
  surfaceStrong: '#1B2C42',
  border: '#23374F',
  borderStrong: '#2D4A67',
  primary: '#69D5FF',
  primaryMuted: '#173346',
  secondary: '#F1C76D',
  secondaryMuted: '#4A3A17',
  textPrimary: '#EEF6FF',
  textSecondary: '#9EB0C7',
  textMuted: '#73849A',
  success: '#74E4A6',
  warning: '#F1C76D',
  danger: '#FF808F',
  info: '#69D5FF',
  overlay: 'rgba(6, 11, 18, 0.78)',
} as const;

export const theme = {
  colors: {
    ...palette,
    accent: palette.secondary,
    error: palette.danger,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  roundness: {
    sm: 10,
    md: 16,
    lg: 22,
    xl: 28,
    pill: 999,
    card: 22,
    button: 16,
  },
  shadows: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.28,
      shadowRadius: 24,
      elevation: 10,
    },
  },
} as const;

export const statusColors = {
  idle: theme.colors.textMuted,
  working: theme.colors.primary,
  success: theme.colors.success,
  warning: theme.colors.warning,
  danger: theme.colors.danger,
} as const;

export function getPresentationStatusColor(status: string) {
  switch (status) {
    case 'ready':
      return statusColors.success;
    case 'presenting':
      return theme.colors.secondary;
    case 'uploading':
    case 'converting':
    case 'downloading':
      return statusColors.working;
    case 'error':
      return statusColors.danger;
    default:
      return statusColors.idle;
  }
}

export function getStatusTone(
  status: string,
): 'primary' | 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'ready':
      return 'success';
    case 'presenting':
      return 'warning';
    case 'uploading':
    case 'converting':
    case 'downloading':
      return 'primary';
    case 'error':
      return 'danger';
    default:
      return 'neutral';
  }
}

export const paperTheme = {
  ...MD3DarkTheme,
  roundness: theme.roundness.md,
  colors: {
    ...MD3DarkTheme.colors,
    primary: theme.colors.primary,
    onPrimary: '#032637',
    primaryContainer: theme.colors.primaryMuted,
    onPrimaryContainer: theme.colors.textPrimary,
    secondary: theme.colors.secondary,
    onSecondary: '#2A2107',
    secondaryContainer: theme.colors.secondaryMuted,
    onSecondaryContainer: theme.colors.textPrimary,
    tertiary: theme.colors.success,
    onTertiary: '#072815',
    tertiaryContainer: '#153824',
    onTertiaryContainer: theme.colors.textPrimary,
    background: theme.colors.background,
    onBackground: theme.colors.textPrimary,
    surface: theme.colors.surface,
    onSurface: theme.colors.textPrimary,
    surfaceVariant: theme.colors.surfaceElevated,
    onSurfaceVariant: theme.colors.textSecondary,
    outline: theme.colors.borderStrong,
    outlineVariant: theme.colors.border,
    error: theme.colors.danger,
    onError: '#2B0A12',
    errorContainer: '#44131E',
    onErrorContainer: '#FFD8DE',
    elevation: {
      level0: 'transparent',
      level1: theme.colors.surface,
      level2: theme.colors.surfaceElevated,
      level3: theme.colors.surfaceStrong,
      level4: '#213650',
      level5: '#27405F',
    },
    backdrop: theme.colors.overlay,
  },
};

export const Colors = theme.colors;
