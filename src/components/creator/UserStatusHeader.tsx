import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/providers/auth-provider";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Users, Clock, Circle } from "lucide-react";

interface UserStats {
  totalEarnings: number;
  totalFans: number;
  callTime: number;
  onlineStatus: boolean;
}

interface UserStatusHeaderProps {
  onStatusToggle: (status: boolean) => void;
  isLive: boolean;
}

const UserStatusHeader = ({ onStatusToggle, isLive }: UserStatusHeaderProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<UserStats>({
    totalEarnings: 0,
    totalFans: 0,
    callTime: 0,
    onlineStatus: false,
  });

  useEffect(() => {
    if (user?.id) {
      loadProfile();
      loadStats();
    }
  }, [user?.id]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setProfile(data);
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const loadStats = async () => {
    try {
      // This would normally load real stats from the database
      // For now, using mock data
      setStats({
        totalEarnings: 1250,
        totalFans: 156,
        callTime: 24.5,
        onlineStatus: isLive,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  useEffect(() => {
    setStats(prev => ({ ...prev, onlineStatus: isLive }));
  }, [isLive]);

  const handleStatusToggle = () => {
    const newStatus = !isLive;
    onStatusToggle(newStatus);
  };

  return (
    <div className="ios-status-bar">
      <div className="flex items-center justify-between w-full px-4 py-3">
        {/* Left side - Status and Stats */}
        <div className="flex items-center space-x-3">
          <Button
            variant={isLive ? "default" : "outline"}
            size="sm"
            onClick={handleStatusToggle}
            className={`ios-status-toggle ${isLive ? "ios-live-button" : "ios-offline-button"}`}
          >
            <Circle className={`mr-2 h-3 w-3 ${isLive ? 'fill-current' : ''}`} />
            {isLive ? "LIVE" : "Offline"}
          </Button>
          
          {/* Condensed Stats for mobile */}
          <div className="flex items-center space-x-4 text-xs text-ios-secondary">
            <div className="flex items-center space-x-1">
              <DollarSign className="h-3 w-3" />
              <span>${stats.totalEarnings}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{stats.totalFans}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{stats.callTime}h</span>
            </div>
          </div>
        </div>

        {/* Right side - User Profile */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className="text-sm font-medium">
              {profile?.full_name || user?.email?.split('@')[0] || 'Creator'}
            </div>
            <div className="text-xs text-ios-secondary">
              {isLive ? "Available" : "Offline"}
            </div>
          </div>
          
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
              <AvatarFallback className="text-xs">
                {profile?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
              isLive ? 'bg-green-500' : 'bg-ios-tertiary'
            }`} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserStatusHeader;