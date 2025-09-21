import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { IOSNavBar } from "@/components/mobile/IOSNavBar";
import { IOSListView, IOSListSection, IOSListItem } from "@/components/mobile/IOSListView";
import { IOSActionSheet } from "@/components/mobile/IOSActionSheet";
import { IOSModal } from "@/components/mobile/IOSModal";
import { FileRepository } from "@/components/creator/FileRepository";
import { CallSettings } from "@/components/creator/CallSettings";
import ProfileSettings from "@/components/creator/ProfileSettings";
import SocialConnections from "@/components/creator/SocialConnections";
import AvailabilityManager from "@/components/creator/AvailabilityManager";
import { EarningsDashboard } from "./creator/EarningsDashboard";
import UserStatusHeader from "@/components/creator/UserStatusHeader";
import { EventCreator } from "@/components/events/EventCreator";
import { SponsorManager } from "@/components/ads/SponsorManager";
import { DynamicPricingEngine } from "@/components/pricing/DynamicPricingEngine";
import { CreatorPlaylists } from "@/components/curation/CreatorPlaylists";
import { ReferralSystem } from "@/components/referrals/ReferralSystem";
import { useAuth } from "@/app/providers/auth-provider";
import { useLive } from "@/app/providers/live-provider";
import { DollarSign, Users, Clock, Shield, Settings, FolderOpen, Sliders, User, Link2, Calendar, CalendarDays, Megaphone, Music, TrendingUp, ChevronRight, MoreHorizontal } from "lucide-react";

interface CreatorDashboardProps {
  onBack: () => void;
}

