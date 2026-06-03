import axios from 'axios';
import { API_BASE_URL } from '../constants/api';
import { getRefreshToken, saveTokens, clearTokens, clearUser } from '../utils/tokenStorage';

let authToken: string | null = null;
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export function setAuthToken(token?: string | null) {
  authToken = token ?? null;
}

export function getAuthToken() {
  return authToken;
}

export function withSessionToken(token?: string | null): Record<string, string> {
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

  if (authToken) {
    if (typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${authToken}`);
    } else {
      (config.headers as any).Authorization = `Bearer ${authToken}`;
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 Unauthorized and not already retried
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Don't try to refresh if it's the login/register/refresh endpoint itself
      const url = originalRequest.url || '';
      if (!url.includes('/auth/login/') && !url.includes('/auth/register/') && !url.includes('/auth/token/refresh/')) {
        
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest._retry = true;
              if (originalRequest.headers) {
                if (typeof originalRequest.headers.set === 'function') {
                  originalRequest.headers.set('Authorization', `Bearer ${token}`);
                } else {
                  originalRequest.headers['Authorization'] = `Bearer ${token}`;
                }
              }
              return apiClient(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = await getRefreshToken();
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          // Request new access token from backend refresh endpoint
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access, refresh } = response.data;
          setAuthToken(access);
          await saveTokens(access, refresh || refreshToken);

          isRefreshing = false;
          processQueue(null, access);

          if (originalRequest.headers) {
            if (typeof originalRequest.headers.set === 'function') {
              originalRequest.headers.set('Authorization', `Bearer ${access}`);
            } else {
              originalRequest.headers['Authorization'] = `Bearer ${access}`;
            }
          }
          return apiClient(originalRequest);
        } catch (refreshError) {
          isRefreshing = false;
          processQueue(refreshError, null);
          
          // Clear credentials and trigger potential auth state redirect/clean up
          setAuthToken(null);
          await clearTokens();
          await clearUser();

          // Reject with custom or standard error
          const message = 'Сессия истекла. Пожалуйста, войдите снова.';
          return Promise.reject(new Error(message));
        }
      }
    }

    const message =
      extractErrorMessage(error.response?.data) ||
      error.message ||
      'Backend недоступен. Проверьте, что Django запущен.';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
