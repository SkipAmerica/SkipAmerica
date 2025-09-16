import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Youtube, 
  Twitter, 
  Instagram, 
  Linkedin, 
  CheckCircle, 
  Clock, 
  X,
  ExternalLink,
  Users,
  Calendar
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SocialAccount {
  id: string;
  platform: string;
  platform_username: string;
  follower_count: number;
  account_created_at: string;
  verification_status: string;
  metadata: any;
}

const platformIcons = {
  youtube: Youtube,
  twitter: Twitter,
  instagram: Instagram,
  linkedin: Linkedin,
  tiktok: Users
};

const platformColors = {
  youtube: 'bg-red-500',
  twitter: 'bg-blue-500',
  instagram: 'bg-gradient-to-r from-pink-500 to-yellow-500',
  linkedin: 'bg-blue-600',
  tiktok: 'bg-black'
};

export function SocialVerification() {
  const { user } = useAuth();
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadSocialAccounts();
    }
  }, [user]);

  const loadSocialAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSocialAccounts(data || []);
    } catch (error) {
      console.error('Error loading social accounts:', error);
      toast.error('Failed to load social accounts');
    } finally {
      setLoading(false);
    }
  };

  const connectPlatform = async (platform: string) => {
    setVerifying(platform);
    
    try {
      // Call edge function to initiate OAuth flow
      const { data, error } = await supabase.functions.invoke('social-verify', {
        body: { platform, action: 'connect' }
      });

      if (error) throw error;

      if (data.authUrl) {
        // Open OAuth popup
        const popup = window.open(data.authUrl, 'social-auth', 'width=600,height=600');
        
        // Listen for OAuth completion
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            setVerifying(null);
            loadSocialAccounts(); // Refresh accounts
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error connecting platform:', error);
      toast.error(`Failed to connect ${platform}`);
      setVerifying(null);
    }
  };

  const refreshAccount = async (accountId: string, platform: string) => {
    try {
      const { error } = await supabase.functions.invoke('social-verify', {
        body: { 
          action: 'refresh',
          accountId,
          platform
        }
      });

      if (error) throw error;
      
      toast.success('Account data refreshed');
      loadSocialAccounts();
    } catch (error) {
      console.error('Error refreshing account:', error);
      toast.error('Failed to refresh account data');
    }
  };

  const disconnectAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('social_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
      
      toast.success('Account disconnected');
      loadSocialAccounts();
    } catch (error) {
      console.error('Error disconnecting account:', error);
      toast.error('Failed to disconnect account');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed': return <X className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      verified: 'bg-green-500',
      pending: 'bg-yellow-500',
      failed: 'bg-red-500'
    };
    
    return (
      <Badge className={`${variants[status as keyof typeof variants]} text-white`}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  const platforms = ['youtube', 'twitter', 'instagram', 'linkedin', 'tiktok'];
  const connectedPlatforms = socialAccounts.map(acc => acc.platform);
  const availablePlatforms = platforms.filter(p => !connectedPlatforms.includes(p));

  if (loading) {
    return <div className="p-6">Loading social accounts...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Social Media Verification</h2>
        <p className="text-muted-foreground">
          Connect your social media accounts to verify your identity and showcase your content
        </p>
      </div>

      <Tabs defaultValue="connected" className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="connected">Connected Accounts ({socialAccounts.length})</TabsTrigger>
          <TabsTrigger value="available">Available Platforms ({availablePlatforms.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="connected" className="mt-6">
          {socialAccounts.length > 0 ? (
            <div className="grid gap-4">
              {socialAccounts.map((account) => {
                const Icon = platformIcons[account.platform as keyof typeof platformIcons];
                const colorClass = platformColors[account.platform as keyof typeof platformColors];
                
                return (
                  <Card key={account.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`p-3 rounded-full ${colorClass}`}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold capitalize">
                              {account.platform}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              @{account.platform_username}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          {getStatusBadge(account.verification_status)}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{account.follower_count.toLocaleString()} followers</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Since {format(new Date(account.account_created_at), 'MMM yyyy')}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => refreshAccount(account.id, account.platform)}
                        >
                          Refresh Data
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => disconnectAccount(account.id)}
                        >
                          Disconnect
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`https://${account.platform}.com/${account.platform_username}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No social accounts connected yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="available" className="mt-6">
          <div className="grid gap-4">
            {availablePlatforms.map((platform) => {
              const Icon = platformIcons[platform as keyof typeof platformIcons];
              const colorClass = platformColors[platform as keyof typeof platformColors];
              
              return (
                <Card key={platform}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-full ${colorClass}`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold capitalize">{platform}</h3>
                          <p className="text-sm text-muted-foreground">
                            Connect your {platform} account to verify your identity
                          </p>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => connectPlatform(platform)}
                        disabled={verifying === platform}
                      >
                        {verifying === platform ? 'Connecting...' : 'Connect'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}