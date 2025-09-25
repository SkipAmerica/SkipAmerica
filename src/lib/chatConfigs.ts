import type { ChatConfig } from '@/shared/types/chat';
import { sendLobbyMessage } from '@/lib/lobbyChat';

// Lobby Chat Configuration (PQ system) - Bottom Left with Profile Toggle
export const createLobbyConfig = (creatorId: string): ChatConfig => ({
  tableName: 'lobby_chat_messages',
  channelPrefix: 'lobby-chat',
  filterField: 'creator_id',
  filterValue: creatorId,
  appearance: {
    height: 'h-96',
    width: 'w-80',
    maxWidth: 'max-w-sm',
    position: 'bottom-left',
    messageFlow: 'newest-top',
    showProfiles: true,
    showProfileToggle: true,
    showScrollbar: true,
    emptyStateText: 'No messages yet. Start the conversation!'
  },
  messaging: {
    enabled: true,
    placeholder: 'Type a message...',
    requireAuth: true,
    showSendButton: true
  },
  richText: {
    enabled: true,
    allowBold: true,
    allowItalic: true,
    allowFontSize: false,
    allowFontColor: false,
    toolbar: 'compact'
  },
  positioning: {
    mode: 'fixed',
    allowPositionToggle: true
  },
  sendMessage: async ({ filterValue, userId, username, text }) => {
    await sendLobbyMessage({
      creatorId: filterValue,
      userId,
      username,
      text
    });
  }
});

// Creator Overlay Configuration (read-only overlay)
export const createOverlayConfig = (creatorId: string): ChatConfig => ({
  tableName: 'lobby_chat_messages',
  channelPrefix: 'lobby-chat-db',
  filterField: 'creator_id',
  filterValue: creatorId,
  appearance: {
    height: 'h-64',
    showProfiles: false,
    compact: true,
    messageFlow: 'newest-top',
    emptyStateText: 'No messages yet…',
    className: 'pointer-events-none absolute inset-0 z-20'
  },
  messaging: {
    enabled: false
  }
});

// Future: General Chat Configuration
export const createGeneralConfig = (roomId: string): ChatConfig => ({
  tableName: 'general_chat_messages', // Future table
  channelPrefix: 'general-chat',
  filterField: 'room_id',
  filterValue: roomId,
  appearance: {
    height: 'h-96',
    showProfiles: true,
    emptyStateText: 'Welcome to the chat room!'
  },
  messaging: {
    enabled: true,
    placeholder: 'Chat with everyone...',
    requireAuth: true,
    showSendButton: true
  }
});

// Bottom-left positioned chat with newest messages at top
export const createBottomLeftConfig = (roomId: string): ChatConfig => ({
  tableName: 'lobby_chat_messages',
  channelPrefix: 'bottom-left-chat',
  filterField: 'creator_id',
  filterValue: roomId,
  appearance: {
    height: 'h-96',
    width: 'w-80',
    maxWidth: 'max-w-sm',
    position: 'bottom-left',
    messageFlow: 'newest-top',
    showProfiles: true,
    showProfileToggle: true,
    showScrollbar: true,
    emptyStateText: 'Chat is empty. Start the conversation!'
  },
  messaging: {
    enabled: true,
    placeholder: 'Type your message...',
    requireAuth: true,
    showSendButton: true
  },
  richText: {
    enabled: true,
    allowBold: true,
    allowItalic: true,
    allowFontSize: true,
    allowFontColor: true,
    toolbar: 'full',
    fontSizes: ['text-xs', 'text-sm', 'text-base', 'text-lg'],
    fontColors: ['text-foreground', 'text-primary', 'text-secondary', 'text-accent']
  },
  positioning: {
    mode: 'fixed',
    allowPositionToggle: true
  },
  sendMessage: async ({ filterValue, userId, username, text }) => {
    await sendLobbyMessage({
      creatorId: filterValue,
      userId,
      username,
      text
    });
  }
});