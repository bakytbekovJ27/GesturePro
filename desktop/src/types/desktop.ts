export type DesktopScreen = 'menu' | 'settings' | 'load' | 'presentation'

export type LanguageCode = 'ru' | 'en'

export type GestureState = 'NONE' | 'FIST' | 'POINT' | 'THUMB' | 'PALM' | 'PEACE' | 'PINCH'

export type LoadState = 'idle' | 'loading' | 'ready' | 'error'

export type PresentationSource = 'demo' | 'file' | 'remote'

export type GestureMode = 'idle' | 'draw' | 'erase' | 'swipe' | 'clear'

export type RuntimeState = 'starting' | 'ready' | 'degraded' | 'stopped' | 'error'

export type SessionState = 'creating' | 'ready' | 'failed' | 'stopped'

export type PresentationCommand = 'next_slide' | 'prev_slide'

export type PresentationSlide = {
  id: string
  title: string
  imageUrl: string
}

export type SessionStatusEvent = {
  type: 'session_status'
  status: SessionState
  pinCode: string | null
  displayName: string
  message: string
}

export type GestureStateEvent = {
  type: 'gesture_state'
  gesture: GestureState
  mode: GestureMode
  systemActive: boolean
  message: string
}

export type PresentationStatusEvent = {
  type: 'presentation_status'
  status: LoadState | 'idle' | 'presenting'
  message: string
  slides?: PresentationSlide[]
  documentUrl?: string
  fileName?: string
  source?: PresentationSource
}

export type CoreErrorEvent = {
  type: 'core_error'
  code?: string
  message: string
}

export type RuntimeStatusEvent = {
  type: 'runtime_status'
  status: RuntimeState
  message: string
}

export type PresentationCommandEvent = {
  type: 'presentation_command'
  action: PresentationCommand
}

export type CameraFrameEvent = {
  type: 'camera_frame'
  data: string
}

export type CursorMoveEvent = {
  type: 'cursor_move'
  /** Normalized hand X position [0..1] from MediaPipe (already mirrored by sidecar) */
  x: number
  /** Normalized hand Y position [0..1] from MediaPipe */
  y: number
}

export type DrawCommandEvent = {
  type: 'draw_command'
  action: 'undo' | 'clear'
}

export type CoreEvent =
  | SessionStatusEvent
  | GestureStateEvent
  | PresentationStatusEvent
  | CoreErrorEvent
  | RuntimeStatusEvent
  | PresentationCommandEvent
  | CameraFrameEvent
  | CursorMoveEvent
  | DrawCommandEvent
