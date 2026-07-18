/**
 * Focus soundscape (Tim, 2026-07-18): an optional ambient bed that plays only
 * while a focus session is active — a soft brown-noise wash with a warm, very
 * quiet low undertone. It's body-doubling for the ears: something steady to
 * settle into so starting and staying with the task is easier (P3-adjacent).
 *
 * Like feedback.ts, it's synthesised with the Web Audio API — no audio files to
 * bundle or precache (offline-first, CSP-clean). It's opt-in (its own device
 * pref, default off) and calm by design: gentle fades, low gain, never a drone
 * that competes with the work. Starting must come from a user gesture (a tap)
 * so iOS lets the AudioContext run — the focus-screen toggle is exactly that.
 */

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }

// Its own context, kept separate from feedback.ts so its long-lived nodes and
// master gain can be faded/stopped independently of the short reward tones.
let ctx: AudioContext | null = null

interface Running {
  master: GainNode
  nodes: AudioScheduledSourceNode[]
}
let live: Running | null = null

const TARGET_GAIN = 0.085 // ambient, present but never loud
const FADE_IN_S = 1.2
const FADE_OUT_S = 0.6

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const AC = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
    if (!AC) return null
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null // Web Audio unavailable — the soundscape is a bonus, never required.
  }
}

/** A few seconds of looping brown noise (integrated white noise → soft, low,
 * "waterfall" character; gentler than white/pink). */
function brownNoiseBuffer(ac: AudioContext): AudioBuffer {
  const seconds = 3
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * seconds), ac.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5 // compensate for the low amplitude of the integrated signal
  }
  return buffer
}

export function isSoundscapeRunning(): boolean {
  return live !== null
}

/** Start the ambient bed. Idempotent; returns false when Web Audio is absent
 * (SSR/jsdom/unsupported) so callers degrade silently. */
export function startSoundscape(): boolean {
  if (live) return true
  const ac = audio()
  if (!ac) return false

  const master = ac.createGain()
  master.gain.setValueAtTime(0.0001, ac.currentTime)
  master.connect(ac.destination)

  // Brown-noise wash through a low-pass → a soft, rounded hush.
  const noise = ac.createBufferSource()
  noise.buffer = brownNoiseBuffer(ac)
  noise.loop = true
  const lp = ac.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 620
  lp.Q.value = 0.5
  const noiseGain = ac.createGain()
  noiseGain.gain.value = 1
  noise.connect(lp).connect(noiseGain).connect(master)
  noise.start()

  const nodes: AudioScheduledSourceNode[] = [noise]

  // A warm, very quiet undertone: two slightly-detuned low sines panned L/R so
  // they beat slowly against each other — steadying, well below the noise.
  if (typeof ac.createStereoPanner === 'function') {
    const under = ac.createGain()
    under.gain.value = 0.16 // relative to master; the master keeps the whole bed low
    under.connect(master)
    for (const [freq, pan] of [
      [110, -1],
      [114, 1],
    ] as const) {
      const osc = ac.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      const panner = ac.createStereoPanner()
      panner.pan.value = pan
      osc.connect(panner).connect(under)
      osc.start()
      nodes.push(osc)
    }
  }

  // Gentle fade in — never a sudden onset.
  master.gain.exponentialRampToValueAtTime(TARGET_GAIN, ac.currentTime + FADE_IN_S)
  live = { master, nodes }
  return true
}

/** Fade out and tear down. Safe to call when not running. */
export function stopSoundscape(): void {
  const ac = ctx
  const current = live
  if (!ac || !current) {
    live = null
    return
  }
  live = null
  const stopAt = ac.currentTime + FADE_OUT_S
  try {
    current.master.gain.cancelScheduledValues(ac.currentTime)
    current.master.gain.setValueAtTime(Math.max(current.master.gain.value, 0.0001), ac.currentTime)
    current.master.gain.exponentialRampToValueAtTime(0.0001, stopAt)
  } catch {
    /* ramp on a torn-down node — ignore */
  }
  for (const node of current.nodes) {
    try {
      node.stop(stopAt + 0.05)
    } catch {
      /* already stopped — ignore */
    }
  }
}
