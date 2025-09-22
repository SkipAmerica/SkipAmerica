import { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Mic, MicOff, Video, VideoOff, X, ArrowLeft, Flag, Wifi, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { MediaPreview } from './MediaPreview'
import { mediaManager, orchestrateStop } from '@/media/MediaOrchestrator'
import { ReportDialog } from '@/components/safety/ReportDialog'
import { useLive } from '@/hooks/live'

type PreflightPhase = 'idle' | 'requesting-permissions' | 'initializing-media' | 'ready' | 'error'

// TODO: Replace with actual config/store source
const DEV_CANNOT_SAY_LIST = [
  { id: 'violence', label: 'No violent or threatening language' },
  { id: 'hate', label: 'No hate speech or discriminatory content' },
  { id: 'explicit', label: 'No explicit sexual content' },
  { id: 'personal', label: 'No sharing of personal contact information' },
  { id: 'harassment', label: 'No harassment or bullying behavior' }
]

interface PreCallLobbyProps {
  onBack?: () => void
  // Future: add activeInvite, device controls, etc.
}

export function PreCallLobby({ onBack }: PreCallLobbyProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true)
  const [rulesConfirmed, setRulesConfirmed] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [networkStatus, setNetworkStatus] = useState<'checking' | 'ok' | 'degraded'>('checking')
  
  // Preflight state machine
  const [phase, setPhase] = useState<PreflightPhase>('idle')
  const [error, setError] = useState<{code: string; message: string; hint?: string} | null>(null)
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  const [isAudioOnlyMode, setIsAudioOnlyMode] = useState(false)
  
  // Editing state for cannot-say list
  const [editableList, setEditableList] = useState(DEV_CANNOT_SAY_LIST)
  const [newItemText, setNewItemText] = useState('')

  const { confirmJoin } = useLive()
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const cannotSayList = editableList // Use editable list instead of static list

  // Editing functions
  const addNewItem = () => {
    if (newItemText.trim()) {
      const newItem = {
        id: `item_${Date.now()}`,
        label: newItemText.trim()
      }
      setEditableList([...editableList, newItem])
      setNewItemText('')
    }
  }

  const removeItem = (itemId: string) => {
    setEditableList(editableList.filter(item => item.id !== itemId))
  }

  // Resilient media initialization
  const attachLocalPreview = (stream: MediaStream) => {
    const video = videoRef.current
    if (video && stream) {
      video.srcObject = stream
      video.muted = true
      video.autoplay = true
      console.log('[PreCallLobby] Stream attached successfully to preview')
      const playPromise = video.play?.()
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.catch(() => {})
      }
    }
  }

  async function initMedia() {
    setError(null)
    setPhase('initializing-media')
    setIsAudioOnlyMode(false)
    
    try {
      // Step 1: enumerate devices first
      const devices = await navigator.mediaDevices.enumerateDevices()
      const hasCam = devices.some(d => d.kind === 'videoinput')
      const hasMic = devices.some(d => d.kind === 'audioinput')

      // Step 2: build constraints progressively
      const baseConstraints: MediaStreamConstraints = {
        audio: hasMic ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
        video: hasCam ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false
      }

      // Step 3: request
      const stream = await navigator.mediaDevices.getUserMedia(baseConstraints)
      attachLocalPreview(stream) // your existing preview hookup
      setPhase('ready')
      return
    } catch (e: any) {
      const { name, message } = e || {}
      
      // Fallback: If video fails with DEVICE_IN_USE or NotReadableError but audio is likely available
      if ((name === 'NotReadableError' || name === 'OverconstrainedError') && e.constraint !== 'audio') {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          setIsAudioOnlyMode(true)
          setIsVideoEnabled(false)
          setPhase('ready')
          return
        } catch (audioError) {
          // If audio also fails, continue with original error handling
        }
      }
      
      // Granular mapping
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError({ code: 'PERMISSION_DENIED', message: 'Camera/Microphone permission denied.', hint: 'Enable permissions in Settings and retry.' })
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setError({ code: 'DEVICE_UNAVAILABLE', message: 'No usable camera or microphone found.', hint: 'Check connections or select a different device.' })
      } else if (name === 'NotReadableError') {
        setError({ code: 'DEVICE_IN_USE', message: 'Camera or microphone is already in use by another app.', hint: 'Close other apps using the camera/mic and retry.' })
      } else if (name === 'AbortError') {
        setError({ code: 'ABORTED', message: 'Device access was interrupted.', hint: 'Retry. If this persists, restart the app.' })
      } else {
        setError({ code: 'UNKNOWN', message: 'Could not start preview.', hint: (message || 'Retry or check device settings.') })
      }
      setPhase('error')
    }
  }

  // Add/remove dimming class on mount/unmount
  useEffect(() => {
    document.documentElement.classList.add('precall-open')
    return () => {
      document.documentElement.classList.remove('precall-open')
    }
  }, [])

  // Initialize media on mount
  useEffect(() => {
    setPhase('requesting-permissions')
    initMedia()
  }, [])

  // Attach stream to video element (simplified - no polling)
  useEffect(() => {
    // Only set isInitializing to false when phase changes
    setIsInitializing(phase !== 'initializing-media' && phase !== 'requesting-permissions')
  }, [phase])

  // Audio level monitoring
  useEffect(() => {
    if (!isMicEnabled || isInitializing) return

    const setupAudioAnalysis = () => {
      const stream = mediaManager.getLocalStream()
      if (!stream) return

      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const analyser = audioContext.createAnalyser()
        const source = audioContext.createMediaStreamSource(stream)
        
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.8
        source.connect(analyser)
        
        audioContextRef.current = audioContext
        analyserRef.current = analyser

        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        
        const updateLevel = () => {
          if (!analyserRef.current) return
          
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
          setAudioLevel(Math.min(100, (average / 128) * 100))
          
          animationFrameRef.current = requestAnimationFrame(updateLevel)
        }
        
        updateLevel()
      } catch (err) {
        console.warn('[PreCallLobby] Failed to setup audio analysis:', err)
      }
    }

    setupAudioAnalysis()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      analyserRef.current = null
    }
  }, [isMicEnabled, isInitializing])

  // Network status monitoring
  useEffect(() => {
    if (!isInitializing && mediaManager.getLocalStream()) {
      setNetworkStatus('ok')
    }
  }, [isInitializing])

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

  const handleBackToLobby = useCallback(async () => {
    try {
      // Release all media resources before going back
      await orchestrateStop('user_back_to_lobby')
    } catch (error) {
      console.warn('[PreCallLobby] Failed to stop media:', error)
    } finally {
      // Always call onBack even if media stop fails
      onBack?.()
    }
  }, [onBack])

  const handleEnterCall = useCallback(async () => {
    try {
      // Use existing join flow to transition to SESSION_JOINING then LIVE
      if (videoRef.current) {
        confirmJoin(videoRef.current)
      }
    } catch (error) {
      console.error('[PreCallLobby] Failed to enter call:', error)
    }
  }, [confirmJoin])

  const handleConfirmRules = useCallback(() => {
    setRulesConfirmed(true)
  }, [])

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

  const retryPreflight = async () => {
    setPhase('requesting-permissions')
    setError(null)
    setShowErrorDetails(false)
    initMedia()
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-background flex flex-col safe-area-insets overflow-hidden"
      role="dialog"
      aria-labelledby="precall-header"
      aria-modal="true"
    >
      {/* Back to Lobby Freeze Pane */}
      <div className="flex-shrink-0 bg-background/95 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="flex items-center p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToLobby}
            className="flex items-center gap-2 hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="font-medium">Back to Lobby</span>
          </Button>
        </div>
      </div>

      {/* Preflight Status Bar */}
      <div className="flex-shrink-0 bg-background border-b">
        {phase === 'error' ? (
          <div className="bg-destructive/10 border-destructive/20 border-b">
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">{error?.message}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={retryPreflight}
                    className="h-7 px-3 text-xs"
                  >
                    Try again
                  </Button>
                  {error?.hint && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowErrorDetails(!showErrorDetails)}
                      className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <span className="mr-1">Details</span>
                      {showErrorDetails ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
              {showErrorDetails && error?.hint && (
                <div className="text-xs text-destructive/80 bg-destructive/5 p-2 rounded">
                  {error.hint}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {phase === 'requesting-permissions' && (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                  <span>Requesting camera & mic…</span>
                </>
              )}
              {phase === 'initializing-media' && (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                  <span>Starting preview…</span>
                </>
              )}
              {phase === 'ready' && (
                <>
                  <div className="h-2 w-2 rounded-full bg-primary"></div>
                  <span>Preview ready</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Header */}
      <header className="flex-shrink-0 p-4 border-b">
        <h1 id="precall-header" className="text-xl font-semibold text-center">
          Pre-Call Lobby
        </h1>
        <p className="text-sm text-muted-foreground text-center mt-2 max-w-2xl mx-auto">
          This is your private space to observe the user before the call begins. The user cannot see or hear you yet. 
          Use this time to review your 'cannot-say' rules, adjust your mic and camera, and make sure you feel safe before starting.
        </p>
      </header>

      {/* Body - Scrollable */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6 min-h-full flex flex-col">
          {/* Video Previews */}
          <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-[400px]">
            {/* Self Preview */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium">Your Camera</h2>
                {isAudioOnlyMode && (
                  <Badge variant="secondary" className="text-xs">
                    Video unavailable - Audio only
                  </Badge>
                )}
              </div>
              <Card className="flex-1 min-h-[200px] overflow-hidden relative">
                {isVideoEnabled && !isInitializing && !isAudioOnlyMode ? (
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    muted
                    autoPlay
                    playsInline
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover' 
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      {isInitializing ? (
                        <div className="space-y-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                          <p className="text-sm">Initializing camera...</p>
                        </div>
                      ) : isAudioOnlyMode ? (
                        <div className="space-y-2">
                          <Mic className="h-12 w-12 mx-auto" />
                          <p className="text-sm">Audio-only mode</p>
                          <p className="text-xs opacity-80">Camera unavailable</p>
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
              
              {/* Camera Controls */}
              <div className="flex justify-center gap-4 py-3">
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

              {/* Audio Level and Network Status */}
              <div className="flex items-center justify-center gap-6 py-2">
                {/* Audio Level Meter */}
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-muted-foreground" />
                  <div className="flex gap-1">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-3 rounded-full transition-colors ${
                          audioLevel > (i * 12.5) 
                            ? 'bg-primary' 
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Network Status */}
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-muted-foreground" />
                  <Badge 
                    variant={networkStatus === 'ok' ? 'default' : 'secondary'}
                    className="text-xs px-2 py-1"
                  >
                    {networkStatus === 'checking' ? 'Checking...' : 
                     networkStatus === 'ok' ? 'OK' : 'Degraded'}
                  </Badge>
                </div>
              </div>
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
              
              {/* Report User Control */}
              <div className="flex justify-center py-3">
                <ReportDialog
                  reportedUserId="participant_id" // TODO: Replace with actual participant ID
                  reportedUserName="Participant" // TODO: Replace with actual participant name
                  trigger={
                    <Button
                      size="lg"
                      variant="destructive"
                      aria-label="Report user"
                      className="h-12 w-12 rounded-full p-0 bg-red-600 hover:bg-red-700"
                    >
                      <Flag className="h-5 w-5" />
                    </Button>
                  }
                />
              </div>
            </div>
          </div>


          {/* Quick Words Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-medium mb-3">Community Guidelines</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Type specific words or phrases and press Enter to add them as removable chips:
              </p>
              <Input
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder="Type words and press Enter..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newItemText.trim()) {
                    addNewItem()
                  }
                }}
                className="mb-3"
              />
              
              {/* Word Chips */}
              {cannotSayList.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {cannotSayList.map((item) => (
                    <Badge
                      key={item.id}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/20 group"
                      onClick={() => removeItem(item.id)}
                    >
                      {item.label}
                      <X className="h-3 w-3 ml-1 group-hover:text-destructive" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="space-y-2">
              {!rulesConfirmed ? (
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleConfirmRules}
                >
                  Confirm Rules
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleEnterCall}
                >
                  Enter Call
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={handleBackToLobby}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}