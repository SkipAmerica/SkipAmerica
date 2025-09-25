import type { ChatMessage } from '@/shared/types/chat';

export interface ProfileDisplayInfo {
  initials: string;
  fullName: string;
  avatarUrl?: string;
  backgroundColor: string;
  textColor: string;
}

/**
 * Generate consistent profile display information including "goose egg" styling
 * when no profile picture is available
 */
export function getProfileDisplayInfo(profile?: ChatMessage['profiles'] | null): ProfileDisplayInfo {
  const fullName = profile?.full_name || 'Unknown User';
  const avatarUrl = profile?.avatar_url;
  
  // Generate initials from full name
  const initials = generateInitials(fullName);
  
  // Generate consistent colors based on name
  const colors = generateConsistentColors(fullName);
  
  return {
    initials,
    fullName,
    avatarUrl,
    backgroundColor: colors.background,
    textColor: colors.text
  };
}

/**
 * Generate initials from a full name, handling various edge cases
 */
function generateInitials(name: string): string {
  if (!name || name.trim() === '' || name === 'Unknown User') {
    return '🥚'; // Goose egg emoji for unknown users
  }
  
  const words = name.trim().split(/\s+/);
  
  if (words.length === 1) {
    // Single name - take first two characters or just first if only one character
    const cleanName = words[0];
    return cleanName.length > 1 ? cleanName.slice(0, 2).toUpperCase() : cleanName.toUpperCase();
  }
  
  // Multiple words - take first letter of first word and first letter of last word
  const firstInitial = words[0].charAt(0);
  const lastInitial = words[words.length - 1].charAt(0);
  
  return (firstInitial + lastInitial).toUpperCase();
}

/**
 * Generate consistent background and text colors based on name hash
 * This ensures the same name always gets the same color
 */
function generateConsistentColors(name: string): { background: string; text: string } {
  // Simple hash function for consistent color generation
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Use hash to pick from a predefined set of pleasant colors
  const colors = [
    { bg: 'hsl(var(--primary))', text: 'hsl(var(--primary-foreground))' },
    { bg: 'hsl(var(--secondary))', text: 'hsl(var(--secondary-foreground))' },
    { bg: 'hsl(var(--accent))', text: 'hsl(var(--accent-foreground))' },
    { bg: 'hsl(210 40% 60%)', text: 'hsl(210 40% 98%)' }, // Blue
    { bg: 'hsl(142 76% 36%)', text: 'hsl(142 76% 95%)' }, // Green
    { bg: 'hsl(262 83% 58%)', text: 'hsl(262 83% 95%)' }, // Purple
    { bg: 'hsl(346 84% 61%)', text: 'hsl(346 84% 95%)' }, // Pink
    { bg: 'hsl(31 81% 56%)', text: 'hsl(31 81% 95%)' }, // Orange
  ];
  
  const colorIndex = Math.abs(hash) % colors.length;
  const selectedColor = colors[colorIndex];
  
  return {
    background: selectedColor.bg,
    text: selectedColor.text
  };
}

/**
 * Get avatar size classes based on compact mode
 */
export function getAvatarSizeClasses(compact?: boolean): string {
  return compact ? "h-6 w-6" : "h-8 w-8";
}

/**
 * Get text size classes based on compact mode
 */
export function getTextSizeClasses(compact?: boolean): {
  name: string;
  message: string;
  timestamp: string;
} {
  if (compact) {
    return {
      name: 'text-xs',
      message: 'text-xs',
      timestamp: 'text-xs'
    };
  }
  
  return {
    name: 'text-sm',
    message: 'text-sm',
    timestamp: 'text-xs'
  };
}