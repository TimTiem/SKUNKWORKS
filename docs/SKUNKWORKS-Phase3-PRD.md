# SKUNKWORKS — Phase 3: MVP Definition + PRD
**Gamified ADHD productivity PWA — product requirements document**
*Version 1.0 — July 2026 — Source of truth for Phase 4 (repo setup) and Phase 5 (build)*

> Inputs: Phase 1 Research Summary (v1.0), Phase 2 Requirements (v1.0), "Additional requirements from Tim". Fixed stack: React + Vite, Supabase (auth/sync), Tailwind, Vercel, PWA/offline-first.
>
> This PRD turns requirements into buildable decisions: the MVP cut, concrete user flows, the gamification loop with **actual numbers**, the concrete data model (with `schema_version`), and ADHD design principles as acceptance criteria.

---

## 0. The scope call (read this first)

The brief says "brutal MVP, 3–4 mechanics, push back on sprawl." Tim says "don't cut too much, I want a great app off the start." Both are honored by splitting v1.0 into two **build waves that ship in the same launch**, plus a deliberately-sequenced fast-follow.

| Wave | What | Why here |
|------|------|----------|
| **Wave 1 — Core loop** | Capture → Focus (visible timer) → Complete → instant additive **XP + levels + endowed progress**. Offline-first store + outbox sync + auth. Schema versioning + migration runner. Design-token system + reduced-motion. | The vertical slice that must work and sync on iPhone/Mac/PC before anything is layered on (Phase 5 discipline). Nothing here can be cut. |
| **Wave 2 — "Great v1.0"** | **Coins + real-world rewards store** (CRUD, tiers, redeem). **Facts library** (5 categories, random reward). **Level titles + unlockable themes.** **Varied celebrations.** | These are *all four of Tim's explicit asks*, done properly. Low added risk (they reuse Wave 1's append-only + LWW patterns) and high delight. This is what makes launch feel *great*, not skeletal. |
| **Fast-follow — v1.1** | **Forgiving streaks.** Surprise 2× XP multiplier. Encouraging notifications. JSON export. Install-to-home-screen prompt. | Streaks are held back **on purpose** (see below). The rest are quick adds once real usage data exists. |
| **Later (parked)** | Estimate-vs-actual loop, fact collection view, JSON import, "What's new", Realtime push, feature flags, hard-purge. | Genuinely not needed to be great. Fully parked. |

### Why streaks are the *one* thing held back
Phase 1 is blunt: a broken streak triggers the **abstinence-violation effect** ("what's the point now") → total abandonment, and this is the **single most documented gamification failure mode** — amplified for ADHD by rejection sensitivity and shame. Inconsistency is *a symptom of the condition the app treats*. A streak shipped even slightly wrong doesn't make SKUNKWORKS less complete — it makes it **actively worse** and risks you rage-quitting your own tool. So streaks ship ~2 weeks after the core is proven un-abandonable, and **only** in the forgiving form (§5). They're fully specced now; nothing is lost.

> ⚠️ **Build-order note:** Wave 2 features are *launch-scope* but must not block Wave 1 from being deployed and testable on real devices first. Deploy to Vercel from day one; each wave is a set of vertical slices.

---

## 1. Product in one paragraph

SKUNKWORKS is a **single-user** gamified productivity PWA for someone with ADHD, used on **iPhone, Mac, and PC** with **synced, fully-offline** data. It manufactures immediate, visible reward and pushes time out of the head and onto the screen, so **starting and finishing** tasks is easier. Every completion pays out instantly and **additively** — XP (permanent, climbs forever) and Coins (spendable on real-world rewards Tim defines), sometimes a fact from a topic he loves. There are **no social, retention, or dark-pattern mechanics**: no leaderboards, no login lootboxes, no guilt, no punishment, nothing ever taken away.

---

## 2. Core mechanics (the loop)

Four mechanics form the beating heart. Everything else decorates them.

1. **Sub-2-second quick capture** — one tap → type → done. No required fields, ever.
2. **Focus Now** — any task, one tap, into a single-task mode with an **always-visible shrinking-shape timer**.
3. **Complete → instant additive reward** — tap the check → within 100 ms: XP animation + haptic, +Coins, occasional fact. XP feeds a **level** with **endowed progress** and "N to next level."
4. **Offline-first sync** — all of the above works with no connection; the local device is the source of truth; the network reconciles in the background.

Wave 2 adds the **spend** side (rewards store) and the **surprise** side (facts) on top of this loop — it never replaces it.

---

## 3. User flows

### 3.1 First run (zero-config, < 60 s, never empty)
1. Open → magic-link sign-in (email; one field). 
2. Land directly on an empty-but-inviting task list with a giant capture affordance. No setup wizard, no categories, no tutorial wall.
3. Account is **endowed**: XP bar already shows ~40% toward Level 2 (never renders empty — P6). A one-line "you're on your way" instead of a zero state.
4. First captured task is startable and completable immediately.

### 3.2 Capture (P2, < 2 s, offline)
Tap **+** → keyboard is already focused → type text → Enter/Done. Task appears instantly at top of list. No due date, category, or priority requested. (Metadata can be added later or **never** — absence is a permanent valid state.) Works fully offline; client-generated UUID gives it identity before it ever reaches the server.

### 3.3 Complete (P1, < 100 ms, local)
Tap the check → task animates out → **XP + Coins pop with haptic**, level bar advances, "N to next level" updates. Roughly 1-in-6 completions also reveals a **fact card**. All rendered from local state; sync happens later in the background. Nothing about this waits on the network.

### 3.4 Focus Now (P3, on-device timer)
Tap **Focus Now** on any task → single-task screen with a **shrinking ring/disk** (a shape, not a number behind a tap), always visible. At the end: a **gentle visible wind-down** cue (transitions are danger zones), not a jarring alarm. Session is logged (start/end/duration) as an append-only event; completing from focus pays a small XP/Coin bonus. Timer runs entirely on-device and survives lock/backgrounding (no server ticks, no reliance on iOS background execution).

### 3.5 Level up (competence cue)
When the bar fills: a **milestone-tier celebration** (bigger than everyday feedback), a new **title** ("you're getting better at running your life," not "grind"), and — Wave 2 — a possible **theme unlock**. XP only ever climbs; leveling never resets or decays.

### 3.6 Earn & redeem a real-world reward (Wave 2)
Coins accrue silently alongside XP on every completion. In the **Rewards** section Tim can **add / edit / delete** his own rewards, each with a name, optional description, a **tier**, and a **coin cost**. Redeeming a reward he can afford → a **celebratory "you earned this"** confirmation → coins are spent via the ledger. **XP and level are untouched** (Decision 2). Copy is always "earned," never "you lost N coins" (P8). Full CRUD + redeem work offline.

### 3.7 Get a fact (Wave 2, surprise reward)
Occasionally on completion, a **fact card** flips in — one short, true item from biology, history, MMA, strategy, or mythology. It's added to the **unlocked set** (append-only; a fact is never re-shown, and can never be *un*-seen). Not every completion (novelty decay, P7) — a surprise, not a tax.

---

## 4. The gamification loop — concrete numbers

All numbers below are **defaults to launch with and tune in Phase 5**, not laws. They implement P1/P4/P6.

### 4.1 What earns what
| Event | XP | Coins |
|-------|----|----|
| Complete a task | **+10** | **+5** |
| Complete a task *from a focus session* | **+15** (10 + 5 focus bonus) | **+7** (5 + 2) |
| Surprise crit (*fast-follow*, ~10% roll) | **2× the above** | — |

- **Endowed start:** new account seeded with **25 XP** (Level 1, bar ~42% toward Level 2). Bars **never render empty**.
- **XP is monotonic:** derived from the append-only `completions` log. There is no decay, no loss, no reset — *structurally*, because there's no counter to decrement.

### 4.2 Level curve (front-loaded, gentle late game)
Cumulative XP to *reach* each level. Deltas grow smoothly so early levels land in a day or two, later ones stretch to weekly.

| Level | Total XP | Δ from prev | Feel |
|-------|----------|-------------|------|
| 1 | 0 | — | start (endowed to 25) |
| 2 | 60 | 60 | ~4 completions — day one |
| 3 | 150 | 90 | day one |
| 4 | 280 | 130 | day 2 |
| 5 | 460 | 180 | day 2–3 |
| 6 | 700 | 240 | week 1 |
| 7 | 1000 | 300 | |
| 8 | 1370 | 370 | |
| 9 | 1820 | 450 | week 2+ |
| 10 | 2360 | 540 | |
| 11+ | prev + (Δ prev + 90) | +90/level | weekly milestones |

At a realistic ~10 completions/day (~120–150 XP/day with focus bonuses): **Level 3 on day one, Level 5 by day 3.** Fast early wins, then a comfortable weekly cadence.

### 4.3 What levels unlock (cosmetic only — P7)
- **Every level:** a new **title** (competence cue). *Wave 1.*
- **Milestone levels (3, 5, 8, 12…):** an unlockable **theme** (light/dark variants + accent). *Wave 2.*
- Never any power, gear, economy, or managed system. If a mechanic needs managing, it's cut.

### 4.4 Coin economy & reward tiers (Wave 2, all user-editable)
- **Balance = `sum(coin_ledger.delta)`** — earns positive, redemptions negative. Never a stored mutable integer (Decision 2).
- Default tiers Tim can rename/re-cost or add to:

| Tier | Suggested cost | ≈ effort |
|------|----------------|----------|
| Small | 50 coins | ~10 tasks (a day) |
| Medium | 200 coins | ~40 tasks (a few days) |
| Big | 600 coins | ~120 tasks (a couple weeks) |

- Redemption logs a `redemptions` event + a negative `coin_ledger` entry. Framing is always "you earned this."

### 4.5 Facts (Wave 2)
- **~17% (≈1-in-6) completions** yield an **unseen** fact (variable/surprise reward).
- Library **bundled with the app** (local static asset, offline-safe), **content-versioned** independently of schema, **stable never-reused IDs**.
- Launch content target: **~60–100 facts**, evenly across the five categories. **Accuracy is a hard requirement** — a wrong "fact" as a reward erodes trust and could mislead; every fact is verified before shipping (Phase 5 content task).
- **De-dup:** `fact_unlocks` is an append-only set of seen IDs, synced. When the pool is exhausted, gracefully stop surfacing new ones (never "un-see," never reuse an ID).

### 4.6 What "resets"
**Nothing.** XP, Coins-earned, unlocked facts, level, and total completions only ever grow. Undone tasks defer / delete / expire **quietly** — no overdue-red pile-up, no shame surface (P8). (When streaks arrive in v1.1, they too never hard-reset — see §5.)

---

## 5. Forgiving streaks — specced now, ships v1.1

Held back on purpose (§0). When built, it obeys these rules absolutely:

