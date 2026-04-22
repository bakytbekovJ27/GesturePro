import apiClient from './apiClient';
import { SessionData } from '../types/session';
import { PresentationSummary } from '../types/presentation';

export const sessionService = {
  pair: async (pin_code: string): Promise<SessionData> => {
    const response = await apiClient.post('/session/pair/', { pin_code });
    return response.data;
  },

  getLatestPresentation: async (pinCode: string): Promise<PresentationSummary | null> => {
    const response = await apiClient.get('/presentations/latest/', {
      params: { pin: pinCode },
      validateStatus: (status) => (status >= 200 && status < 300) || status === 204,
    });
    return response.status === 204 ? null : response.data;
  },

  getRecentPresentations: async (sessionToken: string): Promise<PresentationSummary[]> => {
    void sessionToken;
    const response = await apiClient.get('/presentations/recent/');
    return response.data;
  },
};
