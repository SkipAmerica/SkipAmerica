/**
 * Centralized identity & room naming for queue lobby
 * Ensures consistency between fan publishers and creator subscribers
 */

// Consistent room naming for lobby
export const lobbyRoomName = (creatorId: string) => `lobby_${creatorId}`;

// Single persistent preview room per creator
export const previewRoomName = (creatorId: string) => `fanviewer_${creatorId}`;

// Identity schemes - use raw UUID for fans to ensure exact matching
export const fanIdentity = (fanId: string) => fanId;

// Creator uses viewer_ prefix for subscriber identity
export const creatorIdentity = (creatorId: string) => `viewer_${creatorId}`;

// Utility to check if an identity belongs to the creator
export const isCreator = (identity: string, creatorId: string) => 
  identity === creatorIdentity(creatorId) || identity === creatorId;
