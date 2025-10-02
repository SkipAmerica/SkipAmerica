import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DisplayNameTaglineStepProps {
  onComplete: (displayName: string, tagline: string) => void;
  onSkip: () => void;
  existingDisplayName?: string;
  existingTagline?: string;
}

export function DisplayNameTaglineStep({ 
  onComplete, 
  onSkip, 
  existingDisplayName, 
  existingTagline 
}: DisplayNameTaglineStepProps) {
  const [displayName, setDisplayName] = useState(existingDisplayName || '');
  const [tagline, setTagline] = useState(existingTagline || '');
  const [saving, setSaving] = useState(false);
  const hasExistingData = !!(existingDisplayName || existingTagline);

  const handleContinue = async () => {
    if (!displayName.trim()) {
      toast.error('Please enter a display name');
      return;
    }

    if (!tagline.trim()) {
      toast.error('Please enter a tagline');
      return;
    }

    if (tagline.length > 100) {
      toast.error('Tagline must be 100 characters or less');
      return;
    }

    setSaving(true);
    try {
      await onComplete(displayName, tagline);
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-fade-in">
      <div className="w-full max-w-md space-y-8">
        <div className="relative backdrop-blur-md bg-background/95 rounded-2xl p-8 shadow-2xl border border-border/50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl blur-xl -z-10" />

          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold">
                {hasExistingData ? 'Review Your Info' : 'Tell Us About You'}
              </h2>
              <p className="text-muted-foreground mt-2">
                {hasExistingData ? 'Edit your details or continue' : 'Help fans find and recognize you'}
              </p>
            </div>

            {/* Display Name Field */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name or stage name"
                className="backdrop-blur-sm bg-background/50 border-border/50 focus:border-primary transition-colors"
                maxLength={50}
                disabled={saving}
              />
            </div>

            {/* Tagline Field */}
            <div className="space-y-2">
              <Label htmlFor="tagline">
                Your Tagline
                <span className="text-muted-foreground text-xs ml-2">
                  ({tagline.length}/100)
                </span>
              </Label>
              <Textarea
                id="tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Tell people what you offer in one line..."
                className="backdrop-blur-sm bg-background/50 border-border/50 focus:border-primary transition-colors resize-none"
                rows={3}
                maxLength={100}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Example: "Fitness coach helping you achieve your goals"
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4">
              <Button
                onClick={handleContinue}
                disabled={saving || !displayName.trim() || !tagline.trim()}
                size="lg"
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  hasExistingData ? 'Save & Continue' : 'Continue'
                )}
              </Button>
              <Button
                onClick={onSkip}
                variant="ghost"
                size="lg"
                className="w-full"
                disabled={saving}
              >
                Skip for now
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {displayName && tagline ? '70%' : '50%'} of profile completion
        </p>
      </div>
    </div>
  );
}
