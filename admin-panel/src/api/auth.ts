import api from './client';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  is_staff?: boolean;
  is_active?: boolean;
  date_joined?: string;
  last_login?: string | null;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: { access: string; refresh: string };
}

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const { data } = await api.post<LoginResponse>('/auth/login/', { username, password });
  return data;
};

export const getMe = async (): Promise<AuthUser> => {
  const { data } = await api.get<AuthUser>('/auth/me/');
  return data;
};
