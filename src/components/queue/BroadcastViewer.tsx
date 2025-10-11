import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, RefreshCw, Video, VideoOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { resolveCreatorUserId } from '@/lib/queueResolver';
import { LiveKitVideoPlayer } from '@/components/video/LiveKitVideoPlayer';
import { LiveKitPublisher } from '@/components/video/LiveKitPublisher';

interface BroadcastViewerProps {
  creatorId: string;
  sessionId: string;
  isInQueue: boolean;
  shouldPublishFanVideo?: boolean;
  consentStream?: MediaStream; // Optional: MediaStream captured during consent
  creatorName?: string; // Creator's display name for UI
}

type ConnectionState = 'checking' | 'connecting' | 'connected' | 'failed' | 'offline' | 'retry';

export function BroadcastViewer({ 
  creatorId, 
  sessionId, 
  isInQueue,
  shouldPublishFanVideo = false,
  consentStream,
  creatorName = 'Creator'
}: BroadcastViewerProps) {
  const queueId = creatorId;
  
  if (!queueId) {
    return <div className="p-4 text-red-500">No queue ID provided</div>;
  }

  const selfVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false); // Start UNMUTED for broadcasts
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking');
  const [resolvedCreatorId, setResolvedCreatorId] = useState<string | null>(null);
  const [fanUserId, setFanUserId] = useState<string | null>(null);
  const [showSelfVideo, setShowSelfVideo] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isTransitioningToPublisher, setIsTransitioningToPublisher] = useState(false);
  const publisherModeRef = useRef(false);

  // Set resolvedCreatorId immediately
  useEffect(() => {
    setResolvedCreatorId(queueId);
  }, [queueId]);

  // Resolve creator ID in background
  useEffect(() => {
    console.log('[BroadcastViewer] Resolving creator ID for video');
    resolveCreatorUserId(queueId).then(id => {
      const creatorId = id || queueId;
      console.log('[BroadcastViewer] Resolved creator ID:', creatorId);
      setResolvedCreatorId(creatorId);
    }).catch(err => {
      console.error('[BroadcastViewer] Failed to resolve creator ID:', err);
      setResolvedCreatorId(queueId);
    });
  }, [queueId]);

  // Keep fanUserId in sync with auth
  useEffect(() => {
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

  // Debounce publisher mode transitions to prevent loops
  useEffect(() => {
    const shouldBePublisher = shouldPublishFanVideo && !!consentStream;
    
    // Only transition once
    if (shouldBePublisher && !publisherModeRef.current) {
      console.log('[BroadcastViewer] 🔄 Transitioning to publisher mode');
      setIsTransitioningToPublisher(true);
      publisherModeRef.current = true;
      
      // Clear transition flag after 3 seconds
      const timer = setTimeout(() => {
        setIsTransitioningToPublisher(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [shouldPublishFanVideo, consentStream]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const handleRetry = useCallback(() => {
    setConnectionState('connecting');
    window.location.reload();
  }, []);

  const toggleSelfVideo = useCallback(async () => {
    if (showSelfVideo) {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      setShowSelfVideo(false);
    } else {
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

  // Use distinct identity for viewer to avoid collision with publisher
  const viewerIdentity = fanUserId ? `viewer_${fanUserId}` : `viewer_${crypto.randomUUID()}`;

  console.log('[BroadcastViewer] Config:', { 
    shouldPublishFanVideo, 
    hasConsentStream: !!consentStream,
    fanUserId, 
    resolvedCreatorId 
  });

  // Fan publishing mode: Show self-preview only, publish to creator
  if (publisherModeRef.current && consentStream) {
    console.log('[BroadcastViewer] 📹 Fan publisher mode - showing self-preview only');
    
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-primary/20 via-background to-primary/10">
        {/* Self-preview (large, main view) */}
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-full h-full max-w-2xl max-h-[600px] rounded-lg overflow-hidden shadow-2xl border-2 border-primary/30">
            <video
              ref={(el) => {
                if (el && consentStream) {
                  el.srcObject = consentStream;
                }
              }}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          </div>
        </div>

        {/* Waiting for Invite Status */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-cyan-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm font-medium">Waiting for {creatorName}'s Invite</span>
          </div>
        </div>

        {/* Info card */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-md">
          <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-xl">
            <div className="text-center space-y-2">
              <div className="text-2xl">👋</div>
              <p className="text-sm font-medium">You're ready!</p>
              <p className="text-xs text-muted-foreground">
                The creator can see your video preview. Wait for them to start your call.
              </p>
            </div>
          </div>
        </div>

        {/* Headless publisher - establishes single LiveKit connection */}
        {fanUserId && resolvedCreatorId && (() => {
          const publisherConfig = useMemo(() => {
            console.log('[BroadcastViewer] 📹 Publishing with identity:', {
              fanUserId,
              resolvedCreatorId,
              roomName: `lobby_${resolvedCreatorId}`
            });
            return {
              role: 'publisher' as const,
              creatorId: resolvedCreatorId,
              identity: fanUserId,
            };
          }, [resolvedCreatorId, fanUserId]);

          return (
            <LiveKitPublisher
              config={publisherConfig}
              publishAudio={true}
              publishVideo={true}
              mediaStream={consentStream}
            onPublished={() => {
              console.log('[BroadcastViewer] ✅ Fan video published successfully');
            }}
            onError={(error) => {
              console.error('[BroadcastViewer] ❌ Fan publish failed:', error);
            }}
          />);
        })()}
      </div>
    );
  }

  // Default viewer mode: Watch creator's broadcast (used before fan is "Next Up")
  console.log('[BroadcastViewer] 👀 Viewer mode - watching creator stream');
  
  const viewerConfig = useMemo(() => ({
    role: 'viewer' as const,
    creatorId: resolvedCreatorId!,
    identity: viewerIdentity,
  }), [resolvedCreatorId, viewerIdentity]);
  
  return (
    <div className="relative w-full h-full">
      {/* Main creator video stream */}
      {resolvedCreatorId && (
        <LiveKitVideoPlayer
          config={viewerConfig}
          targetParticipantId={resolvedCreatorId}
          className="w-full h-full object-cover bg-black"
          muted={isMuted}
          onConnectionStateChange={(connected) => {
            setConnectionState(connected ? 'connected' : 'connecting');
          }}
          fallbackContent={
            <div className="text-center text-white px-4">
              {connectionState === 'checking' && (
                <div className="animate-pulse">
                  <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4 mx-auto"></div>
                  <div className="text-sm">Connecting to stream...</div>
                </div>
              )}
              {connectionState === 'connected' && (
                <div>
                  <div className="text-6xl mb-4">🎬</div>
                  <div className="text-lg font-medium mb-2">Creator Offline</div>
                  <p className="text-sm text-white/70 mb-4">The creator is not broadcasting yet.<br />You'll see them as soon as they go live!</p>
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
          }
        />
      )}
      
      {/* Self video PIP */}
      {showSelfVideo && (consentStream || localStream) && (
        <div className="absolute bottom-20 right-4 z-30 w-32 h-24 sm:w-40 sm:h-30 rounded-lg overflow-hidden border-2 border-white shadow-lg">
          <video
            ref={(el) => {
              if (el) {
                el.srcObject = consentStream || localStream;
              }
            }}
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
