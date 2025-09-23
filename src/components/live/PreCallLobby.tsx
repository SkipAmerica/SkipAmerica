import { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Mic, MicOff, Video, VideoOff, X, ArrowLeft, Flag, Wifi, AlertCircle, ChevronDown, ChevronRight, Settings, Camera, CameraOff } from 'lucide-react'
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
  // NEW: gate media init behind an explicit user gesture
  const [previewRequested, setPreviewRequested] = useState(false);
  const [phase, setPhase] = useState<"idle"|"initializing"|"ready"|"error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true)
  const [rulesConfirmed, setRulesConfirmed] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [networkStatus, setNetworkStatus] = useState<'checking' | 'ok' | 'degraded'>('checking')
  
  const [error, setError] = useState<{code: string; message: string; hint?: string} | null>(null)
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  const [isAudioOnlyMode, setIsAudioOnlyMode] = useState(false)
  
  // Device selection
  const [availableDevices, setAvailableDevices] = useState<{audio: MediaDeviceInfo[], video: MediaDeviceInfo[]}>({audio: [], video: []})
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('')
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('')
  const [showDeviceHelper, setShowDeviceHelper] = useState(false)
  
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

  // Ensure any previous tracks are closed before (re)starting
  const cleanupMedia = useCallback(async () => {
    const s = localStreamRef.current;
    if (s) {
      s.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    // Also cleanup orchestrator media
    try {
      await orchestrateStop('precall_cleanup')
    } catch (error) {
      console.warn('[PreCallLobby] Failed to cleanup media:', error)
    }
  }, [])

  // Basic local preview init for explicit user gesture
  const initLocalPreview = useCallback(async () => {
    setPhase("initializing");
    setErrorMsg(null);
    try {
      // Basic, safe constraints (adjust to your defaults)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      cleanupMedia();
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play().catch(() => {});
      }
      setPhase("ready");
    } catch (e: any) {
      const name = e?.name || "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setErrorMsg("Camera/Microphone permission denied. Please enable and try again.");
      } else if (name === "NotReadableError") {
        setErrorMsg("Camera or microphone appears to be in use by another app. Close it and try again.");
      } else {
        setErrorMsg("Could not start preview. Please try again.");
      }
      setPhase("error");
    }
  }, [cleanupMedia]);

  // The only way to start preview now: explicit click
  const startPreview = useCallback(async () => {
    if (previewRequested) return;
    setPreviewRequested(true);
    await initLocalPreview();
  }, [previewRequested, initLocalPreview]);

  // Analytics tracking (non-PII)
  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    // Fire analytics event - replace with your analytics system
    console.log(`[Analytics] ${eventName}`, properties)
  }

  // Clean up tracks when leaving the lobby (or when re-trying)
  useEffect(() => {
    return () => {
      cleanupMedia().catch(console.warn);
    };
  }, [cleanupMedia]);

  // IMPORTANT: Disable any previous auto-init on mount.
  // Initialize on component mount - wait for user gesture
  useEffect(() => {
    // Start in idle phase for all browsers - only initialize after user clicks "Start Preview"
    setPhase('idle')
  }, [])

  // Attach stream to video element (simplified - no polling)
  useEffect(() => {
    // Only set isInitializing to false when phase changes
    setIsInitializing(phase !== 'initializing')
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
        await startPreview()
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
    await startPreview()
  }

  const handleVideoDeviceChange = async (deviceId: string) => {
    setSelectedVideoDevice(deviceId)
    trackEvent('creator_precall_device_switched', { videoId: deviceId })
    await cleanupMedia()
    await startPreview()
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
      if (phase === 'initializing') return 'Preparing...'
      return 'No inputs available'
    }
    return 'Enter Call'
  }

  const retryPreflight = async () => {
    trackEvent('creator_precall_retry_clicked')
    setPreviewRequested(false);
    setPhase('idle')
    setError(null)
    setShowErrorDetails(false)
    await cleanupMedia()
    await startPreview()
  }

  const startPreviewWithGesture = () => {
    trackEvent('creator_precall_permissions_requested')
    startPreview()
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
                              startPreview()
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
              {phase === 'initializing' && (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                  <span>Requesting camera & mic…</span>
                </>
              )}
              {phase === 'initializing' && (
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

      {/* Start Preview Button - Shows for all browsers when idle */}
      {phase === 'idle' && (
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
                {/* Show manual start button if preview not requested */}
                {!previewRequested && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
                    <div className="text-center">
                      <Button
                        onClick={startPreview}
                        size="lg"
                        className="mb-2"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Start Preview
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Click to enable camera and microphone
                      </p>
                    </div>
                  </div>
                )}

                {/* Error state */}
                {phase === 'error' && previewRequested && (
                  <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 z-10">
                    <div className="text-center p-4">
                      <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                      <p className="text-sm text-destructive mb-2">{errorMsg}</p>
                      <Button
                        onClick={startPreview}
                        size="sm"
                        variant="destructive"
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                )}

                {/* Video preview or fallback */}
                {previewRequested && phase === 'ready' && localStreamRef.current ? (
                  <video
                    ref={localVideoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    aria-label="Your camera preview"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      {phase === 'initializing' && previewRequested ? (
                        <div className="space-y-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                          <p className="text-sm">Starting preview...</p>
                        </div>
                      ) : !previewRequested ? (
                        <div className="space-y-2">
                          <CameraOff className="h-12 w-12 mx-auto" />
                          <p className="text-sm">Preview ready</p>
                          <p className="text-xs opacity-80">Click "Start Preview" to begin</p>
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