// Centralized configuration
export const config = {
  // App metadata
  app: {
    name: 'Skip Creator Platform',
    version: '1.0.0',
    description: 'Connect with creators worldwide',
  },
  
  // API configuration
  api: {
    supabaseUrl: 'https://ytqkunjxhtjsbpdrwsjf.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cWt1bmp4aHRqc2JwZHJ3c2pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5ODMwMzcsImV4cCI6MjA3MzU1OTAzN30.4cxQkkwnniFt5H4ToiNcpi6CxpXCpu4iiSTRUjDoBbw',
    timeout: 10000,
    retries: 3,
  },
  
  // Feature flags
  features: {
    enableVideoCall: true,
    enableGroupCalls: true,
    enableFileSharing: true,
    enableAIModeration: true,
    enablePricingEngine: true,
    enableAnalytics: true,
    enablePushNotifications: true,
  },
  
  // UI configuration
  ui: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    supportedFileTypes: ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'],
    defaultPageSize: 20,
    maxPageSize: 100,
    debounceMs: 300,
    toastDuration: 5000,
  },
  
  // Call configuration
  calls: {
    maxDuration: 120, // minutes
    minDuration: 5,   // minutes
    defaultDuration: 30,
    maxParticipants: 8,
    defaultRate: 5.00, // per minute
    currency: 'USD',
  },
  
  // Media configuration
  media: {
    videoConstraints: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      framerate: { ideal: 30, max: 60 }
    },
    audioConstraints: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  },
  
  // Cache configuration
  cache: {
    staleTime: 5 * 60 * 1000,    // 5 minutes
    cacheTime: 10 * 60 * 1000,   // 10 minutes
    refetchInterval: 30 * 1000,   // 30 seconds for real-time data
  },
  
  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const

export type Config = typeof config