import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant, createLocalTracks, LocalTrack, DisconnectReason } from "livekit-client";
import { fetchLiveKitToken } from "@/lib/livekitToken";

export type ConnectionConfig = {
  role: "publisher" | "viewer";
  creatorId: string;
  identity: string;
};

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed';

export type VideoTrackHandler = (track: RemoteTrack, participantIdentity: string) => void;
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
  remoteTrackCache: Map<string, RemoteTrack>; // Cache RemoteTracks for late subscribers
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
      remoteTrackCache: new Map(),
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
    
    // Replay cached RemoteTracks to new handler (for late subscribers)
    const cachedCount = entry.remoteTrackCache.size;
    if (cachedCount > 0) {
      console.log(`[SFUConnectionManager] 🔄 Replaying ${cachedCount} cached track(s) to new handler for ${roomKey}`);
      entry.remoteTrackCache.forEach((track, participantIdentity) => {
        handler(track, participantIdentity);
      });
    }
    
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

    console.log(`[SFUConnectionManager] 🎬 Setting up room handlers for ${roomKey}, room name: ${room.name}`);

    // Handle video track subscriptions
    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _publication: any, participant: RemoteParticipant) => {
      if (track.kind === Track.Kind.Video) {
        console.log(`[SFUConnectionManager] 📹 Video track subscribed - Room: ${room.name}, Participant: ${participant.identity}, Track: ${track.sid}`);
        
        // Cache the RemoteTrack for late subscribers
        entry.remoteTrackCache.set(participant.identity, track);
        console.log(`[SFUConnectionManager] 💾 Cached track for ${participant.identity}, cache size: ${entry.remoteTrackCache.size}`);
        
        // Notify all current handlers with the track
        entry.videoHandlers.forEach(handler => {
          handler(track, participant.identity);
        });
        
        console.log(`[SFUConnectionManager] 📢 Notified ${entry.videoHandlers.size} video handlers`);
      }
    });

    // Handle track unsubscription (normal during stream changes)
    room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, _publication: any, participant: RemoteParticipant) => {
      if (track.kind === Track.Kind.Video) {
        console.log(`[SFUConnectionManager] 🔇 Video track unsubscribed for ${roomKey}:`, participant.identity);
        
        // Remove from cache
        entry.remoteTrackCache.delete(participant.identity);
        console.log(`[SFUConnectionManager] 🗑️ Removed ${participant.identity} from cache, cache size: ${entry.remoteTrackCache.size}`);
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
    
    try {
      this.updateState(roomKey, 'connecting');
      
      console.log(`[SFUConnectionManager] 🔄 Fetching token for ${roomKey}...`, {
        role: config.role,
        creatorId: config.creatorId,
        identity: config.identity
      });
      
      // Fetch token with detailed error handling
      let tokenData;
      try {
        tokenData = await fetchLiveKitToken({
          role: config.role,
          creatorId: config.creatorId,
          identity: config.identity,
        });
      } catch (tokenError) {
        console.error(`[SFUConnectionManager] ❌ Token fetch failed:`, tokenError);
        throw new Error(`Failed to fetch LiveKit token: ${tokenError instanceof Error ? tokenError.message : 'Unknown error'}`);
      }

      const { token, url, room: liveKitRoom } = tokenData;
      
      if (!token || !url) {
        throw new Error('Invalid token response - missing token or URL');
      }

      console.log(`[SFUConnectionManager] 🎫 Token fetched successfully`);
      console.log(`[SFUConnectionManager] 🏠 LiveKit Room: "${liveKitRoom}", Role: ${config.role}, Identity: ${config.identity}`);
      console.log(`[SFUConnectionManager] 🌐 Connecting to: ${url}`);

      // Connect with timeout
      const connectPromise = room.connect(url, token);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 15 seconds')), 15000)
      );

      await Promise.race([connectPromise, timeoutPromise]);
      
      console.log(`[SFUConnectionManager] ✅ Connected to LiveKit room: "${liveKitRoom}"`);
      this.updateState(roomKey, 'connected');

      // Publish if role is publisher
      if (config.role === 'publisher') {
        console.log(`[SFUConnectionManager] 📤 Publishing camera/mic to room: "${liveKitRoom}"`);
        try {
          await this.publishCameraMic(roomKey);
          console.log(`[SFUConnectionManager] ✅ Published tracks to room: "${liveKitRoom}"`);
        } catch (publishError) {
          console.error(`[SFUConnectionManager] ❌ Failed to publish tracks:`, publishError);
          throw new Error(`Failed to publish media: ${publishError instanceof Error ? publishError.message : 'Unknown error'}`);
        }
      } else {
        console.log(`[SFUConnectionManager] 👁️ Viewer connected to room: "${liveKitRoom}", waiting for tracks...`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      console.error(`[SFUConnectionManager] ❌ Connection failed for ${roomKey}:`, errorMessage, error);
      this.updateState(roomKey, 'failed');
      throw new Error(`LiveKit connection failed: ${errorMessage}`);
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
