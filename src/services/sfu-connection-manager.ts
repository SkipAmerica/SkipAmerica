import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant, createLocalTracks, LocalTrack, DisconnectReason } from "livekit-client";
import { fetchLiveKitToken } from "@/lib/livekitToken";

export type ConnectionConfig = {
  role: "publisher" | "viewer";
  creatorId: string;
  identity: string;
};

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed';

export type VideoTrackHandler = (videoEl: HTMLVideoElement, participantIdentity: string) => void;
export type StateChangeHandler = (state: ConnectionState) => void;
export type DisconnectHandler = () => void;

type ConnectionEntry = {
  room: Room;
  config: ConnectionConfig;
  state: ConnectionState;
  refCount: number;
  reconnectAttempts: number;
  reconnectTimeout?: NodeJS.Timeout;
  stateHandlers: Set<StateChangeHandler>;
  disconnectHandlers: Set<DisconnectHandler>;
  videoHandlers: Set<VideoTrackHandler>;
  localTracks: LocalTrack[];
};

const MAX_RECONNECT_ATTEMPTS = 3;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 10000;

/**
 * Singleton service for managing LiveKit SFU connections
 * Implements connection pooling, circuit breaker pattern, and resource management
 */
class SFUConnectionManager {
  private static instance: SFUConnectionManager;
  private connections = new Map<string, ConnectionEntry>();

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): SFUConnectionManager {
    if (!SFUConnectionManager.instance) {
      SFUConnectionManager.instance = new SFUConnectionManager();
    }
    return SFUConnectionManager.instance;
  }

  /**
   * Get or create a connection for the given config
   * Uses connection pooling - multiple consumers can share the same connection
   */
  async connect(config: ConnectionConfig): Promise<string> {
    const roomKey = this.getRoomKey(config);
    
    let entry = this.connections.get(roomKey);
    
    if (entry) {
      // Reuse existing connection
      entry.refCount++;
      console.log(`[SFUConnectionManager] Reusing connection for ${roomKey}, refCount: ${entry.refCount}`);
      return roomKey;
    }

    // Create new connection
    console.log(`[SFUConnectionManager] Creating new connection for ${roomKey}`);
    const room = new Room({ 
      adaptiveStream: true, 
      dynacast: true,
      disconnectOnPageLeave: false, // We'll manage disconnection manually
    });

    entry = {
      room,
      config,
      state: 'connecting',
      refCount: 1,
      reconnectAttempts: 0,
      stateHandlers: new Set(),
      disconnectHandlers: new Set(),
      videoHandlers: new Set(),
      localTracks: [],
    };

    this.connections.set(roomKey, entry);
    this.setupRoomHandlers(roomKey, entry);

    try {
      await this.performConnection(roomKey, entry);
      return roomKey;
    } catch (error) {
      console.error(`[SFUConnectionManager] Initial connection failed for ${roomKey}:`, error);
      this.updateState(roomKey, 'failed');
      throw error;
    }
  }

  /**
   * Disconnect from a connection (decrements ref count)
   */
  async disconnect(roomKey: string): Promise<void> {
    const entry = this.connections.get(roomKey);
    if (!entry) return;

    entry.refCount--;
    console.log(`[SFUConnectionManager] Disconnect called for ${roomKey}, refCount: ${entry.refCount}`);

    if (entry.refCount <= 0) {
      // No more consumers, clean up
      console.log(`[SFUConnectionManager] Cleaning up connection ${roomKey}`);
      
      if (entry.reconnectTimeout) {
        clearTimeout(entry.reconnectTimeout);
      }

      // Clean up local tracks
      for (const track of entry.localTracks) {
        track.stop();
      }
      entry.localTracks = [];

      // Remove all event listeners before disconnect
      entry.room.removeAllListeners();
      await entry.room.disconnect();
      this.connections.delete(roomKey);
      this.updateState(roomKey, 'idle');
    }
  }

  /**
   * Subscribe to video tracks
   */
  onVideoTrack(roomKey: string, handler: VideoTrackHandler): () => void {
    const entry = this.connections.get(roomKey);
    if (!entry) return () => {};

    entry.videoHandlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      entry.videoHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(roomKey: string, handler: StateChangeHandler): () => void {
    const entry = this.connections.get(roomKey);
    if (!entry) return () => {};

    entry.stateHandlers.add(handler);
    
    // Immediately call with current state
    handler(entry.state);
    
    return () => {
      entry.stateHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to disconnection events
   */
  onDisconnect(roomKey: string, handler: DisconnectHandler): () => void {
    const entry = this.connections.get(roomKey);
    if (!entry) return () => {};

    entry.disconnectHandlers.add(handler);
    
    return () => {
      entry.disconnectHandlers.delete(handler);
    };
  }

  /**
   * Publish local camera and microphone
   */
  async publishCameraMic(roomKey: string): Promise<void> {
    const entry = this.connections.get(roomKey);
    if (!entry) throw new Error(`No connection found for ${roomKey}`);

    const tracks = await createLocalTracks({ 
      audio: true, 
      video: { facingMode: "user" } 
    });
    
    entry.localTracks = tracks;
    
    for (const track of tracks) {
      await entry.room.localParticipant.publishTrack(track);
    }
    
    console.log(`[SFUConnectionManager] Published ${tracks.length} local tracks for ${roomKey}`);
  }

  /**
   * Get current connection state
   */
  getState(roomKey: string): ConnectionState {
    const entry = this.connections.get(roomKey);
    return entry?.state || 'idle';
  }

  /**
   * Get the room instance (for advanced use cases)
   */
  getRoom(roomKey: string): Room | undefined {
    return this.connections.get(roomKey)?.room;
  }

  // Private methods

  private getRoomKey(config: ConnectionConfig): string {
    return `${config.role}_${config.creatorId}_${config.identity}`;
  }

  private setupRoomHandlers(roomKey: string, entry: ConnectionEntry): void {
    const { room } = entry;

    // Handle video track subscriptions
    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _publication: any, participant: RemoteParticipant) => {
      if (track.kind === Track.Kind.Video) {
        console.log(`[SFUConnectionManager] Video track subscribed for ${roomKey}:`, participant.identity);
        
        // Create video element and attach track
        const videoEl = document.createElement("video");
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.muted = false;
        track.attach(videoEl);
        
        // Notify all handlers
        entry.videoHandlers.forEach(handler => {
          handler(videoEl, participant.identity);
        });
      }
    });

    // Handle track unsubscription (normal during stream changes)
    room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, _publication: any, participant: RemoteParticipant) => {
      if (track.kind === Track.Kind.Video) {
        console.log(`[SFUConnectionManager] Video track unsubscribed for ${roomKey}:`, participant.identity);
      }
    });

    // Handle disconnection
    room.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
      console.warn(`[SFUConnectionManager] Room disconnected for ${roomKey}:`, reason);
      this.updateState(roomKey, 'disconnected');
      
      // Notify disconnect handlers
      entry.disconnectHandlers.forEach(handler => handler());
      
      // Only reconnect if it's an unexpected disconnect (not client-initiated)
      if (reason !== DisconnectReason.CLIENT_INITIATED) {
        this.scheduleReconnect(roomKey);
      }
    });

    // Handle connection state changes
    room.on(RoomEvent.ConnectionStateChanged, (state) => {
      console.log(`[SFUConnectionManager] Connection state changed for ${roomKey}:`, state);
      
      if (state.toString() === 'connected') {
        entry.reconnectAttempts = 0; // Reset on successful connection
        this.updateState(roomKey, 'connected');
      } else if (state.toString() === 'connecting') {
        this.updateState(roomKey, 'connecting');
      }
    });

    // Handle reconnection events
    room.on(RoomEvent.Reconnecting, () => {
      console.log(`[SFUConnectionManager] Reconnecting ${roomKey}...`);
      this.updateState(roomKey, 'connecting');
    });

    room.on(RoomEvent.Reconnected, () => {
      console.log(`[SFUConnectionManager] Reconnected ${roomKey}`);
      entry.reconnectAttempts = 0;
      this.updateState(roomKey, 'connected');
    });
  }

  private async performConnection(roomKey: string, entry: ConnectionEntry): Promise<void> {
    const { config, room } = entry;
    
    // Fetch token
    const { token, url } = await fetchLiveKitToken({
      role: config.role,
      creatorId: config.creatorId,
      identity: config.identity,
    });

    console.log(`[SFUConnectionManager] Connecting to ${url} for ${roomKey}`);
    await room.connect(url, token);
    
    this.updateState(roomKey, 'connected');
    console.log(`[SFUConnectionManager] Connected ${roomKey}`);

    // Publish if role is publisher
    if (config.role === 'publisher') {
      await this.publishCameraMic(roomKey);
    }
  }

  private scheduleReconnect(roomKey: string): void {
    const entry = this.connections.get(roomKey);
    if (!entry || entry.refCount === 0) {
      console.debug('[SFUConnectionManager] Skipping reconnect - connection no longer needed');
      return;
    }

    if (entry.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`[SFUConnectionManager] Max reconnect attempts reached for ${roomKey}`);
      this.updateState(roomKey, 'failed');
      return;
    }

    // Clear existing timeout
    if (entry.reconnectTimeout) {
      clearTimeout(entry.reconnectTimeout);
    }

    // Calculate exponential backoff: 2s, 4s, 8s
    const backoffDelay = Math.min(
      2000 * Math.pow(2, entry.reconnectAttempts),
      MAX_BACKOFF_MS
    );

    entry.reconnectAttempts++;
    console.log(`[SFUConnectionManager] Scheduling reconnect attempt ${entry.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} for ${roomKey} after ${backoffDelay}ms`);

    entry.reconnectTimeout = setTimeout(async () => {
      if (!entry || entry.refCount === 0) {
        console.debug('[SFUConnectionManager] Aborting reconnect - no active consumers');
        return;
      }
      try {
        await this.performConnection(roomKey, entry);
      } catch (error) {
        console.error(`[SFUConnectionManager] Reconnect failed for ${roomKey}:`, error);
        this.scheduleReconnect(roomKey); // Try again
      }
    }, backoffDelay);
  }

  private updateState(roomKey: string, state: ConnectionState): void {
    const entry = this.connections.get(roomKey);
    if (!entry) return;

    entry.state = state;
    
    // Notify all state handlers
    entry.stateHandlers.forEach(handler => handler(state));
  }
}

// Export singleton instance
export const sfuConnectionManager = SFUConnectionManager.getInstance();
