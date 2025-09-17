import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Heart, Share2, MessageCircle, Verified } from "lucide-react";

interface CreatorCardProps {
  creator: {
    id: string;
    name: string;
    avatar?: string;
    category: string;
    expertise: string;
    isVerified?: boolean;
    title: string;
    description: string;
    contentType: "BLOG" | "LINK" | "PODCAST" | "VIDEO";
    image?: string;
  };
  onViewProfile?: () => void;
  onConnect?: () => void;
  className?: string;
}

const contentTypeColors = {
  BLOG: "bg-gradient-to-r from-blue-500 to-blue-600",
  LINK: "bg-gradient-to-r from-green-500 to-green-600", 
  PODCAST: "bg-gradient-to-r from-purple-500 to-purple-600",
  VIDEO: "bg-gradient-to-r from-red-500 to-red-600",
};

const contentTypeIcons = {
  BLOG: "📝",
  LINK: "🔗", 
  PODCAST: "🎙️",
  VIDEO: "📹",
};

export function CreatorCard({ creator, onViewProfile, onConnect, className }: CreatorCardProps) {
  return (
    <Card className={cn("overflow-hidden hover:shadow-lg transition-all duration-300 bg-white", className)}>
      {/* Header with creator name and category */}
      <div className={cn(
        "px-4 py-3 text-white font-medium flex items-center justify-between",
        contentTypeColors[creator.contentType]
      )}>
        <span className="text-lg font-semibold">{creator.name}</span>
        <div className="flex items-center gap-1">
          <span className="text-sm opacity-90">{creator.category}</span>
          <span className="text-xs opacity-75">{">"}</span>
          <span className="text-sm italic opacity-75">{creator.expertise}</span>
          {creator.isVerified && <Verified className="w-4 h-4 ml-1" />}
        </div>
      </div>

      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          {/* Hexagonal avatar inspired by OSMO */}
          <div className="relative">
            <div className="w-16 h-16 relative">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full absolute inset-0"
              >
                <defs>
                  <clipPath id={`hexagon-${creator.id}`}>
                    <polygon points="50,5 85,25 85,75 50,95 15,75 15,25" />
                  </clipPath>
                </defs>
              </svg>
              <Avatar className="w-full h-full" style={{ clipPath: `url(#hexagon-${creator.id})` }}>
                <AvatarImage src={creator.avatar} />
                <AvatarFallback className="text-lg font-semibold bg-gradient-primary text-primary-foreground">
                  {creator.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>
            
            {/* Verification badges */}
            <div className="absolute -bottom-1 -right-1 flex gap-1">
              <div className="w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center text-xs">
                👍
              </div>
              {creator.isVerified && (
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <Verified className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1 text-gray-800">{creator.title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-3">
              {creator.description}
            </p>
            
            {/* Content type indicator */}
            <Badge variant="outline" className="mb-3">
              <span className="mr-1">{contentTypeIcons[creator.contentType]}</span>
              {creator.contentType}
            </Badge>
          </div>
        </div>

        {/* Content image if available */}
        {creator.image && (
          <div className="mb-4">
            <img 
              src={creator.image} 
              alt={creator.title}
              className="w-full h-32 object-cover rounded-lg"
            />
          </div>
        )}

        {/* Action buttons - OSMO style */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
              <MessageCircle className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-red-500">
              <Heart className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onViewProfile}>
              View Profile
            </Button>
            <Button 
              size="sm" 
              className="bg-gradient-primary hover:bg-gradient-secondary text-primary-foreground"
              onClick={onConnect}
            >
              Connect
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}