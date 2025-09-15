import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Settings
} from "lucide-react";

interface VideoCallInterfaceProps {
  onBack: () => void;
}

const VideoCallInterface = ({ onBack }: VideoCallInterfaceProps) => {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [message, setMessage] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [currentCost, setCurrentCost] = useState(0);
  const [chatPaused, setChatPaused] = useState(false);

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

  // Simulate timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
      // $5/min split 4 ways = $1.25 per person per minute
      setCurrentCost(prev => prev + (5 / 4 / 60)); // Per second cost
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = () => {
    if (message.trim() && !chatPaused) {
      // In real app, would send message
      setMessage("");
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col">
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
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 bg-muted/20 relative">
          {/* Main Video */}
          <div className="absolute inset-4 bg-gradient-primary rounded-lg flex items-center justify-center">
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
              
              <Button variant="destructive" size="sm">
                <Phone className="h-4 w-4" />
              </Button>
              
              <Button variant="secondary" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

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
            <div className="mt-2 text-xs text-muted-foreground">
              Moderated chat • Inappropriate content is automatically blocked
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
              <span className="font-semibold ml-2">$5.00/min</span>
            </div>
            <div>
              <span className="text-muted-foreground">Split 4 ways:</span>
              <span className="font-semibold ml-2">$1.25/min each</span>
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