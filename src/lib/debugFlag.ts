// Simple debug flag utilities
export const isDebug = (): boolean => {
  return window.location.search.includes('debug=1') || 
         String(import.meta.env.VITE_DEBUG_MODE) === 'true';
};

export const isDebugVerbose = (): boolean => {
  return window.location.search.includes('debug=2');
};