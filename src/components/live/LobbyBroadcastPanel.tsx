import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mic, MicOff, Camera, CameraOff, Wifi, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LobbyBroadcastPanelProps {
  onEnd: () => void
}

interface MediaState {
  stream: MediaStream | null
  error: string | null
  loading: boolean
  audioEnabled: boolean
  videoEnabled: boolean
  retryCount: number
}

export function LobbyBroadcastPanel({ onEnd }: LobbyBroadcastPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  
  const [mediaState, setMediaState] = useState<MediaState>({
    stream: null,
    error: null,
    loading: true,
    audioEnabled: true,
    videoEnabled: true,
    retryCount: 0
  })

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }
  }, [])

  const initMedia = useCallback(async () => {
    setMediaState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: { 
          echoCancellation: true,
          noiseSuppression: true 
        }
      })

      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      setMediaState(prev => ({
        ...prev,
        stream,
        loading: false,
        error: null,
        retryCount: 0
      }))

      // Log telemetry
      console.info('[LOBBY_BROADCAST] Started', {
        audio: stream.getAudioTracks().length > 0,
        video: stream.getVideoTracks().length > 0
      })

    } catch (error: any) {
      console.error('[LOBBY_BROADCAST] Error:', error)
      
      let errorMessage = 'Couldn\'t start broadcast preview — retry.'
      
      if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
        errorMessage = 'Permission needed — enable camera & mic and try again.'
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera or microphone is already in use by another app.'
      } else if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
        errorMessage = 'No usable camera/microphone found.'
      }

      setMediaState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        retryCount: prev.retryCount + 1
      }))

      // Log telemetry
      console.info('[LOBBY_BROADCAST] Error', { code: error.name })

      // Auto-retry with exponential backoff (max 2 retries)
      if (mediaState.retryCount < 2) {
        const delay = Math.min(1000 * Math.pow(2, mediaState.retryCount), 4000)
        retryTimeoutRef.current = setTimeout(() => {
          initMedia()
        }, delay)
      }
    }
  }, [mediaState.retryCount])

  const toggleAudio = useCallback(() => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks()
      const newEnabled = !mediaState.audioEnabled
      audioTracks.forEach(track => {
        track.enabled = newEnabled
      })
      setMediaState(prev => ({ ...prev, audioEnabled: newEnabled }))
    }
  }, [mediaState.audioEnabled])

  const toggleVideo = useCallback(() => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks()
      const newEnabled = !mediaState.videoEnabled
      videoTracks.forEach(track => {
        track.enabled = newEnabled
      })
      setMediaState(prev => ({ ...prev, videoEnabled: newEnabled }))
    }
  }, [mediaState.videoEnabled])

  const handleEnd = useCallback(() => {
    console.info('[LOBBY_BROADCAST] End clicked')
    cleanup()
    onEnd()
  }, [cleanup, onEnd])

  const handleRetry = useCallback(() => {
    if (mediaState.retryCount < 3) {
      initMedia()
    }
  }, [initMedia, mediaState.retryCount])

  // Initialize media on mount
  useEffect(() => {
    initMedia()
    return cleanup
  }, [initMedia, cleanup])

  return (
    <div 
      className="w-full mb-4" 
      role="region" 
      aria-label="Lobby Broadcast"
    >
      <div className="relative w-full aspect-video overflow-hidden rounded-2xl bg-neutral-900">
        {/* Video Element */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Loading Overlay */}
        {mediaState.loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80">
            <div className="flex items-center gap-3 text-white">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
              <span>Starting broadcast preview...</span>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {mediaState.error && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80 p-4">
            <div className="text-center">
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{mediaState.error}</AlertDescription>
              </Alert>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={mediaState.loading || mediaState.retryCount >= 3}
                className="text-xs"
              >
                <RotateCcw className={cn("h-3 w-3 mr-1", mediaState.loading && "animate-spin")} />
                {mediaState.retryCount >= 3 ? 'Max Retries' : 'Retry'}
              </Button>
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        {!mediaState.loading && !mediaState.error && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-4">
            <div className="flex items-center justify-between">
              {/* Media Controls */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={mediaState.audioEnabled ? "secondary" : "destructive"}
                  onClick={toggleAudio}
                  className="h-8 w-8 p-0"
                  aria-label="Toggle microphone"
                  aria-pressed={mediaState.audioEnabled}
                >
                  {mediaState.audioEnabled ? (
                    <Mic className="h-4 w-4" />
                  ) : (
                    <MicOff className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  size="sm"
                  variant={mediaState.videoEnabled ? "secondary" : "destructive"}
                  onClick={toggleVideo}
                  className="h-8 w-8 p-0"
                  aria-label="Toggle camera"
                  aria-pressed={mediaState.videoEnabled}
                >
                  {mediaState.videoEnabled ? (
                    <Camera className="h-4 w-4" />
                  ) : (
                    <CameraOff className="h-4 w-4" />
                  )}
                </Button>

                <div className="flex items-center gap-1 text-white text-xs">
                  <Wifi className="h-3 w-3" />
                  <span>Live Preview</span>
                </div>
              </div>

              {/* End Broadcast Button */}
              <Button
                size="sm"
                variant="destructive"
                onClick={handleEnd}
                aria-label="End broadcast"
              >
                End Broadcast
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}