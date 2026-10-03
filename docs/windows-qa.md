# Windows QA checklist

Roadmap Phase 7 asks for parity with the Ubuntu build, verified on a real Windows machine. CI builds the installer (`Build Windows` workflow, `npm run build:windows`) and runs the full unit suite on `windows-latest`. These checks need a person at a Windows 10 or 11 machine.

Install `Paroh-Setup-<version>.exe` from the workflow's `paroh-windows` artifact. Windows SmartScreen will warn because the installer is not code-signed yet; choose "More info" then "Run anyway".

## Install and launch
- [ ] The installer offers a folder choice and does not ask for admin rights.
- [ ] Start menu and desktop shortcuts appear with the Paroh icon.
- [ ] First launch shows onboarding with `C:\Users\<you>\Paroh` as the folder.
- [ ] Launching a second time focuses the open window instead of opening another.

## Files and paths
- [ ] Writing an entry creates `Paroh\YYYY-MM\YYYY-MM-DD.md`; it opens cleanly in Notepad.
- [ ] Editing that file in Notepad while Paroh is open updates the entry in the app.
- [ ] A vault on another drive (for example `D:\Journal`) and a folder name with spaces or accents both work.
- [ ] Settings → Show folder opens File Explorer at the vault.
- [ ] Export makes a `.zip` that File Explorer can open; Import into an empty folder switches to it.
- [ ] Audio recording saves to `Paroh\audio\` and plays back.
- [ ] Horizons stories save under `Paroh\horizons\<area>\`.

## Notifications
- [ ] A daily reminder set two minutes ahead appears as a Windows notification titled "A moment for you", and clicking it focuses Paroh.

## Window and keyboard
- [ ] The menu bar is hidden; `Alt` reveals it.
- [ ] `Ctrl+S` saves, `Esc` returns to the Canvas, `Ctrl+Shift+R` starts and stops a recording.
- [ ] Minimise, maximise and close behave normally; closing quits the app.

## Uninstall
- [ ] Uninstalling from Settings → Apps removes Paroh but leaves the vault folder and every entry in place.
