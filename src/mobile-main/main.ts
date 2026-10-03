import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import { CapacitorVaultFs } from './CapacitorVaultFs';
import { createMobileApi } from './mobileApi';

declare const __APP_VERSION__: string;

// The phone has no main process: install `window.paroh` first, then start the same React app as the desktop.
async function start(): Promise<void> {
  try {
    // Android 9 and older ask for storage access at runtime; newer versions need nothing for our own files.
    if (Capacitor.isNativePlatform()) await Filesystem.requestPermissions().catch(() => undefined);
    window.paroh = await createMobileApi(new CapacitorVaultFs(), __APP_VERSION__);
  } catch (e) {
    document.getElementById('root')!.textContent = `Paroh could not open its folder: ${(e as Error).message}`;
    return;
  }
  await import('../renderer/main');
}

void start();
