import Constants from 'expo-constants';

const DEFAULT_BACKEND_PORT = 8000;

function getDebuggerHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost;

  return typeof hostUri === 'string' ? hostUri.split(':')[0] : null;
}

function resolveApiOrigin() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, '');
  }

  const debuggerHost = getDebuggerHost();
  if (debuggerHost) {
    return `http://${debuggerHost}:${DEFAULT_BACKEND_PORT}`;
  }

  return `http://localhost:${DEFAULT_BACKEND_PORT}`;
}

function normalizeApiBaseUrl(origin: string) {
  const normalized = origin.replace(/\/+$/, '');
  return normalized.endsWith('/api/v1') ? normalized : `${normalized}/api/v1`;
}

export const API_BASE_URL = normalizeApiBaseUrl(resolveApiOrigin());

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
};
