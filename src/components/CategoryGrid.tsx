import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Users, Palette, Briefcase, Monitor, Music, Heart, Coffee, Camera, Gamepad2, GraduationCap, Dumbbell, Utensils } from 'lucide-react';
import { useUserInterests } from '@/hooks/useUserInterests';

interface CategoryData {
  id: string;
  name: string;
  icon: React.ReactNode;
  onlineCount: number;
  totalMembers: number;
  subcategories: string[];
  color: string;
  description: string;
}

interface CategoryGridProps {
  onCategorySelect: (categoryId: string) => void;
  searchQuery?: string;
  hideHeader?: boolean;
}

// Mock category data - replace with real data
const mockCategories: CategoryData[] = [
  {
    id: 'beauty',
    name: 'Beauty & Style',
    icon: <Palette className="h-8 w-8" />,
    onlineCount: 147,
    totalMembers: 2840,
    subcategories: ['Beauty Influencers', 'Stylists', 'Makeup Artists', 'Brand Reps', 'Agency Managers'],
    color: 'bg-pink-100 text-pink-800',
    description: 'Beauty experts, fashion stylists, and industry professionals'
  },
  {
    id: 'business',
    name: 'Business & Finance',
    icon: <Briefcase className="h-8 w-8" />,
    onlineCount: 89,
    totalMembers: 1560,
    subcategories: ['Entrepreneurs', 'Investors', 'Consultants', 'Financial Advisors', 'CEOs'],
    color: 'bg-blue-100 text-blue-800',
    description: 'Business leaders, entrepreneurs, and financial experts'
  },
  {
    id: 'technology',
    name: 'Tech & Innovation',
    icon: <Monitor className="h-8 w-8" />,
    onlineCount: 92,
    totalMembers: 1820,
    subcategories: ['Developers', 'AI Researchers', 'Tech CEOs', 'Product Managers', 'Engineers'],
    color: 'bg-purple-100 text-purple-800',
    description: 'Tech innovators, developers, and industry experts'
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: <Music className="h-8 w-8" />,
    onlineCount: 156,
    totalMembers: 3420,
    subcategories: ['Actors', 'Musicians', 'Comedians', 'Directors', 'Producers'],
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Entertainers, artists, and media professionals'
  },
  {
    id: 'fitness',
    name: 'Health & Fitness',
    icon: <Dumbbell className="h-8 w-8" />,
    onlineCount: 73,
    totalMembers: 1240,
    subcategories: ['Trainers', 'Nutritionists', 'Wellness Coaches', 'Athletes', 'Health Experts'],
    color: 'bg-green-100 text-green-800',
    description: 'Fitness trainers, health experts, and wellness coaches'
  },
  {
    id: 'food',
    name: 'Food & Culinary',
    icon: <Utensils className="h-8 w-8" />,
    onlineCount: 64,
    totalMembers: 980,
    subcategories: ['Chefs', 'Food Critics', 'Nutritionists', 'Restaurant Owners', 'Food Bloggers'],
    color: 'bg-orange-100 text-orange-800',
    description: 'Culinary experts, chefs, and food industry professionals'
  },
  {
    id: 'education',
    name: 'Education & Learning',
    icon: <GraduationCap className="h-8 w-8" />,
    onlineCount: 58,
    totalMembers: 1100,
    subcategories: ['Professors', 'Tutors', 'Researchers', 'Course Creators', 'Academic Writers'],
    color: 'bg-indigo-100 text-indigo-800',
    description: 'Educators, researchers, and learning professionals'
  },
  {
    id: 'creative',
    name: 'Creative Arts',
    icon: <Palette className="h-8 w-8" />,
    onlineCount: 81,
    totalMembers: 1650,
    subcategories: ['Artists', 'Designers', 'Writers', 'Photographers', 'Creative Directors'],
    color: 'bg-teal-100 text-teal-800',
    description: 'Creative professionals, artists, and designers'
  },
  {
    id: 'photography',
    name: 'Photography',
    icon: <Camera className="h-8 w-8" />,
    onlineCount: 45,
    totalMembers: 720,
    subcategories: ['Photographers', 'Photo Editors', 'Commercial Photographers', 'Wedding Photographers', 'Travel Photographers'],
    color: 'bg-gray-100 text-gray-800',
    description: 'Professional photographers and visual artists'
  },
  {
    id: 'gaming',
    name: 'Gaming & Esports',
    icon: <Gamepad2 className="h-8 w-8" />,
    onlineCount: 112,
    totalMembers: 2100,
    subcategories: ['Pro Gamers', 'Streamers', 'Game Developers', 'Esports Coaches', 'Gaming Content Creators'],
    color: 'bg-red-100 text-red-800',
    description: 'Gaming professionals, streamers, and esports athletes'
  }
];

