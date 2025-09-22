import type { MediaErrorCode } from './media-types';

export class MediaError extends Error {
  code: MediaErrorCode;
  context?: Record<string, any>;
  constructor(code: MediaErrorCode, message: string, context?: Record<string, any>) {
    super(message);
    this.code = code;
    this.context = context;
  }
}

export const isPermissionError = (e: any) => {
  const name = e?.name || '';
  return name === 'NotAllowedError' || name === 'SecurityError';
};

export const toMediaError = (e: any, fallback: MediaErrorCode = 'UNKNOWN'): MediaError => {
  if (e instanceof MediaError) return e;
  if (isPermissionError(e)) return new MediaError('PERMISSION_DENIED', e.message || 'Permission denied');
  if (e?.name === 'NotFoundError') return new MediaError('DEVICE_NOT_FOUND', 'No camera/mic found');
  if (e?.name === 'NotReadableError' || e?.name === 'AbortError')
    return new MediaError('HARDWARE_ERROR', 'Device busy or not readable');
  return new MediaError(fallback, e?.message || 'Unknown media error');
};