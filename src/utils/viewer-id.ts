/**
 * Utility for generating unique viewer IDs for WebRTC broadcast sessions
 */

export const generateViewerId = (): string => {
  // Use crypto.randomUUID if available (modern browsers), fallback to timestamp + random
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers
  return 'viewer-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};

export const validateViewerId = (viewerId: string): boolean => {
  return typeof viewerId === 'string' && viewerId.length > 0;
};