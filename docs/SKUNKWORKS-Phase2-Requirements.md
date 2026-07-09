# SKUNKWORKS — Phase 2: Requirements
**Gamified ADHD productivity PWA — functional & non-functional requirements**
*Version 1.0 — July 2026 — Source of truth for Phase 3 (MVP/PRD) and beyond*

> Inputs to this document: Phase 1 Research Summary (v1.0), "Additional requirements from Tim", and the fixed stack (React + Vite, Supabase, Tailwind, Vercel, PWA/offline-first). Where this doc makes an engineering decision, it says so explicitly in §6 and lists anything still open for you in §9.

---

## 0. How to read this doc

- **Requirement IDs.** Functional requirements are `FR-*`, non-functional are `NFR-*`. Phase 3 will reference these IDs.
- **Priority tags.** Every requirement carries one:
  - `MVP` — part of the brutally small first version (Phase 3 will confirm the exact cut).
  - `V1` — wanted for the first "real" release, layered on *after* the core loop works.
  - `Later` — parked deliberately; do not build yet.
- **Hazard callouts.** Anything that can break offline use, sync, or migration is marked like this:
  > ⚠️ **SYNC/OFFLINE/MIGRATION:** …

- **Non-goals** live in §8 so scope stays honest.

---

## 1. Product summary

SKUNKWORKS is a **single-user** gamified productivity app for someone with ADHD, used across **iPhone, Mac, and PC** with **synced data** and **full offline support**. It manufactures immediate, visible reward and externalizes time so that starting and finishing tasks is easier. It is a personal tool — there are **no social, retention, or dark-pattern mechanics** (no leaderboards, no daily-login lootboxes, no obligation loops).

**Primary goals**
1. Make task *capture* and *starting* effortless (the ADHD wall is initiation, not endurance).
2. Make progress and elapsed time **continuously visible**.
3. Reward every completion instantly and **additively** (nothing is ever taken away).
4. Do all of the above **offline-first**, syncing cleanly across three devices.
5. Be **beautiful** and give the user a satisfying sense of leveling up (explicit asks from Tim).

---

## 2. Design pillars → binding constraints

The Phase 1 pillars are not aspirations; they are **acceptance constraints**. Every feature below must be checked against them, and a feature that violates one is rejected or redesigned.

| # | Pillar | Binding rule every feature must satisfy |
|---|--------|------------------------------------------|
| P1 | Instant feedback | A completion produces visible reward within **100 ms**, from local state — never waiting on the network. |
| P2 | Minimum friction | Capture in **< 2 s**; start focus in **1 tap**; zero required config; useful within 60 s of first open. |
| P3 | Visible time | Time is shown as an **ambient shape** (shrinking ring/disk/bar), always on screen while focusing — never hidden behind a tap. |
| P4 | Additive rewards only | **XP never decreases.** Nothing is ever lost, decayed, or reset to zero. |
| P5 | Forgiving streaks | Grace is built in; comebacks are celebrated; **consistency % is shown alongside** any streak. One miss never hard-resets to 0. |
| P6 | Anticipation & near-wins | Progress bars use **endowed progress** (never start empty); "almost there" states are surfaced. |
| P7 | Game serves the loop | Any mechanic that itself needs *managing* gets cut. Managing the game must cost less attention than it generates. |
| P8 | No shame surface | No punishment, guilt copy, decaying stats, red overdue pile-ups, or "you failed" states. Undone tasks defer/delete/expire quietly. |

> ⚠️ **SYNC/OFFLINE:** P1 (100 ms) and offline-first together mean **the local device is always the source of truth for the UI**. Every write updates local state immediately; the network is a background reconciliation job, never in the critical path of feedback.

---

## 3. Usage context

- **One user, three devices.** Typically only one device is active at a time, so true concurrent edits are rare — but the app must still handle a device coming back online after being offline for days with local changes queued.
- **Offline is normal, not exceptional.** Subway, spotty wifi, airplane mode. The app must be fully usable with no connection: capture, complete, focus, earn XP/coins, redeem rewards, see facts.
- **ADHD context.** Inconsistency is a *symptom of the condition the app treats*, not a user failure. The app is designed around forgiveness, not compliance.

---

## 4. Functional requirements

