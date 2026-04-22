const DEFAULT_BACKEND_PORT = 8000

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

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()
const configuredLegacyBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

const resolvedBaseUrl =
  configuredApiUrl ||
  configuredLegacyBaseUrl ||
  resolveFallbackApiOrigin()

export const apiBaseUrl = normalizeApiBaseUrl(resolvedBaseUrl)
const parsedApiUrl = new URL(apiBaseUrl)
export const apiOriginUrl = parsedApiUrl.origin
export const apiOriginHost = parsedApiUrl.hostname

export function getBackendUnavailableMessage() {
  return `Backend is unavailable at ${apiOriginUrl}. Start Django first. For phone and LAN access use \`python manage.py runserver 0.0.0.0:8000\`.`
}

export function resolveApiUrl(path: string) {
  return new URL(path.replace(/^\/+/, ''), `${apiBaseUrl}/`).toString()
}
