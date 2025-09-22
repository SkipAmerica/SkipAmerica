import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Mic, MicOff, Video, VideoOff } from 'lucide-react'
import { MediaPreview } from './MediaPreview'
import { mediaManager } from '@/media/MediaOrchestrator'

interface PreCallLobbyProps {
  // Future: add activeInvite, device controls, etc.
}

export function PreCallLobby({}: PreCallLobbyProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true)

  // Add/remove dimming class on mount/unmount
  useEffect(() => {
    document.documentElement.classList.add('precall-open')
    return () => {
      document.documentElement.classList.remove('precall-open')
    }
  }, [])

  // Initialize media on mount
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        if (!mediaManager.hasLocalStream()) {
          await mediaManager.start({
            video: isVideoEnabled,
            audio: isMicEnabled,
            previewOnly: true,
            targetState: 'SESSION_PREP'
          })
        }
      } catch (error) {
        console.warn('[PreCallLobby] Failed to initialize media:', error)
      } finally {
        setIsInitializing(false)
      }
    }

    initializeMedia()
  }, [])

  // Handle video toggle
  const toggleVideo = async () => {
    try {
      const newVideoState = !isVideoEnabled
      setIsVideoEnabled(newVideoState)
      
      // Restart media with new settings
      if (mediaManager.hasLocalStream()) {
        await mediaManager.stop('video_toggle')
        await mediaManager.start({
          video: newVideoState,
          audio: isMicEnabled,
          previewOnly: true,
          targetState: 'SESSION_PREP'
        })
      }
    } catch (error) {
      console.error('[PreCallLobby] Failed to toggle video:', error)
      setIsVideoEnabled(!isVideoEnabled) // Revert on error
    }
  }

  // Handle mic toggle
  const toggleMic = async () => {
    try {
      const newMicState = !isMicEnabled
      setIsMicEnabled(newMicState)
      
      // Update audio track enabled state if stream exists
      const stream = mediaManager.getLocalStream()
      if (stream) {
        const audioTracks = stream.getAudioTracks()
        audioTracks.forEach(track => {
          track.enabled = newMicState
        })
      }
    } catch (error) {
      console.error('[PreCallLobby] Failed to toggle mic:', error)
      setIsMicEnabled(!isMicEnabled) // Revert on error
    }
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-background flex flex-col safe-area-insets overflow-hidden"
      role="dialog"
      aria-labelledby="precall-header"
      aria-modal="true"
    >
      {/* Header */}
      <header className="flex-shrink-0 p-4 border-b">
        <h1 id="precall-header" className="text-xl font-semibold text-center">
          Pre-Call Lobby
        </h1>
      </header>

      {/* Body - Scrollable */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6 min-h-full flex flex-col">
          {/* Video Previews */}
          <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-[400px]">
            {/* Self Preview */}
            <div className="flex-1 flex flex-col">
              <h2 className="text-sm font-medium mb-2">Your Camera</h2>
              <Card className="flex-1 min-h-[200px] overflow-hidden">
                {isVideoEnabled && !isInitializing ? (
                  <MediaPreview className="w-full h-full" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      {isInitializing ? (
                        <div className="space-y-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                          <p className="text-sm">Initializing camera...</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <VideoOff className="h-12 w-12 mx-auto" />
                          <p className="text-sm">Camera is off</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Participant Preview */}
            <div className="flex-1 flex flex-col">
              <h2 className="text-sm font-medium mb-2">Participant</h2>
              <Card className="flex-1 min-h-[200px] overflow-hidden">
                <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                      <Video className="h-6 w-6" />
                    </div>
                    <p className="text-sm">Waiting for participant preview...</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Controls */}
          <div className="flex-shrink-0 flex justify-center gap-4 pb-safe">
            <Button
              size="lg"
              variant={isMicEnabled ? "default" : "destructive"}
              onClick={toggleMic}
              aria-pressed={isMicEnabled}
              aria-label={isMicEnabled ? "Mute microphone" : "Unmute microphone"}
              className="h-12 w-12 rounded-full p-0"
            >
              {isMicEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>

            <Button
              size="lg"
              variant={isVideoEnabled ? "default" : "destructive"}
              onClick={toggleVideo}
              disabled={isInitializing}
              aria-pressed={isVideoEnabled}
              aria-label={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
              className="h-12 w-12 rounded-full p-0"
            >
              {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}