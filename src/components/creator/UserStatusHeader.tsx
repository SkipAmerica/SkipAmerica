import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
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
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center space-x-4">
        {/* Quick Stats */}
        <div className="hidden md:flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-1">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="font-medium">${stats.totalEarnings}</span>
            <span className="text-muted-foreground">earned</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-medium">{stats.totalFans}</span>
            <span className="text-muted-foreground">fans</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-medium">{stats.callTime}h</span>
            <span className="text-muted-foreground">calls</span>
          </div>
        </div>
      </div>

      {/* User Profile & Status */}
      <div className="flex items-center space-x-4">
        {/* Status Toggle */}
        <Button
          variant={isLive ? "default" : "outline"}
          size="sm"
          onClick={handleStatusToggle}
          className={isLive ? "bg-gradient-primary hover:bg-gradient-secondary" : ""}
        >
          <Circle className={`mr-2 h-3 w-3 ${isLive ? 'fill-primary-foreground' : 'fill-muted-foreground'}`} />
          {isLive ? "LIVE" : "Offline"}
        </Button>

        {/* User Info */}
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium">
              {profile?.full_name || user?.email?.split('@')[0] || 'Creator'}
            </div>
            <div className="text-xs text-muted-foreground">
              {isLive ? "Available for calls" : "Offline"}
            </div>
          </div>
          
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
              <AvatarFallback>
                {profile?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {/* Online status indicator */}
            <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background ${
              isLive ? 'bg-green-500' : 'bg-gray-400'
            }`} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserStatusHeader;