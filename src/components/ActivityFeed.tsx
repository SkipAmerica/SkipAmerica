import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Heart, 
  MessageCircle, 
  Video, 
  Star, 
  Users, 
  Zap,
  Clock,
  TrendingUp,
  Award
} from "lucide-react";

interface ActivityFeedProps {
  showOnlyFollowing?: boolean;
}

const ActivityFeed = ({ showOnlyFollowing = false }: ActivityFeedProps) => {
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  const activities = [
    {
      id: "1",
      type: "creator_live",
      creator: {
        name: "Emma Wilson",
        username: "@emmafitness", 
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150",
        isVerified: true
      },
      timestamp: "2 minutes ago",
      content: "Just went live! Ready to help with workout plans and nutrition advice 💪",
      metadata: {
        viewers: 15,
        pricePerMin: 5.00,
        category: "Fitness"
      }
    },
    {
      id: "2", 
      type: "call_completed",
      creator: {
        name: "Alex Chen",
        username: "@alextech",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"
      },
      fan: {
        name: "Sarah M.",
        avatar: "SM"
      },
      timestamp: "15 minutes ago",
      content: "Had an amazing 30-minute call discussing React optimization strategies!",
      metadata: {
        duration: "30 min",
        rating: 5,
        earnings: "$120"
      }
    },
    {
      id: "3",
      type: "achievement", 
      creator: {
        name: "Maria Garcia",
        username: "@marialife",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
        isVerified: true
      },
      timestamp: "1 hour ago",
      content: "🎉 Just reached 500 five-star ratings! Thank you to all my amazing callers!",
      metadata: {
        milestone: "500 Five-Star Ratings",
        totalRatings: 500,
        avgRating: 4.9
      }
    },
    {
      id: "4",
      type: "trending",
      creator: {
        name: "David Kim",
        username: "@davidmusic", 
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
      },
      timestamp: "2 hours ago",
      content: "My guitar masterclass is trending! Join me for live lessons on chord progressions 🎸",
      metadata: {
        trendingRank: 3,
        totalViews: 1200,
        category: "Music"
      }
    },
    {
      id: "5",
      type: "fan_review",
      creator: {
        name: "Emma Wilson", 
        username: "@emmafitness",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150"
      },
      fan: {
        name: "Mike R.",
        avatar: "MR"
      },
      timestamp: "3 hours ago", 
      content: "Emma's nutrition advice completely changed my approach to meal planning. Worth every minute!",
      metadata: {
        rating: 5,
        callDuration: "45 min",
        tags: ["Helpful", "Professional", "Knowledgeable"]
      }
    },
    {
      id: "6",
      type: "milestone",
      creator: {
        name: "Alex Chen",
        username: "@alextech",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"
      },
      timestamp: "4 hours ago",
      content: "Just completed my 1000th call on the platform! Thank you everyone for this incredible journey 🚀",
      metadata: {
        totalCalls: 1000,
        totalEarnings: "$48000",
        joinDate: "2023"
      }
    }
  ];

  const toggleLike = (postId: string) => {
    setLikedPosts(prev => {
      const newLikes = new Set(prev);
      if (newLikes.has(postId)) {
        newLikes.delete(postId);
      } else {
        newLikes.add(postId);
      }
      return newLikes;
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "creator_live": return <Zap className="h-5 w-5 text-green-500" />;
      case "call_completed": return <Video className="h-5 w-5 text-blue-500" />;
      case "achievement": return <Award className="h-5 w-5 text-yellow-500" />;
      case "trending": return <TrendingUp className="h-5 w-5 text-purple-500" />;
      case "fan_review": return <Star className="h-5 w-5 text-orange-500" />;
      case "milestone": return <Award className="h-5 w-5 text-green-600" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const renderActivityCard = (activity: any) => (
    <Card key={activity.id} className="shadow-creator hover:shadow-glow transition-all duration-300">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start space-x-4">
          <div className="flex items-center space-x-2">
            {getActivityIcon(activity.type)}
            <Avatar className="h-10 w-10">
              <AvatarImage src={activity.creator.avatar} />
              <AvatarFallback>
                {activity.creator.name.split(' ').map((n: string) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-semibold">{activity.creator.name}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">{activity.timestamp}</span>
              {activity.creator.isVerified && (
                <Badge className="bg-primary text-primary-foreground text-xs">Verified</Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">{activity.creator.username}</div>
          </div>
        </div>

        {/* Content */}
        <div className="mt-4">
          <p>{activity.content}</p>
        </div>

        {/* Metadata */}
        {activity.metadata && (
          <div className="mt-4">
            {activity.type === "creator_live" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">{activity.metadata.viewers} watching</span>
                    </div>
                    <Badge variant="outline">${activity.metadata.pricePerMin}/min</Badge>
                    <Badge variant="secondary">{activity.metadata.category}</Badge>
                  </div>
                  <Button size="sm" className="bg-gradient-primary hover:bg-gradient-secondary">
                    Join Call
                  </Button>
                </div>
              </div>
            )}

            {activity.type === "call_completed" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <span><strong>Duration:</strong> {activity.metadata.duration}</span>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 fill-primary text-primary" />
                      <span>{activity.metadata.rating}/5</span>
                    </div>
                    <span><strong>Earned:</strong> {activity.metadata.earnings}</span>
                  </div>
                </div>
              </div>
            )}

            {activity.type === "achievement" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-yellow-600" />
                  <span className="font-semibold">{activity.metadata.milestone}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Average rating: {activity.metadata.avgRating}/5 across {activity.metadata.totalRatings} calls
                </div>
              </div>
            )}

            {activity.type === "trending" && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">#{activity.metadata.trendingRank} Trending in {activity.metadata.category}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{activity.metadata.totalViews} views</span>
                </div>
              </div>
            )}

            {activity.type === "fan_review" && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">{activity.fan.avatar}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{activity.fan.name}</span>
                    <div className="flex">
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} className={`h-3 w-3 ${star <= activity.metadata.rating ? 'fill-primary text-primary' : 'text-muted'}`} />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.metadata.callDuration}</span>
                </div>
                <div className="flex gap-1">
                  {activity.metadata.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            {activity.type === "milestone" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="font-bold text-lg">{activity.metadata.totalCalls}</div>
                    <div className="text-xs text-muted-foreground">Total Calls</div>
                  </div>
                  <div>
                    <div className="font-bold text-lg">{activity.metadata.totalEarnings}</div>
                    <div className="text-xs text-muted-foreground">Total Earned</div>
                  </div>
                  <div>
                    <div className="font-bold text-lg">Since {activity.metadata.joinDate}</div>
                    <div className="text-xs text-muted-foreground">Member Since</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center space-x-6 mt-4 pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleLike(activity.id)}
            className={likedPosts.has(activity.id) ? "text-red-500" : ""}
          >
            <Heart className={`h-4 w-4 mr-2 ${likedPosts.has(activity.id) ? 'fill-current' : ''}`} />
            {likedPosts.has(activity.id) ? 'Liked' : 'Like'}
          </Button>
          
          <Button variant="ghost" size="sm">
            <MessageCircle className="h-4 w-4 mr-2" />
            Comment
          </Button>
          
          {activity.type === "creator_live" && (
            <Button size="sm" variant="outline" className="ml-auto">
              <Video className="h-4 w-4 mr-2" />
              Join Call
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {activities.map(renderActivityCard)}
    </div>
  );
};

export default ActivityFeed;