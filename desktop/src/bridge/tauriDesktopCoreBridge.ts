import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-dialog'
import type { CoreEvent, PresentationSlide } from '../types/desktop'
import type { CoreListener, DesktopCoreBridge } from './desktopCoreBridge'

const CORE_EVENT_NAME = 'gesturepro://core-event'
const WINDOWS_ABSOLUTE_PATH = /^[a-zA-Z]:[\\/]/

type SidecarCommand =
  | { command: 'session.start' }
  | { command: 'session.stop' }
  | { command: 'presentation.open_file'; args: { path: string } }
  | { command: 'presentation.load_demo' }
  | { command: 'presentation.enter' }
  | { command: 'presentation.leave' }
  | { command: 'app.shutdown' }

function normalizeSlides(slides: PresentationSlide[] | undefined): PresentationSlide[] | undefined {
  if (!slides) {
    return slides
  }

  return slides.map((slide) => ({
    ...slide,
    imageUrl:
      slide.imageUrl.startsWith('/') || WINDOWS_ABSOLUTE_PATH.test(slide.imageUrl)
        ? convertFileSrc(slide.imageUrl)
        : slide.imageUrl,
  }))
}

function normalizeEvent(event: CoreEvent): CoreEvent {
  if (event.type !== 'presentation_status' || !event.slides) {
    return event
  }

  return {
    ...event,
    slides: normalizeSlides(event.slides),
  }
}

export class TauriDesktopCoreBridge implements DesktopCoreBridge {
  readonly kind = 'sidecar' as const

  private listeners = new Set<CoreListener>()

  private unlistenPromise: Promise<UnlistenFn> | null = null

  private started = false

  subscribe(listener: CoreListener): () => void {
    this.listeners.add(listener)
    void this.ensureEventBridge()

    return () => {
      this.listeners.delete(listener)
    }
  }

  async startSession(): Promise<void> {
    await this.ensureStarted()
    await this.sendCommand({ command: 'session.start' })
  }

  async stopSession(): Promise<void> {
    if (!this.started) {
      return
    }
    await this.sendCommand({ command: 'session.stop' })
  }

  async pickPresentationFile(): Promise<boolean> {
    await this.ensureStarted()

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

    const path = Array.isArray(selected) ? (selected[0] ?? null) : selected
    if (!path) {
      return false
    }

    await this.sendCommand({
      command: 'presentation.open_file',
      args: { path },
    })
    return true
  }

  async loadDemoSlides(): Promise<void> {
    await this.ensureStarted()
    await this.sendCommand({ command: 'presentation.load_demo' })
  }

  async startGestureCore(): Promise<void> {
    await this.ensureStarted()
    await this.sendCommand({ command: 'presentation.enter' })
  }

  async stopGestureCore(): Promise<void> {
    if (!this.started) {
      return
    }
    await this.sendCommand({ command: 'presentation.leave' })
  }

  async dispose(): Promise<void> {
    if (this.unlistenPromise) {
      const unlisten = await this.unlistenPromise
      unlisten()
      this.unlistenPromise = null
    }

    if (this.started) {
      try {
        await this.sendCommand({ command: 'app.shutdown' })
      } catch {
        // ignore and fall back to a hard stop
      }

      try {
        await invoke('stop_sidecar')
      } catch {
        // window shutdown will handle the final cleanup path
      }
    }

    this.started = false
  }

  private async ensureStarted(): Promise<void> {
    await this.ensureEventBridge()
    if (this.started) {
      return
    }

    await invoke('start_sidecar')
    this.started = true
  }

  private async ensureEventBridge(): Promise<void> {
    if (this.unlistenPromise) {
      return
    }

    this.unlistenPromise = listen<CoreEvent>(CORE_EVENT_NAME, (event) => {
      const normalized = normalizeEvent(event.payload)
      this.emitLocal(normalized)
    })
  }

  private async sendCommand(payload: SidecarCommand): Promise<void> {
    await invoke('send_sidecar_command', { payload })
  }

  private emitLocal(event: CoreEvent): void {
    for (const listener of this.listeners) {
      listener(event)
    }
  }
}
