// Configuration for notification system
export const NOTIFICATION_CONFIG = {
  // Dismissal durations in milliseconds
  DISMISSAL_DURATION_DEV: 60000, // 1 minute for development
  DISMISSAL_DURATION_PROD: 259200000, // 72 hours (matching nudgeIntervalHours)
  
  // Use dev duration for now, switch to prod in production
  get DISMISSAL_DURATION() {
    return this.DISMISSAL_DURATION_DEV;
  }
} as const;
