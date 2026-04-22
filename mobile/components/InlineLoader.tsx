import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

import { theme } from '../constants/theme';

type Props = {
  label?: string;
  size?: 'small' | 'large';
};

export function InlineLoader({ label = 'Loading...', size = 'large' }: Props) {
  return (
    <View style={styles.container}>
      <ActivityIndicator
        animating
        color={theme.colors.primary}
        size={size === 'large' ? 'large' : 'small'}
      />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  label: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
