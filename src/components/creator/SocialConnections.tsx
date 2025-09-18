import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/app/providers/auth-provider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Youtube, 
  Twitter, 
  Instagram, 
  Link2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Shield,
  TrendingUp,
  Users
} from "lucide-react";

interface SocialAccount {
  id: string;
  platform: string;
  platform_username: string;
  follower_count: number;
  verification_status: 'pending' | 'verified' | 'failed';
  created_at: string;
}

const SocialConnections = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadSocialAccounts();
    }
  }, [user?.id]);

  const loadSocialAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("user_id", user?.id);

      if (error) throw error;

      setAccounts(data || []);
    } catch (error) {
      console.error("Error loading social accounts:", error);
      toast({
        title: "Error loading social accounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const connectPlatform = async (platform: string) => {
    // This would integrate with OAuth flows for each platform
    toast({
      title: "Social media connection",
      description: `${platform} connection will be implemented with OAuth integration`,
    });
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return Youtube;
      case 'twitter':
        return Twitter;
      case 'instagram':
        return Instagram;
      default:
        return Link2;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Verified</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const platforms = [
    { name: 'YouTube', icon: Youtube, color: 'bg-red-500' },
    { name: 'Twitter', icon: Twitter, color: 'bg-blue-500' },
    { name: 'Instagram', icon: Instagram, color: 'bg-pink-500' },
    { name: 'TikTok', icon: Link2, color: 'bg-black' },
  ];

  if (loading) {
    return <div>Loading social connections...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Connected Accounts */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Connected Accounts
            </CardTitle>
            <CardDescription>
              Your verified social media accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accounts.map((account) => {
              const PlatformIcon = getPlatformIcon(account.platform);
              return (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <PlatformIcon className="h-6 w-6" />
                    <div>
                      <div className="font-medium">@{account.platform_username}</div>
                      <div className="text-sm text-muted-foreground flex items-center space-x-2">
                        <Users className="h-3 w-3" />
                        <span>{account.follower_count.toLocaleString()} followers</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(account.verification_status)}
                    {getStatusBadge(account.verification_status)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Available Platforms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Link2 className="mr-2 h-5 w-5" />
            Connect Social Media
          </CardTitle>
          <CardDescription>
            Connect your social media accounts for verification and market analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {platforms.map((platform) => {
              const isConnected = accounts.some(acc => 
                acc.platform.toLowerCase() === platform.name.toLowerCase()
              );
              const PlatformIcon = platform.icon;

              return (
                <Card key={platform.name} className="relative overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${platform.color}`}>
                          <PlatformIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="font-medium">{platform.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {isConnected ? 'Connected' : 'Not connected'}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant={isConnected ? "outline" : "default"}
                        size="sm"
                        onClick={() => connectPlatform(platform.name)}
                        disabled={isConnected}
                      >
                        {isConnected ? 'Connected' : 'Connect'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Benefits Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            Verification Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Market Analysis</h4>
              <p className="text-sm text-muted-foreground">
                AI-powered pricing recommendations based on your social metrics
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Trust & Safety</h4>
              <p className="text-sm text-muted-foreground">
                Verified badge increases fan confidence and booking rates
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Content Integration</h4>
              <p className="text-sm text-muted-foreground">
                Showcase your latest posts and content directly on your profile
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Performance Tracking</h4>
              <p className="text-sm text-muted-foreground">
                Track follower growth and engagement metrics over time
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialConnections;