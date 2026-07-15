---
name: verify
description: Build, launch, and drive SKUNKWORKS in a headless browser to verify changes at the real surface (PWA in Edge via puppeteer-core).
---

# Verifying SKUNKWORKS changes

The surface is a browser PWA. Vitest/typecheck are CI's job — verification
means driving the built app and capturing screenshots.

## Recipe that works (2026-07-15)

1. `npm run build` then `npm run preview` (background) → http://localhost:4173.
   The build inlines `.env.local` Supabase env vars.
2. No Playwright in this repo. Use **puppeteer-core + system Edge**
   (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`), installed
   in the session scratchpad (NOT in this repo — keep package.json clean):
   `npm init -y && npm i puppeteer-core`, `headless: 'new'`,
   viewport ~402×874 @2x for iPhone-ish shots.
3. Auth wall: sign in as the throwaway probe account
   `claude-verify-delete-me@example.com` / `Probe!2026-skunk` (signup returns a
   session instantly — no email confirmation). Its rows are RLS-isolated from
   Tim's real data. **Don't create more probe users.**
4. To keep the server clean while driving mutations, go offline right after
   sign-in: `page.emulateNetworkConditions({ offline: true, ... })`.
   Careful: restoring network + reloading FLUSHES the outbox to the server.
5. Useful selectors: nav tabs `button ::-p-text(Rewards)`; capture input
   `input[aria-label*="apture"]`; complete `button[aria-label*="omplete"]`;
   theme swatches `button[data-theme] > span[aria-hidden]`.
6. IndexedDB can be inspected in-page (`indexedDB.open('skunkworks')`) to check
   migrations/seeds (`meta.schema_version`, row counts, dirty flags).
7. Wait for `document.fonts.ready` before screenshots (bundled fonts swap in).

## Flows worth driving

- Sign-in screen (tokens/fonts render without auth)
- Capture → complete → XP pop + fact card (fact chance = 1, every completion)
- Rewards tab (seeded list), Themes tab (swatch-per-theme, unlock labels)
- Reload persistence (Dexie + cached session)
- Two-device sync: second fresh browser profile signing in pulls what the
  first pushed
