import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Shield, 
  Calendar, 
  Star, 
  Users, 
  MessageCircle,
  CheckCircle,
  Youtube,
  Twitter,
  Instagram,
  ExternalLink,
  Settings,
  Sparkles
} from 'lucide-react';
import { ReliabilityScore } from '@/components/appointments/ReliabilityScore';
import { SocialVerification } from '@/components/social/SocialVerification';
import { CreatorContent } from '@/components/social/CreatorContent';
import { AppointmentBooking } from '@/components/appointments/AppointmentBooking';
import { CallSettings } from '@/components/creator/CallSettings';

interface CreatorProfileProps {
  creator: {
    id: string;
    full_name: string;
    bio?: string;
    avatar_url?: string;
    account_type: string;
    is_verified: boolean;
  };
  isOwnProfile?: boolean;
}

export function CreatorProfileEnhanced({ creator, isOwnProfile = false }: CreatorProfileProps) {
  const [activeTab, setActiveTab] = useState('about');

  const getSocialPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube': return Youtube;
      case 'twitter': return Twitter;
      case 'instagram': return Instagram;
      default: return ExternalLink;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={creator.avatar_url} alt={creator.full_name} />
              <AvatarFallback className="text-lg">
                {creator.full_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold">{creator.full_name}</h1>
                {creator.is_verified && (
                  <Badge className="bg-blue-500 text-white">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
                {creator.account_type === 'creator' && (
                  <Badge variant="secondary">
                    <Shield className="h-3 w-3 mr-1" />
                    Creator
                  </Badge>
                )}
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Market Rate
                </Badge>
              </div>
              
              {creator.bio && (
                <p className="text-muted-foreground mb-4">{creator.bio}</p>
              )}
              
              <div className="flex flex-wrap items-center gap-4">
                <ReliabilityScore creatorId={creator.id} />
                
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">1.2K followers</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">4.8 rating</span>
                </div>
              </div>
            </div>
            
            {!isOwnProfile && (
              <div className="flex flex-col space-y-2">
                <Button className="min-w-[120px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Session
                </Button>
                <Button variant="outline">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 w-full max-w-lg">
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="content">Latest Content</TabsTrigger>
          <TabsTrigger value="booking">Book Session</TabsTrigger>
          {isOwnProfile && <TabsTrigger value="settings">Call Settings</TabsTrigger>}
          {isOwnProfile && <TabsTrigger value="verification">Verification</TabsTrigger>}
        </TabsList>

        <TabsContent value="about" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>About {creator.full_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {creator.bio || 'No bio available yet.'}
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Availability</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Monday</span>
                      <span className="text-muted-foreground">9AM - 5PM</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tuesday</span>
                      <span className="text-muted-foreground">9AM - 5PM</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Weekend</span>
                      <span className="text-muted-foreground">Not available</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Session Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">30min Chat</p>
                        <p className="text-sm text-muted-foreground">Quick consultation</p>
                      </div>
                      <Badge variant="outline">$50</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">1hr Session</p>
                        <p className="text-sm text-muted-foreground">Deep dive conversation</p>
                      </div>
                      <Badge variant="outline">$120</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="content" className="mt-6">
          <CreatorContent creatorId={creator.id} />
        </TabsContent>

        <TabsContent value="booking" className="mt-6">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  Appointment booking interface will be available once creator setup is complete
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {isOwnProfile && (
          <TabsContent value="settings" className="mt-6">
            <CallSettings creatorId={creator.id} />
          </TabsContent>
        )}

        {isOwnProfile && (
          <TabsContent value="verification" className="mt-6">
            <SocialVerification />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}