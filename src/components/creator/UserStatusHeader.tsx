import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/providers/auth-provider";
import { useLive } from '@/hooks/live';

import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Users, Clock, Circle } from "lucide-react";

interface UserStats {
  totalEarnings: number;
  totalFans: number;
  callTime: number;
  onlineStatus: boolean;
}

interface UserStatusHeaderProps {
  className?: string;
}

const UserStatusHeader = ({ className }: UserStatusHeaderProps) => {
  const { user } = useAuth();
  const live = useLive();
  const { isLive, isDiscoverable, todayEarningsCents, todayCalls, sessionElapsed } = live || {};
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
    }
  }, [user?.id]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, bio, avatar_url, account_type, is_verified")
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

  // Update stats from live store in real-time
  useEffect(() => {
    const earningsDollars = (todayEarningsCents || 0) / 100;
    const callsToday = todayCalls || 0;
    const sessionMinutes = sessionElapsed ? (sessionElapsed / 60000).toFixed(1) : 0;
    
    setStats({
      totalEarnings: earningsDollars,
      totalFans: callsToday,
      callTime: Number(sessionMinutes),
      onlineStatus: isDiscoverable || false,
    });
  }, [todayEarningsCents, todayCalls, sessionElapsed, isDiscoverable]);

  return (
    <div className={`ios-status-bar ${className || ''}`}>
      <div className="flex items-center justify-between w-full px-4 py-3">
        {/* Left side - Stats */}
        <div className="flex items-center space-x-3">
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
            <div className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
              isDiscoverable 
                ? 'bg-green-500 text-white' 
                : 'bg-ios-tertiary text-ios-secondary'
            }`}>
              {isDiscoverable ? "Online" : "Offline"}
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
              isDiscoverable ? 'bg-green-500' : 'bg-ios-tertiary'
            }`} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserStatusHeader;