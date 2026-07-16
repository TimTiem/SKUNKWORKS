/**
 * Immediate multi-sensory reward (Tim, 2026-07-16): the instant a task or
 * reward lands, fire a short, clean synth tone + a haptic pulse. This is the
 * ADHD dopamine hit — satisfying, sub-350ms, tuned to feel good, never a
 * jingle, a nag, or anything cringe. It renders from local state on the tap
 * itself, so it's always well under 100ms (P1) and never waits on anything.
 *
 * Sound is synthesized with the Web Audio API — no audio files to bundle or
 * precache, so it stays offline-first and CSP-clean. It honors a device-local
 * mute (`setSoundEnabled`, wired to the `sound_enabled` meta pref); haptics
 * fire wherever the platform exposes `navigator.vibrate` (phones).
 *
 * All feedback must be triggered from a user gesture (a tap) so iOS lets the
 * AudioContext start — every caller here is a completion/redeem handler, which
 * is exactly that.
 */

// ── Mute preference (mirrored from meta for synchronous, gesture-time reads) ──
let soundEnabled = true

/** Called at startup (main.tsx) and on every toggle (useSoundPref). */
export function setSoundEnabled(on: boolean): void {
  soundEnabled = on
}

export function isSoundEnabled(): boolean {
  return soundEnabled
}

// ── Web Audio (lazy, gesture-created, gracefully absent) ─────────────────────
type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const AC = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
    if (!AC) return null
    ctx ??= new AC()
    // iOS starts the context suspended; resuming inside the tap gesture unlocks it.
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null // Web Audio unavailable — sound is a bonus, never required.
  }
}

interface Note {
  /** Frequency in Hz. */
  freq: number
  /** Start offset from now, in seconds. */
  at: number
  /** Duration in seconds. */
  dur: number
  /** Peak gain (0..1); default 0.14 — present but never loud. */
  gain?: number
  type?: OscillatorType
}

/** Play a tiny sequence of enveloped tones. No-op when muted or unsupported. */
function play(notes: readonly Note[]): void {
  if (!soundEnabled) return
  const ac = audio()
  if (!ac) return
  const t0 = ac.currentTime
  for (const n of notes) {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = n.type ?? 'triangle' // triangle = warm, no harsh edge
    osc.frequency.value = n.freq
    const start = t0 + n.at
    const peak = n.gain ?? 0.14
    // Fast attack, exponential decay — a clean "pluck", never a drone.
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(peak, start + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, start + n.dur)
    osc.connect(g).connect(ac.destination)
    osc.start(start)
    osc.stop(start + n.dur + 0.02)
  }
}

function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* unsupported — no-op */
  }
}

// ── The feedback vocabulary (mirrors the celebration tiers) ──────────────────

/** Everyday task completion: a crisp two-note "tick-pop" rising a fifth. */
export function feedbackComplete(): void {
  play([
    { freq: 659.25, at: 0, dur: 0.09 }, // E5
    { freq: 987.77, at: 0.055, dur: 0.13 }, // B5
  ])
  vibrate(18)
}

/** Surprise 2× XP crit: brighter, an extra sparkle note, a firmer double buzz. */
export function feedbackCrit(): void {
  play([
    { freq: 659.25, at: 0, dur: 0.08 }, // E5
    { freq: 987.77, at: 0.06, dur: 0.08 }, // B5
    { freq: 1318.51, at: 0.12, dur: 0.2, gain: 0.16 }, // E6
  ])
  vibrate([14, 40, 26])
}

/** Redeeming a reward: a warm ascending major arpeggio — a "you earned this" chime. */
export function feedbackRedeem(): void {
  play([
    { freq: 523.25, at: 0, dur: 0.1 }, // C5
    { freq: 659.25, at: 0.08, dur: 0.1 }, // E5
    { freq: 783.99, at: 0.16, dur: 0.12 }, // G5
    { freq: 1046.5, at: 0.24, dur: 0.22, gain: 0.15 }, // C6
  ])
  vibrate([20, 40, 20, 40, 30])
}

/** The rare free-reward drop: the jackpot — a bright rising sparkle + a lively pattern. */
export function feedbackDrop(): void {
  play([
    { freq: 587.33, at: 0, dur: 0.1 }, // D5
    { freq: 880.0, at: 0.09, dur: 0.1 }, // A5
    { freq: 1174.66, at: 0.18, dur: 0.12 }, // D6
    { freq: 1567.98, at: 0.27, dur: 0.26, gain: 0.15, type: 'sine' }, // G6 shimmer
  ])
  vibrate([12, 30, 12, 30, 12, 60, 40])
}
