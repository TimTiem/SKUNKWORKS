/**
 * Bundled facts library (Decision 3): a local static asset so a completion
 * can reward with NO network (offline-safe). Content-versioned INDEPENDENTLY
 * of schema — adding facts bumps CONTENT_VERSION only, never a migration.
 *
 * Fact IDs are STABLE and NEVER REUSED: `fact_unlocks` references them, so a
 * removed fact's id must stay retired forever (P4 — a fact is never un-seen).
 *
 * Accuracy is a hard requirement (PRD §4.5): every fact here is a
 * well-established, verifiable statement. When in doubt, it was left out.
 */

export type FactCategory = 'biology' | 'history' | 'mma' | 'strategy' | 'mythology'

export interface Fact {
  /** Stable, never reused. */
  id: string
  category: FactCategory
  text: string
}

/** Bump when facts are added/edited; unrelated to schema_version. */
export const CONTENT_VERSION = 1

export const FACTS: readonly Fact[] = [
  // ── Biology ──────────────────────────────────────────────────────────────
  { id: 'bio-001', category: 'biology', text: 'Octopuses have three hearts: two pump blood through the gills, and one pumps it through the rest of the body.' },
  { id: 'bio-002', category: 'biology', text: 'Human red blood cells have no nucleus, which leaves more room to carry oxygen.' },
  { id: 'bio-003', category: 'biology', text: 'The DNA in a single human cell would stretch about two metres if unravelled.' },
  { id: 'bio-004', category: 'biology', text: 'Tardigrades can survive being dried out, frozen near absolute zero, and even the vacuum of space.' },
  { id: 'bio-005', category: 'biology', text: 'Bees communicate the direction and distance of food through a "waggle dance".' },
  { id: 'bio-006', category: 'biology', text: 'Your body contains roughly as many bacterial cells as human cells.' },
  { id: 'bio-007', category: 'biology', text: 'Sharks existed before trees: sharks date back over 400 million years, trees around 385 million.' },
  { id: 'bio-008', category: 'biology', text: 'The axolotl can regenerate entire limbs, parts of its heart, and even portions of its brain.' },
  { id: 'bio-009', category: 'biology', text: 'Mammalian lungs never fully empty — a residual volume of air always remains.' },
  { id: 'bio-010', category: 'biology', text: 'Bird bones are often hollow with internal struts, keeping them light but strong for flight.' },
  { id: 'bio-011', category: 'biology', text: 'The giant sequoia is the largest tree by volume, growing to over 80 metres tall.' },
  { id: 'bio-012', category: 'biology', text: 'Photosynthesis releases the oxygen we breathe, split from water molecules, not from carbon dioxide.' },
  { id: 'bio-013', category: 'biology', text: 'A human sneeze can travel out of the nose and mouth at over 100 kilometres per hour.' },
  { id: 'bio-014', category: 'biology', text: 'Honey never spoils; sealed jars found in ancient Egyptian tombs were still edible.' },
  { id: 'bio-015', category: 'biology', text: 'Nerve impulses in humans can travel at over 100 metres per second.' },

  // ── History ──────────────────────────────────────────────────────────────
  { id: 'his-001', category: 'history', text: 'The Great Pyramid of Giza was the tallest human-made structure on Earth for over 3,800 years.' },
  { id: 'his-002', category: 'history', text: 'Oxford University was teaching students before the Aztec Empire founded its capital, Tenochtitlan.' },
  { id: 'his-003', category: 'history', text: 'Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.' },
  { id: 'his-004', category: 'history', text: 'The printing press with movable type was introduced to Europe by Johannes Gutenberg around 1440.' },
  { id: 'his-005', category: 'history', text: 'The Roman concrete used in structures like the Pantheon can be more durable than many modern concretes.' },
  { id: 'his-006', category: 'history', text: 'The Rosetta Stone, found in 1799, was the key to deciphering Egyptian hieroglyphs.' },
  { id: 'his-007', category: 'history', text: 'The Library of Alexandria was one of the largest centres of learning in the ancient world.' },
  { id: 'his-008', category: 'history', text: 'The Black Death in the 14th century killed an estimated one-third of Europe’s population.' },
  { id: 'his-009', category: 'history', text: 'The first successful powered aeroplane flight by the Wright brothers, in 1903, lasted about 12 seconds.' },
  { id: 'his-010', category: 'history', text: 'The Berlin Wall stood from 1961 until it was opened in 1989, dividing the city for 28 years.' },
  { id: 'his-011', category: 'history', text: 'Genghis Khan’s Mongol Empire became the largest contiguous land empire in history.' },
  { id: 'his-012', category: 'history', text: 'The Magna Carta, sealed in 1215, limited the English king’s power and influenced later constitutions.' },
  { id: 'his-013', category: 'history', text: 'Ancient Rome had a population of roughly one million people at its height.' },
  { id: 'his-014', category: 'history', text: 'The Great Fire of London in 1666 destroyed much of the medieval city within the old Roman walls.' },
  { id: 'his-015', category: 'history', text: 'Vikings reached North America around the year 1000, roughly 500 years before Columbus.' },

  // ── MMA / combat sports ──────────────────────────────────────────────────
  { id: 'mma-001', category: 'mma', text: 'The UFC held its first event, UFC 1, in Denver, Colorado, in November 1993.' },
  { id: 'mma-002', category: 'mma', text: 'Royce Gracie won the first UFC tournament, showcasing Brazilian Jiu-Jitsu against larger opponents.' },
  { id: 'mma-003', category: 'mma', text: 'The term "mixed martial arts" describes combining striking and grappling from different disciplines.' },
  { id: 'mma-004', category: 'mma', text: 'A "triangle choke" uses the legs to encircle an opponent’s neck and one arm.' },
  { id: 'mma-005', category: 'mma', text: 'Amanda Nunes is the first woman to hold UFC titles in two weight classes simultaneously.' },
  { id: 'mma-006', category: 'mma', text: 'The "octagon", the UFC’s eight-sided cage, has become a signature of the sport.' },
  { id: 'mma-007', category: 'mma', text: 'Muay Thai is known as "the art of eight limbs" because it uses fists, elbows, knees, and shins.' },
  { id: 'mma-008', category: 'mma', text: 'Brazilian Jiu-Jitsu was developed by the Gracie family from Japanese judo and jujutsu.' },
  { id: 'mma-009', category: 'mma', text: 'The Unified Rules of MMA introduced weight classes and rounds to standardise the sport.' },
  { id: 'mma-010', category: 'mma', text: 'A "rear-naked choke" is a blood choke applied from behind, restricting blood flow rather than air.' },
  { id: 'mma-011', category: 'mma', text: 'Anderson Silva holds one of the longest title-defence streaks in UFC middleweight history.' },
  { id: 'mma-012', category: 'mma', text: 'Georges St-Pierre is celebrated for blending wrestling, striking, and jiu-jitsu into a complete game.' },
  { id: 'mma-013', category: 'mma', text: 'Judo, a foundation of many MMA grapplers, was founded by Jigoro Kano in Japan in 1882.' },
  { id: 'mma-014', category: 'mma', text: 'Boxing footwork and head movement are widely adopted by MMA strikers to control distance.' },
  { id: 'mma-015', category: 'mma', text: 'Wrestling’s takedown control is often decisive in MMA because it dictates where the fight happens.' },

  // ── Strategy ─────────────────────────────────────────────────────────────
  { id: 'str-001', category: 'strategy', text: 'Sun Tzu’s "The Art of War" argues that the greatest victory is winning without fighting.' },
  { id: 'str-002', category: 'strategy', text: 'In chess, controlling the four central squares gives pieces greater mobility and reach.' },
  { id: 'str-003', category: 'strategy', text: 'The "OODA loop" — Observe, Orient, Decide, Act — describes cycling through decisions faster than a rival.' },
  { id: 'str-004', category: 'strategy', text: 'A "Pyrrhic victory" is a win so costly it is nearly as damaging as a defeat.' },
  { id: 'str-005', category: 'strategy', text: 'In game theory, a Nash equilibrium is a state where no player gains by changing strategy alone.' },
  { id: 'str-006', category: 'strategy', text: 'The prisoner’s dilemma shows how two rational actors may fail to cooperate even when it helps both.' },
  { id: 'str-007', category: 'strategy', text: 'Hannibal’s double envelopment at Cannae is still studied as a model of encirclement.' },
  { id: 'str-008', category: 'strategy', text: 'In chess, a "gambit" sacrifices material early to gain position or initiative.' },
  { id: 'str-009', category: 'strategy', text: 'Logistics — supply, movement, and maintenance — often decides campaigns more than battles do.' },
  { id: 'str-010', category: 'strategy', text: 'The "sunk cost fallacy" is continuing something only because of what you’ve already invested.' },
  { id: 'str-011', category: 'strategy', text: 'Concentrating force at a decisive point, rather than spreading it thin, is a classic military principle.' },
  { id: 'str-012', category: 'strategy', text: 'In negotiation, knowing your best alternative to a deal (your BATNA) strengthens your position.' },
  { id: 'str-013', category: 'strategy', text: 'A "zugzwang" in chess is a position where any move a player makes worsens their situation.' },
  { id: 'str-014', category: 'strategy', text: 'Deception and surprise are recurring themes across nearly every classic treatise on strategy.' },
  { id: 'str-015', category: 'strategy', text: 'Breaking a large goal into the smallest next action lowers the effort needed to begin.' },

  // ── Mythology ────────────────────────────────────────────────────────────
  { id: 'myt-001', category: 'mythology', text: 'In Greek myth, Prometheus stole fire from the gods and gave it to humankind.' },
  { id: 'myt-002', category: 'mythology', text: 'The Norse god Odin sacrificed one of his eyes for wisdom at the well of Mimir.' },
  { id: 'myt-003', category: 'mythology', text: 'In Egyptian myth, Anubis, the jackal-headed god, guided and protected the dead.' },
  { id: 'myt-004', category: 'mythology', text: 'The labyrinth of Greek myth was built by Daedalus to contain the Minotaur.' },
  { id: 'myt-005', category: 'mythology', text: 'In Norse mythology, the rainbow bridge Bifröst links the human world to Asgard.' },
  { id: 'myt-006', category: 'mythology', text: 'The phoenix, found in several mythologies, is reborn from the ashes of its predecessor.' },
  { id: 'myt-007', category: 'mythology', text: 'Icarus fell because he flew too close to the sun, melting the wax of his wings.' },
  { id: 'myt-008', category: 'mythology', text: 'Thor, the Norse thunder god, wields the hammer Mjölnir.' },
  { id: 'myt-009', category: 'mythology', text: 'In Greek myth, the Sirens lured sailors to their deaths with enchanting song.' },
  { id: 'myt-010', category: 'mythology', text: 'The Roman god Janus, of doorways and beginnings, is depicted with two faces looking both ways.' },
  { id: 'myt-011', category: 'mythology', text: 'In Greek myth, Pandora’s jar released all the world’s troubles, leaving only hope inside.' },
  { id: 'myt-012', category: 'mythology', text: 'The many-headed Hydra grew two heads for each one cut off, until Heracles defeated it.' },
  { id: 'myt-013', category: 'mythology', text: 'Yggdrasil, the world tree of Norse myth, connects the nine worlds.' },
  { id: 'myt-014', category: 'mythology', text: 'In Greek myth, Charon ferried the souls of the dead across the river Styx.' },
  { id: 'myt-015', category: 'mythology', text: 'The Sphinx of Greek myth killed those who could not answer its riddle.' },
]
