import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface Creator {
  id: string;
  name: string;
  avatar: string;
  category: string;
  isOnline: boolean;
  nextAvailable?: string;
  ratingsCount: number;
  rating: number;
  title: string;
}

interface ScheduleCreatorsGridProps {
  selectedCategory: string;
  onCreatorSelect: (creatorId: string) => void;
  searchQuery?: string;
}

// Mock data - replace with real data
const mockCreators: Creator[] = [
  { id: '13', name: 'Jennifer Lopez', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b9e36b13?w=150', category: 'entertainment', isOnline: false, nextAvailable: 'Tomorrow 2pm', ratingsCount: 3450, rating: 4.9, title: 'Multi-Platinum Artist' },
  { id: '14', name: 'Elon Musk', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', category: 'technology', isOnline: false, nextAvailable: 'Today 6pm', ratingsCount: 2180, rating: 4.7, title: 'CEO & Founder' },
  { id: '15', name: 'Warren Buffett', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', category: 'business', isOnline: false, nextAvailable: 'Next week', ratingsCount: 1890, rating: 4.8, title: 'The Oracle of Omaha' },
  { id: '16', name: 'Kylie Jenner', avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150', category: 'beauty', isOnline: false, nextAvailable: 'Tomorrow 10am', ratingsCount: 4200, rating: 4.6, title: 'Beauty Mogul' },
  { id: '17', name: 'Tim Cook', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', category: 'technology', isOnline: false, nextAvailable: 'Friday 3pm', ratingsCount: 1340, rating: 4.5, title: 'Apple CEO' },
  { id: '18', name: 'Oprah Winfrey', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', category: 'entertainment', isOnline: false, nextAvailable: 'Next Monday', ratingsCount: 5670, rating: 4.9, title: 'Media Mogul' },
  { id: '19', name: 'Jeff Bezos', avatar: 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=150', category: 'business', isOnline: false, nextAvailable: 'Thursday 1pm', ratingsCount: 980, rating: 4.4, title: 'Amazon Founder' },
  { id: '20', name: 'Rihanna', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', category: 'beauty', isOnline: false, nextAvailable: 'Tomorrow 4pm', ratingsCount: 2890, rating: 4.8, title: 'Fenty Founder' },
  { id: '21', name: 'Mark Zuckerberg', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', category: 'technology', isOnline: false, nextAvailable: 'Today 8pm', ratingsCount: 1560, rating: 4.3, title: 'Meta CEO' },
  { id: '22', name: 'Taylor Swift', avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150', category: 'entertainment', isOnline: false, nextAvailable: 'Saturday 11am', ratingsCount: 8900, rating: 4.9, title: 'Grammy Winner' },
  { id: '23', name: 'Richard Branson', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', category: 'business', isOnline: false, nextAvailable: 'Next Tuesday', ratingsCount: 780, rating: 4.6, title: 'Virgin Group Founder' },
  { id: '24', name: 'Kim Kardashian', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', category: 'beauty', isOnline: false, nextAvailable: 'Tomorrow 9am', ratingsCount: 6700, rating: 4.5, title: 'Media Personality' },
];

export function ScheduleCreatorsGrid({ selectedCategory, onCreatorSelect, searchQuery = "" }: ScheduleCreatorsGridProps) {
  const [currentPage, setCurrentPage] = useState(0);

  // Filter creators by category (offline only) and search query
  const q = (searchQuery ?? '').toLowerCase();
  const offlineCreators = mockCreators.filter(creator => 
    !creator.isOnline && 
    (selectedCategory === 'all' || creator.category === selectedCategory.toLowerCase()) &&
    (q === '' || creator.name.toLowerCase().includes(q))
  );

  // Group creators into pages of 12 (4x3)
  const creatorsPerPage = 12;
  const totalPages = Math.ceil(offlineCreators.length / creatorsPerPage);
  const currentCreators = offlineCreators.slice(
    currentPage * creatorsPerPage,
    (currentPage + 1) * creatorsPerPage
  );

  // Reset page when category changes
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedCategory]);

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Schedule in advance</h3>
          <span className="text-sm text-muted-foreground">
            {offlineCreators.length} creator{offlineCreators.length === 1 ? '' : 's'} available
          </span>
        </div>

        {/* Navigation */}
        {totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={prevPage}
              disabled={currentPage === 0}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentPage + 1} / {totalPages}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={nextPage}
              disabled={currentPage === totalPages - 1}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* 4x3 Grid */}
      <div className="grid grid-cols-4 gap-4">
        {currentCreators.map((creator) => (
          <div
            key={creator.id}
            className="flex flex-col items-center space-y-2 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => onCreatorSelect(creator.id)}
          >
            {/* Ratings Count and Rating */}
            <div className="text-center space-y-0.5">
              <p className="text-xs text-muted-foreground font-medium">{creator.ratingsCount} ratings</p>
              <div className="flex items-center justify-center space-x-1">
                <span className="text-xs text-yellow-500">★</span>
                <span className="text-xs text-muted-foreground">{creator.rating}</span>
              </div>
            </div>
            
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-16 w-16 opacity-75">
                <AvatarImage src={creator.avatar} alt={creator.name} />
                <AvatarFallback className="bg-gradient-secondary text-secondary-foreground">
                  {creator.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              {/* Offline indicator */}
              <div className="absolute -bottom-1 -right-1">
                <div className="w-4 h-4 bg-muted border-2 border-white rounded-full"></div>
              </div>
            </div>
            
            {/* Name, Title, and Next Available */}
            <div className="text-center space-y-1">
              <div className="space-y-0.5">
                <p className="text-sm font-medium leading-tight">{creator.name}</p>
                <p className="text-xs text-muted-foreground">{creator.title}</p>
              </div>
              {creator.nextAvailable && (
                <Badge variant="outline" className="text-xs">
                  {creator.nextAvailable}
                </Badge>
              )}
            </div>
          </div>
        ))}

        {/* Fill empty slots if less than 9 creators */}
        {Array.from({ length: Math.max(0, creatorsPerPage - currentCreators.length) }).map((_, index) => (
          <div key={`empty-${index}`} className="flex flex-col items-center space-y-2 p-3 opacity-30">
            <div className="h-16 w-16 bg-muted rounded-full border-2 border-dashed border-muted-foreground/30"></div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Coming Soon</p>
            </div>
          </div>
        ))}
      </div>

      {offlineCreators.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No creators available for scheduling in this category</p>
          <p className="text-sm">Try selecting "All" or check other categories</p>
        </div>
      )}
    </div>
  );
}