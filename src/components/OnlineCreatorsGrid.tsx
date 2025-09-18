import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Phone, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCreatorSearch } from '@/hooks/useCreatorSearch';

interface Creator {
  id: string;
  full_name: string;
  avatar_url: string;
  categories: string[];
  isOnline: boolean;
  ratingsCount: number;
  rating: number;
  headline: string;
  bio: string;
}

interface OnlineCreatorsGridProps {
  selectedCategory: string;
  onCreatorSelect: (creatorId: string) => void;
  searchQuery?: string;
  hideHeader?: boolean;
}


export function OnlineCreatorsGrid({ selectedCategory, onCreatorSelect, searchQuery = "", hideHeader = false }: OnlineCreatorsGridProps) {
  const { user } = useAuth()
  const [currentPage, setCurrentPage] = useState(0);
  const [appointmentCounts, setAppointmentCounts] = useState<Record<string, number>>({});

  // Use enhanced creator search
  const { creators, loading, error } = useCreatorSearch({
    query: searchQuery,
    categories: selectedCategory === 'all' ? [] : [selectedCategory],
    availableOnly: false
  });

  // Filter for online creators only
  const onlineCreators = creators.filter(creator => creator.isOnline);

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

  // Fetch appointment waitlist counts
  const fetchAppointmentCounts = useCallback(async () => {
    if (!user || onlineCreators.length === 0) return

    try {
      const creatorIds = onlineCreators.map(c => c.id)
      const { data, error } = await supabase
        .from('appointment_waitlist')
        .select('creator_id')
        .in('creator_id', creatorIds)
        .eq('status', 'waiting')

      if (error) {
        console.error('Error fetching appointment counts:', error)
        return
      }

      // Count appointments per creator
      const counts: Record<string, number> = {}
      data?.forEach(appointment => {
        counts[appointment.creator_id] = (counts[appointment.creator_id] || 0) + 1
      })

      setAppointmentCounts(counts)
    } catch (error) {
      console.error('Error fetching appointment counts:', error)
    }
  }, [user, onlineCreators])

  useEffect(() => {
    fetchAppointmentCounts()
  }, [fetchAppointmentCounts])

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
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
            </div>
            <h3 className="text-lg font-semibold">Live Now</h3>
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
      )}

      {/* Creators Grid */}
      <div className="grid grid-cols-3 gap-4">
        {currentCreators.map((creator) => (
          <div
            key={creator.id}
            className="flex flex-col items-center space-y-2 cursor-pointer"
            onClick={() => onCreatorSelect(creator.id)}
          >
            {/* Rating above avatar */}
            <div className="flex items-center space-x-1">
              <span className="text-yellow-400">★</span>
              <span className="text-sm font-medium">{creator.rating}</span>
              <span className="text-xs text-muted-foreground">({creator.ratingsCount})</span>
            </div>
            
            {/* Avatar with Online indicator */}
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={creator.avatar_url} />
                <AvatarFallback>{creator.full_name.charAt(0)}</AvatarFallback>
              </Avatar>
              {/* Online indicator - bottom right */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              </div>
            </div>
            
            {/* Creator Info */}
            <div className="text-center">
              <h3 className="font-medium text-sm">{creator.full_name}</h3>
              <p className="text-xs text-muted-foreground">{creator.headline}</p>
            </div>
          </div>
        ))}

        {/* Fill empty slots to maintain grid layout */}
        {Array.from({ length: Math.max(0, creatorsPerPage - currentCreators.length) }).map((_, index) => (
          <div key={`empty-${index}`} className="flex flex-col items-center space-y-2 opacity-30">
            <div className="h-20 w-20 bg-muted rounded-full border-2 border-dashed border-muted-foreground/30"></div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Available Soon</p>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Loading creators...</p>
        </div>
      )}

      {!loading && onlineCreators.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No creators online in this category right now</p>
          <p className="text-sm">Try selecting "All" or check back later</p>
        </div>
      )}

      {error && (
        <div className="text-center py-8 text-destructive">
          <p>Error loading creators. Please try again.</p>
        </div>
      )}
    </div>
  );
}