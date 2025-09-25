export function supabaseAuthHeaders() {
  // Try to read anon key from env first, then from the Supabase client if exposed.
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  // @ts-ignore
  const clientKey = window?.__supabaseAnonKey || undefined;
  const anon = envKey || clientKey;
  if (!anon) return {};
  return {
    apikey: anon,
    Authorization: `Bearer ${anon}`,
  };
}