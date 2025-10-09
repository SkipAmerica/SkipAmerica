/**
 * Generate stable, unique identities for Creator vs Viewer roles
 * 
 * Creator: uses sessionId directly (e.g., "dev-123")
 * Viewer: uses localStorage-backed UUID (e.g., "viewer_abc123...")
 * 
 * This prevents LiveKit identity collisions when both roles join the same session.
 */
export function getIdentityForRole(sessionId: string, role: 'creator' | 'user'): string {
  // Creator always uses the sessionId as identity (stable, predictable)
  if (role === 'creator') {
    return sessionId;
  }

  // Viewer: generate stable per-session viewer ID
  const storageKey = `almighty_viewer_id_${sessionId}`;
  
  let viewerId = localStorage.getItem(storageKey);
  if (!viewerId) {
    // Generate new viewer ID (stable across reloads for this session)
    viewerId = `viewer_${crypto.randomUUID()}`;
    localStorage.setItem(storageKey, viewerId);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Identity] Generated new viewer ID:', viewerId, 'for session:', sessionId);
    }
  }
  
  return viewerId;
}

/**
 * Clear stored viewer identity (useful for testing or logout)
 */
export function clearViewerIdentity(sessionId: string): void {
  const storageKey = `almighty_viewer_id_${sessionId}`;
  localStorage.removeItem(storageKey);
}
