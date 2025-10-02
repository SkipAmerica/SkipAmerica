import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/auth-provider';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { WelcomeScreen } from '@/components/onboarding/WelcomeScreen';
import { PhotoUploadStep } from '@/components/onboarding/PhotoUploadStep';
import { DisplayNameTaglineStep } from '@/components/onboarding/DisplayNameTaglineStep';
import { IndustryCarouselStep } from '@/components/onboarding/IndustryCarouselStep';
import { CompletionMeter } from '@/components/onboarding/CompletionMeter';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { toast } from 'sonner';

type OnboardingStep = 'welcome' | 'photo' | 'profile' | 'industries' | 'completion';

export default function CreatorOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  
  const {
    state,
    loading,
    markPhotoComplete,
    setDisplayName,
    setTagline,
    setIndustries,
    skipOnboarding,
  } = useOnboardingProgress(user?.id || '');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // If already completed, redirect
    if (state?.searchUnlocked) {
      navigate('/');
    }
  }, [user, state, navigate]);

  const handleSkip = async () => {
    try {
      await skipOnboarding();
      toast.info('You can complete your profile anytime from settings');
      navigate('/');
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    }
  };

  const progressSteps: OnboardingStep[] = ['welcome', 'photo', 'profile', 'industries', 'completion'];
  const currentStepIndex = progressSteps.indexOf(currentStep);
  const progressValue = ((currentStepIndex + 1) / progressSteps.length) * 100;

  if (loading || !state) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Progress Bar - Only show after welcome */}
      {currentStep !== 'welcome' && (
        <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Progress value={progressValue} className="flex-1" />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkip}
                className="shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={currentStep !== 'welcome' ? 'pt-20' : ''}>
        {currentStep === 'welcome' && (
          <WelcomeScreen
            onContinue={() => setCurrentStep('photo')}
            onSkip={handleSkip}
          />
        )}

        {currentStep === 'photo' && (
          <PhotoUploadStep
            creatorId={user!.id}
            onComplete={async (url) => {
              await markPhotoComplete(url);
              setCurrentStep('profile');
            }}
            onSkip={() => setCurrentStep('profile')}
          />
        )}

        {currentStep === 'profile' && (
          <DisplayNameTaglineStep
            onComplete={async (name, tagline) => {
              await setDisplayName(name);
              await setTagline(tagline);
              setCurrentStep('industries');
            }}
            onSkip={() => setCurrentStep('industries')}
          />
        )}

        {currentStep === 'industries' && (
          <IndustryCarouselStep
            onComplete={async (industries) => {
              await setIndustries(industries);
              setCurrentStep('completion');
            }}
            onSkip={() => setCurrentStep('completion')}
          />
        )}

        {currentStep === 'completion' && (
          <CompletionMeter
            state={state}
            onFinish={() => navigate('/')}
          />
        )}
      </div>
    </div>
  );
}
