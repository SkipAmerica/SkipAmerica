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

  // Keep fanUserId in sync with auth (handles delayed anonymous login)
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id;
      if (uid) {
        setFanUserId(uid);
      }
    });
    return () => {
      try { authListener?.subscription?.unsubscribe(); } catch {}
    };
  }, []);

  // SFU connection effect
  useEffect(() => {
    if (!USE_SFU || !queueId) return;
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
        const resolvedId = await resolveCreatorUserId(queueId);
        const creatorId = resolvedId || queueId;
        setResolvedCreatorId(creatorId); // Store for chat overlay
        const { data } = await supabase.auth.getUser();
        const identity = data?.user?.id || crypto.randomUUID();
        if (data?.user?.id) {
          setFanUserId(data.user.id); // Store fan user ID
        }
        
        // Fetch LiveKit token using Supabase Functions SDK
        const { token, url } = await fetchLiveKitToken({
          role: "viewer",
          creatorId,
          identity,
        });
        
        await sfu.connect(url, token);
        console.log("[VIEWER SFU] connected");
        setConnectionState("connected");
      } catch (e) {
        console.error("[VIEWER SFU] failed", e);
        setConnectionState("failed");
      }
    })();

    return () => { sfu?.disconnect().catch(()=>{}); sfu = undefined; };
  }, [queueId]);

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
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col relative overflow-hidden">
      <div className="flex-1 flex">
        <div className="relative w-full h-full overflow-hidden">
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            className="w-full h-full object-cover bg-black"
          />
          
          {connectionState !== 'connected' && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
              <div className="text-center text-white">
                {connectionState === 'checking' && (
                  <div className="animate-pulse">
                    <div className="text-lg mb-2">Connecting to stream...</div>
                  </div>
                )}
                {connectionState === 'failed' && (
                  <div>
                    <div className="text-lg mb-4">Connection failed</div>
                    <Button onClick={handleRetry} variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Fan's Self-View Camera (PiP) and Chat - Only shown after joining queue */}
          {isInQueue && fanUserId && (
            <>
              {/* Instagram-style floating chat overlay */}
              {resolvedCreatorId && (
                <TabbedOverlayChat 
                  creatorId={resolvedCreatorId} 
                  fanId={fanUserId}
                />
              )}
              
              {/* Fan's Self-View Camera (PiP) - Published as "publisher" role */}
              <div className="absolute bottom-20 left-4 w-32 h-24 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg z-10">
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
          
          <div className="absolute bottom-4 left-4">
            <Button
              onClick={toggleMute}
              variant="outline"
              size="sm"
              className="bg-black/50 border-white/20 text-white hover:bg-black/70"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}