### 4.1 Quick capture *(supports P2)*

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | From app open (or widget/shortcut) the user can capture a task with **one tap → type → done**. Target end-to-end < 2 s. | MVP |
| FR-02 | Capture requires **no fields other than the text** — no category, due date, priority, or project at capture time. | MVP |
| FR-03 | Metadata (notes, estimate, tags) can be added later or **never**; absence of metadata is a valid, permanent state. | MVP |
| FR-04 | A newly captured task is **immediately visible and immediately startable** (see Focus, §4.3). | MVP |
| FR-05 | Capture works fully **offline**; the task appears instantly and syncs later. | MVP |
| FR-06 | OS-level fast entry (home-screen shortcut / share-sheet / installed-PWA shortcut) where the platform allows. | V1 |

> ⚠️ **OFFLINE:** FR-05 requires client-generated IDs (see NFR-13) so an offline-created task has a stable identity before it ever reaches the server.

### 4.2 Task list & lightweight management *(supports P2, P8)*

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-07 | A single, simple list of open tasks. No mandatory projects/folders. | MVP |
| FR-08 | Complete a task in one tap; completion triggers the reward loop (§4.4) instantly. | MVP |
| FR-09 | Tasks can be **deferred, deleted, or allowed to quietly expire**. No overdue red badges, no shame states (P8). | MVP |
| FR-10 | Optional "break this into a smaller next step" affordance (encourages smallest-next-action). | V1 |
| FR-11 | Optional light metadata: note, tag, time estimate. Never required. | V1 |
| FR-12 | Deleting is a **soft delete** (tombstone), not a hard delete, so deletion propagates across devices. | MVP |

> ⚠️ **SYNC:** FR-12 — hard deletes cannot sync a "this no longer exists" fact reliably to an offline device. All deletes are soft (`deleted_at`), with hard purge only as a much-later maintenance job (Later).

### 4.3 Focus mode & visible time *(supports P1, P3)*

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-13 | Any task can enter **Focus Now** in a single tap. | MVP |
| FR-14 | Focus mode shows **time as a shape** — a shrinking ring/disk/bar — always visible on screen, not a number behind a tap (P3). | MVP |
| FR-15 | End-of-focus has a **gentle, visible wind-down cue** (transitions are danger zones), not a jarring alarm. | MVP |
| FR-16 | A cheap ambient **"day progress"** indicator (counters "where did the day go"). | V1 |
| FR-17 | **Estimate-vs-actual** loop: user optionally guesses duration, app logs actual and reflects it back to recalibrate time sense. | Later |
| FR-18 | Focus sessions are logged (start/end/duration) as append-only events for later stats and estimate recalibration. | V1 |

> ⚠️ **OFFLINE:** The focus timer must run entirely on-device (no server ticks) and survive backgrounding/lock. See NFR-21 (iOS background limits).

### 4.4 XP, levels & the reward loop *(supports P1, P4, P6 — and Tim's explicit "great leveling/XP" ask)*

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-19 | Completing a task awards **XP instantly**, with animation + haptic, from local state (< 100 ms). | MVP |
| FR-20 | **XP is monotonic** — it only ever increases (P4). There is no decay, no loss, no reset. | MVP |
| FR-21 | XP drives a **level**. Early levels are reachable in **days** (fast early wins); thresholds stretch gradually. | MVP |
| FR-22 | Levels are framed as **competence cues** ("you're getting better at running your life"), not grind. | MVP |
| FR-23 | Progress bars use **endowed progress**: new users start with some XP and bars **never render empty** (P6). | MVP |
| FR-24 | "Almost there" / "N to next level" states are surfaced to exploit the goal gradient honestly. | MVP |
| FR-25 | **Occasional** small surprise bonuses (e.g., random 2× XP on a completion). Surprise, not every task (novelty decay). | V1 |
| FR-26 | Levels may unlock **cosmetic** rewards (titles, themes) to feed novelty without adding managed mechanics (P7). | V1 |
| FR-27 | Reserve confetti-tier celebration for **milestones**; everyday completion feedback is smaller. | MVP |

> ⚠️ **SYNC:** FR-19/20 — XP is **derived from an append-only completion log**, not a stored counter (see §6, Decision 1). A `xp = xp + n` counter gets clobbered on multi-device sync; a summed event log does not.

