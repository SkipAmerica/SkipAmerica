// Feature flags and media configuration for Almighty Session

export const MEDIA = {
  // Quality ladder (try in order until success)
  VIDEO_CONSTRAINTS_LADDER: [
    { width: 960, height: 540, frameRate: 30 },  // Primary
    { width: 640, height: 360, frameRate: 24 },  // Fallback 1
    { width: 426, height: 240, frameRate: 24 },  // Fallback 2
  ],
  
  AUDIO_CONSTRAINTS: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  
  START_AUDIO: true,
  START_VIDEO: true,
  SIMULCAST: true,
  FLIP_CAMERA_DEBOUNCE_MS: 500,
  
  // CPU guard: downshift if quality drops
  CPU_GUARD_ENABLED: true,
  CPU_GUARD_WINDOW_MS: 10000, // 10s moving window
  CPU_GUARD_QP_THRESHOLD: 40, // High QP = poor quality
  
  // Active speaker auto-focus (off by default)
  ENABLE_ACTIVE_SPEAKER_FOCUS: false,
  ACTIVE_SPEAKER_HYSTERESIS_MS: 3000, // 3s before switching focus
  
  // Performance optimization
  TRACK_REFRESH_DEBOUNCE_MS: 200, // Debounce track refreshes
  ANALYTICS_SAMPLE_RATE: 0.1, // 10% of sessions (reduced from 30%)
}

export const UI = {
  PIP_SIZE: 96,
  CONTROLS_VISIBLE_ON_MOUNT: true,
  HOT_ZONE_HEIGHT_SMALL: 28,
  HOT_ZONE_HEIGHT_NORMAL: 32,
  
  // Future: PIP drag within safe-area bounds
  // TODO: Implement draggable PIP in Phase 1C
}
