// Environment variable helpers

export const isQueueFallbackEnabled = (): boolean => {
  return String(import.meta.env.VITE_ENABLE_QUEUE_FALLBACK) === 'true';
};

export const getEnvironmentFlag = (key: string, defaultValue: boolean = false): boolean => {
  const value = import.meta.env[key];
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return defaultValue;
};