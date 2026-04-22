import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CloudUpload,
  Info,
  Link2,
  Monitor,
  Presentation as PresentationIcon,
} from 'lucide-react-native';

import { MetricCard, SectionHeader, StatusChip, SurfaceCard } from '../../components/AppPrimitives';
import { InlineLoader } from '../../components/InlineLoader';
import { PINInput } from '../../components/PINInput';
import { getPresentationStatusColor, getStatusTone, theme } from '../../constants/theme';
import { useSessionStore } from '../../store/sessionStore';

export default function Dashboard() {
  const router = useRouter();
  const {
    isConnected,
    pinCode,
    connectedAt,
    currentPresentation,
    sessionToken,
    pair,
    disconnect,
    updateStatus,
    isLoading,
    error,
  } = useSessionStore();

  const [pinValue, setPinValue] = useState('');
  const pulseAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (isConnected && sessionToken) {
      interval = setInterval(() => {
        void updateStatus();
      }, 3000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isConnected, sessionToken, updateStatus]);

  useEffect(() => {
    if (!isConnected) {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0.5);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 900,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [isConnected, pulseAnim]);

  const handleConnect = async () => {
    if (pinValue.length !== 6) {
      return;
    }

    try {
      await pair(pinValue);
    } catch {
      // Store state already captures the error.
    }
  };

  const connectedAtLabel = connectedAt
    ? connectedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SectionHeader
          eyebrow="Control Center"
          title="Pair Mobile With Your Desktop Session"
          description="Keep pairing, upload, and playback status in one place while the desktop runtime stays focused on presenting."
          right={<StatusChip label={isConnected ? 'Connected' : 'Awaiting PIN'} tone={isConnected ? 'success' : 'primary'} />}
        />

        {!isConnected ? (
          <SurfaceCard>
            <View style={styles.heroIcon}>
              <Monitor color={theme.colors.primary} size={34} />
            </View>
            <Text variant="headlineSmall" style={styles.cardTitle}>
              Connect to an Active Desktop
            </Text>
            <Text style={styles.cardSubtitle}>
              Enter the six-digit PIN from your desktop shell to unlock live sync, deck upload, and remote control.
            </Text>

            <PINInput onComplete={setPinValue} onChange={setPinValue} disabled={isLoading} />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button
              mode="contained"
              onPress={handleConnect}
              disabled={pinValue.length < 6 || isLoading}
              contentStyle={styles.primaryButtonContent}
              style={styles.primaryButton}
              icon={() => <Link2 color="#042637" size={18} />}
            >
              {isLoading ? 'Connecting...' : 'Connect to Desktop'}
            </Button>

            <View style={styles.supportCard}>
              <Info size={18} color={theme.colors.textSecondary} />
              <Text style={styles.supportCopy}>
                Open GesturePro desktop, note the live PIN, then come back here to pair.
              </Text>
            </View>
          </SurfaceCard>
        ) : (
          <View style={styles.connectedLayout}>
            <SurfaceCard>
              <View style={styles.connectedHeader}>
                <View style={styles.connectedHeaderCopy}>
                  <View style={styles.liveRow}>
                    <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
                    <Text style={styles.liveLabel}>Desktop session is live</Text>
                  </View>
                  <Text variant="headlineSmall" style={styles.cardTitle}>
                    Remote Pairing Active
                  </Text>
                </View>
                <Button mode="outlined" onPress={disconnect}>
                  Disconnect
                </Button>
              </View>

              <View style={styles.metricRow}>
                <MetricCard label="PIN" value={pinCode || '------'} tone="primary" />
                <MetricCard label="Started" value={connectedAtLabel} tone="warning" />
              </View>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeader
                eyebrow="Current Deck"
                title={currentPresentation ? currentPresentation.title : 'Waiting for Presentation'}
                description={
                  currentPresentation
                    ? 'Desktop and mobile are synced to the same deck state.'
                    : 'Once the desktop receives or loads a deck, it will appear here.'
                }
                right={
                  currentPresentation ? (
                    <StatusChip
                      label={currentPresentation.status.toUpperCase()}
                      tone={getStatusTone(currentPresentation.status)}
                    />
                  ) : null
                }
              />

              {currentPresentation ? (
                <View style={styles.presentationPanel}>
                  <View style={styles.presentationBadge}>
                    <PresentationIcon color={theme.colors.textPrimary} size={24} />
                  </View>
                  <View style={styles.presentationCopy}>
                    <Text style={styles.presentationMetaLabel}>Status message</Text>
                    <Text
                      style={[
                        styles.presentationStatus,
                        { color: getPresentationStatusColor(currentPresentation.status) },
                      ]}
                    >
                      {currentPresentation.status_message}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.waitingState}>
                  <InlineLoader size="small" label="Listening for desktop sync..." />
                </View>
              )}

              <Button
                mode="contained"
                onPress={() => router.push('/(app)/upload')}
                style={styles.primaryButton}
                contentStyle={styles.primaryButtonContent}
                icon={() => <CloudUpload color="#042637" size={18} />}
              >
                Upload New Presentation
              </Button>
            </SurfaceCard>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: theme.roundness.xl,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  primaryButton: {
    borderRadius: theme.roundness.button,
  },
  primaryButtonContent: {
    minHeight: 54,
  },
  errorText: {
    color: theme.colors.danger,
    lineHeight: 20,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.roundness.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  supportCopy: {
    flex: 1,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  connectedLayout: {
    gap: theme.spacing.lg,
  },
  connectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    alignItems: 'flex-start',
  },
  connectedHeaderCopy: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.success,
  },
  liveLabel: {
    color: theme.colors.success,
    fontWeight: '700',
  },
  metricRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  presentationPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.roundness.lg,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  presentationBadge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presentationCopy: {
    flex: 1,
    gap: 4,
  },
  presentationMetaLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  presentationStatus: {
    fontWeight: '700',
    lineHeight: 21,
  },
  waitingState: {
    paddingVertical: theme.spacing.md,
  },
});
