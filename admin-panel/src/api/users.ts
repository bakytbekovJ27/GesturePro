import api from './client';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  is_staff: boolean;
}

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  password?: string;
  is_staff?: boolean;
  is_active?: boolean;
}

export const listUsers = async (search?: string): Promise<AdminUser[]> => {
  const { data } = await api.get<AdminUser[]>('/admin/users/', {
    params: search ? { search } : {},
  });
  return data;
};

export const createUser = async (payload: CreateUserPayload): Promise<AdminUser> => {
  const { data } = await api.post<AdminUser>('/admin/users/', payload);
  return data;
};

export const updateUser = async (id: number, payload: UpdateUserPayload): Promise<AdminUser> => {
  const { data } = await api.patch<AdminUser>(`/admin/users/${id}/`, payload);
  return data;
};

export const deleteUser = async (id: number): Promise<void> => {
  await api.delete(`/admin/users/${id}/`);
};
