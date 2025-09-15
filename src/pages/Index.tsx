import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, Users, Shield, DollarSign, Clock, Star } from "lucide-react";
import CreatorDashboard from "@/components/CreatorDashboard";
import FanInterface from "@/components/FanInterface";
import VideoCallInterface from "@/components/VideoCallInterface";
import heroImage from "@/assets/hero-image.jpg";

const Index = () => {
  const [activeTab, setActiveTab] = useState("home");

  if (activeTab === "creator") {
    return <CreatorDashboard onBack={() => setActiveTab("home")} />;
  }

  if (activeTab === "fan") {
    return <FanInterface onBack={() => setActiveTab("home")} />;
  }

  if (activeTab === "call") {
    return <VideoCallInterface onBack={() => setActiveTab("home")} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Video className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              CreatorCall
            </h1>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">Sign In</Button>
            <Button variant="gradient">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-gradient-hero text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img 
            src={heroImage} 
            alt="Creators connecting with fans through video calls" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="container mx-auto max-w-4xl relative z-10">
          <Badge className="mb-4 bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
            Monetize Your Community
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            FaceTime for Creators
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            Connect directly with your fans through paid video calls. Share costs in groups, moderate conversations, and build deeper relationships.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="hero"
              onClick={() => setActiveTab("creator")}
            >
              I'm a Creator
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setActiveTab("fan")}
            >
              I'm a Fan
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need to Connect
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="shadow-creator hover:shadow-glow transition-all duration-300">
              <CardHeader>
                <DollarSign className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Minute-Based Pricing</CardTitle>
                <CardDescription>
                  Set your per-minute rate and earn directly from your time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-accent p-4 rounded-lg">
                  <p className="text-sm text-accent-foreground">
                    Example: $5/min for 1 person, $2.50/min for 2 people
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-creator hover:shadow-glow transition-all duration-300">
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Group Calls</CardTitle>
                <CardDescription>
                  More fans = lower cost for everyone. Build community while earning more.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>1 person</span>
                    <span className="font-bold">$5/min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2 people</span>
                    <span className="font-bold">$2.50/min each</span>
                  </div>
                  <div className="flex justify-between">
                    <span>5 people</span>
                    <span className="font-bold">$1/min each</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-creator hover:shadow-glow transition-all duration-300">
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Content Moderation</CardTitle>
                <CardDescription>
                  Block inappropriate words and maintain a safe environment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Automatically pause chat when blocked words are detected
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-16 px-4 bg-muted">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">See It In Action</h2>
          <div className="max-w-2xl mx-auto">
            <Card className="p-8">
              <div className="space-y-4">
                <Button 
                  onClick={() => setActiveTab("call")} 
                  variant="gradient"
                  className="w-full"
                >
                  <Video className="mr-2 h-4 w-4" />
                  Preview Video Call Interface
                </Button>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab("creator")}
                  >
                    Creator Dashboard
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab("fan")}
                  >
                    Fan Experience
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">$250k+</div>
              <p className="text-muted-foreground">Creator Earnings</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">10k+</div>
              <p className="text-muted-foreground">Video Calls</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">500+</div>
              <p className="text-muted-foreground">Active Creators</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">4.9</div>
              <div className="flex justify-center mb-2">
                {[1,2,3,4,5].map((star) => (
                  <Star key={star} className="h-5 w-5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-muted-foreground">Average Rating</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;