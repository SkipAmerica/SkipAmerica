import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLive } from "@/hooks/live";
import { MediaPreview } from "@/components/live/MediaPreview";
import { IOSTabBar } from "@/components/mobile/IOSTabBar";
import { CreatorPostPrompt } from "@/components/creator/CreatorPostPrompt";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/app/providers/auth-provider";
import { useKeyboardAware } from "@/hooks/use-keyboard-aware";

interface LobbyProps {
  creator: {
    id: string;
    name: string;
    avatar?: string;
    customLobbyMedia?: {
      type: 'image' | 'video';
      url: string;
    };
    lobbyMessage?: string;
  };
  caller: {
    id: string;
    name: string;
    avatar?: string;
  };
  isCreatorView?: boolean;
}

export default function Lobby({ creator, caller, isCreatorView = false }: LobbyProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { state, confirmJoin, endLive } = useLive();
  const { isKeyboardVisible } = useKeyboardAware('lobby');

  // Redirect if not in correct state
  useEffect(() => {
    if (state !== 'SESSION_PREP') {
      navigate('/');
    }
  }, [state, navigate]);

  const handleConfirmJoin = async () => {
    const videoEl = document.querySelector('#lobby-local-video') as HTMLVideoElement;
    const audioEl = document.querySelector('#lobby-local-audio') as HTMLAudioElement;
    
    await confirmJoin(videoEl, audioEl);
    // Navigation to Call page will happen via state change in router
  };

  const handleGoOffline = async () => {
    await endLive();
    navigate('/');
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
          <h1 className="text-lg font-semibold">Lobby</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoOffline}
            className="text-muted-foreground"
          >
            Go Offline
          </Button>
        </div>

        {/* Video Panes */}
        <div className="flex-1 p-4 space-y-4">
          {/* Creator Local Preview */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <MediaPreview 
              className="w-full h-full object-cover"
              muted={true}
            />
            <video 
              id="lobby-local-video" 
              className="hidden" 
              muted 
              playsInline 
              autoPlay 
            />
            <audio id="lobby-local-audio" className="hidden" />
            
            <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
              {isCreatorView ? 'You' : creator.name}
            </div>
            
            {/* Creator's custom media or message */}
            {creator.customLobbyMedia && (
              <div className="absolute top-2 right-2 w-16 h-16 rounded-lg overflow-hidden bg-black/50">
                {creator.customLobbyMedia.type === 'image' ? (
                  <img 
                    src={creator.customLobbyMedia.url} 
                    alt="Creator media" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video 
                    src={creator.customLobbyMedia.url}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    autoPlay
                  />
                )}
              </div>
            )}
          </div>

          {/* Caller Remote View */}
          <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
            {caller.avatar ? (
              <img 
                src={caller.avatar} 
                alt={caller.name}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600 text-lg font-semibold">
                  {caller.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            
            <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
              {isCreatorView ? caller.name : 'You (waiting)'}
            </div>
          </div>

          {/* Lobby Message */}
          {creator.lobbyMessage && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">{creator.lobbyMessage}</p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="p-4 pb-[calc(var(--ios-tab-bar-height)+1rem)]">
          {isCreatorView ? (
            <Button
              onClick={handleConfirmJoin}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-3"
              size="lg"
            >
              Confirm Join
            </Button>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              Waiting for {creator.name} to confirm...
            </div>
          )}
        </div>
      </div>

      {/* Creator Post Prompt - Only show for creators */}
      {profile?.account_type === 'creator' && (
        <CreatorPostPrompt isVisible={!isKeyboardVisible} />
      )}

      {/* iOS Tab Bar - Persists on Lobby page */}
      <IOSTabBar
        activeTab="lobby"
        onTabChange={() => {}} // Disabled during lobby
        showFollowing={!!user}
        isCreator={profile?.account_type === 'creator'}
        isLive={false} // Show as not live since we're in lobby
        isTransitioning={false}
        onGoLive={() => {}}
        onEndLive={handleGoOffline}
      />
    </div>
  );
}