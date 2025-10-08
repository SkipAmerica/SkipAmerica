import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant, createLocalTracks } from "livekit-client";

export type ConnectArgs = { role: "publisher" | "viewer"; creatorId: string; identity: string };

export type SFUHandle = {
  room: Room;
  connect: (url: string, token: string) => Promise<void>;
  publishCameraMic: () => Promise<void>;
  onRemoteVideo: (cb: (videoEl: HTMLVideoElement, participantIdentity: string) => void) => void;
  onTrackUnsubscribed: (cb: () => void) => void;
  onDisconnected: (cb: () => void) => void;
  onConnectionStateChange: (cb: (state: string) => void) => void;
  disconnect: () => Promise<void>;
};

export function createSFU(): SFUHandle {
  const room = new Room({ adaptiveStream: true, dynacast: true });
  
  function onRemoteVideo(cb: (videoEl: HTMLVideoElement, participantIdentity: string) => void) {
    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _publication: any, participant: RemoteParticipant) => {
      if (track.kind === Track.Kind.Video) {
        console.log("[SFU] Video track subscribed:", participant.identity);
        const el = document.createElement("video");
        el.autoplay = true; 
        el.playsInline = true; 
        el.muted = false;
        track.attach(el); 
        cb(el, participant.identity);
      } else if (track.kind === Track.Kind.Audio) {
        console.log("[SFU] Audio track subscribed:", participant.identity);
        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        audioEl.muted = false;
        track.attach(audioEl);
        // Append to body so browser can play it
        document.body.appendChild(audioEl);
      }
    });
  }

  function onTrackUnsubscribed(cb: () => void) {
    room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, _publication: any, participant: RemoteParticipant) => {
      if (track.kind === Track.Kind.Video) {
        console.log("[SFU] Video track unsubscribed (normal):", participant.identity);
        cb();
      } else if (track.kind === Track.Kind.Audio) {
        console.log("[SFU] Audio track unsubscribed:", participant.identity);
        // Clean up audio elements when track ends
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(el => {
          if (el.srcObject && (el.srcObject as MediaStream).active === false) {
            el.remove();
          }
        });
      }
    });
  }

  function onDisconnected(cb: () => void) {
    room.on(RoomEvent.Disconnected, (reason?: any) => {
      console.warn("[SFU] Room disconnected:", reason);
      cb();
    });
  }

  function onConnectionStateChange(cb: (state: string) => void) {
    room.on(RoomEvent.ConnectionStateChanged, (state) => {
      console.log("[SFU] Connection state changed:", state);
      cb(state.toString());
    });
  }

  async function connect(url: string, token: string) {
    console.log("[SFU] connecting to", url);
    await room.connect(url, token);
    console.log("[SFU] connected");
  }

  async function publishCameraMic() {
    const tracks = await createLocalTracks({ audio: true, video: { facingMode: "user" } });
    for (const t of tracks) await room.localParticipant.publishTrack(t);
  }

  async function disconnect() { 
    await room.disconnect(); 
  }

  return { room, connect, publishCameraMic, onRemoteVideo, onTrackUnsubscribed, onDisconnected, onConnectionStateChange, disconnect };
}