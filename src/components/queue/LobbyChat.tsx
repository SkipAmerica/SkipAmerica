import { UniversalChat } from '@/components/chat/UniversalChat';
import { createLobbyConfig } from '@/lib/chatConfigs';

interface LobbyChatProps {
  creatorId: string;
}

export function LobbyChat({ creatorId }: LobbyChatProps) {
  const config = createLobbyConfig(creatorId);
  return <UniversalChat config={config} />;
}