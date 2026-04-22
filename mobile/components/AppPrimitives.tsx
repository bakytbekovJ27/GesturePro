import React, { type PropsWithChildren, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Card, Text } from 'react-native-paper';

import { theme } from '../constants/theme';

type SurfaceCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
}>;

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: ReactNode;
};

type StatusChipProps = {
  label: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
};

type MetricCardProps = {
  label: string;
  value: string | number;
  tone?: 'primary' | 'success' | 'warning';
};

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
};

export function SurfaceCard({ children, style, contentStyle, onPress }: SurfaceCardProps) {
  return (
    <Card mode="contained" style={[styles.surfaceCard, style]} onPress={onPress}>
      <Card.Content style={[styles.surfaceContent, contentStyle]}>{children}</Card.Content>
    </Card>
  );
}

export function SectionHeader({ eyebrow, title, description, right }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text variant="headlineSmall" style={styles.sectionTitle}>
          {title}
        </Text>
        {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      </View>
      {right ? <View style={styles.sectionHeaderRight}>{right}</View> : null}
    </View>
  );
}

export function StatusChip({ label, tone = 'neutral' }: StatusChipProps) {
  return (
    <View style={[styles.statusChip, toneStyles[tone].container]}>
      <Text style={[styles.statusChipText, toneStyles[tone].label]}>{label}</Text>
    </View>
  );
}

export function MetricCard({ label, value, tone = 'primary' }: MetricCardProps) {
  return (
    <SurfaceCard style={styles.metricCard} contentStyle={styles.metricCardContent}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, metricToneStyles[tone]]}>{value}</Text>
    </SurfaceCard>
  );
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <SurfaceCard style={styles.emptyCard}>
      <View style={styles.emptyIcon}>{icon}</View>
      <Text variant="titleLarge" style={styles.emptyTitle}>
        {title}
      </Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </SurfaceCard>
  );
}

const toneStyles = {
  primary: {
    container: {
      backgroundColor: theme.colors.primaryMuted,
      borderColor: '#275677',
    },
    label: {
      color: theme.colors.primary,
    },
  },
  success: {
    container: {
      backgroundColor: '#133624',
      borderColor: '#24593A',
    },
    label: {
      color: theme.colors.success,
    },
  },
  warning: {
    container: {
      backgroundColor: theme.colors.secondaryMuted,
      borderColor: '#705A24',
    },
    label: {
      color: theme.colors.secondary,
    },
  },
  danger: {
    container: {
      backgroundColor: '#44131E',
      borderColor: '#7A2435',
    },
    label: {
      color: theme.colors.danger,
    },
  },
  neutral: {
    container: {
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.borderStrong,
    },
    label: {
      color: theme.colors.textSecondary,
    },
  },
} as const;

const metricToneStyles = {
  primary: {
    color: theme.colors.primary,
  },
  success: {
    color: theme.colors.success,
  },
  warning: {
    color: theme.colors.secondary,
  },
} as const;

const styles = StyleSheet.create({
  surfaceCard: {
    borderRadius: theme.roundness.card,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  surfaceContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  sectionHeaderRight: {
    paddingTop: theme.spacing.xs,
  },
  eyebrow: {
    color: theme.colors.secondary,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  sectionDescription: {
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  statusChip: {
    alignSelf: 'flex-start',
    borderRadius: theme.roundness.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusChipText: {
    fontSize: 11,
    letterSpacing: 1.1,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricCard: {
    flex: 1,
  },
  metricCardContent: {
    gap: theme.spacing.xs,
    minHeight: 112,
    justifyContent: 'center',
  },
  metricLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  emptyCard: {
    alignItems: 'center',
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyAction: {
    marginTop: theme.spacing.sm,
    alignSelf: 'stretch',
  },
});
