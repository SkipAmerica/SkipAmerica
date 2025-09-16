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
      name: "Emma Wilson",
      username: "@emmafitness",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150",
      category: "Fitness & Wellness",
      rating: 4.9,
      totalRatings: 523,
      pricePerMinute: 5.00,
      speedGreetPrice: 15.00,
      currentViewers: 12,
      responseTime: "< 30s",
      specialties: ["Personal Training", "Nutrition"],
      isLive: true,
      liveFor: "2h 15m",
      totalFollowers: 12500,
      recentActivity: "Just helped 3 people with workout plans!"
    },
    {
      id: "2", 
      name: "Alex Chen",
      username: "@alextech",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
      category: "Tech & Business",
      rating: 4.8,
      totalRatings: 391,
      pricePerMinute: 8.00,
      speedGreetPrice: 24.00,
      currentViewers: 8,
      responseTime: "< 1m",
      specialties: ["App Development", "Tech Career"],
      isLive: true,
      liveFor: "45m",
      totalFollowers: 8900,
      recentActivity: "Reviewing startup ideas with founders"
    },
    {
      id: "3",
      name: "Maria Garcia", 
      username: "@marialife",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
      category: "Life Coaching",
      rating: 4.9,
      totalRatings: 721,
      pricePerMinute: 12.00,
      speedGreetPrice: 36.00,
      currentViewers: 15,
      responseTime: "< 45s", 
      specialties: ["Career Growth", "Mindfulness"],
      isLive: true,
      liveFor: "3h 20m",
      totalFollowers: 18200,
      recentActivity: "Helping professionals find work-life balance"
    },
    {
      id: "4",
      name: "David Kim",
      username: "@davidmusic",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      category: "Music & Arts",
      rating: 4.7,
      totalRatings: 289,
      pricePerMinute: 6.00,
      speedGreetPrice: 18.00,
      currentViewers: 5,
      responseTime: "< 2m",
      specialties: ["Guitar Lessons", "Music Production"],
      isLive: true,
      liveFor: "1h 30m",
      totalFollowers: 5600,
      recentActivity: "Teaching chord progressions and songwriting"
    }
  ]);

  const categories = ["all", "Fitness & Wellness", "Tech & Business", "Life Coaching", "Music & Arts"];

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
            Live Creators
          </h2>
          <p className="text-muted-foreground">
            {filteredCreators.length} creators available for instant calls
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge className="bg-green-100 text-green-800 animate-pulse">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            LIVE NOW
          </Badge>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search creators or specialties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={filterCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterCategory(category)}
            >
              {category === "all" ? "All" : category.split(" ")[0]}
            </Button>
          ))}
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
            <div className="font-semibold">No creators found</div>
            <div className="text-sm">Try adjusting your search or filters</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineCreators;