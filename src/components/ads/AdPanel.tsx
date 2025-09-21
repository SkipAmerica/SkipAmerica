import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAdManager, AdData } from '@/hooks/useAdManager';
import { toast } from 'sonner';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';

// Import the generated ad images
import adCreators from '@/assets/ads/ad-creators.jpg';
import adEvents from '@/assets/ads/ad-events.jpg';
import adPremium from '@/assets/ads/ad-premium.jpg';
import adNike from '@/assets/ads/ad-nike.jpg';
import adPlatform from '@/assets/ads/ad-platform.jpg';

interface AdPanelProps {
  className?: string;
  variant?: 'default' | 'compact' | 'large';
  background?: 'gray' | 'white' | 'transparent';
  showBorder?: boolean;
  borderColor?: 'gray' | 'muted';
}

interface AdCardProps {
  ad: AdData;
  onImpression: (adId: string) => void;
  onClick: (adId: string) => void;
}

const AdCard: React.FC<AdCardProps> = ({ ad, onImpression, onClick }) => {
  // Track impression when ad comes into view
  useEffect(() => {
    onImpression(ad.id);
  }, [ad.id, onImpression]);

  const handleClick = () => {
    onClick(ad.id);
    
    // Handle different ad types
    switch (ad.adType) {
      case 'brand':
        toast.success('Exploring Nike products...');
        break;
      case 'platform':
        toast.success('Join our creator platform...');
        break;
      case 'premium':
        toast.success('Showing premium features...');
        break;
      case 'event':
        toast.success('Joining live event...');
        break;
      case 'creator':
        toast.success('Connecting with creator...');
        break;
      default:
        toast.success('Opening link...');
    }
  };

  // Map image URLs to imported assets for proper bundling
  const getImageSrc = (imageUrl: string) => {
    if (imageUrl.includes('ad-creators')) return adCreators;
    if (imageUrl.includes('ad-events')) return adEvents;
    if (imageUrl.includes('ad-premium')) return adPremium;
    if (imageUrl.includes('ad-nike')) return adNike;
    if (imageUrl.includes('ad-platform')) return adPlatform;
    return imageUrl;
  };

  return (
    <div 
      className="group relative overflow-hidden cursor-pointer"
      onClick={handleClick}
    >
      <div className="relative h-20 w-full overflow-hidden rounded-lg">
        <img
          src={getImageSrc(ad.imageUrl)}
          alt={ad.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 rounded-lg"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export const AdPanel: React.FC<AdPanelProps> = ({ 
  className,
  variant = 'default',
  background = 'gray',
  showBorder = true,
  borderColor = 'gray'
}) => {
  const { getActiveAds, trackImpression, trackClick, loading, error } = useAdManager();
  
  const activeAds = getActiveAds();
  const hasAds = activeAds.length > 0;

  if (loading || error || !hasAds) {
    return null;
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'compact':
        return 'py-1';
      case 'large':
        return 'py-3';
      default:
        return 'py-2';
    }
  };

  const getBackgroundClasses = () => {
    switch (background) {
      case 'white':
        return 'bg-white';
      case 'transparent':
        return 'bg-transparent';
      default:
        return 'bg-gray-50';
    }
  };

  const getBorderClasses = () => {
    if (!showBorder) return '';
    return borderColor === 'muted' ? 'border-b border-muted' : 'border-b border-gray-400';
  };

  return (
    <div 
      className={cn(
        "w-full",
        getBackgroundClasses(),
        getBorderClasses(),
        className
      )}
    >
      <div className={cn("px-4", getVariantClasses())}>
        <Carousel
          opts={{
            align: "start",
            dragFree: false,
            containScroll: "trimSnaps",
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-3">
            {activeAds.map((ad) => (
              <CarouselItem key={ad.id} className="basis-1/3 pl-3">
                <AdCard
                  ad={ad}
                  onImpression={trackImpression}
                  onClick={trackClick}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  );
};