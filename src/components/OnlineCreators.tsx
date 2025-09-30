import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Video, Star, Users, Search, Filter, Zap, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OnlineCreatorsProps {
  onCreatorSelect: (creatorId: string) => void;
  onStartCall: (creatorId: string, callType?: 'standard' | 'speed_greet') => void;
}

const OnlineCreators = ({ onCreatorSelect, onStartCall }: OnlineCreatorsProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [liveCreators, setLiveCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = ["all"];

  // Load real creators with online status and live sessions
  useEffect(() => {
    const loadLiveCreators = async () => {
      setLoading(true);
      try {
        console.log('[OnlineCreators] Fetching real live creators');

        const { data, error } = await supabase
          .from('creators')
          .select(`
            id,
            full_name,
            avatar_url,
            bio,
            headline,
            categories,
            base_rate_min,
            celebrity_tier,
            creator_presence!inner (
              is_online
            ),
            live_sessions!left (
              id,
              started_at,
              ended_at
            ),
            call_queue (
              id
            )
          `)
          .eq('creator_presence.is_online', true)
          .eq('is_suppressed', false)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[OnlineCreators] Error:', error);
          setLiveCreators([]);
          return;
        }

        const creators = (data || []).map((creator: any) => {
          const activeSessions = creator.live_sessions?.filter((s: any) => !s.ended_at) || [];
          const isLive = activeSessions.length > 0;
          const liveSession = activeSessions[0];
          
          let liveFor = 'Scheduled';
          if (isLive && liveSession?.started_at) {
            const mins = Math.floor((Date.now() - new Date(liveSession.started_at).getTime()) / 60000);
            liveFor = mins < 60 ? `${mins}m` : `${Math.floor(mins/60)}h ${mins%60}m`;
          }

          return {
            id: creator.id,
            name: creator.full_name,
            username: `@${creator.full_name.toLowerCase().replace(/\s+/g, '')}`,
            avatar: creator.avatar_url || '',
            category: creator.categories?.[0] || 'General',
            rating: 4.8,
            totalRatings: 0,
            pricePerMinute: (creator.base_rate_min || 0) / 60,
            speedGreetPrice: (creator.base_rate_min || 0) * 2,
            currentViewers: creator.call_queue?.length || 0,
            responseTime: '< 24 hours',
            specialties: creator.categories || [],
            isLive,
            liveFor,
            totalFollowers: 0,
            recentActivity: creator.headline || creator.bio || 'Available now',
            influence_type: creator.celebrity_tier?.toLowerCase() || 'creator',
            location: '',
          };
        });

        setLiveCreators(creators);
        console.log('[OnlineCreators] Loaded', creators.length, 'creators');
      } catch (error) {
        console.error('[OnlineCreators] Error loading:', error);
        setLiveCreators([]);
      } finally {
        setLoading(false);
      }
    };

    loadLiveCreators();

    // Subscribe to presence changes
    const presenceChannel = supabase
      .channel('online-creators-presence')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'creator_presence',
        },
        () => {
          console.log('[OnlineCreators] Presence changed, reloading');
          loadLiveCreators();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, []);

  const filteredCreators = liveCreators.filter(creator => {
    const matchesSearch = creator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         creator.specialties.some((s: string) => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === "all" || creator.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Zap className="h-6 w-6 mr-2 text-primary animate-pulse" />
            Influential People Live
          </h2>
          <p className="text-muted-foreground">
            {filteredCreators.length} influential people available now
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
      {loading ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">Loading live creators...</div>
        </div>
      ) : (
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
      )}

      {!loading && filteredCreators.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <div className="font-semibold">No influential people found</div>
            <div className="text-sm">Try adjusting your search or filters</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineCreators;