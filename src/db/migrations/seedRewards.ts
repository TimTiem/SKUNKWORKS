import type { RewardRow } from '../../types/rows'

/**
 * Tim's real-world reward list (from reward_tiers.txt, 2026-07-15), mapped to
 * the standard tiers: Small→small(50), Mid→medium(200), Max→big(600).
 *
 * Seeding is DETERMINISTIC SELF-SEEDING: every device runs migration 3 and
 * builds byte-identical rows — fixed UUIDs, a fixed timestamp, and `dirty: 0`.
 * `dirty: 0` means a seed row is NEVER pushed, so a device seeding late (or a
 * fresh install years from now) can't clobber server state via the outbox.
 * Only Tim's real edits/deletes flip `dirty` and sync; a synced version always
 * wins the pull merge because any server `updated_at` is newer than SEEDED_AT.
 * (Server-side referential slack means redemptions may reference a reward id
 * the server never saw — deliberate, see 0001_init.sql.)
 */

/** Fixed stamp, in the past relative to any real edit. Never change it. */
export const SEEDED_AT = '2026-07-15T00:00:00.000Z'

/** id + name + tier only — the full rows are derived below. Never reuse an id. */
const SEEDS: ReadonlyArray<[id: string, name: string, tier: 'small' | 'medium' | 'big']> = [
  // Max tier → big (600)
  ['4917b068-f998-4542-be20-93e0c63fc88d', 'Montblanc fountain pen', 'big'],
  ['157a6a2f-bbae-402f-828a-a1e944df7007', 'TV', 'big'],
  ['637d2da7-9310-4820-b763-14bbab73a801', 'Designer lamp', 'big'],
  ['39ba0bcf-78f9-4ee0-860c-139b8f65ab22', 'Suitcase', 'big'],
  // Mid tier → medium (200)
  ['423e5124-ae80-4ff9-8123-ab529c648526', 'Sunglasses', 'medium'],
  ['0cba4b6a-8bf6-492c-81fa-3a8541299dff', 'Walking pad', 'medium'],
  ['3c9b1198-7072-49ac-9441-e2a0fbbb2dd0', "Chef's knife", 'medium'],
  ['b382dfee-186a-4421-9b94-03dcc25a6a0c', 'Green cargo pants', 'medium'],
  ['36d13798-5b68-47b8-8c6e-969ed24d9a2b', 'More Philips Hue lights', 'medium'],
  ['56de85c6-680a-40f2-998a-bade7b87dc59', 'First portable phone', 'medium'],
  ['aef3d64d-03f3-4201-982a-2d92fb727019', 'Poster', 'medium'],
  ['c09d7cbc-5257-48ba-b21c-d07a5d57390e', 'Sewing machine', 'medium'],
  ['860d04c6-98cf-4f7f-ad9d-2bb882b4609e', 'Restaurant meal', 'medium'],
  ['12ceeed8-54bc-47ff-93c7-8a8e759d9dd1', 'Wood carving knives', 'medium'],
  ['8c36a941-715e-4d87-a1b2-f1d8f3675813', 'Office chair', 'medium'],
  ['7a0a084d-579b-4ff1-a5d0-adbc7b4ab68d', 'Good sports bag', 'medium'],
  // Small tier → small (50)
  ['2f11ce42-203f-4875-9776-910babc0799f', 'Leather coaster stuff', 'small'],
  ['bd8c8bec-be33-4fbf-921c-f6a5e905e190', 'Levitating plant pot', 'small'],
  ['6a4eaad3-d411-4e38-b437-06c45b6a85b4', 'Desk hologram', 'small'],
  ['b141317d-4616-4040-9ad6-1e1fc81a4cd3', 'Leather belt', 'small'],
  ['727b2752-5d5b-4a49-80c2-12b646b19a6d', 'Good steak', 'small'],
  ['fca05425-4fcd-4341-a9e8-787842d4f5fb', 'Knife sharpening gear', 'small'],
  ['7f0240fb-bd26-4984-883b-84e9be731f72', 'New cologne', 'small'],
]

const TIER_COSTS = { small: 50, medium: 200, big: 600 } as const

export const SEED_REWARDS: readonly RewardRow[] = SEEDS.map(([id, name, tier]) => ({
  id,
  user_id: null,
  name,
  description: null,
  tier,
  coin_cost: TIER_COSTS[tier],
  min_level: null,
  created_at: SEEDED_AT,
  updated_at: SEEDED_AT,
  deleted_at: null,
  dirty: 0,
}))
