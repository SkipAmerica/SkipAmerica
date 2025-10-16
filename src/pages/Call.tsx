import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLive } from "@/hooks/live";
import { MediaPreview } from "@/components/live/MediaPreview";
import { IOSTabBar } from "@/components/mobile/IOSTabBar";
import { CreatorPostPrompt } from "@/components/creator/CreatorPostPrompt";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/app/providers/auth-provider";
import { useKeyboardAware } from "@/hooks/use-keyboard-aware";

interface CallProps {
  creator: {
    id: string;
    name: string;
    avatar?: string;
    callRate?: number;
    maxCallDuration?: number;
  };
  caller: {
    id: string;
    name: string;
    avatar?: string;
  };
  isCreatorView?: boolean;
}

export default function Call({ creator, caller, isCreatorView = false }: CallProps) {
  // Always call all hooks unconditionally at the top level
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const live = useLive();
  const { isKeyboardVisible } = useKeyboardAware('call');
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // Safely access live store values after hooks
  const state = live?.state || 'OFFLINE';
  const endLive = live?.endLive || (() => {});

  // Redirect if not in correct state
  useEffect(() => {
    if (state !== 'SESSION_ACTIVE') {
      navigate('/');
    }
  }, [state, navigate]);

  const handleEndCall = async () => {
    await endLive();
    // Will navigate back to Queue (DISCOVERABLE state) automatically
  };

  return (
    <div className="min-h-screen bg-white relative">
      {/* Status Bar Overlay */}
      <div 
        className="pointer-events-none fixed top-0 left-0 right-0 z-[100] bg-gradient-to-b from-turquoise-600 to-turquoise-500"
        style={{ height: 'calc(var(--debug-safe-top) + 4px)' }}
      />
      
      {/* Main Content */}
      <div className="flex flex-col h-screen pt-[var(--debug-safe-top)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden">
              {(isCreatorView ? caller.avatar : creator.avatar) ? (
                <img 
                  src={isCreatorView ? caller.avatar : creator.avatar} 
                  alt={isCreatorView ? caller.name : creator.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                  <span className="text-gray-600 text-sm font-semibold">
                    {(isCreatorView ? caller.name : creator.name).charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold">
                {isCreatorView ? caller.name : creator.name}
              </h1>
              <div className="text-xs text-green-600 font-medium">Connected</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {creator.callRate && (
              <span>${creator.callRate}/min</span>
            )}
          </div>
        </div>

        {/* Video Container */}
        <div className="flex-1 relative bg-black">
          {/* Remote Video (Full Screen) */}
          <video
            ref={remoteVideoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
          />
          
          {/* Local Video (Picture-in-Picture) */}
          <div className="absolute top-4 right-4 w-24 h-32 bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <MediaPreview 
              className="w-full h-full object-cover"
              muted={true}
            />
            <div className="absolute bottom-1 left-1 text-white text-xs">
              {isCreatorView ? 'You' : 'Me'}
            </div>
          </div>

          {/* Call Duration */}
          <div className="absolute top-4 left-4 bg-black/70 text-white px-2 py-1 rounded text-sm">
            05:42
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 pb-[calc(var(--ios-tab-bar-height)+1rem)]">
          <div className="flex items-center justify-center gap-6">
            {/* Mute Button */}
            <Button
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-full border-2"
            >
              <Mic size={20} />
            </Button>

            {/* End Call Button */}
            <Button
              onClick={handleEndCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
            >
              <Phone size={24} className="rotate-[135deg]" />
            </Button>

            {/* Video Button */}
            <Button
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-full border-2"
            >
              <Video size={20} />
            </Button>
          </div>
        </div>
      </div>

      {/* Creator Post Prompt - Only show for creators */}
      {profile?.account_type === 'creator' && (
        <CreatorPostPrompt />
      )}

      {/* iOS Tab Bar - Persists on Call page */}
      <IOSTabBar
        activeTab="call"
        onTabChange={() => {}} // Disabled during call
        showFollowing={!!user}
        isCreator={profile?.account_type === 'creator'}
        isLive={true} // Show as live during call
        isDiscoverable={true} // Keep as discoverable during call
        isTransitioning={false}
        onToggleDiscoverable={() => {}} // No-op on call page
        onEndCall={handleEndCall}
        profile={profile}
      />
    </div>
  );
}