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

export interface ChatRichText {
  enabled?: boolean;
  allowBold?: boolean;
  allowItalic?: boolean;
  allowFontSize?: boolean;
  allowFontColor?: boolean;
  fontSizes?: string[];
  fontColors?: string[];
  toolbar?: 'compact' | 'full' | 'minimal';
}

export interface ChatPositioning {
  mode?: 'relative' | 'fixed';
  containerRelative?: boolean;
  allowPositionToggle?: boolean;
}

export interface ChatAppearance {
  height?: string;
  width?: string;
  maxWidth?: string;
  showProfiles?: boolean;
  showProfileToggle?: boolean;
  showUsernames?: boolean;
  usernameStyle?: 'normal' | 'bold';
  compact?: boolean;
  reverseOrder?: boolean;
  className?: string;
  inputClassName?: string;
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

export interface ChatExternalInput {
  useExternalInput?: boolean;
  externalInputId?: string;
  onExternalMessage?: (message: string) => void;
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
  
  // Rich text configuration
  richText?: ChatRichText;
  
  // Positioning configuration
  positioning?: ChatPositioning;
  
  // External input configuration
  externalInput?: ChatExternalInput;
  
  // Message sending function
  sendMessage?: (params: {
    filterValue: string;
    userId: string;
    username: string;
    text: string;
  }) => Promise<void>;
}