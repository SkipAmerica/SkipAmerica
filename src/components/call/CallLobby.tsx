import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { 
  Play, 
  Clock, 
  Shield, 
  AlertTriangle,
  X,
  Settings,
  Upload,
  Video
} from "lucide-react";

interface CallLobbyProps {
  creator: {
    name: string;
    avatar?: string;
    customLobbyMedia?: {
      type: 'image' | 'video';
      url: string;
    };
    lobbyMessage?: string;
  };
  fan: {
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
          // Auto-start call when timer reaches 0
          onStartCall();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onStartCall]);

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <Shield className="h-3 w-3 mr-1" />
            Safety Lobby
          </Badge>
          <h1 className="text-2xl font-bold">
            {isCreatorView ? 'Review Participant' : 'Connecting to Creator'}
          </h1>
          <p className="text-muted-foreground">
            {isCreatorView 
              ? 'Take a moment to review the participant before starting the call'
              : 'Please wait while the creator prepares for your session'
            }
          </p>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Video Preview */}
          <Card>
            <CardContent className="p-6">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
                {showVideoPreview ? (
                  <div className="text-center">
                    <Avatar className="h-20 w-20 mx-auto mb-4">
                      <AvatarImage src={fan.avatar} />
                      <AvatarFallback className="text-2xl">
                        {fan.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold">{fan.name}</h3>
                    <p className="text-sm text-muted-foreground">Waiting to connect...</p>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-2" />
                    <p>Video preview disabled</p>
                  </div>
                )}
              </div>
              
              {isCreatorView && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVideoPreview(!showVideoPreview)}
                  >
                    {showVideoPreview ? 'Hide Preview' : 'Show Preview'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Creator's Custom Content */}
          <Card>
            <CardContent className="p-6">
              <div className="aspect-video bg-gradient-primary rounded-lg flex items-center justify-center relative overflow-hidden">
                {creator.customLobbyMedia ? (
                  creator.customLobbyMedia.type === 'image' ? (
                    <img 
                      src={creator.customLobbyMedia.url} 
                      alt="Creator lobby"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video 
                      src={creator.customLobbyMedia.url}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      loop
                    />
                  )
                ) : (
                  <div className="text-center text-primary-foreground">
                    <Avatar className="h-20 w-20 mx-auto mb-4">
                      <AvatarImage src={creator.avatar} />
                      <AvatarFallback className="text-2xl bg-primary-foreground text-primary">
                        {creator.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-semibold">{creator.name}</h3>
                    <p className="opacity-80">
                      {creator.lobbyMessage || "Welcome! I'll be with you shortly."}
                    </p>
                  </div>
                )}
              </div>
              
              {isCreatorView && (
                <div className="mt-4 text-center">
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Customize Lobby
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Timer and Controls */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Timer */}
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-semibold">
                    {timeRemaining}s remaining
                  </span>
                </div>
                <Progress value={progressPercentage} className="w-full max-w-md mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Call will start automatically when timer reaches zero
                </p>
              </div>

              {/* Controls */}
              <div className="flex justify-center space-x-4">
                {isCreatorView ? (
                  <>
                    <Button 
                      variant="gradient" 
                      onClick={handleStartEarly}
                      className="min-w-32"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Now
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleReject}
                      className="min-w-32"
                    >
                      <X className="h-4 w-4 mr-2" />
                      End Call
                    </Button>
                  </>
                ) : (
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Please wait while {creator.name} reviews the connection
                    </p>
                    <Button variant="outline" onClick={onRejectCall}>
                      Cancel Call
                    </Button>
                  </div>
                )}
              </div>

              {/* Safety Note */}
              {isCreatorView && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">Safety Review</p>
                    <p className="text-amber-700">
                      Use this time to ensure the participant is appropriate for your content. 
                      You can end the call immediately if you notice any concerning behavior.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}