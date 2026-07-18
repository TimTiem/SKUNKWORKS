import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { buildPriorityContext, effectiveUrgency, openBlockers } from '../../domain/priority'
import { completionRewards } from '../../domain/xp'
import { useNow } from '../../hooks/useNow'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import type { TaskRow } from '../../types/rows'
import { setTaskPriority } from '../tasks/taskActions'
import { pointToPosition, type MatrixPosition } from './matrixMath'

const NUDGE = 5 // arrow-key step — the keyboard path to the same drag

/** Chip sizing tightens as the board fills so a busy matrix stays legible;
 * the hover/focus tooltip carries the full text at any density. */
function chipSizing(count: number) {
  if (count > 22) return 'min-h-9 max-w-24 px-2 py-1 text-[10px]'
  if (count > 11) return 'min-h-10 max-w-28 px-2.5 py-1.5 text-[11px]'
  return 'min-h-11 max-w-32 px-3 py-2 text-xs'
}

/**
 * Eisenhower matrix (v1.1): every open task is a draggable chip. Dragging
 * writes its base importance/urgency live to Dexie (instant, local, P1);
 * the rendered x-position is the EFFECTIVE urgency, so deadlines, subtasks
 * and waiting tasks visibly pull a chip toward "do first" on their own.
 * Position is what prices the task's XP — the preview makes that felt (P6).
 *
 * Layout is responsive: a single stacked column on a phone, and on a wide/
 * ultrawide desktop the square grows to fill the viewport height with a
 * details + legend rail alongside it. Dependencies are drawn as quiet lines
 * from a task to whatever it's waiting on; text stays readable via tooltips.
 */
