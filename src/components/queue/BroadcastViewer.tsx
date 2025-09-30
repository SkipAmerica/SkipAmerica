import { useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, RefreshCw, Video, VideoOff } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { resolveCreatorUserId } from '@/lib/queueResolver';
import { RUNTIME } from '@/config/runtime';

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
  const selfVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking');
  const [resolvedCreatorId, setResolvedCreatorId] = useState<string | null>(null);
  const [fanUserId, setFanUserId] = useState<string | null>(null);
  const [showSelfVideo, setShowSelfVideo] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Set resolvedCreatorId immediately so chat mounts without delay
  useEffect(() => {
    setResolvedCreatorId(queueId);
  }, [queueId]);

  // Resolve creator ID in background for SFU (chat doesn't wait for this)
  useEffect(() => {
    console.log('[BroadcastViewer] Resolving creator ID for SFU');
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

    return () => { 
      console.log('[BroadcastViewer] Cleaning up SFU connection');
      if (sfu) {
        sfu.disconnect().catch((err) => {
          console.error('[BroadcastViewer] Error disconnecting SFU:', err);
        });
        sfu = undefined;
      }
    };
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

  const toggleSelfVideo = useCallback(async () => {
    if (showSelfVideo) {
      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      setShowSelfVideo(false);
    } else {
      // Start local stream
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: 'user'
          },
          audio: false 
        });
        setLocalStream(stream);
        if (selfVideoRef.current) {
          selfVideoRef.current.srcObject = stream;
        }
        setShowSelfVideo(true);
      } catch (error) {
        console.error('[BroadcastViewer] Failed to access camera:', error);
      }
    }
  }, [showSelfVideo, localStream]);

  // Update self video ref when stream changes
  useEffect(() => {
    if (selfVideoRef.current && localStream) {
      selfVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Cleanup local stream on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream]);

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
      
      {/* Self video PIP */}
      {showSelfVideo && (
        <div className="absolute bottom-20 right-4 z-30 w-32 h-24 sm:w-40 sm:h-30 rounded-lg overflow-hidden border-2 border-white shadow-lg">
          <video
            ref={selfVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
          />
        </div>
      )}

      {/* Control buttons */}
      <div className="absolute bottom-4 right-4 z-30 flex gap-2">
        <Button
          onClick={toggleSelfVideo}
          variant="outline"
          size="sm"
          className="w-10 h-10 rounded-full"
        >
          {showSelfVideo ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </Button>
        <Button
          onClick={toggleMute}
          variant="outline"
          size="sm"
          className="w-10 h-10 rounded-full"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}