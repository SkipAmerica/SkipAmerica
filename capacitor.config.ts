import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.15f46a1e4701482b98fb246120c30114',
  appName: 'Skip',
  webDir: 'dist',
  server: {
    url: 'https://15f46a1e-4701-482b-98fb-246120c30114.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;