import { Room, RoomEvent, Track, RemoteTrack, createLocalTracks } from "livekit-client";

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
    let attached = false;
    room.on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
      if (track.kind !== Track.Kind.Video || attached) return;
      const el = document.createElement("video");
      el.autoplay = true;
      el.playsInline = true;
      el.muted = true;      // autoplay-safe
      track.attach(el);
      attached = true;
      console.log("[SFU] remote video attached");
      cb(el);
    });
  }

  async function connect(host: string, token: string) {
    console.log('[SFU] Connecting to:', host);
    await room.connect(host, token);
    console.log('[SFU] Connected successfully');
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