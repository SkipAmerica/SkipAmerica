import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { IOSListView, IOSListSection, IOSListItem } from '@/components/mobile/IOSListView';
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
  const [activeSection, setActiveSection] = useState('about');

  const getSocialPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube': return Youtube;
      case 'twitter': return Twitter;
      case 'instagram': return Instagram;
      default: return ExternalLink;
    }
  };

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <IOSListView>
        <IOSListSection>
          <IOSListItem>
            <div className="flex items-center space-x-4 py-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={creator.avatar_url} alt={creator.full_name} />
                <AvatarFallback className="text-lg">
                  {creator.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-xl font-bold">{creator.full_name}</h1>
                  {creator.is_verified && (
                    <Badge className="bg-primary text-primary-foreground text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 mb-2">
                  {creator.account_type === 'creator' && (
                    <Badge variant="secondary" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      Creator
                    </Badge>
                  )}
                  <Badge className="bg-gradient-primary text-primary-foreground text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Market Rate
                  </Badge>
                </div>
                
                {creator.bio && (
                  <p className="text-sm text-ios-secondary line-clamp-2">{creator.bio}</p>
                )}
              </div>
            </div>
          </IOSListItem>
        </IOSListSection>
      </IOSListView>

      {/* Stats */}
      <IOSListView>
        <IOSListSection header="Stats">
          <IOSListItem>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-ios-secondary" />
                <span className="text-sm">Followers</span>
              </div>
              <span className="font-medium">1.2K</span>
            </div>
          </IOSListItem>
          <IOSListItem>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">Rating</span>
              </div>
              <span className="font-medium">4.8</span>
            </div>
          </IOSListItem>
        </IOSListSection>
      </IOSListView>

      {/* Actions */}
      {!isOwnProfile && (
        <IOSListView>
          <IOSListSection>
            <IOSListItem>
              <Button className="ios-button-primary w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Book Session
              </Button>
            </IOSListItem>
            <IOSListItem>
              <Button variant="outline" className="ios-button w-full">
                <MessageCircle className="h-4 w-4 mr-2" />
                Message
              </Button>
            </IOSListItem>
          </IOSListSection>
        </IOSListView>
      )}

      {/* Section Navigation */}
      <IOSListView>
        <IOSListSection header="Profile Sections">
          <IOSListItem 
            onClick={() => setActiveSection('about')}
            chevron
          >
            <span>About</span>
          </IOSListItem>
          <IOSListItem 
            onClick={() => setActiveSection('content')}
            chevron
          >
            <span>Latest Content</span>
          </IOSListItem>
          <IOSListItem 
            onClick={() => setActiveSection('booking')}
            chevron
          >
            <span>Book Session</span>
          </IOSListItem>
          {isOwnProfile && (
            <>
              <IOSListItem 
                onClick={() => setActiveSection('settings')}
                chevron
              >
                <span>Call Settings</span>
              </IOSListItem>
              <IOSListItem 
                onClick={() => setActiveSection('verification')}
                chevron
              >
                <span>Verification</span>
              </IOSListItem>
            </>
          )}
        </IOSListSection>
      </IOSListView>

      {/* Content Sections */}
      {activeSection === 'about' && (
        <IOSListView>
          <IOSListSection header="About">
            <IOSListItem>
              <div className="py-3">
                <p className="text-ios-secondary">
                  {creator.bio || 'No bio available yet.'}
                </p>
              </div>
            </IOSListItem>
          </IOSListSection>
          
          <IOSListSection header="Availability">
            <IOSListItem>
              <div className="flex justify-between w-full">
                <span>Monday</span>
                <span className="text-ios-secondary">9AM - 5PM</span>
              </div>
            </IOSListItem>
            <IOSListItem>
              <div className="flex justify-between w-full">
                <span>Tuesday</span>
                <span className="text-ios-secondary">9AM - 5PM</span>
              </div>
            </IOSListItem>
            <IOSListItem>
              <div className="flex justify-between w-full">
                <span>Weekend</span>
                <span className="text-ios-secondary">Not available</span>
              </div>
            </IOSListItem>
          </IOSListSection>
          
          <IOSListSection header="Session Types">
            <IOSListItem>
              <div className="flex justify-between items-center w-full">
                <div>
                  <div className="font-medium">30min Chat</div>
                  <div className="text-sm text-ios-secondary">Quick consultation</div>
                </div>
                <Badge variant="outline">$50</Badge>
              </div>
            </IOSListItem>
            <IOSListItem>
              <div className="flex justify-between items-center w-full">
                <div>
                  <div className="font-medium">1hr Session</div>
                  <div className="text-sm text-ios-secondary">Deep dive conversation</div>
                </div>
                <Badge variant="outline">$120</Badge>
              </div>
            </IOSListItem>
          </IOSListSection>
        </IOSListView>
      )}

      {activeSection === 'content' && <CreatorContent creatorId={creator.id} />}
      
      {activeSection === 'booking' && (
        <IOSListView>
          <IOSListSection>
            <IOSListItem>
              <div className="text-center py-8">
                <p className="text-ios-secondary">
                  Appointment booking interface will be available once creator setup is complete
                </p>
              </div>
            </IOSListItem>
          </IOSListSection>
        </IOSListView>
      )}

      {isOwnProfile && activeSection === 'settings' && <CallSettings creatorId={creator.id} />}
      {isOwnProfile && activeSection === 'verification' && <SocialVerification />}
    </div>
  );
}