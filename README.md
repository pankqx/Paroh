# Paroh

Paroh is an offline-first, privacy-first, open-source Personal Operating System where journaling is at the center of the experience.

## Current status

All nine roadmap phases are implemented, including Ubuntu and Windows packages (`npm run build:ubuntu`, `npm run build:windows`), an Android app (see `docs/mobile.md`) and two opt-in AI features (a Claude-written Editor's Note in Chapters with your own API key, and on-device transcription): an Electron desktop app with a Canvas dashboard, an Editor, search, a calendar, habits, to-dos, audio logs, a 24-week healing prompt programme, monthly Chapters and a Horizons life timeline. Entries are saved as plain Markdown files with YAML frontmatter in a folder you own, through the atomic save pipeline in `docs/architecture.md`. See `docs/tasks.md` for what is done and what comes next.

## Run it

Requires Node.js 22 or newer.

```bash
npm install
npm run dev            # start the app with hot reload
npm run build:ubuntu   # build dist/*.deb and dist/*.AppImage
npm run build:windows  # on Windows: build dist/Paroh-Setup-*.exe
npm run dev:mobile     # the phone app in a browser, at phone size
npm run build:android  # with the Android SDK: build the debug APK
```

Install the `.deb` with `sudo apt install ./dist/Paroh-*.deb`, or make the `.AppImage` executable and run it.

Your vault defaults to `~/Paroh`. On first launch Paroh asks where to keep it; change it later in **Settings**, or set `PAROH_VAULT=/path/to/folder` when starting the app.

Each day is one file: `<vault>/YYYY-MM/YYYY-MM-DD.md`. You can open, edit or back up these files with any editor.

## Checks

```bash
npm run lint
npm run typecheck
npm test           # vault, frontmatter and domain logic
npm run test:a11y  # axe-core pass over the Canvas and Editor components
npm run build      # production build into out/
```

## Start here

1. PRODUCT.md — the master product constitution
2. docs/vision.md — the product philosophy and long-term intent
3. docs/architecture.md — technical decisions and constraints
4. docs/folder-structure.md — repository and vault layout
5. docs/design-system.md — visual language and tokens
6. docs/roadmap.md + docs/tasks.md — current plan and progress
7. docs/decisions.md — the smaller, documented product decisions
