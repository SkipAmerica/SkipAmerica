export type LiveState =
  | 'OFFLINE'
  | 'DISCOVERABLE'
  | 'SESSION_PREP'
  | 'SESSION_JOINING'
  | 'SESSION_ACTIVE'
  | 'TEARDOWN';

export type MediaTargetState = 'SESSION_PREP' | 'SESSION_JOINING';

export type MediaErrorCode =
  | 'STATE_BLOCK'
  | 'PERMISSION_DENIED'
  | 'DEVICE_NOT_FOUND'
  | 'HARDWARE_ERROR'
  | 'BROWSER_POLICY'
  | 'UNKNOWN';

export interface MediaInitOptions {
  videoEl?: HTMLVideoElement | null;
  audioEl?: HTMLAudioElement | null;
  video?: MediaTrackConstraints | boolean;
  audio?: MediaTrackConstraints | boolean;
  targetState: MediaTargetState; // required: we init for the state we're going to
  previewOnly?: boolean;
  retry?: { attempts: number; backoffMs: number };
}

export interface MediaMetrics {
  onEvent?: (name: string, attrs?: Record<string, any>) => void;
  onError?: (code: MediaErrorCode, err: any, attrs?: Record<string, any>) => void;
}

export const MEDIA_DEFAULTS = {
  retry: { attempts: 2, backoffMs: 250 },
} as const;