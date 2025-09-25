import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant, RemoteTrackPublication, createLocalTracks, ConnectionError } from "livekit-client";

function attachVideoFromParticipant(p: RemoteParticipant, cb: (el: HTMLVideoElement) => void) {
  p.trackPublications.forEach((pub: RemoteTrackPublication) => {
    const track = pub.track;
    if (track && track.kind === Track.Kind.Video) {
      const el = document.createElement("video");
      el.autoplay = true;
      el.playsInline = true;
      el.muted = true; // allow autoplay without user gesture
      track.attach(el);
      cb(el);
    }
  });
}

export type SFUHandle = {
  room: Room;
  connect: (host: string, token: string) => Promise<void>;
  publishCameraMic: () => Promise<void>;
  onRemoteVideo: (cb: (videoEl: HTMLVideoElement) => void) => void;
  disconnect: () => Promise<void>;
};

export function createSFU(): SFUHandle {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
    // autosubscribe remote tracks so they're ready immediately
    // (LiveKit JS defaults to true, but we declare it explicitly)
    // @ts-ignore
    autoSubscribe: true,
  });

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
    room.remoteParticipants.forEach((p) => attachVideoFromParticipant(p, cb));
    room.on(RoomEvent.ParticipantConnected, (p) => attachVideoFromParticipant(p, cb));
  }

  async function connect(host: string, token: string) {
    // 1st attempt: normal (UDP preferred). If it fails, force TURN relay.
    try {
      await room.connect(host, token);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      const looksLikePcFail = e instanceof ConnectionError || msg.includes('pc connection') || msg.includes('ICE');
      if (!looksLikePcFail) throw e;

      console.warn('[SFU] Primary connect failed, retrying with TURN relay only...');
      await room.connect(host, token, {
        rtcConfig: { iceTransportPolicy: 'relay' } as any, // force TURN relay
      });
    }

    // after connect, another catch-up pass
    room.remoteParticipants.forEach((p) => attachVideoFromParticipant(p, () => {}));
  }

  async function publishCameraMic() {
    // publish only after we're connected
    if (room.state !== 'connected') {
      await new Promise<void>((resolve) => {
        const handler = () => { room.off(RoomEvent.Connected, handler as any); resolve(); };
        room.on(RoomEvent.Connected, handler as any);
      });
    }
    const tracks = await createLocalTracks({ audio: true, video: { facingMode: 'user' } });
    for (const t of tracks) await room.localParticipant.publishTrack(t);
  }

  async function disconnect() {
    console.log('[SFU] Disconnecting');
    await room.disconnect();
  }

  return { room, connect, publishCameraMic, onRemoteVideo, disconnect };
}