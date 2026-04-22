import { PresentationSummary } from './presentation';

export type Presentation = PresentationSummary;

export interface SessionData {
  pin_code: string;
  access_token: string;
  display_name: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

export interface SessionStatus {
  active: boolean;
  presentation?: Presentation;
}
