import { create } from 'zustand';
import { UserPresentation } from '../types/presentation';
import { presentationService } from '../services/presentationService';

interface PresentationState {
  presentations: UserPresentation[];
  isLoading: boolean;
  searchQuery: string;
  sortBy: 'Recent' | 'Name' | 'Favorites';
  
  fetchPresentations: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  deletePresentation: (id: string) => Promise<void>;
  reusePresentation: (id: string, sessionToken: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: 'Recent' | 'Name' | 'Favorites') => void;
  reset: () => void;
  
  getFilteredPresentations: () => UserPresentation[];
}

export const usePresentationStore = create<PresentationState>((set, get) => ({
  presentations: [],
  isLoading: false,
  searchQuery: '',
  sortBy: 'Recent',

  fetchPresentations: async () => {
    set({ isLoading: true });
    try {
      const data = await presentationService.getAll();
      set({ presentations: data, isLoading: false });
    } catch (e) {
      set({ 
        isLoading: false 
      });
    }
  },

  toggleFavorite: async (id: string) => {
    const item = get().presentations.find(p => p.id === id);
    if (!item) return;
    
    // Optimistic update
    const previous = [...get().presentations];
    set({
      presentations: get().presentations.map(p => 
        p.id === id ? { ...p, is_favorite: !p.is_favorite } : p
      )
    });

    void previous;
  },

  deletePresentation: async (id: string) => {
    set({ presentations: get().presentations.filter(p => p.id !== id) });
  },

  reusePresentation: async (id: string, sessionToken: string) => {
    try {
      const reused = await presentationService.reuse(id, sessionToken);
      set({
        presentations: [
          reused,
          ...get().presentations.filter(p => p.id !== reused.id),
        ],
      });
    } catch (e) {
      throw e;
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sort) => set({ sortBy: sort }),
  reset: () => set({ presentations: [], isLoading: false, searchQuery: '', sortBy: 'Recent' }),

  getFilteredPresentations: () => {
    const { presentations, searchQuery, sortBy } = get();
    let filtered = presentations.filter(p => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortBy === 'Name') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'Favorites') {
      filtered = filtered.filter(p => p.is_favorite);
    } else {
      // Recent
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return filtered;
  }
}));
