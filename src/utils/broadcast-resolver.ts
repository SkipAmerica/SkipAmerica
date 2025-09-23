/**
 * Utility for resolving broadcast channel names from route parameters
 */
import { supabase } from '@/integrations/supabase/client';

export const looksLikeUuidV4 = (value: string): boolean => {
  const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Pattern.test(value);
};

export interface ChannelResolution {
  primaryChannel: string;
  secondaryChannel: string | null;
  resolvedCreatorId: string | null;
}

export const resolveBroadcastChannels = async (rawId: string): Promise<ChannelResolution> => {
  console.log(`[CHANNEL_RESOLVER] Resolving channels for rawId: ${rawId}`);
  
  // If it doesn't look like a UUID, treat as-is
  if (!looksLikeUuidV4(rawId)) {
    console.log(`[CHANNEL_RESOLVER] Not a UUID format, using as-is`);
    return {
      primaryChannel: `broadcast:${rawId}`,
      secondaryChannel: null,
      resolvedCreatorId: null
    };
  }

  // Try to resolve via queue tables
  let resolvedCreatorId: string | null = null;
  
  try {
    // Try call_queue table first
    const { data: queueData } = await supabase
      .from('call_queue')
      .select('creator_id')
      .eq('id', rawId)
      .maybeSingle();
    
    if (queueData?.creator_id) {
      resolvedCreatorId = queueData.creator_id;
      console.log(`[CHANNEL_RESOLVER] Found creator_id in call_queue: ${resolvedCreatorId}`);
    }
  } catch (error) {
    console.log(`[CHANNEL_RESOLVER] No call_queue table or lookup failed:`, error);
  }

  // If no resolution found, try other queue-like tables
  if (!resolvedCreatorId) {
    try {
      // Try live_sessions table as fallback
      const { data: sessionData } = await supabase
        .from('live_sessions')
        .select('creator_id')
        .eq('id', rawId)
        .maybeSingle();
      
      if (sessionData?.creator_id) {
        resolvedCreatorId = sessionData.creator_id;
        console.log(`[CHANNEL_RESOLVER] Found creator_id in live_sessions: ${resolvedCreatorId}`);
      }
    } catch (error) {
      console.log(`[CHANNEL_RESOLVER] No live_sessions table or lookup failed:`, error);
    }
  }

  // Determine primary and secondary channels
  if (resolvedCreatorId && resolvedCreatorId !== rawId) {
    // Resolved to different creator ID
    return {
      primaryChannel: `broadcast:${resolvedCreatorId}`,
      secondaryChannel: `broadcast:${rawId}`,
      resolvedCreatorId
    };
  } else {
    // No resolution or same ID
    return {
      primaryChannel: `broadcast:${rawId}`,
      secondaryChannel: null,
      resolvedCreatorId
    };
  }
};