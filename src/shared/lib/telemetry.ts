interface TrackEventOptions {
  event: string
  properties?: Record<string, any>
  timestamp?: number
}

/**
 * Unified telemetry helper that works across consent flow + Almighty session
 * Ensures consistent event naming and automatic context injection
 */
export function trackEvent({ event, properties = {}, timestamp }: TrackEventOptions): void {
  const enriched = {
    ...properties,
    timestamp: timestamp || Date.now(),
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
  }

  // Log to console in dev
  if (import.meta.env.DEV) {
    console.log('[Analytics]', event, enriched)
  }

  // Send to analytics service (Amplitude, Mixpanel, etc.)
  // TODO: Integrate with your analytics provider
  
  // Store in localStorage for debugging
  try {
    const events = JSON.parse(localStorage.getItem('__analytics_events') || '[]')
    events.push({ event, ...enriched })
    // Keep last 100 events
    localStorage.setItem('__analytics_events', JSON.stringify(events.slice(-100)))
  } catch {}
}

// Convenience wrappers for common events
export const analytics = {
  queueReachedFront: (props: { creatorId: string; fanId: string }) =>
    trackEvent({ event: 'queue_reached_front', properties: props }),
  
  consentShown: (props: { creatorId: string; fanId: string }) =>
    trackEvent({ event: 'queue_consent_shown', properties: props }),
  
  consentAccepted: (props: { creatorId: string; fanId: string; queueEntryId: string }) =>
    trackEvent({ event: 'queue_consent_accepted', properties: props }),
  
  consentDeclined: (props: { creatorId: string; fanId: string; reason: string }) =>
    trackEvent({ event: 'queue_consent_declined', properties: props }),
  
  cameraPermissionGranted: (props: { creatorId: string; fanId: string }) =>
    trackEvent({ event: 'camera_permission_granted', properties: props }),
  
  cameraPermissionDenied: (props: { creatorId: string; fanId: string; errorType: string }) =>
    trackEvent({ event: 'camera_permission_denied', properties: props }),
  
  sessionStartAttempted: (props: { creatorId: string; fanId: string; fanReady: boolean }) =>
    trackEvent({ event: 'queue_start_attempted', properties: props }),
  
  sessionStartBlocked: (props: { creatorId: string; fanId: string; reason: string }) =>
    trackEvent({ event: 'queue_start_blocked_fan_not_ready', properties: props }),
  
  sessionCreated: (props: { sessionId: string; creatorId: string; fanId: string }) =>
    trackEvent({ event: 'queue_session_created', properties: props }),
}
