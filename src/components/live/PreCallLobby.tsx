import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mic, MicOff, Video, VideoOff, Check } from 'lucide-react'
import { MediaPreview } from './MediaPreview'
import { mediaManager } from '@/media/MediaOrchestrator'

// TODO: Replace with actual config/store source
const DEV_CANNOT_SAY_LIST = [
  { id: 'violence', label: 'No violent or threatening language' },
  { id: 'hate', label: 'No hate speech or discriminatory content' },
  { id: 'explicit', label: 'No explicit sexual content' },
  { id: 'personal', label: 'No sharing of personal contact information' },
  { id: 'harassment', label: 'No harassment or bullying behavior' }
]

interface PreCallLobbyProps {
  // Future: add activeInvite, device controls, etc.
}

export function PreCallLobby({}: PreCallLobbyProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true)
  const [confirmedItems, setConfirmedItems] = useState<Set<string>>(new Set())

  // Reset confirmation state on mount
  useEffect(() => {
    setConfirmedItems(new Set())
  }, [])

  const cannotSayList = DEV_CANNOT_SAY_LIST // TODO: Replace with actual config/store
  const allItemsConfirmed = confirmedItems.size === cannotSayList.length

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

  // Handle confirmation toggle
  const toggleItemConfirmation = (itemId: string) => {
    setConfirmedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }
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

          {/* Reconfirmation Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-medium mb-3">Community Guidelines</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Please confirm you understand and will follow these guidelines during your call:
              </p>
              <div className="space-y-2">
                {cannotSayList.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                    <span className="text-sm">{item.label}</span>
                    <Button
                      size="sm"
                      variant={confirmedItems.has(item.id) ? "default" : "outline"}
                      onClick={() => toggleItemConfirmation(item.id)}
                      className="h-8 px-3"
                    >
                      {confirmedItems.has(item.id) ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Confirmed
                        </>
                      ) : (
                        'Confirm'
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Enter Call Button */}
            <Button
              size="lg"
              disabled={!allItemsConfirmed}
              className="w-full"
            >
              Enter Call ({confirmedItems.size}/{cannotSayList.length} confirmed)
            </Button>
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