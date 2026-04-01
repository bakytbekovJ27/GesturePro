import { createDemoDeck } from '../lib/mockSlides'
import { apiBaseUrl, getBackendUnavailableMessage, resolveApiUrl } from '../lib/api'
import type {
  CoreEvent,
  GestureState,
  PresentationSource,
} from '../types/desktop'
import type { CoreListener, DesktopCoreBridge } from './desktopCoreBridge'

type SessionCreateResponse = {
  pin_code: string
}

type RemotePresentationResponse = {
  id: string
  title?: string
  download_url?: string | null
}

const POLL_INTERVAL_MS = 2_500
const EMPTY_PIN_DISPLAY = '••• •••'
const CAMERA_FRAME_INTERVAL_MS = 180
const CAMERA_FRAME_WIDTH = 320
const CAMERA_FRAME_HEIGHT = 180
const CAMERA_JPEG_QUALITY = 0.72

function formatPin(pinCode: string): string {
  return pinCode.replace(/(\d{3})(\d{3})/, '$1 $2')
}

function emitGestureIdle(emit: (event: CoreEvent) => void, message: string) {
  emit({
    type: 'gesture_state',
    gesture: 'NONE' satisfies GestureState,
    mode: 'idle',
    systemActive: false,
    message,
  })
}

function openPresentationFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.ppt,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation'
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })
}

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { detail?: unknown }
    if (typeof payload.detail === 'string' && payload.detail.trim()) {
      return payload.detail.trim()
    }
  } catch {
    // ignore malformed or empty responses
  }

  return `${response.status} ${response.statusText}`.trim()
}

export class BrowserDesktopCoreBridge implements DesktopCoreBridge {
  readonly kind = 'browser' as const

  private listeners = new Set<CoreListener>()

  private started = false

  private sessionPin: string | null = null

  private pollTimer: number | null = null

  private currentDocumentUrl: string | null = null

  private lastRemotePresentationId: string | null = null

  private remoteWaitingAnnounced = false

  private cameraStream: MediaStream | null = null

  private cameraVideo: HTMLVideoElement | null = null

  private cameraCanvas: HTMLCanvasElement | null = null

  private cameraTimer: number | null = null

