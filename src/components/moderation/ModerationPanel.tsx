import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Mic, 
  MicOff, 
  Activity,
  AlertTriangle,
  CheckCircle 
} from 'lucide-react';
import { VoiceRecording, ModerationResult } from '@/hooks/useAIModerator';

interface ModerationPanelProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  voiceRecording: VoiceRecording;
  onStartVoiceMonitoring: () => void;
  onStopVoiceMonitoring: () => void;
  recentModerations?: ModerationResult[];
}

const ModerationPanel: React.FC<ModerationPanelProps> = ({
  isEnabled,
  onToggle,
  voiceRecording,
  onStartVoiceMonitoring,
  onStopVoiceMonitoring,
  recentModerations = [],
}) => {
  const getModerationIcon = (action: string) => {
    switch (action) {
      case 'block': return <ShieldAlert className="h-4 w-4 text-destructive" />;
      case 'warn': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getModerationBadge = (action: string) => {
    switch (action) {
      case 'block': return <Badge variant="destructive">Blocked</Badge>;
      case 'warn': return <Badge className="bg-yellow-500 text-white">Warning</Badge>;
      default: return <Badge variant="secondary">Approved</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4" />
          AI Content Moderation
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEnabled ? (
              <ShieldCheck className="h-4 w-4 text-green-500" />
            ) : (
              <Shield className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">Real-time Protection</span>
          </div>
          <Switch checked={isEnabled} onCheckedChange={onToggle} />
        </div>

        {isEnabled && (
          <>
            {/* Voice Monitoring */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Voice Monitoring</span>
                <Button
                  variant={voiceRecording.isRecording ? "destructive" : "secondary"}
                  size="sm"
                  onClick={voiceRecording.isRecording ? onStopVoiceMonitoring : onStartVoiceMonitoring}
                >
                  {voiceRecording.isRecording ? (
                    <MicOff className="h-3 w-3 mr-1" />
                  ) : (
                    <Mic className="h-3 w-3 mr-1" />
                  )}
                  {voiceRecording.isRecording ? 'Stop' : 'Start'}
                </Button>
              </div>

              {voiceRecording.isRecording && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-muted-foreground">Listening...</span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Audio Level</span>
                      <span>{Math.round(voiceRecording.audioLevel * 100)}%</span>
                    </div>
                    <Progress value={voiceRecording.audioLevel * 100} className="h-1" />
                  </div>

                  {voiceRecording.transcript && (
                    <div className="p-2 bg-muted rounded text-xs">
                      <span className="font-medium">Last transcript:</span>
                      <p className="mt-1 text-muted-foreground">
                        "{voiceRecording.transcript}"
                      </p>
                      {voiceRecording.lastModeration && (
                        <div className="flex items-center gap-1 mt-1">
                          {getModerationIcon(voiceRecording.lastModeration.action)}
                          {getModerationBadge(voiceRecording.lastModeration.action)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            {recentModerations.length > 0 && (
              <div className="border-t pt-4">
                <span className="text-sm font-medium mb-2 block">Recent Activity</span>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {recentModerations.slice(0, 5).map((moderation, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {getModerationIcon(moderation.action)}
                        <span className="truncate">
                          {moderation.reason || 'Content reviewed'}
                        </span>
                      </div>
                      {getModerationBadge(moderation.action)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status Info */}
            <div className="border-t pt-4">
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Protection Status:</span>
                  <span className="text-green-500">Active</span>
                </div>
                <div className="flex justify-between">
                  <span>Response Time:</span>
                  <span>&lt; 2 seconds</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ModerationPanel;