/**
 * "What's new" changelog (FR-59): a dismissible, low-friction note on version
 * updates — never blocking, never mid-focus (it's only rendered in the Shell's
 * non-focus branch). Newest entry first. Keep copy short and celebratory.
 */
export interface WhatsNewEntry {
  version: string
  items: string[]
}

export const WHATS_NEW: readonly WhatsNewEntry[] = [
  {
    version: '1.5.0',
    items: [
      'Facts you unlock now collect into a Facts tab.',
      'New Settings tab: sync now, backup import, version, and your “time sense”.',
      'Add an optional note, tag, and time estimate to any task.',
      'Focus reflects planned-vs-actual time back to you.',
      'Share text from other apps straight into capture.',
    ],
  },
]

/** The changelog entry for a version, if one exists. */
export function whatsNewFor(
  version: string,
  log: readonly WhatsNewEntry[] = WHATS_NEW,
): WhatsNewEntry | undefined {
  return log.find((entry) => entry.version === version)
}
