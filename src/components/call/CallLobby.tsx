import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { IOSNavBar } from "@/components/mobile/IOSNavBar";
import { MediaPreview } from "@/components/live/MediaPreview";
import { 
  Play, 
  Clock, 
  Shield, 
  AlertTriangle,
  X,
  Settings,
  Upload,
  Video,
  ArrowLeft,
  Phone,
  PhoneOff,
  Users
} from "lucide-react";

interface CallLobbyProps {
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
  onStartCall: () => void;
  onRejectCall: () => void;
  isCreatorView?: boolean;
}

export function CallLobby({ 
  creator, 
  fan, 
  onStartCall, 
  onRejectCall,
  isCreatorView = false 
}: CallLobbyProps) {
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [showVideoPreview, setShowVideoPreview] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle auto-start when timer reaches 0
  useEffect(() => {
    if (timeRemaining === 0) {
      onStartCall();
    }
  }, [timeRemaining, onStartCall]);

  const handleStartEarly = () => {
    toast({
      title: "Call Started",
      description: "Starting the call early at creator's discretion.",
    });
    onStartCall();
  };

  const handleReject = () => {
    toast({
      title: "Call Rejected",
      description: "Call has been ended for safety reasons.",
      variant: "destructive"
    });
    onRejectCall();
  };

  const progressPercentage = ((30 - timeRemaining) / 30) * 100;

  return (
    <div className="min-h-screen relative bg-black animate-slide-in-right">
      {/* Full-screen video background */}
      <div className="fixed inset-0 z-0 bg-black">
        <MediaPreview className="block w-full h-full object-cover" muted />
      </div>
      
      {/* UI content layer */}
      <div className="relative z-10">
        {/* iOS Navigation Bar */}
      <IOSNavBar
        title="Safety Lobby"
        leftButton={{
          icon: ArrowLeft,
          onClick: onRejectCall
        }}
        rightButton={isCreatorView ? {
          icon: Settings,
          onClick: () => {}
        } : undefined}
      />

      <div className="ios-content space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-3 px-4">
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <Shield className="h-3 w-3 mr-1" />
            Safety Lobby
          </Badge>
          <h1 className="text-2xl font-bold">
            {isCreatorView ? 'Review Participant' : 'Connecting to Creator'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isCreatorView 
              ? 'Take a moment to review the participant before starting the call'
              : 'Please wait while the creator prepares for your session'
            }
          </p>
        </div>

        {/* Main Content */}
        <div className="px-4 space-y-6">
          {/* Video Preview */}
          <div className="bg-transparent p-0 shadow-none border-0 animate-scale-in">
            <div className="aspect-video bg-transparent overflow-hidden flex items-center justify-center relative">
              {showVideoPreview ? (
                <div className="text-center animate-fade-in">
                  <Avatar className="h-20 w-20 mx-auto mb-4 ring-2 ring-primary/20">
                    <AvatarImage src={fan.avatar} />
                    <AvatarFallback className="text-2xl bg-gradient-primary text-primary-foreground">
                      {fan.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-lg">{fan.name}</h3>
                  <p className="text-sm text-muted-foreground">Waiting to connect...</p>
                </div>
              ) : (
                <div className="text-center text-muted-foreground animate-fade-in">
                  <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Video preview disabled</p>
                </div>
              )}
            </div>
            
            {isCreatorView && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVideoPreview(!showVideoPreview)}
                  className="rounded-full"
                >
                  {showVideoPreview ? 'Hide Preview' : 'Show Preview'}
                </Button>
              </div>
            )}
          </div>

          {/* Creator's Custom Content */}
          <div className="bg-card rounded-xl p-4 shadow-sm border animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <div className="aspect-video bg-gradient-primary rounded-xl flex items-center justify-center relative overflow-hidden">
              {creator.customLobbyMedia ? (
                creator.customLobbyMedia.type === 'image' ? (
                  <img 
                    src={creator.customLobbyMedia.url} 
                    alt="Creator lobby"
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <video 
                    src={creator.customLobbyMedia.url}
                    className="w-full h-full object-cover rounded-xl"
                    autoPlay
                    muted
                    loop
                  />
                )
              ) : (
                <div className="text-center text-primary-foreground animate-fade-in">
                  <Avatar className="h-20 w-20 mx-auto mb-4 ring-2 ring-primary-foreground/20">
                    <AvatarImage src={creator.avatar} />
                    <AvatarFallback className="text-2xl bg-primary-foreground text-primary">
                      {creator.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-semibold">{creator.name}</h3>
                  <p className="opacity-90 text-sm">
                    {creator.lobbyMessage || "Welcome! I'll be with you shortly."}
                  </p>
                </div>
              )}
            </div>
            
            {isCreatorView && (
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm" className="rounded-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Customize Lobby
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Timer and Controls */}
        <div className="px-4">
          <div className="bg-card rounded-xl p-6 shadow-sm border animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <div className="space-y-6">
              {/* Timer */}
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-2">
                  <Clock className="h-5 w-5 text-primary animate-pulse" />
                  <span className="text-2xl font-bold text-primary">
                    {timeRemaining}s
                  </span>
                </div>
                <Progress value={progressPercentage} className="w-full max-w-sm mx-auto h-2" />
                <p className="text-xs text-muted-foreground">
                  Call starts automatically when timer reaches zero
                </p>
              </div>

              {/* Controls */}
              <div className="flex justify-center space-x-4">
                {isCreatorView ? (
                  <>
                    <Button 
                      onClick={handleStartEarly}
                      className="min-w-32 rounded-full bg-green-600 hover:bg-green-700 hover:shadow-lg hover-scale"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Start Pre-Call
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleReject}
                      className="min-w-32 rounded-full hover-scale"
                    >
                      <PhoneOff className="h-4 w-4 mr-2" />
                      End Call
                    </Button>
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Priority Queue Access</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Please wait while {creator.name} prepares for your priority call
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={onRejectCall}
                      className="rounded-full px-8"
                    >
                      <PhoneOff className="h-4 w-4 mr-2" />
                      Cancel Call
                    </Button>
                  </div>
                )}
              </div>

              {/* Safety Note */}
              {isCreatorView && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">Priority Queue User</p>
                    <p className="text-amber-700">
                      This user joined from your priority queue and will be first in line. 
                      Review their topic and start the pre-call when ready.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Padding for safe area */}
        <div className="h-8" />
      </div>
      </div>
    </div>
  );
}