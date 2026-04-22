import { createDemoDeck, createLocalDeck, createRemoteDeck } from '../lib/mockSlides'
import type {
  CoreEvent,
  GestureMode,
  GestureState,
  PresentationSlide,
  PresentationSource,
} from '../types/desktop'
import type { CoreListener, MockDesktopCoreBridge as MockDesktopCoreBridgeContract } from './desktopCoreBridge'

type GestureFrame = {
  gesture: GestureState
  mode: GestureMode
  systemActive: boolean
  message: string
}

const gestureFrames: GestureFrame[] = [
  { gesture: 'NONE', mode: 'idle', systemActive: false, message: 'Gesture core paused.' },
  { gesture: 'FIST', mode: 'idle', systemActive: true, message: 'System armed.' },
  { gesture: 'POINT', mode: 'draw', systemActive: true, message: 'Drawing mode.' },
  { gesture: 'THUMB', mode: 'erase', systemActive: true, message: 'Eraser active.' },
  { gesture: 'PEACE', mode: 'swipe', systemActive: true, message: 'Swipe gesture detected.' },
  { gesture: 'PALM', mode: 'clear', systemActive: true, message: 'Clear gesture ready.' },
] as const

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function formatPin(pinCode: string): string {
  return pinCode.replace(/(\d{3})(\d{3})/, '$1 $2')
}

function randomPin(): string {
  return `${Math.floor(100000 + Math.random() * 900000)}`
}

async function openFileWithFallback(): Promise<string | null> {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const selected = await open({
      directory: false,
      multiple: false,
      filters: [
        {
          name: 'Presentations',
          extensions: ['pdf', 'ppt', 'pptx'],
        },
      ],
    })

    if (Array.isArray(selected)) {
      return selected[0] ?? null
    }

    return selected
  } catch {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.pdf,.ppt,.pptx'
      input.onchange = () => resolve(input.files?.[0]?.name ?? null)
      input.click()
    })
  }
}

function basename(pathOrName: string): string {
  const parts = pathOrName.split(/[\\/]/)
  return parts.at(-1) ?? pathOrName
}

export class MockDesktopCoreBridge implements MockDesktopCoreBridgeContract {
  readonly kind = 'mock' as const

  private listeners = new Set<CoreListener>()

  private gestureTimer: number | null = null

  private cameraTimer: number | null = null

  private cameraFrameIndex = 0

  private gestureIndex = 0

