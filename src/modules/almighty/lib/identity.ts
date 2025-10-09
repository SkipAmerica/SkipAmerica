export function getIdentityForRole(sessionId: string, role: 'creator' | 'user'): string {
  if (role === 'creator') return sessionId;
  const key = `almighty_viewer_id_${sessionId}`;
  let id = localStorage.getItem(key);
  if (!id) {
    id = `viewer_${crypto.randomUUID()}`;
    localStorage.setItem(key, id);
    console.log('[Identity] Generated new viewer ID', id);
  }
  return id;
}

export function clearViewerIdentity(sessionId: string): void {
  localStorage.removeItem(`almighty_viewer_id_${sessionId}`);
}
