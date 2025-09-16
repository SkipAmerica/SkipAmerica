import { useState } from "react";
import { CallLobby } from "./CallLobby";
import VideoCallInterface from "../VideoCallInterface";

interface CallFlowProps {
  creator: {
    id: string;
    name: string;
    avatar?: string;
    customLobbyMedia?: {
      type: 'image' | 'video';
      url: string;
    };
    lobbyMessage?: string;
    maxCallDuration?: number;
    callRate?: number;
  };
  fan: {
    id: string;
    name: string;
    avatar?: string;
  };
  onEndCall: () => void;
  isCreatorView?: boolean;
}

type CallPhase = 'lobby' | 'active';

export function CallFlow({ 
  creator, 
  fan, 
  onEndCall, 
  isCreatorView = false 
}: CallFlowProps) {
  const [callPhase, setCallPhase] = useState<CallPhase>('lobby');

  const handleStartCall = () => {
    setCallPhase('active');
  };

  const handleRejectCall = () => {
    onEndCall();
  };

  if (callPhase === 'lobby') {
    return (
      <CallLobby
        creator={creator}
        fan={fan}
        onStartCall={handleStartCall}
        onRejectCall={handleRejectCall}
        isCreatorView={isCreatorView}
      />
    );
  }

  return (
    <VideoCallInterface
      onBack={onEndCall}
      maxDuration={creator.maxCallDuration}
      callRate={creator.callRate}
    />
  );
}