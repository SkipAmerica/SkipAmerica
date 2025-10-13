import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LiveKitVideoPlayer } from '@/components/video/LiveKitVideoPlayer';
import { LiveKitPublisher } from '@/components/video/LiveKitPublisher';

interface MediaPreviewProps {
  className?: string;
  muted?: boolean;
  autoPlay?: boolean;
}

/**
 * MediaPreview component using LiveKit for local camera preview
 * Publishes to user's own room and displays the local video
 */
export function MediaPreview({ className, muted = true, autoPlay = true }: MediaPreviewProps) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) {
        setUserId(data.user.id);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id;
      if (uid) {
        setUserId(uid);
      }
    });

    return () => {
      try { authListener?.subscription?.unsubscribe(); } catch {}
    };
  }, []);

  // Stabilize config objects to prevent unnecessary re-renders
  const publisherConfig = useMemo(() => ({
    role: 'publisher' as const,
    creatorId: userId,
    identity: userId,
  }), [userId]);

  const viewerConfig = useMemo(() => ({
    role: 'viewer' as const,
    creatorId: userId,
    identity: `${userId}_preview`,
  }), [userId]);

  if (!userId) {
    return (
      <div className={className} style={{ background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-white text-sm">Loading preview...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Publish to own room */}
      <LiveKitPublisher
        config={publisherConfig}
        publishAudio={false}
        publishVideo={true}
      />

      {/* Display own video */}
      <LiveKitVideoPlayer
        config={viewerConfig}
        className={className}
        muted={muted}
        fallbackContent={
          <div className="flex items-center justify-center text-white">
            <div className="text-sm animate-pulse">Starting camera...</div>
          </div>
        }
      />
    </div>
  );
}
