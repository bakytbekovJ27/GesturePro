import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { Button, ProgressBar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  UploadCloud,
} from 'lucide-react-native';

import { EmptyState, SectionHeader, StatusChip, SurfaceCard } from '../../components/AppPrimitives';
import { theme } from '../../constants/theme';
import { presentationService } from '../../services/presentationService';
import { usePresentationStore } from '../../store/presentationStore';
import { useSessionStore } from '../../store/sessionStore';

type UploadStatus = 'idle' | 'uploading' | 'converting' | 'ready' | 'error';

export default function Upload() {
  const router = useRouter();
  const sessionToken = useSessionStore((state) => state.sessionToken);
  const fetchPresentations = usePresentationStore((state) => state.fetchPresentations);

  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const resetUploadState = () => {
    setSelectedFile(null);
    setStatus('idle');
    setProgress(0);
    setError(null);
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      setSelectedFile(result.assets[0]);
      setStatus('idle');
      setProgress(0);
      setError(null);
    } catch {
      setError('Failed to pick file');
    }
  };

  const pollStatus = (id: string) => {
    setStatus('converting');

    return new Promise<void>((resolve, reject) => {
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts += 1;

        try {
          const presentation = await presentationService.getById(id);
          if (presentation.status === 'ready' || presentation.status === 'presenting') {
            clearInterval(interval);
            setStatus('ready');
            setProgress(1);
            resolve();
            return;
          }

          if (presentation.status === 'error' || attempts > 30) {
            clearInterval(interval);
            setStatus('error');
            setError(presentation.error_message || 'Conversion failed');
            reject(new Error(presentation.error_message || 'Conversion failed'));
          }
        } catch (pollError) {
          if (attempts > 30) {
            clearInterval(interval);
            reject(pollError);
          }
        }
      }, 2000);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      return;
    }

    if (!sessionToken) {
      setStatus('error');
      setError('Connect to desktop with a live PIN before uploading a deck.');
      return;
    }

    setStatus('uploading');
    setProgress(0.1);
    setError(null);

    try {
      const response = await presentationService.upload(selectedFile, sessionToken);
      setProgress(0.5);

      if (response.status === 'ready' || response.status === 'presenting') {
        setStatus('ready');
        setProgress(1);
      } else if (response.status === 'error') {
        setStatus('error');
        setError(response.error_message || response.status_message || 'Upload failed');
        return;
      } else {
        await pollStatus(response.id);
      }

      await fetchPresentations();
    } catch (uploadError: any) {
      setStatus('error');
      setError(uploadError.message || 'Upload failed');
    }
  };

  const fileSizeMb = selectedFile?.size ? (selectedFile.size / (1024 * 1024)).toFixed(2) : '0.00';
  const isBusy = status === 'uploading' || status === 'converting';
  const isReady = status === 'ready';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SectionHeader
          eyebrow="Deck Delivery"
          title="Upload a Presentation for the Active Session"
          description="Send a PDF or PPTX to the backend, let conversion finish, then open it from your history or live dashboard."
          right={<StatusChip label={status.toUpperCase()} tone={status === 'error' ? 'danger' : isReady ? 'success' : 'primary'} />}
        />

        {!selectedFile ? (
          <EmptyState
            icon={<UploadCloud size={30} color={theme.colors.primary} />}
            title="Choose a Deck to Upload"
            description="Supported formats are PDF and PPTX. Converted files will appear in your history and sync to desktop."
            action={
              <Button mode="contained" onPress={handlePickFile} style={styles.mainButton}>
                Select Presentation
              </Button>
            }
          />
        ) : (
          <SurfaceCard>
            <View style={styles.fileRow}>
              <View style={styles.fileIcon}>
                {selectedFile.name.toLowerCase().endsWith('.pdf') ? (
                  <FileText size={28} color={theme.colors.secondary} />
                ) : (
                  <FileSpreadsheet size={28} color={theme.colors.primary} />
                )}
              </View>
              <View style={styles.fileCopy}>
                <Text variant="titleMedium" style={styles.fileName} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                <Text style={styles.fileMeta}>{fileSizeMb} MB</Text>
              </View>
              {!isBusy ? (
                <Button mode="text" compact onPress={resetUploadState}>
                  Change
                </Button>
              ) : null}
            </View>

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  {status === 'uploading' && `Uploading... ${Math.round(progress * 100)}%`}
                  {status === 'converting' && 'Converting your presentation...'}
                  {status === 'ready' && 'Presentation ready to reuse'}
                  {status === 'error' && 'Upload failed'}
                  {status === 'idle' && 'Ready to send'}
                </Text>

                {status === 'ready' ? <CheckCircle2 color={theme.colors.success} size={20} /> : null}
                {status === 'error' ? <AlertCircle color={theme.colors.danger} size={20} /> : null}
              </View>
              <ProgressBar progress={progress} color={theme.colors.primary} style={styles.progressBar} />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.actions}>
              {isReady ? (
                <>
                  <Button
                    mode="contained"
                    onPress={() => router.replace('/(app)/history')}
                    style={styles.mainButton}
                    contentStyle={styles.mainButtonContent}
                  >
                    Open History
                  </Button>
                  <Button mode="outlined" onPress={resetUploadState}>
                    Upload Another
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    mode="contained"
                    onPress={handleUpload}
                    disabled={isBusy}
                    style={styles.mainButton}
                    contentStyle={styles.mainButtonContent}
                  >
                    {isBusy ? 'Processing...' : 'Upload & Convert'}
                  </Button>
                  <Button mode="text" onPress={isBusy ? resetUploadState : handlePickFile}>
                    {isBusy ? 'Cancel' : 'Pick Different File'}
                  </Button>
                </>
              )}
            </View>
          </SurfaceCard>
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
  scroll: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  fileIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  fileCopy: {
    flex: 1,
    gap: 4,
  },
  fileName: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  fileMeta: {
    color: theme.colors.textSecondary,
  },
  progressSection: {
    gap: theme.spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  progressLabel: {
    flex: 1,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  progressBar: {
    height: 10,
    borderRadius: theme.roundness.pill,
    backgroundColor: theme.colors.surfaceStrong,
  },
  errorText: {
    color: theme.colors.danger,
    lineHeight: 20,
  },
  actions: {
    gap: theme.spacing.sm,
  },
  mainButton: {
    borderRadius: theme.roundness.button,
  },
  mainButtonContent: {
    minHeight: 52,
  },
});
