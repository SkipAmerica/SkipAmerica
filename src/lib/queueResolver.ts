import { supabase } from '@/integrations/supabase/client';

export async function resolveCreatorUserId(queueId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('queues')
      .select('creator_user_id, status')
      .eq('id', queueId)
      .single();
    if (error || !data || data.status !== 'open') return null;
    return data.creator_user_id as string;
  } catch {
    return null;
  }
}

export async function resolveCreatorFromQueueId(queueId: string) {
  try {
    const { data, error } = await supabase
      .from('queues')
      .select('creator_user_id')
      .eq('id', queueId)
      .single();
    
    if (error || !data) {
      return { creatorUserId: null, via: 'miss' };
    }
    
    return { creatorUserId: data.creator_user_id as string, via: 'db' };
  } catch {
    return { creatorUserId: null, via: 'error' };
  }
}

export const canonicalChannelFor = (creatorUserId: string) =>
  `broadcast:creator:${creatorUserId}`;

export const legacyQueueChannelFor = (queueId: string) =>
  `broadcast:${queueId}`; // TEMP fallback only

export function canonicalSignalChannel(creatorUserId: string) {
  return `broadcast:creator:${creatorUserId}`;
}

export function deprecatedQueueChannel(queueId: string) {
  return `broadcast:${queueId}`; // TEMP fallback; remove later
}