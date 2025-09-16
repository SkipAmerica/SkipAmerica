import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Video, Users, Clock, Star, DollarSign } from "lucide-react";

interface FanInterfaceProps {
  onBack: () => void;
}

const FanInterface = ({ onBack }: FanInterfaceProps) => {
  const [selectedDuration, setSelectedDuration] = useState(15);
  const [groupSize, setGroupSize] = useState(1);
  
  const creators = [
    {
      name: "Emma Stone",
      category: "Entertainment & Celebrity",
      rating: 4.9,
      price: 8.33,
      avatar: "ES",
      isLive: false,
      totalCalls: 156
    },
    {
      name: "Dr. Sarah Chen",
      category: "Technology Expert",
      rating: 4.95,
      price: 3.33,
      avatar: "SC",
      isLive: true,
      totalCalls: 890
    },
    {
      name: "Marcus Johnson",
      category: "Business Leader",
      rating: 4.8,
      price: 5.83,
      avatar: "MJ",
      isLive: true,
      totalCalls: 445
    }
  ];

  const calculateCost = (pricePerMin: number, duration: number, people: number) => {
    return ((pricePerMin * duration) / people).toFixed(2);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Browse Influential People</h1>
          <Badge variant="secondary" className="ml-auto">
            Fan Dashboard
          </Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Filter Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Call Settings</CardTitle>
                <CardDescription>
                  Customize your call preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Call Duration</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {[10, 15, 30].map((duration) => (
                      <Button
                        key={duration}
                        variant={selectedDuration === duration ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedDuration(duration)}
                      >
                        {duration}min
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Group Size (splits cost)</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGroupSize(Math.max(1, groupSize - 1))}
                    >
                      -
                    </Button>
                    <Input
                      value={groupSize}
                      onChange={(e) => setGroupSize(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGroupSize(Math.min(10, groupSize + 1))}
                    >
                      +
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    More people = lower cost per person
                  </p>
                </div>

                <div className="bg-accent p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">How It Works</h4>
                  <ul className="text-sm space-y-1 text-accent-foreground">
                    <li>• Choose your favorite influential person</li>
                    <li>• Set call duration</li>
                    <li>• Join solo or invite friends</li>
                    <li>• Pay per minute used</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Creator Grid */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Available Influential People</h2>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-1" />
                  Live Only
                </Button>
                <Button variant="outline" size="sm">
                  Price: Low to High
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {creators.map((creator, index) => (
                <Card key={index} className="shadow-creator hover:shadow-glow transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                            {creator.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{creator.name}</CardTitle>
                          <CardDescription>{creator.category}</CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        {creator.isLive ? (
                          <Badge className="bg-gradient-primary text-primary-foreground">
                            <div className="w-2 h-2 bg-primary-foreground rounded-full mr-2 animate-pulse"></div>
                            LIVE
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Offline</Badge>
                        )}
                        <div className="flex items-center mt-1">
                          <Star className="h-3 w-3 fill-primary text-primary mr-1" />
                          <span className="text-sm font-semibold">{creator.rating}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Price per minute:</span>
                          <div className="font-semibold">${creator.price}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total calls:</span>
                          <div className="font-semibold">{creator.totalCalls.toLocaleString()}</div>
                        </div>
                      </div>

                      <div className="bg-muted p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Your Cost:</span>
                          <span className="text-lg font-bold text-primary">
                            ${calculateCost(creator.price, selectedDuration, groupSize)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedDuration} minutes • {groupSize} person{groupSize > 1 ? 's' : ''}
                          {groupSize > 1 && ` (${creator.price * selectedDuration} total split ${groupSize} ways)`}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button 
                          className="flex-1 bg-gradient-primary hover:bg-gradient-secondary"
                          disabled={!creator.isLive}
                        >
                          <Video className="h-4 w-4 mr-2" />
                          {creator.isLive ? 'Start Call' : 'Unavailable'}
                        </Button>
                        <Button variant="outline">
                          Profile
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Active Calls Section */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Your Active Calls
                </CardTitle>
                <CardDescription>
                  Calls you've joined or are waiting to join
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-accent">
                    <div>
                      <div className="font-semibold">Call with Emma Wilson</div>
                      <div className="text-sm text-muted-foreground">
                        Waiting for 2 more people • Starting at $1.67/min each
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        Leave Queue
                      </Button>
                      <Button size="sm" className="bg-gradient-secondary hover:bg-gradient-primary">
                        Join Now
                      </Button>
                    </div>
                  </div>

                  <div className="text-center py-8 text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No other active calls</p>
                    <p className="text-sm">Browse creators above to start a new call</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FanInterface;