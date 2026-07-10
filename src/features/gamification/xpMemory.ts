/**
 * Last XP/level the user was shown, kept at module scope so the reward pop
 * survives the XpBar unmounting (e.g. while the focus screen is up): on
 * remount the diff against this still fires the +XP / level-up moment (P1).
 * Ephemeral UI state only — the durable truth stays in the logs.
 */
let lastSeen: { xp: number; level: number } | null = null

export const getLastSeenXp = () => lastSeen

export const setLastSeenXp = (value: { xp: number; level: number }) => {
  lastSeen = value
}
