import { useRef, useMemo } from 'react'
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
  
  // Primary/PIP logic based on focus (memoized to prevent recalc on every render)
  const primary = useMemo(() => {
    return primaryFocus === 'remote' && primaryRemoteVideo ? primaryRemoteVideo : localVideo
  }, [primaryFocus, primaryRemoteVideo, localVideo])
  
  const pip = useMemo(() => {
    if (!localVideo && !primaryRemoteVideo) return undefined
    return primary === localVideo ? primaryRemoteVideo : localVideo
  }, [primary, localVideo, primaryRemoteVideo])
  
  const handleSwapPIP = () => {
    // Idempotent: no-op if no remote present
    if (!primaryRemoteVideo && !localVideo) return
    markUserPinned() // Disable auto-promotion
    setPrimaryFocus(primaryFocus === 'remote' ? 'local' : 'remote')
  }
  
  const handleEndCall = async () => {
    try {
      console.log('[CenterPane] Ending session', { sessionId, role })
      
      // End session in database (V2 process)
      const result = await endAlmightySession({ sessionId, role })
      
      if (!result.success) {
        console.error('[CenterPane] Session end failed:', result.error)
        toast({
          title: 'Error ending session',
          description: result.error || 'Could not end session properly',
          variant: 'destructive'
        })
      }
      
      // Disconnect media
      await leave()
      
      // Check if should show rating modal
      if (result.shouldShowRating && result.sessionMetadata) {
        // Navigate with query params to trigger rating modal
        const params = new URLSearchParams({
          sc: '1',
          sid: result.sessionMetadata.sessionId,
          cid: result.sessionMetadata.creatorId,
          cname: encodeURIComponent(result.sessionMetadata.creatorName),
          cbio: encodeURIComponent(result.sessionMetadata.creatorBio),
          cavatar: encodeURIComponent(result.sessionMetadata.creatorAvatarUrl)
        })
        console.log('[CenterPane] Navigating with rating modal params:', result.navigationPath)
        navigate(`${result.navigationPath}?${params.toString()}`, { replace: true })
      } else {
        // Direct navigation (fallback)
        console.log('[CenterPane] Navigating without rating modal:', result.navigationPath)
        navigate(result.navigationPath, { replace: true })
      }
      
    } catch (error) {
      console.error('[CenterPane] Unexpected error ending call:', error)
      toast({
        title: 'Error ending call',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      })
      
      // Fallback: still disconnect media and go home
      await leave()
      navigate('/', { replace: true })
    }
  }
  
  return (
    <div ref={containerRef} className="relative h-full min-h-0 bg-black overflow-hidden">
      <div ref={stageRef} data-center-stage className="absolute inset-0">
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
      
        {/* Primary Video */}
        <VideoTile
          key={
            primary?.track?.sid ||
            primary?.track?.mediaStreamTrack?.id ||
            (primary?.isLocal ? 'local' : 'remote')
          }
          trackRef={primary}
          mirror={primary?.isLocal && facingMode === 'user'}
        />
        
        {/* PIP with Draggable Dock */}
        {pip ? (
          <PIPDock boundsRef={stageRef} avoidRef={controlsRef} initialCorner="bottom-right">
            <PIP
              trackRef={pip}
              mirror={pip.isLocal && facingMode === 'user'}
              onDoubleTap={handleSwapPIP}
              className="w-full h-full"
              rounded
            />
          </PIPDock>
        ) : (
          <div className="absolute top-4 right-4 w-24 h-32 rounded-lg bg-gray-800/80 flex items-center justify-center text-white/60 text-xs">
            No video
          </div>
        )}
      </div>
      
      {/* Media Controls */}
      <div 
        ref={controlsRef}
        className="pointer-events-auto z-[65]"
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 'calc(max(env(safe-area-inset-bottom, 0px) + 14px, 2.2vh))',
          translate: '-50% 0',
        }}
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
