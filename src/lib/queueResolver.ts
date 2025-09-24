import { supabase } from '@/lib/supabase';

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

export function canonicalSignalChannel(creatorUserId: string) {
  return `broadcast:creator:${creatorUserId}`;
}

export function deprecatedQueueChannel(queueId: string) {
  return `broadcast:${queueId}`; // TEMP fallback; remove later
}