import type { CapacitorConfig } from '@capacitor/cli';

// The phone app (roadmap Phase 9). `npm run build:mobile` fills out/mobile, then `npx cap sync android`.
const config: CapacitorConfig = {
  appId: 'org.paroh.app',
  appName: 'Paroh',
  webDir: 'out/mobile',
  android: { backgroundColor: '#F3F1EA' },
};

export default config;
