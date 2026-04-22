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

import { SectionHeader, SurfaceCard } from '../../components/AppPrimitives';
import { theme } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';

export default function Register() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setLocalErrors] = useState<Record<string, string>>({});

  const { register, isLoading, error: apiError } = useAuthStore();

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!username.trim()) {
      nextErrors.username = 'Username is required';
    }

    if (!email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Invalid email format';
    }

    if (!password) {
      nextErrors.password = 'Password is required';
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    setLocalErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const clearError = (key: string) => {
    if (!errors[key]) {
      return;
    }

    setLocalErrors((current) => ({ ...current, [key]: '' }));
  };

  const handleRegister = async () => {
    if (!validate()) {
      return;
    }

    try {
      await register({
        username,
        email,
        password,
        password_confirm: confirmPassword,
      });
    } catch {
      // API error is surfaced from the store.
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <SectionHeader
            eyebrow="New Workspace"
            title="Create Your GesturePro Account"
            description="Set up the account you will use for desktop pairing, uploads, and presentation history."
            right={
              <Button mode="text" compact onPress={() => router.back()}>
                Back
              </Button>
            }
          />

          <SurfaceCard>
            <TextInput
              label="Username"
              value={username}
              onChangeText={(value) => {
                setUsername(value);
                clearError('username');
              }}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="account-circle-outline" />}
              autoCapitalize="none"
            />
            {errors.username ? <HelperText type="error">{errors.username}</HelperText> : null}

            <TextInput
              label="Email"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                clearError('email');
              }}
              mode="outlined"
              keyboardType="email-address"
              style={styles.input}
              left={<TextInput.Icon icon="email-outline" />}
              autoCapitalize="none"
            />
            {errors.email ? <HelperText type="error">{errors.email}</HelperText> : null}

            <TextInput
              label="Password"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                clearError('password');
              }}
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
            />
            {errors.password ? <HelperText type="error">{errors.password}</HelperText> : null}

            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                clearError('confirmPassword');
              }}
              secureTextEntry={!showPassword}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="shield-check-outline" />}
              autoCapitalize="none"
            />
            {errors.confirmPassword ? (
              <HelperText type="error">{errors.confirmPassword}</HelperText>
            ) : null}

            {apiError ? <HelperText type="error">{apiError}</HelperText> : null}

            <Button
              mode="contained"
              onPress={handleRegister}
              style={styles.button}
              contentStyle={styles.buttonContent}
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Workspace'}
            </Button>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already registered?</Text>
              <Text style={styles.linkText} onPress={() => router.push('/(auth)/login')}>
                Sign in
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
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  input: {
    backgroundColor: 'transparent',
  },
  button: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.roundness.button,
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
