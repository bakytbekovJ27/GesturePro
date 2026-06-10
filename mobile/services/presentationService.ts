import apiClient, { withSessionToken, getAuthToken } from './apiClient';
import { Platform } from 'react-native';
import { PresentationSummary, UserPresentation, UploadResponse } from '../types/presentation';
import { API_BASE_URL } from '../constants/api';

function normalizePresentation(item: PresentationSummary): UserPresentation {
  const extension = item.extension?.replace('.', '').toLowerCase();

  return {
    id: item.id,
    title: item.title,
    status: item.status,
    status_message: item.status_message,
    error_message: item.error_message,
    created_at: item.uploaded_at,
    updated_at: item.updated_at,
    size: item.file_size,
    type: extension === 'pptx' ? 'pptx' : 'pdf',
    extension: item.extension,
    download_url: item.download_url,
    is_favorite: false,
  };
}

export const presentationService = {
  upload: async (file: any, sessionToken: string): Promise<UploadResponse> => {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      // For web, fetch the file and create a File object
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const webFile = new File([blob], file.name, { type: file.mimeType || 'application/octet-stream' });
      formData.append('file', webFile);
    } else {
      // For native platforms
      let fileUri = file.uri;

      // Ensure iOS file paths are correctly prefixed
      if (Platform.OS === 'ios' && !fileUri.startsWith('file://')) {
        fileUri = `file://${fileUri}`;
      }

      formData.append('file', {
        uri: fileUri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as any);
    }

    // Use native fetch to bypass Axios FormData limitations in React Native
    const headers: Record<string, string> = {
      ...withSessionToken(sessionToken),
    };

    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/presentations/upload/`, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!response.ok) {
      let errorMessage = 'Upload failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        const errorText = await response.text();
        if (errorText) errorMessage = errorText;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  },

  getById: async (id: string): Promise<UserPresentation> => {
    const response = await apiClient.get<PresentationSummary>(`/presentations/status/${id}/`);
    return normalizePresentation(response.data);
  },

  getAll: async (): Promise<UserPresentation[]> => {
    const response = await apiClient.get<PresentationSummary[]>('/presentations/recent/');
    return response.data.map(normalizePresentation);
  },

  reuse: async (id: string, sessionToken: string): Promise<UserPresentation> => {
    const response = await apiClient.post<PresentationSummary>(
      `/presentations/${id}/reuse/`,
      {},
      { headers: withSessionToken(sessionToken) },
    );
    return normalizePresentation(response.data);
  },

  fromSummary: (presentation: PresentationSummary): UserPresentation => {
    return normalizePresentation(presentation);
  },

  toggleFavorite: async (id: string, isFavorite: boolean): Promise<UserPresentation> => {
    throw new Error('Favorites are stored locally in this mobile build.');
  },

  delete: async (id: string): Promise<void> => {
    throw new Error('Deleting presentations is not supported by backend-mobile yet.');
  },
};
