import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { Room, RoomEvent, RemoteParticipant, RemoteTrack, LocalVideoTrack } from 'livekit-client'
import { fetchLiveKitToken } from '@/lib/sfuToken'
import { useToast } from '@/hooks/use-toast'
import { MEDIA } from '../config'
import {
  createRoom,
  createLocalTracksWithFallback,
  publishTracks,
  stopLocalTracks,
  switchCamera,
  classifyMediaError,
} from '../lib/livekitClient'
import type { TrackRef } from '../components/VideoTile'

interface MediaContext {
  // Connection
  room?: Room
  connected: boolean
  connecting: boolean
  connectionState: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed'
  permissionError?: { error: Error; type: 'denied' | 'not_found' | 'in_use' | 'unknown' }
  tokenError?: { is401Or403: boolean; message: string }
  needsAudioUnlock: boolean
  
  // Local tracks
  localVideo?: TrackRef
  localAudio?: TrackRef
  micEnabled: boolean
  camEnabled: boolean
  facingMode: 'user' | 'environment'
  isFlippingCamera: boolean
  currentQualityLevel: number
  
  // Remote tracks
  primaryRemoteVideo?: TrackRef
  primaryRemoteAudio?: TrackRef
  primaryRemoteId?: string
  activeSpeakerId?: string
  
  // Roster
  participants: Array<{ id: string; identity: string; isLocal: boolean }>
  
  // Device state
  cachedDeviceIds?: { audio?: string; video?: string }
  cachedFacingMode?: 'user' | 'environment'
  audioOutputDevices?: MediaDeviceInfo[]
  
  // Actions
  join: (sessionId: string, identity: string, role: 'creator' | 'user') => Promise<void>
  leave: () => Promise<void>
  toggleMic: () => Promise<void>
  toggleCam: () => Promise<void>
  flipCamera: () => Promise<void>
  setPrimaryRemote: (participantId?: string) => void
  retryPermissions: () => Promise<void>
  unlockAudio: () => Promise<void>
  retryConnection: () => Promise<void>
  switchAudioOutput: (deviceId: string) => Promise<void>
}

const MediaContext = createContext<MediaContext | undefined>(undefined)

export function useMedia() {
  const context = useContext(MediaContext)
  if (!context) throw new Error('useMedia must be used within MediaProvider')
  return context
}

