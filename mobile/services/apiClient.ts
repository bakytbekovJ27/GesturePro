import axios from 'axios';
import { API_BASE_URL } from '../constants/api';

let authToken: string | null = null;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export function setAuthToken(token?: string | null) {
  authToken = token ?? null;
}

export function withSessionToken(token?: string | null) {
  return token ? { 'X-Session-Token': token } : {};
}

function extractErrorMessage(data: any) {
  if (!data) {
    return null;
  }

  if (typeof data.detail === 'string' && data.detail) {
    return data.detail;
  }

  if (Array.isArray(data.detail) && data.detail.length > 0) {
    return String(data.detail[0]);
  }

  if (typeof data.message === 'string' && data.message) {
    return data.message;
  }

  if (typeof data === 'object') {
    for (const value of Object.values(data)) {
      if (typeof value === 'string' && value) {
        return value;
      }
      if (Array.isArray(value) && value.length > 0) {
        return String(value[0]);
      }
    }
  }

  return null;
}

apiClient.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};

  if (authToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      extractErrorMessage(error.response?.data) ||
      error.message ||
      'Backend недоступен. Проверьте, что Django запущен.';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
