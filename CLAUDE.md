# CLAUDE.md — SKUNKWORKS

> This file is auto-loaded by Claude Code every session. It is the operating manual.
> The full source of truth lives in `/docs` (Phase 1 Research, Phase 2 Requirements, Phase 3 PRD).
> **Read `/docs/SKUNKWORKS-Phase3-PRD.md` before implementing any feature** — this file is the summary, the PRD is the law.

---

## What this is

SKUNKWORKS is a **single-user, offline-first, gamified productivity PWA** for someone with ADHD, used on **iPhone, Mac, and PC** with **synced data**. It manufactures immediate, visible reward and pushes time out of the head and onto the screen so **starting and finishing** tasks is easier. No social, retention, or dark-pattern mechanics — ever.

The user (Tim) has ADHD. Inconsistency is a *symptom of the condition this app treats*, not a user failure. The app is built around forgiveness, not compliance.

---

## Stack — do not deviate without asking

| Layer | Choice |
|-------|--------|
| Framework | **React + Vite** (**TypeScript**) |
| Styling | **Tailwind** (with a documented design-token layer — see "Design system") |
| Auth + sync backend | **Supabase** (Postgres + Auth + RLS) |
| Local store | **IndexedDB via Dexie** (thin, proven wrapper) — **never `localStorage` for app data** |
| PWA / service worker | **vite-plugin-pwa** (Workbox) |
| Tests | **Vitest** + **React Testing Library** |
| Hosting | **Vercel** (deploy from day one) |

If a task seems to need anything outside this list (a state library, a sync framework, a CRDT engine, a component kit), **stop and ask first**. Boring and proven beats clever every time.

---

## Commands

```bash
npm run dev          # local dev server
npm run build        # production build
npm run preview      # preview the production build (test the SW/PWA here)
npm run test         # vitest (run before every commit)
npm run test:watch   # vitest watch
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
```

---

## Golden rules (apply every session)

1. **Run tests before committing.** `npm run test && npm run typecheck && npm run lint` must pass. Domain logic (XP/level/coin/streak derivations) must have unit tests.
2. **Keep components small.** One responsibility each. If a component is doing capture *and* rendering *and* syncing, split it.
3. **Boring over clever.** Proven patterns. No premature abstraction.
4. **Build in vertical slices, not layers.** One feature end-to-end (UI → local write → derived state → sync) per session. Never "build all the UI, then all the sync."
5. **Flag anything that breaks offline, sync, or migration** *before* writing it. These are the highest-risk surfaces (see below).
6. **Every interaction gives instant visual feedback from local state.** Never make the UI wait on the network.
7. **Guard scope.** If asked for something on the "Later" list, note it and suggest keeping it parked. Don't quietly expand the MVP.

---

## The 8 ADHD pillars — binding acceptance gates

A feature that violates any of these is **redesigned or rejected**, not shipped. Check every feature against this table.

| # | Pillar | The test a feature MUST pass |
|---|--------|------------------------------|
| P1 | Instant feedback | Reward/feedback renders **< 100 ms from local state** — never waits on the network. |
| P2 | Minimum friction | Capture **< 2 s**; start focus in **1 tap**; zero required config; useful within **60 s** of first open. |
| P3 | Visible time | Time is shown as an **ambient shape** (shrinking ring/disk/bar), always on screen while focusing — never a number behind a tap. |
| P4 | Additive only | **XP never decreases.** Nothing is lost, decayed, or reset to zero. |
| P5 | Forgiving streaks | Grace built in; comebacks celebrated; consistency % shown alongside; one miss **never** hard-resets to 0. |
| P6 | Anticipation & near-wins | Progress bars use **endowed progress** (never render empty); "N to next level" is surfaced. |
| P7 | Game serves the loop | Any mechanic that itself needs *managing* gets **cut**. Managing the game must cost less attention than it generates. |
| P8 | No shame surface | No punishment, guilt copy, decaying stats, red overdue pile-ups, or "you failed" states. Undone tasks defer/delete/expire quietly. |

---

## Architecture — the five decisions that keep this safe

These are locked. Do not relitigate them in code without asking.

**1. Event-sourced gamification (append-only).**
XP, coins, streaks, and unlocked facts are **derived from append-only logs**, never stored as mutable counters.
- Logs: `completions`, `focus_sessions`, `coin_ledger`, `redemptions`, `fact_unlocks`.
- Derived (cache for speed, always recomputable from logs): `user_stats` (total_xp, level, coin_balance, streak, …).
- Why: appends *merge* on multi-device sync; counters get *clobbered*. This also makes P4 (XP only goes up) structurally true — there is no counter to decrement — and makes migration trivial (nothing to recompute-in-place).
- **Never write `xp = xp + n`.** Append a completion event; re-derive.

