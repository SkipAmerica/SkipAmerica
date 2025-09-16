import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileRepository } from "@/components/creator/FileRepository";
import { CallSettings } from "@/components/creator/CallSettings";
import { ArrowLeft, DollarSign, Users, Clock, Shield, Settings, FolderOpen, Sliders } from "lucide-react";

interface CreatorDashboardProps {
  onBack: () => void;
}

const CreatorDashboard = ({ onBack }: CreatorDashboardProps) => {
  const [pricePer5Min, setPricePer5Min] = useState("25.00");
  const [isLive, setIsLive] = useState(false);
  const [blockedWords, setBlockedWords] = useState("spam, inappropriate, rude");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Creator Dashboard</h1>
          <Badge variant="secondary" className="ml-auto">
            {isLive ? "LIVE" : "OFFLINE"}
          </Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <Sliders className="h-4 w-4" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Files
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-0">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Settings Panel */}
              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DollarSign className="mr-2 h-5 w-5" />
                      Pricing Settings
                    </CardTitle>
                    <CardDescription>
                      Set your per-minute rate and availability
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="price">Price per 5 minutes (USD)</Label>
                      <Input
                        id="price"
                        value={pricePer5Min}
                        onChange={(e) => setPricePer5Min(e.target.value)}
                        placeholder="25.00"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="live">Available for calls</Label>
                      <Switch
                        id="live"
                        checked={isLive}
                        onCheckedChange={setIsLive}
                      />
                    </div>

                    <div className="bg-accent p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Group Pricing (5-min blocks)</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>1 person:</span>
                          <span>${pricePer5Min}/5min</span>
                        </div>
                        <div className="flex justify-between">
                          <span>2 people:</span>
                          <span>${(parseFloat(pricePer5Min) * 0.8).toFixed(2)}/5min each</span>
                        </div>
                        <div className="flex justify-between">
                          <span>5 people:</span>
                          <span>${(parseFloat(pricePer5Min) * 0.5).toFixed(2)}/5min each</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Dashboard */}
              <div className="lg:col-span-2 space-y-6">
                {/* Stats Cards */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-6 text-center">
                      <DollarSign className="h-8 w-8 text-primary mx-auto mb-2" />
                      <div className="text-2xl font-bold">$1,250</div>
                      <p className="text-muted-foreground">This Month</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
                      <div className="text-2xl font-bold">24.5h</div>
                      <p className="text-muted-foreground">Call Time</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                      <div className="text-2xl font-bold">156</div>
                      <p className="text-muted-foreground">Total Fans</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Call Requests</CardTitle>
                    <CardDescription>
                      Fans waiting to connect with you
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { name: "Sarah M.", duration: "15 min", amount: "$75", status: "waiting" },
                        { name: "Mike R.", duration: "30 min", amount: "$150", status: "waiting" },
                        { name: "Group Call (3)", duration: "20 min", amount: "$100", status: "waiting" }
                      ].map((request, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <div className="font-semibold">{request.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {request.duration} • {request.amount}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              Decline
                            </Button>
                            <Button size="sm" className="bg-gradient-primary hover:bg-gradient-secondary">
                              Accept
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Go Live Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Start Accepting Calls</CardTitle>
                    <CardDescription>
                      Toggle your availability to start earning
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLive ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gradient-primary rounded-full mx-auto mb-4 flex items-center justify-center">
                          <div className="w-4 h-4 bg-primary-foreground rounded-full animate-pulse"></div>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">You're Live!</h3>
                        <p className="text-muted-foreground mb-4">
                          Fans can now request video calls with you at ${pricePer5Min}/5min
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={() => setIsLive(false)}
                        >
                          Go Offline
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <h3 className="text-xl font-semibold mb-2">Ready to Go Live?</h3>
                        <p className="text-muted-foreground mb-4">
                          Start accepting video call requests from your fans
                        </p>
                        <Button 
                          className="bg-gradient-primary hover:bg-gradient-secondary" 
                          onClick={() => setIsLive(true)}
                        >
                          Go Live
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="mt-0">
            <CallSettings creatorId="current-user-id" />
          </TabsContent>

          <TabsContent value="files" className="mt-0">
            <FileRepository />
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <div className="grid lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 h-5 w-5" />
                    Content Moderation
                  </CardTitle>
                  <CardDescription>
                    Automatically moderate chat messages
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="blocked">Blocked Words (comma separated)</Label>
                    <Textarea
                      id="blocked"
                      value={blockedWords}
                      onChange={(e) => setBlockedWords(e.target.value)}
                      placeholder="Enter words to block..."
                      className="h-20"
                    />
                  </div>
                  
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      When blocked words are detected, the chat will be automatically paused and you'll be notified.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CreatorDashboard;