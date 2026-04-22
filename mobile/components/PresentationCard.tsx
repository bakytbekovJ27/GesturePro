import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { FileSpreadsheet, FileText, Star } from 'lucide-react-native';

import { getPresentationStatusColor, getStatusTone, theme } from '../constants/theme';
import { UserPresentation } from '../types/presentation';
import { StatusChip, SurfaceCard } from './AppPrimitives';

interface Props {
  presentation: UserPresentation;
  onTap: () => void;
  onFavorite: () => void;
}

export const PresentationCard: React.FC<Props> = ({ presentation, onTap, onFavorite }) => {
  const isPDF = presentation.type === 'pdf';

  const getRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
      return 'Just now';
    }

    if (hours < 24) {
      return `${hours}h ago`;
    }

    return date.toLocaleDateString();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <SurfaceCard style={styles.card} onPress={onTap}>
      <View style={styles.row}>
        <View style={styles.leading}>
          <View style={styles.iconBox}>
            {isPDF ? (
              <FileText color={theme.colors.secondary} size={24} />
            ) : (
              <FileSpreadsheet color={theme.colors.primary} size={24} />
            )}
          </View>
          <View style={styles.info}>
            <Text variant="titleMedium" style={styles.title} numberOfLines={1}>
              {presentation.title}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{getRelativeDate(presentation.created_at)}</Text>
              <View style={styles.metaDot} />
              <Text style={styles.metaText}>{formatSize(presentation.size)}</Text>
            </View>
            <StatusChip
              label={presentation.status.toUpperCase()}
              tone={getStatusTone(presentation.status)}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <IconButton
            icon={() => (
              <Star
                color={presentation.is_favorite ? theme.colors.secondary : theme.colors.textMuted}
                fill={presentation.is_favorite ? theme.colors.secondary : 'transparent'}
                size={20}
              />
            )}
            mode="contained-tonal"
            containerColor={theme.colors.surfaceElevated}
            onPress={onFavorite}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.statusMessage, { color: getPresentationStatusColor(presentation.status) }]}>
          {presentation.status_message}
        </Text>
        <Text style={styles.openLink} onPress={onTap}>
          Open details
        </Text>
      </View>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  leading: {
    flex: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  metaText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.textMuted,
  },
  actions: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  statusMessage: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  openLink: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
