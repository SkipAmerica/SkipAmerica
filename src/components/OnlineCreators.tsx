import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Video, Star, Users, Search, Filter, Zap, Sparkles } from "lucide-react";

interface OnlineCreatorsProps {
  onCreatorSelect: (creatorId: string) => void;
  onStartCall: (creatorId: string, callType?: 'standard' | 'speed_greet') => void;
}

const OnlineCreators = ({ onCreatorSelect, onStartCall }: OnlineCreatorsProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [liveCreators, setLiveCreators] = useState([
    {
      id: "1",
      name: "Sophia Martinez",
      username: "@sophiaskin",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b9e36b13?w=150",
      category: "Skincare & Beauty",
      rating: 4.9,
      totalRatings: 2840,
      pricePerMinute: 4.17,
      speedGreetPrice: 250.00,
      currentViewers: 347,
      responseTime: "< 2 hours",
      specialties: ["Skincare routines", "Anti-aging", "Acne treatment"],
      isLive: true,
      liveFor: "1h 20m",
      totalFollowers: 850000,
      recentActivity: "Celebrity esthetician sharing personalized skincare advice",
      influence_type: "expert",
      location: "Los Angeles, CA"
    },
    {
      id: "2", 
      name: "Isabella Chen",
      username: "@isabellamakeup",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
      category: "Makeup & Cosmetics",
      rating: 4.8,
      totalRatings: 1920,
      pricePerMinute: 3.33,
      speedGreetPrice: 200.00,
      currentViewers: 189,
      responseTime: "< 3 hours",
      specialties: ["Bridal makeup", "Editorial looks", "Color matching"],
      isLive: true,
      liveFor: "2h 15m",
      totalFollowers: 1200000,
      recentActivity: "Professional makeup artist teaching advanced techniques",
      influence_type: "artist",
      location: "New York, NY"
    },
    {
      id: "3",
      name: "Olivia Thompson", 
      username: "@oliviastyle",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
      category: "Fashion & Style",
      rating: 4.9,
      totalRatings: 1650,
      pricePerMinute: 3.75,
      speedGreetPrice: 225.00,
      currentViewers: 156,
      responseTime: "< 4 hours", 
      specialties: ["Personal styling", "Wardrobe curation", "Body confidence"],
      isLive: true,
      liveFor: "45m",
      totalFollowers: 680000,
      recentActivity: "Personal stylist helping women discover their signature style",
      influence_type: "stylist",
      location: "Chicago, IL"
    },
    {
      id: "4",
      name: "Zoe Rodriguez",
      username: "@zoehair",
      avatar: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150",
      category: "Hair & Styling",
      rating: 4.8,
      totalRatings: 2100,
      pricePerMinute: 2.92,
      speedGreetPrice: 175.00,
      currentViewers: 234,
      responseTime: "< 2 hours",
      specialties: ["Hair coloring", "Curly hair care", "Hair extensions"],
      isLive: true,
      liveFor: "1h 50m",
      totalFollowers: 950000,
      recentActivity: "Hair color specialist sharing trending techniques and care tips",
      influence_type: "stylist",
      location: "Miami, FL"
    },
    {
      id: "5",
      name: "Ava Johnson",
      username: "@avawellness",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
      category: "Wellness & Self-Care",
      rating: 4.7,
      totalRatings: 920,
      pricePerMinute: 2.50,
      speedGreetPrice: 150.00,
      currentViewers: 98,
      responseTime: "< 5 hours",
      specialties: ["Mindfulness", "Self-care routines", "Stress management"],
      isLive: true,
      liveFor: "30m",
      totalFollowers: 420000,
      recentActivity: "Wellness coach guiding women through self-care practices",
      influence_type: "coach",
      location: "Austin, TX"
    }
  ]);

  const categories = ["all", "Skincare & Beauty", "Makeup & Cosmetics", "Fashion & Style", "Hair & Styling", "Wellness & Self-Care"];

  const filteredCreators = liveCreators.filter(creator => {
    const matchesSearch = creator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         creator.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === "all" || creator.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCreators(prev => prev.map(creator => ({
        ...creator,
        currentViewers: Math.max(1, creator.currentViewers + Math.floor(Math.random() * 3 - 1))
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Zap className="h-6 w-6 mr-2 text-primary animate-pulse" />
            Beauty Experts Live
          </h2>
          <p className="text-muted-foreground">
            {filteredCreators.length} beauty experts available now
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge className="bg-green-100 text-green-800 animate-pulse">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            LIVE NOW
          </Badge>
        </div>
      </div>


      {/* Live Creators Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCreators.map((creator) => (
          <Card 
            key={creator.id} 
            className="shadow-creator hover:shadow-glow transition-all duration-300 cursor-pointer group"
            onClick={() => onCreatorSelect(creator.id)}
          >
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={creator.avatar} />
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                        {creator.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1">
                      <div className="w-4 h-4 bg-green-500 border-2 border-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{creator.name}</div>
                    <div className="text-sm text-muted-foreground truncate">{creator.username}</div>
                  </div>
                </div>
                
                <Badge variant="secondary" className="bg-green-100 text-green-800 whitespace-nowrap">
                  Live {creator.liveFor}
                </Badge>
              </div>

              {/* Category & Rating */}
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline">{creator.category}</Badge>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <span className="font-semibold">{creator.rating}</span>
                  <span className="text-sm text-muted-foreground">({creator.totalRatings})</span>
                </div>
              </div>

              {/* Specialties */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {creator.specialties.map((specialty, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Activity */}
              <div className="mb-4 p-3 bg-accent rounded-lg">
                <div className="text-sm font-medium mb-1">Current Activity</div>
                <div className="text-sm text-muted-foreground">{creator.recentActivity}</div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                <div>
                  <div className="text-sm font-bold">${creator.pricePerMinute}</div>
                  <div className="text-xs text-muted-foreground">per min</div>
                </div>
                <div>
                  <div className="text-sm font-bold flex items-center justify-center">
                    <Users className="h-3 w-3 mr-1" />
                    {creator.currentViewers}
                  </div>
                  <div className="text-xs text-muted-foreground">watching</div>
                </div>
                <div>
                  <div className="text-sm font-bold">{creator.responseTime}</div>
                  <div className="text-xs text-muted-foreground">response</div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Button 
                  variant="hero"
                  className="w-full relative overflow-hidden group/greet"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartCall(creator.id, 'speed_greet');
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-orange-400/20 to-red-400/20 animate-pulse"></div>
                  <div className="relative flex items-center justify-center w-full">
                    <Sparkles className="h-4 w-4 mr-2 text-yellow-300 animate-pulse" />
                    <span className="font-bold">Speed Greet - ${creator.speedGreetPrice}</span>
                    <div className="ml-2 text-xs bg-white/20 px-2 py-1 rounded-full">
                      2 min
                    </div>
                  </div>
                </Button>
                
                <Button 
                  className="w-full bg-gradient-primary hover:bg-gradient-secondary group-hover:scale-105 transition-transform"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartCall(creator.id, 'standard');
                  }}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Start Call Now
                </Button>
                
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    View Profile
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Follow
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCreators.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <div className="font-semibold">No beauty experts found</div>
            <div className="text-sm">Try adjusting your search or filters</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineCreators;