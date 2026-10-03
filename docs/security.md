# Security

> This expands `architecture.md`'s Security Architecture section into implementation-level detail. That section stays authoritative for philosophy; this file is where philosophy meets specifics. Keep them in sync — if one changes, check the other the same day.

---

## Threat Model (detailed)

| Threat | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Malicious/buggy future plugin reading vault content it shouldn't | Medium (once plugins exist) | High | Plugin code runs renderer-side under `contextIsolation`; all vault access routes through the same `VaultAdapter` IPC contract as core, no direct `fs`/network access ever granted |
| Renderer-side XSS via pasted/untrusted content (e.g., pasted HTML) | Medium | Medium | All pasted content sanitized down to supported Markdown-representable formatting before entering Tiptap's document model; no raw HTML persisted or rendered |
| Cloud AI backend receiving more data than intended | Low, but high impact if it happens | High | Per-feature `AIProvider` binding (`architecture.md`); each cloud call constructed explicitly with only the data that feature needs, never a full-vault dump |
| Credential/API key exposure (once cloud AI ships) | Low | Medium | API credentials stored via the OS keychain (Electron `safeStorage`, not a plaintext config file), accessed only from the main process, never exposed to the renderer. On a Linux desktop with no keyring service, the key is stored base64-obscured in an owner-only (0600) file and Settings tells the person so. |
| Local malware/compromised OS reading vault files directly | Out of scope | N/A | Explicitly not defended against — see `architecture.md`; full-disk encryption is the user's/OS's responsibility |
| Physical access to an unlocked machine | Out of scope | N/A | Same as above — Paroh is not a security product |

## Renderer Isolation (implementation specifics)

```
contextIsolation: true
nodeIntegration: false
sandbox: true
webSecurity: true  // never disabled, even for local file loading — use custom protocol handlers instead
```

The `contextBridge` surface (`preload/bridge.ts`) exposes a finite, explicit set of typed functions — never a generic passthrough like `ipcRenderer.invoke` exposed directly. Every exposed function is reviewed as a security surface, not just a convenience API, when added.

## Main Process Responsibilities

Owns: all `fs` access (via `VaultAdapter` only), all SQLite access, all outbound network calls (cloud AI, when enabled), all credential storage. The main process validates every IPC request's shape against `shared/ipc-contract.ts` before acting on it — a malformed or unexpected request is rejected, not best-effort handled.

## Path Traversal Protection

`VaultAdapter` resolves and validates every path against the configured vault root before any read/write — `../../etc/passwd`-style traversal attempts (whether from a bug or, eventually, malicious plugin input) are rejected outright, not sanitized-and-continued.

## Consent Model (implementation)

Each `AIProvider`-backed feature has its own boolean in `AppSettings.aiFeatures` (`feature-specifications.md` §12), defaulting to `false`. Enabling one:
1. Shows the exact data that will be sent (e.g., "this month's entry text, mood values, and tags — not audio, not other months")
2. Requires an explicit toggle action, never a bundled "accept all" consent screen
3. Is independently revocable at any time, and revoking takes effect on the next action, not requiring a restart

## Clipboard & External Content

Clipboard is never read programmatically — only written to on explicit user copy actions. External links open via the OS default browser (`shell.openExternal`), never loaded inside an in-app `BrowserWindow` or iframe. Images pasted/embedded are stored locally in `vault/attachments/`; remote image URLs in pasted content are downloaded and localized on paste, never left as live remote references that would leak the user's IP/activity on every future entry render.

## Logging Discipline

Reiterating `architecture.md`'s hard rule with implementation teeth: the logging utility itself is typed so that anything resembling entry body content cannot be passed to a log call without a type error — this is enforced structurally, not just by reviewer discipline. Crash reporting (if/when added) is configured to strip file contents from any stack trace context before it's ever written or transmitted.

## Dependency Security

`npm audit` (or equivalent) run in CI on every PR touching `package.json`. New dependencies are evaluated against `coding-standards.md`'s "not introduce unnecessary dependencies" rule before being added — every dependency is a security surface, not just a convenience.

## Future: Encryption at Rest

Not built in Phase 1-6. When designed (tracked in `future-ideas.md`), the guiding constraint is that it must be opt-in, per-vault, and use a key the user holds — Paroh's own servers (there are none) can never be a recovery path, since that would contradict the local-first threat model entirely. Losing the key means losing access, and that trade-off must be stated to the user plainly before they opt in.

## What This Document Does Not Cover

Legal/compliance requirements (GDPR-style data subject rights, etc.) if Paroh ever handles any account-bound data (e.g., a future first-party sync service) — that would need its own document at that time, not retrofitted here speculatively.
