import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/lib/supabase';
import { Search, Filter, Star, MapPin, Clock, Zap, Heart, MessageCircle, Video } from 'lucide-react';
import { toast } from 'sonner';
import { useSearch } from '@/app/providers/search-provider';

interface Creator {
  id: string;
  full_name: string;
  bio?: string;
  avatar_url?: string;
  account_type: string;
  is_verified: boolean;
  category?: string;
  specialties?: string[];
  pricing?: {
    callRate: number;
    responseTime: string;
  };
  stats?: {
    rating: number;
    reviewCount: number;
    totalCalls: number;
    isOnline: boolean;
  };
  location?: string;
}

interface CreatorSearchProps {
  onCreatorSelect: (creator: Creator) => void;
  onStartCall?: (creator: Creator) => void;
}

const categories = [
  'All Categories',
  'Entertainment & Celebrity',
  'Business Leaders',
  'Creative & Art',
  'Sports & Athletics',
  'Technology',
  'Beauty & Fashion',
  'Health & Wellness',
  'Finance & Investment',
  'Education & Experts',
  'Social Media Influencers'
];

const sortOptions = [
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'response_time', label: 'Fastest Response' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'online', label: 'Online Now' }
];

export function CreatorSearch({ onCreatorSelect, onStartCall }: CreatorSearchProps) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [filteredCreators, setFilteredCreators] = useState<Creator[]>([]);
  const [priceRange, setPriceRange] = useState([0, 200]);
  const [sortBy, setSortBy] = useState('rating');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Use global search context
  const { filters, updateSelectedCategory } = useSearch();

  // Mock data representing diverse influential people
  const mockCreators: Creator[] = [
    {
      id: '1',
      full_name: 'Emma Stone',
      bio: 'Academy Award-winning actress. Available for career advice and entertainment industry insights.',
      avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b9e36b13?w=150',
      account_type: 'creator',
      is_verified: true,
      category: 'Entertainment & Celebrity',
      specialties: ['Acting', 'Career guidance', 'Hollywood insights'],
      pricing: { callRate: 500, responseTime: '< 24 hours' },
      stats: { rating: 4.9, reviewCount: 89, totalCalls: 156, isOnline: false },
      location: 'Los Angeles, CA'
    },
    {
      id: '2',
      full_name: 'Dr. Sarah Chen',
      bio: 'Leading AI researcher at Stanford. Expert in machine learning and artificial intelligence.',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      account_type: 'creator',
      is_verified: true,
      category: 'Technology',
      specialties: ['AI/ML', 'Research', 'Tech consulting'],
      pricing: { callRate: 200, responseTime: '< 4 hours' },
      stats: { rating: 4.95, reviewCount: 234, totalCalls: 890, isOnline: true },
      location: 'Palo Alto, CA'
    },
    {
      id: '3',
      full_name: 'Marcus Johnson',
      bio: 'Serial entrepreneur, founded 3 unicorn startups. Mentor for aspiring founders.',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      account_type: 'creator',
      is_verified: true,
      category: 'Business Leaders',
      specialties: ['Startups', 'Fundraising', 'Business strategy'],
      pricing: { callRate: 350, responseTime: '< 8 hours' },
      stats: { rating: 4.8, reviewCount: 167, totalCalls: 445, isOnline: true },
      location: 'San Francisco, CA'
    },
    {
      id: '4',
      full_name: 'Zoe Rodriguez',
      bio: 'Fashion influencer with 10M+ followers. Style consultant and brand collaborator.',
      avatar_url: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150',
      account_type: 'creator',
      is_verified: true,
      category: 'Beauty & Fashion',
      specialties: ['Fashion styling', 'Social media', 'Brand partnerships'],
      pricing: { callRate: 150, responseTime: '< 2 hours' },
      stats: { rating: 4.7, reviewCount: 892, totalCalls: 2340, isOnline: true },
      location: 'New York, NY'
    }
  ];

  useEffect(() => {
    loadCreators();
  }, []);

  useEffect(() => {
    filterCreators();
  }, [creators, filters.query, filters.selectedCategory, priceRange, sortBy]);

  const loadCreators = async () => {
    try {
      setLoading(true);
      // In real app, this would be a Supabase query
      // For now, using mock data
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      setCreators(mockCreators);
    } catch (error) {
      console.error('Error loading creators:', error);
      toast.error('Failed to load creators');
    } finally {
      setLoading(false);
    }
  };

  const filterCreators = () => {
    let filtered = [...creators];

    // Search filter
    if (filters.query) {
      filtered = filtered.filter(creator =>
        creator.full_name.toLowerCase().includes(filters.query.toLowerCase()) ||
        creator.bio?.toLowerCase().includes(filters.query.toLowerCase()) ||
        creator.specialties?.some(s => s.toLowerCase().includes(filters.query.toLowerCase()))
      );
    }

    // Category filter
    if (filters.selectedCategory !== 'All Categories' && filters.selectedCategory !== 'all') {
      filtered = filtered.filter(creator => creator.category === filters.selectedCategory);
    }

    // Price filter
    filtered = filtered.filter(creator => {
      const rate = creator.pricing?.callRate || 0;
      return rate >= priceRange[0] && rate <= priceRange[1];
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.stats?.rating || 0) - (a.stats?.rating || 0);
        case 'price_low':
          return (a.pricing?.callRate || 0) - (b.pricing?.callRate || 0);
        case 'price_high':
          return (b.pricing?.callRate || 0) - (a.pricing?.callRate || 0);
        case 'popular':
          return (b.stats?.totalCalls || 0) - (a.stats?.totalCalls || 0);
        case 'online':
          return (b.stats?.isOnline ? 1 : 0) - (a.stats?.isOnline ? 1 : 0);
        default:
          return 0;
      }
    });

    setFilteredCreators(filtered);
  };

  const toggleFavorite = (creatorId: string) => {
    setFavorites(prev => 
      prev.includes(creatorId) 
        ? prev.filter(id => id !== creatorId)
        : [...prev, creatorId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Found {filteredCreators.length} people
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{filteredCreators.filter(c => c.stats?.isOnline).length} online</Badge>
          <Badge variant="outline">{filteredCreators.filter(c => c.is_verified).length} verified</Badge>
        </div>
      </div>

      {/* Creator Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-muted rounded-full"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCreators.map((creator) => (
            <Card key={creator.id} className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={creator.avatar_url} />
                          <AvatarFallback>{creator.full_name[0]}</AvatarFallback>
                        </Avatar>
                        {creator.stats?.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{creator.full_name}</h3>
                          {creator.is_verified && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              ✓
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{creator.category}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(creator.id)}
                      className="p-1 h-8 w-8"
                    >
                      <Heart className={`h-4 w-4 ${favorites.includes(creator.id) ? 'fill-red-500 text-red-500' : ''}`} />
                    </Button>
                  </div>

                  {/* Bio */}
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {creator.bio}
                  </p>

                  {/* Specialties */}
                  <div className="flex flex-wrap gap-1">
                    {creator.specialties?.slice(0, 3).map((specialty) => (
                      <Badge key={specialty} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{creator.stats?.rating}</span>
                        <span className="text-muted-foreground">({creator.stats?.reviewCount})</span>
                      </div>
                      {creator.location && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="text-xs">{creator.location.split(',')[0]}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pricing & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">${creator.pricing?.callRate}</span>
                        <span className="text-sm text-muted-foreground">/session</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{creator.pricing?.responseTime}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCreatorSelect(creator)}
                        className="h-8 px-3"
                      >
                        <MessageCircle className="h-3 w-3 mr-1" />
                        Connect
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onStartCall?.(creator)}
                        disabled={!creator.stats?.isOnline}
                        className="h-8 px-3"
                      >
                        <Video className="h-3 w-3 mr-1" />
                        {creator.stats?.isOnline ? 'Call Now' : 'Schedule'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredCreators.length === 0 && !loading && (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <Search className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">No people found</h3>
              <p className="text-muted-foreground">Try adjusting your search filters</p>
            </div>
            <Button variant="outline" onClick={() => {
              updateSelectedCategory('all');
              setPriceRange([0, 200]);
            }}>
              Clear Filters
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}