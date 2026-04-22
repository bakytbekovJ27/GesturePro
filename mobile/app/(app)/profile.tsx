import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell,
  Database,
  Info,
  Lock,
  LogOut,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react-native';

import { MetricCard, SectionHeader, SurfaceCard } from '../../components/AppPrimitives';
import { theme } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { usePresentationStore } from '../../store/presentationStore';
import { useSessionStore } from '../../store/sessionStore';
import { toast } from '../../utils/toast';

export default function Profile() {
  const { user, logout } = useAuthStore();
  const { presentations, reset } = usePresentationStore();
  const { disconnect, isConnected, pinCode } = useSessionStore();

  const [notifEnabled, setNotifEnabled] = useState(true);
  const [isEditVisible, setIsEditVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    username: user?.username || 'GesturePro Mobile',
    email: user?.email || '',
  });

  const favoritesCount = presentations.filter((presentation) => presentation.is_favorite).length;
  const avatarLabel = (user?.username || 'GP').slice(0, 2).toUpperCase();

  const handleLogout = () => {
    Alert.alert('Logout', 'Sign out from your account on this phone?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          disconnect();
          reset();
          void logout();
          toast.success('Logged out');
        },
      },
    ]);
  };

  const handleDisconnectDesktop = () => {
    disconnect();
    toast.success('Disconnected from desktop');
  };

  const handleUpdateAccount = () => {
    setIsEditVisible(false);
    toast.success('Profile updated');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SectionHeader
          eyebrow="Workspace"
          title={user?.username || 'GesturePro Mobile'}
          description={user?.email || 'No email available'}
        />

        <SurfaceCard>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLabel}>{avatarLabel}</Text>
            </View>
            <View style={styles.profileCopy}>
              <Text variant="titleLarge" style={styles.profileName}>
                {user?.username || 'GesturePro Mobile'}
              </Text>
              <Text style={styles.profileMeta}>
                {isConnected ? `Connected with PIN ${pinCode}` : 'Desktop not connected'}
              </Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <MetricCard label="Presentations" value={presentations.length} tone="primary" />
            <MetricCard label="Favorites" value={favoritesCount} tone="warning" />
            <MetricCard label="Live Sessions" value={isConnected ? 1 : 0} tone="success" />
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeader
            eyebrow="Settings"
            title="Account and Device"
            description="Tune the mobile workspace that supports your live presentation flow."
          />
          <SettingRow
            icon={<UserIcon color={theme.colors.textPrimary} size={18} />}
            title="Account Settings"
            description="Update your basic profile information."
            action={
              <Button mode="text" compact onPress={() => setIsEditVisible(true)}>
                Edit
              </Button>
            }
          />
          <SettingRow
            icon={<Lock color={theme.colors.textPrimary} size={18} />}
            title="Security & Password"
            description="Password management UI is reserved for a later iteration."
          />
          <SettingRow
            icon={<Bell color={theme.colors.textPrimary} size={18} />}
            title="Push Notifications"
            description="Keep mobile alerts on for pairing and delivery updates."
            action={
              <Switch
                value={notifEnabled}
                onValueChange={setNotifEnabled}
                trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }}
                thumbColor={theme.colors.textPrimary}
              />
            }
          />
          <SettingRow
            icon={<Database color={theme.colors.textPrimary} size={18} />}
            title="Storage Usage"
            description="Presentation history is attached to your account."
          />
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeader
            eyebrow="Support"
            title="Product Information"
            description="A few essentials about the current mobile workspace."
          />
          <SettingRow
            icon={<Info color={theme.colors.textPrimary} size={18} />}
            title="About GesturePro"
            description="Version 1.0.0"
          />
          <SettingRow
            icon={<ShieldCheck color={theme.colors.textPrimary} size={18} />}
            title="Privacy Policy"
            description="Privacy and account policy link will land in a later pass."
          />
        </SurfaceCard>

        {isEditVisible ? (
          <SurfaceCard>
            <SectionHeader
              eyebrow="Profile Editing"
              title="Update Account Details"
              description="Local form polish only; no backend profile mutation is introduced here."
            />
            <TextInput
              label="Username"
              value={editForm.username}
              onChangeText={(username) => setEditForm((current) => ({ ...current, username }))}
              mode="outlined"
            />
            <TextInput
              label="Email"
              value={editForm.email}
              onChangeText={(email) => setEditForm((current) => ({ ...current, email }))}
              mode="outlined"
            />
            <View style={styles.editActions}>
              <Button mode="contained" onPress={handleUpdateAccount}>
                Save Changes
              </Button>
              <Button mode="text" onPress={() => setIsEditVisible(false)}>
                Cancel
              </Button>
            </View>
          </SurfaceCard>
        ) : null}

        {isConnected ? (
          <Button mode="outlined" onPress={handleDisconnectDesktop}>
            Disconnect Desktop
          </Button>
        ) : null}

        <Button
          mode="outlined"
          onPress={handleLogout}
          textColor={theme.colors.danger}
          icon={() => <LogOut color={theme.colors.danger} size={18} />}
        >
          Logout
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>{icon}</View>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      {action ? <View style={styles.settingAction}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: theme.colors.primaryMuted,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLabel: {
    color: theme.colors.primary,
    fontSize: 28,
    fontWeight: '800',
  },
  profileCopy: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  profileMeta: {
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingCopy: {
    flex: 1,
    gap: 2,
  },
  settingTitle: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  settingDescription: {
    color: theme.colors.textSecondary,
    lineHeight: 19,
  },
  settingAction: {
    marginLeft: theme.spacing.sm,
  },
  editActions: {
    gap: theme.spacing.sm,
  },
});
