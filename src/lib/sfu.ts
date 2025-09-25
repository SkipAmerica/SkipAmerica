import {
  Room, RoomEvent, Track, RemoteTrack, RemoteParticipant,
  RemoteTrackPublication, createLocalTracks, ConnectionError
} from "livekit-client";

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
      if (track.kind === Track.Kind.Video) {
        const el = document.createElement("video");
        el.autoplay = true;
        el.playsInline = true;
        el.muted = true;
        track.attach(el);
        cb(el);
      }
    });
    // catch-up for existing participants
    room.remoteParticipants.forEach((p) => attachVideoFromParticipant(p));
    room.on(RoomEvent.ParticipantConnected, (p) => attachVideoFromParticipant(p));
  }

  async function connect(host: string, token: string) {
    try {
      await room.connect(host, token);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      const looksLikePcFail = e instanceof ConnectionError || msg.includes('pc connection') || msg.includes('ICE');
      if (!looksLikePcFail) throw e;
      console.warn('[SFU] Primary connect failed, retrying with TURN relay only...');
      await room.connect(host, token, { rtcConfig: { iceTransportPolicy: 'relay' } as any });
    }
    console.log('[SFU] connected, participants:', room.remoteParticipants.size);
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