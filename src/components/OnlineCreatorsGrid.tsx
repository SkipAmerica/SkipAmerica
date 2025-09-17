import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Creator {
  id: string;
  name: string;
  avatar: string;
  category: string;
  isOnline: boolean;
}

interface OnlineCreatorsGridProps {
  selectedCategory: string;
  onCreatorSelect: (creatorId: string) => void;
  searchQuery?: string;
}

// Mock data - replace with real data
const mockCreators: Creator[] = [
  { id: '1', name: 'Emma Stone', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b9e36b13?w=150', category: 'entertainment', isOnline: true },
  { id: '2', name: 'Dr. Sarah Chen', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', category: 'technology', isOnline: true },
  { id: '3', name: 'Marcus Johnson', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', category: 'business', isOnline: true },
  { id: '4', name: 'Zoe Rodriguez', avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150', category: 'beauty', isOnline: true },
  { id: '5', name: 'Alex Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', category: 'technology', isOnline: true },
  { id: '6', name: 'Maya Patel', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', category: 'entertainment', isOnline: true },
  { id: '7', name: 'James Wilson', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', category: 'business', isOnline: true },
  { id: '8', name: 'Sophia Kim', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', category: 'beauty', isOnline: true },
  { id: '9', name: 'David Lee', avatar: 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=150', category: 'technology', isOnline: true },
  { id: '10', name: 'Lisa Zhang', avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150', category: 'entertainment', isOnline: true },
  { id: '11', name: 'Ryan Garcia', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', category: 'business', isOnline: true },
  { id: '12', name: 'Anna Taylor', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', category: 'beauty', isOnline: true },
];

export function OnlineCreatorsGrid({ selectedCategory, onCreatorSelect, searchQuery = "" }: OnlineCreatorsGridProps) {
  const [currentPage, setCurrentPage] = useState(0);

  // Filter creators by category, online status, and search query
  const q = (searchQuery ?? '').toLowerCase();
  const onlineCreators = mockCreators.filter(creator => 
    creator.isOnline && 
    (selectedCategory === 'all' || creator.category === selectedCategory.toLowerCase()) &&
    (q === '' || creator.name.toLowerCase().includes(q))
  );

  // Group creators into pages of 12 (4x3)
  const creatorsPerPage = 12;
  const totalPages = Math.ceil(onlineCreators.length / creatorsPerPage);
  const currentCreators = onlineCreators.slice(
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
          <div className="relative">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
          </div>
          <h3 className="text-lg font-semibold">Who's Online?</h3>
          <span className="text-sm text-muted-foreground">
            {onlineCreators.length} creator{onlineCreators.length === 1 ? '' : 's'} available
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
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={creator.avatar} alt={creator.name} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                  {creator.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              {/* Online indicator */}
              <div className="absolute -bottom-1 -right-1">
                <div className="w-4 h-4 bg-green-500 border-2 border-white rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium leading-tight">{creator.name}</p>
            </div>
          </div>
        ))}

        {/* Fill empty slots if less than 9 creators */}
        {Array.from({ length: Math.max(0, creatorsPerPage - currentCreators.length) }).map((_, index) => (
          <div key={`empty-${index}`} className="flex flex-col items-center space-y-2 p-3 opacity-30">
            <div className="h-16 w-16 bg-muted rounded-full border-2 border-dashed border-muted-foreground/30"></div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Available Soon</p>
            </div>
          </div>
        ))}
      </div>

      {onlineCreators.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No creators online in this category right now</p>
          <p className="text-sm">Try selecting "All" or check back later</p>
        </div>
      )}
    </div>
  );
}