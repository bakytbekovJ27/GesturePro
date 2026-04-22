import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { theme } from '../constants/theme';
import { AlertCircle } from 'lucide-react-native';

interface Props {
  error?: Error;
  reset?: () => void;
}

export const ErrorBoundaryUI: React.FC<Props> = ({ error, reset }) => {
  return (
    <View style={styles.container}>
      <AlertCircle color={theme.colors.error} size={64} />
      <Text variant="headlineSmall" style={styles.title}>Something went wrong</Text>
      <Text style={styles.subtitle}>
        An unexpected error occurred. Please try again or restart the app.
      </Text>
      {error && (
        <Text style={styles.detail}>{error.message}</Text>
      )}
      <Button mode="contained" onPress={reset} style={styles.btn}>
        Retry
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 24,
  },
  detail: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginBottom: 32,
    fontFamily: 'monospace',
  },
  btn: {
    width: '100%',
    borderRadius: 12,
  }
});
