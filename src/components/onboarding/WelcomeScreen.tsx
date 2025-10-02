import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface WelcomeScreenProps {
  onContinue: () => void;
  onSkip: () => void;
}

export function WelcomeScreen({ onContinue, onSkip }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-fade-in">
      <div className="w-full max-w-md space-y-8">
        {/* Glass card */}
        <div className="relative backdrop-blur-md bg-background/95 rounded-2xl p-8 shadow-2xl border border-border/50">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl blur-xl -z-10" />
          
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-primary/20 backdrop-blur-sm">
              <Sparkles className="w-12 h-12 text-primary" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Welcome to Skip Creator
            </h1>
            <p className="text-lg text-muted-foreground">
              Let's set up your profile so people can discover you
            </p>
          </div>

          {/* Actions */}
          <div className="mt-8 space-y-3">
            <Button
              onClick={onContinue}
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
            >
              Get Started
            </Button>
            <Button
              onClick={onSkip}
              variant="ghost"
              size="lg"
              className="w-full"
            >
              Skip for now
            </Button>
          </div>
        </div>

        {/* Info text */}
        <p className="text-center text-sm text-muted-foreground">
          You can always complete this later, but you'll need a complete profile to appear in search
        </p>
      </div>
    </div>
  );
}
