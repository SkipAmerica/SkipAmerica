import { createMediaManager } from './MediaManager';
import { MediaError } from './media-errors';
import { MEDIA_FLAGS } from './media-flags';
import type { LiveState, MediaTargetState, MediaInitOptions, MediaMetrics } from './media-types';

const metrics: MediaMetrics = {
  onEvent: (name, attrs) => console.info('[MEDIA][EVENT]', name, attrs || {}),
  onError: (code, err, attrs) => console.warn('[MEDIA][ERROR]', code, attrs || {}, err),
};

export const mediaManager = createMediaManager(metrics);

// Gate allows only PREP/JOIN target states regardless of transient current state
const canInitForTarget = (target: MediaTargetState) =>
  target === 'SESSION_PREP' || target === 'SESSION_JOINING';

// Subscribe once to drive init off committed state transitions (no races)
let subscribed = false;
let storeSubscribe: ((callback: () => void) => () => void) | null = null;
let getStoreState: (() => any) | null = null;

export function setupMediaSubscriptions(subscribe: (callback: () => void) => () => void, getState: () => any) {
  storeSubscribe = subscribe;
  getStoreState = getState;
}

export function ensureMediaSubscriptions() {
  if (subscribed || !storeSubscribe || !getStoreState) return;
  subscribed = true;

  let prev: LiveState = getStoreState()?.state || 'OFFLINE';

  storeSubscribe(() => {
    const next: LiveState = getStoreState()?.state || 'OFFLINE';
    if (next === 'TEARDOWN') {
      mediaManager.stop('fsm_teardown');
    }
    prev = next;
  });
}

// Public API to start preview/join, driven by target
export async function orchestrateInit(opts: Partial<MediaInitOptions> & { targetState: MediaTargetState }) {
  if (!canInitForTarget(opts.targetState)) {
    throw new MediaError('STATE_BLOCK', 'Invalid target for media init', { target: opts.targetState });
  }

  if (MEDIA_FLAGS.ENABLE_WATCHDOG) {
    const watchdog = setTimeout(() => {
      mediaManager.stop('watchdog_timeout');
      routeMediaError(new MediaError('HARDWARE_ERROR', 'Timeout starting media'));
    }, MEDIA_FLAGS.WATCHDOG_MS);
    
    try {
      const stream = await mediaManager.start({
        video: opts.video ?? { facingMode: 'user' },
        audio: opts.audio ?? true,
        videoEl: opts.videoEl,
        audioEl: opts.audioEl,
        previewOnly: opts.previewOnly ?? false,
        targetState: opts.targetState,
        retry: opts.retry,
      });
      clearTimeout(watchdog);
      return stream;
    } catch (e) {
      clearTimeout(watchdog);
      throw e;
    }
  }

  // Defer to a user gesture in your UI handlers; this function must be called from onClick
  return mediaManager.start({
    video: opts.video ?? { facingMode: 'user' },
    audio: opts.audio ?? true,
    videoEl: opts.videoEl,
    audioEl: opts.audioEl,
    previewOnly: opts.previewOnly ?? false,
    targetState: opts.targetState,
    retry: opts.retry,
  });
}

export async function orchestrateStop(reason: string = 'manual') {
  await mediaManager.stop(reason);
}

export function routeMediaError(err: unknown) {
  // Map to UI toasts/messages; do not confuse state blocks with permission issues
  const error = err as MediaError | Error | { code?: string };
  const code = (error && typeof error === 'object' && 'code' in error) ? error.code : 'UNKNOWN';
  
  metrics.onError?.(code as any, err, { handler: 'routeMediaError' });
  
  switch (code) {
    case 'STATE_BLOCK':
      logToast('info', 'Preparing session… initializing media when ready.');
      break;
    case 'PERMISSION_DENIED':
      logToast('warning', 'Camera/Mic blocked. Enable permissions in Safari and try again.');
      break;
    case 'DEVICE_NOT_FOUND':
      logToast('error', 'No camera/microphone detected.');
      break;
    case 'HARDWARE_ERROR':
      logToast('error', 'Camera/mic busy. Close other apps and retry.');
      break;
    default:
      logToast('error', 'Could not start camera/mic. Please try again.');
  }
}

/**
 * Structured logging for user-facing messages
 * Replace this with your app's toast/notification system
 */
function logToast(type: 'info' | 'warning' | 'error', msg: string) {
  const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`[MEDIA][USER] ${prefix} ${msg}`);
  metrics.onEvent?.('user_message', { type, msg });
}