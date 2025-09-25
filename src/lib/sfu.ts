import { Room, RoomEvent, RemoteTrack, Track, createLocalTracks, LocalTrack } from "livekit-client";

export type SFUHandle = {
  room: Room;
  connect: (host: string, token: string) => Promise<void>;
  createLocalAV: () => Promise<LocalTrack[]>;
  attachRemoteVideo: (target: HTMLVideoElement) => void;
  disconnect: () => Promise<void>;
};

export function createSFU(): SFUHandle {
  console.log("[SFU] HELPER LOADED");
  const room = new Room({ adaptiveStream: true, dynacast: true });

  function attachRemoteVideo(target: HTMLVideoElement) {
    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
      if (track.kind !== Track.Kind.Video) return;
      console.log("[SFU] TrackSubscribed (video)");
      track.attach(target);
      // Try to autoplay without gesture
      target.muted = false; target.playsInline = true; target.autoplay = true;
      target.play?.().catch(() => {});
    });
  }

  async function connect(host: string, token: string) {
    console.log("[SFU] Connecting to:", host);
    await room.connect(host, token);
    console.log("[SFU] Connected");
  }

  async function createLocalAV() {
    const tracks = await createLocalTracks({ audio: true, video: { facingMode: "user" } });
    console.log("[SFU] Local tracks ready:", tracks.map(t => t.kind));
    return tracks;
  }

  async function disconnect() {
    await room.disconnect();
    console.log("[SFU] Disconnected");
  }

  return { room, connect, createLocalAV, attachRemoteVideo, disconnect };
}