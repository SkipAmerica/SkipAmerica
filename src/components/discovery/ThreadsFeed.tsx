import { useState, useEffect } from 'react'
import { PostCard } from './PostCard'
import { LoadingSpinner } from '@/shared/ui/loading-spinner'

interface ThreadPost {
  id: string
  title?: string
  description?: string
  content_type: string
  media_url?: string
  thumbnail_url?: string
  view_count: number
  like_count: number
  comment_count: number
  published_at?: string
  created_at: string
  creator: {
    id: string
    full_name: string
    avatar_url?: string
    username?: string
  }
  platform?: string
}

// Mock data that matches the Threads UI from the reference image
const mockThreadsPosts: ThreadPost[] = [
  {
    id: '1',
    description: 'lol my boy was talkin that big shit on the first video like he just had the keys to the kingdom',
    content_type: 'video',
    media_url: 'https://example.com/video1.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=300&fit=crop',
    view_count: 1100,
    like_count: 2100,
    comment_count: 649,
    published_at: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(), // 15h ago
    created_at: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
    creator: {
      id: 'kaion-wesley',
      full_name: 'Kaion Wesley',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      username: 'kaionwesley'
    },
    platform: 'threads'
  },
  {
    id: '2',
    title: 'Jimmy Kimmel pulled off of ABC indefinitely. Disney loses 3.87 billion dollars',
    description: 'Insiders caution that no agreement is in sight but discussions continue as Kimmel weighs concerns about staff job losses if show ends',
    content_type: 'text',
    thumbnail_url: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&h=300&fit=crop',
    view_count: 850,
    like_count: 1200,
    comment_count: 335,
    published_at: new Date(Date.now() - 48 * 60 * 1000).toISOString(), // 48m ago
    created_at: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
    creator: {
      id: 'eutopus-viral',
      full_name: 'Eutopus Viral',
      avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      username: 'eutopus.viral'
    },
    platform: 'threads'
  },
  {
    id: '3',
    description: 'Just finished my morning workout routine! 💪 Starting the day with some high-intensity cardio and strength training. Remember, consistency is key!',
    content_type: 'image',
    media_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
    thumbnail_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
    view_count: 420,
    like_count: 892,
    comment_count: 156,
    published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    creator: {
      id: 'sarah-johnson',
      full_name: 'Sarah Johnson',
      avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      username: 'sarahjohnson'
    },
    platform: 'threads'
  },
  {
    id: '4',
    title: 'Latest iPhone 15 Pro Max Review',
    description: 'After using it for 2 weeks, here are my thoughts on Apple\'s latest flagship. The camera improvements are actually significant this time.',
    content_type: 'video',
    media_url: 'https://example.com/iphone_review.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=300&fit=crop',
    view_count: 2800,
    like_count: 1456,
    comment_count: 287,
    published_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6h ago
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    creator: {
      id: 'mike-chen',
      full_name: 'Mike Chen',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      username: 'mikechen'
    },
    platform: 'threads'
  },
  {
    id: '5',
    description: 'Tried making homemade pasta for the first time and it was actually easier than I thought! The key is getting the dough texture just right. Recipe in comments 👇',
    content_type: 'image',
    media_url: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&h=300&fit=crop',
    thumbnail_url: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&h=300&fit=crop',
    view_count: 680,
    like_count: 1123,
    comment_count: 98,
    published_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4h ago
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    creator: {
      id: 'emma-rodriguez',
      full_name: 'Emma Rodriguez',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
      username: 'emmaRodriguez'
    },
    platform: 'threads'
  },
  {
    id: '6',
    description: 'When you realize you\'ve been pronouncing "gif" wrong your entire life 😅',
    content_type: 'text',
    view_count: 1500,
    like_count: 3200,
    comment_count: 890,
    published_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1d ago
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    creator: {
      id: 'kaion-wesley',
      full_name: 'Kaion Wesley',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      username: 'kaionwesley'
    },
    platform: 'threads'
  }
]

export function ThreadsFeed() {
  const [posts, setPosts] = useState<ThreadPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setPosts(mockThreadsPosts)
      setLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="w-full pt-28">
      {posts.map((post, index) => (
        <PostCard 
          key={post.id} 
          post={post} 
          isLast={index === posts.length - 1}
        />
      ))}
    </div>
  )
}