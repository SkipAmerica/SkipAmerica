import {
  Room,
  RoomEvent,
  RemoteTrack,
  Track,
  RemoteParticipant,
  RoomConnectOptions,
} from "livekit-client";

export type SFUHandle = {
  room: Room;
  connect: (host: string, token: string, opts?: RoomConnectOptions) => Promise<void>;
  publishCameraMic: (constraints?: MediaStreamConstraints) => Promise<void>;
  attachRemoteVideoTo: (videoEl: HTMLVideoElement) => void;
  disconnect: () => Promise<void>;
};

export function createSFU(): SFUHandle {
  // Enable adaptive delivery
  const room = new Room({ adaptiveStream: true, dynacast: true });

  let attachedVideo: HTMLVideoElement | null = null;
  let currentVideoTrack: RemoteTrack | null = null;

  function log(...args: any[]) {
    console.log("[SFU]", ...args);
  }

  function safelyPlay(el: HTMLVideoElement) {
    // Chrome/Safari autoplay policy: video must be muted or user-gestured
    el.muted = true;
    el.playsInline = true;
    el.autoplay = true;

    // Only call play() once per attach; guard AbortError noise
    el.play()?.catch((err) => {
      log("autoplay blocked; awaiting user gesture", err?.name || err);
      // Show a minimal inline overlay prompting user gesture
      if (!el.dataset.awaitingGesture) {
        el.dataset.awaitingGesture = "1";
        const overlay = document.createElement("button");
        overlay.textContent = "Tap to start video";
        overlay.style.position = "absolute";
        overlay.style.inset = "0";
        overlay.style.display = "grid";
        overlay.style.placeItems = "center";
        overlay.style.background = "rgba(0,0,0,0.35)";
        overlay.style.color = "white";
        overlay.style.fontSize = "16px";
        overlay.style.border = "none";
        overlay.style.cursor = "pointer";
        overlay.onclick = () => {
          overlay.remove();
          delete el.dataset.awaitingGesture;
          el.play().catch(() => {/* ignore */});
        };
        // parent must be position:relative in CSS for perfect cover; still OK if not
        el.parentElement?.appendChild(overlay);
      }
    });
  }

  function attachIfVideo(track: RemoteTrack) {
    if (!attachedVideo) return;
    if (track.kind !== Track.Kind.Video) return;

    // Detach previous
    if (currentVideoTrack) {
      try { currentVideoTrack.detach(attachedVideo!); } catch {}
    }

    currentVideoTrack = track;
    try {
      track.attach(attachedVideo);
      safelyPlay(attachedVideo);
      log("remote video attached");
    } catch (e) {
      log("failed to attach remote video", e);
    }
  }

  function attachExistingParticipantVideo(p: RemoteParticipant) {
    // If track is already subscribed when viewer connects (late join)
    p.videoTrackPublications.forEach((pub) => {
      if (pub.track) attachIfVideo(pub.track);
    });
  }

  function attachRemoteVideoTo(videoEl: HTMLVideoElement) {
    attachedVideo = videoEl;
    // If we already have a track, re-attach
    if (currentVideoTrack) {
      try {
        currentVideoTrack.attach(attachedVideo);
        safelyPlay(attachedVideo);
      } catch {}
    }
  }

  room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
    if (track.kind === Track.Kind.Video) {
      log("TrackSubscribed (video)");
      attachIfVideo(track);
    }
  });

  room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
    if (currentVideoTrack === track && attachedVideo) {
      try { track.detach(attachedVideo); } catch {}
      currentVideoTrack = null;
      // keep <video> rendered; will re-attach on next TrackSubscribed
      log("TrackUnsubscribed (video)");
    }
  });

  room.on(RoomEvent.ParticipantConnected, (p) => {
    log("ParticipantConnected", p.identity);
    attachExistingParticipantVideo(p);
  });

  async function connect(host: string, token: string, opts?: RoomConnectOptions) {
    log("Connecting to:", host);
    await room.connect(host, token, opts);
    log("Connected");
    // For late join: check already-present participants
    room.remoteParticipants.forEach((p) => attachExistingParticipantVideo(p));
  }

  async function publishCameraMic(constraints?: MediaStreamConstraints) {
    // Creator path
    const audio = constraints?.audio ?? true;
    const video = constraints?.video ?? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } };
    const tracks = await navigator.mediaDevices.getUserMedia({ audio, video });
    // Publish tracks
    for (const track of tracks.getTracks()) {
      // livekit-client can take a MediaStreamTrack directly
      await room.localParticipant.publishTrack(track);
    }
  }

  async function disconnect() {
    try { await room.disconnect(); } catch {}
  }

  return { room, connect, publishCameraMic, attachRemoteVideoTo, disconnect };
}
