import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Divider, IconButton, Modal, Portal, Text } from 'react-native-paper';
import { Activity, Calendar, Database, Send, Star, Trash2, X } from 'lucide-react-native';

import { getPresentationStatusColor, theme } from '../constants/theme';
import { UserPresentation } from '../types/presentation';
import { StatusChip, SurfaceCard } from './AppPrimitives';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  presentation: UserPresentation | null;
  onFavorite: () => void;
  onDelete: () => void;
  onLoad: () => void;
  isSessionActive: boolean;
}

const REUSABLE_STATUSES = new Set(['ready', 'downloading', 'presenting']);

export const PresentationDetail: React.FC<Props> = ({
  visible,
  onDismiss,
  presentation,
  onFavorite,
  onDelete,
  onLoad,
  isSessionActive,
}) => {
  if (!presentation) {
    return null;
  }

  const canSendToSession = isSessionActive && REUSABLE_STATUSES.has(presentation.status);
  const statusColor = getPresentationStatusColor(presentation.status);

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString();

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
        dismissable
      >
        <SurfaceCard>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text variant="titleLarge" style={styles.title}>
                Presentation Details
              </Text>
              <Text style={styles.subtitle}>Review file health before sending it to a live session.</Text>
            </View>
            <IconButton
              icon={() => <X color={theme.colors.textPrimary} size={20} />}
              mode="contained-tonal"
              containerColor={theme.colors.surfaceElevated}
              onPress={onDismiss}
            />
          </View>

          <View style={styles.content}>
            <Text variant="headlineSmall" style={styles.filename}>
              {presentation.title}
            </Text>
            <StatusChip label={presentation.status.toUpperCase()} tone={canSendToSession ? 'success' : 'neutral'} />

            <View style={styles.infoGrid}>
              <InfoRow
                icon={<Calendar size={18} color={theme.colors.textSecondary} />}
                label="Uploaded"
                value={formatDate(presentation.created_at)}
              />
              <InfoRow
                icon={<Database size={18} color={theme.colors.textSecondary} />}
                label="File size"
                value={formatSize(presentation.size)}
              />
              <InfoRow
                icon={<Activity size={18} color={theme.colors.textSecondary} />}
                label="Status"
                value={presentation.status_message || presentation.status.toUpperCase()}
                valueColor={statusColor}
              />
            </View>

            <Divider style={styles.divider} />

            <Button
              mode="contained"
              onPress={onLoad}
              disabled={!canSendToSession}
              style={styles.actionBtn}
              contentStyle={styles.actionBtnContent}
              icon={() => <Send color="#042637" size={18} />}
            >
              Send to Active Session
            </Button>

            <Button
              mode="outlined"
              onPress={onFavorite}
              style={styles.actionBtn}
              contentStyle={styles.actionBtnContent}
              icon={() => (
                <Star
                  color={presentation.is_favorite ? theme.colors.secondary : theme.colors.textPrimary}
                  fill={presentation.is_favorite ? theme.colors.secondary : 'transparent'}
                  size={18}
                />
              )}
            >
              {presentation.is_favorite ? 'Saved to favorites' : 'Mark as Favorite'}
            </Button>

            <Button
              mode="text"
              onPress={onDelete}
              style={styles.deleteBtn}
              textColor={theme.colors.danger}
              icon={() => <Trash2 color={theme.colors.danger} size={18} />}
            >
              Delete Presentation
            </Button>
          </View>
        </SurfaceCard>
      </Modal>
    </Portal>
  );
};

function InfoRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    alignItems: 'flex-start',
  },
  headerCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  content: {
    gap: theme.spacing.md,
  },
  filename: {
    color: theme.colors.textPrimary,
    fontWeight: '800',
  },
  infoGrid: {
    gap: theme.spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.roundness.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoIcon: {
    width: 34,
    alignItems: 'center',
  },
  infoCopy: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  infoValue: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
    lineHeight: 20,
  },
  divider: {
    backgroundColor: theme.colors.border,
  },
  actionBtn: {
    borderRadius: theme.roundness.button,
  },
  actionBtnContent: {
    minHeight: 52,
  },
  deleteBtn: {
    marginTop: theme.spacing.xs,
  },
});
