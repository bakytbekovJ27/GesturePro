import api from './client';
import type { Presentation } from './presentations';

export interface DashboardStats {
  total_users: number;
  active_sessions: number;
  total_sessions: number;
  total_presentations: number;
  presentation_status_counts: Record<string, number>;
  recent_presentations: Presentation[];
}

export const getStats = async (): Promise<DashboardStats> => {
  const { data } = await api.get<DashboardStats>('/admin/stats/');
  return data;
};
