import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RUNTIME } from '@/config/runtime';

interface SFUStats {
  hasHandle: boolean;
  roomName?: string;
  roomState?: string;
  localVideo: number;
  localAudio: number;
  remoteTracks: number;
  participants: number;
}

declare global {
  interface Window {
    __creatorSFU?: any;
    __sfuHudMounted?: boolean;
  }
}

export function SFUDebugHUD() {
  const [stats, setStats] = useState<SFUStats>({
    hasHandle: false,
    localVideo: 0,
    localAudio: 0,
    remoteTracks: 0,
    participants: 0,
  });

  const gatherStats = (): SFUStats => {
    const sfu = window.__creatorSFU;
    const room = sfu?.room;

    if (!sfu) {
      return {
        hasHandle: false,
        localVideo: 0,
        localAudio: 0,
        remoteTracks: 0,
        participants: 0,
      };
    }

    let localVideo = 0;
    let localAudio = 0;
    let remoteTracks = 0;
    let participants = 0;

    if (room?.localParticipant) {
      const lp = room.localParticipant;
      if (lp.videoTracks) {
        localVideo = Array.from(lp.videoTracks.values()).filter((p: any) => p?.track).length;
      }
      if (lp.audioTracks) {
        localAudio = Array.from(lp.audioTracks.values()).filter((p: any) => p?.track).length;
      }
    }

    if (room?.participants) {
      const ps = Array.from(room.participants.values());
      participants = ps.length;
      for (const p of ps) {
        if (!p || typeof p !== 'object' || !('tracks' in p) || !p.tracks) continue;
        for (const pub of (p.tracks as Map<string, any>).values()) {
          if (pub?.track) remoteTracks++;
        }
      }
    }

    return {
      hasHandle: true,
      roomName: room?.name,
      roomState: room?.state,
      localVideo,
      localAudio,
      remoteTracks,
      participants,
    };
  };

  const handleReconnect = async () => {
    try {
      const sfu = window.__creatorSFU;
      if (sfu?.disconnect) {
        await sfu.disconnect();
      }
      console.log("[SFU HUD] Requested reconnect; click your Broadcast button again.");
    } catch (error) {
      console.error("[SFU HUD] Reconnect error:", error);
    }
  };

  const wireRoomEvents = (room: any) => {
    if (!room || room.__hudWired) return;
    room.__hudWired = true;

    const events = [
      "ConnectionStateChanged",
      "ParticipantConnected", 
      "ParticipantDisconnected",
      "TrackPublished",
      "TrackUnpublished",
      "TrackSubscribed",
      "TrackUnsubscribed",
      "ActiveSpeakersChanged",
    ];

    for (const event of events) {
      room.on?.(event as any, () => {
        setStats(gatherStats());
      });
    }
  };

  useEffect(() => {
    if (window.__sfuHudMounted) return;
    window.__sfuHudMounted = true;

    const tick = () => {
      const sfu = window.__creatorSFU;
      if (sfu?.room) {
        wireRoomEvents(sfu.room);
      }
      setStats(gatherStats());
    };

    // Initial tick
    tick();

    // Set up periodic refresh
    const interval = setInterval(tick, 750);

    // Listen for visibility changes
    const handleVisibilityChange = () => tick();
    const handleFocus = () => tick();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.__sfuHudMounted = false;
    };
  }, []);

  // Only render in debug mode
  if (!RUNTIME.DEBUG_LOGS) {
    return null;
  }

  return (
    <Card className="fixed right-3 bottom-3 z-[99999] w-80 p-3 bg-background/90 backdrop-blur-sm border">
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">SFU Control</h3>
        
        <div className="text-xs space-y-1 text-muted-foreground">
          <div>Handle: {stats.hasHandle ? "✅ OK" : "❌ None"}</div>
          <div>
            Room: {stats.roomName || "—"} ({stats.roomState || "n/a"})
          </div>
          <div>Local video pubs: {stats.localVideo}</div>
          <div>Local audio pubs: {stats.localAudio}</div>
          <div>Remote tracks: {stats.remoteTracks}</div>
          <div>Remote participants: {stats.participants}</div>
        </div>

        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleReconnect}
          className="w-full"
        >
          Reconnect
        </Button>
      </div>
    </Card>
  );
}