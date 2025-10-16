import { useRef, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useUIContext } from '../providers/UIProvider'
import { useMedia } from '../providers/MediaProvider'
import { useChatDrawerGesture } from '../hooks/useChatDrawerGesture'
import { canFlipCamera } from '../lib/livekitClient'
import { PIP } from '../components/PIP'
import PIPDock from '../components/PIPDock'
import { ChatDrawer } from '../components/ChatDrawer'
import VideoTile from '../components/VideoTile'
import { MediaControls } from '../components/MediaControls'
import { ConnectionBanner } from '../components/ConnectionBanner'
import { PermissionPrompt } from '../components/PermissionPrompt'
import { useSession } from '../providers/SessionProvider'
import { endAlmightySession } from '@/utils/end-almighty-session'
import { useToast } from '@/hooks/use-toast'
import { SkipLogoLoader } from '../components/SkipLogoLoader'

export function CenterPane() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { sessionId, role } = useSession()
  const { primaryFocus, setPrimaryFocus, chatOpen } = useUIContext()
  const {
    localVideo,
    primaryRemoteVideo,
    facingMode,
    micEnabled,
    camEnabled,
    isFlippingCamera,
    toggleMic,
    toggleCam,
    flipCamera,
    needsAudioUnlock,
    unlockAudio,
    connectionState,
    tokenError,
    permissionError,
    retryPermissions,
    retryConnection,
    audioOutputDevices,
    switchAudioOutput,
    markUserPinned,
    leave,
  } = useMedia()
  
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<HTMLDivElement>(null)
  const {
    drawerTranslateY,
    handleChatTouchStart,
    handleChatTouchMove,
    handleChatTouchEnd
  } = useChatDrawerGesture(containerRef)
  
  const canFlip = canFlipCamera()
  const hotZoneHeight = typeof window !== 'undefined' && window.innerWidth < 360 ? 28 : 32
  
  // Mount/unmount logging
  useEffect(() => {
    console.log('[CenterPane:MOUNT]', {
      sessionId,
      role,
      timestamp: new Date().toISOString()
    })
    
    return () => {
      console.log('[CenterPane:UNMOUNT]', {
        sessionId,
        role,
        timestamp: new Date().toISOString()
      })
    }
  }, [sessionId, role])
  
  // Primary/PIP logic based on focus (memoized to prevent recalc on every render)
  const primary = useMemo(() => {
    return primaryFocus === 'remote' && primaryRemoteVideo ? primaryRemoteVideo : localVideo
  }, [primaryFocus, primaryRemoteVideo, localVideo])
  
  const pip = useMemo(() => {
    // If showing loader (no remote), always show local in PIP
    if (!primaryRemoteVideo && localVideo) return localVideo
    
    // Normal: show whichever isn't primary
    if (!localVideo && !primaryRemoteVideo) return undefined
    return primary === localVideo ? primaryRemoteVideo : localVideo
  }, [primary, localVideo, primaryRemoteVideo])

  // DEBUG: Log MediaProvider state
  console.log('[CenterPane] MediaProvider state:', {
    primaryFocus,
    localVideo: localVideo ? { participantId: localVideo.participantId, trackSid: localVideo.track?.sid, isLocal: localVideo.isLocal } : null,
    primaryRemoteVideo: primaryRemoteVideo ? { participantId: primaryRemoteVideo.participantId, trackSid: primaryRemoteVideo.track?.sid, isLocal: primaryRemoteVideo.isLocal } : null,
    computed_primary: primary ? { participantId: primary.participantId, trackSid: primary.track?.sid } : null,
    computed_pip: pip ? { participantId: pip.participantId, trackSid: pip.track?.sid } : null
  })
  
  // Determine if we should show loading animation for remote video
  const showRemoteVideoLoader = useMemo(() => {
    return connectionState === 'connected' && !primaryRemoteVideo
  }, [connectionState, primaryRemoteVideo])
  
  // Track ref update logging
  useEffect(() => {
    console.log('[CenterPane:TRACK_REFS_UPDATE]', {
      primary: primary ? {
        participantId: primary.participantId,
        trackSid: primary.track?.sid,
        kind: primary.kind,
        isLocal: primary.isLocal
      } : null,
      pip: pip ? {
        participantId: pip.participantId,
        trackSid: pip.track?.sid,
        kind: pip.kind,
        isLocal: pip.isLocal
      } : null,
      showRemoteVideoLoader,
      primaryFocus,
      timestamp: new Date().toISOString()
    })
  }, [primary, pip, showRemoteVideoLoader, primaryFocus])
  
  // [CP] Props receipt breadcrumb
  const t0Ref = useRef<number>(performance.now())
  const t = () => Math.round(performance.now() - t0Ref.current)
  
  useEffect(() => {
    const DBG = new URLSearchParams(location.search).get('debug') === '1' || import.meta.env.VITE_ALMIGHTY_DEBUG === '1'
    if (!DBG) return
    
    console.log('[CP]', {
      sessionId,
      primary: {
        has: !!primary,
        pubSid: primary?.track?.sid,
        trackId: primary?.track?.mediaStreamTrack?.id
      },
      pip: {
        has: !!pip,
        pubSid: pip?.track?.sid,
        trackId: pip?.track?.mediaStreamTrack?.id
      },
      t: t()
    })
  }, [primary, pip, sessionId])
  
  const handleSwapPIP = () => {
    // Idempotent: no-op if no remote present
    if (!primaryRemoteVideo && !localVideo) return
    markUserPinned() // Disable auto-promotion
    setPrimaryFocus(primaryFocus === 'remote' ? 'local' : 'remote')
  }
  
  const handleEndCall = async () => {
    const startTime = performance.now()
    console.log('[CenterPane:END_CALL] Starting end call process', { 
      sessionId, 
      role, 
      timestamp: startTime 
    })
    
    try {
      console.log('[CenterPane:END_CALL] Calling endAlmightySession', { 
        elapsed: performance.now() - startTime 
      })
      
      // End session in database (V2 process)
      const result = await endAlmightySession({ sessionId, role })
      
      console.log('[CenterPane:END_CALL] endAlmightySession returned', { 
        success: result.success,
        navigationPath: result.navigationPath,
        shouldShowRating: result.shouldShowRating,
        elapsed: performance.now() - startTime 
      })
      
      if (!result.success) {
        console.error('[CenterPane:END_CALL] Session end failed:', result.error)
        toast({
          title: 'Error ending session',
          description: result.error || 'Could not end session properly',
          variant: 'destructive'
        })
      }
      
      // Disconnect media
      console.log('[CenterPane:END_CALL] Disconnecting media', { 
        elapsed: performance.now() - startTime 
      })
      await leave()
      console.log('[CenterPane:END_CALL] Media disconnected', { 
        elapsed: performance.now() - startTime 
      })
      
      // Navigation is handled by endAlmightySession with query params
      if (result.navigationPath) {
        console.log('[CenterPane:END_CALL] Navigating to:', { 
          path: result.navigationPath,
          elapsed: performance.now() - startTime 
        })
        navigate(result.navigationPath, { replace: true })
      } else {
        console.log('[CenterPane:END_CALL] No navigation path, going home', { 
          elapsed: performance.now() - startTime 
        })
        navigate('/', { replace: true })
      }
      
      console.log('[CenterPane:END_CALL] End call process complete', { 
        totalElapsed: performance.now() - startTime 
      })
      
    } catch (error) {
      console.error('[CenterPane:END_CALL] Unexpected error ending call:', error, {
        elapsed: performance.now() - startTime
      })
      toast({
        title: 'Error ending call',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      })
      
      // Fallback: still disconnect media and go home
      console.log('[CenterPane:END_CALL] Fallback: disconnecting and going home')
      await leave()
      navigate('/', { replace: true })
    }
  }
  
  return (
    <div ref={containerRef} className="relative h-full min-h-0 bg-black overflow-hidden flex flex-col">
      <div ref={stageRef} data-center-stage className="absolute inset-0 min-h-0">
      {/* Connection Banner */}
      <ConnectionBanner
        connectionState={connectionState}
        tokenError={tokenError}
        onRetry={tokenError?.is401Or403 ? () => {/* navigate to queue */} : retryConnection}
      />
      
      {/* Permission Prompt */}
      {permissionError && (
        <PermissionPrompt
          error={permissionError.error}
          errorType={permissionError.type}
          onRetry={retryPermissions}
          onDismiss={() => {/* navigate back */}}
        />
      )}
      
      {/* Persistent Audio Unlock Pill */}
      {needsAudioUnlock && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[55]">
          <Button
            variant="secondary"
            size="sm"
            onClick={unlockAudio}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            🔊 Tap to enable audio
          </Button>
        </div>
      )}
      
      {/* Chat Hot-Zone */}
      <div
        className="absolute left-0 right-0 z-50"
        style={{
          top: 0,
          height: hotZoneHeight,
          touchAction: 'pan-y',
          WebkitTouchCallout: 'none',
          userSelect: 'none'
        }}
        onTouchStart={handleChatTouchStart}
        onTouchMove={handleChatTouchMove}
        onTouchEnd={handleChatTouchEnd}
      />
      
        {/* Primary Video - Always Rendered */}
        <div className="absolute inset-0">
          <VideoTile
            key={
              primary?.track?.sid ||
              primary?.track?.mediaStreamTrack?.id ||
              (primary?.isLocal ? 'local' : 'remote')
            }
            trackRef={primary}
            mirror={primary?.isLocal && facingMode === 'user'}
            slot="primary"
            sessionId={sessionId}
          />
          {showRemoteVideoLoader && (
            <div className="absolute inset-0 pointer-events-none z-20">
              <SkipLogoLoader />
            </div>
          )}
        </div>
        
        {/* PIP with Draggable Dock - Always Rendered */}
        <PIPDock boundsRef={stageRef} avoidRef={controlsRef} initialCorner="bottom-right">
          <PIP
            trackRef={pip}
            mirror={pip?.isLocal && facingMode === 'user'}
            onDoubleTap={handleSwapPIP}
            className="w-full h-full"
            rounded
            sessionId={sessionId}
          />
        </PIPDock>
      </div>
      
      {/* Media Controls - Always visible and clickable */}
      <div 
        id="media-center"
        className="absolute inset-x-0 bottom-0 z-30 pointer-events-none"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px) + 14px, 2.2vh)'
        }}
      >
        <div 
          ref={controlsRef}
          className="pointer-events-auto flex justify-center"
        >
          <MediaControls
            micEnabled={micEnabled}
            camEnabled={camEnabled}
            canFlipCamera={canFlip}
            isFlippingCamera={isFlippingCamera}
            audioOutputDevices={audioOutputDevices}
            onToggleMic={toggleMic}
            onToggleCam={toggleCam}
            onFlipCamera={flipCamera}
            onSwitchAudioOutput={switchAudioOutput}
            onEndCall={handleEndCall}
          />
        </div>
      </div>
      
      {/* Chat Drawer */}
      <ChatDrawer
        isOpen={chatOpen}
        translateY={drawerTranslateY}
        onTouchStart={handleChatTouchStart}
        onTouchMove={handleChatTouchMove}
        onTouchEnd={handleChatTouchEnd}
      />
    </div>
  )
}
