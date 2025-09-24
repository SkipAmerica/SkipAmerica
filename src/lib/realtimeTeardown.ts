export function runWithTeardownAllowed(cb: () => void) {
  (window as any).__allow_ch_teardown = true;
  try { 
    cb(); 
  } finally { 
    (window as any).__allow_ch_teardown = false; 
  }
}