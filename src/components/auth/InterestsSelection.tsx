import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, Heart, Star, Briefcase, Palette, Music, Camera, Gamepad2, Dumbbell, Utensils, BookOpen, Laptop, Mic, TrendingUp, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/auth-provider';

interface InterestsSelectionProps {
  onComplete: () => void;
}

const INTEREST_CATEGORIES = [
  {
    id: 'entertainment',
    label: 'Entertainment & Celebrity',
    icon: Star,
    description: 'Actors, musicians, TV personalities',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500'
  },
  {
    id: 'technology',
    label: 'Technology',
    icon: Laptop,
    description: 'Tech experts, developers, innovators',
    color: 'bg-gradient-to-r from-blue-500 to-cyan-500'
  },
  {
    id: 'business',
    label: 'Business & Entrepreneurship',
    icon: TrendingUp,
    description: 'Business leaders, entrepreneurs, investors',
    color: 'bg-gradient-to-r from-green-500 to-emerald-500'
  },
  {
    id: 'beauty',
    label: 'Beauty & Fashion',
    icon: Heart,
    description: 'Beauty gurus, fashion influencers, stylists',
    color: 'bg-gradient-to-r from-pink-500 to-rose-500'
  },
  {
    id: 'fitness',
    label: 'Fitness & Health',
    icon: Dumbbell,
    description: 'Trainers, nutritionists, wellness experts',
    color: 'bg-gradient-to-r from-orange-500 to-red-500'
  },
  {
    id: 'food',
    label: 'Food & Cooking',
    icon: Utensils,
    description: 'Chefs, food critics, culinary experts',
    color: 'bg-gradient-to-r from-amber-500 to-yellow-500'
  },
  {
    id: 'education',
    label: 'Education & Learning',
    icon: BookOpen,
    description: 'Teachers, researchers, thought leaders',
    color: 'bg-gradient-to-r from-indigo-500 to-purple-500'
  },
  {
    id: 'creative',
    label: 'Creative Arts',
    icon: Palette,
    description: 'Artists, designers, creative professionals',
    color: 'bg-gradient-to-r from-violet-500 to-purple-500'
  },
  {
    id: 'music',
    label: 'Music & Audio',
    icon: Music,
    description: 'Musicians, producers, audio professionals',
    color: 'bg-gradient-to-r from-red-500 to-pink-500'
  },
  {
    id: 'photography',
    label: 'Photography & Visual',
    icon: Camera,
    description: 'Photographers, videographers, visual artists',
    color: 'bg-gradient-to-r from-cyan-500 to-blue-500'
  },
  {
    id: 'gaming',
    label: 'Gaming & Esports',
    icon: Gamepad2,
    description: 'Gamers, streamers, esports professionals',
    color: 'bg-gradient-to-r from-purple-600 to-indigo-600'
  },
  {
    id: 'podcast',
    label: 'Podcasting & Media',
    icon: Mic,
    description: 'Podcasters, journalists, media personalities',
    color: 'bg-gradient-to-r from-teal-500 to-green-500'
  }
];

export function InterestsSelection({ onComplete }: InterestsSelectionProps) {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const handleInterestToggle = (interestId: string) => {
    setSelectedInterests(prev => {
      if (prev.includes(interestId)) {
        return prev.filter(id => id !== interestId);
      } else {
        return [...prev, interestId];
      }
    });
  };

  const handleSaveInterests = async () => {
    if (!user || selectedInterests.length === 0) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          interests: selectedInterests 
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      onComplete();
    } catch (error) {
      console.error('Error saving interests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-creator">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-gradient-primary rounded-full">
            <Users className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
        <CardTitle className="text-2xl bg-gradient-hero bg-clip-text text-transparent">
          What interests you?
        </CardTitle>
        <CardDescription>
          Select topics you're interested in to discover relevant creators and content. You can always change these later.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Interest Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {INTEREST_CATEGORIES.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedInterests.includes(category.id);
              
              return (
                <div
                  key={category.id}
                  className={`
                    relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
                    ${isSelected 
                      ? 'border-primary bg-primary/5 shadow-md' 
                      : 'border-border hover:border-primary/50 hover:bg-accent/50'
                    }
                  `}
                  onClick={() => handleInterestToggle(category.id)}
                >
                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-primary rounded-full p-1">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  
                  {/* Icon with gradient background */}
                  <div className={`inline-flex p-3 rounded-full ${category.color} mb-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  
                  {/* Content */}
                  <div>
                    <h3 className="font-semibold text-sm mb-1">{category.label}</h3>
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Selected Count */}
          {selectedInterests.length > 0 && (
            <div className="text-center">
              <Badge variant="secondary" className="px-4 py-2">
                {selectedInterests.length} interest{selectedInterests.length === 1 ? '' : 's'} selected
              </Badge>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setSelectedInterests([]);
                onComplete();
              }}
            >
              Skip for now
            </Button>
            <Button
              className="flex-1"
              variant="gradient"
              onClick={handleSaveInterests}
              disabled={isLoading || selectedInterests.length === 0}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue with {selectedInterests.length} interest{selectedInterests.length === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}