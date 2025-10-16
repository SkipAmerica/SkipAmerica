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
import { startConnectionHealthCheck } from '../lib/connectionHealthCheck'
import type { TrackRef } from '../components/VideoTile'

// Debug toggle: enable with ?debug=1 or VITE_ALMIGHTY_DEBUG=1
const isDebug = () =>
  (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1') ||
  (import.meta?.env?.VITE_ALMIGHTY_DEBUG === '1');

// Persist/merge a global debug handle across remounts
function exportDebug(state: {
  room?: any;
  localVideo?: any;
  localAudio?: any;
  connectionState?: string;
  phase?: string;
}) {
  if (!isDebug()) return;
  const prev: any = (window as any).__almightyDebug || {};
  (window as any).__almightyDebug = {
    ...prev,
    ...state,
    // never lose previous values if we pass undefined this time
    room: state.room ?? prev.room,
    localVideo: state.localVideo ?? prev.localVideo,
    localAudio: state.localAudio ?? prev.localAudio,
    connectionState: state.connectionState ?? prev.connectionState,
  };
  // one-time marker helps confirm in console
  if (!(window as any).__almightyDebug.__ready) {
    (window as any).__almightyDebug.__ready = true;
    console.log('[Almighty] debug handle persistent');
  }
}

// Attach a floating <video> for the local preview (only in debug)
function attachDebugPreview(track: any, id = 'almighty-self-debug') {
  if (!isDebug() || !track) return;
  let el = document.getElementById(id) as HTMLVideoElement | null;
  if (!el) {
    el = document.createElement('video');
    el.id = id;
    el.style.cssText = [
      'position:fixed', 'right:12px', 'bottom:12px', 'width:220px', 'height:auto',
      'z-index:2147483647', 'background:#000', 'border-radius:10px',
      'box-shadow:0 6px 24px rgba(0,0,0,.35)', 'outline:1px solid rgba(255,255,255,.2)'
    ].join(';');
    document.body.appendChild(el);
  }
  try {
    track.attach?.(el);
    if (!el.srcObject && track.mediaStreamTrack) {
      el.srcObject = new MediaStream([track.mediaStreamTrack]);
    }
    el.muted = true; el.autoplay = true; el.playsInline = true;
    const tryPlay = () => el!.play().catch(() => {});
    el.play().catch(() => { setTimeout(tryPlay, 200); document.addEventListener('click', tryPlay, { once: true }); });
  } catch (e) {
    console.warn('[Almighty] debug preview attach failed', e);
  }
}

/**
 * Ensure we are subscribed to all remote publications.
 * Safe to call repeatedly; LiveKit will no-op when already subscribed.
 */
function ensureSubscribed(room: Room) {
  try {
    for (const p of room.remoteParticipants.values()) {
      for (const pub of p.trackPublications.values()) {
        if (!pub.isSubscribed) {
          pub.setSubscribed(true);
        }
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[LK] ensureSubscribed error', e);
    }
  }
}

/**
 * Unlock autoplay by creating/resuming AudioContext and playing silent buffer.
 * Must be called during user gesture to satisfy browser autoplay policies.
 */
const unlockAutoplay = async () => {
  try {
    const AnyWindow = window as any
    if (!AnyWindow.__AUDIO_CTX__) {
      AnyWindow.__AUDIO_CTX__ = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx: AudioContext = AnyWindow.__AUDIO_CTX__;
    if (ctx.state !== 'running') await ctx.resume();
    
    // Play silent buffer to satisfy gesture policy
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    src.connect(ctx.destination);
    src.start(0);
  } catch {}
};

/**
 * Get or create a hidden audio element for remote audio playback.
 * This element is reused across all remote audio tracks.
 */
function getOrCreateRemoteAudioEl(): HTMLAudioElement | null {
  if (typeof document === 'undefined') return null;
  
  let el = document.getElementById('almighty-remote-audio') as HTMLAudioElement | null;
  if (!el) {
    el = document.createElement('audio');
    el.id = 'almighty-remote-audio';
    el.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
    document.body.appendChild(el);
  }
  el.autoplay = true;
  el.muted = false;
  return el;
}

/**
 * Attach a remote audio track to the hidden audio element and play it.
 * If autoplay is blocked, invoke the onBlocked callback to show UI banner.
 */
async function attachAndPlayRemoteAudio(track: any, onBlocked?: () => void) {
  const el = getOrCreateRemoteAudioEl();
  if (!el || !track) return;
  
  try {
    // Attach LiveKit track to the audio element
    track.attach?.(el);
    
    // If LiveKit track has mediaStreamTrack, ensure srcObject is set
    if (!el.srcObject && track.mediaStreamTrack) {
      el.srcObject = new MediaStream([track.mediaStreamTrack]);
    }
    
    // Attempt to play
    await el.play();
  } catch (err) {
    // Autoplay blocked by browser; notify UI
    onBlocked?.();
    
    // Set up one-shot click handler to retry playback
    const retry = () => { 
      el.play().catch(() => {}); 
      document.removeEventListener('click', retry); 
    };
    document.addEventListener('click', retry, { once: true });
  }
}

interface MediaContext {
  // Connection
  room?: Room
  connected: boolean
  connecting: boolean
  connectionState: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed'
  permissionError?: { error: Error; type: 'denied' | 'not_found' | 'in_use' | 'unknown' }
  tokenError?: { is401Or403: boolean; message: string }
  needsAudioUnlock: boolean
  mediaReady: boolean
  
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
  markUserPinned: () => void
  previewOnly: () => Promise<void>
  hasPreviewStream: () => boolean
}

const MediaContext = createContext<MediaContext | undefined>(undefined)

export function useMedia() {
  const context = useContext(MediaContext)
  if (!context) throw new Error('useMedia must be used within MediaProvider')
  return context
}

export function MediaProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()
  
  // === 1. Debug: MediaProvider mounted ===
  useEffect(() => {
    console.log('[MP] mounted');
    exportDebug({ phase: 'MediaProvider:mounted' })
    console.log('[MediaProvider] mounted')
  }, [])
  
  // Idempotent state setter helper to prevent no-op re-renders
  const setIfChanged = useCallback(<T,>(current: T, next: T, setter: (value: T | ((prev: T) => T)) => void) => {
    // Functional updater to avoid stale closures during rapid event bursts
    setter((prev: T) => {
      const willChange = !Object.is(prev, next)
      
      // Defensive logging: track when valid state is being cleared
      if (isDebug() && willChange) {
        const prevRef = prev as any
        const nextRef = next as any
        const isClearing = (prevRef?.track?.sid || prevRef?.sid) && !nextRef
        
        if (isClearing) {
          console.warn('[STATE:CLEARING]', {
            from: prevRef?.track?.sid || prevRef?.sid || 'unknown',
            to: 'null',
            stack: new Error().stack?.split('\n').slice(2, 5).join('\n'),
            t: t()
          })
        }
      }
      
      return Object.is(prev, next) ? prev : next
    })
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
  const [mediaReady, setMediaReady] = useState(false)
  
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
  const t0Ref = useRef<number>(0)
  
  // Timing helper for breadcrumb logs
  const t = () => Math.round(performance.now() - (t0Ref.current || performance.now()))
  const joinInProgressRef = useRef(false)
  const connectedOnceRef = useRef(false)
  const flipDebounceRef = useRef<NodeJS.Timeout>()
  const audioUnlockedRef = useRef(false)
  const shouldSampleAnalytics = useRef(Math.random() < MEDIA.ANALYTICS_SAMPLE_RATE)
  const hasAutoPromotedRef = useRef(false)
  const userPinnedRef = useRef(false)
  const publishedRef = useRef(false)
  const healthCheckCleanupRef = useRef<(() => void) | null>(null)
  
  // Set mediaReady when local video track is available
  useEffect(() => {
    if (localVideo && localVideo.track && !mediaReady) {
      console.log('[MediaProvider:MEDIA_READY] Local video track available', {
        participantId: localVideo.participantId,
        trackSid: localVideo.track.sid,
        timestamp: new Date().toISOString()
      })
      setMediaReady(true)
    }
  }, [localVideo, mediaReady])
  
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
  const refreshTracks = useCallback((roomOverride?: Room) => {
    const targetRoom = roomOverride ?? room
    if (!targetRoom) {
      console.log('[MediaProvider:REFRESH_TRACKS] No room, skipping')
      return
    }
    
    console.log('[MediaProvider:REFRESH_TRACKS_START]', {
      roomState: targetRoom.state,
      localParticipantSid: targetRoom.localParticipant.sid,
      localParticipantIdentity: targetRoom.localParticipant.identity,
      localPublishedTracks: targetRoom.localParticipant.trackPublications.size,
      remoteParticipantsCount: targetRoom.remoteParticipants.size,
      timestamp: new Date().toISOString()
    })
    
    // Local tracks
    const localVideoTrack = targetRoom.localParticipant.videoTrackPublications.values().next().value?.track
    const localAudioTrack = targetRoom.localParticipant.audioTrackPublications.values().next().value?.track
    
    let nextLocalVideo: TrackRef | undefined = localVideoTrack ? {
      participantId: targetRoom.localParticipant.sid,
      track: localVideoTrack,
      kind: 'video' as const,
      isLocal: true,
    } : undefined
    
    // Preserve pre-publish preview if no published track yet
    if (!nextLocalVideo && localVideo && localVideo.kind === 'video' && (localVideo.participantId === 'local' || localVideo.participantId === 'preview')) {
      console.log('[MediaProvider:REFRESH_TRACKS_PRESERVE_PREVIEW] Keeping preview track', {
        participantId: localVideo.participantId,
        trackSid: localVideo.track?.sid
      })
      nextLocalVideo = localVideo
    } else if (nextLocalVideo && localVideo && (localVideo.participantId === 'local' || localVideo.participantId === 'preview')) {
      console.log('[MediaProvider:REFRESH_TRACKS_SWITCH_TO_PUBLISHED] Transitioning from preview to published', {
        from: localVideo.participantId,
        to: nextLocalVideo.participantId
      })
    }
    
    const nextLocalAudio = localAudioTrack ? {
      participantId: targetRoom.localParticipant.sid,
      track: localAudioTrack,
      kind: 'audio' as const,
      isLocal: true,
    } : undefined
    
    console.log('[MediaProvider:REFRESH_TRACKS_LOCAL]', {
      hasLocalVideo: !!nextLocalVideo,
      hasLocalAudio: !!nextLocalAudio,
      localVideoSid: localVideoTrack?.sid,
      localVideoEnabled: (localVideoTrack as any)?.isEnabled,
      localAudioSid: localAudioTrack?.sid,
      localAudioEnabled: (localAudioTrack as any)?.isEnabled
    })
    
    console.log('[MediaProvider:REFRESH_TRACKS_SET_LOCAL]', {
      willSetLocalVideo: nextLocalVideo !== localVideo,
      currentLocalVideo: localVideo ? { participantId: localVideo.participantId, trackSid: localVideo.track?.sid } : null,
      nextLocalVideo: nextLocalVideo ? { participantId: nextLocalVideo.participantId, trackSid: nextLocalVideo.track?.sid } : null
    })
    
    // [STATE:PRE] Log before setting local video
    if (isDebug()) {
      console.log('[STATE:PRE]', {
        before: localVideo?.track?.sid || null,
        after: nextLocalVideo?.track?.sid || null,
        clearingValidState: !!(localVideo?.track?.sid && !nextLocalVideo),
        t: t()
      })
    }
    
    // [STATE] Hop 2: MediaProvider writes local video state
    if (isDebug()) {
      const myIdentity = room?.localParticipant?.identity || 'unknown'
      const wasValid = localVideo?.track?.sid != null
      const isNowNull = nextLocalVideo == null
      
      console.log('[STATE:PRE]', {
        sessionId: joinParamsRef.current?.sessionId,
        event: 'SetLocalCam',
        before: localVideo ? { pubSid: localVideo.track?.sid, participantId: localVideo.participantId } : null,
        after: nextLocalVideo ? { pubSid: nextLocalVideo.track?.sid, participantId: nextLocalVideo.participantId } : null,
        clearingValidState: wasValid && isNowNull,
        t: t()
      })
      
      if (nextLocalVideo) {
        console.log('[STATE]', {
          sessionId: joinParamsRef.current?.sessionId,
          event: 'SetLocalCam',
          target: 'pip',
          isLocal: true,
          pubSid: nextLocalVideo.track?.sid || 'local-preview',
          trackId: nextLocalVideo.track?.mediaStreamTrack?.id,
          t: t(),
          bc: `${myIdentity}|camera|${nextLocalVideo.track?.sid || 'local-preview'}`
        })
      }
    }
    
    setIfChanged(localVideo, nextLocalVideo, setLocalVideo)
    
    // [STATE:PRE] Log before setting local audio
    if (isDebug()) {
      console.log('[STATE:PRE]', {
        before: localAudio?.track?.sid || null,
        after: nextLocalAudio?.track?.sid || null,
        clearingValidState: !!(localAudio?.track?.sid && !nextLocalAudio),
        t: t()
      })
    }
    
    setIfChanged(localAudio, nextLocalAudio, setLocalAudio)
    
    console.log('[MediaProvider:REFRESH_TRACKS_AFTER_SET_LOCAL] Called setLocalVideo/Audio')
    
    // Remote tracks (first remote participant for 1:1)
    const remoteParticipantsList = Array.from(targetRoom.remoteParticipants.values())
    
    console.log('[MediaProvider:REFRESH_TRACKS_REMOTES]', {
      remoteCount: remoteParticipantsList.length,
      remotes: remoteParticipantsList.map(p => ({
        sid: p.sid,
        identity: p.identity,
        videoTracks: Array.from(p.videoTrackPublications.values()).map(pub => ({
          sid: pub.trackSid,
          subscribed: pub.isSubscribed,
          hasTrack: !!pub.track,
          kind: pub.kind
        })),
        audioTracks: Array.from(p.audioTrackPublications.values()).map(pub => ({
          sid: pub.trackSid,
          subscribed: pub.isSubscribed,
          hasTrack: !!pub.track,
          kind: pub.kind
        }))
      }))
    })
    
    const firstRemote = remoteParticipantsList[0]
    if (firstRemote) {
      console.log('[MediaProvider:REFRESH_TRACKS_FIRST_REMOTE]', {
        sid: firstRemote.sid,
        identity: firstRemote.identity,
        videoPublications: firstRemote.videoTrackPublications.size,
        audioPublications: firstRemote.audioTrackPublications.size
      })
      
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
      
      console.log('[MediaProvider:REFRESH_TRACKS_REMOTE_TRACKS]', {
        hasRemoteVideo: !!nextRemoteVideo,
        hasRemoteAudio: !!nextRemoteAudio,
        remoteVideoSid: remoteVideoTrack?.sid,
        remoteAudioSid: remoteAudioTrack?.sid,
        primaryRemoteId: firstRemote.sid
      })
      
      console.log('[MediaProvider:REFRESH_TRACKS_SET_REMOTE]', {
        willSetRemoteVideo: nextRemoteVideo !== primaryRemoteVideo,
        currentPrimaryRemoteVideo: primaryRemoteVideo ? { participantId: primaryRemoteVideo.participantId, trackSid: primaryRemoteVideo.track?.sid } : null,
        nextRemoteVideo: nextRemoteVideo ? { participantId: nextRemoteVideo.participantId, trackSid: nextRemoteVideo.track?.sid } : null
      })
      
      // [STATE:PRE] Log before setting remote video
      if (isDebug()) {
        console.log('[STATE:PRE]', {
          before: primaryRemoteVideo?.track?.sid || null,
          after: nextRemoteVideo?.track?.sid || null,
          clearingValidState: !!(primaryRemoteVideo?.track?.sid && !nextRemoteVideo),
          t: t()
        })
      }
      
      // [STATE] Hop 2: MediaProvider writes remote primary video state
      if (isDebug()) {
        const myIdentity = room?.localParticipant?.identity || 'unknown'
        const wasValid = primaryRemoteVideo?.track?.sid != null
        const isNowNull = nextRemoteVideo == null
        
        console.log('[STATE:PRE]', {
          sessionId: joinParamsRef.current?.sessionId,
          event: 'SetRemotePrimary',
          before: primaryRemoteVideo ? { pubSid: primaryRemoteVideo.track?.sid, participantId: primaryRemoteVideo.participantId } : null,
          after: nextRemoteVideo ? { pubSid: nextRemoteVideo.track?.sid, participantId: nextRemoteVideo.participantId } : null,
          clearingValidState: wasValid && isNowNull,
          t: t()
        })
        
        if (nextRemoteVideo) {
          console.log('[STATE]', {
            sessionId: joinParamsRef.current?.sessionId,
            event: 'SetRemotePrimary',
            target: 'primary',
            isLocal: false,
            pubSid: nextRemoteVideo.track?.sid,
            trackId: nextRemoteVideo.track?.mediaStreamTrack?.id,
            t: t(),
            bc: `${firstRemote.identity}|camera|${nextRemoteVideo.track?.sid || 'unknown'}`
          })
        }
      }
      
      setIfChanged(primaryRemoteVideo, nextRemoteVideo, setPrimaryRemoteVideo)
      
      // [STATE:PRE] Log before setting remote audio
      if (isDebug()) {
        console.log('[STATE:PRE]', {
          before: primaryRemoteAudio?.track?.sid || null,
          after: nextRemoteAudio?.track?.sid || null,
          clearingValidState: !!(primaryRemoteAudio?.track?.sid && !nextRemoteAudio),
          t: t()
        })
      }
      
      setIfChanged(primaryRemoteAudio, nextRemoteAudio, setPrimaryRemoteAudio)
      
      console.log('[MediaProvider:REFRESH_TRACKS_AFTER_SET_REMOTE] Called setPrimaryRemoteVideo/Audio')
      setIfChanged(primaryRemoteId, firstRemote.sid, setPrimaryRemoteId)
    } else {
      console.log('[MediaProvider:REFRESH_TRACKS_NO_REMOTES]', {
        clearing: true
      })
      setIfChanged(primaryRemoteVideo, undefined, setPrimaryRemoteVideo)
      setIfChanged(primaryRemoteAudio, undefined, setPrimaryRemoteAudio)
      setIfChanged(primaryRemoteId, undefined, setPrimaryRemoteId)
    }
    
    console.log('[MediaProvider:REFRESH_TRACKS_COMPLETE]', {
      localVideo: !!nextLocalVideo,
      localAudio: !!nextLocalAudio,
      remoteVideo: !!primaryRemoteVideo,
      remoteAudio: !!primaryRemoteAudio,
      remoteId: firstRemote?.sid
    })
  }, [room, mark, localVideo, localAudio, primaryRemoteVideo, primaryRemoteAudio, primaryRemoteId, setIfChanged])
  
  // Join room
  const join = useCallback(async (sessionId: string, identity: string, role: 'creator' | 'user') => {
    console.log('[MP] join start');
    console.log('[JOIN:START]', { role, sessionId });
    
    // Guard 1: Already connected to the target session?
    if (room?.state === 'connected' && room?.name === `session_${sessionId}`) {
      console.log('[JOIN:SKIP]', 'condition hit', { condition: 'already_connected', params: { sessionId, identity, role } });
      console.log('[JOIN:BLOCK]', 'reason=already connected', { sessionId, identity, role });
      console.log('[MediaProvider] Already connected to session', sessionId)
      console.log('[JOIN:BLOCK]', 'returning early here', { line: '619' });
      return
    }
    
    // Guard 2: Mandatory disconnect from any previous room before proceeding
    if (room && room.state !== 'disconnected') {
      console.log('[MediaProvider] Disconnecting from previous room before join')
      try { 
        await room.disconnect() 
      } catch {}
    }
    
    // Initialize timing breadcrumb
    joinParamsRef.current = { sessionId, identity, role }
    t0Ref.current = performance.now()
    
    // Guard 3: Prevent duplicate joins
    if (joinInProgressRef.current || connecting) {
      console.log('[JOIN:SKIP]', 'condition hit', { condition: 'join_in_progress', params: { sessionId, identity, role, joinInProgressRef: joinInProgressRef.current, connecting } });
      console.log('[JOIN:BLOCK]', 'reason=join in progress', { sessionId, identity, role });
      if (process.env.NODE_ENV !== 'production') {
        console.log('[MediaProvider] Join blocked (already joining)')
      }
      console.log('[JOIN:BLOCK]', 'returning early here', { line: '640' });
      return
    }
    
    // ---- Debug mode check (used throughout join flow) ----
    const DEBUG_ON = isDebug();
    
    joinInProgressRef.current = true
    setConnecting(true)
    setConnectionState('connecting')
    setPermissionError(undefined)
    setTokenError(undefined)
    joinParamsRef.current = { sessionId, identity, role }
    
    // Reset auto-promotion for fresh session
    hasAutoPromotedRef.current = false;
    userPinnedRef.current = false;
    
    mark('lk_join_start')
    
    console.log('[JOIN:PROGRESS]', 'entered async body');
    
    // Unlock autoplay during user gesture
    await unlockAutoplay();
    
    let newRoom: Room | undefined
    let localTracks: any[] = []
    
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[MediaProvider] Step 1: Creating local tracks...')
      }
      
      // Step 1: Check if preview stream exists and reuse it
      console.log('[JOIN:CHECK_PREVIEW]', { hasPreviewStream: hasPreviewStream(), hasLocalVideo: !!localVideo?.track });
      if (hasPreviewStream() && localVideo?.track) {
        console.log('[MediaProvider] Reusing preview stream for session')
        localTracks = [localVideo.track as any]
        
        // Add audio track
        const { tracks: audioTracks } = await createLocalTracksWithFallback({
          audio: MEDIA.START_AUDIO,
          video: false,
          cachedDeviceIds,
        })
        localTracks.push(...audioTracks)
        
        const micTrack = audioTracks.find(t => t.kind === 'audio')
        if (micTrack) {
          setLocalAudio({
            participantId: 'local',
            track: micTrack as any,
            kind: 'audio',
            isLocal: true,
          })
        }
      } else {
        // Create fresh tracks
        console.log('[JOIN:PRE_TRACKS_CREATE]', { role, sessionId, identity });
        const { tracks, usedConstraints } = await createLocalTracksWithFallback({
          audio: MEDIA.START_AUDIO,
          video: MEDIA.START_VIDEO,
          facingMode: cachedFacingMode || 'user',
          cachedDeviceIds,
        })
        console.log('[JOIN:POST_TRACKS_CREATE]', { gotTracks: tracks?.length, kinds: tracks?.map(t => t.kind) });
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
        
        // Expose self-preview immediately (before connect/publish)
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
      }
      
      // DEV: attach floating self preview
      const previewVideoTrack = localTracks.find(t => t.kind === 'video')
      attachDebugPreview(previewVideoTrack);
      
      // Export initial debug state (no room yet)
      exportDebug({ 
        localVideo: previewVideoTrack, 
        localAudio: localTracks.find(t => t.kind === 'audio'), 
        phase: 'MediaProvider:tracks-created',
        connectionState: 'tracks-created'
      });
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('[MediaProvider] tracks created', { 
          hasVideo: !!localTracks.find(t => t.kind === 'video'), 
          hasAudio: !!localTracks.find(t => t.kind === 'audio') 
        })
      }
      
      console.log('[JOIN:BEFORE_TOKEN_FETCH]', {
        reached: true,
        localTracksCount: localTracks.length,
        trackKinds: localTracks.map(t => t.kind),
        sessionId,
        role,
        identity
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log('[MediaProvider] Step 2: Fetching LiveKit token...')
      }
      
      // Step 2: Fetch token
      // Extract sessionId from URL if present (for V2 validation)
      const urlSessionId = window.location.pathname.match(/\/session\/([^\/]+)/)?.[1]
      
      console.log('[TOKEN_FETCH_START]', {
        role,
        sessionId,
        identity,
        urlSessionId,
        timestamp: new Date().toISOString()
      })

      console.log('[JOIN:BEFORE_FETCH_BLOCK]', {
        serverUrl: undefined,
        tokenEndpoint: undefined,
        params: { sessionId, identity, role },
        insideFetchBlock: false,
      });

      let tokenData: { token: string; url: string; room?: string };
      try {
        console.log('[TOKEN:PRE]', { 
          sessionId, 
          role,
          identity,
          urlSessionId 
        });
        
        tokenData = await fetchLiveKitToken({
          role: role === 'creator' ? 'publisher' : 'viewer',
          creatorId: role === 'creator' ? identity : sessionId,
          identity,
          sessionId: urlSessionId,
        })
        
        console.log('[TOKEN:POST]', { 
          hasToken: !!tokenData.token, 
          hasUrl: !!tokenData.url,
          room: tokenData.room 
        });
        
        console.log('[TOKEN_RECEIVED]', {
          length: tokenData.token?.length || 0,
          roomName: tokenData.room,
          wsUrl: tokenData.url
        })
      } catch (e) {
        console.log('[TOKEN_FETCH_ERROR]', { message: (e as Error).message })
        throw e
      }

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
      
      // Clear stale focus preference on join
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(`almighty_focus_${joinParamsRef.current?.sessionId}`)
        if (process.env.NODE_ENV !== 'production') {
          console.log('[MediaProvider] Cleared stale focus preference')
        }
      }
      
      // Export room state
      exportDebug({ 
        room: newRoom, 
        phase: 'MediaProvider:room-created',
        connectionState: 'room-created'
      });
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('[MediaProvider] room created');
      }
      
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
        
        // Export disconnected state
        exportDebug({ connectionState: `disconnected:${String(reason ?? '')}` });
      })
      
      newRoom.on(RoomEvent.Reconnecting, () => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[LK] Reconnecting...')
        }
        setConnectionState('reconnecting')
      })
      
      newRoom.on(RoomEvent.Reconnected, () => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[LK] Reconnected — resubscribe sweep')
        }
        ensureSubscribed(newRoom);
        sweepForFirstRemoteVideoAndPromote(newRoom);
        
        // Rehydrate remote audio after reconnection
        for (const p of newRoom.remoteParticipants.values()) {
          for (const pub of p.trackPublications.values()) {
            if (pub.kind === 'audio' && pub.track) {
              attachAndPlayRemoteAudio(pub.track, () => setNeedsAudioUnlock(true));
            }
          }
        }
        
        setConnectionState('connected')
      })
      
      // Event: Local track published
      newRoom.on(RoomEvent.LocalTrackPublished, (pub, participant) => {
        const DBG = isDebug()
        if (DBG && pub.kind === 'video' && pub.source === 'camera') {
          console.log('[LK]', {
            sessionId,
            role,
            myIdentity: newRoom.localParticipant.identity,
            remoteIdentity: newRoom.localParticipant.identity,
            event: 'LocalTrackPublished',
            source: 'camera',
            kind: pub.kind,
            pubSid: pub.trackSid,
            trackId: pub.track?.mediaStreamTrack?.id,
            subscribed: true,
            t: t(),
            bc: `${newRoom.localParticipant.identity}|camera|${pub.trackSid || 'unknown'}`
          })
        }
        console.log('[MediaProvider:EVENT] LocalTrackPublished', {
          kind: pub.kind,
          source: pub.source,
          trackSid: pub.trackSid,
          participantIdentity: participant.identity
        })
        setTimeout(() => refreshTracks(newRoom), 0)
      })
      
      newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('[LK:ParticipantConnected]', {
          participantSid: participant.sid,
          participantIdentity: participant.identity,
          existingTrackPubs: participant.trackPublications.size,
          existingTracks: Array.from(participant.trackPublications.values()).map(pub => ({
            kind: pub.kind,
            trackSid: pub.trackSid,
            subscribed: pub.isSubscribed,
            hasTrack: !!pub.track
          })),
          totalRemoteParticipants: newRoom.remoteParticipants.size,
          timestamp: new Date().toISOString()
        })
        
        // Double-check subscriptions to their existing pubs
        for (const pub of participant.trackPublications.values()) {
          if (!pub.isSubscribed) pub.setSubscribed(true);
        }
        
        // Auto-play any existing audio tracks from this participant
        for (const pub of participant.trackPublications.values()) {
          if (pub.kind === 'audio' && pub.track) {
            attachAndPlayRemoteAudio(pub.track, () => setNeedsAudioUnlock(true));
          }
        }
        
        // Check if participant arrived with video already published
        if (!hasAutoPromotedRef.current && !userPinnedRef.current) {
          for (const pub of participant.trackPublications.values()) {
            if (pub.kind === 'video' && pub.track) {
              try {
                setPrimaryRemote(participant.sid);
                hasAutoPromotedRef.current = true;
                
                const sessionId = joinParamsRef.current?.sessionId;
                if (sessionId && typeof sessionStorage !== 'undefined') {
                  sessionStorage.setItem(`almighty_focus_${sessionId}`, 'remote');
                }
                
                if (process.env.NODE_ENV !== 'production') {
                  console.log('[AutoPromote] Participant arrived with video:', participant.identity);
                }
                break;
              } catch (e) {
                if (process.env.NODE_ENV !== 'production') {
                  console.warn('[AutoPromote] Error on participant arrival', e);
                }
              }
            }
          }
        }
        
        refreshParticipants()
        refreshTracks()
      })
      
      newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log('[LK:ParticipantDisconnected]', {
          participantSid: participant.sid,
          participantIdentity: participant.identity,
          reason: 'disconnected',
          remainingRemoteParticipants: newRoom.remoteParticipants.size - 1,
          timestamp: new Date().toISOString()
        })
        refreshParticipants()
        refreshTracks()
      })
      
      newRoom.on(RoomEvent.TrackPublished, (pub, participant) => {
        const DBG = isDebug()
        if (DBG && pub.kind === 'video' && pub.source === 'camera') {
          console.log('[LK]', {
            sessionId,
            role,
            myIdentity: newRoom.localParticipant.identity,
            remoteIdentity: participant.identity,
            event: 'TrackPublished',
            source: 'camera',
            kind: pub.kind,
            pubSid: pub.trackSid,
            trackId: pub.track?.mediaStreamTrack?.id,
            subscribed: pub.isSubscribed,
            t: t(),
            bc: `${participant.identity}|camera|${pub.trackSid || 'unknown'}`
          })
        }
        console.log('[LK:TrackPublished]', {
          publisherSid: participant.sid,
          publisherIdentity: participant.identity,
          trackKind: pub.kind,
          trackSid: pub.trackSid,
          subscribed: pub.isSubscribed,
          timestamp: new Date().toISOString()
        })
        
        // Force-subscribe to remote video tracks immediately
        if (participant.identity !== newRoom.localParticipant.identity && pub.kind === 'video') {
          try {
            pub.setSubscribed(true)
            if (DBG) {
              console.log('[LK:TrackPublished] Force-subscribed to remote video', {
                participantIdentity: participant.identity,
                trackSid: pub.trackSid
              })
            }
          } catch (e) {
            console.warn('[LK] Failed to force-subscribe to remote video track:', e)
          }
        }
        
        // A tiny defer helps if LK is still normalizing internal state
        setTimeout(() => {
          ensureSubscribed(newRoom)
          refreshTracks(newRoom)
        }, 0);
      })
      
      newRoom.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub, participant: RemoteParticipant) => {
        const DBG = isDebug()
        if (DBG && track.kind === 'video') {
          console.log('[LK]', {
            sessionId,
            role,
            myIdentity: newRoom.localParticipant.identity,
            remoteIdentity: participant.identity,
            event: 'TrackSubscribed',
            source: 'camera',
            kind: track.kind,
            pubSid: _pub.trackSid,
            trackId: track.mediaStreamTrack?.id,
            subscribed: true,
            t: t(),
            bc: `${participant.identity}|camera|${_pub.trackSid || 'unknown'}`
          })
        }
        console.log('[LK:TrackSubscribed]', {
          trackKind: track.kind,
          trackSid: track.sid,
          participantSid: participant.sid,
          participantIdentity: participant.identity,
          trackMuted: track.isMuted,
          trackEnabled: (track as any).isEnabled,
          mediaStreamTrackId: track.mediaStreamTrack?.id,
          mediaStreamTrackReadyState: track.mediaStreamTrack?.readyState,
          autoPromoteState: {
            hasAutoPromoted: hasAutoPromotedRef.current,
            userPinned: userPinnedRef.current
          },
          timestamp: new Date().toISOString()
        })
        
        // Note: Remote tracks are controlled by sender - we can't unmute them locally
        // The local track unmuting in createLocalTracksWithFallback ensures our tracks arrive unmuted
        
        // --- Auto-promote remote video once (safe) ---
        if (
          !hasAutoPromotedRef.current &&
          track.kind === 'video' &&
          !userPinnedRef.current
        ) {
          console.log('[LK:TrackSubscribed:AUTO_PROMOTE]', {
            beforePrimaryRemoteId: primaryRemoteId,
            newPrimaryRemoteId: participant.sid,
            participantIdentity: participant.identity
          })
          
          try {
            // Store in sessionStorage for UIProvider coordination
            const sessionId = joinParamsRef.current?.sessionId
            if (sessionId && typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem(`almighty_focus_${sessionId}`, 'remote')
            }
            
            // 🚀 Immediately make remote primary (no polling delay)
            setPrimaryRemote(participant.sid)
            hasAutoPromotedRef.current = true
            
            console.log('[LK:TrackSubscribed:AUTO_PROMOTE_SUCCESS]', {
              primaryRemoteId: participant.sid,
              hasAutoPromoted: true
            })
          } catch (e) {
            console.error('[LK:TrackSubscribed:AUTO_PROMOTE_ERROR]', e)
          }
        } else {
          console.log('[LK:TrackSubscribed:AUTO_PROMOTE_SKIPPED]', {
            reason: track.kind !== 'video' ? 'not_video' : 
                    hasAutoPromotedRef.current ? 'already_promoted' : 
                    'user_pinned'
          })
        }
      
      // Auto-play remote audio immediately
      if (track.kind === 'audio' && !participant.isLocal) {
        attachAndPlayRemoteAudio(track, () => setNeedsAudioUnlock(true));
      }
      
      refreshTracks()
      })
      
      newRoom.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, _pub, participant: RemoteParticipant) => {
        console.log('[LK:TrackUnsubscribed]', {
          trackKind: track.kind,
          trackSid: track.sid,
          participantSid: participant.sid,
          participantIdentity: participant.identity,
          timestamp: new Date().toISOString()
        })
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
      
      console.log('[MediaProvider:ROOM_CONNECT_START]', {
        roomName: tokenData.room,
        wsUrl: tokenData.url,
        timestamp: new Date().toISOString()
      })
      
      // Step 4: Connect to room with autoSubscribe disabled
      console.log('[LK] CONNECTING');
      await newRoom.connect(tokenData.url, tokenData.token, { autoSubscribe: true })
      console.log('[LK] Connected');
      
      const DBG = isDebug()
      if (DBG) {
        console.log('[LK]', {
          sessionId,
          role,
          myIdentity: newRoom.localParticipant.identity,
          event: 'Connected',
          t: t()
        })
      }
      
      // ✅ FIX 1: Immediately update connection state (don't wait for async event)
      setConnectionState('connected')
      setConnected(true)
      
      console.log('[MediaProvider:ROOM_CONNECTED_IMMEDIATE]', {
        roomState: newRoom.state,
        localParticipantSid: newRoom.localParticipant.sid,
        localParticipantIdentity: newRoom.localParticipant.identity,
        remoteParticipantsCount: newRoom.remoteParticipants.size,
        remoteParticipants: Array.from(newRoom.remoteParticipants.values()).map(p => ({
          sid: p.sid,
          identity: p.identity,
          trackCount: p.trackPublications.size
        })),
        timestamp: new Date().toISOString()
      })
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('[MediaProvider] Step 5: Waiting for Connected event...')
      }

      /** Extra diagnostics */
      newRoom.on(RoomEvent.SignalConnected, () => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[LK] SignalConnected (WS handshake complete)')
        }
      })

      newRoom.on(RoomEvent.ConnectionStateChanged, (s) => {
        if (process.env.NODE_ENV !== 'production') console.log('[LK] PC:', s)
      })

      /** Wait for "Connected" with race-safe fallback + rich timeout dump */
      await new Promise<void>((resolve, reject) => {
        const dump = (label: string) => {
          const engine: any = (newRoom as any)?.engine
          const pc: RTCPeerConnection | undefined = engine?.client?.pc
          const diagnostics = {
            label,
            roomState: (newRoom as any)?.state,                           // 'connecting'|'connected'|'disconnected'
            engineConn: engine?.connectionState,                          // lk engine state
            pcConn: pc?.connectionState,                                  // 'new'|'checking'|'connected'|...
            localSid: newRoom.localParticipant?.sid,
            localIdentity: newRoom.localParticipant?.identity,
            remoteCount: newRoom.remoteParticipants?.size,
            localPubCount: newRoom.localParticipant?.trackPublications?.size,
          }
          console.error('[LK] Connected wait diagnostics:', diagnostics)
        }

        const timeout = setTimeout(() => {
          dump('timeout')
          reject(new Error('LiveKit connection timeout (30s)'))
        }, 30_000)

        const finish = (why: string) => {
          clearTimeout(timeout)
          if (process.env.NODE_ENV !== 'production') {
            console.log('[LK] CONNECTED (proceed)', { why, roomState: (newRoom as any)?.state })
          }
          mark('lk_join_end')
          connectedOnceRef.current = true
          
          // Export connected state
          exportDebug({ 
            room: newRoom, 
            connectionState: 'connected',
            phase: 'MediaProvider:connected'
          });
          
          resolve()
        }

        const onConnected = () => {
          newRoom.off(RoomEvent.Connected, onConnected)
          finish('RoomEvent.Connected')
        }

        // RACE-SAFE GUARD: if state is already connected at listener attach time, go now.
        const stateAtAttach = (newRoom as any)?.state
        if (stateAtAttach === 'connected') {
          finish('state-already-connected')
          console.log('[JOIN:BLOCK]', 'returning early here', { line: '1256' });
          return
        }

        if (process.env.NODE_ENV !== 'production') {
          console.log('[LK] Waiting for RoomEvent.Connected…', { stateAtAttach })
        }
        newRoom.on(RoomEvent.Connected, onConnected)

        // Optional: after SignalConnected, poll once more in case the event was missed
        const onSignalConnected = () => {
          newRoom.off(RoomEvent.SignalConnected, onSignalConnected)
          // Small micro-wait then re-check room state
          setTimeout(() => {
            if ((newRoom as any)?.state === 'connected') {
              finish('signal-connected-poll')
            }
          }, 200)
        }
        newRoom.on(RoomEvent.SignalConnected, onSignalConnected)
      })
      
      // Ensure we're subscribed to anything that existed before our listeners attached
      ensureSubscribed(newRoom);
      
      // Step 6: Set room in state (triggers rendering)
      setRoom(newRoom)
      setConnected(true)
      setConnectionState('connected')
      refreshParticipants()
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('[MediaProvider] Step 6: Publishing tracks...')
      }
      
      // Step 7: Publish tracks (only after Connected) - idempotent
      if (publishedRef.current) {
        console.log('[MediaProvider:TRACKS_ALREADY_PUBLISHED] (via ref)')
      } else {
        // Check if tracks are already published
        const pubs = Array.from(newRoom.localParticipant.trackPublications.values())
        const hasVideo = pubs.some(p => p.kind === 'video' && p.track)
        const hasAudio = pubs.some(p => p.kind === 'audio' && p.track)
        
        if (hasVideo && hasAudio) {
          publishedRef.current = true
          console.log('[MediaProvider:TRACKS_ALREADY_PUBLISHED] (already in room)')
        } else {
          console.log('[MediaProvider:PUBLISHING_TRACKS]', {
            trackCount: localTracks.length,
            hasVideo: localTracks.some(t => t.kind === 'video'),
            hasAudio: localTracks.some(t => t.kind === 'audio')
          })
          
          await publishTracks(newRoom, localTracks)
          publishedRef.current = true
        }
      }
      
      console.log('[MediaProvider:TRACKS_PUBLISHED]', {
        localParticipant: newRoom.localParticipant.identity,
        publishedTracks: newRoom.localParticipant.trackPublications.size
      })
      
      // Explicitly unmute tracks after publishing so remote side receives media immediately
      await newRoom.localParticipant.setCameraEnabled(MEDIA.START_VIDEO)
      await newRoom.localParticipant.setMicrophoneEnabled(MEDIA.START_AUDIO)
      
      setMicEnabled(MEDIA.START_AUDIO)
      setCamEnabled(MEDIA.START_VIDEO)
      
      // Refresh tracks to capture published state
      refreshTracks(newRoom)
      // Also schedule a microtask refresh to catch any late publications
      setTimeout(() => refreshTracks(newRoom), 0)
      
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
      
      // Start periodic health check logging
      if (healthCheckCleanupRef.current) {
        healthCheckCleanupRef.current()
      }
      healthCheckCleanupRef.current = startConnectionHealthCheck(newRoom)
      console.log('[MediaProvider] Health check started (logs every 5s)')
      
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
      
      // Reset auto-promotion state for next session
      hasAutoPromotedRef.current = false
      userPinnedRef.current = false
      
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
    
    console.log('[MediaProvider:LEAVE]', {
      roomName: room.name,
      timestamp: new Date().toISOString()
    })
    
    // Stop health check
    if (healthCheckCleanupRef.current) {
      healthCheckCleanupRef.current()
      healthCheckCleanupRef.current = null
    }
    
    // ✅ FIX 3: Immediately update UI state so user sees disconnected
    setConnected(false)
    setConnectionState('disconnected')
    
    // Reset published flag to allow future republishing
    publishedRef.current = false
    
    // Stop local tracks
    stopLocalTracks(room)
    
    // Disconnect
    await room.disconnect()
    
    // Remove all listeners (hard teardown)
    room.removeAllListeners()
    
    // Remove hidden remote audio element
    const audioEl = document.getElementById('almighty-remote-audio');
    if (audioEl?.parentElement) {
      audioEl.parentElement.removeChild(audioEl);
    }
    
    // Reset auto-promotion state for next session
    hasAutoPromotedRef.current = false;
    userPinnedRef.current = false;
    
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
  
  // Sweep for first available remote video and auto-promote (on reconnect/restore)
  const sweepForFirstRemoteVideoAndPromote = useCallback((room: Room) => {
    // Skip if already promoted or user manually pinned
    if (hasAutoPromotedRef.current || userPinnedRef.current) return;
    
    for (const p of room.remoteParticipants.values()) {
      for (const pub of p.trackPublications.values()) {
        if (pub.kind === 'video' && (pub.track || pub.isSubscribed)) {
          try {
            setPrimaryRemote(p.sid);
            hasAutoPromotedRef.current = true;
            
            // Persist to sessionStorage for UIProvider sync
            const sessionId = joinParamsRef.current?.sessionId;
            if (sessionId && typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem(`almighty_focus_${sessionId}`, 'remote');
            }
            
            if (process.env.NODE_ENV !== 'production') {
              console.log('[AutoPromote] Sweep found video from', p.identity);
            }
            return; // Stop after first video found
          } catch (e) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn('[AutoPromote] Sweep error', e);
            }
          }
        }
      }
    }
  }, [setPrimaryRemote])
  
  // Mark that user manually pinned a video (disables auto-promotion)
  const markUserPinned = useCallback(() => {
    userPinnedRef.current = true
    if (process.env.NODE_ENV !== 'production') {
      console.log('[MediaProvider] User manually pinned - auto-promotion disabled')
    }
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
  
  // Preview-only mode (camera without LiveKit connection)
  const previewOnly = useCallback(async () => {
    if (localVideo && localVideo.participantId === 'preview') {
      console.log('[MediaProvider] Preview stream already active')
      return
    }

    mark('preview_start')
    setConnecting(true)
    setPermissionError(undefined)

    try {
      console.log('[MediaProvider] Creating preview-only tracks...')
      
      const { tracks, usedConstraints } = await createLocalTracksWithFallback({
        audio: false,
        video: true,
        facingMode: cachedFacingMode || 'user',
        cachedDeviceIds,
      })

      const videoTrack = tracks.find(t => t.kind === 'video')
      if (!videoTrack) throw new Error('No video track created')

      // Cache device settings
      const settings = (videoTrack as any).mediaStreamTrack?.getSettings()
      if (settings) {
        setCachedDeviceIds(prev => ({ ...prev, video: settings.deviceId }))
        if (settings.facingMode) {
          setCachedFacingMode(settings.facingMode as 'user' | 'environment')
          setFacingMode(settings.facingMode as 'user' | 'environment')
        }
      }

      // Track quality level
      if (usedConstraints.video?.level !== undefined) {
        setCurrentQualityLevel(usedConstraints.video.level)
      }

      // Expose preview track
      setLocalVideo({
        participantId: 'preview',
        track: videoTrack as any,
        kind: 'video',
        isLocal: true,
      })

      // Attach debug preview
      attachDebugPreview(videoTrack)

      mark('preview_ready')
      console.log('[MediaProvider] Preview stream active')

    } catch (error: any) {
      console.error('[MediaProvider] Preview failed:', error)
      const errorType = classifyMediaError(error)
      setPermissionError({ error, type: errorType })
      throw error
    } finally {
      setConnecting(false)
    }
  }, [localVideo, cachedFacingMode, cachedDeviceIds, mark])

  const hasPreviewStream = useCallback(() => {
    return !!localVideo && localVideo.participantId === 'preview'
  }, [localVideo])
  
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
  
  // Restore auto-promotion on page visibility return
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && room) {
        ensureSubscribed(room);
        sweepForFirstRemoteVideoAndPromote(room);
      }
    };
    
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [room, sweepForFirstRemoteVideoAndPromote])
  
  const value: MediaContext = {
    room,
    connected,
    connecting,
    connectionState,
    permissionError,
    tokenError,
    needsAudioUnlock,
    mediaReady,
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
    markUserPinned,
    previewOnly,
    hasPreviewStream,
  }
  
  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>
}
