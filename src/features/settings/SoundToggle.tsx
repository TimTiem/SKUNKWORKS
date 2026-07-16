import { feedbackComplete, setSoundEnabled } from '../../ui/feedback'
import { useSoundPref } from './useSoundPref'

/**
 * Quiet footer control to mute/unmute the feedback sounds — so the app is
 * never annoying in a room where sound would be (P7/P8). Turning sound ON
 * plays a one-note preview so you hear what you enabled; the tap also unlocks
 * the AudioContext on iOS.
 */
export function SoundToggle() {
  const { enabled, toggle } = useSoundPref()

  return (
    <button
      type="button"
      aria-pressed={enabled}
      aria-label={enabled ? 'Mute feedback sounds' : 'Unmute feedback sounds'}
      onClick={() => {
        const next = !enabled
        toggle()
        setSoundEnabled(next) // apply immediately so the preview below is heard
        if (next) feedbackComplete()
      }}
      className="underline-offset-2 hover:underline"
    >
      {enabled ? '🔊 Sound' : '🔇 Muted'}
    </button>
  )
}
