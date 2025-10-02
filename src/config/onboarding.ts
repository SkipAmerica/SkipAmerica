export const ONBOARDING_CONFIG = {
  enabled: true,
  requiresCompletion: true,
  nudgeIntervalHours: 72,
  skipAllowed: true,
} as const;

export const PROGRESS_WEIGHTS = {
  photo: 30,
  displayName: 20,
  tagline: 20,
  firstIndustry: 30,
} as const;
