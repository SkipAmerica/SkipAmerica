import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useToast } from "@/components/ui/use-toast";
import { useAIModerator } from "@/hooks/useAIModerator";
import ModerationPanel from "@/components/moderation/ModerationPanel";
import { FileSharePanel } from "@/components/call/FileSharePanel";
import { IOSNavBar } from "@/components/mobile/IOSNavBar";
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
  X,
  Paperclip,
  MoreVertical
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
  const [showFilePanel, setShowFilePanel] = useState(false);
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
      <div className="min-h-screen bg-background animate-fade-in">
        {/* iOS Navigation Bar */}
        <IOSNavBar
          title="Call Paused"
          leftButton={{
            icon: ArrowLeft,
            onClick: handleEndCallFromViolation
          }}
        />

        <div className="ios-content flex flex-col items-center justify-center space-y-6 animate-scale-in" style={{ paddingTop: 'calc(var(--ios-nav-bar-height) + 24px)' }}>
          <div className="w-full max-w-sm space-y-6 px-4">
            <div className="text-center space-y-4">
              <div className="bg-destructive/10 rounded-full p-6 w-24 h-24 mx-auto flex items-center justify-center">
                <AlertTriangle className="h-12 w-12 text-destructive animate-pulse" />
              </div>
              <h1 className="text-2xl font-bold text-destructive">
                Call Paused
              </h1>
              <p className="text-muted-foreground">
                {pauseReason}
              </p>
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                <p className="text-sm text-destructive font-medium">
                  A participant used language that violates our community guidelines. 
                  As the creator, you can choose to continue or end the call.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleContinueCall}
                className="w-full h-12 rounded-full bg-gradient-primary hover:shadow-lg hover-scale"
              >
                <Play className="w-4 h-4 mr-2" />
                Continue Call
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleEndCallFromViolation}
                className="w-full h-12 rounded-full hover-scale"
              >
                <X className="w-4 h-4 mr-2" />
                End Call
              </Button>
            </div>

            <div className="bg-muted/20 border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Call Duration:</span>
                <span className="font-mono font-semibold">{formatDuration(callDuration)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Cost:</span>
                <span className="font-mono font-semibold text-primary">${currentCost.toFixed(2)}</span>
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
    <div className="min-h-screen bg-background flex flex-col animate-slide-in-right">
      {/* iOS Navigation Bar */}
      <IOSNavBar
        title="Emma Wilson"
        leftButton={{
          icon: ArrowLeft,
          onClick: onBack
        }}
        rightButton={{
          icon: MoreVertical,
          onClick: () => {}
        }}
      />

      {/* Status Bar */}
      <div className="px-4 py-3 bg-card border-b animate-fade-in" style={{ paddingTop: 'calc(var(--ios-nav-bar-height) + 8px)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="bg-gradient-primary text-primary-foreground rounded-full">
              <Clock className="h-3 w-3 mr-1" />
              {formatDuration(callDuration)}
            </Badge>
            <Badge variant="outline" className="rounded-full">
              <DollarSign className="h-3 w-3 mr-1" />
              ${currentCost.toFixed(2)}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="rounded-full">
              <Users className="h-3 w-3 mr-1" />
              4
            </Badge>
            {isModerationEnabled && (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 rounded-full">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Protected
              </Badge>
            )}
            {voiceRecording.isRecording && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 rounded-full animate-pulse">
                <Mic className="h-3 w-3 mr-1" />
                Live
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 bg-muted/20 relative animate-fade-in">
          <div className="px-4 pt-4 pb-28">
            <AspectRatio ratio={16 / 9}>
              <div className="relative w-full h-full bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                {/* Watermark */}
                <div className="absolute top-3 left-3 bg-black/30 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                  @Sarah M. • Live Call
                </div>
                
                {/* Main Content */}
                <div className="text-center text-primary-foreground animate-scale-in">
                  <Avatar className="h-24 w-24 mx-auto mb-4 ring-4 ring-primary-foreground/20">
                    <AvatarFallback className="bg-primary-foreground text-primary text-2xl">
                      EW
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-semibold">Emma Wilson</h3>
                  <p className="opacity-90">Fitness Coach</p>
                </div>

                {/* Participant Thumbnails (overlay) */}
                <div className="absolute top-3 right-3 space-y-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  {participants.filter(p => p.role === "fan").map((participant, index) => (
                    <div key={participant.id} className="w-20 h-16 bg-card rounded-xl p-2 shadow-md hover-scale" style={{ animationDelay: `${0.1 + index * 0.05}s` }}>
                      <div className="text-center">
                        <Avatar className="h-8 w-8 mx-auto">
                          <AvatarFallback className="text-xs bg-muted">
                            {participant.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-xs mt-1 truncate font-medium">{participant.name.split(' ')[0]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AspectRatio>
          </div>

          {/* Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center space-x-4 bg-background/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl border">
              <Button
                variant={isMicOn ? "secondary" : "destructive"}
                size="sm"
                onClick={() => setIsMicOn(!isMicOn)}
                className="rounded-full h-12 w-12 hover-scale"
              >
                {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
              
              <Button
                variant={isVideoOn ? "secondary" : "destructive"}
                size="sm"
                onClick={() => setIsVideoOn(!isVideoOn)}
                className="rounded-full h-12 w-12 hover-scale"
              >
                {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
              
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={onBack}
                className="rounded-full h-12 w-12 hover-scale bg-red-500 hover:bg-red-600"
              >
                <Phone className="h-5 w-5 rotate-[135deg]" />
              </Button>
              
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setShowModerationPanel(!showModerationPanel)}
                className="rounded-full h-12 w-12 hover-scale"
              >
                <Shield className="h-5 w-5" />
              </Button>
              
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setShowFilePanel(!showFilePanel)}
                className="rounded-full h-12 w-12 hover-scale"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* File Sharing Panel */}
        {showFilePanel && (
          <div className="w-80 border-l animate-slide-in-right">
            <FileSharePanel
              callId={callId}
              currentUserId={userId}
              recipientId="recipient-123"
              isCreator={true}
            />
          </div>
        )}

        {/* Moderation Panel */}
        {showModerationPanel && (
          <div className="w-80 border-l bg-card animate-slide-in-right">
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
        {!showFilePanel && !showModerationPanel && (
          <div className="w-80 border-l bg-card flex flex-col animate-slide-in-right">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">Live Chat</h3>
                <Badge variant={chatPaused ? "destructive" : "secondary"} className="rounded-full">
                  {chatPaused ? <Shield className="h-3 w-3 mr-1" /> : null}
                  {chatPaused ? "Paused" : "Active"}
                </Badge>
              </div>
              {chatPaused && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 animate-fade-in">
                  <p className="text-xs text-destructive font-medium">
                    Chat paused due to inappropriate content detection
                  </p>
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div key={msg.id} className={`animate-fade-in ${msg.isSystem ? 'text-center' : ''}`} style={{ animationDelay: `${index * 0.05}s` }}>
                    {msg.isSystem ? (
                      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-xl">
                        {msg.message}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold">{msg.sender}</span>
                          <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
                        </div>
                        <p className="text-sm bg-muted/50 p-3 rounded-xl">{msg.message}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t bg-background">
              <div className="flex space-x-2 mb-3">
                <Input
                  placeholder={chatPaused ? "Chat is paused..." : "Type a message..."}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={chatPaused}
                  className="rounded-full flex-1"
                />
                <Button 
                  size="sm" 
                  onClick={handleSendMessage}
                  disabled={chatPaused || !message.trim()}
                  className="rounded-full h-10 w-10 p-0 hover-scale"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between text-xs">
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
                  <span className="text-blue-600 animate-pulse">
                    <Mic className="h-3 w-3 inline mr-1" />
                    Voice monitoring
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cost Breakdown Footer */}
      <div className="border-t bg-card/50 backdrop-blur-sm p-4 animate-fade-in">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4 text-sm">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Rate</div>
              <div className="font-semibold">${callRate.toFixed(2)}/min</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Split 4 ways</div>
              <div className="font-semibold">${(callRate / 4).toFixed(2)}/min</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Duration</div>
              <div className="font-semibold font-mono">{formatDuration(callDuration)}</div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Your cost</div>
            <div className="text-xl font-bold text-primary">${currentCost.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCallInterface;