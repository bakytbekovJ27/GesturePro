import api from './client';

export interface Presentation {
  id: string;
  title: string;
  status: string;
  status_message: string;
  error_message: string;
  file_size: number;
  extension: string;
  uploaded_at: string;
  updated_at: string;
  last_sent_at: string;
  ready_at: string | null;
  download_url: string | null;
  uploaded_by: { id: number; username: string; email: string } | null;
}

export const listPresentations = async (filters?: {
  status?: string;
  search?: string;
}): Promise<Presentation[]> => {
  const { data } = await api.get<Presentation[]>('/admin/presentations/', {
    params: filters || {},
  });
  return data;
};

export const deletePresentation = async (id: string): Promise<void> => {
  await api.delete(`/admin/presentations/${id}/`);
};
