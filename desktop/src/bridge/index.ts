import { BrowserDesktopCoreBridge } from './browserDesktopCoreBridge'
import { MockDesktopCoreBridge } from './mockDesktopCoreBridge'
import { TauriDesktopCoreBridge } from './tauriDesktopCoreBridge'
import type { DesktopCoreBridge } from './desktopCoreBridge'

function shouldUseMockBridge(): boolean {
  return import.meta.env.VITE_DESKTOP_MOCK === '1'
}

function canUseTauriBridge(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function createDesktopCoreBridge(): DesktopCoreBridge {
  if (shouldUseMockBridge()) {
    return new MockDesktopCoreBridge()
  }

  if (canUseTauriBridge()) {
    return new TauriDesktopCoreBridge()
  }

  return new BrowserDesktopCoreBridge()
}
