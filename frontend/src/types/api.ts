export type PairingResponse = {
  pin_code: string
  access_token: string
  display_name: string
  created_at: string
  expires_at: string
  is_active: boolean
}

export type SessionState = {
  pinCode: string
  accessToken: string
  displayName: string
  connectedAt: string
}

export type PresentationStatus =
  | 'uploading'
  | 'converting'
  | 'ready'
  | 'downloading'
  | 'presenting'
  | 'error'

export type PresentationSummary = {
  id: string
  title: string
  status: PresentationStatus
  status_message: string
  error_message: string
  file_size: number
  extension: string
  uploaded_at: string
  updated_at: string
  last_sent_at: string
  ready_at: string | null
  download_url: string | null
}

export type UploadFlowState = {
  presentationId: string | null
  fileName: string
  title: string
  phase: 'idle' | 'uploading' | 'converting' | 'syncing' | 'ready' | 'error'
  uploadPercent: number
  detail: string
  error: string | null
  hintIndex: number
}
