import {
  Room, RoomEvent, Track, RemoteTrack, createLocalTracks, RemoteParticipant, RemoteTrackPublication,
} from "livekit-client";

export type LivekitRole = "creator" | "viewer";

export type SFU = {
  room: Room;
  connect: (tokenUrl: string, payload: { role: LivekitRole; creatorId: string; identity: string }) => Promise<void>;
  publishCameraMic: (opts?: { audio?: boolean; video?: MediaTrackConstraints }) => Promise<void>;
  onFirstRemoteVideo: (cb: (videoEl: HTMLVideoElement) => void) => void;
  onRemoteVideoAny: (cb: (videoEl: HTMLVideoElement, p: RemoteParticipant) => void) => void;
  disconnect: () => Promise<void>;
};

function ensureAutoplay(el: HTMLVideoElement) {
  el.autoplay = true;
  el.playsInline = true;
}

export function createSFU(): SFU {
  const room = new Room({ adaptiveStream: true, dynacast: true });

  function onFirstRemoteVideo(cb: (videoEl: HTMLVideoElement) => void) {
    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication) => {
      if (track?.kind === Track.Kind.Video) {
        const el = document.createElement("video");
        ensureAutoplay(el);
        track.attach(el);
        cb(el);
      }
    });
  }

  function onRemoteVideoAny(cb: (videoEl: HTMLVideoElement, p: RemoteParticipant) => void) {
    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track?.kind === Track.Kind.Video) {
        const el = document.createElement("video");
        ensureAutoplay(el);
        track.attach(el);
        cb(el, participant);
      }
    });
  }

  async function connect(tokenUrl: string, payload: { role: LivekitRole; creatorId: string; identity: string }) {
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "accept": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    if (!res.ok || !j?.token) throw new Error(`token http ${res.status} ${JSON.stringify(j)}`);
    const host = j.url ?? "wss://skipamerica-uqpk6if5.livekit.cloud";
    if (!host) throw new Error("Missing LiveKit host");
    await room.connect(host, j.token);
  }

  async function publishCameraMic(opts?: { audio?: boolean; video?: MediaTrackConstraints }) {
    const tracks = await createLocalTracks({
      audio: opts?.audio ?? true,
      video: opts?.video ?? { facingMode: "user" } as any,
    });
    for (const t of tracks) await room.localParticipant.publishTrack(t);
  }

  async function disconnect() {
    await room.disconnect();
  }

  return { room, connect, publishCameraMic, onFirstRemoteVideo, onRemoteVideoAny, disconnect };
}