**2. Two currencies: XP (monotonic) + Coins (spendable).**
XP never decreases and drives levels (permanent competence cue). Coins are earned alongside XP and are the *only* thing spent in the rewards store. Redeeming spends coins; **XP and level are never touched.** Coin balance = `sum(coin_ledger.delta)`. Framing is always "you earned this," never "you lost N coins."

**3. Facts ship bundled & content-versioned.**
The 5-category facts library is a **local static asset in the app bundle** (offline-safe — a completion must reward with no network). Versioned *independently* of schema so patches add facts without a schema migration. Fact IDs are **stable and never reused**; the seen-set (`fact_unlocks`) references them.

**4. Local-first store + outbox + delta pull + LWW.**
IndexedDB (Dexie) is the source of truth for the UI. Mutations queue in an **outbox** and flush when online. Pull deltas since a stored `last_synced` cursor. Mutable rows resolve conflicts by **last-write-wins on server `updated_at`**; append-only logs never conflict. No heavy sync framework.

**5. Expand-contract schema evolution.**
All server schema changes are **additive first**. Add columns/tables, let old offline clients keep working, remove only after every client has migrated. **No breaking column rename/drop in a single step.** New non-null columns ship with safe defaults.

---

## Sync-safe conventions — EVERY syncable row

Every syncable row carries:

- `id` — **client-generated UUID** (stable identity before it ever reaches the server; makes re-sends idempotent)
- `created_at`
- `updated_at` — **server-authoritative** (server clock stamps it, so device-clock skew never decides a conflict)
- `deleted_at` — **soft-delete tombstone** (all deletes are soft; hard purge is a parked maintenance job)
- a local `dirty` / sync flag

Rules:
- **Mutable rows** (`tasks`, `rewards`) → LWW by server `updated_at`.
- **Event logs** (`completions`, `coin_ledger`, `redemptions`, `fact_unlocks`, `focus_sessions`) → append-only, immutable, never conflict.
- **Never store a mutable total** (xp, coin_balance, streak) that two devices can each change. Derive it.

> ⚠️ If a change you're about to make introduces a mutable counter, a hard delete, a device-clock timestamp deciding a conflict, or a breaking schema change — **stop and flag it.**

---

## Schema versioning & migrations

Two surfaces must stay compatible: the **local IndexedDB schema** and the **Supabase/Postgres schema**. An offline device may reconnect running an *older* client against a *newer* server.

- `schema_version` is stored locally in a `meta` record.
- Local migrations are **forward-only, ordered, idempotent**, run on startup **before first render**, each bumps `schema_version`, each is transactional / backs up first so a failed migration can't corrupt data.
- Server migrations are **expand-contract** (see Decision 5).
- Content (facts) is versioned **separately** from schema — adding facts is not a schema migration.
- JSON export/import doubles as the migration escape hatch.

---

## Gamification numbers (defaults — tune in Phase 5, don't invent your own)

