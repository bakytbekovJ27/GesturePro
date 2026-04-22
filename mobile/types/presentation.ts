export type PresentationStatus =
  | 'uploading'
  | 'converting'
  | 'ready'
  | 'downloading'
  | 'presenting'
  | 'error';

export interface PresentationSummary {
  id: string;
  title: string;
  status: PresentationStatus;
  status_message: string;
  error_message: string;
  file_size: number;
  extension: string;
  uploaded_at: string;
  updated_at: string;
  last_sent_at: string;
  ready_at: string | null;
  download_url: string | null;
}

export interface UserPresentation {
  id: string;
  title: string;
  status: PresentationStatus;
  status_message?: string;
  error_message?: string;
  created_at: string;
  updated_at?: string;
  size: number;
  type: 'pdf' | 'pptx';
  extension?: string;
  download_url?: string | null;
  is_favorite: boolean;
  slide_count?: number;
}

export type UploadResponse = PresentationSummary;
