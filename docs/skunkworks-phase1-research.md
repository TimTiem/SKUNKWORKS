# SKUNKWORKS — Phase 1 Research Summary
**Science-backed best practices for ADHD productivity & gamification**
*Version 1.0 — July 2026 — Source of truth for Phase 2 (Requirements) and Phase 3 (MVP/PRD)*

---

## 1. How ADHD motivation actually works

### The dopamine story (simplified but accurate enough for design)
- ADHD involves differences in the dopamine reward pathway (Volkow et al., 2009, JAMA Psychiatry). The practical consequence: **delayed rewards are steeply discounted**. A reward two weeks away has almost no motivational pull; a reward two seconds away has a lot.
- ADHD motivation is often described as **interest-based rather than importance-based**: urgency, novelty, challenge, and interest reliably activate the ADHD brain; "this matters for my future" does not.
- Anticipation matters as much as the reward itself. Watching a number climb, a bar fill, or a ring close releases dopamine *before* completion. This is why real-time visible progress is the single highest-leverage design pattern.

### Design implications
1. **Reward must be immediate and visible.** XP appears the instant a task is checked, not on a summary screen later.
2. **Anticipation is a feature.** Progress bars, "almost there" states, and level thresholds create pull.
3. **Never rely on "because it's important."** The app's job is to manufacture urgency, novelty, and micro-rewards for tasks that lack them.

---

## 2. Friction reduction & task initiation

### What the evidence says
- The core ADHD barrier is **initiation, not endurance**. Once in motion, momentum often carries forward; the wall is at the start.
- The Fogg Behavior Model (B = Motivation × Ability × Prompt) explains why: when motivation is unreliable (which it is, structurally, in ADHD), **the only reliable levers are lowering the ability threshold (make it trivially easy) and providing a prompt at the right moment**.
- "Smallest possible next step" is a consistently recommended evidence-based strategy: small, concrete actions reduce activation energy.
- App-abandonment research on ADHD users is blunt: if capturing or completing a first task takes more than a couple of minutes of setup, the app has already failed. Onboarding complexity is the #1 killer.

### Design implications
1. **Sub-2-second capture is non-negotiable.** One tap → type → done. No required fields, no categories, no due dates at capture time. Metadata can be added later or never.
2. **Every task should be startable in one tap** ("Focus now"), and the app should encourage breaking tasks into the smallest next action.
3. **Zero-config onboarding.** The app must be useful within 60 seconds of first open.
4. **Prompts beat memory.** Working memory is a weak point; the app externalizes remembering (visible task, notification, widget) rather than expecting the user to recall.

---

## 3. Time blindness

### What the evidence says
- Time blindness is a neurological difference in perceiving elapsed time, linked to executive-function/prefrontal differences — not laziness or a habit problem.
- A randomized controlled study (Hermansson et al., 2018, European Child & Adolescent Psychiatry) found time-assistive devices significantly improved time-processing ability and daily time management in ADHD.
- The consistent finding across the intervention literature: **ambient, continuously visible time cues outperform hidden or on-demand timers**. A digital countdown behind a tap does little; a shrinking visual disk that's always on screen works. This is why classic Pomodoro apps often fail ADHD users.
- The planning fallacy is amplified in ADHD: people underestimate task duration badly (foundational research: ~64% underestimate even at "99% certain" confidence). Two proven counters: log actual durations to recalibrate, and add buffer (~50%) to estimates.
- Externalize timekeeping entirely: the goal is to move time out of the head and into the environment.

### Design implications
1. **Focus mode must show time as a shape, not a number** — a shrinking ring/disk/bar that is always visible while focusing.
2. **Estimate-vs-actual feedback loop** (later, not MVP): let users guess duration, then show actual. This measurably recalibrates time sense.
3. **Transitions are danger zones.** End-of-focus should have a clear, gentle, visible wind-down cue, not just a sudden alarm.
4. **Show elapsed time on the day itself** (e.g., "day progress") — cheap, ambient, counters "where did the day go."

