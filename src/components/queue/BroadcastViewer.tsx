import { useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { resolveCreatorUserId } from '@/lib/queueResolver';
import { RUNTIME } from '@/config/runtime';

const USE_SFU = true;
import { createSFU } from "@/lib/sfu";
import { fetchLiveKitToken, getIdentity } from "@/lib/sfuToken";

interface BroadcastViewerProps {
  creatorId: string;
  sessionId: string;
}

type ConnectionState = 'checking' | 'connecting' | 'connected' | 'failed' | 'offline' | 'retry';

export function BroadcastViewer({ creatorId, sessionId }: BroadcastViewerProps) {
  const queueId = creatorId; // The creatorId parameter is actually the queueId from URL
  
  if (!queueId) {
    return <div className="p-4 text-red-500">No queue ID provided</div>;
  }

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking');

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
        const { data } = await supabase.auth.getUser();
        const identity = getIdentity(data?.user?.id);
        
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
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-4xl aspect-video rounded-lg overflow-hidden shadow-2xl">
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