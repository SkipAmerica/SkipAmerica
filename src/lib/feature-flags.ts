/**
 * Feature flags for controlled rollout
 * Can be overridden via environment variables
 */
export const featureFlags = {
  ENABLE_STABLE_QUEUE: import.meta.env.VITE_ENABLE_STABLE_QUEUE !== 'false', // Enabled by default
  ENABLE_QUEUE_DIAGNOSTICS: import.meta.env.DEV, // Only in dev
  ENABLE_BIDIRECTIONAL_RATINGS: import.meta.env.VITE_ENABLE_BIDIRECTIONAL_RATINGS === 'true',
} as const;