const CreatorDashboard = ({ onBack }: CreatorDashboardProps) => {
  const [pricePer5Min, setPricePer5Min] = useState("25.00");
  const [blockedWords, setBlockedWords] = useState("spam, inappropriate, rude");
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const { user } = useAuth();
  const { isLive } = useLive();

  const mainSections = [
    { id: 'dashboard', title: 'Dashboard', icon: DollarSign },
    { id: 'pricing', title: 'Smart Pricing', icon: Sliders },
    { id: 'profile', title: 'Profile', icon: User },
    { id: 'availability', title: 'Schedule', icon: Calendar },
  ];

  const moreSections = [
    { id: 'social', title: 'Social Links', icon: Link2 },
    { id: 'playlists', title: 'Playlists', icon: Music },
    { id: 'files', title: 'Files', icon: FolderOpen },
    { id: 'events', title: 'Events', icon: CalendarDays },
    { id: 'referrals', title: 'Referrals', icon: Users },
    { id: 'sponsors', title: 'Sponsors', icon: Megaphone },
    { id: 'analytics', title: 'Analytics', icon: TrendingUp },
    { id: 'settings', title: 'Settings', icon: Settings },
  ];

  return (
    <div className="ios-screen">
      <IOSNavBar
        title="Creator Hub"
        leftButton={{
          text: "Back",
          onClick: onBack
        }}
        rightButton={{
          icon: MoreHorizontal,
          onClick: () => setShowMoreSheet(true)
        }}
      />
      
      <UserStatusHeader />

      <div className="ios-content">
        {/* Main Section Navigation */}
        <IOSListView>
          <IOSListSection header="Creator Hub">
            {mainSections.map((section) => (
              <IOSListItem
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                chevron
              >
                <div className="flex items-center space-x-3">
                  <div className="ios-icon-container">
                    <section.icon className="h-5 w-5" />
                  </div>
                  <span>{section.title}</span>
                </div>
              </IOSListItem>
            ))}
          </IOSListSection>
        </IOSListView>

        {/* Content Sections */}
        {activeSection === 'dashboard' && (
          <div className="space-y-4">
            {/* Stats Section */}
            <IOSListView>
              <IOSListSection header="Stats Overview">
                <IOSListItem>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-3">
                      <div className="ios-icon-container bg-primary/10">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">This Month</div>
                        <div className="text-sm text-ios-secondary">Total earnings</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">$1,250</div>
                    </div>
                  </div>
                </IOSListItem>
                <IOSListItem>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-3">
                      <div className="ios-icon-container bg-primary/10">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">Call Time</div>
                        <div className="text-sm text-ios-secondary">Total this month</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">24.5h</div>
                    </div>
                  </div>
                </IOSListItem>
                <IOSListItem>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-3">
                      <div className="ios-icon-container bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">Total Fans</div>
                        <div className="text-sm text-ios-secondary">Active followers</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">156</div>
                    </div>
                  </div>
                </IOSListItem>
              </IOSListSection>
            </IOSListView>

            {/* Call Requests */}
            <IOSListView>
              <IOSListSection header="Pending Call Requests">
                {[
                  { name: "Sarah M.", duration: "15 min", amount: "$75", status: "waiting" },
                  { name: "Mike R.", duration: "30 min", amount: "$150", status: "waiting" },
                  { name: "Group Call (3)", duration: "20 min", amount: "$100", status: "waiting" }
                ].map((request, index) => (
                  <IOSListItem key={index}>
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-medium">{request.name}</div>
                        <div className="text-sm text-ios-secondary">
                          {request.duration} • {request.amount}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="ios-button-sm">
                          Decline
                        </Button>
                        <Button size="sm" className="ios-button-primary ios-button-sm">
                          Accept
                        </Button>
                      </div>
                    </div>
                  </IOSListItem>
                ))}
              </IOSListSection>
            </IOSListView>

            {/* Live Status */}
            <IOSListView>
              <IOSListSection header="Live Status">
                <IOSListItem>
                  <div className="text-center py-6">
                    {isLive ? (
                      <div>
                        <div className="w-16 h-16 bg-primary rounded-full mx-auto mb-4 flex items-center justify-center">
                          <div className="w-4 h-4 bg-primary-foreground rounded-full animate-pulse"></div>
                        </div>
                        <div className="font-semibold mb-2">You're Live!</div>
                        <div className="text-sm text-ios-secondary mb-4">
                          Accepting calls at ${pricePer5Min}/5min
                        </div>
                        <div className="text-sm text-ios-secondary">
                          Use the toggle in the header to go offline
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-semibold mb-2">Ready to Go Live?</div>
                        <div className="text-sm text-ios-secondary mb-4">
                          Start accepting video call requests
                        </div>
                        <div className="text-sm text-ios-secondary">
                          Use the toggle in the header to go live
                        </div>
                      </div>
                    )}
                  </div>
                </IOSListItem>
              </IOSListSection>
            </IOSListView>
          </div>
        )}

        {activeSection === 'pricing' && <DynamicPricingEngine />}
        {activeSection === 'profile' && <ProfileSettings />}
        {activeSection === 'availability' && <AvailabilityManager />}
        {activeSection === 'social' && <SocialConnections />}
        {activeSection === 'playlists' && <CreatorPlaylists />}
        {activeSection === 'files' && <FileRepository />}
        {activeSection === 'events' && <EventCreator />}
        {activeSection === 'referrals' && <ReferralSystem />}
        {activeSection === 'sponsors' && <SponsorManager />}
        {activeSection === 'analytics' && <EarningsDashboard />}
        
        {activeSection === 'settings' && (
          <IOSListView>
            <IOSListSection header="Content Moderation">
              <IOSListItem>
                <div className="space-y-3 w-full">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <span className="font-medium">Blocked Words</span>
                    </div>
                    <Textarea
                      value={blockedWords}
                      onChange={(e) => setBlockedWords(e.target.value)}
                      placeholder="Enter words to block (comma separated)..."
                      className="ios-textarea"
                      rows={3}
                    />
                  </div>
                  <div className="ios-info-box">
                    <p className="text-xs text-ios-secondary">
                      When blocked words are detected, the chat will be paused and you'll be notified.
                    </p>
                  </div>
                </div>
              </IOSListItem>
            </IOSListSection>
          </IOSListView>
        )}
      </div>

      {/* More Sections Action Sheet */}
      <IOSActionSheet
        open={showMoreSheet}
        onOpenChange={setShowMoreSheet}
        title="More Options"
      >
        <div className="space-y-1">
          {moreSections.map((section) => (
            <IOSListItem
              key={section.id}
              onClick={() => {
                setActiveSection(section.id);
                setShowMoreSheet(false);
              }}
            >
              <div className="flex items-center space-x-3">
                <div className="ios-icon-container">
                  <section.icon className="h-5 w-5" />
                </div>
                <span>{section.title}</span>
              </div>
            </IOSListItem>
          ))}
        </div>
      </IOSActionSheet>
    </div>
  );
};

export default CreatorDashboard;