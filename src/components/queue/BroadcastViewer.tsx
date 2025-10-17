import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, RefreshCw, Video, VideoOff } from 'lucide-react';
import { resolveCreatorUserId } from '@/lib/queueResolver';
import { useAuth } from '@/app/providers/auth-provider';
import { LiveKitVideoPlayer } from '@/components/video/LiveKitVideoPlayer';
import { LiveKitPublisher } from '@/components/video/LiveKitPublisher';
import { lobbyRoomName, fanIdentity, previewRoomName } from '@/lib/lobbyIdentity';
import { cn } from '@/lib/utils';

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

  const { user } = useAuth();
  const fanUserId = user?.id || null;
  
  const selfVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false); // Start UNMUTED - audio plays by default
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking');
  const [resolvedCreatorId, setResolvedCreatorId] = useState<string | null>(null);
  const [showSelfVideo, setShowSelfVideo] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isTransitioningToPublisher, setIsTransitioningToPublisher] = useState(false);
  const publisherModeRef = useRef(false);
  const hasConnectedRef = useRef(false);
  
  // Stream state management
  const [streamState, setStreamState] = useState<'waiting' | 'ready' | 'playing' | 'ended'>('waiting');
  const streamStateRef = useRef<'waiting' | 'ready' | 'playing' | 'ended'>('waiting');
  const [needsUserGesture, setNeedsUserGesture] = useState(true);
  const previousHasVideoRef = useRef(false);
  
  // Circuit breaker for infinite loops (REEISSN: Non-Myopic)
  const renderCountRef = useRef(0);
  const renderTimestampRef = useRef(Date.now());

  // Circuit breaker: Track renders to detect infinite loops
  const now = Date.now();
  if (now - renderTimestampRef.current > 5000) {
    // Reset counter every 5 seconds
    renderCountRef.current = 0;
    renderTimestampRef.current = now;
  }
  renderCountRef.current++;
  
  if (renderCountRef.current > 50) {
    console.error('[BroadcastViewer] 🚨 INFINITE LOOP DETECTED: >50 renders in 5 seconds!', {
      renderCount: renderCountRef.current,
      props: { creatorId, sessionId, isInQueue, shouldPublishFanVideo, hasConsentStream: !!consentStream }
    });
  }

  // Component mount logging
  useEffect(() => {
    console.log('[BroadcastViewer] 🎬 Component MOUNTED', {
      creatorId,
      sessionId,
      isInQueue,
      shouldPublishFanVideo,
      hasConsentStream: !!consentStream,
      creatorName,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isAndroid: /Android/i.test(navigator.userAgent),
      isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
      autoplayPolicy: (navigator as any).getAutoplayPolicy?.('mediaelement')
    });

    return () => {
      console.log('[BroadcastViewer] 🔚 Component UNMOUNTED', {
        finalStreamState: streamStateRef.current,
        hadVideo: previousHasVideoRef.current,
        timestamp: new Date().toISOString()
      });
    };
  }, []);

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


  // Effect to transition to publisher mode (one-time connection)
  useEffect(() => {
    console.log('[BroadcastViewer] 🔍 Checking publisher transition:', {
      shouldPublishFanVideo,
      hasConsentStream: !!consentStream,
      consentStreamTracks: consentStream?.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        readyState: t.readyState
      })),
      resolvedCreatorId,
      fanUserId,
      publisherMode: publisherModeRef.current,
      hasConnected: hasConnectedRef.current
    });
    
    if (publisherModeRef.current) return;
    
    if (consentStream && !hasConnectedRef.current) {
      console.log('[BroadcastViewer] ✅ Activating fan publisher mode', {
        creatorId: resolvedCreatorId,
        fanId: fanUserId,
        roomName: lobbyRoomName(resolvedCreatorId || ''),
        videoTracks: consentStream.getVideoTracks().length,
        audioTracks: consentStream.getAudioTracks().length
      });
      
      publisherModeRef.current = true;
      hasConnectedRef.current = true;
      console.log('[BroadcastViewer] 🎬 Starting one-time preview publish');
      
      // Analytics: track preview publish start
      try {
        (window as any)?.analytics?.track?.('preview_publish_started', {
          creatorId: resolvedCreatorId,
          fanId: fanUserId,
          category: 'queue_preview'
        });
      } catch (e) {
        console.warn('[BroadcastViewer] Analytics error:', e);
      }
    }
  }, [consentStream, resolvedCreatorId, fanUserId]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const handleRetry = useCallback(() => {
    setConnectionState('connecting');
    window.location.reload();
  }, []);

  const handleTapToWatch = useCallback(() => {
    console.log('[BroadcastViewer] 👆 USER TAP TO WATCH', {
      currentState: streamStateRef.current,
      hadVideo: previousHasVideoRef.current,
      timestamp: new Date().toISOString()
    });
    console.log('[BroadcastViewer] ▶️ STATE TRANSITION: ready → playing (user gesture)');
    setStreamState('playing');
    streamStateRef.current = 'playing';
    setNeedsUserGesture(false);
    
    // Trigger video play after user gesture
    setTimeout(() => {
      const videoElement = document.querySelector('video');
      console.log('[BroadcastViewer] 🎬 Attempting play after user gesture', {
        videoElementFound: !!videoElement,
        muted: videoElement?.muted,
        paused: videoElement?.paused
      });
      
      if (videoElement) {
        videoElement.play()
          .then(() => {
            console.log('[BroadcastViewer] ✅ Play after user gesture SUCCEEDED');
          })
          .catch(err => {
            console.error('[BroadcastViewer] ❌ Play after user gesture FAILED:', {
              errorName: err.name,
              errorMessage: err.message
            });
          });
      }
    }, 100);
  }, []);

  const handleVideoAvailable = useCallback((hasVideo: boolean) => {
    const hadVideo = previousHasVideoRef.current;
    console.log('[BroadcastViewer] 🎥 Video availability changed:', {
      hasVideo,
      hadVideo,
      transition: `${hadVideo} → ${hasVideo}`,
      needsUserGesture,
      currentStreamState: streamStateRef.current,
      timestamp: new Date().toISOString()
    });
    
    previousHasVideoRef.current = hasVideo;
    
    if (hasVideo && !hadVideo) {
      // Stream just started - try seamless autoplay (muted)
      console.log('[BroadcastViewer] ▶️ STATE TRANSITION: waiting → playing (attempting autoplay)');
      setStreamState('playing');
      streamStateRef.current = 'playing';
      setNeedsUserGesture(false);
      
      // Attempt autoplay with muted video (mobile-safe)
      setTimeout(() => {
        const videoElement = document.querySelector('video');
        
        console.log('[BroadcastViewer] 🎬 AUTOPLAY ATTEMPT:', {
          videoElementFound: !!videoElement,
          videoElementTag: videoElement?.tagName,
          prePlayState: {
            muted: videoElement?.muted,
            paused: videoElement?.paused,
            readyState: videoElement?.readyState,
            networkState: videoElement?.networkState,
            currentTime: videoElement?.currentTime,
            src: videoElement?.src ? 'present' : 'none',
            srcObject: videoElement?.srcObject ? 'present' : 'none'
          },
          timestamp: new Date().toISOString()
        });
        
        if (videoElement) {
          videoElement.play()
            .then(() => {
              console.log('[BroadcastViewer] ✅ AUTOPLAY SUCCEEDED', {
                currentState: streamStateRef.current,
                videoPlaying: !videoElement.paused,
                timestamp: new Date().toISOString()
              });
            })
            .catch(err => {
              console.warn('[BroadcastViewer] ⚠️ AUTOPLAY BLOCKED - Showing Tap to Watch', {
                errorName: err.name,
                errorMessage: err.message,
                isNotAllowedError: err.name === 'NotAllowedError',
                timestamp: new Date().toISOString()
              });
              // Fallback to showing tap button if autoplay fails
              console.log('[BroadcastViewer] ▶️ STATE TRANSITION: playing → ready (autoplay blocked)');
              setStreamState('ready');
              streamStateRef.current = 'ready';
              setNeedsUserGesture(true);
            });
        } else {
          console.error('[BroadcastViewer] ❌ Video element not found for autoplay!');
        }
      }, 100);
    } else if (!hasVideo && hadVideo && streamStateRef.current === 'playing') {
      // Stream ended
      console.log('[BroadcastViewer] ⏹️ STATE TRANSITION: playing → ended (stream stopped)');
      setStreamState('ended');
      streamStateRef.current = 'ended';
      setNeedsUserGesture(true);
    } else if (!hasVideo && !hadVideo) {
      console.log('[BroadcastViewer] ⏳ Still waiting for video...', { currentState: streamStateRef.current });
    }
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

  // Monitor video element lifecycle
  useEffect(() => {
    const videoElement = document.querySelector('video');
    if (!videoElement) return;

    console.log('[BroadcastViewer] 📺 Attaching video element listeners');

    const handlers = {
      loadedmetadata: () => console.log('[BroadcastViewer] 📺 Video: loadedmetadata', {
        duration: videoElement.duration,
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight,
        readyState: videoElement.readyState
      }),
      loadeddata: () => console.log('[BroadcastViewer] 📺 Video: loadeddata', { readyState: videoElement.readyState }),
      canplay: () => console.log('[BroadcastViewer] 📺 Video: canplay', { readyState: videoElement.readyState }),
      canplaythrough: () => console.log('[BroadcastViewer] 📺 Video: canplaythrough'),
      play: () => console.log('[BroadcastViewer] 📺 Video: play event'),
      playing: () => console.log('[BroadcastViewer] 📺 Video: PLAYING', { currentTime: videoElement.currentTime }),
      pause: () => console.log('[BroadcastViewer] 📺 Video: PAUSE', { currentTime: videoElement.currentTime }),
      ended: () => console.log('[BroadcastViewer] 📺 Video: ENDED'),
      waiting: () => console.log('[BroadcastViewer] 📺 Video: waiting for data'),
      stalled: () => console.log('[BroadcastViewer] 📺 Video: stalled'),
      suspend: () => console.log('[BroadcastViewer] 📺 Video: suspend'),
      error: (e: Event) => {
        const error = (e.target as HTMLVideoElement).error;
        console.error('[BroadcastViewer] ❌ Video ERROR:', {
          code: error?.code,
          message: error?.message,
          readyState: videoElement.readyState,
          networkState: videoElement.networkState
        });
      }
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      videoElement.addEventListener(event, handler as EventListener);
    });

    return () => {
      console.log('[BroadcastViewer] 📺 Removing video element listeners');
      Object.entries(handlers).forEach(([event, handler]) => {
        videoElement.removeEventListener(event, handler as EventListener);
      });
    };
  }, [resolvedCreatorId]); // Re-attach when video player changes

  // Monitor page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log('[BroadcastViewer] 👁️ VISIBILITY CHANGE:', {
        hidden: document.hidden,
        visibilityState: document.visibilityState,
        streamState: streamStateRef.current,
        timestamp: new Date().toISOString()
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Monitor network state
  useEffect(() => {
    const handleOnline = () => console.log('[BroadcastViewer] 🌐 Network: ONLINE');
    const handleOffline = () => console.log('[BroadcastViewer] 🌐 Network: OFFLINE');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    console.log('[BroadcastViewer] 🌐 Initial network state:', navigator.onLine ? 'ONLINE' : 'OFFLINE');

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Use distinct identity for viewer to avoid collision with publisher
  const viewerIdentity = useMemo(() => {
    if (fanUserId) {
      return `viewer_${fanUserId}`;
    }
    return `viewer_${crypto.randomUUID()}`;
  }, [fanUserId]);

  console.log('[BroadcastViewer] Config:', { 
    shouldPublishFanVideo, 
    hasConsentStream: !!consentStream,
    fanUserId, 
    resolvedCreatorId 
  });

  // Fan publishing mode: Show self-preview only, publish to creator
  if (publisherModeRef.current && consentStream) {
    console.log('[BroadcastViewer] 📹 Fan publisher mode - showing self-preview only', {
      fanUserId,
      resolvedCreatorId,
      roomName: lobbyRoomName(resolvedCreatorId || ''),
      consentStreamActive: consentStream.active,
      videoTracks: consentStream.getVideoTracks().map(t => ({
        id: t.id,
        enabled: t.enabled,
        readyState: t.readyState
      }))
    });
    
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

        {/* Info card - bottom left */}
        <div className="absolute bottom-4 left-4 z-20">
          <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
            <div className="flex items-center gap-2">
              <div className="text-xl">👋</div>
              <div>
                <p className="text-sm font-medium">You're Next In Line</p>
                <p className="text-xs text-muted-foreground">Waiting for creator's invite</p>
              </div>
            </div>
          </div>
        </div>


        {/* Headless publisher - establishes single LiveKit connection */}
        {fanUserId && resolvedCreatorId && (() => {
          const publisherConfig = useMemo(() => {
            const identity = fanIdentity(fanUserId); // Use raw UUID for consistency
            const roomName = previewRoomName(resolvedCreatorId); // Position 1 fan publishes to preview room
            console.log('[BroadcastViewer] 📹 Publishing to preview room:', {
              fanUserId,
              identity,
              resolvedCreatorId,
              roomName
            });
            return {
              role: 'publisher' as const,
              creatorId: resolvedCreatorId,
              identity,
              roomName, // Explicit preview room
            };
          }, [resolvedCreatorId, fanUserId]);

          return (
            <LiveKitPublisher
              config={publisherConfig}
              publishAudio={true}
              publishVideo={true}
              mediaStream={consentStream}
            onPublished={() => {
              console.log('[BroadcastViewer] ✅ Fan video published successfully to preview room:', previewRoomName(resolvedCreatorId));
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
  console.log('[BroadcastViewer] 🎬 VIEWER MODE ACTIVATED', {
    isInQueue,
    resolvedCreatorId,
    fanUserId,
    viewerIdentity,
    shouldPublishFanVideo,
    hasConsentStream: !!consentStream,
    timestamp: new Date().toISOString()
  });
  
  const viewerConfig = useMemo(() => {
    const expectedRoom = `lobby_${resolvedCreatorId}`;
    const config = {
      role: 'viewer' as const,
      creatorId: resolvedCreatorId!,
      identity: viewerIdentity,
      roomName: expectedRoom, // Explicitly include room name
    };
    console.log('[BroadcastViewer] 👁️ VIEWER CONFIG CREATED:', {
      ...config,
      targetParticipantId: resolvedCreatorId,
      expectedCreatorIdentity: resolvedCreatorId,
      viewerWillSubscribeTo: resolvedCreatorId,
      timestamp: new Date().toISOString()
    });
    return config;
  }, [resolvedCreatorId, viewerIdentity]);
  
  return (
    <div className="relative w-full h-full">
      {/* Green glowing border when stream is playing */}
      {streamState === 'playing' && (
        <div className="absolute inset-0 pointer-events-none z-50">
          <div 
            className="absolute inset-0 rounded-lg animate-pulse"
            style={{
              boxShadow: '0 0 0 1px rgba(34, 197, 94, 0.6)',
              border: '1px solid rgb(34, 197, 94)',
            }}
          />
        </div>
      )}

      {/* Main creator video stream */}
      {resolvedCreatorId && (
        <LiveKitVideoPlayer
          config={viewerConfig}
          targetParticipantId={resolvedCreatorId}
          className={cn(
            "w-full h-full object-cover bg-black",
            streamState === 'playing' && "rounded-lg"
          )}
          muted={isMuted}
          onConnectionStateChange={(connected) => {
            console.log('[BroadcastViewer] 📡 CONNECTION STATE CHANGE:', {
              connected,
              previousState: connectionState,
              transition: `${connectionState} → ${connected ? 'connected' : 'connecting'}`,
              timestamp: new Date().toISOString()
            });
            setConnectionState(connected ? 'connected' : 'connecting');
          }}
          onVideoAvailable={handleVideoAvailable}
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

      {/* "Tap to Watch" Overlay - Only when stream is ready */}
      {streamState === 'ready' && (
        <div 
          className="absolute inset-0 bg-black/90 z-40 flex items-center justify-center cursor-pointer"
          onClick={handleTapToWatch}
        >
          <div className="text-center space-y-6 max-w-sm px-6">
            <div className="space-y-3">
              <p className="text-white text-xl font-medium leading-relaxed">
                {creatorName} has begun streaming in the Lobby
              </p>
              <button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white text-lg font-semibold py-4 px-8 rounded-2xl transition-colors">
                TAP TO WATCH
              </button>
            </div>
          </div>
        </div>
      )}

      {/* "Stream has ended" Overlay */}
      {streamState === 'ended' && (
        <div className="absolute inset-0 bg-black/90 z-40 flex items-center justify-center">
          <div className="text-center space-y-4 px-6">
            <div className="text-6xl mb-4">📺</div>
            <p className="text-white text-2xl font-medium">
              Stream has ended
            </p>
            <p className="text-white/60 text-sm">
              Waiting for creator to go live again...
            </p>
          </div>
        </div>
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

      {/* Control button - Volume only - ONLY show when playing */}
      {streamState === 'playing' && (
        <div className="absolute bottom-4 right-4 z-30">
          <Button
            onClick={toggleMute}
            variant="outline"
            size="sm"
            className="w-10 h-10 rounded-full"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}
