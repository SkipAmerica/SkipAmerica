import { Room, RoomEvent, Track, RemoteTrack, createLocalTracks } from "livekit-client";

export type ConnectArgs = { role: "creator" | "viewer"; creatorId: string; identity: string };

export type SFUHandle = {
  room: Room;
  connect: (tokenUrl: string, args: ConnectArgs) => Promise<void>;
  publishCameraMic: () => Promise<void>;
  onRemoteVideo: (cb: (videoEl: HTMLVideoElement) => void) => void;
  disconnect: () => Promise<void>;
};

export function createSFU(): SFUHandle {
  const room = new Room({ adaptiveStream: true, dynacast: true });
  
  function onRemoteVideo(cb: (videoEl: HTMLVideoElement) => void) {
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
  }

  async function connect(tokenUrl: string, { role, creatorId, identity }: ConnectArgs) {
    console.log("[SFU] token fetch", { tokenUrl, role, creatorId, identity });
    const resp = await fetch(tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer anon" },
      body: JSON.stringify({ role, creatorId, identity }),
    });
    const json = await resp.json();
    console.log("[SFU] token resp", resp.status, json && Object.keys(json));
    if (!resp.ok || !json?.token || !json?.url) throw new Error("token fetch failed");
    console.log("[SFU] connecting to", json.url);
    await room.connect(json.url, json.token);
    console.log("[SFU] connected");
  }

  async function publishCameraMic() {
    const tracks = await createLocalTracks({ audio: true, video: { facingMode: "user" } });
    for (const t of tracks) await room.localParticipant.publishTrack(t);
  }

  async function disconnect() { 
    await room.disconnect(); 
  }

  return { room, connect, publishCameraMic, onRemoteVideo, disconnect };
}