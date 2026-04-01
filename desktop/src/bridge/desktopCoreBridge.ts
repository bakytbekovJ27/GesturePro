import type { CoreEvent } from '../types/desktop'

export type CoreListener = (event: CoreEvent) => void

export type BridgeKind = 'mock' | 'sidecar'

export interface DesktopCoreBridge {
  readonly kind: BridgeKind
  startSession(): Promise<void>
  stopSession(): Promise<void>
  pickPresentationFile(): Promise<boolean>
  loadDemoSlides(): Promise<void>
  startGestureCore(): Promise<void>
  stopGestureCore(): Promise<void>
  subscribe(listener: CoreListener): () => void
  dispose(): Promise<void>
}

export interface MockDesktopCoreBridge extends DesktopCoreBridge {
  readonly kind: 'mock'
  refreshSession(): Promise<void>
  simulateRemoteDeck(): Promise<void>
  simulateError(message?: string): void
  cycleGesture(): void
}

export function isMockBridge(bridge: DesktopCoreBridge): bridge is MockDesktopCoreBridge {
  return bridge.kind === 'mock'
}
