/* Global guard for Supabase Realtime channel unsubscribe */
declare global {
  interface Window { __allow_ch_teardown?: boolean; }
}
window.__allow_ch_teardown = false;

type AnyFn = (...args: any[]) => any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const patch = ((): void => {
  try {
    // @ts-ignore - access prototype at runtime
    const RealtimeChannelProto = (window as any).supabase
      ? null
      : null;
  } catch {}

  // We can't rely on a global supabase var; patch via prototype on first channel instance:
  const originalChannelFactorySym = Symbol.for('skip.channelFactory');

  // Patch Supabase client "channel" method once, to wrap every channel's unsubscribe.
  // We import the client where we call createClient, and apply patch right after.
})();

export function guardChannelUnsubscribe<T extends { unsubscribe: AnyFn; topic?: string }>(ch: T, label: string) {
  const orig: AnyFn = ch.unsubscribe.bind(ch);
  // @ts-ignore
  if ((ch as any).__origUnsub) return ch; // already patched
  // @ts-ignore
  (ch as any).__origUnsub = orig;
  ch.unsubscribe = (...args: any[]) => {
    if (!window.__allow_ch_teardown) {
      console.warn('[GLOBAL GUARD] BLOCKED ch.unsubscribe on', ch.topic || label, 'stack:\n', new Error().stack);
      return ch; // NO-OP
    }
    console.log('[GLOBAL GUARD] ALLOWED ch.unsubscribe on', ch.topic || label);
    return orig(...args);
  };
  return ch;
}

export function allowTeardownOnce(cb: () => void) {
  window.__allow_ch_teardown = true;
  try { cb(); } finally { window.__allow_ch_teardown = false; }
}