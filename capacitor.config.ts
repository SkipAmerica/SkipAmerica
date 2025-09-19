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
      style: 'default',
      backgroundColor: '#ffffff'
    }
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#ffffff'
  }
};

export default config;