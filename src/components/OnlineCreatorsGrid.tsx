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

      {/* Full Width Grid */}
      <div className="space-y-4">
        {currentCreators.map((creator) => (
          <div
            key={creator.id}
            className="relative h-48 rounded-lg overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => onCreatorSelect(creator.id)}
          >
            {/* Full Width Creator Image */}
            <div className="relative w-full h-full">
              <img
                src={creator.avatar_url}
                alt={creator.full_name}
                className="w-full h-full object-cover"
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              
              {/* Online indicator */}
              <div className="absolute top-4 right-4 flex items-center space-x-1 bg-green-500 text-white px-2 py-1 rounded-full text-sm">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span>Live</span>
              </div>
              
              {/* Rating */}
              <div className="absolute top-4 left-4 flex items-center space-x-1 bg-black/50 text-white px-2 py-1 rounded-full text-sm backdrop-blur-sm">
                <span className="text-yellow-400">★</span>
                <span>{creator.rating}</span>
                <span className="text-xs opacity-80">({creator.ratingsCount})</span>
              </div>
            </div>
            
            {/* Creator Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-lg">{creator.full_name}</h3>
                  <p className="text-sm opacity-90">{creator.headline}</p>
                </div>
                
                {/* Action Icons */}
                <div className="flex items-center space-x-3">
                  {/* Phone Icon with Appointment Count */}
                  <div className="relative">
                    <Phone 
                      className={`h-5 w-5 text-white ${
                        appointmentCounts[creator.id] > 0 ? 'animate-pulse text-orange-400' : ''
                      }`} 
                    />
                    {appointmentCounts[creator.id] > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                        {appointmentCounts[creator.id]}
                      </div>
                    )}
                  </div>
                  
                  {/* Heart Icon */}
                  <Heart className="h-5 w-5 text-white hover:text-red-400 cursor-pointer transition-colors" />
                </div>
              </div>
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