export function MatrixScreen() {
  const tasks = useLiveQuery(
    () =>
      db.tasks
        .where('status')
        .equals('open')
        .filter((t) => t.deleted_at === null)
        .toArray(),
    [],
  )
  const links = useLiveQuery(
    () => db.task_links.filter((l) => l.deleted_at === null).toArray(),
    [],
  )
  const nowMs = useNow()
  const reducedMotion = usePrefersReducedMotion()
  const surfaceRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<(MatrixPosition & { id: string }) | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)

  if (!tasks || !links) return null
  const ctx = buildPriorityContext(tasks, links)
  const byId = new Map(tasks.map((t) => [t.id, t]))

  const displayPos = (t: TaskRow): MatrixPosition =>
    drag?.id === t.id
      ? drag
      : { importance: t.importance, urgency: effectiveUrgency(t.id, ctx, nowMs) }

  function positionFromPointer(e: React.PointerEvent): MatrixPosition | null {
    const rect = surfaceRef.current?.getBoundingClientRect()
    return rect ? pointToPosition(rect, e.clientX, e.clientY) : null
  }

  function beginDrag(e: React.PointerEvent, task: TaskRow) {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setSelectedId(task.id)
    const pos = positionFromPointer(e)
    if (pos) setDrag({ id: task.id, ...pos })
  }

  function moveDrag(e: React.PointerEvent, task: TaskRow) {
    if (drag?.id !== task.id) return
    const pos = positionFromPointer(e)
    if (pos) setDrag({ id: task.id, ...pos })
  }

  function endDrag(task: TaskRow) {
    if (drag?.id !== task.id) return
    void setTaskPriority(task, drag)
    setDrag(null)
  }

  function nudge(e: React.KeyboardEvent, task: TaskRow) {
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-NUDGE, 0],
      ArrowRight: [NUDGE, 0],
      ArrowUp: [0, NUDGE],
      ArrowDown: [0, -NUDGE],
    }
    const d = delta[e.key]
    if (!d) return
    e.preventDefault()
    setSelectedId(task.id)
    void setTaskPriority(task, {
      urgency: task.urgency + d[0],
      importance: task.importance + d[1],
    })
  }

  const selected = tasks.find((t) => t.id === (drag?.id ?? selectedId)) ?? null
  const selectedPos = selected ? displayPos(selected) : null
  const selectedBlockers = selected ? openBlockers(selected.id, links, ctx) : []
  const hovered = !drag && hoverId ? (byId.get(hoverId) ?? null) : null
  const hoveredPos = hovered ? displayPos(hovered) : null
  const chipClass = chipSizing(tasks.length)

  // One connector per pair of tasks (either direction). Duplicate link rows
  // otherwise stack two overlapping lines — invisible as lines, but each
  // carries its own phase-shifted arrow, so the same connector could show
  // two arrows at once. Collapsing to unique pairs guarantees max one.
  const seenPairs = new Set<string>()
  const connectors = links.filter((l) => {
    const key = [l.blocker_id, l.blocked_id].sort().join(" ")
    if (seenPairs.has(key)) return false
    seenPairs.add(key)
    return true
  })

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-center lg:gap-6">
      <div className="flex min-w-0 flex-col gap-3 lg:basis-[68vh] lg:shrink">
        <p className="min-h-10 text-sm text-ink-muted" role="status">
          {selected && selectedPos ? (
            <>
              <span className="font-medium text-ink-base">{selected.text}</span>
              {' — importance '}
              {selectedPos.importance} · urgency {selectedPos.urgency} · worth{' '}
              <span className="font-display tracking-wide text-accent-base">
                {completionRewards(selectedPos.importance, selectedPos.urgency, false).xp} XP
              </span>
            </>
          ) : (
            'Drag a task to set how important and urgent it is — its spot decides the XP it pays.'
          )}
        </p>

        <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          <span>↑ more important</span>
          <span>more urgent →</span>
        </div>

        <div
          ref={surfaceRef}
          role="application"
          aria-label="Eisenhower matrix"
          className="matrix-surface relative aspect-square w-full touch-none select-none overflow-hidden rounded-card bg-surface-raised shadow-card"
        >
          {/* quadrant cross + quiet labels — orientation, never judgement (P8) */}
          <div aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px bg-ink-muted/20" />
          <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-ink-muted/20" />
          <span className="matrix-label pointer-events-none absolute left-2.5 top-2.5 text-ink-muted/80">
            Plan ahead
          </span>
          <span className="matrix-label pointer-events-none absolute right-2.5 top-2.5 text-accent-base/90">
            Do first
          </span>
          <span className="matrix-label pointer-events-none absolute bottom-2.5 left-2.5 text-ink-muted/80">
            Whenever
          </span>
          <span className="matrix-label pointer-events-none absolute bottom-2.5 right-2.5 text-ink-muted/80">
            Fit in
          </span>

          {/* Dependency lines: a quiet thread from each task to what it's
              waiting on, with a small dot at the blocker end. preserveAspect
              "none" maps the 0–100 value space straight onto the square; the
              stroke stays crisp via non-scaling-stroke. Lines sit UNDER the
              chips and follow a chip live while it's dragged.

              A tiny arrowhead — same shade as this link's line — sweeps ALONG
              it, from the task that must happen first (the dot end) toward the
              one that depends on it: a quiet read of "this before that". Just
              one arrow per connector at a time (it sweeps, then the line rests
              before the next). SMIL `animateMotion` is SVG-native so it tracks
              the value-space path exactly, even live while a chip is dragged;
              `rotate="auto"` keeps the arrow aimed down the line. Reduced
              motion drops the sweep and leaves the static thread + dot. */}
          {connectors.length > 0 && (
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {connectors.map((link, i) => {
                const from = byId.get(link.blocker_id)
                const to = byId.get(link.blocked_id)
                if (!from || !to) return null
                const a = displayPos(from)
                const b = displayPos(to)
                const lit = selected?.id === from.id || selected?.id === to.id
                // Exact same shade as this link's line (stroke-*-*/same alpha).
                const tone = lit ? 'fill-accent-base/60' : 'fill-ink-strong/20'
                // Path in value space: blocker (first) → dependent.
                const flow = `M ${a.urgency} ${100 - a.importance} L ${b.urgency} ${100 - b.importance}`
                // Stagger phases so multiple links don't drift in lockstep.
                const begin = `${-(i % 5) * 1.2}s`
                return (
                  <g key={link.id} className={lit ? 'stroke-accent-base/60' : 'stroke-ink-strong/20'}>
                    <line
                      x1={a.urgency}
                      y1={100 - a.importance}
                      x2={b.urgency}
                      y2={100 - b.importance}
                      strokeWidth={lit ? 1.75 : 1.25}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                    <circle
                      cx={a.urgency}
                      cy={100 - a.importance}
                      r={1.1}
                      className={lit ? 'fill-accent-base/70' : 'fill-ink-strong/25'}
                      stroke="none"
                    />
                    {!reducedMotion && (
                      <polygon points="0.75,0 -0.5,0.55 -0.5,-0.55" className={tone} stroke="none">
                        {/* keyPoints holds the arrow at the dependent end for the
                            last stretch of the cycle, so it sweeps once then the
                            connector rests — exactly one arrow at a time. */}
                        <animateMotion
                          dur="6s"
                          begin={begin}
                          repeatCount="indefinite"
                          rotate="auto"
                          path={flow}
                          keyPoints="0;1;1"
                          keyTimes="0;0.72;1"
                          calcMode="linear"
                        />
                        {/* Fade in on the blocker, out on arrival, dark through
                            the rest — the single arrow never overlaps itself.
                            dur MUST match animateMotion so the two stay in sync. */}
                        <animate
                          attributeName="opacity"
                          dur="6s"
                          begin={begin}
                          repeatCount="indefinite"
                          values="0;1;1;0;0"
                          keyTimes="0;0.12;0.6;0.72;1"
                        />
                      </polygon>
                    )}
                  </g>
                )
              })}
            </svg>
          )}

          {/* targeting reticle — hairlines tracking the dragged chip */}
          {drag && (
            <>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 w-px bg-accent-base/40"
                style={{ left: `${drag.urgency}%` }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 h-px bg-accent-base/40"
                style={{ top: `${100 - drag.importance}%` }}
              />
            </>
          )}

          {tasks.length === 0 && (
            <p className="absolute inset-0 grid place-items-center p-6 text-center text-ink-muted">
              Nothing to place yet — capture a task first.
            </p>
          )}

          {tasks.map((task) => {
            const pos = displayPos(task)
            const isSelected = selected?.id === task.id
            const isDragging = drag?.id === task.id
            // A deadline, subtask, or dependent visibly pulling this chip right.
            const pulled = !isDragging && pos.urgency > task.urgency
            return (
              <button
                key={task.id}
                type="button"
                aria-label={`Move "${task.text}" in the matrix`}
                title={task.text}
                onPointerDown={(e) => beginDrag(e, task)}
                onPointerMove={(e) => moveDrag(e, task)}
                onPointerUp={() => endDrag(task)}
                onPointerCancel={() => endDrag(task)}
                onKeyDown={(e) => nudge(e, task)}
                onClick={() => setSelectedId(task.id)}
                onMouseEnter={() => setHoverId(task.id)}
                onMouseLeave={() => setHoverId((h) => (h === task.id ? null : h))}
                onFocus={() => setHoverId(task.id)}
                onBlur={() => setHoverId((h) => (h === task.id ? null : h))}
                style={{ left: `${pos.urgency}%`, top: `${100 - pos.importance}%` }}
                className={`motion-enter absolute -translate-x-1/2 -translate-y-1/2 touch-none truncate rounded-pill ${chipClass} ${
                  isSelected
                    ? 'z-10 bg-accent-strong text-accent-ink ring-2 ring-accent-base'
                    : 'bg-surface-overlay text-ink-base ring-1 ring-ink-muted/15'
                } ${
                  isDragging
                    ? 'z-20 scale-110 cursor-grabbing shadow-pop'
                    : 'cursor-grab shadow-card motion-safe:transition-[left,top,transform] motion-safe:duration-enter motion-safe:ease-standard'
                }`}
              >
                {pulled && (
                  <span aria-hidden="true" className={isSelected ? 'mr-1' : 'mr-1 text-accent-base'}>
                    »
                  </span>
                )}
                {task.text}
              </button>
            )
          })}

          {/* Full text on hover/focus, right where you're looking — the answer
              to a crowded board without growing the chips. */}
          {hovered && hoveredPos && (
            <span
              aria-hidden="true"
              style={{ left: `${hoveredPos.urgency}%`, top: `${100 - hoveredPos.importance}%` }}
              className={`pointer-events-none absolute z-40 max-w-[70%] -translate-x-1/2 rounded-control bg-surface-overlay px-2.5 py-1.5 text-xs leading-snug text-ink-strong shadow-pop ${
                hoveredPos.importance > 82 ? 'translate-y-6' : '-translate-y-[calc(100%+1.5rem)]'
              }`}
            >
              {hovered.text}
            </span>
          )}

          {/* the reward, right where you're looking (P6) */}
          {drag && selected && selectedPos && (
            <span
              aria-hidden="true"
              style={{ left: `${drag.urgency}%`, top: `${100 - drag.importance}%` }}
              className={`pointer-events-none absolute z-30 -translate-x-1/2 rounded-pill bg-surface-base/90 px-2.5 py-1 font-display text-xs tracking-wide text-accent-base shadow-pop ${
                drag.importance > 82 ? 'translate-y-[1.6rem]' : '-translate-y-[3.1rem]'
              }`}
            >
              +{completionRewards(selectedPos.importance, selectedPos.urgency, false).xp} XP
            </span>
          )}
        </div>

        <p className="text-xs text-ink-muted">
          A deadline, a subtask, or a task waiting on this one can pull urgency up on its own.
          Arrow keys move the selected task too.
        </p>
      </div>

      {/* Details + legend rail — appears once there's room (desktop/ultrawide),
          putting the horizontal space to work instead of stretching the square. */}
      <aside className="hidden shrink-0 lg:flex lg:basis-64 lg:flex-col lg:gap-4">
        <div className="rounded-card bg-surface-raised p-4 shadow-card">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Selected
          </h3>
          {selected && selectedPos ? (
            <div className="flex flex-col gap-2">
              <p className="font-medium text-ink-strong">{selected.text}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
                <span>importance {selectedPos.importance}</span>
                <span>urgency {selectedPos.urgency}</span>
              </div>
              <p className="text-sm text-ink-muted">
                worth{' '}
                <span className="font-display tracking-wide text-accent-base">
                  {completionRewards(selectedPos.importance, selectedPos.urgency, false).xp} XP
                </span>{' '}
                where it sits
              </p>
              {selectedBlockers.length > 0 && (
                <p className="text-sm text-ink-muted">
                  Waiting on:{' '}
                  <span className="text-ink-base">
                    {selectedBlockers.map((b) => b.text).join(', ')}
                  </span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">
              Tap a task to see its priority, its XP, and what it's waiting on.
            </p>
          )}
        </div>

        <div className="rounded-card bg-surface-raised p-4 shadow-card">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Legend
          </h3>
          <ul className="flex flex-col gap-1.5 text-sm text-ink-muted">
            <li className="flex items-center gap-2">
              <span className="size-2 shrink-0 rounded-pill bg-accent-base" />
              Top-right — do first
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2 shrink-0 rounded-pill bg-ink-muted/60" />
              Top-left — plan ahead
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="text-accent-base">
                »
              </span>
              Pulled by a deadline or dependent
            </li>
            <li className="flex items-center gap-2">
              <svg aria-hidden="true" viewBox="0 0 24 8" className="h-2 w-6 shrink-0">
                <line x1="2" y1="4" x2="19" y2="4" className="stroke-ink-strong/40" strokeWidth="1.5" />
                <circle cx="2" cy="4" r="1.6" className="fill-ink-strong/50" />
                <polygon points="23,4 18,6.2 18,1.8" className="fill-ink-strong/50" />
              </svg>
              Arrow drifts to the task that waits
            </li>
          </ul>
        </div>

        <p className="px-1 text-xs text-ink-muted">
          {tasks.length} task{tasks.length === 1 ? '' : 's'} placed
          {links.length > 0 && (
            <>
              {' · '}
              {links.length} dependenc{links.length === 1 ? 'y' : 'ies'}
            </>
          )}
        </p>
      </aside>
    </div>
  )
}
