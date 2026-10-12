import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nyvex.agent',
  appName: 'NYVEX',
  webDir: 'www',
  server: {
    url: 'https://nyvex-kati.onrender.com',
    cleartext: false,
    allowNavigation: ['nyvex-kati.onrender.com']
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
