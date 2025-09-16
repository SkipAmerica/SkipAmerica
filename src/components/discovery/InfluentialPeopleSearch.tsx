import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/lib/supabase';
import { Search, Filter, Star, MapPin, Clock, Zap, Heart, MessageCircle, Video, Crown, Briefcase, Palette } from 'lucide-react';
import { toast } from 'sonner';

interface InfluentialPerson {
  id: string;
  full_name: string;
  bio?: string;
  avatar_url?: string;
  account_type: string;
  is_verified: boolean;
  category?: string;
  specialties?: string[];
  influence_type?: 'celebrity' | 'expert' | 'entrepreneur' | 'influencer' | 'creator';
  pricing?: {
    callRate: number;
    responseTime: string;
  };
  stats?: {
    rating: number;
    reviewCount: number;
    totalCalls: number;
    isOnline: boolean;
    followerCount?: number;
  };
  location?: string;
}

interface InfluentialPeopleSearchProps {
  onPersonSelect: (person: InfluentialPerson) => void;
  onStartCall?: (person: InfluentialPerson) => void;
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

const influenceTypes = [
  'All Types',
  'Celebrity',
  'Expert', 
  'Entrepreneur',
  'Influencer',
  'Creator'
];

const sortOptions = [
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'response_time', label: 'Fastest Response' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'followers', label: 'Most Followers' },
  { value: 'online', label: 'Online Now' }
];

const getInfluenceIcon = (type?: string) => {
  switch (type) {
    case 'celebrity': return Crown;
    case 'expert': return Star;
    case 'entrepreneur': return Briefcase;
    case 'influencer': return Zap;
    case 'creator': return Palette;
    default: return Star;
  }
};

