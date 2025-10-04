import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lovable.skipcreator',
  appName: 'SkipAmerica',
  webDir: 'dist',
  server: {
    url: 'https://15f46a1e-4701-482b-98fb-246120c30114.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    },
    Filesystem: {
      permissions: ['publicStorage']
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#F4FDFB'
    },
    Keyboard: {
      resize: 'none'
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '855084043919-hdr8naup9khbi2jor4qov171pvdjda7h.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  },
  ios: {
    contentInset: 'never',
    scrollEnabled: true,
    backgroundColor: '#F4FDFB',
    inputAccessoryViewDisplayMode: 'never',
    hideInputAccessoryView: true
  }
};

export default config;