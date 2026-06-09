import api from './client';

export interface Session {
  id: number;
  pin_code: string;
  access_token: string;
  display_name: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

export const listSessions = async (activeOnly?: boolean): Promise<Session[]> => {
  const { data } = await api.get<Session[]>('/admin/sessions/', {
    params: activeOnly ? { active: 'true' } : {},
  });
  return data;
};

export const deactivateSession = async (id: number): Promise<void> => {
  await api.delete(`/admin/sessions/${id}/`);
};
