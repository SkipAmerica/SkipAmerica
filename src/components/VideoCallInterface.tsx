import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { useAIModerator } from "@/hooks/useAIModerator";
import ModerationPanel from "@/components/moderation/ModerationPanel";
import { 
  ArrowLeft, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  Users, 
  Clock,
  DollarSign,
  Send,
  Shield,
  Settings,
  ShieldCheck,
  AlertTriangle,
  Play,
  X
} from "lucide-react";

interface VideoCallInterfaceProps {
  onBack: () => void;
  maxDuration?: number; // in minutes
  callRate?: number; // per minute
}

const VideoCallInterface = ({ onBack, maxDuration = 60, callRate = 5.00 }: VideoCallInterfaceProps) => {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [message, setMessage] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [currentCost, setCurrentCost] = useState(0);
  const [chatPaused, setChatPaused] = useState(false);
  const [callPaused, setCallPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [lastPausedTranscript, setLastPausedTranscript] = useState<string | null>(null);
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [recentModerations, setRecentModerations] = useState<any[]>([]);
  
  const { toast } = useToast();
  const callId = 'call-123'; // In real app, this would be dynamic
  const userId = 'user-456'; // In real app, this would come from auth
  
  const {
    isEnabled: isModerationEnabled,
    setIsEnabled: setModerationEnabled,
    voiceRecording,
    moderateText,
    startVoiceMonitoring,
    stopVoiceMonitoring,
  } = useAIModerator(callId, userId);

  // Mock participants
  const participants = [
    { id: 1, name: "Emma Wilson", role: "creator", avatar: "EW" },
    { id: 2, name: "Sarah M.", role: "fan", avatar: "SM" },
    { id: 3, name: "Mike R.", role: "fan", avatar: "MR" },
    { id: 4, name: "Alex K.", role: "fan", avatar: "AK" }
  ];

  const messages = [
    { id: 1, sender: "Emma Wilson", message: "Hey everyone! Thanks for joining my call!", timestamp: "2:01 PM" },
    { id: 2, sender: "Sarah M.", message: "So excited to chat with you!", timestamp: "2:01 PM" },
    { id: 3, sender: "System", message: "⚠️ Message blocked: inappropriate content detected", timestamp: "2:02 PM", isSystem: true },
    { id: 4, sender: "Mike R.", message: "Can you share some fitness tips?", timestamp: "2:02 PM" },
    { id: 5, sender: "Emma Wilson", message: "Absolutely! Let's start with nutrition basics...", timestamp: "2:03 PM" }
  ];

  // Check for voice moderation pause in VideoCallInterface
  useEffect(() => {
    if (voiceRecording.lastModeration?.action === 'pause') {
      const transcript = voiceRecording.transcript || '';
      const isNewPause = transcript && transcript !== lastPausedTranscript;
      if (isNewPause) {
        setCallPaused(true);
        setPauseReason(voiceRecording.lastModeration.reason || 'Voice content violated community guidelines');
        setIsVideoOn(false);
        setIsMicOn(false);
        setLastPausedTranscript(transcript);
      }
    }
  }, [voiceRecording.lastModeration, voiceRecording.transcript, lastPausedTranscript]);
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => {
        const newDuration = prev + 1;
        // Check if max duration reached (convert minutes to seconds)
        if (maxDuration !== undefined && newDuration >= maxDuration * 60) {
          toast({
            title: "Call Time Limit Reached",
            description: `Maximum call duration of ${maxDuration} minutes has been reached.`,
            variant: "destructive"
          });
          // In a real app, this would end the call
          return newDuration;
        }
        return newDuration;
      });
      // Use dynamic call rate split by participant count
      setCurrentCost(prev => prev + (callRate / 4 / 60)); // Per second cost
    }, 1000);

    return () => clearInterval(timer);
  }, [maxDuration, callRate, toast]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async () => {
    if (!message.trim() || chatPaused) return;
    
    // Moderate the message before sending
    if (isModerationEnabled) {
      const moderation = await moderateText(message);
      
      // Add to recent moderations for display
      setRecentModerations(prev => [moderation, ...prev.slice(0, 9)]);
      
      if (moderation.action === 'pause') {
        setCallPaused(true);
        setPauseReason(moderation.reason || 'Sensitive language detected');
        setIsVideoOn(false);
        setIsMicOn(false);
        return;
      } else if (moderation.action === 'block') {
        toast({
          title: "Message Blocked",
          description: moderation.reason || "Message violates community guidelines",
          variant: "destructive"
        });
        setMessage("");
        return;
      } else if (moderation.action === 'warn') {
        toast({
          title: "Content Warning",
          description: moderation.reason || "Please keep messages appropriate",
        });
      }
    }
    
    // In real app, would send message after moderation check
    setMessage("");
  };

  const handleContinueCall = () => {
    setCallPaused(false);
    setPauseReason('');
    setIsVideoOn(true);
    setIsMicOn(true);
    toast({
      title: "Call Resumed",
      description: "The call has been resumed",
    });
  };

  const handleEndCallFromViolation = async () => {
    // Add system comment and rating to user profile
    const systemComment = `System: User violated sensitive language filter on call at ${new Date().toLocaleString()}`;
    console.log('Adding system comment:', systemComment);
    console.log('Adding 0 rating for policy violation');
    
    toast({
      title: "Call Ended",
      description: "Call ended due to policy violation",
      variant: "destructive"
    });
    onBack();
  };

  if (callPaused) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container flex h-screen w-screen flex-col items-center justify-center">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[500px]">
            <div className="flex flex-col space-y-2 text-center">
              <AlertTriangle className="mx-auto h-16 w-16 text-destructive animate-pulse" />
              <h1 className="text-3xl font-semibold tracking-tight text-destructive">
                Call Paused
              </h1>
              <p className="text-lg text-muted-foreground">
                {pauseReason}
              </p>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mt-4">
                <p className="text-sm text-destructive font-medium">
                  A participant used language that violates our community guidelines. 
                  As the creator, you can choose to continue or end the call.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                onClick={handleContinueCall}
                className="h-12"
              >
                <Play className="w-4 h-4 mr-2" />
                Continue Call
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleEndCallFromViolation}
                className="h-12"
              >
                <X className="w-4 h-4 mr-2" />
                End Call
              </Button>
            </div>
            <div className="bg-muted/20 border rounded-lg p-3 mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Call Duration:</span>
                <span className="font-mono">{formatDuration(callDuration)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Current Cost:</span>
                <span className="font-mono">${currentCost.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Timer continues during pause - costs still accrue
              </p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              If you end the call, the participant will receive a system comment and 0 rating for the policy violation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col privacy-protected">
      {/* Header */}
      <header className="border-b bg-card p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-semibold">Video Call with Emma Wilson</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <Badge variant="secondary" className="bg-gradient-primary text-primary-foreground">
            <Clock className="h-3 w-3 mr-1" />
            {formatDuration(callDuration)}
          </Badge>
          <Badge variant="outline">
            <DollarSign className="h-3 w-3 mr-1" />
            ${currentCost.toFixed(2)}
          </Badge>
          <Badge variant="secondary">
            <Users className="h-3 w-3 mr-1" />
            4 people
          </Badge>
          {isModerationEnabled && (
            <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Protected
            </Badge>
          )}
          {voiceRecording.isRecording && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
              <Mic className="h-3 w-3 mr-1" />
              Monitoring
            </Badge>
          )}
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 bg-muted/20 relative">
          {/* Main Video */}
          <div className="absolute inset-4 bg-gradient-primary rounded-lg flex items-center justify-center">
            {/* Watermark */}
            <div className="absolute top-2 left-2 bg-black/20 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
              @Sarah M. • Live Call
            </div>
            <div className="text-center text-primary-foreground">
              <Avatar className="h-24 w-24 mx-auto mb-4">
                <AvatarFallback className="bg-primary-foreground text-primary text-2xl">
                  EW
                </AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-semibold">Emma Wilson</h3>
              <p className="opacity-80">Fitness Coach</p>
            </div>
          </div>

          {/* Participant Thumbnails */}
          <div className="absolute top-4 right-4 space-y-2">
            {participants.filter(p => p.role === "fan").map((participant) => (
              <Card key={participant.id} className="w-24 h-18">
                <CardContent className="p-2 text-center">
                  <Avatar className="h-8 w-8 mx-auto">
                    <AvatarFallback className="text-xs bg-muted">
                      {participant.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-xs mt-1 truncate">{participant.name.split(' ')[0]}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="flex items-center space-x-4 bg-background/90 backdrop-blur-sm p-4 rounded-full shadow-lg">
              <Button
                variant={isMicOn ? "secondary" : "destructive"}
                size="sm"
                onClick={() => setIsMicOn(!isMicOn)}
              >
                {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
              
              <Button
                variant={isVideoOn ? "secondary" : "destructive"}
                size="sm"
                onClick={() => setIsVideoOn(!isVideoOn)}
              >
                {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </Button>
              
              <Button variant="destructive" size="sm" onClick={onBack}>
                <Phone className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setShowModerationPanel(!showModerationPanel)}
              >
                <Shield className="h-4 w-4" />
              </Button>
              
              <Button variant="secondary" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Moderation Panel */}
        {showModerationPanel && (
          <div className="w-80 border-l bg-card">
            <div className="p-4">
              <ModerationPanel
                isEnabled={isModerationEnabled}
                onToggle={setModerationEnabled}
                voiceRecording={voiceRecording}
                onStartVoiceMonitoring={startVoiceMonitoring}
                onStopVoiceMonitoring={stopVoiceMonitoring}
                recentModerations={recentModerations}
              />
            </div>
          </div>
        )}

        {/* Chat Sidebar */}
        <div className="w-80 border-l bg-card flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Live Chat</h3>
              <div className="flex items-center space-x-2">
                <Badge variant={chatPaused ? "destructive" : "secondary"}>
                  {chatPaused ? <Shield className="h-3 w-3 mr-1" /> : null}
                  {chatPaused ? "Paused" : "Active"}
                </Badge>
              </div>
            </div>
            {chatPaused && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2">
                <p className="text-xs text-destructive">
                  Chat paused due to inappropriate content detection
                </p>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`${msg.isSystem ? 'text-center' : ''}`}>
                  {msg.isSystem ? (
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded-lg">
                      {msg.message}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-semibold">{msg.sender}</span>
                        <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
                      </div>
                      <p className="text-sm bg-muted p-2 rounded-lg">{msg.message}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <Input
                placeholder={chatPaused ? "Chat is paused..." : "Type a message..."}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={chatPaused}
              />
              <Button 
                size="sm" 
                onClick={handleSendMessage}
                disabled={chatPaused || !message.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-muted-foreground">
                {isModerationEnabled ? (
                  <>
                    <ShieldCheck className="h-3 w-3 inline mr-1" />
                    AI moderation active
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    Moderation disabled
                  </>
                )}
              </span>
              {voiceRecording.isRecording && (
                <span className="text-blue-600">
                  <Mic className="h-3 w-3 inline mr-1" />
                  Voice monitoring
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cost Breakdown Footer */}
      <div className="border-t bg-muted/50 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-6 text-sm">
            <div>
              <span className="text-muted-foreground">Base Rate:</span>
              <span className="font-semibold ml-2">${callRate.toFixed(2)}/min</span>
            </div>
            <div>
              <span className="text-muted-foreground">Split 4 ways:</span>
              <span className="font-semibold ml-2">${(callRate / 4).toFixed(2)}/min each</span>
            </div>
            <div>
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-semibold ml-2">{formatDuration(callDuration)}</span>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Your current cost</div>
            <div className="text-xl font-bold text-primary">${currentCost.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCallInterface;