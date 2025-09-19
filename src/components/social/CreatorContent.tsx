import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Heart, 
  MessageCircle, 
  Eye, 
  ExternalLink,
  Youtube,
  Twitter,
  Instagram
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/app/providers/auth-provider';

interface CreatorContentItem {
  id: string;
  platform_post_id: string;
  content_type: string;
  title: string;
  description: string;
  media_url: string;
  thumbnail_url: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  published_at: string;
  platform: string;
  platform_username: string;
}

interface CreatorContentProps {
  creatorId: string;
  showOnFeed?: boolean;
}

const platformIcons = {
  youtube: Youtube,
  twitter: Twitter,
  instagram: Instagram
};

export function CreatorContent({ creatorId, showOnFeed = false }: CreatorContentProps) {
  const { user } = useAuth();
  const [content, setContent] = useState<CreatorContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');

  useEffect(() => {
    loadCreatorContent();
  }, [creatorId]);

  const loadCreatorContent = async () => {
    try {
      setLoading(true);
      
      // Only authenticated users can access social accounts data now
      if (!user) {
        setContent([]);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('creator_content')
        .select(`
          *,
          social_accounts!inner(platform, platform_username, user_id)
        `)
        .eq('social_accounts.user_id', creatorId)
        .order('published_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const transformedContent = data?.map(item => ({
        ...item,
        platform: item.social_accounts.platform,
        platform_username: item.social_accounts.platform_username
      })) || [];

      setContent(transformedContent);
    } catch (error) {
      console.error('Error loading creator content:', error);
      toast.error('Failed to load creator content');
    } finally {
      setLoading(false);
    }
  };

  const filteredContent = selectedPlatform === 'all' 
    ? content 
    : content.filter(item => item.platform === selectedPlatform);

  const platforms = [...new Set(content.map(item => item.platform))];

  const ContentCard = ({ item }: { item: CreatorContentItem }) => {
    const Icon = platformIcons[item.platform as keyof typeof platformIcons];
    
    return (
      <Card className="overflow-hidden">
        <div className="relative">
          {item.thumbnail_url && (
            <img
              src={item.thumbnail_url}
              alt={item.title}
              className="w-full h-48 object-cover"
            />
          )}
          {item.content_type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black bg-opacity-50 rounded-full p-4">
                <Play className="h-8 w-8 text-white" />
              </div>
            </div>
          )}
        </div>
        
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="secondary" className="text-xs">
              {Icon && <Icon className="h-3 w-3 mr-1" />}
              {item.platform}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {format(new Date(item.published_at), 'MMM d, yyyy')}
            </span>
          </div>
          
          <h3 className="font-medium text-sm mb-2 line-clamp-2">
            {item.title}
          </h3>
          
          {item.description && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
              {item.description}
            </p>
          )}
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-4">
              {item.view_count > 0 && (
                <div className="flex items-center space-x-1">
                  <Eye className="h-3 w-3" />
                  <span>{item.view_count.toLocaleString()}</span>
                </div>
              )}
              {item.like_count > 0 && (
                <div className="flex items-center space-x-1">
                  <Heart className="h-3 w-3" />
                  <span>{item.like_count.toLocaleString()}</span>
                </div>
              )}
              {item.comment_count > 0 && (
                <div className="flex items-center space-x-1">
                  <MessageCircle className="h-3 w-3" />
                  <span>{item.comment_count.toLocaleString()}</span>
                </div>
              )}
            </div>
            
            <Button size="sm" variant="ghost" className="h-6 px-2">
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <div className="p-6">Loading creator content...</div>;
  }

  if (content.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          {!user ? (
            <p className="text-muted-foreground">Sign in to view creator content</p>
          ) : (
            <p className="text-muted-foreground">No content available</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Latest Content</h3>
        <div className="flex items-center space-x-2">
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="all">All Platforms</option>
            {platforms.map(platform => (
              <option key={platform} value={platform} className="capitalize">
                {platform}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContent.map((item) => (
          <ContentCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}