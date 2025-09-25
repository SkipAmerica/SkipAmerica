import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Use hardcoded values instead of env vars for Lovable compatibility
const SUPABASE_URL = "https://ytqkunjxhtjsbpdrwsjf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cWt1bmp4aHRqc2JwZHJ3c2pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5ODMwMzcsImV4cCI6MjA3MzU1OTAzN30.4cxQkkwnniFt5H4ToiNcpi6CxpXCpu4iiSTRUjDoBbw";

// HMR-safe Supabase singleton to prevent multiple GoTrueClient instances
declare global {
  // eslint-disable-next-line no-var
  var __SUPABASE_SINGLETON__: ReturnType<typeof createClient<Database>> | undefined;
}

function createSupabaseSingleton() {
  if (globalThis.__SUPABASE_SINGLETON__) {
    return globalThis.__SUPABASE_SINGLETON__;
  }

  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { 
      persistSession: true, 
      storageKey: 'skipamerica-auth',
      storage: localStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: { 
      params: { eventsPerSecond: 20 } 
    },
  });

  globalThis.__SUPABASE_SINGLETON__ = client;
  return client;
}

export const supabase = createSupabaseSingleton();
export type { Database } from '@/integrations/supabase/types';