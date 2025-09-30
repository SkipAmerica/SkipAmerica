import { useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { resolveCreatorUserId } from '@/lib/queueResolver';
import { RUNTIME } from '@/config/runtime';
import TabbedOverlayChat from '@/components/live/TabbedOverlayChat';
import { UserVideoSFU } from '@/components/shared/UserVideoSFU';

const USE_SFU = true;
import { createSFU } from "@/lib/sfu";
import { fetchLiveKitToken } from "@/lib/livekitToken";

interface BroadcastViewerProps {
  creatorId: string;
  sessionId: string;
  isInQueue: boolean;
}

type ConnectionState = 'checking' | 'connecting' | 'connected' | 'failed' | 'offline' | 'retry';

export function BroadcastViewer({ creatorId, sessionId, isInQueue }: BroadcastViewerProps) {
  const queueId = creatorId; // The creatorId parameter is actually the queueId from URL
  
  if (!queueId) {
    return <div className="p-4 text-red-500">No queue ID provided</div>;
  }

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking');
  const [resolvedCreatorId, setResolvedCreatorId] = useState<string | null>(null);
  const [fanUserId, setFanUserId] = useState<string | null>(null);

  // Resolve creator ID immediately for chat (don't wait for SFU)
  useEffect(() => {
    console.log('[BroadcastViewer] Resolving creator ID for chat');
    resolveCreatorUserId(queueId).then(id => {
      const creatorId = id || queueId;
      console.log('[BroadcastViewer] Resolved creator ID:', creatorId);
      setResolvedCreatorId(creatorId);
    }).catch(err => {
      console.error('[BroadcastViewer] Failed to resolve creator ID:', err);
      // Fallback to queueId even on error
      setResolvedCreatorId(queueId);
    });
  }, [queueId]);

  // Keep fanUserId in sync with auth (handles delayed anonymous login)
  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) {
        console.log('[BroadcastViewer] Initial fan user ID:', data.user.id);
        setFanUserId(data.user.id);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id;
      if (uid) {
        console.log('[BroadcastViewer] Fan user ID updated:', uid);
        setFanUserId(uid);
      }
    });
    return () => {
      try { authListener?.subscription?.unsubscribe(); } catch {}
    };
  }, []);

  // SFU connection effect
  useEffect(() => {
    if (!USE_SFU || !queueId || !resolvedCreatorId) return;
    console.log('[BroadcastViewer] Starting SFU connection');
    let sfu = createSFU();

    sfu.onRemoteVideo((incoming) => {
      const el = videoRef.current;
      if (!el) return;
      if (el !== incoming && el.parentElement) {
        incoming.className = el.className;
        incoming.muted = false;
        el.parentElement.replaceChild(incoming, el);
        // @ts-ignore
        videoRef.current = incoming;
        try { incoming.play().catch(()=>{}); } catch {}
      }
    });

    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const identity = data?.user?.id || crypto.randomUUID();
        
        console.log('[BroadcastViewer] Fetching LiveKit token with identity:', identity);
        // Fetch LiveKit token using Supabase Functions SDK
        const { token, url } = await fetchLiveKitToken({
          role: "viewer",
          creatorId: resolvedCreatorId,
          identity,
        });
        
        console.log('[BroadcastViewer] Connecting to SFU');
        await sfu.connect(url, token);
        console.log("[BroadcastViewer] SFU connected");
        setConnectionState("connected");
      } catch (e) {
        console.error("[BroadcastViewer] SFU failed:", e);
        setConnectionState("failed");
      }
    })();

    return () => { sfu?.disconnect().catch(()=>{}); sfu = undefined; };
  }, [queueId, resolvedCreatorId]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  }, []);

  const handleRetry = useCallback(() => {
    setConnectionState('connecting');
    window.location.reload();
  }, []);

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className="w-full h-full object-cover bg-black"
      />
      
      {connectionState !== 'connected' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="text-center text-white">
            {connectionState === 'checking' && (
              <div className="animate-pulse">
                <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4 mx-auto"></div>
                <div className="text-sm">Connecting to stream...</div>
              </div>
            )}
            {connectionState === 'failed' && (
              <div>
                <div className="text-6xl mb-4">📡</div>
                <div className="text-lg mb-4">Connection failed</div>
                <Button onClick={handleRetry} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Overlay chat - always show lobby, private messages only when in queue */}
      {resolvedCreatorId && (
        <TabbedOverlayChat 
          creatorId={resolvedCreatorId}
          fanId={fanUserId || ''}
          isInQueue={isInQueue && !!fanUserId}
        />
      )}
      
      {/* Fan's Self-View Camera (PiP) - Only shown after joining queue */}
      {isInQueue && fanUserId && (
        <>
          <div className="absolute top-20 right-4 w-28 h-28 rounded-xl overflow-hidden border-2 border-white/30 shadow-2xl backdrop-blur-sm z-30">
            <UserVideoSFU
              userId={fanUserId}
              role="publisher"
              dimensions="w-full h-full"
              showChat={false}
              muted={true}
              showControls={false}
              fallbackName="You"
              className="bg-muted"
            />
            <div className="absolute bottom-1 left-1 text-[10px] text-white bg-black/50 px-1.5 py-0.5 rounded">
              You
            </div>
          </div>
        </>
      )}
      
      {/* Mute button - positioned in bottom left corner */}
      <div className="absolute bottom-4 left-4 z-30">
        <Button
          onClick={toggleMute}
          variant="outline"
          size="sm"
          className="w-12 h-12 rounded-full bg-black/50 border-white/20 text-white hover:bg-black/70 backdrop-blur-sm shadow-lg"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}