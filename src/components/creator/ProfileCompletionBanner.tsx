import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/auth-provider';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileCompletionBannerProps {
  onDismiss?: () => void;
}

export function ProfileCompletionBanner({ onDismiss }: ProfileCompletionBannerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, loading } = useOnboardingProgress(user?.id || '');

  if (loading || !state || state.searchUnlocked) {
    return null;
  }

  return (
    <div className={cn(
      "relative backdrop-blur-md bg-gradient-to-r from-amber-500/10 to-orange-500/10",
      "border border-amber-500/20 rounded-2xl p-4 animate-fade-in"
    )}>
      <div className="flex items-start gap-4">
        <div className="shrink-0 mt-1">
          <AlertCircle className="w-5 h-5 text-amber-500" />
        </div>
        
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="font-semibold text-sm">Complete your profile to unlock discovery</h3>
            <p className="text-xs text-muted-foreground mt-1">
              You won't appear in search results until your profile is complete. Takes just 1-2 minutes!
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{state.percentComplete}% complete</span>
              <span className="font-medium">{100 - state.percentComplete}% remaining</span>
            </div>
            <Progress value={state.percentComplete} className="h-2" />
          </div>

          <Button
            onClick={() => navigate('/onboarding/creator')}
            size="sm"
            className="w-full sm:w-auto"
          >
            Complete Profile Now
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className="shrink-0 h-8 w-8"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
