import { supabase } from '@/integrations/supabase/client';

export interface OnboardingState {
  creatorId: string;
  hasPhoto: boolean;
  hasDisplayName: boolean;
  hasTagline: boolean;
  industriesCount: number;
  percentComplete: number;
  searchUnlocked: boolean;
  lastNudgedAt: string | null;
  onboardingSkipped: boolean;
  onboardingCompletedAt: string | null;
}

type ProgressCallback = (data: { oldPercent: number; newPercent: number }) => void;
type UnlockCallback = () => void;
type StepCallback = (stepName: string) => void;

export class ProfileProgressTracker {
  private creatorId: string;
  private state: OnboardingState | null = null;
  private progressCallbacks: ProgressCallback[] = [];
  private unlockCallbacks: UnlockCallback[] = [];
  private stepCallbacks: StepCallback[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;

  private readonly weights = {
    photo: 30,
    displayName: 20,
    tagline: 20,
    firstIndustry: 30,
  };

  constructor(creatorId: string) {
    this.creatorId = creatorId;
  }

  async syncFromServer(): Promise<OnboardingState> {
    const { data, error } = await supabase
      .from('creator_onboarding')
      .select('*')
      .eq('creator_id', this.creatorId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      // Initialize if doesn't exist
      const { data: newData, error: insertError } = await supabase
        .from('creator_onboarding')
        .insert({
          creator_id: this.creatorId,
          has_photo: false,
          has_display_name: false,
          has_tagline: false,
          industries_count: 0,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      
      this.state = this.mapDbToState(newData);
      return this.state;
    }

    this.state = this.mapDbToState(data);
    return this.state;
  }

  async markPhotoComplete(url: string): Promise<void> {
    const oldPercent = this.state?.percentComplete || 0;
    
    await this.updateServer({ has_photo: true });
    await this.syncFromServer();
    
    this.emitStepCompleted('photo');
    this.emitProgressChanged(oldPercent, this.state?.percentComplete || 0);
  }

  async setDisplayName(name: string): Promise<void> {
    const oldPercent = this.state?.percentComplete || 0;
    
    // Update creator table
    await supabase
      .from('creators')
      .update({ full_name: name })
      .eq('id', this.creatorId);
    
    await this.updateServer({ has_display_name: true });
    await this.syncFromServer();
    
    this.emitStepCompleted('displayName');
    this.emitProgressChanged(oldPercent, this.state?.percentComplete || 0);
  }

  async setTagline(text: string): Promise<void> {
    const oldPercent = this.state?.percentComplete || 0;
    
    // Update creator table
    await supabase
      .from('creators')
      .update({ headline: text })
      .eq('id', this.creatorId);
    
    await this.updateServer({ has_tagline: true });
    await this.syncFromServer();
    
    this.emitStepCompleted('tagline');
    this.emitProgressChanged(oldPercent, this.state?.percentComplete || 0);
  }

  async setIndustries(tags: string[]): Promise<void> {
    const oldPercent = this.state?.percentComplete || 0;
    const wasUnlocked = this.state?.searchUnlocked || false;
    
    // Update creator table
    await supabase
      .from('creators')
      .update({ categories: tags })
      .eq('id', this.creatorId);
    
    await this.updateServer({ industries_count: tags.length });
    await this.syncFromServer();
    
    this.emitStepCompleted('industries');
    this.emitProgressChanged(oldPercent, this.state?.percentComplete || 0);
    
    if (!wasUnlocked && this.state?.searchUnlocked) {
      this.emitUnlockSearch();
    }
  }

  async skipOnboarding(): Promise<void> {
    await this.updateServer({ onboarding_skipped: true });
    await this.syncFromServer();
  }

  getState(): OnboardingState | null {
    return this.state;
  }

  private async updateServer(updates: Partial<Record<string, any>>): Promise<void> {
    const { error } = await supabase
      .from('creator_onboarding')
      .update(updates)
      .eq('creator_id', this.creatorId);

    if (error) throw error;
  }

  private mapDbToState(data: any): OnboardingState {
    return {
      creatorId: data.creator_id,
      hasPhoto: data.has_photo,
      hasDisplayName: data.has_display_name,
      hasTagline: data.has_tagline,
      industriesCount: data.industries_count,
      percentComplete: data.percent_complete,
      searchUnlocked: data.search_unlocked,
      lastNudgedAt: data.last_nudged_at,
      onboardingSkipped: data.onboarding_skipped,
      onboardingCompletedAt: data.onboarding_completed_at,
    };
  }

  // Event subscription methods
  onProgressChanged(callback: ProgressCallback): () => void {
    this.progressCallbacks.push(callback);
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter(cb => cb !== callback);
    };
  }

  onUnlockSearch(callback: UnlockCallback): () => void {
    this.unlockCallbacks.push(callback);
    return () => {
      this.unlockCallbacks = this.unlockCallbacks.filter(cb => cb !== callback);
    };
  }

  onStepCompleted(callback: StepCallback): () => void {
    this.stepCallbacks.push(callback);
    return () => {
      this.stepCallbacks = this.stepCallbacks.filter(cb => cb !== callback);
    };
  }

  private emitProgressChanged(oldPercent: number, newPercent: number): void {
    this.progressCallbacks.forEach(cb => cb({ oldPercent, newPercent }));
  }

  private emitUnlockSearch(): void {
    this.unlockCallbacks.forEach(cb => cb());
  }

  private emitStepCompleted(stepName: string): void {
    this.stepCallbacks.forEach(cb => cb(stepName));
  }
}