export function InfluentialPeopleSearch({ onPersonSelect, onStartCall }: InfluentialPeopleSearchProps) {
  const [people, setPeople] = useState<InfluentialPerson[]>([]);
  const [filteredPeople, setFilteredPeople] = useState<InfluentialPerson[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedInfluenceType, setSelectedInfluenceType] = useState('All Types');
  const [priceRange, setPriceRange] = useState([0, 200]);
  const [sortBy, setSortBy] = useState('rating');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Mock data representing diverse influential people
  const mockPeople: InfluentialPerson[] = [
    {
      id: '1',
      full_name: 'Emma Stone',
      bio: 'Academy Award-winning actress. Available for career advice and entertainment industry insights.',
      avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b9e36b13?w=150',
      account_type: 'creator',
      is_verified: true,
      category: 'Entertainment & Celebrity',
      influence_type: 'celebrity',
      specialties: ['Acting', 'Career guidance', 'Hollywood insights'],
      pricing: { callRate: 500, responseTime: '< 24 hours' },
      stats: { rating: 4.9, reviewCount: 89, totalCalls: 156, isOnline: false, followerCount: 2800000 },
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
      influence_type: 'expert',
      specialties: ['AI/ML', 'Research', 'Tech consulting'],
      pricing: { callRate: 200, responseTime: '< 4 hours' },
      stats: { rating: 4.95, reviewCount: 234, totalCalls: 890, isOnline: true, followerCount: 45000 },
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
      influence_type: 'entrepreneur',
      specialties: ['Startups', 'Fundraising', 'Business strategy'],
      pricing: { callRate: 350, responseTime: '< 8 hours' },
      stats: { rating: 4.8, reviewCount: 167, totalCalls: 445, isOnline: true, followerCount: 120000 },
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
      influence_type: 'influencer',
      specialties: ['Fashion styling', 'Social media', 'Brand partnerships'],
      pricing: { callRate: 150, responseTime: '< 2 hours' },
      stats: { rating: 4.7, reviewCount: 892, totalCalls: 2340, isOnline: true, followerCount: 10500000 },
      location: 'New York, NY'
    }
  ];

  useEffect(() => {
    loadPeople();
  }, []);

  useEffect(() => {
    filterPeople();
  }, [people, searchTerm, selectedCategory, selectedInfluenceType, priceRange, sortBy]);

  const loadPeople = async () => {
    try {
      setLoading(true);
      // In real app, this would be a Supabase query
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      setPeople(mockPeople);
    } catch (error) {
      console.error('Error loading people:', error);
      toast.error('Failed to load influential people');
    } finally {
      setLoading(false);
    }
  };

  const filterPeople = () => {
    let filtered = [...people];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(person =>
        person.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.bio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.specialties?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategory !== 'All Categories') {
      filtered = filtered.filter(person => person.category === selectedCategory);
    }

    // Influence type filter
    if (selectedInfluenceType !== 'All Types') {
      filtered = filtered.filter(person => person.influence_type === selectedInfluenceType.toLowerCase());
    }

    // Price filter
    filtered = filtered.filter(person => {
      const rate = person.pricing?.callRate || 0;
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
        case 'followers':
          return (b.stats?.followerCount || 0) - (a.stats?.followerCount || 0);
        case 'online':
          return (b.stats?.isOnline ? 1 : 0) - (a.stats?.isOnline ? 1 : 0);
        default:
          return 0;
      }
    });

    setFilteredPeople(filtered);
  };

  const toggleFavorite = (personId: string) => {
    setFavorites(prev => 
      prev.includes(personId) 
        ? prev.filter(id => id !== personId)
        : [...prev, personId]
    );
  };

  const formatFollowerCount = (count?: number) => {
    if (!count) return '';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search influential people by name, expertise, or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Influence Type</label>
                  <Select value={selectedInfluenceType} onValueChange={setSelectedInfluenceType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {influenceTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Sort By</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Price Range: ${priceRange[0]} - ${priceRange[1]}/session
                  </label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={500}
                    min={0}
                    step={25}
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Found {filteredPeople.length} influential people
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{filteredPeople.filter(p => p.stats?.isOnline).length} available now</Badge>
          <Badge variant="outline">{filteredPeople.filter(p => p.is_verified).length} verified</Badge>
        </div>
      </div>

      {/* People Grid */}
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
          {filteredPeople.map((person) => {
            const InfluenceIcon = getInfluenceIcon(person.influence_type);
            return (
              <Card key={person.id} className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={person.avatar_url} />
                            <AvatarFallback>{person.full_name[0]}</AvatarFallback>
                          </Avatar>
                          {person.stats?.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">{person.full_name}</h3>
                            {person.is_verified && (
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                ✓
                              </Badge>
                            )}
                            <InfluenceIcon className="h-4 w-4 text-primary" />
                          </div>
                          <p className="text-xs text-muted-foreground">{person.category}</p>
                          {person.stats?.followerCount && (
                            <p className="text-xs text-muted-foreground">
                              {formatFollowerCount(person.stats.followerCount)} followers
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(person.id)}
                        className="p-1 h-8 w-8"
                      >
                        <Heart className={`h-4 w-4 ${favorites.includes(person.id) ? 'fill-red-500 text-red-500' : ''}`} />
                      </Button>
                    </div>

                    {/* Bio */}
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {person.bio}
                    </p>

                    {/* Specialties */}
                    <div className="flex flex-wrap gap-1">
                      {person.specialties?.slice(0, 3).map((specialty) => (
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
                          <span className="font-medium">{person.stats?.rating}</span>
                          <span className="text-muted-foreground">({person.stats?.reviewCount})</span>
                        </div>
                        {person.location && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="text-xs">{person.location.split(',')[0]}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pricing & Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">${person.pricing?.callRate}</span>
                          <span className="text-sm text-muted-foreground">/session</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{person.pricing?.responseTime}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onPersonSelect(person)}
                          className="h-8 px-3"
                        >
                          <MessageCircle className="h-3 w-3 mr-1" />
                          Connect
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onStartCall?.(person)}
                          disabled={!person.stats?.isOnline}
                          className="h-8 px-3"
                        >
                          <Video className="h-3 w-3 mr-1" />
                          {person.stats?.isOnline ? 'Call Now' : 'Schedule'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filteredPeople.length === 0 && !loading && (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <Search className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">No people found</h3>
              <p className="text-muted-foreground">Try adjusting your search filters</p>
            </div>
            <Button variant="outline" onClick={() => {
              setSearchTerm('');
              setSelectedCategory('All Categories');
              setSelectedInfluenceType('All Types');
              setPriceRange([0, 500]);
            }}>
              Clear Filters
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}