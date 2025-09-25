export interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface ChatAppearance {
  height?: string;
  width?: string;
  maxWidth?: string;
  showProfiles?: boolean;
  compact?: boolean;
  reverseOrder?: boolean;
  className?: string;
  emptyStateText?: string;
  position?: 'default' | 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'center' | 'custom';
  messageFlow?: 'newest-bottom' | 'newest-top';
  scrollToNewest?: boolean;
  showScrollbar?: boolean;
}

export interface ChatMessaging {
  enabled?: boolean;
  placeholder?: string;
  requireAuth?: boolean;
  showSendButton?: boolean;
}

export interface ChatConfig {
  // Database configuration
  tableName: string;
  channelPrefix: string;
  filterField: string;
  filterValue: string;
  
  // Appearance configuration
  appearance?: ChatAppearance;
  
  // Messaging configuration
  messaging?: ChatMessaging;
  
  // Message sending function
  sendMessage?: (params: {
    filterValue: string;
    userId: string;
    username: string;
    text: string;
  }) => Promise<void>;
}