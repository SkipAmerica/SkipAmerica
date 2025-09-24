import { supabase as originalSupabase } from '@/integrations/supabase/client'
import { guardChannelUnsubscribe } from '@/lib/realtimeGuard'

export type { Database } from '@/integrations/supabase/types'

// Wrap the client's channel factory so ALL channels are guarded
const __origChannel = originalSupabase.channel.bind(originalSupabase);
originalSupabase.channel = (...args: any[]) => {
  const ch = __origChannel(...args);
  guardChannelUnsubscribe(ch as any, String(args?.[0] ?? 'unknown'));
  // Debug: prove it's wrapped
  // @ts-ignore
  const patched = !!(ch as any).__origUnsub;
  console.log('[GLOBAL GUARD] wrapped channel', ch.topic, 'patched=', patched);
  return ch;
};

export const supabase = originalSupabase;
