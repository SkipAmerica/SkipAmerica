import notificationSound from '@/assets/notification-sound.mp3';

class AudioNotificationManager {
  private audio: HTMLAudioElement | null = null;
  private initialized = false;

  initialize() {
    console.log('[AudioNotifications] initialize() called');
    console.log('[AudioNotifications] Already initialized?', this.initialized);
    
    if (this.initialized) return;
    
    try {
      console.log('[AudioNotifications] Creating Audio instance...');
      console.log('[AudioNotifications] Audio file path:', notificationSound);
      this.audio = new Audio(notificationSound);
      this.audio.volume = 0.5;
      this.audio.preload = 'auto';
      this.initialized = true;
      console.log('[AudioNotifications] ✅ Initialized successfully');
      console.log('[AudioNotifications] Audio element:', this.audio);
    } catch (error) {
      console.error('[AudioNotifications] ❌ Failed to initialize:', error);
    }
  }

  async playNotification() {
    console.log('[AudioNotifications] playNotification() called');
    console.log('[AudioNotifications] this.audio:', this.audio);
    console.log('[AudioNotifications] this.initialized:', this.initialized);
    
    if (!this.audio) {
      console.log('[AudioNotifications] No audio instance, initializing...');
      this.initialize();
    }

    try {
      if (this.audio) {
        console.log('[AudioNotifications] Resetting currentTime and playing...');
        this.audio.currentTime = 0;
        await this.audio.play();
        console.log('[AudioNotifications] ✅ Played notification sound successfully');
      } else {
        console.error('[AudioNotifications] ❌ Audio instance is null after initialization');
      }
    } catch (error) {
      console.error('[AudioNotifications] ❌ Error playing sound:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        console.warn('[AudioNotifications] 🚫 Autoplay blocked by browser policy - user interaction required');
      } else if (error instanceof DOMException) {
        console.error('[AudioNotifications] DOMException details:', {
          name: error.name,
          message: error.message,
          code: error.code
        });
      } else {
        console.error('[AudioNotifications] Unknown error type:', error);
      }
    }
  }

  setVolume(volume: number) {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }
}

export const audioNotifications = new AudioNotificationManager();