**Earning** (retuned ~2.5× on 2026-07-15 — Tim's ask: progression 2–3× faster; the level curve stays locked, speed comes from earning):

| Event | XP | Coins |
|-------|----|----|
| Complete a task | +25 at matrix centre (position prices 10–40) | +12 |
| Complete from a focus session | above + 15 bonus (centre = +40) | +17 (12 + 5) |
| Surprise crit (v1.1, ~10% roll) | 2× the above | — |
| Free-reward drop (2026-07-16, ~8% roll) | — | — (gifts a small-tier reward FREE — a `redemptions` row with `coins_spent 0` and NO ledger spend; purely additive, never touches the balance) |

- **Endowed start:** new account seeded with **25 XP** (Level 1, bar ~42% toward Level 2). Bars **never render empty**.
- **Facts:** ~**17% (≈1-in-6)** completions yield an **unseen** fact. When the pool is exhausted, stop surfacing gracefully — never re-show, never reuse an ID.

**Level curve** (cumulative XP to *reach* each level; front-loaded, gentle late game):

| Level | Total XP | Δ | Level | Total XP | Δ |
|---|---|---|---|---|---|
| 1 | 0 | — | 7 | 1000 | 300 |
| 2 | 60 | 60 | 8 | 1370 | 370 |
| 3 | 150 | 90 | 9 | 1820 | 450 |
| 4 | 280 | 130 | 10 | 2360 | 540 |
| 5 | 460 | 180 | 11+ | prev + (Δprev + 90) | +90/lvl |
| 6 | 700 | 240 | | | |

**Coin tiers** (defaults; user can rename/re-cost/add):

| Tier | Cost | ≈ effort |
|------|------|----------|
| Small | 50 | ~a day |
| Medium | 200 | ~a few days |
| Big | 600 | ~a couple weeks |

**Levels unlock cosmetics only** — a title every level, a theme at milestones (3, 5, 8, 12…). Never power, gear, or an economy to manage (P7).

**What resets: nothing.** XP, coins-earned, unlocked facts, level, total completions only ever grow.

---

## Data model (summary — full field list in PRD §6)

**Mutable (LWW):**
- `tasks` — id, user_id, text (only required field), note?, tag?, estimate_ms?, status(`open`/`done`/`deferred`), created/updated/deleted_at
- `rewards` — id, user_id, name, description?, tier, coin_cost, min_level?, created/updated/deleted_at

**Append-only logs:**
- `completions` — id, user_id, task_id?, completed_at, xp_awarded, coins_awarded, multiplier, focus_session_id?
- `focus_sessions` — id, user_id, task_id?, started_at, ended_at, planned_ms, actual_ms
- `coin_ledger` — id, user_id, delta (+earn / −spend), reason, ref_id, at
- `redemptions` — id, user_id, reward_id, reward_name_snapshot, coins_spent, at, claimed_irl (Later)
- `fact_unlocks` — id, user_id, fact_id, unlocked_at

**Derived (recomputable):** `user_stats` — total_xp, level, level_progress, coin_balance, total_completions, (streak, consistency_% in v1.1)

**Static bundled (not synced):** `facts` — id (stable, never reused), category ∈ {biology, history, mma, strategy, mythology}, text, content_version

**Meta:** `meta` — schema_version, app_version, last_synced cursor, first-run / endowed-applied flags

Supabase **RLS**: a user reads/writes only their own rows. **No service-role key in the client bundle.**

---

## Folder structure

```
src/
  app/            # providers, layout shells, routing
  features/       # vertical slices — each owns its UI + hooks
    capture/
    tasks/
    focus/
    gamification/ # XP/level/coin display; reads derived state
    rewards/      # Wave 2
    facts/        # Wave 2
  domain/         # PURE logic, no React, fully unit-tested
    xp.ts         # derive total_xp from completions
    levels.ts     # level curve + progress + "N to next"
    coins.ts      # balance from coin_ledger
    streak.ts     # v1.1 — days-active-of-7 + grace, computed at read time
  db/             # Dexie schema + local migrations
    db.ts
    migrations/
    meta.ts
  sync/           # outbox, delta pull, reconciliation, supabase client
    outbox.ts
    pull.ts
    supabase.ts
  content/facts/  # bundled facts JSON, content-versioned
  ui/             # design system
    tokens.ts     # design tokens (mirrored into tailwind.config)
    primitives/   # Button, Card, ProgressBar, Ring, …
    motion/       # enter / exit / celebrate variants
  hooks/
  lib/            # uuid, time, small helpers
  types/          # shared types (row shapes, events)
```

Keep `domain/` free of React and IO — pure functions in, values out. That is where correctness lives and where the tests concentrate.

---

## Design system (Tim's explicit ask: "a pretty app helps me work with it")

- A **documented design-token layer**: colors, type scale, spacing, radii, shadows, motion durations/easings — authored in `ui/tokens.ts` and mirrored into `tailwind.config`. **Cohesive, not templated.**
- A small **motion vocabulary** (`enter` / `exit` / `celebrate`) reused consistently; **varied** celebration animations to fight novelty decay (celebration is not a single repeated GIF).
- **Dark-only** (Tim's call, 2026-07-15 — "dark backgrounds, military, sleek"): one **pure-black** (`#000000`) chassis (2026-07-16 — OLED-black, no `prefers-color-scheme` split). Default theme is `ember` (deep red; Tim, 2026-07-16) — `ops` and `nebula` are the other always-unlocked level-1 choices; unlockable themes at milestone levels swap accents only, and those accents are deliberately **vibrant/high-chroma** (manta blue, deep red, electric violet…) so they pop on the black ground. Display font Black Ops One + UI font Rajdhani, bundled in `src/assets/fonts` (offline-first, no font CDN).
- **Completion & reward feedback** (`src/ui/feedback.ts`): every completion/redeem fires an instant short synth tone (Web Audio, no bundled asset) + a haptic pulse — the ADHD dopamine hit, sub-350ms, never a jingle. Tiers: everyday complete / 2× crit / redeem / free-drop each get their own cue. Sound honors a device-local `sound_enabled` mute (footer toggle); haptics fire where the platform allows. Must be triggered from the tap gesture (iOS audio unlock).
- **All motion honors `prefers-reduced-motion`** with a static/non-motion fallback. This is **non-negotiable and part of MVP**, not a polish item.
- Consult the frontend-design skill when authoring the visual system in Phase 5.

---

## PWA / service-worker rules

- Precache the app shell so a cold **offline launch** works.
- On a new service worker: **prompt the user to reload**, don't silently swap. **Defer the reload if a focus session is active or a sync flush is in flight** — never interrupt focus (ADHD-aware).
- iOS realities (design around these, never depend on them):
  - Push requires an **installed (home-screen) PWA** on iOS 16.4+; background/periodic sync is largely unavailable → **sync runs on app foreground/open**.
  - iOS may **evict IndexedDB** for *non-installed* PWAs after ~7 days idle → prompt install-to-home-screen; JSON export is the ultimate backup.
  - The **focus timer runs on-device and must survive lock/backgrounding** — no server ticks, no reliance on background execution.

---

## Deploy

Deploy to **Vercel from day one**. Every push should be testable on real iPhone/Mac/PC. Wire Vercel to the repo before building feature #1. Supabase env vars go in Vercel project settings and `.env.local` (gitignored); commit a `.env.example`.

---

## BUILD ORDER (Phase 5) — follow this sequence

> Wave 2 is *launch-scope* but must not block Wave 1 from deploying and being testable on real devices first. Ship vertical slices.

### Wave 1 — Core loop (nothing here can be cut)
Capture → Focus (visible-shape timer) → Complete → **instant additive XP + levels + endowed progress**. Offline-first store + outbox sync + auth. Schema versioning + migration runner. Design-token system + reduced-motion.

Suggested slice order:
1. **Scaffold + deploy** an empty PWA to Vercel; confirm it installs on iPhone. (See `SETUP.md`.)
2. **Auth** — Supabase magic-link, one field; cache session for offline reuse.
3. **Capture + list** — Dexie tasks, client UUID, one-tap capture < 2 s, complete/defer/soft-delete. Offline-first, no sync yet.
4. **Sync** — outbox + delta pull + LWW; prove a task created offline on one device appears on another.
5. **XP + levels** — `completions` append-only log; derive total_xp/level; endowed 25 XP; "N to next level"; < 100 ms local reward + haptic; milestone celebration.
6. **Focus Now** — on-device shrinking-shape timer, gentle wind-down, `focus_sessions` log, focus completion bonus.
7. **Design tokens + reduced-motion** — cohesive token layer + motion vocabulary threaded through the above.

### Wave 2 — "Great v1.0" (all four of Tim's explicit asks)
- **Coins + real-world rewards store** — CRUD, tiers, redeem via `coin_ledger`/`redemptions`; "you earned this" framing; offline.
- **Facts library** — 5 categories, ~60–100 verified facts bundled, ~17% surprise reveal, `fact_unlocks` de-dup. **Accuracy is a hard requirement — verify every fact before shipping.**
- **Level titles + unlockable themes.**
- **Varied celebration animations.**

### Fast-follow — v1.1
Forgiving **streaks** (days-active-of-7 + grace, milestones 7/30/66/100, comeback state, consistency % shown, computed at read time). Surprise 2× XP crit. Encouraging optional notifications. JSON export. Install-to-home-screen prompt.

> **Streaks are held back on purpose.** A broken streak triggers the abstinence-violation effect ("what's the point now") → abandonment — the single most documented gamification failure mode, amplified for ADHD. A streak shipped even slightly wrong makes the app *actively worse*. It ships ~2 weeks after the core is proven un-abandonable, and only in the forgiving form.

### Later — parked, do NOT build without an explicit ask
Estimate-vs-actual loop · fact collection view · JSON import · "What's new" screen · Realtime push · feature flags/kill switch · hard-purge maintenance.

---

## When in doubt

Re-read the relevant section of `/docs/SKUNKWORKS-Phase3-PRD.md`. If a request conflicts with a pillar (P1–P8) or one of the five architecture decisions, surface the conflict and propose a compliant alternative rather than silently working around it.
