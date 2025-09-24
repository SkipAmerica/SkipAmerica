import { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Mic, MicOff, Video, VideoOff, X, ArrowLeft, Flag, Wifi, Settings } from 'lucide-react'
import { MediaPreview } from './MediaPreview'
import { mediaManager, orchestrateStop, orchestrateInit } from '@/media/MediaOrchestrator'
import { ReportDialog } from '@/components/safety/ReportDialog'
import { useLive } from '@/hooks/live'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
}

export default function PreCallLobby({ onBack }: PreCallLobbyProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [isInitializing, setIsInitializing] = useState(false)
  const [previewStarted, setPreviewStarted] = useState(false)
  const [streamAvailable, setStreamAvailable] = useState(false)
  const [rulesConfirmed, setRulesConfirmed] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [networkStatus, setNetworkStatus] = useState<'checking' | 'ok' | 'degraded'>('checking')
  
  // Device selection
  const [availableDevices, setAvailableDevices] = useState<{audio: MediaDeviceInfo[], video: MediaDeviceInfo[]}>({audio: [], video: []})
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('')
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('')
  
  // Editing state for cannot-say list
  const [editableList, setEditableList] = useState(DEV_CANNOT_SAY_LIST)
  const [newItemText, setNewItemText] = useState('')

  const { confirmJoin } = useLive()
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const cannotSayList = editableList

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

  // Cleanup MediaOrchestrator on unmount
  const cleanupMedia = useCallback(async () => {
    try {
      await orchestrateStop('precall_cleanup')
    } catch (error) {
      console.warn('[PreCallLobby] Failed to cleanup media:', error)
    }
  }, [])

  // Analytics tracking (non-PII)
  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    // Fire analytics event - replace with your analytics system
    console.log(`[Analytics] ${eventName}`, properties)
  }

  // Clean up MediaOrchestrator on unmount
  useEffect(() => {
    return () => {
      cleanupMedia().catch(console.warn);
    };
  }, [cleanupMedia]);

  // Poll for stream availability after preview starts
  useEffect(() => {
    if (!previewStarted) {
      setStreamAvailable(false)
      return
    }

    const pollForStream = () => {
      const hasStream = mediaManager.hasLocalStream()
      setStreamAvailable(hasStream)
      
      if (hasStream) {
        setNetworkStatus('ok')
      } else if (previewStarted) {
        setNetworkStatus('checking')
      }
    }

    // Initial check
    pollForStream()
    
    // Poll every 100ms until stream is available
    const interval = setInterval(pollForStream, 100)
    
    return () => clearInterval(interval)
  }, [previewStarted])

  // Handle preview start
  const startPreview = useCallback(async () => {
    if (previewStarted) return
    
    setIsInitializing(true)
    setPreviewStarted(true)
    
    try {
      await orchestrateInit({
        targetState: 'SESSION_PREP',
        previewOnly: true,
        video: true,
        audio: true
      })
      setIsInitializing(false)
    } catch (error) {
      console.error('[PreCallLobby] Failed to start preview:', error)
      setIsInitializing(false)
      setPreviewStarted(false)
    }
  }, [previewStarted])

  // Audio level monitoring
  useEffect(() => {
    if (!isMicEnabled || !streamAvailable) return

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
        setAudioLevel(0)
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
      setAudioLevel(0)
    }
  }, [isMicEnabled, streamAvailable])

  // Handle video toggle
  const toggleVideo = async () => {
    try {
      const newVideoState = !isVideoEnabled
      setIsVideoEnabled(newVideoState)
      
      const stream = mediaManager.getLocalStream()
      if (stream) {
        const videoTracks = stream.getVideoTracks()
        videoTracks.forEach(track => {
          track.enabled = newVideoState
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
    // TODO: Implement device switching with MediaOrchestrator
  }

  const handleVideoDeviceChange = async (deviceId: string) => {
    setSelectedVideoDevice(deviceId)
    trackEvent('creator_precall_device_switched', { videoId: deviceId })
    // TODO: Implement device switching with MediaOrchestrator
  }

  // Enter Call availability logic
  const canEnterCall = () => {
    return mediaManager.hasLocalStream()
  }

  const getCallButtonText = () => {
    if (!canEnterCall()) {
      if (isInitializing) return 'Preparing...'
      return 'No inputs available'
    }
    return 'Enter Call'
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
          <div className="p-3 flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isInitializing && previewStarted && (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                  <span>Requesting camera & mic…</span>
                </>
              )}
              {!isInitializing && mediaManager.hasLocalStream() && (
                <>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Ready</span>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Wifi className="h-3 w-3" />
                    <span className="capitalize">{networkStatus}</span>
                  </div>
                </>
              )}
              {!previewStarted && (
                <span>Click "Start Preview" to begin</span>
              )}
            </div>
          </div>
      </div>

      {/* Safety Notice */}
      <div className="flex-shrink-0 bg-muted/30 border-b">
        <div className="p-4">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-sm text-foreground leading-relaxed">
              This is your private space to observe the user before the call begins. The user cannot see or hear you yet. Use this time to review your 'cannot-say' rules, adjust your mic and camera, and make sure you feel safe before starting.
            </p>
          </div>
        </div>
      </div>

      {/* Camera Preview Tiles */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 space-y-6">
          <div className="space-y-4">
            {/* Your Preview - Full Width and 2.5x Height */}
            <div className="flex flex-col">
              <h2 className="text-sm font-medium mb-2">Your Preview</h2>
              <Card className="w-full min-h-[750px] overflow-hidden relative">
                {previewStarted ? (
                  <MediaPreview className="w-full h-full" />
                ) : (
                  <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                    <div className="text-center">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                        <Video className="h-6 w-6" />
                      </div>
                      <Button onClick={startPreview} variant="default" className="mb-2">
                        Start Preview
                      </Button>
                      <p className="text-sm text-muted-foreground">Click to request camera access</p>
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
                  disabled={!previewStarted || isInitializing}
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
                  {streamAvailable && isMicEnabled ? (
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
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {!streamAvailable && previewStarted ? 'Checking...' : 'Off'}
                    </span>
                  )}
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