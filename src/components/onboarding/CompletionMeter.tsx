import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnboardingState } from '@/lib/onboarding/ProfileProgressTracker';

interface CompletionMeterProps {
  state: OnboardingState;
  onFinish: () => void;
}

export function CompletionMeter({ state, onFinish }: CompletionMeterProps) {
  const items = [
    { label: 'Profile Photo', completed: state.hasPhoto },
    { label: 'Display Name', completed: state.hasDisplayName },
    { label: 'Tagline', completed: state.hasTagline },
    { label: 'Industry', completed: state.industriesCount >= 1 },
  ];

  const isComplete = state.percentComplete === 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-fade-in">
      <div className="w-full max-w-md space-y-8">
        <div className="relative backdrop-blur-md bg-background/95 rounded-2xl p-8 shadow-2xl border border-border/50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl blur-xl -z-10" />

          <div className="text-center space-y-8">
            {/* Progress Circle */}
            <div className="flex justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-border"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - state.percentComplete / 100)}`}
                    className="transition-all duration-500"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--accent))" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {state.percentComplete}%
                  </span>
                </div>
              </div>
            </div>

            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold">
                {isComplete ? 'Profile Complete!' : 'Almost There'}
              </h2>
              <p className="text-muted-foreground mt-2">
                {isComplete 
                  ? 'You can now appear in search and discovery'
                  : 'Complete your profile to unlock search visibility'
                }
              </p>
            </div>

            {/* Checklist */}
            <div className="space-y-3 text-left">
              {items.map((item, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-colors",
                    item.completed ? "bg-primary/10" : "bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center",
                    item.completed ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    {item.completed ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </div>
                  <span className={cn(
                    "font-medium",
                    item.completed ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Action */}
            <Button
              onClick={onFinish}
              size="lg"
              className="w-full"
            >
              {isComplete ? 'Enter App' : 'Continue Later'}
            </Button>

            {!isComplete && (
              <p className="text-sm text-muted-foreground">
                You can complete your profile anytime from settings
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
