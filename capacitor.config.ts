import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.comprasplus.app',
  appName: 'Compras Plus',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#006948',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#006948',
  },
};

export default config;
