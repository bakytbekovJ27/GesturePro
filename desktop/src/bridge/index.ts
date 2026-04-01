import { MockDesktopCoreBridge } from './mockDesktopCoreBridge'
import { TauriDesktopCoreBridge } from './tauriDesktopCoreBridge'
import type { DesktopCoreBridge } from './desktopCoreBridge'

function canUseTauriBridge(): boolean {
  if (import.meta.env.VITE_DESKTOP_MOCK === '1') {
    return false
  }

  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function createDesktopCoreBridge(): DesktopCoreBridge {
  return canUseTauriBridge() ? new TauriDesktopCoreBridge() : new MockDesktopCoreBridge()
}
