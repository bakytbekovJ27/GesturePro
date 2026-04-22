import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Button, Searchbar, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Library } from 'lucide-react-native';

import { EmptyState, SectionHeader, SurfaceCard } from '../../components/AppPrimitives';
import { InlineLoader } from '../../components/InlineLoader';
import { PresentationCard } from '../../components/PresentationCard';
import { PresentationDetail } from '../../components/PresentationDetail';
import { theme } from '../../constants/theme';
import { usePresentationStore } from '../../store/presentationStore';
import { useSessionStore } from '../../store/sessionStore';
import { UserPresentation } from '../../types/presentation';

export default function History() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { isConnected: isSessionActive, sessionToken, updateStatus } = useSessionStore();
  const {
    deletePresentation,
    fetchPresentations,
    getFilteredPresentations,
    isLoading,
    reusePresentation,
    searchQuery,
    setSearchQuery,
    setSortBy,
    sortBy,
    toggleFavorite,
  } = usePresentationStore();

  const [selectedPresentation, setSelectedPresentation] = useState<UserPresentation | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);

  useEffect(() => {
    if (isFocused) {
      void fetchPresentations();
    }
  }, [fetchPresentations, isFocused]);

  const presentations = getFilteredPresentations();

  const openDetails = (item: UserPresentation) => {
    setSelectedPresentation(item);
    setIsDetailVisible(true);
  };

  const handleFavorite = (id: string) => {
    void toggleFavorite(id);
  };

  const handleDelete = async (id: string) => {
    await deletePresentation(id);
    setSelectedPresentation(null);
    setIsDetailVisible(false);
  };

  const handleLoad = async () => {
    if (!selectedPresentation || !sessionToken) {
      return;
    }

    await reusePresentation(selectedPresentation.id, sessionToken);
    await fetchPresentations();
    await updateStatus();
    setSelectedPresentation(null);
    setIsDetailVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={presentations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <SectionHeader
              eyebrow="Library"
              title="Browse and Reuse Your Decks"
              description="Search, favorite, and resend presentations to the desktop session without uploading them again."
              right={
                <Button mode="contained-tonal" onPress={() => router.push('/(app)/upload')}>
                  Upload
                </Button>
              }
            />

            <SurfaceCard>
              <Searchbar
                placeholder="Search by presentation name"
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchBar}
                iconColor={theme.colors.primary}
                inputStyle={styles.searchInput}
              />

              <SegmentedButtons
                value={sortBy}
                onValueChange={(value) => setSortBy(value as 'Recent' | 'Name' | 'Favorites')}
                buttons={[
                  { value: 'Recent', label: 'Recent' },
                  { value: 'Name', label: 'Name' },
                  { value: 'Favorites', label: 'Favorites' },
                ]}
              />
            </SurfaceCard>
          </View>
        }
        renderItem={({ item }) => (
          <PresentationCard
            presentation={item}
            onTap={() => openDetails(item)}
            onFavorite={() => handleFavorite(item.id)}
          />
        )}
        refreshing={isLoading}
        onRefresh={() => {
          void fetchPresentations();
        }}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingWrap}>
              <InlineLoader label="Loading presentation history..." />
            </View>
          ) : (
            <EmptyState
              icon={<Library size={30} color={theme.colors.primary} />}
              title="No presentations yet"
              description="Once you upload a deck, it will appear here for quick reuse and session delivery."
              action={
                <Button mode="contained" onPress={() => router.push('/(app)/upload')}>
                  Upload First Deck
                </Button>
              }
            />
          )
        }
      />

      <PresentationDetail
        visible={isDetailVisible}
        onDismiss={() => {
          setSelectedPresentation(null);
          setIsDetailVisible(false);
        }}
        presentation={selectedPresentation}
        onFavorite={() => selectedPresentation && handleFavorite(selectedPresentation.id)}
        onDelete={() => selectedPresentation && handleDelete(selectedPresentation.id)}
        onLoad={handleLoad}
        isSessionActive={isSessionActive}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  list: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    flexGrow: 1,
  },
  headerBlock: {
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  searchBar: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.roundness.md,
  },
  searchInput: {
    color: theme.colors.textPrimary,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: theme.spacing.xl,
  },
});