export function MediaProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()
  
  // Idempotent state setter helper to prevent no-op re-renders
  const setIfChanged = useCallback(<T,>(current: T, next: T, setter: (value: T) => void) => {
    if (Object.is(current, next)) return
    setter(next)
  }, [])
  
  // Connection state
  const [room, setRoom] = useState<Room>()
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [connectionState, setConnectionState] = useState<MediaContext['connectionState']>('disconnected')
  const [permissionError, setPermissionError] = useState<MediaContext['permissionError']>()
  const [tokenError, setTokenError] = useState<MediaContext['tokenError']>()
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false)
  
  // Local state
  const [localVideo, setLocalVideo] = useState<TrackRef>()
  const [localAudio, setLocalAudio] = useState<TrackRef>()
  const [micEnabled, setMicEnabled] = useState(MEDIA.START_AUDIO)
  const [camEnabled, setCamEnabled] = useState(MEDIA.START_VIDEO)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [isFlippingCamera, setIsFlippingCamera] = useState(false)
  const [currentQualityLevel, setCurrentQualityLevel] = useState(0)
  
  // Remote state
  const [primaryRemoteVideo, setPrimaryRemoteVideo] = useState<TrackRef>()
  const [primaryRemoteAudio, setPrimaryRemoteAudio] = useState<TrackRef>()
  const [primaryRemoteId, setPrimaryRemoteId] = useState<string>()
  const [activeSpeakerId, setActiveSpeakerId] = useState<string>()
  
  // Roster
  const [participants, setParticipants] = useState<MediaContext['participants']>([])
  
  // Device cache
  const [cachedDeviceIds, setCachedDeviceIds] = useState<{ audio?: string; video?: string }>()
  const [cachedFacingMode, setCachedFacingMode] = useState<'user' | 'environment'>()
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>()
  
  // Refs
  const joinParamsRef = useRef<{ sessionId: string; identity: string; role: 'creator' | 'user' }>()
  const joinInProgressRef = useRef(false)
  const connectedOnceRef = useRef(false)
  const flipDebounceRef = useRef<NodeJS.Timeout>()
  const audioUnlockedRef = useRef(false)
  const shouldSampleAnalytics = useRef(Math.random() < MEDIA.ANALYTICS_SAMPLE_RATE)
  
  // Analytics helper
  const mark = useCallback((name: string) => {
    if (!shouldSampleAnalytics.current) return
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name)
    }
  }, [])
  
  // Refresh participants roster
  const refreshParticipants = useCallback(() => {
    if (!room) return
    
    const roster: MediaContext['participants'] = [
      {
        id: room.localParticipant.sid,
        identity: room.localParticipant.identity,
        isLocal: true,
      }
    ]
    
    room.remoteParticipants.forEach(rp => {
      roster.push({
        id: rp.sid,
        identity: rp.identity,
        isLocal: false,
      })
    })
    
    setParticipants(roster)
  }, [room])
  
  // Refresh track refs
  const refreshTracks = useCallback(() => {
    if (!room) return
    
    // Local tracks
    const localVideoTrack = room.localParticipant.videoTrackPublications.values().next().value?.track
    const localAudioTrack = room.localParticipant.audioTrackPublications.values().next().value?.track
    
    const nextLocalVideo = localVideoTrack ? {
      participantId: room.localParticipant.sid,
      track: localVideoTrack,
      kind: 'video' as const,
      isLocal: true,
    } : undefined
    
    const nextLocalAudio = localAudioTrack ? {
      participantId: room.localParticipant.sid,
      track: localAudioTrack,
      kind: 'audio' as const,
      isLocal: true,
    } : undefined
    
    setIfChanged(localVideo, nextLocalVideo, setLocalVideo)
    setIfChanged(localAudio, nextLocalAudio, setLocalAudio)
    
    // Remote tracks (first remote participant for 1:1)
    const firstRemote = Array.from(room.remoteParticipants.values())[0]
    if (firstRemote) {
      const remoteVideoTrack = firstRemote.videoTrackPublications.values().next().value?.track
      const remoteAudioTrack = firstRemote.audioTrackPublications.values().next().value?.track
      
      const nextRemoteVideo = remoteVideoTrack ? {
        participantId: firstRemote.sid,
        track: remoteVideoTrack,
        kind: 'video' as const,
        isLocal: false,
      } : undefined
      
      const nextRemoteAudio = remoteAudioTrack ? {
        participantId: firstRemote.sid,
        track: remoteAudioTrack,
        kind: 'audio' as const,
        isLocal: false,
      } : undefined
      
      if (remoteVideoTrack) mark('first_remote_video')
      
      setIfChanged(primaryRemoteVideo, nextRemoteVideo, setPrimaryRemoteVideo)
      setIfChanged(primaryRemoteAudio, nextRemoteAudio, setPrimaryRemoteAudio)
      setIfChanged(primaryRemoteId, firstRemote.sid, setPrimaryRemoteId)
    } else {
      setIfChanged(primaryRemoteVideo, undefined, setPrimaryRemoteVideo)
      setIfChanged(primaryRemoteAudio, undefined, setPrimaryRemoteAudio)
      setIfChanged(primaryRemoteId, undefined, setPrimaryRemoteId)
    }
  }, [room, mark, localVideo, localAudio, primaryRemoteVideo, primaryRemoteAudio, primaryRemoteId, setIfChanged])
  
  // Join room
  const join = useCallback(async (sessionId: string, identity: string, role: 'creator' | 'user') => {
    // Guard: prevent duplicate joins
    if (joinInProgressRef.current || connecting || connected) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[MediaProvider] Join blocked (already joining/connected)')
      }
      return
    }
    
    joinInProgressRef.current = true
    setConnecting(true)
    setConnectionState('connecting')
    setPermissionError(undefined)
    setTokenError(undefined)
    joinParamsRef.current = { sessionId, identity, role }
    
    mark('lk_join_start')
    
    let newRoom: Room | undefined
    let localTracks: any[] = []
    
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[MediaProvider] Step 1: Creating local tracks...')
      }
      
      // Step 1: Create local tracks BEFORE connecting
      const { tracks, usedConstraints } = await createLocalTracksWithFallback({
        audio: MEDIA.START_AUDIO,
        video: MEDIA.START_VIDEO,
        facingMode: cachedFacingMode || 'user',
        cachedDeviceIds,
      })
      localTracks = tracks
      
      // Cache device IDs
      const videoTrack = tracks.find(t => t.kind === 'video')
      const audioTrack = tracks.find(t => t.kind === 'audio')
      if (videoTrack) {
        const settings = (videoTrack as any).mediaStreamTrack?.getSettings()
        if (settings) {
          setCachedDeviceIds(prev => ({ ...prev, video: settings.deviceId }))
          if (settings.facingMode) {
            setCachedFacingMode(settings.facingMode as 'user' | 'environment')
            setFacingMode(settings.facingMode as 'user' | 'environment')
          }
        }
      }
      if (audioTrack) {
        const settings = (audioTrack as any).mediaStreamTrack?.getSettings()
        if (settings?.deviceId) {
          setCachedDeviceIds(prev => ({ ...prev, audio: settings.deviceId }))
        }
      }
      
      // Track quality level used
      if (usedConstraints.video?.level !== undefined) {
        setCurrentQualityLevel(usedConstraints.video.level)
      }
      
      // NEW: Expose self-preview immediately (before connect/publish)
      const camTrack = localTracks.find(t => t.kind === 'video') as LocalVideoTrack | undefined
      if (camTrack) {
        setLocalVideo({
          participantId: 'local',
          track: camTrack,
          kind: 'video',
          isLocal: true,
        })
      }
      
      const micTrack = localTracks.find(t => t.kind === 'audio')
      if (micTrack) {
        setLocalAudio({
          participantId: 'local',
          track: micTrack,
          kind: 'audio',
          isLocal: true,
        })
      }
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('[MediaProvider] Step 2: Fetching LiveKit token...')
      }
      
      // Step 2: Fetch token
      if (process.env.NODE_ENV !== 'production') {
        console.log('[MediaProvider] Step 2: Fetching LiveKit token...', { sessionId, identity })
      }

      const tokenData = await fetchLiveKitToken({
        role: 'publisher',
        creatorId: sessionId,
        identity,
      })

      // Decode and log token payload for debugging
      if (process.env.NODE_ENV !== 'production') {
        try {
          const [, payloadB64] = tokenData.token.split('.')
          const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
          const payload = JSON.parse(json)
          console.log('[LK token]', {
            room: payload?.video?.room || payload?.room,
            identity: payload?.sub ?? payload?.identity,
            grants: payload?.video,
          })
          console.log('[LK token] Raw payload:', payload)
        } catch (e) {
          console.warn('[LK token] decode failed', e)
        }
        
        console.log('[MediaProvider] Step 3: Creating room instance...')
      }
      
      // Step 3: Create room
      newRoom = createRoom()
      
      // Set up event listeners before connecting
      newRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[LK] PC:', state)
        }
      })
      
      newRoom.on(RoomEvent.Disconnected, (reason?: any) => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[LK] Disconnected', { reason })
        }
        setConnected(false)
        setConnectionState('disconnected')
      })
      
      newRoom.on(RoomEvent.Reconnecting, () => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[LK] Reconnecting...')
        }
        setConnectionState('reconnecting')
      })
      
      newRoom.on(RoomEvent.Reconnected, () => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[LK] Reconnected')
        }
        setConnectionState('connected')
      })
      
      newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[LK] Participant joined:', participant.identity)
        }
        refreshParticipants()
        refreshTracks()
      })
      
      newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[LK] Participant left:', participant.identity)
        }
        refreshParticipants()
        refreshTracks()
      })
      
      newRoom.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub, participant: RemoteParticipant) => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[LK] Track subscribed:', track.kind, 'from', participant.identity)
        }
        refreshTracks()
        
        // Auto-swap to first remote video (only if user hasn't manually chosen)
        if (track.kind === 'video' && !participant.isLocal) {
          const sessionId = joinParamsRef.current?.sessionId
          if (sessionId && typeof sessionStorage !== 'undefined') {
            const stored = sessionStorage.getItem(`almighty_focus_${sessionId}`)
            if (!stored) {
              sessionStorage.setItem(`almighty_focus_${sessionId}`, 'remote')
              if (process.env.NODE_ENV !== 'production') {
                console.log('[MediaProvider] Auto-set focus to remote (first video)')
              }
            }
          }
        }
      })
      
      newRoom.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[LK] Track unsubscribed:', track.kind)
        }
        refreshTracks()
      })
      
      newRoom.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        const canPlay = newRoom!.canPlaybackAudio
        setNeedsAudioUnlock(!canPlay)
        audioUnlockedRef.current = canPlay
      })
      
      newRoom.on(RoomEvent.MediaDevicesChanged, () => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[LK] Media devices changed')
        }
      })
      
      // Active speaker tracking (opt-in)
      if (MEDIA.ENABLE_ACTIVE_SPEAKER_FOCUS) {
        newRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          if (speakers.length > 0 && speakers[0].sid !== newRoom!.localParticipant.sid) {
            setActiveSpeakerId(speakers[0].sid)
          }
        })
      }
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('[MediaProvider] Step 4: Connecting to room...')
      }
      
      // Step 4: Connect to room with autoSubscribe disabled
      await newRoom.connect(tokenData.url, tokenData.token, { autoSubscribe: false })
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('[MediaProvider] Step 5: Waiting for Connected event...')
      }
      
      // Step 5: Wait for Connected event with 30s timeout
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('LiveKit connection timeout (30s)'))
        }, 30000)
        
        const onConnected = () => {
          clearTimeout(timeout)
          newRoom!.off(RoomEvent.Connected, onConnected)
          if (process.env.NODE_ENV !== 'production') {
            console.log('[LK] CONNECTED')
          }
          mark('lk_join_end')
          connectedOnceRef.current = true
          resolve()
        }
        
        newRoom!.on(RoomEvent.Connected, onConnected)
      })
      
      // Step 6: Set room in state (triggers rendering)
      setRoom(newRoom)
      setConnected(true)
      setConnectionState('connected')
      refreshParticipants()
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('[MediaProvider] Step 6: Publishing tracks...')
      }
      
      // Step 7: Publish tracks (only after Connected)
      await publishTracks(newRoom, localTracks)
      
      // Set initial mute states via LiveKit APIs
      await newRoom.localParticipant.setMicrophoneEnabled(MEDIA.START_AUDIO)
      await newRoom.localParticipant.setCameraEnabled(MEDIA.START_VIDEO)
      
      setMicEnabled(MEDIA.START_AUDIO)
      setCamEnabled(MEDIA.START_VIDEO)
      
      // Refresh tracks to capture published state
      refreshTracks()
      
      // Debug output
      if (process.env.NODE_ENV !== 'production') {
        console.log('[MediaProvider] ✅ Join complete', {
          identity,
          sessionId,
          role,
          localVideoTracks: newRoom.localParticipant.videoTrackPublications.size,
          localAudioTracks: newRoom.localParticipant.audioTrackPublications.size,
          remoteParticipants: newRoom.remoteParticipants.size,
        })
      }
      
      // Enumerate audio output devices (desktop only)
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const outputs = devices.filter(d => d.kind === 'audiooutput')
        if (outputs.length > 1) {
          setAudioOutputDevices(outputs)
        }
      }
      
      // Expose debug handle for console inspection
      if (process.env.NODE_ENV !== 'production') {
        (window as any).__almightyDebug = {
          room: newRoom,
          get localVideo() { return localVideo },
          get primaryRemoteVideo() { return primaryRemoteVideo },
          get connectionState() { return connectionState },
        }
        console.log('[MediaProvider] Debug available: window.__almightyDebug')
      }
      
    } catch (err: any) {
      console.error('[LiveKit] Join failed:', err)
      setConnectionState('failed')
      
      // Cleanup on failure
      if (newRoom) {
        try {
          await newRoom.disconnect()
        } catch {}
      }
      localTracks.forEach(t => {
        try {
          t.stop?.()
        } catch {}
      })
      
      // Classify error
      if (err.is401Or403) {
        setTokenError({ is401Or403: true, message: err.message })
      } else if (err.name?.includes('NotAllowed') || err.name?.includes('Permission')) {
        const errorType = classifyMediaError(err)
        setPermissionError({ error: err, type: errorType })
      } else {
        toast({
          title: 'Connection Failed',
          description: err.message || 'Could not connect to call',
          variant: 'destructive',
        })
      }
    } finally {
      setConnecting(false)
      joinInProgressRef.current = false
    }
  }, [connecting, connected, cachedDeviceIds, cachedFacingMode, refreshParticipants, refreshTracks, toast, mark])
  
  // Leave room
  const leave = useCallback(async () => {
    if (!room) return
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[LiveKit] Leaving room')
    }
    
    // Stop local tracks
    stopLocalTracks(room)
    
    // Disconnect
    await room.disconnect()
    
    // Remove all listeners (hard teardown)
    room.removeAllListeners()
    
    // Clear state
    setRoom(undefined)
    setConnected(false)
    setConnectionState('disconnected')
    setLocalVideo(undefined)
    setLocalAudio(undefined)
    setPrimaryRemoteVideo(undefined)
    setPrimaryRemoteAudio(undefined)
    setPrimaryRemoteId(undefined)
    setParticipants([])
    setMicEnabled(MEDIA.START_AUDIO)
    setCamEnabled(MEDIA.START_VIDEO)
    setIsFlippingCamera(false)
    audioUnlockedRef.current = false
    setNeedsAudioUnlock(false)
  }, [room])
  
  // Toggle mic
  const toggleMic = useCallback(async () => {
    if (!room) return
    
    const newState = !micEnabled
    await room.localParticipant.setMicrophoneEnabled(newState)
    setMicEnabled(newState)
    
    // iOS Bluetooth quirk: re-bind on enable
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (isIOS && newState) {
      // Force re-bind by toggling off/on
      setTimeout(async () => {
        await room.localParticipant.setMicrophoneEnabled(true)
      }, 100)
    }
  }, [room, micEnabled])
  
  // Toggle camera
  const toggleCam = useCallback(async () => {
    if (!room) return
    
    const newState = !camEnabled
    await room.localParticipant.setCameraEnabled(newState)
    setCamEnabled(newState)
    refreshTracks()
  }, [room, camEnabled, refreshTracks])
  
  // Flip camera (debounced with race guard)
  const flipCamera = useCallback(async () => {
    if (!room || !camEnabled || isFlippingCamera) return
    
    // Debounce rapid taps
    if (flipDebounceRef.current) {
      clearTimeout(flipDebounceRef.current)
    }
    
    flipDebounceRef.current = setTimeout(async () => {
      setIsFlippingCamera(true)
      
      try {
        const currentVideoTrack = room.localParticipant.videoTrackPublications.values().next().value?.track as LocalVideoTrack
        if (!currentVideoTrack) return
        
        const targetFacing = facingMode === 'user' ? 'environment' : 'user'
        
        await switchCamera(room, currentVideoTrack, targetFacing)
        
        setFacingMode(targetFacing)
        setCachedFacingMode(targetFacing)
        refreshTracks()
        
      } catch (err) {
        console.error('[LiveKit] Camera flip failed:', err)
        toast({
          title: 'Camera Flip Failed',
          description: 'Could not switch camera',
          variant: 'destructive',
        })
      } finally {
        setIsFlippingCamera(false)
      }
    }, MEDIA.FLIP_CAMERA_DEBOUNCE_MS)
  }, [room, camEnabled, isFlippingCamera, facingMode, refreshTracks, toast])
  
  // Set primary remote participant
  const setPrimaryRemote = useCallback((participantId?: string) => {
    setPrimaryRemoteId(participantId)
  }, [])
  
  // Retry permissions
  const retryPermissions = useCallback(async () => {
    if (!room) return
    
    setPermissionError(undefined)
    
    try {
      // Unpublish existing tracks
      stopLocalTracks(room)
      
      // Re-create tracks with cached constraints
      const { tracks } = await createLocalTracksWithFallback({
        audio: MEDIA.START_AUDIO,
        video: MEDIA.START_VIDEO,
        facingMode: cachedFacingMode || 'user',
        cachedDeviceIds,
      })
      
      // Publish new tracks
      await publishTracks(room, tracks)
      
      refreshTracks()
      
    } catch (err: any) {
      const errorType = classifyMediaError(err)
      setPermissionError({ error: err, type: errorType })
    }
  }, [room, cachedDeviceIds, cachedFacingMode, refreshTracks])
  
  // Unlock audio (idempotent)
  const unlockAudio = useCallback(async () => {
    if (!room || audioUnlockedRef.current) return
    
    try {
      await room.startAudio()
      audioUnlockedRef.current = true
      setNeedsAudioUnlock(false)
    } catch (err) {
      // Silently fail if already unlocked
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[LiveKit] Audio unlock failed (may already be unlocked):', err)
      }
    }
  }, [room])
  
  // Retry connection (fresh join)
  const retryConnection = useCallback(async () => {
    if (!joinParamsRef.current) return
    
    await leave()
    
    const { sessionId, identity, role } = joinParamsRef.current
    await join(sessionId, identity, role)
  }, [leave, join])
  
  // Switch audio output (desktop only)
  const switchAudioOutput = useCallback(async (deviceId: string) => {
    if (!room) return
    
    try {
      await room.switchActiveDevice('audiooutput', deviceId)
      toast({
        title: 'Audio Output Changed',
        description: 'Switched to new speaker',
      })
    } catch (err) {
      console.error('[LiveKit] Audio output switch failed:', err)
    }
  }, [room, toast])
  
  // Subscription control for 1:1 calls
  useEffect(() => {
    if (!room || !primaryRemoteId) return
    
    // In 1:1, subscribe to primary only; others set to false for bandwidth optimization
    // TODO: In group view (Phase 1C), subscribe all at 'low', raise primary to 'high'
    room.remoteParticipants.forEach(rp => {
      const videoPub = Array.from(rp.videoTrackPublications.values())[0]
      if (!videoPub) return
      
      const isPrimary = rp.sid === primaryRemoteId
      videoPub.setSubscribed(isPrimary)
    })
  }, [room, primaryRemoteId])
  
  const value: MediaContext = {
    room,
    connected,
    connecting,
    connectionState,
    permissionError,
    tokenError,
    needsAudioUnlock,
    localVideo,
    localAudio,
    micEnabled,
    camEnabled,
    facingMode,
    isFlippingCamera,
    currentQualityLevel,
    primaryRemoteVideo,
    primaryRemoteAudio,
    primaryRemoteId,
    activeSpeakerId,
    participants,
    cachedDeviceIds,
    cachedFacingMode,
    audioOutputDevices,
    join,
    leave,
    toggleMic,
    toggleCam,
    flipCamera,
    setPrimaryRemote,
    retryPermissions,
    unlockAudio,
    retryConnection,
    switchAudioOutput,
  }
  
  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>
}
