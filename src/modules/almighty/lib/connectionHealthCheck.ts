import { Room } from 'livekit-client'

/**
 * Start periodic health checks for LiveKit connection diagnostics
 * Logs detailed room state, participant info, and DOM video element states
 */
export function startConnectionHealthCheck(room: Room, interval = 5000): () => void {
  const checkInterval = setInterval(() => {
    if (!room || room.state !== 'connected') {
      clearInterval(checkInterval)
      return
    }
    
    const videoElements = document.querySelectorAll('video')
    
    console.log('[HEALTH_CHECK]', {
      timestamp: new Date().toISOString(),
      room: {
        state: room.state,
        name: room.name,
        localParticipant: {
          sid: room.localParticipant.sid,
          identity: room.localParticipant.identity,
          trackPublications: room.localParticipant.trackPublications.size,
          tracks: Array.from(room.localParticipant.trackPublications.values()).map((pub: any) => ({
            kind: pub.kind,
            sid: pub.trackSid,
            hasTrack: !!pub.track,
            isMuted: pub.isMuted,
            isEnabled: pub.track?.isEnabled
          }))
        },
        remoteParticipants: {
          count: room.remoteParticipants.size,
          participants: Array.from(room.remoteParticipants.values()).map((p: any) => ({
            sid: p.sid,
            identity: p.identity,
            trackPublications: p.trackPublications.size,
            tracks: Array.from(p.trackPublications.values()).map((pub: any) => ({
              kind: pub.kind,
              sid: pub.trackSid,
              subscribed: pub.isSubscribed,
              hasTrack: !!pub.track,
              isMuted: pub.isMuted,
              isEnabled: pub.track?.isEnabled
            }))
          }))
        }
      },
      dom: {
        videoElementCount: videoElements.length,
        videoElements: Array.from(videoElements).map((el: any, idx) => ({
          index: idx,
          hasSrcObject: !!el.srcObject,
          srcObjectTracks: el.srcObject?.getTracks().length || 0,
          videoWidth: el.videoWidth,
          videoHeight: el.videoHeight,
          readyState: el.readyState,
          paused: el.paused,
          muted: el.muted,
          autoplay: el.autoplay
        }))
      }
    })
  }, interval)
  
  return () => clearInterval(checkInterval)
}
