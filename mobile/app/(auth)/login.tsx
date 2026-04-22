import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles } from 'lucide-react-native';

import { SurfaceCard, StatusChip } from '../../components/AppPrimitives';
import { theme } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoading, error } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await login({ username, password });
    } catch {
      // Store state surfaces the error.
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <StatusChip label="Gesture Control Ready" tone="warning" />
            <View style={styles.heroBadge}>
              <Sparkles color={theme.colors.primary} size={26} />
            </View>
            <Text variant="displaySmall" style={styles.title}>
              GesturePro
            </Text>
            <Text style={styles.subtitle}>
              Pair with desktop, upload decks, and control your presentation flow from one polished mobile workspace.
            </Text>
          </View>

          <SurfaceCard>
            <View style={styles.cardHeader}>
              <Text variant="titleLarge" style={styles.cardTitle}>
                Sign In
              </Text>
              <Text style={styles.cardSubtitle}>
                Continue into your paired presentation environment.
              </Text>
            </View>

            <TextInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="account-circle-outline" />}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="shield-lock-outline" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setShowPassword((current) => !current)}
                />
              }
              autoCapitalize="none"
              autoCorrect={false}
            />

            {error ? <HelperText type="error">{error}</HelperText> : null}

            <Button
              mode="contained"
              onPress={handleLogin}
              style={styles.button}
              contentStyle={styles.buttonContent}
              disabled={isLoading || !username || !password}
            >
              {isLoading ? 'Signing In...' : 'Enter Workspace'}
            </Button>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Need a new account?</Text>
              <Text style={styles.linkText} onPress={() => router.push('/(auth)/register')}>
                Create one
              </Text>
            </View>
          </SurfaceCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  hero: {
    gap: theme.spacing.md,
    alignItems: 'flex-start',
  },
  heroBadge: {
    width: 72,
    height: 72,
    borderRadius: theme.roundness.xl,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: theme.colors.textPrimary,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  cardHeader: {
    gap: theme.spacing.xs,
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  input: {
    backgroundColor: 'transparent',
  },
  button: {
    borderRadius: theme.roundness.button,
    marginTop: theme.spacing.xs,
  },
  buttonContent: {
    minHeight: 54,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  footerText: {
    color: theme.colors.textSecondary,
  },
  linkText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
