/**
 * Analytics for queue preview feature
 * Category: queue_preview
 */

export type QueuePreviewEvent = 
  | 'preview_room_connected'
  | 'preview_consent_granted'
  | 'preview_publish_started'
  | 'preview_publish_stopped'
  | 'preview_token_denied';

export type QueuePreviewReason = 
  | 'revoke'
  | 'error'
  | 'leave'
  | 'not_first'
  | 'not_ready'
  | 'not_in_queue'
  | 'not_creator';

interface QueuePreviewEventProps {
  creatorId: string;
  fanId?: string;
  queueEntryId?: string;
  reason?: QueuePreviewReason;
}

/**
 * Track queue preview events with consistent category
 */
export const trackQueuePreview = (
  event: QueuePreviewEvent,
  props: QueuePreviewEventProps
) => {
  if (import.meta.env.DEV) {
    console.log('[Analytics][queue_preview]', event, props);
  }

  try {
    (window as any)?.analytics?.track?.(event, {
      ...props,
      category: 'queue_preview'
    });
  } catch (e) {
    console.warn('[Analytics] Failed to track queue_preview event:', e);
  }

  // Performance mark for debugging
  try {
    performance.mark?.(`queue_preview:${event}`);
  } catch {}
};
