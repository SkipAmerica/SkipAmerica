import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface FeedPreferences {
  show_creator_posts: boolean;
  followed_creators: string[];
}

export function FeedToggle() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<FeedPreferences>({
    show_creator_posts: false,
    followed_creators: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFeedPreferences();
    }
  }, [user]);

  const loadFeedPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_feed_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          show_creator_posts: data.show_creator_posts,
          followed_creators: data.followed_creators || []
        });
      } else {
        // Create default preferences
        const { error: insertError } = await supabase
          .from('user_feed_preferences')
          .insert({
            user_id: user?.id,
            show_creator_posts: false,
            followed_creators: []
          });

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error loading feed preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateShowCreatorPosts = async (showPosts: boolean) => {
    try {
      const { error } = await supabase
        .from('user_feed_preferences')
        .upsert({
          user_id: user?.id,
          show_creator_posts: showPosts,
          followed_creators: preferences.followed_creators
        });

      if (error) throw error;

      setPreferences(prev => ({ ...prev, show_creator_posts: showPosts }));
      toast.success(
        showPosts 
          ? 'Creator posts will now appear in your feed' 
          : 'Creator posts hidden from your feed'
      );
    } catch (error) {
      console.error('Error updating feed preferences:', error);
      toast.error('Failed to update feed preferences');
    }
  };

  if (loading || !user) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {preferences.show_creator_posts ? (
                <Eye className="h-4 w-4 text-primary" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-medium text-sm">Show Creator Posts</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              <Settings className="h-3 w-3 mr-1" />
              Feed Settings
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">
              {preferences.show_creator_posts ? 'Visible' : 'Hidden'}
            </span>
            <Switch
              checked={preferences.show_creator_posts}
              onCheckedChange={updateShowCreatorPosts}
            />
          </div>
        </div>
        
        {preferences.show_creator_posts && (
          <p className="text-xs text-muted-foreground mt-2">
            Creator social media posts are now visible in your main feed
          </p>
        )}
      </CardContent>
    </Card>
  );
}