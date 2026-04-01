import axios from 'axios'

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost'])
const DEFAULT_BACKEND_PORT = 8000

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()
const configuredLegacyBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

function resolveFallbackApiOrigin() {
  if (typeof window === 'undefined') {
    return `http://localhost:${DEFAULT_BACKEND_PORT}`
  }

  const hostname = window.location.hostname || 'localhost'
  return `http://${hostname}:${DEFAULT_BACKEND_PORT}`
}

function normalizeApiBaseUrl(baseUrl: string) {
  const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, '')
  if (trimmedBaseUrl.endsWith('/api/v1')) {
    return trimmedBaseUrl
  }
  return `${trimmedBaseUrl}/api/v1`
}

const resolvedBaseUrl =
  configuredApiUrl ||
  configuredLegacyBaseUrl ||
  resolveFallbackApiOrigin()

export const apiBaseUrl = normalizeApiBaseUrl(resolvedBaseUrl)
const parsedApiUrl = new URL(apiBaseUrl)
export const apiOriginUrl = parsedApiUrl.origin
export const apiOriginHost = parsedApiUrl.hostname

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30_000,
})

export function getAuthHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

export function getBackendUnavailableMessage() {
  return `Backend недоступен по ${apiOriginUrl}. Проверьте, что Django запущен. Для телефона и LAN используйте \`python manage.py runserver 0.0.0.0:8000\`.`
}

export function isLanApiMisconfigured(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  if (LOCAL_HOSTS.has(window.location.hostname)) {
    return false
  }

  try {
    return LOCAL_HOSTS.has(apiOriginHost)
  } catch {
    return false
  }
}
