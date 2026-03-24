import type { PresentationSummary, SessionState } from '../types/api'

const SESSION_KEY = 'gesturepro.session'
const HISTORY_KEY = 'gesturepro.history'

export function loadStoredSession() {
  try {
    const rawValue = window.localStorage.getItem(SESSION_KEY)
    if (!rawValue) {
      return null
    }
    return JSON.parse(rawValue) as SessionState
  } catch {
    return null
  }
}

export function saveStoredSession(session: SessionState) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearStoredSession() {
  window.localStorage.removeItem(SESSION_KEY)
}

export function loadStoredHistory() {
  try {
    const rawValue = window.localStorage.getItem(HISTORY_KEY)
    if (!rawValue) {
      return []
    }
    return JSON.parse(rawValue) as PresentationSummary[]
  } catch {
    return []
  }
}

export function saveStoredHistory(items: PresentationSummary[]) {
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 5)))
}

export function mergeStoredHistory(
  incomingItems: PresentationSummary[],
  currentItems: PresentationSummary[],
) {
  const mergedMap = new Map<string, PresentationSummary>()

  for (const item of [...incomingItems, ...currentItems]) {
    mergedMap.set(item.id, item)
  }

  return Array.from(mergedMap.values())
    .sort((left, right) => new Date(right.last_sent_at).getTime() - new Date(left.last_sent_at).getTime())
    .slice(0, 5)
}