  subscribe(listener: CoreListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async startSession(): Promise<void> {
    if (this.started) {
      if (this.sessionPin) {
        this.emitSessionReady(this.sessionPin)
      }
      return
    }

    this.started = true
    this.emit({
      type: 'runtime_status',
      status: 'starting',
      message: `Browser pairing mode is starting via ${apiBaseUrl}.`,
    })
    this.emit({
      type: 'session_status',
      status: 'creating',
      pinCode: null,
      displayName: EMPTY_PIN_DISPLAY,
      message: 'Creating a browser pairing session...',
    })

    try {
      await this.createRemoteSession()
      this.scheduleNextPoll()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Browser pairing failed to start.'
      this.started = false
      this.emit({
        type: 'runtime_status',
        status: 'error',
        message,
      })
      this.emit({
        type: 'session_status',
        status: 'failed',
        pinCode: null,
        displayName: EMPTY_PIN_DISPLAY,
        message,
      })
      throw new Error(message)
    }
  }

  async stopSession(): Promise<void> {
    this.started = false
    this.clearPollTimer()
    this.stopCameraPreview()
    this.sessionPin = null
    this.lastRemotePresentationId = null
    this.remoteWaitingAnnounced = false
    this.revokeDocumentUrl()
    this.emit({
      type: 'session_status',
      status: 'stopped',
      pinCode: null,
      displayName: EMPTY_PIN_DISPLAY,
      message: 'Browser pairing session stopped.',
    })
    this.emit({
      type: 'runtime_status',
      status: 'stopped',
      message: 'Browser pairing mode stopped.',
    })
  }

  async pickPresentationFile(): Promise<boolean> {
    const file = await openPresentationFile()
    if (!file) {
      return false
    }

    const extension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`
    if (extension !== '.pdf') {
      this.emitPresentationError(
        'Browser desktop can preview only local PDF files. Use Tauri desktop for PPT/PPTX imports.',
        file.name,
        'file',
      )
      return true
    }

    this.publishDocumentPresentation({
      documentUrl: URL.createObjectURL(file),
      fileName: file.name,
      source: 'file',
      message: `${file.name} is ready in the browser viewer.`,
    })
    return true
  }

  async loadDemoSlides(): Promise<void> {
    this.revokeDocumentUrl()
    const slides = createDemoDeck()
    this.emit({
      type: 'presentation_status',
      status: 'ready',
      message: 'Demo deck is ready. Opening presentation mode.',
      slides,
      fileName: 'Demo Deck',
      source: 'demo',
    })
  }

  async startGestureCore(): Promise<void> {
    this.emit({
      type: 'runtime_status',
      status: 'starting',
      message: 'Requesting camera access for the browser preview...',
    })
    emitGestureIdle((event) => this.emit(event), 'Starting camera preview...')

    try {
      await this.startCameraPreview()
      this.emit({
        type: 'runtime_status',
        status: 'ready',
        message: 'Browser camera preview is live. Gesture recognition remains available only in Tauri desktop.',
      })
      emitGestureIdle(
        (event) => this.emit(event),
        'Browser camera preview is live. Gesture recognition remains available only in Tauri desktop.',
      )
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Camera preview is unavailable in the browser.'
      this.emit({
        type: 'runtime_status',
        status: 'degraded',
        message,
      })
      emitGestureIdle((event) => this.emit(event), message)
    }
  }

  async stopGestureCore(): Promise<void> {
    this.stopCameraPreview()
    emitGestureIdle((event) => this.emit(event), 'Browser viewer mode is active.')
  }

  async dispose(): Promise<void> {
    await this.stopSession()
  }

  private async createRemoteSession(): Promise<void> {
    let response: Response
    try {
      response = await fetch(resolveApiUrl('session/create/'), {
        method: 'POST',
      })
    } catch {
      throw new Error(getBackendUnavailableMessage())
    }

    if (!response.ok) {
      throw new Error(`Failed to create a pairing session: ${await readErrorMessage(response)}`)
    }

    const payload = (await response.json()) as SessionCreateResponse
    const pinCode = String(payload.pin_code ?? '').trim()
    if (!pinCode) {
      throw new Error('Backend did not return a valid PIN code.')
    }

    this.sessionPin = pinCode
    this.lastRemotePresentationId = null
    this.remoteWaitingAnnounced = false
    this.emitSessionReady(pinCode)
    this.emit({
      type: 'runtime_status',
      status: 'ready',
      message: `Browser pairing session is active via ${apiBaseUrl}.`,
    })
  }

  private emitSessionReady(pinCode: string) {
    const displayName = formatPin(pinCode)
    this.emit({
      type: 'session_status',
      status: 'ready',
      pinCode,
      displayName,
      message: `PIN is active. Enter ${displayName} in the mobile app.`,
    })
  }

  private scheduleNextPoll(delay = POLL_INTERVAL_MS) {
    if (!this.started) {
      return
    }

    this.clearPollTimer()
    this.pollTimer = window.setTimeout(() => {
      void this.pollRemotePresentation()
    }, delay)
  }

  private clearPollTimer() {
    if (this.pollTimer !== null) {
      window.clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
  }

  private async pollRemotePresentation(): Promise<void> {
    if (!this.started || !this.sessionPin) {
      return
    }

    const latestUrl = new URL(resolveApiUrl('presentations/latest/'))
    latestUrl.searchParams.set('pin', this.sessionPin)

    try {
      const response = await fetch(latestUrl)

      if (response.status === 204) {
        if (!this.remoteWaitingAnnounced) {
          this.remoteWaitingAnnounced = true
          this.emit({
            type: 'presentation_status',
            status: 'idle',
            message: 'PIN is active. Waiting for a presentation from the phone.',
            source: 'remote',
          })
        }
        this.scheduleNextPoll()
        return
      }

      if (response.status === 404) {
        this.sessionPin = null
        this.lastRemotePresentationId = null
        this.remoteWaitingAnnounced = false
        this.emit({
          type: 'session_status',
          status: 'creating',
          pinCode: null,
          displayName: EMPTY_PIN_DISPLAY,
          message: 'Session expired. Creating a new PIN...',
        })
        await this.createRemoteSession()
        this.scheduleNextPoll()
        return
      }

      if (!response.ok) {
        throw new Error(`Polling failed: ${await readErrorMessage(response)}`)
      }

      const payload = (await response.json()) as RemotePresentationResponse
      const presentationId = String(payload.id ?? '').trim()
      this.remoteWaitingAnnounced = false

      if (presentationId && presentationId !== this.lastRemotePresentationId) {
        this.lastRemotePresentationId = presentationId
        await this.syncRemotePresentation(payload)
      }

      this.scheduleNextPoll()
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : getBackendUnavailableMessage()
      if (this.started) {
        this.emit({
          type: 'runtime_status',
          status: 'degraded',
          message,
        })
        this.scheduleNextPoll()
      }
    }
  }

  private async syncRemotePresentation(payload: RemotePresentationResponse): Promise<void> {
    const presentationId = String(payload.id ?? '').trim()
    if (!presentationId || !this.sessionPin) {
      return
    }

    const fileName = String(payload.title || 'presentation.pdf')
    this.emit({
      type: 'presentation_status',
      status: 'loading',
      message: `Downloading ${fileName} from the backend...`,
      fileName,
      source: 'remote',
    })

    try {
      await this.notifyDesktopEvent(presentationId, 'downloading')
      const rawDownloadUrl =
        payload.download_url || resolveApiUrl(`presentations/${presentationId}/download/`)
      const downloadUrl = new URL(rawDownloadUrl, `${apiBaseUrl}/`)
      downloadUrl.searchParams.set('pin', this.sessionPin)

      const response = await fetch(downloadUrl)
      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }

      const blob = await response.blob()
      const pdfBlob = blob.type ? blob : new Blob([blob], { type: 'application/pdf' })
      this.publishDocumentPresentation({
        documentUrl: URL.createObjectURL(pdfBlob),
        fileName,
        source: 'remote',
        message: `${fileName} is ready on the browser desktop.`,
      })
      await this.notifyDesktopEvent(presentationId, 'presenting')
      this.emit({
        type: 'runtime_status',
        status: 'ready',
        message: 'Remote presentation synced to the browser desktop.',
      })
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : getBackendUnavailableMessage()
      await this.notifyDesktopEvent(presentationId, 'error', message)
      this.emitPresentationError(`Remote sync failed: ${message}`, fileName, 'remote')
    }
  }

  private publishDocumentPresentation({
    documentUrl,
    fileName,
    source,
    message,
  }: {
    documentUrl: string
    fileName: string
    source: PresentationSource
    message: string
  }) {
    this.revokeDocumentUrl()
    this.currentDocumentUrl = documentUrl
    this.emit({
      type: 'presentation_status',
      status: 'ready',
      message,
      documentUrl,
      fileName,
      source,
    })
  }

  private async notifyDesktopEvent(
    presentationId: string,
    eventName: 'downloading' | 'presenting' | 'error',
    message = '',
  ) {
    if (!this.sessionPin) {
      return
    }

    try {
      await fetch(resolveApiUrl(`presentations/${presentationId}/desktop-event/`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pin_code: this.sessionPin,
          event: eventName,
          message,
        }),
      })
    } catch {
      this.emit({
        type: 'runtime_status',
        status: 'degraded',
        message: 'Failed to update desktop event status in the backend.',
      })
    }
  }

  private emitPresentationError(message: string, fileName?: string, source?: PresentationSource) {
    this.emit({
      type: 'presentation_status',
      status: 'error',
      message,
      fileName,
      source,
    })
    this.emit({
      type: 'core_error',
      message,
    })
  }

  private revokeDocumentUrl() {
    if (this.currentDocumentUrl) {
      URL.revokeObjectURL(this.currentDocumentUrl)
      this.currentDocumentUrl = null
    }
  }

  private async startCameraPreview() {
    if (this.cameraStream && this.cameraTimer !== null) {
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('This browser does not support camera access for the desktop preview.')
    }

    this.stopCameraPreview()

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      },
      audio: false,
    })

    const video = document.createElement('video')
    video.autoplay = true
    video.muted = true
    video.playsInline = true
    video.srcObject = stream

    try {
      await video.play()
    } catch {
      stream.getTracks().forEach((track) => track.stop())
      throw new Error(
        'Camera preview did not start. Allow camera access in the browser and reopen presentation mode.',
      )
    }

    const canvas = document.createElement('canvas')
    canvas.width = CAMERA_FRAME_WIDTH
    canvas.height = CAMERA_FRAME_HEIGHT

    this.cameraStream = stream
    this.cameraVideo = video
    this.cameraCanvas = canvas

    this.emitCameraFrame()
    this.cameraTimer = window.setInterval(() => {
      this.emitCameraFrame()
    }, CAMERA_FRAME_INTERVAL_MS)
  }

  private stopCameraPreview() {
    if (this.cameraTimer !== null) {
      window.clearInterval(this.cameraTimer)
      this.cameraTimer = null
    }

    if (this.cameraVideo) {
      this.cameraVideo.pause()
      this.cameraVideo.srcObject = null
      this.cameraVideo = null
    }

    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((track) => track.stop())
      this.cameraStream = null
    }

    this.cameraCanvas = null
  }

  private emitCameraFrame() {
    if (!this.cameraVideo || !this.cameraCanvas) {
      return
    }

    if (this.cameraVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return
    }

    const context = this.cameraCanvas.getContext('2d')
    if (!context) {
      return
    }

    context.save()
    context.scale(-1, 1)
    context.drawImage(
      this.cameraVideo,
      -this.cameraCanvas.width,
      0,
      this.cameraCanvas.width,
      this.cameraCanvas.height,
    )
    context.restore()

    const dataUrl = this.cameraCanvas.toDataURL('image/jpeg', CAMERA_JPEG_QUALITY)
    this.emit({
      type: 'camera_frame',
      data: dataUrl,
    })
  }

  private emit(event: CoreEvent) {
    for (const listener of this.listeners) {
      listener(event)
    }
  }
}
