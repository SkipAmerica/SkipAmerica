import {
  Room, RoomEvent, Track, RemoteTrack, RemoteParticipant,
  RemoteTrackPublication, createLocalTracks, ConnectionError
} from "livekit-client";

console.log("[SFU] helper loaded");

// HUD integration for SFU events
function updateHUD(updates: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).__PQHUD) {
    (window as any).__PQHUD(updates);
  }
}

export function createSFU() {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
    // be explicit
    // @ts-ignore
    autoSubscribe: true,
  });

  function attachVideoFromParticipant(p: RemoteParticipant, useEl?: HTMLVideoElement) {
    p.trackPublications.forEach((pub: RemoteTrackPublication) => {
      const track = pub.track;
      if (!track || track.kind !== Track.Kind.Video) return;
      if (useEl) {
        // attach into existing element to avoid "play() interrupted" swap
        track.attach(useEl);
      } else {
        const el = document.createElement("video");
        el.autoplay = true;
        el.playsInline = true;
        el.muted = true; // autoplay-safe
        track.attach(el);
        document.body.appendChild(el); // consumer will usually replace/attach elsewhere
      }
    });
  }

  function onRemoteVideo(cb: (videoEl: HTMLVideoElement) => void) {
    // live subscriptions
    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
      console.log('[SFU] TrackSubscribed:', track.kind);
      updateHUD({ 'TrackSubscribed': track.kind, 'Tracks': room.remoteParticipants.size });
      
      if (track.kind === Track.Kind.Video) {
        // Try to use existing video element with id "pq-video"
        const existingVideo = document.getElementById("pq-video") as HTMLVideoElement;
        if (existingVideo) {
          track.attach(existingVideo);
          updateHUD({ 'VideoReady': true });
          console.log('[SFU] Attached to existing #pq-video element');
          cb(existingVideo);
        } else {
          const el = document.createElement("video");
          el.autoplay = true;
          el.playsInline = true;
          el.muted = true;
          track.attach(el);
          updateHUD({ 'VideoReady': true });
          cb(el);
        }
      }
    });
    
    // catch-up for existing participants
    room.remoteParticipants.forEach((p) => {
      console.log('[SFU] ParticipantConnected (catchup):', p.identity);
      updateHUD({ 'ParticipantConnected': p.identity });
      attachVideoFromParticipant(p);
    });
    
    room.on(RoomEvent.ParticipantConnected, (p) => {
      console.log('[SFU] ParticipantConnected:', p.identity);
      updateHUD({ 'ParticipantConnected': p.identity });
      attachVideoFromParticipant(p);
    });
  }

  async function connect(host: string, token: string) {
    console.log('[SFU] connect start');
    updateHUD({ 'Ch Status': '(SFU)', 'PC': 'connecting' });
    
    try {
      await room.connect(host, token);
      console.log('[SFU] connect success');
      updateHUD({ 'PC': 'connected' });
    } catch (e: any) {
      console.error('[SFU] connect error:', e);
      updateHUD({ 'PC': 'failed' });
      
      const msg = String(e?.message ?? e);
      const looksLikePcFail = e instanceof ConnectionError || msg.includes('pc connection') || msg.includes('ICE');
      if (!looksLikePcFail) throw e;
      console.warn('[SFU] Primary connect failed, retrying with TURN relay only...');
      updateHUD({ 'PC': 'retrying' });
      await room.connect(host, token, { rtcConfig: { iceTransportPolicy: 'relay' } as any });
      console.log('[SFU] retry connect success');
      updateHUD({ 'PC': 'connected' });
    }
    console.log('[SFU] connected, participants:', room.remoteParticipants.size);
    updateHUD({ 'Tracks': room.remoteParticipants.size });
    
    // Add event listeners for HUD updates
    room.on(RoomEvent.ConnectionStateChanged, (state) => {
      console.log('[SFU] ConnectionStateChanged:', state);
      updateHUD({ 'PC': state });
    });
    
    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      console.log('[SFU] ActiveSpeakersChanged:', speakers.length);
      updateHUD({ 'ActiveSpeakers': speakers.length });
    });
  }

  async function publishCameraMic() {
    if (room.state !== 'connected') {
      await new Promise<void>((resolve) => {
        const h = () => { room.off(RoomEvent.Connected, h as any); resolve(); };
        room.on(RoomEvent.Connected, h as any);
      });
    }
    const tracks = await createLocalTracks({ audio: true, video: { facingMode: "user" } });
    for (const t of tracks) await room.localParticipant.publishTrack(t);
    console.log('[SFU] published tracks:', room.localParticipant.getTrackPublications().length);
  }

  async function disconnect() {
    console.log('[SFU] Disconnecting');
    await room.disconnect();
  }

  return { room, connect, publishCameraMic, attachVideoFromParticipant, onRemoteVideo, disconnect };
}