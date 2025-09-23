import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';

interface BroadcastViewerProps {
  creatorId: string;
  sessionId: string;
}

export function BroadcastViewer({ creatorId, sessionId }: BroadcastViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // This is a placeholder for the actual broadcast viewing implementation
    // In a real implementation, this would connect to the creator's broadcast stream
    // For now, we'll show a placeholder indicating the broadcast would be here
    
    const simulateConnection = () => {
      setTimeout(() => {
        setIsConnected(true);
      }, 1000);
    };

    simulateConnection();
  }, [creatorId, sessionId]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
      {isConnected ? (
        <>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted={isMuted}
          />
          
          {/* Video Controls Overlay */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <Button
              onClick={toggleMute}
              size="sm"
              variant="secondary"
              className="bg-black/50 hover:bg-black/70 text-white"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>

          {/* Live Indicator */}
          <div className="absolute top-4 left-4">
            <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              LIVE
            </div>
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-sm">Connecting to broadcast...</p>
          </div>
        </div>
      )}

      {/* Placeholder overlay for development */}
      <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
        <div className="text-center text-white p-4">
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mb-4 mx-auto">
            <span className="text-white font-bold">🔴</span>
          </div>
          <h3 className="text-lg font-semibold mb-2">Live Broadcast</h3>
          <p className="text-sm text-gray-300">
            Creator's live video would appear here
          </p>
          <p className="text-xs text-gray-400 mt-2">
            (Video streaming implementation pending)
          </p>
        </div>
      </div>
    </div>
  );
}