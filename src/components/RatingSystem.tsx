import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, ThumbsUp, ThumbsDown, CheckCircle, AlertCircle } from "lucide-react";

interface RatingSystemProps {
  isCreator: boolean;
  targetName: string;
  targetAvatar: string;
  onRatingSubmit: (rating: number, comment: string, tags: string[]) => void;
  onClose: () => void;
}

const RatingSystem = ({ 
  isCreator, 
  targetName, 
  targetAvatar, 
  onRatingSubmit, 
  onClose 
}: RatingSystemProps) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [hoveredRating, setHoveredRating] = useState(0);

  // Different tag sets for creators vs fans
  const creatorTags = [
    "Professional", "Respectful", "Engaged", "Good Audio", 
    "On Time", "Prepared", "Clear Communication", "Valuable Questions"
  ];
  
  const fanTags = [
    "Knowledgeable", "Helpful", "Patient", "Clear Explanations", 
    "Good Value", "Professional", "Engaging", "Well Prepared"
  ];

  const availableTags = isCreator ? creatorTags : fanTags;

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    if (rating === 0) return;
    onRatingSubmit(rating, comment, selectedTags);
  };

  const getRatingColor = (stars: number) => {
    if (stars <= 2) return "text-red-500";
    if (stars <= 3) return "text-yellow-500";
    return "text-green-500";
  };

  const getRatingText = (stars: number) => {
    switch(stars) {
      case 1: return "Poor";
      case 2: return "Fair"; 
      case 3: return "Good";
      case 4: return "Great";
      case 5: return "Excellent";
      default: return "";
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <Avatar>
              <AvatarFallback>{targetAvatar}</AvatarFallback>
            </Avatar>
            <div>
              <div>Rate {targetName}</div>
              <CardDescription>
                {isCreator 
                  ? "How was your experience with this fan?"
                  : "How was your call with this creator?"
                }
              </CardDescription>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Star Rating */}
          <div className="text-center">
            <div className="flex justify-center space-x-2 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className="p-1 transition-colors"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star 
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-primary text-primary'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
            
            {rating > 0 && (
              <div className={`font-semibold ${getRatingColor(rating)}`}>
                {getRatingText(rating)}
              </div>
            )}
          </div>

          {/* Quick Tags */}
          <div>
            <h4 className="font-semibold mb-3">Quick Tags (optional)</h4>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleTag(tag)}
                >
                  {selectedTags.includes(tag) && (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  )}
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <h4 className="font-semibold mb-3">
              Additional Comments {rating >= 4 ? "(optional)" : "(recommended)"}
            </h4>
            <Textarea
              placeholder={
                isCreator 
                  ? "Share your experience with this fan..."
                  : "What made this creator great? Any feedback?"
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Warning for low ratings */}
          {rating > 0 && rating <= 2 && (
            <div className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-yellow-800">Low Rating</div>
                <div className="text-yellow-700">
                  Please provide specific feedback to help improve the experience for everyone.
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Skip for Now
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={rating === 0}
              className="flex-1 bg-gradient-primary hover:bg-gradient-secondary"
            >
              Submit Rating
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            Ratings help maintain a quality community for everyone
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RatingSystem;