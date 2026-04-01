import axios from 'axios'

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost'])

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

export const apiBaseUrl = configuredBaseUrl || 'http://127.0.0.1:8000/api/v1'

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30_000,
})

export function getAuthHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

export function isLanApiMisconfigured(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  if (LOCAL_HOSTS.has(window.location.hostname)) {
    return false
  }

  try {
    const apiHost = new URL(apiBaseUrl).hostname
    return LOCAL_HOSTS.has(apiHost)
  } catch {
    return false
  }
}
