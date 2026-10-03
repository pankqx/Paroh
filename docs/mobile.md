# Mobile (Android)

The phone app is the same React app as the desktop, wrapped with Capacitor. It reads and writes the same vault format, so an entry written on the phone opens unchanged on the computer and the other way round.

## Getting the app

- **From GitHub:** every pull request into `main` and every `v*` tag runs the **Build Android** workflow. Open the run, download the `paroh-android-debug` artifact, unzip it and install `app-debug.apk` on the phone (Android asks you to allow installs from that source once).
- **Locally:** install Android Studio (or the Android SDK and Java 21), then run `npm run build:android`. The APK lands in `android/app/build/outputs/apk/debug/`.
- **In a browser:** `npm run dev:mobile` serves the phone build; use the browser's device toolbar for a phone-sized window. It stores the vault in the browser (IndexedDB), so this is for trying the layout, not for journaling.

## Where the journal lives

`Documents/Paroh` on the phone, with the same layout as the desktop vault (`YYYY-MM/YYYY-MM-DD.md`, `.paroh/`, `audio/`, `horizons/`). The search index is rebuilt in memory each time the app starts.

## Syncing with your computer

Paroh has no cloud of its own. Point a sync tool you trust at both folders, for example Syncthing (phone `Documents/Paroh` ↔ computer `~/Paroh`). When Paroh comes back to the foreground it re-reads anything the sync tool changed.

**Known limit on Android 11 and newer:** Android only lets an app read files in shared folders that the app created itself. Entries Paroh writes are always readable; entries a sync app copies in from the computer may not be, unless the sync app writes them as the same files Paroh created or the phone grants broader storage access. This has to be checked on a real phone; if it bites, the fix is a folder picker using Android's Storage Access Framework, tracked in `docs/tasks.md`.

## What is desktop-only for now

Export and import, the daily reminder, the AI features (Editor's Note and transcription) and changing the vault folder. The phone's Settings page says so. Writing, mood, habits, to-dos, audio recording, healing prompts, Chapters, Horizons, search and the calendar all work on the phone.

## How it fits together

- `src/mobile-main/main.ts` installs `window.paroh` from `mobileApi.ts`, then starts `src/renderer/main.tsx`.
- `mobileApi.ts` runs `VaultService` and the stores over `CapacitorVaultFs` with `MemoryIndex`.
- `vite.mobile.config.ts` builds `out/mobile`, which `npx cap sync android` copies into the Android project. The transcription runtime is swapped for a stub to keep the bundle small.
- `tsconfig.mobile.json` type-checks this bundle without Node types, so anything that pulls `node:` modules into the phone build fails `npm run typecheck`.