  subscribe(listener: CoreListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async startSession(): Promise<void> {
    this.emit({
      type: 'session_status',
      status: 'creating',
      pinCode: null,
      displayName: '••• •••',
      message: 'Creating a desktop pairing session...',
    })

    await delay(350)

    const pinCode = randomPin()
    this.emit({
      type: 'session_status',
      status: 'ready',
      pinCode,
      displayName: formatPin(pinCode),
      message: 'PIN is active. The desktop shell is ready for future phone sync.',
    })
  }

  async stopSession(): Promise<void> {
    await this.stopGestureCore()
    this.emit({
      type: 'session_status',
      status: 'stopped',
      pinCode: null,
      displayName: '••• •••',
      message: 'Desktop session stopped.',
    })
  }

  async pickPresentationFile(): Promise<boolean> {
    const selected = await openFileWithFallback()
    if (!selected) {
      return false
    }

    const fileName = basename(selected)
    await this.finishPresentationLoad({
      fileName,
      slides: createLocalDeck(fileName),
      source: 'file',
      loadingMessage: `Preparing ${fileName} for the mock presentation flow...`,
      readyMessage: `${fileName} is ready. Opening the presentation screen.`,
    })
    return true
  }

  async loadDemoSlides(): Promise<void> {
    await this.finishPresentationLoad({
      fileName: 'Demo Deck',
      slides: createDemoDeck(),
      source: 'demo',
      loadingMessage: 'Generating demo slides for the Tauri desktop shell...',
      readyMessage: 'Demo deck is ready. Opening the presentation screen.',
    })
  }

  async startGestureCore(): Promise<void> {
    if (this.gestureTimer !== null) {
      return
    }

    this.gestureIndex = 0
    this.pushGestureFrame(gestureFrames[this.gestureIndex])

    this.gestureTimer = window.setInterval(() => {
      this.gestureIndex = (this.gestureIndex + 1) % gestureFrames.length
      this.pushGestureFrame(gestureFrames[this.gestureIndex])
    }, 2200)

    this.cameraFrameIndex = 0
    this.cameraTimer = window.setInterval(() => {
      this.cameraFrameIndex += 1
      this.emit({
        type: 'camera_frame',
        data: this.mockCameraDataUrl(),
      })
    }, 200)
  }

  async stopGestureCore(): Promise<void> {
    if (this.gestureTimer !== null) {
      window.clearInterval(this.gestureTimer)
      this.gestureTimer = null
    }

    if (this.cameraTimer !== null) {
      window.clearInterval(this.cameraTimer)
      this.cameraTimer = null
    }

    this.emit({
      type: 'gesture_state',
      gesture: 'NONE',
      mode: 'idle',
      systemActive: false,
      message: 'Gesture core paused.',
    })
  }

  async refreshSession(): Promise<void> {
    await this.startSession()
  }

  async simulateRemoteDeck(): Promise<void> {
    await this.finishPresentationLoad({
      fileName: 'Mobile Sync Deck.pdf',
      slides: createRemoteDeck(),
      source: 'remote',
      loadingMessage: 'Receiving a presentation from the mobile mock flow...',
      readyMessage: 'Remote deck delivered. Presentation is ready on the desktop.',
    })
  }

  simulateError(message = 'Mock bridge error: future Python core is not connected yet.'): void {
    this.emit({
      type: 'core_error',
      code: 'MOCK_BRIDGE',
      message,
    })
  }

  cycleGesture(): void {
    this.gestureIndex = (this.gestureIndex + 1) % gestureFrames.length
    this.pushGestureFrame(gestureFrames[this.gestureIndex])
  }

  async dispose(): Promise<void> {
    await this.stopSession()
  }

  private async finishPresentationLoad({
    fileName,
    slides,
    source,
    loadingMessage,
    readyMessage,
  }: {
    fileName: string
    slides: PresentationSlide[]
    source: PresentationSource
    loadingMessage: string
    readyMessage: string
  }): Promise<void> {
    this.emit({
      type: 'presentation_status',
      status: 'loading',
      message: loadingMessage,
      fileName,
      source,
    })

    await delay(950)

    this.emit({
      type: 'presentation_status',
      status: 'ready',
      message: readyMessage,
      slides,
      fileName,
      source,
    })
  }

  private pushGestureFrame(frame: GestureFrame): void {
    this.emit({
      type: 'gesture_state',
      gesture: frame.gesture,
      mode: frame.mode,
      systemActive: frame.systemActive,
      message: frame.message,
    })
  }

  private emit(event: CoreEvent): void {
    this.listeners.forEach((listener) => {
      listener(event)
    })
  }

  private mockCameraDataUrl(): string {
    const hue = (this.cameraFrameIndex * 7) % 360
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
      <rect width="320" height="180" fill="hsl(${hue}, 18%, 10%)"/>
      <circle cx="160" cy="90" r="50" fill="none" stroke="hsl(${hue}, 60%, 50%)" stroke-width="2" opacity="0.5"/>
      <circle cx="160" cy="90" r="25" fill="none" stroke="hsl(${hue}, 60%, 50%)" stroke-width="1" opacity="0.3"/>
      <line x1="160" y1="40" x2="160" y2="140" stroke="rgba(255,255,255,0.08)"/>
      <line x1="110" y1="90" x2="210" y2="90" stroke="rgba(255,255,255,0.08)"/>
      <text x="160" y="165" text-anchor="middle" font-family="monospace" font-size="11" fill="rgba(255,255,255,0.5)">MOCK CAMERA</text>
    </svg>`
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
  }
}