- **Never hard-reset to 0** on a single missed day.
- Modeled as **"days active out of the last 7"** with automatic grace (a miss can't zero it), plus **milestone streaks (7 → 30 → 66 → 100)** rather than an infinite anxiety counter. *(Default per Phase 2 §9.2.)*
- **Consistency % and total completions shown alongside** any streak, so a break never erases visible progress.
- **The comeback is designed:** the day after a miss shows an encouraging "start a new chain," **never** a shame state. Making "get back on tomorrow" the obvious path *is the feature*.
- **Computed at read time** from the set of active-day events (grace applied in the computation) — never a stored counter that can desync. Append-only, so it can't conflict across devices.

---

## 6. Data model (concrete)

Full field/type list. Every syncable row carries the sync-safe fields (§6.4). Gamification state is **derived from append-only events**, never mutable counters (Decision 1).

### 6.1 Mutable entities (LWW on server `updated_at`)
**`tasks`**
| field | type | notes |
|-------|------|-------|
| id | uuid (client-gen) | stable identity offline |
| user_id | uuid | RLS scope |
| text | text | the only required field |
| note | text? | optional, addable later/never |
| tag | text? | optional |
| estimate_ms | int? | optional |
| status | enum(`open`,`done`,`deferred`) | |
| created_at | timestamptz | |
| updated_at | timestamptz | **server-authoritative** |
| deleted_at | timestamptz? | soft-delete tombstone |

**`rewards`** (Tim's real-world rewards — full CRUD)
| field | type | notes |
|-------|------|-------|
| id | uuid | |
| user_id | uuid | |
| name | text | |
| description | text? | |
| tier | text | default `small`/`medium`/`big`, user-editable |
| coin_cost | int | |
| min_level | int? | optional unlock gate |
| created_at / updated_at / deleted_at | timestamptz(?) | LWW + soft delete |

### 6.2 Append-only event logs (never updated, never conflict)
**`completions`** — id, user_id, task_id (nullable if task later deleted), completed_at, xp_awarded, coins_awarded, multiplier (default 1), focus_session_id (nullable).
**`focus_sessions`** — id, user_id, task_id (nullable), started_at, ended_at, planned_ms, actual_ms.
**`coin_ledger`** — id, user_id, delta (+earn / −spend), reason, ref_id, at.
**`redemptions`** — id, user_id, reward_id, reward_name_snapshot, coins_spent, at, claimed_irl (Later).
**`fact_unlocks`** — id, user_id, fact_id, unlocked_at.

### 6.3 Derived / cached (recomputable from the logs)
**`user_stats`** — total_xp, level, level_progress, coin_balance, total_completions, (streak, consistency_% — v1.1). Cache for render speed; **source of truth is always the logs**, recomputable from scratch after any sync or migration.

### 6.4 Sync-safe conventions (every syncable row)
`id` (client UUID) · `created_at` · `updated_at` (server-authoritative) · `deleted_at` (soft-delete tombstone) · local `dirty`/sync flag. Mutable rows use **LWW by server `updated_at`**; **event logs never conflict** (appends merge). Server time stamps `updated_at` (no device-clock skew deciding conflicts). Re-sends are **idempotent** on the client UUID.

### 6.5 Static bundled content (not synced)
**`facts`** — id (stable, **never reused**), category ∈ {biology, history, mma, strategy, mythology}, text, content_version. Shipped in the app bundle; "seen" tracked via synced `fact_unlocks`.

### 6.6 Meta
**`meta`** — `schema_version`, `app_version`, `last_synced` cursor, first-run / endowed-applied flags.

> ⚠️ **MIGRATION:** `schema_version` in `meta` gates the local migration runner. Server schema evolves **expand-contract** (add first, remove only after all clients migrate; no breaking rename/drop in one step). New non-null columns ship with safe defaults so old rows/clients stay valid. Because gamification totals are **derived from append-only logs, there's nothing to migrate-in-place** — the highest-risk migration surface is designed out.

---

## 7. ADHD design principles (binding acceptance criteria)

Every feature is checked against these; a feature that violates one is redesigned or rejected.

| # | Pillar | The test a feature must pass |
|---|--------|------------------------------|
| P1 | Instant feedback | Reward renders **< 100 ms** from local state — never waits on network. |
| P2 | Minimum friction | Capture **< 2 s**; start focus in **1 tap**; zero required config; useful in **60 s**. |
| P3 | Visible time | Time shown as an **ambient shape**, always on screen while focusing. |
| P4 | Additive only | **XP never decreases.** Nothing lost, decayed, or reset. |
| P5 | Forgiving streaks | Grace built in; comebacks celebrated; consistency % shown; one miss never zeroes. |
| P6 | Anticipation & near-wins | Endowed progress (bars never empty); "almost there" surfaced. |
| P7 | Game serves the loop | Any mechanic that needs *managing* gets cut. |
| P8 | No shame surface | No punishment, guilt copy, decay, overdue pile-ups, or "you failed." |

### 7.1 Beautiful-by-default (Tim's explicit ask)
A cohesive, deliberate look — **not templated**. Concretely: a documented **design-token layer** (Tailwind theme extension — colors, type scale, spacing, radii, shadows, motion durations/easings), a small reusable **motion vocabulary** (enter / exit / celebrate) with **varied** celebration animations to fight novelty decay, light/dark + unlockable themes, and consistency across touch (iPhone) and pointer (Mac/PC). All motion honors **`prefers-reduced-motion`** with static fallbacks (accessibility, non-negotiable in MVP). *(Design system is authored against the frontend-design skill in Phase 5.)*

---

## 8. Open decisions — resolved (flip any)

| # | Decision | Resolution (Phase 2 §9 default) |
|---|----------|-------------------------------|
| 1 | Coins vs pure level-gating | **Coins.** Earn alongside XP, spend on rewards; XP/level never reduced. |
| 2 | Streak grace shape | **Days-active-of-last-7 + milestones (7/30/66/100)**, grace built in. (v1.1) |
| 3 | Fact frequency | **~17% (1-in-6) completions.** |
| 4 | Auth method | **Magic-link** (one field, fewer secrets). |
| 5 | Level curve feel | **Front-loaded** per §4.2 table; late game gentle-weekly. |

---

## 9. Traceability & what's deferred

| Source | Covered by |
|--------|-----------|
| P1 Instant feedback | §3.3, §4.1, §7 (P1) |
| P2 Minimum friction | §3.1–3.2, §7 (P2) |
| P3 Visible time | §3.4 |
| P4 Additive only | §4.1, §4.6, Decisions 1–2 |
| P5 Forgiving streaks | §5 (v1.1) |
| P6 Anticipation/near-wins | §4.1 endowed start, §3.5 |
| P7 Game serves loop | §4.3, §4.5, §7 |
| P8 No shame surface | §3.6, §4.6, §5 |
| Tim — great leveling/XP | §4.1–4.3 (**Wave 1**) |
| Tim — rewards store w/ tiers | §3.6, §4.4, §6.1 (**Wave 2**) |
| Tim — facts (5 topics) | §3.7, §4.5, §6.5 (**Wave 2**) |
| Tim — beautiful design | §7.1 (**Wave 1** system; themes Wave 2) |
| Versioning & migration | §6.6, expand-contract note |
| Offline-first & sync | §2, §3.3, §6.4 |

**Deferred to Later (parked, not dropped):** estimate-vs-actual loop, fact collection view, JSON import, "What's new" screen, Realtime push, feature flags/kill switch, hard-purge maintenance.

---

*Next phase: Phase 4 — Repo setup (CLAUDE.md: stack, folder structure, conventions, "run tests before committing"; plus scaffolding instructions). Build order in Phase 5: Wave 1 vertical slices first, deploy to Vercel from day one, then Wave 2, then the v1.1 fast-follow.*