---

## 4. Reward loops, XP, and levels

### What the evidence says
- Gamified interventions for ADHD show real, replicated benefits in controlled trials (improved engagement, time perception, task management, executive functions). A 2025 RCT (Frontiers in Education) found gamified training outperformed equivalent non-gamified digital training — the game layer itself adds value, not just the digitization.
- Effective mechanisms per Self-Determination Theory: extrinsic rewards paired with **clear competence cues** (visible skill/progress growth) can become internalized over time — you start playing for points and end up valuing the structure.
- **Variable/surprise rewards** are more dopaminergic than fixed ones, but must be used carefully (see backfire section — this is also the slot-machine mechanic).
- The **endowed progress effect** (Nunes & Drèze, 2006, Journal of Consumer Research): giving people a visible head start increases completion rates dramatically (19% → 34% in the original study). A progress bar that starts at 10% beats one at 0%.
- The **goal-gradient effect**: effort increases as people approach completion. Near-finished states ("2 tasks to level up") are highly motivating.

### Design implications
1. **XP for completions, awarded instantly, with animation/haptic.** The feedback *is* the reward for most interactions; confetti-tier celebration can be reserved for milestones.
2. **Levels as competence cues:** levels should signal "you are getting better at running your life," not just grind. Level-up thresholds should be reachable in days at first (fast early wins), stretching gradually.
3. **Use endowed progress:** new users start with some XP; progress bars never start empty.
4. **Occasional small surprise bonuses** (e.g., random 2× XP on a task) are fine and effective; daily-login lootbox mechanics are not (see §6).
5. **Show "almost there" states prominently** to exploit the goal gradient honestly.

---

## 5. Streak psychology

### What the evidence says
- Streaks work through **loss aversion** (Kahneman & Tversky, 1979: losses feel roughly 2× as painful as equivalent gains) plus dopamine anticipation of watching the number grow. They are genuinely among the most effective short-term consistency tools.
- **But the same mechanism is the failure mode.** When a streak breaks, the **abstinence violation effect** kicks in: "what's the point now" → total abandonment. One study found streak-trackers were far more likely to abandon a habit entirely after a single miss than people tracking progress other ways. Practitioners report "rage-quitting" apps after a broken streak as a common pattern.
- Habit-formation research (Lally et al., 2010): **missing a single day does not reset habit formation**. Automaticity builds over ~18–254 days and one miss has no measurable effect. A hard streak reset punishes the user for something that doesn't actually matter neurologically.
- For ADHD specifically the risk is amplified: ADHD comes with elevated rejection sensitivity and shame; a giant "Streak: 0" is a shame trigger, and inconsistency is a *symptom of the condition the app exists to help with*.
- Evidence-aligned alternatives/fixes used by mature products: **grace days / streak freezes, weekly streaks (e.g., "active 5 of 7 days"), consistency percentages, heat-map calendars, and milestone streaks** (30 → 66 → 100 days) instead of infinite counters.

### Design implications
1. **Never hard-reset to zero on one missed day.** Build in automatic grace (e.g., 1 free day per week, or streak = "days active this week").
2. **Track total completions and consistency % alongside the streak** so a break never erases visible progress.
3. **Design the comeback:** the day after a miss should show an encouraging "start a new chain" state, never a shame state. The most common failure mode is the miss → quit spiral; the app's job is to make Option 2 (get back on next day) the obvious path.
4. **Milestone streaks over infinite streaks:** celebrate 7, 30, 66, 100; treat streaks as training wheels, not the point.

---

## 6. When gamification backfires