export function CategoryGrid({ onCategorySelect, searchQuery = "", hideHeader = false }: CategoryGridProps) {
  const { userInterests, loading } = useUserInterests();
  const [currentPage, setCurrentPage] = useState(0);

  // Filter categories by search query and sort by relevance
  const q = (searchQuery ?? '').toLowerCase();
  const filteredCategories = mockCategories
    .filter(category => 
      q === '' || 
      category.name.toLowerCase().includes(q) ||
      category.subcategories.some(sub => sub.toLowerCase().includes(q))
    )
    .sort((a, b) => {
      // First, prioritize user interests
      const aIsInterest = userInterests.includes(a.id);
      const bIsInterest = userInterests.includes(b.id);
      
      if (aIsInterest && !bIsInterest) return -1;
      if (!aIsInterest && bIsInterest) return 1;
      
      // Then by online count (packed categories)
      return b.onlineCount - a.onlineCount;
    });

  // Group categories into pages of 8 (4x2)
  const categoriesPerPage = 8;
  const totalPages = Math.ceil(filteredCategories.length / categoriesPerPage);
  const currentCategories = filteredCategories.slice(
    currentPage * categoriesPerPage,
    (currentPage + 1) * categoriesPerPage
  );

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery]);

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

  const getTotalOnline = () => {
    return filteredCategories.reduce((sum, cat) => sum + cat.onlineCount, 0);
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
            <h3 className="text-lg font-semibold">Interest Categories</h3>
            <span className="text-sm text-muted-foreground">
              {getTotalOnline()} people online across categories
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

      {/* 4x2 Grid */}
      <div className="grid grid-cols-4 gap-4">
        {currentCategories.map((category) => {
          const isUserInterest = userInterests.includes(category.id);
          
          return (
            <div
              key={category.id}
              className="flex flex-col items-center space-y-3 p-4 rounded-lg hover:bg-accent/50 transition-all duration-200 cursor-pointer group border border-transparent hover:border-primary/20"
              onClick={() => onCategorySelect(category.id)}
            >
              {/* User Interest Badge */}
              {isUserInterest && (
                <div className="self-start">
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                    <Heart className="h-3 w-3 mr-1" />
                    Interest
                  </Badge>
                </div>
              )}
              
              {/* Icon and Online Count */}
              <div className="flex flex-col items-center space-y-2">
                <div className={`p-3 rounded-full ${category.color} group-hover:scale-110 transition-transform`}>
                  {category.icon}
                </div>
                
                {/* Online count prominently displayed */}
                <div className="flex items-center space-x-1 text-sm font-semibold">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-lg font-bold text-primary">{category.onlineCount}</span>
                  <span className="text-muted-foreground">online</span>
                </div>
              </div>
              
              {/* Category Name */}
              <div className="text-center">
                <p className="text-sm font-medium leading-tight">{category.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{category.description}</p>
              </div>

              {/* Subcategories */}
              <div className="text-center">
                <div className="flex flex-wrap justify-center gap-1">
                  {category.subcategories.slice(0, 3).map((sub, index) => (
                    <span key={index} className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {sub}
                    </span>
                  ))}
                  {category.subcategories.length > 3 && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      +{category.subcategories.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Total members */}
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{category.totalMembers} members</span>
              </div>
            </div>
          );
        })}

        {/* Fill empty slots if less than 8 categories */}
        {Array.from({ length: Math.max(0, categoriesPerPage - currentCategories.length) }).map((_, index) => (
          <div key={`empty-${index}`} className="flex flex-col items-center space-y-3 p-4 opacity-30">
            <div className="w-14 h-14 bg-muted rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <Users className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">More Categories</p>
              <p className="text-xs text-muted-foreground">Coming Soon</p>
            </div>
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No categories found</p>
          <p className="text-sm">Try adjusting your search</p>
        </div>
      )}
    </div>
  );
}