import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Heart, 
  MessageCircle, 
  Share, 
  Eye,
  Youtube,
  Twitter,
  Instagram,
  ExternalLink,
  Video
} from 'lucide-react';
import { FeedToggle } from '@/components/feed/FeedToggle';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface FeedItem {
  id: string;
  platform_post_id: string;
  content_type: string;
  title: string;
  description: string;
  media_url?: string;
  thumbnail_url?: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  published_at: string;
  platform: string;
  creator_name: string;
  creator_avatar?: string;
}

const platformIcons = {
  youtube: Youtube,
  twitter: Twitter,
  instagram: Instagram
};

export default function Feed() {
  const { user } = useAuth();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatorPosts, setShowCreatorPosts] = useState(false);

  useEffect(() => {
    if (user) {
      loadFeedPreferences();
    }
  }, [user]);

  useEffect(() => {
    if (showCreatorPosts) {
      loadFeedItems();
    } else {
      setFeedItems([]);
    }
  }, [showCreatorPosts]);

  const loadFeedPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_feed_preferences')
        .select('show_creator_posts')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setShowCreatorPosts(data?.show_creator_posts || false);
    } catch (error) {
      console.error('Error loading feed preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeedItems = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('creator_content')
        .select(`
          *,
          social_accounts!inner(
            platform,
            profiles!inner(full_name, avatar_url)
          )
        `)
        .order('published_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const transformedItems = data?.map(item => ({
        ...item,
        platform: item.social_accounts.platform,
        creator_name: item.social_accounts.profiles.full_name,
        creator_avatar: item.social_accounts.profiles.avatar_url
      })) || [];

      setFeedItems(transformedItems);
    } catch (error) {
      console.error('Error loading feed items:', error);
      toast.error('Failed to load feed items');
    } finally {
      setLoading(false);
    }
  };

  const FeedItemCard = ({ item }: { item: FeedItem }) => {
    const Icon = platformIcons[item.platform as keyof typeof platformIcons];
    
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={item.creator_avatar} alt={item.creator_name} />
              <AvatarFallback>{item.creator_name.charAt(0)}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium">{item.creator_name}</span>
                <Badge variant="secondary" className="text-xs">
                  {Icon && <Icon className="h-3 w-3 mr-1" />}
                  {item.platform}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(item.published_at), 'MMM d, h:mm a')}
              </p>
            </div>
            
            <Button size="sm" variant="ghost">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {item.thumbnail_url && (
            <div className="relative mb-4 rounded-lg overflow-hidden">
              <img
                src={item.thumbnail_url}
                alt={item.title}
                className="w-full h-64 object-cover"
              />
              {item.content_type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black bg-opacity-50 rounded-full p-3">
                    <Youtube className="h-6 w-6 text-white" />
                  </div>
                </div>
              )}
            </div>
          )}
          
          <h3 className="font-semibold mb-2 line-clamp-2">{item.title}</h3>
          
          {item.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
              {item.description}
            </p>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              {item.view_count > 0 && (
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{item.view_count.toLocaleString()}</span>
                </div>
              )}
              {item.like_count > 0 && (
                <div className="flex items-center space-x-1">
                  <Heart className="h-4 w-4" />
                  <span>{item.like_count.toLocaleString()}</span>
                </div>
              )}
              {item.comment_count > 0 && (
                <div className="flex items-center space-x-1">
                  <MessageCircle className="h-4 w-4" />
                  <span>{item.comment_count.toLocaleString()}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="ghost">
                <Heart className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost">
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost">
                <Share className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="text-lg font-semibold">Feed</div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                Home
              </Button>
              <Button variant="ghost" onClick={() => window.location.href = '/profile'}>
                Profile
              </Button>
            </div>
          </div>
        </header>

        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading feed...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="text-lg font-semibold">Feed</div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Home
            </Button>
            <Button variant="ghost" onClick={() => window.location.href = '/profile'}>
              Profile
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Your Feed</h1>
          <p className="text-muted-foreground">
            Stay updated with your favorite creators
          </p>
        </div>

        <FeedToggle />
        
        {showCreatorPosts ? (
          feedItems.length > 0 ? (
            <div>
              {feedItems.map((item) => (
                <FeedItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <h3 className="text-lg font-medium mb-2">No content yet</h3>
                <p className="text-muted-foreground">
                  Creator posts will appear here when they're available
                </p>
              </CardContent>
            </Card>
          )
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-medium mb-2">Creator posts are hidden</h3>
              <p className="text-muted-foreground mb-4">
                Toggle "Show Creator Posts" above to see social media content from creators you follow
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}