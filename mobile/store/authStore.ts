import { create } from 'zustand';
import { User, LoginCredentials, RegisterData } from '../types/auth';
import { authService } from '../services/authService';
import { setAuthToken } from '../services/apiClient';
import { saveTokens, clearTokens, saveUser, getAccessToken, clearUser } from '../utils/tokenStorage';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: true,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const { user, tokens } = await authService.login(credentials);
      setAuthToken(tokens.access);
      await saveTokens(tokens.access, tokens.refresh);
      await saveUser(user);
      set({ user, token: tokens.access, isAuthenticated: true, isLoading: false, isInitialized: true });
    } catch (err: any) {
      set({ 
        isLoading: false, 
        error: err.response?.data?.message || err.message || 'Login failed' 
      });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const { user, tokens } = await authService.register(data);
      setAuthToken(tokens.access);
      await saveTokens(tokens.access, tokens.refresh);
      await saveUser(user);
      set({ user, token: tokens.access, isAuthenticated: true, isLoading: false, isInitialized: true });
    } catch (err: any) {
      set({ 
        isLoading: false, 
        error: err.response?.data?.message || err.message || 'Registration failed' 
      });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    setAuthToken(null);
    await clearTokens();
    await clearUser();
    set({ user: null, token: null, isAuthenticated: false, isLoading: false, isInitialized: true, error: null });
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const token = await getAccessToken();

      if (!token) {
        setAuthToken(null);
        set({ token: null, user: null, isAuthenticated: false, isLoading: false, isInitialized: true, error: null });
        return;
      }

      setAuthToken(token);
      const user = await authService.me();
      await saveUser(user);
      set({ user, token, isAuthenticated: true, isLoading: false, isInitialized: true, error: null });
    } catch (err: any) {
      setAuthToken(null);
      await clearTokens();
      await clearUser();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        error: err.message || null,
      });
    }
  },
}));
