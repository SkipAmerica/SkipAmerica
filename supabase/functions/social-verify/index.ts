import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Platform configurations
const PLATFORMS = {
  youtube: {
    clientId: Deno.env.get('YOUTUBE_CLIENT_ID'),
    clientSecret: Deno.env.get('YOUTUBE_CLIENT_SECRET'),
    scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    apiUrl: 'https://www.googleapis.com/youtube/v3'
  },
  twitter: {
    clientId: Deno.env.get('TWITTER_CLIENT_ID'),
    clientSecret: Deno.env.get('TWITTER_CLIENT_SECRET'),
    scopes: ['tweet.read', 'users.read', 'follows.read'],
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    apiUrl: 'https://api.twitter.com/2'
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { platform, action, accountId, code, state } = await req.json();
    console.log(`Social verify request: ${action} for ${platform}`);

    switch (action) {
      case 'connect':
        return await handleConnect(platform);
      
      case 'callback':
        return await handleCallback(platform, code, state, supabase);
      
      case 'refresh':
        return await handleRefresh(accountId, platform, supabase);
      
      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in social-verify function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleConnect(platform: string) {
  const config = PLATFORMS[platform as keyof typeof PLATFORMS];
  if (!config) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/social-verify`;
  const state = `${platform}_${Date.now()}`;
  
  const params = new URLSearchParams({
    client_id: config.clientId!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state: state,
    access_type: 'offline'
  });

  const authUrl = `${config.authUrl}?${params.toString()}`;
  
  return new Response(
    JSON.stringify({ authUrl }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleCallback(platform: string, code: string, state: string, supabase: any) {
  const config = PLATFORMS[platform as keyof typeof PLATFORMS];
  if (!config) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  // Exchange code for access token
  const tokenResponse = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId!,
      client_secret: config.clientSecret!,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/social-verify`
    })
  });

  const tokenData = await tokenResponse.json();
  console.log('Token exchange response:', tokenData);

  if (!tokenData.access_token) {
    throw new Error('Failed to get access token');
  }

  // Get user data from platform
  let userData;
  if (platform === 'youtube') {
    userData = await getYouTubeData(tokenData.access_token);
  } else if (platform === 'twitter') {
    userData = await getTwitterData(tokenData.access_token);
  }

  // Store in database
  const { error } = await supabase
    .from('social_accounts')
    .upsert({
      user_id: extractUserIdFromState(state), // You'll need to implement this
      platform: platform,
      platform_user_id: userData.id,
      platform_username: userData.username,
      follower_count: userData.followerCount,
      account_created_at: userData.createdAt,
      verification_status: 'verified',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      metadata: userData.metadata
    });

  if (error) throw error;

  // Fetch recent content
  if (platform === 'youtube') {
    await fetchYouTubeContent(userData.id, tokenData.access_token, supabase);
  } else if (platform === 'twitter') {
    await fetchTwitterContent(userData.id, tokenData.access_token, supabase);
  }

  return new Response(
    JSON.stringify({ success: true, userData }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleRefresh(accountId: string, platform: string, supabase: any) {
  // Get stored account
  const { data: account, error } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (error || !account) {
    throw new Error('Account not found');
  }

  // Refresh data based on platform
  if (platform === 'youtube') {
    const userData = await getYouTubeData(account.access_token);
    await fetchYouTubeContent(account.platform_user_id, account.access_token, supabase);
    
    // Update account data
    await supabase
      .from('social_accounts')
      .update({
        follower_count: userData.followerCount,
        metadata: userData.metadata
      })
      .eq('id', accountId);
  } else if (platform === 'twitter') {
    const userData = await getTwitterData(account.access_token);
    await fetchTwitterContent(account.platform_user_id, account.access_token, supabase);
    
    await supabase
      .from('social_accounts')
      .update({
        follower_count: userData.followerCount,
        metadata: userData.metadata
      })
      .eq('id', accountId);
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getYouTubeData(accessToken: string) {
  // Get channel info
  const channelResponse = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    }
  );

  const channelData = await channelResponse.json();
  const channel = channelData.items?.[0];
  
  if (!channel) {
    throw new Error('No YouTube channel found');
  }

  return {
    id: channel.id,
    username: channel.snippet.customUrl || channel.snippet.title,
    followerCount: parseInt(channel.statistics.subscriberCount || '0'),
    createdAt: channel.snippet.publishedAt,
    metadata: {
      title: channel.snippet.title,
      description: channel.snippet.description,
      viewCount: channel.statistics.viewCount,
      videoCount: channel.statistics.videoCount,
      thumbnails: channel.snippet.thumbnails
    }
  };
}

async function getTwitterData(accessToken: string) {
  const userResponse = await fetch(
    'https://api.twitter.com/2/users/me?user.fields=created_at,description,public_metrics,profile_image_url',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    }
  );

  const userData = await userResponse.json();
  const user = userData.data;
  
  if (!user) {
    throw new Error('No Twitter user found');
  }

  return {
    id: user.id,
    username: user.username,
    followerCount: user.public_metrics?.followers_count || 0,
    createdAt: user.created_at,
    metadata: {
      name: user.name,
      description: user.description,
      profileImageUrl: user.profile_image_url,
      publicMetrics: user.public_metrics
    }
  };
}

async function fetchYouTubeContent(channelId: string, accessToken: string, supabase: any) {
  try {
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=10&order=date&type=video`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      }
    );

    const videosData = await videosResponse.json();
    
    for (const video of videosData.items || []) {
      await supabase
        .from('creator_content')
        .upsert({
          social_account_id: channelId, // You'll need to get the proper social_account_id
          platform_post_id: video.id.videoId,
          content_type: 'video',
          title: video.snippet.title,
          description: video.snippet.description,
          thumbnail_url: video.snippet.thumbnails?.medium?.url,
          published_at: video.snippet.publishedAt,
          metadata: video
        });
    }
  } catch (error) {
    console.error('Error fetching YouTube content:', error);
  }
}

async function fetchTwitterContent(userId: string, accessToken: string, supabase: any) {
  try {
    const tweetsResponse = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?max_results=10&tweet.fields=created_at,public_metrics,attachments`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      }
    );

    const tweetsData = await tweetsResponse.json();
    
    for (const tweet of tweetsData.data || []) {
      await supabase
        .from('creator_content')
        .upsert({
          social_account_id: userId, // You'll need to get the proper social_account_id
          platform_post_id: tweet.id,
          content_type: 'post',
          title: tweet.text.substring(0, 100),
          description: tweet.text,
          like_count: tweet.public_metrics?.like_count || 0,
          comment_count: tweet.public_metrics?.reply_count || 0,
          view_count: tweet.public_metrics?.impression_count || 0,
          published_at: tweet.created_at,
          metadata: tweet
        });
    }
  } catch (error) {
    console.error('Error fetching Twitter content:', error);
  }
}

function extractUserIdFromState(state: string): string {
  // This is a placeholder - you'll need to implement proper state management
  // that includes the user ID in the OAuth state parameter
  return 'placeholder-user-id';
}