import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useUIContext } from '../providers/UIProvider'
import { useMedia } from '../providers/MediaProvider'
import { useChatDrawerGesture } from '../hooks/useChatDrawerGesture'
import { canFlipCamera } from '../lib/livekitClient'
import { PIP } from '../components/PIP'
import { ChatDrawer } from '../components/ChatDrawer'
import VideoTile from '../components/VideoTile'
import { MediaControls } from '../components/MediaControls'
import { ConnectionBanner } from '../components/ConnectionBanner'
import { PermissionPrompt } from '../components/PermissionPrompt'

export function CenterPane() {
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
  } = useMedia()
  
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    drawerTranslateY,
    handleChatTouchStart,
    handleChatTouchMove,
    handleChatTouchEnd
  } = useChatDrawerGesture(containerRef)
  
  const canFlip = canFlipCamera()
  const hotZoneHeight = typeof window !== 'undefined' && window.innerWidth < 360 ? 28 : 32
  
  // Primary/PIP logic based on focus
  const primary = primaryFocus === 'remote' && primaryRemoteVideo ? primaryRemoteVideo : localVideo
  const pip = primary === localVideo ? primaryRemoteVideo : localVideo
  
  const handleSwapPIP = () => {
    // Idempotent: no-op if no remote present
    if (!primaryRemoteVideo && !localVideo) return
    setPrimaryFocus(primaryFocus === 'remote' ? 'local' : 'remote')
  }
  
  return (
    <div ref={containerRef} className="relative h-full bg-black overflow-hidden">
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
      <div className="absolute inset-0">
        <VideoTile
          trackRef={primary}
          mirror={primary?.isLocal && facingMode === 'user'}
        />
      </div>
      
      {/* PIP */}
      {pip && (
        <PIP
          trackRef={pip}
          mirror={pip.isLocal && facingMode === 'user'}
          onDoubleTap={handleSwapPIP}
        />
      )}
      
      {/* Media Controls */}
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
      />
      
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
