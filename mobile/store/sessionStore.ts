import { create } from 'zustand';
import { Presentation } from '../types/session';
import { sessionService } from '../services/sessionService';

interface SessionState {
  sessionToken: string | null;
  pinCode: string | null;
  displayName: string | null;
  connectedAt: Date | null;
  currentPresentation: Presentation | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  pair: (pin: string) => Promise<void>;
  disconnect: () => void;
  updateStatus: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessionToken: null,
  pinCode: null,
  displayName: null,
  connectedAt: null,
  currentPresentation: null,
  isConnected: false,
  isLoading: false,
  error: null,

  pair: async (pin: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await sessionService.pair(pin);
      set({
        sessionToken: data.access_token,
        pinCode: data.pin_code,
        displayName: data.display_name,
        connectedAt: new Date(),
        isConnected: true,
        isLoading: false,
      });
    } catch (err: any) {
      set({ 
        isLoading: false, 
        error: err.message || 'Не удалось подключиться к desktop' 
      });
      throw err;
    }
  },

  disconnect: () => {
    set({
      sessionToken: null,
      pinCode: null,
      displayName: null,
      connectedAt: null,
      currentPresentation: null,
      isConnected: false,
    });
  },

  updateStatus: async () => {
    try {
      const pinCode = get().pinCode;
      if (!pinCode) return;

      const latestPresentation = await sessionService.getLatestPresentation(pinCode);
      set({
        isConnected: true,
        currentPresentation: latestPresentation,
      });
    } catch (err: any) {
      if (err.message?.includes('Сессия не найдена')) {
        get().disconnect();
      }
    }
  },
}));