### 4.5 Streaks (forgiving) *(supports P5, P8)*

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-28 | Track a streak, but **never hard-reset to 0** on a single missed day. | V1 |
| FR-29 | Build in **automatic grace** (e.g., ~1 free day/week, or model streak as "days active this week"). | V1 |
| FR-30 | Always show **total completions and consistency %** alongside the streak, so a break never erases visible progress. | V1 |
| FR-31 | The day after a miss shows an **encouraging comeback** state ("start a new chain"), never a shame state. | V1 |
| FR-32 | Prefer **milestone streaks** (7 → 30 → 66 → 100) over an infinite counter; treat streaks as training wheels. | V1 |

> Streaks are **V1, not MVP**: they are the highest-risk mechanic (broken-streak → rage-quit spiral is the #1 documented failure mode). They land only after the additive core loop is solid, and only in their forgiving form.
> ⚠️ **SYNC:** Streak is **computed at read time** from the set of active-day events, with grace applied in the computation — never a stored counter that can desync between devices.

### 4.6 Real-world rewards store, tiered *(Tim's explicit ask)*

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-33 | A dedicated section to **add / edit / delete** the user's own real-world rewards (full CRUD). | V1 |
| FR-34 | Each reward has: name, optional description, a **tier**, and a **coin cost** (and optionally a minimum level to unlock). | V1 |
| FR-35 | Rewards are grouped into **tiers** (e.g., small / medium / big) that the user defines or picks from defaults. | V1 |
| FR-36 | Redeeming a reward **spends Coins** (not XP — see §6, Decision 2), logs a redemption event, and shows a celebratory confirmation. | V1 |
| FR-37 | Redemption is **framed as "you earned this,"** never "you lost N coins" (P8). Coins spent still leave XP/level untouched. | V1 |
| FR-38 | Reward CRUD and redemption work **offline**; edits and redemptions sync later. | V1 |
| FR-39 | A redeemed reward can be marked "claimed in real life" (optional follow-through checkbox), also just an event. | Later |

> ⚠️ **SYNC:** FR-36 — the coin **balance is derived** = `sum(coins earned) − sum(coins spent)`, both from append-only logs. Never store a mutable `balance` integer that two devices can each decrement.
> **Note to Tim:** the rewards store is tagged **V1**, deliberately layered on after the core loop (Phase 5 says "gamification polish only after the core loop works"). It's fully specced here so nothing is lost — see §8/§9.

### 4.7 Knowledge rewards — facts library *(Tim's explicit ask: biology, history, MMA, strategy, mythology)*

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-40 | A library of **short facts** across the five categories: biology, history, MMA, strategy, mythology. | V1 |
| FR-41 | Facts are surfaced as **occasional random rewards** on completion (variable/surprise reward), **not every task** (novelty decay, P7). | V1 |
| FR-42 | The library ships **bundled with the app** so it works fully offline (see §6, Decision 3). | V1 |
| FR-43 | The library is **content-versioned** so patches can add new facts without an app-logic release. | V1 |
| FR-44 | **De-duplication**: track which facts have been seen so the same fact isn't shown repeatedly. | V1 |
| FR-45 | Optional "collection" view of facts already unlocked (a low-pressure, additive collectible — feeds novelty, no management burden). | Later |

> ⚠️ **OFFLINE:** FR-42 — facts must be a **local static asset**, never a network fetch, or completions lose their reward offline.
> ⚠️ **SYNC:** FR-44 — "seen facts" is an **append-only set** (fact IDs the user has unlocked), synced so it stays consistent across devices; it can never *un*-see a fact (additive, P4).
> ⚠️ **MIGRATION:** FR-43 — bundling facts inside the app bundle means new facts arrive with an app update. The seen-facts set references facts by **stable ID**, so removing/renaming a fact later must keep old IDs valid (never reuse an ID).

### 4.8 Beautiful design & feedback *(Tim's explicit ask: "a pretty app helps me work with it")*

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-46 | A cohesive, deliberate **visual design system** (typography scale, color tokens, spacing, motion language) — not default/templated. | MVP |
| FR-47 | Every interaction gives **instant visual feedback** (P1); completions have satisfying micro-animations + haptics (mobile). | MVP |
| FR-48 | **Varied** celebration animations to counter novelty decay (P7/§6.4) — celebration isn't a single repeated GIF. | V1 |
| FR-49 | Light/dark themes; optional level-unlocked themes (ties FR-26 to the "beautiful" ask). | V1 |
| FR-50 | Animations respect **`prefers-reduced-motion`** with non-motion fallbacks (accessibility — see NFR-24). | MVP |

### 4.9 Prompts & notifications *(supports P2 — "prompts beat memory")*

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-51 | The app externalizes remembering: visible current task, and (where supported) reminders/notifications. | V1 |
| FR-52 | Notifications are **encouraging and optional**, never nagging or guilt-based (P8). | V1 |
| FR-53 | Home-screen / installed-PWA presence acts as an ambient prompt. | MVP |

> ⚠️ **PLATFORM:** Push/reminders on iOS PWA are limited and require an installed (home-screen) PWA on iOS 16.4+; background scheduling is constrained. See NFR-21. FR-51 must degrade gracefully where notifications aren't available.

### 4.10 Account, settings, data ownership

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-54 | Supabase auth (email magic-link or email/password) enabling multi-device sync under one account. | MVP |
| FR-55 | After first sign-in, the app works **offline**, reusing a cached session and refreshing when back online. | MVP |
| FR-56 | **Export all data as JSON** (backup + escape hatch + migration safety net). | V1 |
| FR-57 | **Import** from a previous export. | Later |
| FR-58 | Settings surface the **app version and schema version**, and a manual "sync now". | V1 |
| FR-59 | A dismissible, low-friction **"What's new"** on version updates (never blocks the user, never mid-focus). | Later |

> ⚠️ **OFFLINE:** FR-55 — the app must not gate the whole UI behind a live auth check. Cache the session/JWT; allow full offline use; refresh tokens opportunistically when online.

---

## 5. Non-functional requirements

### 5.1 Performance

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-01 | Reward/feedback for a completion renders within **100 ms**, from local state. | MVP |
| NFR-02 | Capture flow completes in **< 2 s** end to end. | MVP |
| NFR-03 | Animations target **60 fps**; never block input. | MVP |
| NFR-04 | App shell is usable within **~60 s of first open** with zero config (P2). | MVP |

### 5.2 Offline-first architecture

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-05 | The app is **fully functional offline**: capture, complete, focus, earn XP/coins, redeem rewards, view facts. | MVP |
| NFR-06 | **Local store is the source of truth for the UI.** All reads/writes hit local storage first (IndexedDB). | MVP |
| NFR-07 | The **app shell is precached** (service worker) so cold offline launch works. | MVP |
| NFR-08 | Network is a **background reconciliation** process, never in the critical path of any user action. | MVP |

> ⚠️ **OFFLINE:** Choose a durable local store (IndexedDB, e.g. via a thin wrapper). Avoid `localStorage` for app data (size limits, sync). Note iOS may evict IndexedDB for *non-installed* PWAs after ~7 days of disuse — installing to home screen mitigates this (NFR-21); JSON export (FR-56) is the ultimate safety net.

### 5.3 Multi-device sync

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-09 | Sync is **eventually consistent** across iPhone/Mac/PC under one Supabase account. | MVP |
| NFR-10 | **Outbox pattern**: local mutations queue and flush when connectivity returns. | MVP |
| NFR-11 | **Delta pull**: fetch rows changed since a stored `last_synced` cursor, not full-table each time. | MVP |
| NFR-12 | Conflict resolution: **last-write-wins by server `updated_at`** for mutable rows; **append-only logs never conflict** (preferred for gamification state). | MVP |
| NFR-13 | Every syncable row has a **client-generated UUID** so offline creates have stable identity and re-sends are **idempotent**. | MVP |
| NFR-14 | Use **server time** for `updated_at` on write to avoid device-clock skew deciding conflicts. | MVP |
| NFR-15 | Supabase **Realtime** push to other open devices is a nice-to-have, not required for correctness. | Later |

> ⚠️ **SYNC:** Because this is a *single user*, concurrent edits are rare and LWW on mutable rows is acceptable. But **gamification totals (XP, coins, streak, seen-facts) are modeled as append-only events, not mutable counters**, so they can never be clobbered — this is the core sync-safety decision (§6, Decision 1).

### 5.4 Sync-safe data conventions

Every syncable entity carries: `id` (client UUID), `created_at`, `updated_at` (server-authoritative), `deleted_at` (soft-delete tombstone), and a local `dirty`/sync flag. Gamification-affecting facts (completions, redemptions, coin earns/spends, unlocked facts) are **immutable append-only events**; user-visible totals are **derived** from those events (optionally cached, always recomputable).

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-16 | Mutable entities (task text, reward definitions) use the standard row fields above with LWW. | MVP |
| NFR-17 | Gamification state is **derived from append-only event logs**; totals are recomputable from scratch. | MVP |
| NFR-18 | All deletes are **soft** (`deleted_at`); hard purge is a Later maintenance job only. | MVP |

### 5.5 App versioning & patch management (PWA)

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-19 | App uses **semantic versioning**; the running version is visible in Settings (FR-58) and baked into the build. | MVP |
| NFR-20 | **Service-worker update flow**: on a new SW, **prompt the user to reload** rather than silently swapping; **defer the reload if a focus session is active** (don't interrupt focus — ADHD-aware). | MVP |
| NFR-20a | A **compatibility floor**: define a minimum client version the server supports; older clients get a gentle "please update" gate (with offline grace), never data corruption. | V1 |
| NFR-20b | Optional **feature flags / kill switch** to disable a broken feature without a full redeploy. | Later |

> ⚠️ **MIGRATION/SYNC:** NFR-20 — never auto-reload during an active focus session or an in-flight sync flush; queue the update and apply at a safe boundary.

### 5.6 Schema versioning & data migration

There are **two migration surfaces** that must stay compatible: the **local IndexedDB schema** (client) and the **Supabase/Postgres schema** (server). An offline device may reconnect running an *older* client against a *newer* server.

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-21m | A **`schema_version`** is stored locally (in a meta record) and mirrored per-row/table on the server as needed. | MVP |
| NFR-22 | **Forward-only, ordered, idempotent** local migrations run on startup **before first render**; each bumps the stored `schema_version` and is recorded as applied. | MVP |
| NFR-23 | A local migration **backs up (or is transactional) before mutating**, so a failed migration can't corrupt data. | MVP |
| NFR-24m | Server schema evolves via **expand-contract (backward-compatible) migrations**: add columns/tables first (expand), let old clients keep working, remove only after all clients have migrated (contract). **No breaking column renames/drops in a single step.** | MVP |
| NFR-25 | New non-nullable data always ships with **safe defaults** so old rows and old clients remain valid. | MVP |
| NFR-26 | Content (facts) is versioned **independently** of schema, so adding facts is not a schema migration (FR-43). | V1 |
| NFR-27 | **JSON export/import** (FR-56/57) doubles as a migration escape hatch. | V1 |

> ⚠️ **MIGRATION:** This is the highest-risk correctness area. The rules that keep it safe: (1) client UUIDs, (2) additive/expand-contract schema changes, (3) append-only gamification events (no counter to migrate), (4) never reuse an ID, (5) migrations idempotent and transactional. Design each future change to be applyable while an old offline client is still in the wild.

### 5.7 Platform constraints (iOS PWA realities)

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-21 | On iOS, **push notifications require an installed (home-screen) PWA** (iOS 16.4+) and are limited; **background/periodic sync is largely unavailable** — sync runs on **app foreground/open**. | MVP (as a constraint) |
| NFR-28 | iOS may **evict IndexedDB** for non-installed PWAs after ~7 days idle → **prompt the user to install to home screen**; rely on export as backup. | V1 |
| NFR-29 | The focus timer must run **on the client and survive backgrounding/lock** without needing background execution. | MVP |

> ⚠️ **OFFLINE/PLATFORM:** Do not design any feature that *depends* on iOS background execution, background push, or guaranteed background sync. Treat all sync as "happens when the app is open."

### 5.8 Security & privacy

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-30 | Supabase **Row-Level Security**: a user can only read/write their own rows. | MVP |
| NFR-31 | No third-party analytics/tracking that would compromise a personal tool; if any telemetry, it's minimal and self-owned. | MVP |
| NFR-32 | Auth secrets/session handled via Supabase client; **no service-role keys in the client bundle**. | MVP |

### 5.9 Accessibility

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-24 | Honor **`prefers-reduced-motion`**; all motion-based feedback (rings, confetti) has a static/non-motion equivalent. | MVP |
| NFR-33 | Sufficient color contrast; support OS text-size/dynamic type where feasible. | V1 |
| NFR-34 | Core actions reachable by keyboard on desktop. | V1 |

### 5.10 Beautiful-design system requirements *(non-functional side of Tim's ask)*

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-35 | A documented **design-token layer** (Tailwind theme extension): colors, type scale, spacing, radii, shadows, motion durations/easings — so the app is cohesive and not templated. | MVP |
| NFR-36 | A small **motion vocabulary** (enter/exit/celebrate) reused consistently; celebration variants for novelty (FR-48). | V1 |
| NFR-37 | Design choices are consistent across iPhone/Mac/PC (responsive, touch + pointer). | MVP |

---

## 6. Key architectural decisions

These are the consequential calls this doc bakes in. Each can be revisited in §9, but Phase 3 assumes them unless changed.

**Decision 1 — Event-sourced gamification (append-only).**
XP, coins, streak, and unlocked facts are **derived from append-only logs** (`completions`, `coin_ledger`, `redemptions`, `fact_unlocks`), not stored mutable counters.
*Why:* (a) it makes multi-device sync clobber-proof — appends merge, counters get overwritten; (b) it enforces P4 (XP only goes up) structurally; (c) it makes migration trivial (nothing to recompute-in-place — totals are always re-derivable).
*Rejected:* a mutable `user_stats.xp` integer — fails the moment two devices sync, and needs careful migration on every scoring change.
*Implication:* a cached/derived `user_stats` view is fine for speed, but must always be recomputable from the logs.

**Decision 2 — Two values: XP (monotonic) + Coins (spendable).**
XP never decreases and drives levels (permanent competence cue). **Coins** are earned alongside XP and are the currency **spent** in the rewards store.
*Why:* resolves the direct tension between Tim's "spend on real-world rewards" and P4 ("XP never decreases"). Redemption spends coins while XP/level stay intact and always-climbing.
*Rejected:* spending XP (violates P4); pure level-gating with no currency (loses the "I earned this specific treat" agency Tim wants).
*Implication:* coin balance = `sum(earned) − sum(spent)`, both append-only; framing is "earned," never "lost" (P8).

**Decision 3 — Facts ship bundled & content-versioned.**
The five-category facts library is a **local static asset** in the app bundle, versioned separately from schema.
*Why:* completions must reward offline (facts can't be a fetch); versioning lets patches add facts without schema migrations.
*Implication:* stable, never-reused fact IDs; seen-set references those IDs (Decision 1 append-only).

**Decision 4 — Local-first store + outbox + delta pull + LWW.**
IndexedDB local source of truth; outbox queue of mutations; delta pull by `last_synced`; LWW on mutable rows; append-only logs for everything gamified.
*Why:* boring, proven, and sufficient for a single-user/3-device app. Avoids a heavy sync framework (clever > boring is discouraged).
*Rejected (for now):* full CRDT/collaborative sync engines — overkill for single-user; revisit only if real concurrent-edit pain shows up.

**Decision 5 — Expand-contract schema evolution.**
All server schema changes are additive first; destructive changes happen only after all clients have migrated.
*Why:* offline clients reconnect on old versions; breaking changes would corrupt their sync.

---

## 7. High-level data model (implications only)

> Full schema (with types and the `schema_version` field) is a **Phase 3 (PRD)** deliverable. This section only fixes the *shape* the requirements imply.

**Mutable entities (row fields + LWW):**
- `tasks` — id (UUID), text, optional {note, tag, estimate}, status, created/updated/deleted_at.
- `rewards` — id, name, description, tier, coin_cost, optional min_level, created/updated/deleted_at.

**Append-only event logs (never updated, never conflict):**
- `completions` — id, task_id (nullable if task later deleted), completed_at, xp_awarded, coins_awarded, any surprise-multiplier flag, focus_session_id (nullable).
- `focus_sessions` — id, task_id, started_at, ended_at, planned_ms, actual_ms.
- `coin_ledger` — id, delta (+earn / −spend), reason, ref_id, at.
- `redemptions` — id, reward_id (snapshot of name/cost at time), coins_spent, at, claimed_irl (later).
- `fact_unlocks` — id, fact_id, unlocked_at.

**Derived / cached (recomputable from the above):**
- `user_stats` — total_xp, level, level_progress, coin_balance, streak, consistency_%, totals. Cache for speed; source of truth is the logs.

**Static bundled content (not synced):**
- `facts` — id (stable, never reused), category ∈ {biology, history, mma, strategy, mythology}, text, content_version.

**Meta:**
- `meta` — schema_version, app_version, last_synced cursor, install/first-run flags.

> ⚠️ **MIGRATION:** the `schema_version` in `meta` (NFR-21m) gates the local migration runner (NFR-22). Every entity above carries the sync-safe fields from NFR-16/§5.4.

---

## 8. Scope guardrails — MVP vs V1 vs Later

**MVP (Phase 3 will confirm the exact 3–4 mechanics):**
- Quick capture (FR-01–05), simple list + complete/defer/soft-delete (FR-07–09, 12), Focus Now with visible-shape timer (FR-13–15), instant additive **XP + levels** with endowed progress (FR-19–24, 27), local-first store + outbox sync (NFR-05–14), auth + offline session (FR-54–55), schema-version + migration runner (NFR-21m–25), design-token system + reduced-motion (FR-46–47, 50; NFR-35).

**V1 (after the core loop works — Phase 5 order):**
- Forgiving **streaks** (FR-28–32), **rewards store** with tiers + coins (FR-33–38), **facts library** (FR-40–44), surprise bonuses & varied celebrations (FR-25, 48), notifications/prompts (FR-51–53), export (FR-56), install-prompt/eviction mitigation (NFR-28), compatibility floor (NFR-20a).

**Later (parked):**
- Estimate-vs-actual loop (FR-17), fact collection view (FR-45), import (FR-57), "What's new" (FR-59), Realtime push (NFR-15), feature flags (NFR-20b), hard-purge maintenance (NFR-18 purge side).

> **Gentle scope note:** Tim's four asks (rewards store, leveling/XP, beautiful design, facts) are all captured. **Leveling/XP and beautiful design are MVP.** The **rewards store and facts library are V1**, deliberately layered on *after* the core task loop is proven — consistent with your own Phase 5 rule ("gamification polish only after the core loop works"). Nothing is dropped; it's sequenced.

---

## 9. Open decisions for you (Tim)

1. **Coins vs pure level-gating for the rewards store.** This doc recommends **Coins** (earn alongside XP, spend on rewards) so redeeming feels earned without ever reducing XP. Alternative: rewards simply **unlock at levels** (no currency, less to manage — cheaper, but no "spend my earnings on this treat" moment). *Default: Coins.* → confirm or switch.
2. **Streak grace shape.** "1 free day per week" vs "streak = days active out of the last 7" vs milestone-only. *Default: days-active-this-week + milestones (7/30/66/100).* → pick.
3. **Fact frequency.** How often a completion yields a fact — e.g., ~1-in-5 completions, or tied to the surprise-bonus roll. *Default: occasional/variable, ~15–20%.* → set a feel.
4. **Auth method.** Magic-link (no password) vs email+password. *Default: magic-link* (fewer secrets, simpler). → confirm.
5. **Level curve feel.** Fast early (level 2–3 in a day or two) stretching to weekly milestones — how grindy do you want the late game? *Default: gentle, front-loaded.* → we tune numbers in Phase 3.

---

## 10. Traceability

| Source | Covered by |
|--------|-----------|
| P1 Instant feedback | FR-19, FR-47, NFR-01 |
| P2 Minimum friction | FR-01–05, FR-13, NFR-02, NFR-04 |
| P3 Visible time | FR-14–16 |
| P4 Additive only | FR-20, FR-36–37, Decision 1 & 2, NFR-17 |
| P5 Forgiving streaks | FR-28–32 |
| P6 Anticipation/near-wins | FR-23–24 |
| P7 Game serves loop | FR-26, FR-41, FR-45 tag, §8 |
| P8 No shame surface | FR-09, FR-31, FR-37, FR-52 |
| Tim — rewards store w/ tiers | FR-33–39, Decision 2 |
| Tim — great leveling/XP | FR-19–27, Decision 1 |
| Tim — beautiful design | FR-46–50, NFR-35–37 |
| Tim — facts (bio/history/MMA/strategy/myth) | FR-40–45, Decision 3 |
| Versioning & patch mgmt | NFR-19–20b |
| Data migration | NFR-21m–27, Decision 5 |
| Offline-first | NFR-05–08, NFR-29 |
| Multi-device sync | NFR-09–18, Decision 4 |

---

## 11. References

Phase 1 Research Summary v1.0 (dopamine/reward loops, friction, time blindness, streak psychology, gamification backfire; pillars P1–P8). "Additional requirements from Tim." Fixed stack: React + Vite, Supabase, Tailwind, Vercel, PWA/offline-first.

*Next phase: Phase 3 — MVP definition + PRD (brutal MVP cut, full user flows, the gamification loop, the concrete data model with `schema_version`, ADHD design principles).*
