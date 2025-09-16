import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { CallFlow } from "@/components/call/CallFlow";
import { 
  ArrowLeft, 
  Video, 
  Star, 
  Users, 
  Clock, 
  Heart,
  MessageCircle,
  Share2,
  Calendar,
  DollarSign,
  Trophy,
  CheckCircle
} from "lucide-react";

interface CreatorProfileProps {
  onBack: () => void;
  onStartCall?: () => void;
}

const CreatorProfile = ({ onBack, onStartCall }: CreatorProfileProps) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [showCallFlow, setShowCallFlow] = useState(false);
  
  // Mock creator data
  const creator = {
    name: "Emma Wilson",
    username: "@emmafitness",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150",
    coverImage: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800",
    isOnline: true,
    isVerified: true,
    category: "Fitness & Wellness",
    bio: "Certified personal trainer helping you reach your fitness goals. 5+ years experience in strength training, nutrition, and mindset coaching.",
    location: "Los Angeles, CA",
    joinedDate: "March 2023",
    maxCallDuration: 60, // minutes
    callRate: 5.00, // per minute
    lobbyMessage: "Welcome! Let me make sure we have a great session together 💪",
    stats: {
      followers: 12500,
      totalCalls: 1847,
      responseRate: 98,
      avgRating: 4.9,
      totalRatings: 523
    },
    pricing: {
      perMinute: 5.00,
      specialties: ["Fitness Training", "Nutrition Advice", "Workout Plans"]
    },
    schedule: {
      nextAvailable: "Available now",
      upcomingSlots: ["2:00 PM", "4:30 PM", "7:00 PM"]
    }
  };

  const recentPosts = [
    {
      id: 1,
      content: "Just finished an amazing call helping Sarah with her deadlift form! 💪 Love seeing the progress!",
      timestamp: "2 hours ago",
      likes: 24,
      comments: 8,
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400"
    },
    {
      id: 2,
      content: "Going live for the next 3 hours! Ready to help with workout plans and nutrition questions 🌟",
      timestamp: "5 hours ago",
      likes: 67,
      comments: 15
    }
  ];

  const reviews = [
    {
      id: 1,
      fan: "Sarah M.",
      rating: 5,
      comment: "Emma helped me perfect my deadlift form. She's incredibly knowledgeable and patient!",
      date: "2 days ago",
      verified: true
    },
    {
      id: 2,
      fan: "Mike R.",
      rating: 5,
      comment: "Great nutrition advice that actually works. Worth every penny!",
      date: "1 week ago",
      verified: true
    }
  ];

  const handleStartCall = () => {
    setShowCallFlow(true);
  };

  const handleEndCall = () => {
    setShowCallFlow(false);
  };

  // Mock current user as fan
  const currentUser = {
    id: "fan-123",
    name: "Sarah M.",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150"
  };

  if (showCallFlow) {
    return (
      <CallFlow
        creator={{
          id: "creator-123",
          name: creator.name,
          avatar: creator.avatar,
          maxCallDuration: creator.maxCallDuration,
          callRate: creator.callRate,
          lobbyMessage: creator.lobbyMessage
        }}
        fan={currentUser}
        onEndCall={handleEndCall}
        isCreatorView={false}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-semibold">Creator Profile</h1>
          <Button variant="ghost">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 pb-8">
        {/* Cover & Profile Section */}
        <div className="relative">
          <div 
            className="h-48 bg-gradient-hero rounded-lg mt-4"
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${creator.coverImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          
          <div className="relative -mt-16 px-6">
            <div className="flex items-end justify-between">
              <div className="flex items-end space-x-4">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-background">
                    <AvatarImage src={creator.avatar} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl">
                      EW
                    </AvatarFallback>
                  </Avatar>
                  {creator.isOnline && (
                    <div className="absolute -bottom-1 -right-1">
                      <Badge className="bg-green-500 text-white px-2 py-1">
                        <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
                        LIVE
                      </Badge>
                    </div>
                  )}
                </div>
                
                <div className="pb-4">
                  <div className="flex items-center space-x-2">
                    <h1 className="text-2xl font-bold">{creator.name}</h1>
                    {creator.isVerified && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <p className="text-muted-foreground">{creator.username}</p>
                  <Badge variant="secondary" className="mt-1">
                    {creator.category}
                  </Badge>
                </div>
              </div>
              
              <div className="flex space-x-2 pb-4">
                <Button
                  variant={isFollowing ? "secondary" : "outline"}
                  onClick={() => setIsFollowing(!isFollowing)}
                >
                  <Heart className={`h-4 w-4 mr-2 ${isFollowing ? 'fill-current' : ''}`} />
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
                <Button variant="gradient" onClick={handleStartCall}>
                  <Video className="h-4 w-4 mr-2" />
                  Start Call
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold">{creator.stats.followers.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Followers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold">{creator.stats.totalCalls.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Total Calls</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center space-x-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="text-xl font-bold">{creator.stats.avgRating}</span>
              </div>
              <p className="text-sm text-muted-foreground">{creator.stats.totalRatings} ratings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold">{creator.stats.responseRate}%</div>
              <p className="text-sm text-muted-foreground">Response Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="about" className="mt-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>
          
          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>{creator.bio}</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Specialties</h4>
                    <div className="flex flex-wrap gap-2">
                      {creator.pricing.specialties.map((specialty, index) => (
                        <Badge key={index} variant="outline">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Pricing</h4>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="font-bold">${creator.pricing.perMinute}/minute</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Cost splits with group size
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    📍 {creator.location} • Joined {creator.joinedDate}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="posts" className="space-y-4">
            {recentPosts.map((post) => (
              <Card key={post.id}>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <Avatar>
                      <AvatarImage src={creator.avatar} />
                      <AvatarFallback>EW</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{creator.name}</span>
                        <span className="text-sm text-muted-foreground">{post.timestamp}</span>
                      </div>
                      
                      <p className="mt-2">{post.content}</p>
                      
                      {post.image && (
                        <img 
                          src={post.image} 
                          alt="Post content"
                          className="mt-4 rounded-lg w-full max-w-md h-48 object-cover"
                        />
                      )}
                      
                      <div className="flex items-center space-x-6 mt-4">
                        <Button variant="ghost" size="sm">
                          <Heart className="h-4 w-4 mr-2" />
                          {post.likes}
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          {post.comments}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <div className="grid gap-4">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">{review.fan}</span>
                          {review.verified && (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 mt-1">
                          {[1,2,3,4,5].map((star) => (
                            <Star 
                              key={star} 
                              className={`h-4 w-4 ${star <= review.rating ? 'fill-primary text-primary' : 'text-muted'}`} 
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">{review.date}</span>
                    </div>
                    <p className="mt-3">{review.comment}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Availability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <div className="font-semibold text-green-800">Available Now</div>
                      <div className="text-sm text-green-600">Ready to take calls</div>
                    </div>
                    <Button variant="gradient" onClick={handleStartCall}>
                      Start Call Now
                    </Button>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Upcoming Available Times</h4>
                    <div className="space-y-2">
                      {creator.schedule.upcomingSlots.map((time, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <span>{time} Today</span>
                          <Button size="sm" variant="outline">
                            Schedule
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CreatorProfile;