import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant, RemoteTrackPublication, createLocalTracks } from "livekit-client";

function attachVideoFromParticipant(p: RemoteParticipant, cb: (el: HTMLVideoElement) => void) {
  p.trackPublications.forEach((pub: RemoteTrackPublication) => {
    const track = pub.track;
    if (track && track.kind === Track.Kind.Video) {
      const el = document.createElement("video");
      el.autoplay = true;
      el.playsInline = true;
      el.muted = false;
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
  const room = new Room({ adaptiveStream: true, dynacast: true });

  function onRemoteVideo(cb: (videoEl: HTMLVideoElement) => void) {
    // live subscriptions
    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video) {
        const el = document.createElement("video");
        el.autoplay = true;
        el.playsInline = true;
        el.muted = false;
        track.attach(el);
        cb(el);
      }
    });

    // catch-up for participants already in the room
    room.remoteParticipants.forEach((p) => attachVideoFromParticipant(p, cb));
    // and future joins that might have tracks immediately
    room.on(RoomEvent.ParticipantConnected, (p) => {
      attachVideoFromParticipant(p, cb);
    });
  }

  async function connect(host: string, token: string) {
    console.log('[SFU] Connecting to:', host);
    await room.connect(host, token);
    console.log('[SFU] Connected successfully');
    // after connect, run another catch-up pass (in case participants existed at join)
    room.remoteParticipants.forEach((p) => attachVideoFromParticipant(p, () => {}));
  }

  async function publishCameraMic() {
    console.log('[SFU] Publishing camera/mic');
    const tracks = await createLocalTracks({ 
      audio: true, 
      video: { facingMode: "user" } 
    });
    for (const t of tracks) {
      await room.localParticipant.publishTrack(t);
      console.log('[SFU] Published track:', t.kind);
    }
  }

  async function disconnect() {
    console.log('[SFU] Disconnecting');
    await room.disconnect();
  }

  return { room, connect, publishCameraMic, onRemoteVideo, disconnect };
}