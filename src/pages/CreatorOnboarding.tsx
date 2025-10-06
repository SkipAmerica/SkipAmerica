import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/auth-provider';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { useKeyboardAware } from '@/hooks/use-keyboard-aware';
import { supabase } from '@/integrations/supabase/client';
import { WelcomeScreen } from '@/components/onboarding/WelcomeScreen';
import { ProfileSetupStep } from '@/components/onboarding/ProfileSetupStep';
import { IndustryCarouselStep } from '@/components/onboarding/IndustryCarouselStep';
import { CompletionMeter } from '@/components/onboarding/CompletionMeter';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

type OnboardingStep = 'welcome' | 'profileSetup' | 'industries' | 'completion';

export default function CreatorOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [completedSteps, setCompletedSteps] = useState<Set<OnboardingStep>>(new Set());
  const [creatorData, setCreatorData] = useState<{
    avatar_url?: string;
    full_name?: string;
    headline?: string;
    bio?: string;
    username?: string;
  } | null>(null);
  const [hasShownSkipWarning, setHasShownSkipWarning] = useState(false);
  const { keyboardHeight, isKeyboardVisible } = useKeyboardAware();
  
  const {
    state,
    loading,
    markPhotoComplete,
    setDisplayName,
    setTagline,
    setIndustries,
    skipOnboarding,
  } = useOnboardingProgress(user?.id || '');

  // Fetch existing creator data on mount
  useEffect(() => {
    if (!user?.id) return;

    const fetchCreatorData = async () => {
      const { data, error } = await supabase
        .from('creators')
        .select('avatar_url, full_name, headline, bio, username')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data) {
        setCreatorData(data);
      }
    };

    fetchCreatorData();
  }, [user?.id]);

  // Make status bar transparent on Onboarding (iOS only)
  useEffect(() => {
    let cleanupFn: (() => Promise<void>) | null = null
    
    const setTransparentStatusBar = async () => {
      const { Capacitor } = await import('@capacitor/core')
      if (Capacitor.getPlatform() !== 'ios') return
      
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        
        // Make status bar transparent on Onboarding
        await StatusBar.setOverlaysWebView({ overlay: true })
        await StatusBar.setStyle({ style: Style.Light })
        
        // Store cleanup function
        cleanupFn = async () => {
          await StatusBar.setOverlaysWebView({ overlay: false })
          await StatusBar.setBackgroundColor({ color: "#FFFFFF" })
          await StatusBar.setStyle({ style: Style.Light })
        }
      } catch (error) {
        console.warn('[StatusBar] Failed to set transparent status bar:', error)
      }
    }
    
    setTransparentStatusBar()
    
    return () => {
      if (cleanupFn) {
        cleanupFn().catch(err => console.warn('[StatusBar] Cleanup error:', err))
      }
    }
  }, [])

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

  const showSkipWarningOnce = () => {
    if (!hasShownSkipWarning) {
      toast.warning(
        "You won't appear in search results until you complete your profile",
        {
          duration: 6000,
        }
      );
      setHasShownSkipWarning(true);
    }
  };

  const handleSkip = async () => {
    showSkipWarningOnce();
    try {
      await skipOnboarding();
      toast.info('You can complete your profile anytime from settings');
      navigate('/');
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    }
  };

  const getProgressValue = (step: OnboardingStep): number => {
    switch (step) {
      case 'welcome': return 0;
      case 'profileSetup': return 15;
      case 'industries': return 50;
      case 'completion': return 100;
      default: return 0;
    }
  };
  const progressValue = getProgressValue(currentStep);

  const handleBack = () => {
    if (currentStep === 'industries') setCurrentStep('profileSetup');
    if (currentStep === 'completion') setCurrentStep('industries');
  };

  const handleForward = () => {
    if (currentStep === 'profileSetup' && completedSteps.has('profileSetup')) {
      setCurrentStep('industries');
    }
    if (currentStep === 'industries' && completedSteps.has('industries')) {
      setCurrentStep('completion');
    }
  };

  const canGoBack = currentStep !== 'profileSetup' && currentStep !== 'welcome';
  const canGoForward = completedSteps.has(currentStep as Exclude<OnboardingStep, 'welcome' | 'completion'>);

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
    <div 
      className="relative min-h-screen overflow-y-auto bg-gradient-splash"
      style={{
        paddingBottom: isKeyboardVisible ? `${keyboardHeight}px` : undefined,
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* Progress Bar - Only show after welcome */}
      {currentStep !== 'welcome' && (
        <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/10 border-b border-white/20">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                disabled={!canGoBack}
                className="shrink-0 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Progress value={progressValue} className="flex-1" />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleForward}
                disabled={!canGoForward}
                className="shrink-0 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={currentStep !== 'welcome' ? 'pt-20' : ''}>
        {currentStep === 'welcome' && (
          <WelcomeScreen
            onContinue={() => setCurrentStep('profileSetup')}
            onSkip={handleSkip}
          />
        )}

        {currentStep === 'profileSetup' && (
          <ProfileSetupStep
            creatorId={user!.id}
            existingPhotoUrl={creatorData?.avatar_url}
            existingDisplayName={creatorData?.full_name}
            existingTitle={creatorData?.headline}
            existingTagline={creatorData?.bio}
            existingUsername={creatorData?.username}
            onComplete={async (photoUrl, name, title, tagline, username) => {
              if (photoUrl) {
                await markPhotoComplete(photoUrl);
              }
              await setDisplayName(name);
              
              // Save title (headline) and bio
              const { error: creatorUpdateError } = await supabase
                .from('creators')
                .update({ 
                  headline: title,
                  bio: tagline 
                })
                .eq('id', user!.id);
              
              if (creatorUpdateError) {
                console.error('Error updating creator:', creatorUpdateError);
                toast.error('Failed to save profile details');
                return;
              }
              
              await setTagline(title);
              
              // Save username to both profiles and creators
              const { error: profileError } = await supabase
                .from('profiles')
                .update({ username: username.toLowerCase() })
                .eq('id', user!.id);
              
              if (profileError) {
                console.error('Error updating profile username:', profileError);
                toast.error('Failed to save username');
                return;
              }

              const { error: creatorError } = await supabase
                .from('creators')
                .update({ username: username.toLowerCase() })
                .eq('id', user!.id);
              
              if (creatorError) {
                console.error('Error updating creator username:', creatorError);
                toast.error('Failed to save username');
                return;
              }

              // Update onboarding tracking
              const { error: onboardingError } = await supabase
                .from('creator_onboarding')
                .update({ has_username: true })
                .eq('creator_id', user!.id);
                
              if (onboardingError) {
                console.error('Error updating onboarding:', onboardingError);
              }

              setCompletedSteps(prev => new Set(prev).add('profileSetup'));
              setCurrentStep('industries');
            }}
            onSkip={() => {
              showSkipWarningOnce();
              setCompletedSteps(prev => new Set(prev).add('profileSetup'));
              setCurrentStep('industries');
            }}
          />
        )}

        {currentStep === 'industries' && (
          <IndustryCarouselStep
            onComplete={async (industries) => {
              await setIndustries(industries);
              setCompletedSteps(prev => new Set(prev).add('industries'));
              setCurrentStep('completion');
            }}
            onSkip={() => {
              showSkipWarningOnce();
              setCompletedSteps(prev => new Set(prev).add('industries'));
              setCurrentStep('completion');
            }}
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
