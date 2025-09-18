// Centralized React Query keys for cache management
export const queryKeys = {
  // User & Profile queries
  profile: (userId?: string) => ['profile', userId] as const,
  profiles: (filters?: Record<string, any>) => ['profiles', filters] as const,
  
  // Creator queries
  creator: (creatorId: string) => ['creator', creatorId] as const,
  creators: (filters?: Record<string, any>) => ['creators', filters] as const,
  creatorStats: (creatorId: string) => ['creator-stats', creatorId] as const,
  creatorReliability: (creatorId: string) => ['creator-reliability', creatorId] as const,
  
  // Appointment queries
  appointment: (appointmentId: string) => ['appointment', appointmentId] as const,
  appointments: (filters?: Record<string, any>) => ['appointments', filters] as const,
  appointmentMessages: (appointmentId: string) => ['appointment-messages', appointmentId] as const,
  
  // Message queries
  messages: (conversationId: string) => ['messages', conversationId] as const,
  conversations: (userId?: string) => ['conversations', userId] as const,
  
  // Agency queries
  agency: (agencyId: string) => ['agency', agencyId] as const,
  agencies: (filters?: Record<string, any>) => ['agencies', filters] as const,
  agencyCreators: (agencyId: string) => ['agency-creators', agencyId] as const,
  
  // Organization queries
  organization: (orgId: string) => ['organization', orgId] as const,
  organizations: (filters?: Record<string, any>) => ['organizations', filters] as const,
  organizationMembers: (orgId: string) => ['organization-members', orgId] as const,
  
  // Content queries
  creatorContent: (creatorId: string) => ['creator-content', creatorId] as const,
  playlists: (creatorId: string) => ['playlists', creatorId] as const,
  playlistContent: (playlistId: string) => ['playlist-content', playlistId] as const,
  
  // Analytics queries
  callMetrics: (creatorId: string, period?: string) => ['call-metrics', creatorId, period] as const,
  pricingAnalytics: (creatorId: string) => ['pricing-analytics', creatorId] as const,
  
  // Real-time queries
  onlineCreators: () => ['online-creators'] as const,
  availableSlots: (creatorId: string, date?: string) => ['available-slots', creatorId, date] as const,
} as const

// Mutation keys for optimistic updates
export const mutationKeys = {
  // Profile mutations
  updateProfile: 'update-profile',
  
  // Creator mutations
  updateCreator: 'update-creator',
  updateAvailability: 'update-availability',
  updatePricing: 'update-pricing',
  
  // Appointment mutations
  createAppointment: 'create-appointment',
  updateAppointment: 'update-appointment',
  cancelAppointment: 'cancel-appointment',
  
  // Message mutations
  sendMessage: 'send-message',
  markMessageRead: 'mark-message-read',
  
  // Call mutations
  startCall: 'start-call',
  endCall: 'end-call',
  
  // File mutations
  uploadFile: 'upload-file',
  shareFile: 'share-file',
} as const