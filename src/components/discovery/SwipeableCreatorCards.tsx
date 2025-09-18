import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  Star, 
  Users, 
  Clock, 
  DollarSign,
  CheckCircle,
  MapPin,
  X,
  RotateCcw,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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
  nextAvailable?: string;
}

interface SwipeableCreatorCardsProps {
  selectedCategory: string;
  searchQuery: string;
  onCreatorLike: (creatorId: string) => void;
  onCreatorPass: (creatorId: string) => void;
  onCreatorSuperLike: (creatorId: string) => void;
  onCreatorMessage: (creatorId: string) => void;
  onCreatorShare: (creatorId: string) => void;
  onCreatorBookmark: (creatorId: string) => void;
}

export const SwipeableCreatorCards = ({ 
  selectedCategory,
  searchQuery,
  onCreatorLike,
  onCreatorPass,
  onCreatorSuperLike,
  onCreatorMessage,
  onCreatorShare,
  onCreatorBookmark
}: SwipeableCreatorCardsProps) => {
  // Use enhanced creator search
  const { creators, loading, error } = useCreatorSearch({
    query: searchQuery,
    categories: selectedCategory === 'all' ? [] : [selectedCategory],
    availableOnly: false
  });

  // Use all creators from search (no additional filtering needed)
  const filteredCreators = creators;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const currentCreator = filteredCreators[currentIndex];
  
  const handleCardAction = useCallback((action: 'like' | 'pass', creatorId?: string) => {
    const creator = creatorId ? filteredCreators.find(c => c.id === creatorId) : currentCreator;
    if (!creator) return;

    switch (action) {
      case 'like':
        onCreatorLike(creator.id);
        toast.success(`Interested in ${creator.full_name}`);
        break;
      case 'pass':
        onCreatorPass(creator.id);
        toast(`Passed on ${creator.full_name}`, {
          description: "We'll find better matches for you"
        });
        break;
    }

    // Move to next creator
    if (currentIndex < filteredCreators.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      toast.info("No more creators to show", {
        description: "Check back later for more recommendations"
      });
    }
    
    // Reset card position
    setDragOffset({ x: 0, y: 0 });
    setRotation(0);
  }, [currentIndex, filteredCreators, currentCreator, onCreatorLike, onCreatorPass]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      setTouchStart({ x: touch.clientX, y: touch.clientY });
      setIsScrolling(false);
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const x = e.clientX - window.innerWidth / 2;
    const y = e.clientY - window.innerHeight / 2;
    const newRotation = x * 0.1; // Subtle rotation based on horizontal movement
    
    setDragOffset({ x, y });
    setRotation(newRotation);
  }, [isDragging]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStart) return;
    
    const touch = e.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine if this is a scroll gesture (more vertical than horizontal)
    if (absDeltaY > absDeltaX && absDeltaY > 10) {
      setIsScrolling(true);
      return;
    }

    // Only treat as swipe if horizontal movement is significant and not scrolling
    if (!isScrolling && absDeltaX > 10) {
      e.preventDefault(); // Only prevent default for swipe gestures
      setIsDragging(true);
      
      const x = deltaX;
      const y = deltaY;
      const newRotation = x * 0.1;
      
      setDragOffset({ x, y });
      setRotation(newRotation);
    }
  }, [touchStart, isScrolling]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Determine action based on drag distance
    const threshold = 100;
    
    if (dragOffset.x > threshold) {
      handleCardAction('like');
    } else if (dragOffset.x < -threshold) {
      handleCardAction('pass');
    } else {
      // Reset position if not enough drag
      setDragOffset({ x: 0, y: 0 });
      setRotation(0);
    }
  }, [isDragging, dragOffset, handleCardAction]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || isScrolling) {
      // Reset state
      setIsDragging(false);
      setIsScrolling(false);
      setTouchStart(null);
      setDragOffset({ x: 0, y: 0 });
      setRotation(0);
      return;
    }
    
    setIsDragging(false);
    setTouchStart(null);
    
    // Determine action based on horizontal drag distance
    const threshold = 80;
    
    if (dragOffset.x > threshold) {
      handleCardAction('like'); // Swipe right = interested
    } else if (dragOffset.x < -threshold) {
      handleCardAction('pass'); // Swipe left = neutral/pass
    } else {
      // Reset position if not enough drag
      setDragOffset({ x: 0, y: 0 });
      setRotation(0);
    }
  }, [isDragging, isScrolling, dragOffset, handleCardAction]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    // Always listen for touch events but handle them conditionally
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-4">
        <div className="text-4xl">🔍</div>
        <h3 className="text-xl font-semibold">Finding creators...</h3>
        <p className="text-muted-foreground text-center">
          Searching for the perfect matches for you.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-4">
        <div className="text-4xl">⚠️</div>
        <h3 className="text-xl font-semibold">Unable to load creators</h3>
        <p className="text-muted-foreground text-center">
          Please try again later.
        </p>
      </div>
    );
  }

  if (!currentCreator) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-4">
        <div className="text-4xl">🎉</div>
        <h3 className="text-xl font-semibold">All caught up!</h3>
        <p className="text-muted-foreground text-center">
          You've seen all available creators. Check back later for more recommendations.
        </p>
        <Button onClick={() => setCurrentIndex(0)} variant="outline">
          <RotateCcw className="h-4 w-4 mr-2" />
          Start Over
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Action hints */}
      <div className="absolute top-4 left-0 right-0 z-20 flex justify-between px-6 pointer-events-none">
        <Badge 
          className={cn(
            "bg-orange-500 text-white transition-opacity duration-200",
            dragOffset.x < -50 ? "opacity-100" : "opacity-0"
          )}
        >
          NEUTRAL
        </Badge>
        <Badge 
          className={cn(
            "bg-green-500 text-white transition-opacity duration-200",
            dragOffset.x > 50 ? "opacity-100" : "opacity-0"
          )}
        >
          INTERESTED
        </Badge>
      </div>

      {/* Card Stack */}
      <div className="relative h-[600px]">
        {/* Next card (behind) */}
        {filteredCreators[currentIndex + 1] && (
          <Card className="absolute inset-0 bg-card shadow-lg scale-95 opacity-80 rounded-b-lg rounded-t-none border-0">
            <CardContent className="p-0 h-full">
              <div className="relative h-full rounded-b-lg rounded-t-none overflow-hidden">
                <img
                  src={filteredCreators[currentIndex + 1].avatar_url}
                  alt={filteredCreators[currentIndex + 1].full_name}
                  className="w-full h-full object-cover"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current card */}
        <Card 
          ref={el => cardRefs.current[0] = el}
          className={cn(
            "absolute inset-0 cursor-grab active:cursor-grabbing shadow-elegant transition-transform duration-200 select-none rounded-b-lg rounded-t-none border-0",
            isDragging ? "scale-105" : "scale-100"
          )}
          style={{
            transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`,
            zIndex: 10
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <CardContent className="p-0 h-full">
            <div className="relative h-full rounded-b-lg rounded-t-none overflow-hidden">
              {/* Creator Image */}
              <img
                src={currentCreator.avatar_url}
                alt={currentCreator.full_name}
                className="w-full h-full object-cover"
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              
              {/* Online Status */}
              {currentCreator.isOnline && (
                <div className="absolute top-4 right-4 flex items-center space-x-1 bg-green-500 text-white px-2 py-1 rounded-full text-sm">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span>Live</span>
                </div>
              )}

              {/* Action Buttons - Top */}
              <div className="absolute top-4 left-4 flex space-x-2 z-30 pointer-events-auto">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0 bg-black/40 backdrop-blur-sm border-0 hover:bg-black/60"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreatorBookmark(currentCreator.id);
                    toast.success("Creator bookmarked");
                  }}
                >
                  <Bookmark className="h-4 w-4 text-white" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0 bg-black/40 backdrop-blur-sm border-0 hover:bg-black/60"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreatorShare(currentCreator.id);
                    toast.success("Creator profile shared");
                  }}
                >
                  <Share2 className="h-4 w-4 text-white" />
                </Button>
              </div>

              {/* Creator Info */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center space-x-3 mb-3">
                  <h2 className="text-2xl font-bold">{currentCreator.full_name}</h2>
                  <CheckCircle className="h-6 w-6 text-blue-400 fill-current" />
                </div>
                
                <p className="text-lg mb-2 opacity-90">{currentCreator.headline}</p>

                {currentCreator.bio && (
                  <p className="text-sm opacity-80 mb-4 line-clamp-2">{currentCreator.bio}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm opacity-80">Categories</span>
                      <span className="font-semibold text-xs">
                        {currentCreator.categories.join(', ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm opacity-80">Rating</span>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{currentCreator.rating}</span>
                        <span className="text-sm opacity-60">({currentCreator.ratingsCount})</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm opacity-80">Status</span>
                      <span className="font-semibold">
                        {currentCreator.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm opacity-80">Available</span>
                      <span className="font-semibold text-xs">
                        {currentCreator.nextAvailable || 'Now'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Category & Availability */}
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    {currentCreator.categories[0] || 'Creator'}
                  </Badge>
                  {!currentCreator.isOnline && currentCreator.nextAvailable && (
                    <div className="flex items-center space-x-1 text-sm opacity-80">
                      <Clock className="h-4 w-4" />
                      <span>Next: {currentCreator.nextAvailable}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-6 mt-6">
        <Button
          variant="outline"
          size="lg"
          className="h-14 w-14 rounded-full border-2 border-orange-500 bg-white hover:bg-orange-50 group"
          onClick={() => handleCardAction('pass')}
        >
          <X className="h-6 w-6 text-orange-500 group-hover:scale-110 transition-transform" />
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-14 w-14 rounded-full border-2 border-green-500 bg-white hover:bg-green-50 group"
          onClick={() => handleCardAction('like')}
        >
          <Heart className="h-6 w-6 text-green-500 group-hover:scale-110 transition-transform" />
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-12 w-12 rounded-full border-2 border-purple-500 bg-white hover:bg-purple-50 group"
          onClick={() => {
            onCreatorMessage(currentCreator.id);
            toast.success(`Sent message to ${currentCreator.full_name}`);
          }}
        >
          <MessageSquare className="h-5 w-5 text-purple-500 group-hover:scale-110 transition-transform" />
        </Button>
      </div>

      {/* Progress Indicator */}
      <div className="flex justify-center mt-4 space-x-1">
        {filteredCreators.slice(0, Math.min(filteredCreators.length, 5)).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-2 w-8 rounded-full transition-colors",
              index <= currentIndex ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
        {filteredCreators.length > 5 && (
          <span className="text-sm text-muted-foreground ml-2">
            +{filteredCreators.length - 5} more
          </span>
        )}
      </div>
    </div>
  );
};