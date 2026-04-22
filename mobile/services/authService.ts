import apiClient from './apiClient';
import { LoginCredentials, RegisterData, AuthResponse, User } from '../types/auth';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login/', credentials);
    return response.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register/', data);
    return response.data;
  },

  me: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me/');
    return response.data;
  },
};
