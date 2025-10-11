import notificationSound from '@/assets/notification-sound.mp3';

class AudioNotificationManager {
  private audio: HTMLAudioElement | null = null;
  private initialized = false;

  initialize() {
    if (this.initialized) return;
    
    try {
      this.audio = new Audio(notificationSound);
      this.audio.volume = 0.5;
      this.audio.preload = 'auto';
      this.initialized = true;
      console.log('[AudioNotifications] Initialized');
    } catch (error) {
      console.error('[AudioNotifications] Failed to initialize:', error);
    }
  }

  async playNotification() {
    if (!this.audio) this.initialize();

    try {
      if (this.audio) {
        this.audio.currentTime = 0;
        await this.audio.play();
        console.log('[AudioNotifications] Played notification sound');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        console.warn('[AudioNotifications] Autoplay blocked by browser');
      } else {
        console.error('[AudioNotifications] Error playing sound:', error);
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
