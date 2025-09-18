import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Phone, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Creator {
  id: string;
  name: string;
  avatar: string;
  category: string;
  isOnline: boolean;
  ratingsCount: number;
  rating: number;
  title: string;
}

interface OnlineCreatorsGridProps {
  selectedCategory: string;
  onCreatorSelect: (creatorId: string) => void;
  searchQuery?: string;
  hideHeader?: boolean;
}

// Beauty, Fashion & Lifestyle focused creators for women
const mockCreators: Creator[] = [
  { id: '1', name: 'Sophia Martinez', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b9e36b13?w=150', category: 'skincare', isOnline: true, ratingsCount: 1840, rating: 4.9, title: 'Celebrity Esthetician' },
  { id: '2', name: 'Isabella Chen', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', category: 'makeup', isOnline: true, ratingsCount: 2340, rating: 4.8, title: 'Pro Makeup Artist' },
  { id: '3', name: 'Olivia Thompson', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', category: 'fashion', isOnline: true, ratingsCount: 1650, rating: 4.9, title: 'Personal Stylist' },
  { id: '4', name: 'Zoe Rodriguez', avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150', category: 'haircare', isOnline: true, ratingsCount: 2100, rating: 4.8, title: 'Hair Color Specialist' },
  { id: '5', name: 'Ava Johnson', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', category: 'wellness', isOnline: true, ratingsCount: 920, rating: 4.7, title: 'Wellness Coach' },
  { id: '6', name: 'Maya Patel', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', category: 'lifestyle', isOnline: true, ratingsCount: 1560, rating: 4.8, title: 'Lifestyle Blogger' },
  { id: '7', name: 'Emma Davis', avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150', category: 'fitness', isOnline: true, ratingsCount: 890, rating: 4.6, title: 'Pilates Instructor' },
  { id: '8', name: 'Chloe Kim', avatar: 'https://images.unsplash.com/photo-1502764613149-7f1d229e230f?w=150', category: 'motherhood', isOnline: true, ratingsCount: 750, rating: 4.7, title: 'Mom Life Coach' },
  { id: '9', name: 'Natalie Brooks', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', category: 'nutrition', isOnline: true, ratingsCount: 680, rating: 4.5, title: 'Nutritionist' },
  { id: '10', name: 'Rachel Green', avatar: 'https://images.unsplash.com/photo-1532074205216-d0e1f4b87368?w=150', category: 'career', isOnline: true, ratingsCount: 520, rating: 4.6, title: 'Career Coach' },
  { id: '11', name: 'Jessica White', avatar: 'https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=150', category: 'relationships', isOnline: true, ratingsCount: 440, rating: 4.4, title: 'Dating Expert' },
  { id: '12', name: 'Amanda Rose', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', category: 'travel', isOnline: true, ratingsCount: 380, rating: 4.5, title: 'Travel Blogger' },
];

export function OnlineCreatorsGrid({ selectedCategory, onCreatorSelect, searchQuery = "", hideHeader = false }: OnlineCreatorsGridProps) {
  const { user } = useAuth()
  const [currentPage, setCurrentPage] = useState(0);
  const [appointmentCounts, setAppointmentCounts] = useState<Record<string, number>>({});

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
              {onlineCreators.length} expert{onlineCreators.length === 1 ? '' : 's'} available
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

      {/* 4x3 Grid */}
      <div className="grid grid-cols-4 gap-4">
        {currentCreators.map((creator) => (
          <div
            key={creator.id}
            className="flex flex-col items-center space-y-2 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => onCreatorSelect(creator.id)}
          >
            {/* Rating and Ratings Count */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 text-xs text-muted-foreground">
                <span className="text-yellow-500">★</span>
                <span>{creator.rating}</span>
                <span className="font-medium">({creator.ratingsCount})</span>
              </div>
            </div>
            
            {/* Avatar */}
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
            
            {/* Name and Title */}
            <div className="text-center space-y-0.5">
              <p className="text-sm font-medium leading-tight">{creator.name}</p>
              <p className="text-xs text-muted-foreground">{creator.title}</p>
            </div>

            {/* Action Icons */}
            <div className="flex items-center justify-center space-x-3 mt-1">
              {/* Phone Icon with Appointment Count */}
              <div className="relative">
                <Phone 
                  className={`h-3 w-3 text-muted-foreground ${
                    appointmentCounts[creator.id] > 0 ? 'animate-pulse text-orange-500' : ''
                  }`} 
                />
                {appointmentCounts[creator.id] > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[12px] h-3 flex items-center justify-center px-1 text-[10px]">
                    {appointmentCounts[creator.id]}
                  </div>
                )}
              </div>
              
              {/* Heart Icon */}
              <Heart className="h-3 w-3 text-muted-foreground hover:text-red-500 cursor-pointer" />
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
          <p>No beauty experts online in this category right now</p>
          <p className="text-sm">Try selecting "All" or check back later</p>
        </div>
      )}
    </div>
  );
}