# SKUNKWORKS — Repo Setup (one-time scaffolding)

This is the **one-time** bootstrap. After the repo exists and is deployed, `CLAUDE.md` is the ongoing manual. Do this once, then start Wave 1.

---

## 0. Prerequisites

- **Node.js 20+** and npm
- A **Supabase** account + a new project (grab its Project URL + anon key)
- A **Vercel** account linked to your Git host
- `git`

---

## 1. Scaffold the app

```bash
# React + Vite + TypeScript
npm create vite@latest skunkworks -- --template react-ts
cd skunkworks
git init

# Core deps
npm install @supabase/supabase-js dexie uuid

# Dev / tooling
npm install -D tailwindcss postcss autoprefixer \
  vite-plugin-pwa \
  vitest @testing-library/react @testing-library/jest-dom jsdom \
  eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser

# Tailwind
npx tailwindcss init -p
```

---

## 2. Create the folder structure

```bash
mkdir -p src/{app,domain,db/migrations,sync,content/facts,ui/primitives,ui/motion,hooks,lib,types}
mkdir -p src/features/{capture,tasks,focus,gamification,rewards,facts}
mkdir -p supabase/migrations
mkdir -p docs public/icons
```

Then **drop the three source-of-truth docs into `docs/`** so Claude Code can read them:

```
docs/skunkworks-phase1-research.md
docs/SKUNKWORKS-Phase2-Requirements.md
docs/SKUNKWORKS-Phase3-PRD.md
```

And place `CLAUDE.md` at the **repo root**.

---

## 3. Config files

**`tailwind.config.ts`** — point `content` at `./index.html` and `./src/**/*.{ts,tsx}`, and extend the theme from a design-token module (`src/ui/tokens.ts`) so the token layer is the single source of style truth. Add `src/index.css` with the three `@tailwind` directives.

**`vite.config.ts`** — add `vite-plugin-pwa`:
- `registerType: 'prompt'` (we prompt-to-reload, never silent-swap; defer during focus)
- Workbox precache of the app shell
- a web app manifest (name, icons, `display: standalone`, theme color)

**`.env.example`** (commit this) and **`.env.local`** (gitignore it):
```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```
> Only the **anon** key goes in the client. **Never** the service-role key.

**`vitest`** — add a `test` block to Vite config (`environment: 'jsdom'`, `setupFiles` for jest-dom). Add the scripts from `CLAUDE.md` → Commands to `package.json`.

**`.gitignore`** — ensure `.env.local`, `node_modules`, `dist` are ignored.

---

## 4. Supabase — initial schema (expand-only)

Create the first migration in `supabase/migrations/0001_init.sql`. Tables per PRD §6, each with the sync-safe fields (`id uuid`, `created_at`, `updated_at`, `deleted_at`, `user_id`). Turn on **Row-Level Security** on every table with a policy: `user_id = auth.uid()` for select/insert/update.

- Mutable: `tasks`, `rewards`
- Append-only logs: `completions`, `focus_sessions`, `coin_ledger`, `redemptions`, `fact_unlocks`
- `updated_at` is set **server-side** (a trigger or `default now()` + update trigger), never trusted from the client.

> This is the **expand** baseline. All future changes are additive first; no breaking rename/drop in one step.

---

## 5. Local DB (Dexie) + migration runner

In `src/db/db.ts`, define the Dexie schema mirroring the tables above, plus a `meta` store holding `schema_version`. In `src/db/migrations/`, set up a **forward-only, ordered, idempotent** runner that executes on startup **before first render**, bumps `schema_version`, and is transactional. This is scaffolding only — leave it at version 1.

---

## 6. Supabase client

`src/sync/supabase.ts` — create the client from the two `VITE_` env vars. Cache the session so the app works offline after first sign-in (don't gate the whole UI behind a live auth check).

---

## 7. Deploy to Vercel (do this NOW, before feature #1)

1. Push the repo to your Git host.
2. Import it into Vercel.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel → Project → Settings → Environment Variables.
4. Deploy. Open the URL on your **iPhone** and **install to home screen** — confirm the PWA installs and cold-launches. Confirm it works on Mac and PC too.

From here on, every push is testable on all three real devices. That is the whole point of deploying first.

---

## 8. Sanity check before Wave 1

- [ ] `npm run dev` runs; app shell loads
- [ ] `npm run build && npm run preview` works; SW registers
- [ ] `npm run test` runs (even with one trivial passing test)
- [ ] `npm run typecheck` and `npm run lint` pass
- [ ] Deployed to Vercel; installs on iPhone home screen
- [ ] `CLAUDE.md` at root; `docs/` contains the three phase docs
- [ ] `.env.local` gitignored; only anon key in client

Once these pass, start **Wave 1, slice 2 (Auth)** — slice 1 (scaffold + deploy) is this document.

---

## Kickoff prompt to paste into Claude Code

> Copy this as your first message to Claude Code after opening the repo:

```
Read CLAUDE.md and the three docs in /docs (they are the source of truth).

We're doing Phase 4/5 setup. Follow SETUP.md to scaffold the repo:
React + Vite + TypeScript, Tailwind with a design-token layer, Supabase
(auth/sync/RLS), Dexie for IndexedDB, vite-plugin-pwa, Vitest.

Rules for this and every session:
- Boring, proven solutions over clever ones. Small components.
- Build in vertical slices, not layers.
- Every syncable row carries the sync-safe fields (client UUID,
  created_at, server-authoritative updated_at, soft-delete deleted_at,
  dirty flag). Gamification state is DERIVED from append-only logs —
  never mutable counters. XP only ever goes up.
- Flag anything that would break offline use, sync, or migration BEFORE
  writing it.
- Run npm run test && npm run typecheck && npm run lint before committing.
- Check every feature against the 8 ADHD pillars (P1–P8 in CLAUDE.md).
  If something violates one, redesign it or flag it — don't ship it.

Start with SETUP.md steps 1–3 (scaffold + folders + config). Outline
your plan in a few sentences first, then wait for my go-ahead before
writing code. Don't touch anything on the "Later" list.
```