### The known failure modes
1. **Overjustification effect:** heavy extrinsic rewards can crowd out intrinsic motivation — the systematic-review finding is that habit apps over-rely on extrinsic motivators and can create dependency on the reward system rather than the habit. Mitigation: pair rewards with competence cues (SDT), keep rewards proportional, and let the *task done* be the headline, the XP the garnish.
2. **Punishment mechanics:** losing progress, decaying XP, dying avatars, hard streak resets. These convert the app from a dopamine source into an anxiety source. Research on ring/streak systems documents guilt, compulsion, and pressure as common outcomes. For an ADHD + shame-prone audience, punishment mechanics are disqualifying.
3. **Obligation-based engagement:** streaks and daily rewards can shift motivation from "I want to" to "I have to or I lose something." That's engagement for the app's benefit, not the user's. SKUNKWORKS is a single-user tool — there is no reason to import retention dark patterns.
4. **Novelty decay:** any fixed reward scheme loses power over weeks. Mitigations from the literature: rotate rewards periodically, raise thresholds gradually, occasional reward-free framing, and variety in celebration animations.
5. **Complexity creep:** elaborate game systems (classes, gear, economies à la Habitica) become their own executive-function tax. Managing the game must never cost more attention than it generates.
6. **Comparison/leaderboards:** increase motivation but also pressure and obsession. Irrelevant for a personal app — keep it out.

### Design implications
1. **Additive-only rewards:** XP only goes up. Nothing is ever taken away.
2. **No guilt UI:** no red overdue badges piling up, no "you failed" copy, no growing wall of shame. Undone tasks should be easy to defer, delete, or let quietly expire.
3. **Gamification serves the task loop, never the reverse.** If a game mechanic requires management, cut it.
4. **Plan for novelty decay:** vary celebrations; consider seasonal/rotating micro-content post-MVP rather than more mechanics.

---

## 7. Principles distilled for SKUNKWORKS

These become the design pillars referenced in Phase 2/3:

| # | Pillar | One-line rule |
|---|--------|---------------|
| P1 | Instant feedback | Every completion produces visible reward within 100ms |
| P2 | Minimum friction | Capture in <2s; start focus in 1 tap; zero required config |
| P3 | Visible time | Time is always shown as a shape, ambiently, never hidden behind a tap |
| P4 | Additive rewards only | XP never decreases; nothing is lost, ever |
| P5 | Forgiving streaks | Grace built in; comebacks celebrated; consistency % > streak count |
| P6 | Anticipation & near-wins | Progress bars, endowed progress, "almost there" states |
| P7 | Game serves the loop | Any mechanic that needs managing gets cut |
| P8 | No shame surface | No punishment, guilt copy, decay, or overdue pile-ups |

---

## 8. Evidence quality notes (honesty section)

- **Strong evidence:** loss aversion (prospect theory), endowed progress, goal gradient, Lally habit-formation timelines, planning fallacy, visual/time-assistive devices for ADHD (RCT), gamified vs non-gamified training for ADHD (RCT, children).
- **Moderate:** most adult-ADHD app findings are extrapolated from child/adolescent studies or practitioner consensus; "30% productivity improvement" style claims come from secondary sources and should be treated as directional, not precise.
- **Weak/contested:** exact dopamine mechanics in ADHD are simplified in pop coverage; the "63% more likely to abandon after streak break" figure appears in a secondary source without a verifiable primary citation — treat the *direction* (streak breaks cause abandonment) as well-supported, the number as unverified.
- Nothing here is medical advice; the app supplements, not replaces, treatment.

### Key citable sources
- Volkow et al. (2009), *JAMA Psychiatry* — dopamine reward pathway in ADHD
- Kahneman & Tversky (1979), *Econometrica* — prospect theory / loss aversion
- Nunes & Drèze (2006), *Journal of Consumer Research* — endowed progress effect
- Lally et al. (2010) — habit formation (18–254 days; single misses don't reset)
- Hermansson et al. (2018), *European Child & Adolescent Psychiatry* — time-assistive devices RCT
- Frontiers in Education (2025) — gamified vs non-gamified training RCT in ADHD
- Fogg Behavior Model — B = MAP (motivation × ability × prompt)

---

*Next phase: Phase 2 — Requirements (this doc + versioning/migrations + offline-first sync).*
