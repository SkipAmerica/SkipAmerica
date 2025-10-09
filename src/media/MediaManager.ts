import { MEDIA_DEFAULTS, MediaInitOptions, MediaMetrics } from './media-types';
import { MediaError, toMediaError } from './media-errors';

export class MediaManager {
  private currentStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private starting = false;
  private stopping = false;
  private startPromise: Promise<MediaStream> | null = null;
  private pc: RTCPeerConnection | null = null;
  private metrics: MediaMetrics;

  constructor(metrics?: MediaMetrics) {
    this.metrics = metrics || {};
    // Auto-cleanup on tab hide/unload
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.stop('visibilitychange');
    });
    window.addEventListener('beforeunload', () => this.stop('beforeunload'));
  }

  hasLocalStream() { return !!this.currentStream; }
  getLocalStream() { return this.currentStream; }
  setPeerConnection(pc: RTCPeerConnection | null) { this.pc = pc; }

  private attach(el: HTMLMediaElement | null | undefined, stream: MediaStream, muted = false) {
    if (!el) return;
    // iOS/Safari requirements
    // @ts-ignore
    el.playsInline = true;
    el.autoplay = true;
    (el as any).muted = muted;
    (el as any).srcObject = stream;
    const p = (el as any).play?.();
    if (p && typeof p.then === 'function') p.catch(() => {});
  }

  private detachAll() {
    document.querySelectorAll('video, audio').forEach((el: any) => {
      if (el?.srcObject) {
        el.srcObject = null;
        try { el.pause?.(); } catch {}
      }
    });
  }

  private stopTracks(stream: MediaStream | null) {
    if (!stream) return;
    stream.getTracks().forEach(t => { try { t.stop(); } catch {} });
  }

  async start(opts: MediaInitOptions): Promise<MediaStream> {
    const retryCfg = { ...MEDIA_DEFAULTS.retry, ...(opts.retry || {}) };
    const exec = async () => {
      this.metrics.onEvent?.('media_start_attempt', { target: opts.targetState });
      if (this.stopping) await this.waitUntil(() => !this.stopping, 1500);
      if (this.currentStream && !this.starting) {
        // Already started: just reattach
        this.attach(opts.videoEl || null, this.currentStream, true);
        if (opts.audioEl) this.attach(opts.audioEl, this.currentStream, false);
        return this.currentStream;
      }
      if (this.starting && this.startPromise) return this.startPromise;

      this.starting = true;
      this.startPromise = (async () => {
        const video = typeof opts.video === 'boolean' ? opts.video : (opts.video ?? { facingMode: 'user' });
        const audio = typeof opts.audio === 'boolean' ? opts.audio : (opts.audio ?? true);
        const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
        this.currentStream = stream;
        // Attach after we have the stream so Safari shows preview and "considers it playing"
        this.attach(opts.videoEl || null, stream, true);
        if (!opts.previewOnly && opts.audioEl) this.attach(opts.audioEl, stream, false);
        this.metrics.onEvent?.('media_start_success', { target: opts.targetState });
        return stream;
      })();

      try {
        return await this.startPromise;
      } catch (e) {
        const me = toMediaError(e);
        this.metrics.onError?.(me.code, me, { target: opts.targetState });
        throw me;
      } finally {
        this.starting = false;
        this.startPromise = null;
      }
    };

    let attempt = 0;
    while (true) {
      try { return await exec(); }
      catch (e) {
        attempt++;
        if (attempt > retryCfg.attempts) throw e;
        await new Promise(r => setTimeout(r, retryCfg.backoffMs * attempt));
      }
    }
  }

  async stop(reason: string = 'manual') {
    if (this.starting) await this.waitUntil(() => !this.starting, 1500);
    if (this.stopping) return;
    this.stopping = true;
    this.metrics.onEvent?.('media_stop', { reason });

    try {
      if (this.pc) {
        try { this.pc.ontrack = null; this.pc.onicecandidate = null; } catch {}
        try { this.pc.getSenders?.().forEach(s => s.track && s.track.stop()); } catch {}
        try { this.pc.getReceivers?.().forEach(r => r.track && r.track.stop()); } catch {}
        try { this.pc.close(); } catch {}
        this.pc = null;
      }
      this.stopTracks(this.currentStream);
      this.stopTracks(this.remoteStream);
      this.detachAll();
      this.currentStream = null;
      this.remoteStream = null;
    } finally {
      this.stopping = false;
    }
  }

  attachRemote(remote: MediaStream, videoEl?: HTMLVideoElement | null, audioEl?: HTMLAudioElement | null) {
    this.remoteStream = remote;
    if (videoEl) this.attach(videoEl, remote, false);
    if (audioEl) this.attach(audioEl, remote, false);
  }

  private async waitUntil(cond: () => boolean, timeoutMs: number) {
    const start = Date.now();
    while (!cond()) {
      if (Date.now() - start > timeoutMs) break;
      await new Promise(r => setTimeout(r, 50));
    }
  }
}

export const createMediaManager = (metrics?: MediaMetrics) => new MediaManager(metrics);