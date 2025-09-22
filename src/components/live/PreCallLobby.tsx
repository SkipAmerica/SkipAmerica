import { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Mic, MicOff, Video, VideoOff, X, ArrowLeft, Flag, Wifi, AlertCircle, ChevronDown, ChevronRight, Settings } from 'lucide-react'
import { MediaPreview } from './MediaPreview'
import { mediaManager, orchestrateInit, orchestrateStop, routeMediaError } from '@/media/MediaOrchestrator'
import { ReportDialog } from '@/components/safety/ReportDialog'
import { useLive } from '@/hooks/live'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

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
  
  // Device selection
  const [availableDevices, setAvailableDevices] = useState<{audio: MediaDeviceInfo[], video: MediaDeviceInfo[]}>({audio: [], video: []})
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('')
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('')
  const [showDeviceHelper, setShowDeviceHelper] = useState(false)
  const [needsUserGesture, setNeedsUserGesture] = useState(false)
  
  // Editing state for cannot-say list
  const [editableList, setEditableList] = useState(DEV_CANNOT_SAY_LIST)
  const [newItemText, setNewItemText] = useState('')

  const { confirmJoin } = useLive()
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

  // Media initialization using MediaOrchestrator
  const cleanupMedia = async () => {
    try {
      await orchestrateStop('precall_cleanup')
    } catch (error) {
      console.warn('[PreCallLobby] Failed to cleanup media:', error)
    }
  }

  // Analytics tracking (non-PII)
  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    // Fire analytics event - replace with your analytics system
    console.log(`[Analytics] ${eventName}`, properties)
  }

  async function initMedia() {
    setError(null)
    setPhase('initializing-media')
    setIsAudioOnlyMode(false)
    
    try {
      // Enumerate devices first
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioDevices = devices.filter(d => d.kind === 'audioinput' && d.deviceId)
      const videoDevices = devices.filter(d => d.kind === 'videoinput' && d.deviceId)
      
      setAvailableDevices({audio: audioDevices, video: videoDevices})
      
      // Set default selected devices if not already set
      if (!selectedAudioDevice && audioDevices.length > 0) {
        setSelectedAudioDevice(audioDevices[0].deviceId)
      }
      if (!selectedVideoDevice && videoDevices.length > 0) {
        setSelectedVideoDevice(videoDevices[0].deviceId)
      }
      
      // Use MediaOrchestrator for media initialization  
      const audioConstraints = audioDevices.length > 0 ? { 
        deviceId: selectedAudioDevice || audioDevices[0]?.deviceId,
        echoCancellation: true, 
        noiseSuppression: true, 
        autoGainControl: true 
      } : true
      
      const videoConstraints = videoDevices.length > 0 && isVideoEnabled ? { 
        deviceId: selectedVideoDevice || videoDevices[0]?.deviceId,
        facingMode: 'user', 
        width: { ideal: 1280 }, 
        height: { ideal: 720 } 
      } : isVideoEnabled
      
      const stream = await orchestrateInit({
        targetState: 'SESSION_PREP',
        previewOnly: true,
        audio: isMicEnabled ? audioConstraints : false,
        video: videoConstraints
      })
      
      // Track successful initialization
      const hasAudio = stream.getAudioTracks().length > 0
      const hasVideo = stream.getVideoTracks().length > 0
      trackEvent('creator_precall_media_initialized', { audio: hasAudio, video: hasVideo })
      
      setPhase('ready')
    } catch (e: any) {
      const { code, name, message } = e || {}
      
      // Track media error
      trackEvent('creator_precall_media_error', { 
        code: code || name, 
        name: name || 'UNKNOWN', 
        message 
      })
      
      // Try audio-only fallback for some errors
      if ((code === 'HARDWARE_ERROR' || name === 'NotReadableError') && isVideoEnabled) {
        try {
          console.log('[PreCallLobby] Trying audio-only fallback...')
          const fallbackAudioConstraints = availableDevices.audio.length > 0 ? { 
            deviceId: selectedAudioDevice || availableDevices.audio[0]?.deviceId,
            echoCancellation: true, 
            noiseSuppression: true, 
            autoGainControl: true 
          } : true
          
          await orchestrateInit({
            targetState: 'SESSION_PREP',
            previewOnly: true,
            audio: isMicEnabled ? fallbackAudioConstraints : false,
            video: false
          })
          
          setIsAudioOnlyMode(true)
          setIsVideoEnabled(false)
          trackEvent('creator_precall_media_initialized', { audio: true, video: false })
          setPhase('ready')
          return
        } catch (audioError) {
          console.warn('[PreCallLobby] Audio-only fallback also failed:', audioError)
        }
      }
      
      // Handle errors with MediaOrchestrator error routing
      routeMediaError(e)
      
      // Map to local error state for UI
      if (code === 'PERMISSION_DENIED' || name === 'NotAllowedError') {
        trackEvent('creator_precall_permissions_denied', { code: name })
        setError({ 
          code: 'PERMISSION_DENIED', 
          message: 'Permission needed', 
          hint: 'Enable camera & mic in Settings > Privacy.' 
        })
      } else if (code === 'DEVICE_NOT_FOUND' || name === 'NotFoundError') {
        setError({ 
          code: 'DEVICE_UNAVAILABLE', 
          message: 'No devices found', 
          hint: 'Try switching devices or reconnecting your camera.' 
        })
      } else if (code === 'HARDWARE_ERROR' || name === 'NotReadableError') {
        setError({ 
          code: 'DEVICE_IN_USE', 
          message: 'Camera/Mic busy', 
          hint: 'Close other apps using your camera or microphone, then try again.' 
        })
      } else {
        setError({ 
          code: 'UNKNOWN', 
          message: 'Couldn\'t start preview', 
          hint: 'Try switching devices or reconnecting your camera.' 
        })
      }
      setPhase('error')
    }
  }

  // Add/remove dimming class on mount/unmount
  useEffect(() => {
    document.documentElement.classList.add('precall-open')
    return () => {
      document.documentElement.classList.remove('precall-open')
      cleanupMedia().catch(console.warn)
    }
  }, [])

  // Initialize media on mount
  useEffect(() => {
    // More accurate Safari detection
    const isSafari = /Safari/.test(navigator.userAgent) && 
                    !/Chrome|CriOS|FxiOS|EdgiOS/.test(navigator.userAgent)
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
    
    if (isSafari || isIOS) {
      setNeedsUserGesture(true)
      setPhase('idle')
    } else {
      setPhase('requesting-permissions')
      trackEvent('creator_precall_permissions_requested')
      initMedia()
    }
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
      
      // Restart media with new settings through MediaOrchestrator
      await cleanupMedia()
      
      // Only restart if we're in ready state
      if (phase === 'ready') {
        await initMedia()
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
      // Create temporary video elements for confirmJoin
      // MediaOrchestrator already has the stream attached
      const tempVideo = document.createElement('video')
      tempVideo.muted = true
      tempVideo.autoplay = true
      tempVideo.playsInline = true
      
      // Attach the current stream to the temp video element
      const stream = mediaManager.getLocalStream()
      if (stream) {
        tempVideo.srcObject = stream
      }
      
      confirmJoin(tempVideo)
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
      
      // Update audio track enabled state if stream exists from MediaManager
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

  // Device switching handlers
  const handleAudioDeviceChange = async (deviceId: string) => {
    setSelectedAudioDevice(deviceId)
    trackEvent('creator_precall_device_switched', { audioId: deviceId })
    await cleanupMedia()
    await initMedia()
  }

  const handleVideoDeviceChange = async (deviceId: string) => {
    setSelectedVideoDevice(deviceId)
    trackEvent('creator_precall_device_switched', { videoId: deviceId })
    await cleanupMedia()
    await initMedia()
  }

  // Enter Call availability logic
  const canEnterCall = () => {
    if (phase !== 'ready') return false
    // Allow if MediaManager has stream or audio-only fallback is active
    return mediaManager.hasLocalStream() || isAudioOnlyMode
  }

  const getCallButtonText = () => {
    if (!canEnterCall()) {
      if (phase === 'error') return 'Fix issues to continue'
      if (phase === 'requesting-permissions' || phase === 'initializing-media') return 'Preparing...'
      return 'No inputs available'
    }
    return 'Enter Call'
  }

  const retryPreflight = async () => {
    trackEvent('creator_precall_retry_clicked')
    setPhase('requesting-permissions')
    setError(null)
    setShowErrorDetails(false)
    await cleanupMedia()
    await initMedia()
  }

  const startPreviewWithGesture = () => {
    setNeedsUserGesture(false)
    setPhase('requesting-permissions')
    trackEvent('creator_precall_permissions_requested')
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
                  {error?.code === 'DEVICE_IN_USE' && (
                    <Dialog open={showDeviceHelper} onOpenChange={setShowDeviceHelper}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                        >
                          Check usage
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-sm">Device Usage Helper</DialogTitle>
                          <DialogDescription className="text-xs">
                            Common apps that may be using your camera or microphone:
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                          <div className="text-xs space-y-1">
                            <p className="font-medium">Desktop Apps:</p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-0.5 ml-2">
                              <li>FaceTime, Skype, Zoom, Teams</li>
                              <li>OBS, QuickTime Screen Recording</li>
                              <li>Photo Booth, Camera app</li>
                            </ul>
                          </div>
                          <div className="text-xs space-y-1">
                            <p className="font-medium">Browser Tabs:</p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-0.5 ml-2">
                              <li>Other video call websites</li>
                              <li>Camera test websites</li>
                            </ul>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setShowDeviceHelper(false)
                              cleanupMedia()
                              initMedia()
                            }}
                            className="w-full text-xs"
                          >
                            Force reset preview
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
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

      {/* Start Preview Button (iOS/Safari user gesture requirement) */}
      {needsUserGesture && phase === 'idle' && (
        <div className="flex-shrink-0 bg-background border-b p-3">
          <div className="flex items-center justify-center">
            <Button onClick={startPreviewWithGesture} className="px-6">
              Start Preview
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Tap to enable camera and microphone access
          </p>
        </div>
      )}

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
                  <MediaPreview 
                    className="w-full h-full object-cover"
                    muted={true}
                    autoPlay={true}
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
              
              {/* Device Selection (only if multiple devices) */}
              {(availableDevices.audio.length > 1 || availableDevices.video.length > 1) && (
                <div className="space-y-2 py-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Settings className="h-3 w-3" />
                    <span>Device Selection</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {availableDevices.audio.length > 1 && (
                      <Select value={selectedAudioDevice} onValueChange={handleAudioDeviceChange}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select microphone" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg">
                          {availableDevices.audio.map(device => (
                            <SelectItem key={device.deviceId} value={device.deviceId} className="text-xs">
                              {device.label || `Microphone ${device.deviceId.slice(-4)}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {availableDevices.video.length > 1 && (
                      <Select value={selectedVideoDevice} onValueChange={handleVideoDeviceChange}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select camera" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg">
                          {availableDevices.video.map(device => (
                            <SelectItem key={device.deviceId} value={device.deviceId} className="text-xs">
                              {device.label || `Camera ${device.deviceId.slice(-4)}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              )}
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
                  disabled={!canEnterCall()}
                >
                  {getCallButtonText()}
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