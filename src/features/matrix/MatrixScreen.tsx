import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { buildPriorityContext, effectiveUrgency } from '../../domain/priority'
import { completionRewards } from '../../domain/xp'
import { useNow } from '../../hooks/useNow'
import type { TaskRow } from '../../types/rows'
import { setTaskPriority } from '../tasks/taskActions'
import { pointToPosition, type MatrixPosition } from './matrixMath'

const NUDGE = 5 // arrow-key step — the keyboard path to the same drag

/**
 * Eisenhower matrix (v1.1): every open task is a draggable chip. Dragging
 * writes its base importance/urgency live to Dexie (instant, local, P1);
 * the rendered x-position is the EFFECTIVE urgency, so deadlines, subtasks
 * and waiting tasks visibly pull a chip toward "do first" on their own.
 * Position is what prices the task's XP — the preview makes that felt (P6).
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
  const surfaceRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<(MatrixPosition & { id: string }) | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (!tasks || !links) return null
  const ctx = buildPriorityContext(tasks, links)

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

  return (
    <div className="flex flex-col gap-3">
      <p className="min-h-10 text-sm text-ink-muted" role="status">
        {selected && selectedPos ? (
          <>
            <span className="font-medium text-ink-base">{selected.text}</span>
            {' — importance '}
            {selectedPos.importance} · urgency {selectedPos.urgency} · worth{' '}
            <span className="font-medium text-ink-base">
              {completionRewards(selectedPos.importance, selectedPos.urgency, false).xp} XP
            </span>
          </>
        ) : (
          'Drag a task to set how important and urgent it is — its spot decides the XP it pays.'
        )}
      </p>

      <div className="flex justify-between text-xs text-ink-muted">
        <span>↑ more important</span>
        <span>more urgent →</span>
      </div>

      <div
        ref={surfaceRef}
        role="application"
        aria-label="Eisenhower matrix"
        className="relative aspect-square w-full touch-none select-none overflow-hidden rounded-card bg-surface-raised shadow-card"
      >
        {/* quadrant cross + quiet labels — orientation, never judgement (P8) */}
        <div aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px bg-surface-overlay" />
        <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-surface-overlay" />
        <span className="pointer-events-none absolute left-2 top-2 text-xs text-ink-muted">
          Plan ahead
        </span>
        <span className="pointer-events-none absolute right-2 top-2 text-xs text-ink-muted">
          Do first
        </span>
        <span className="pointer-events-none absolute bottom-2 left-2 text-xs text-ink-muted">
          Whenever
        </span>
        <span className="pointer-events-none absolute bottom-2 right-2 text-xs text-ink-muted">
          Fit in
        </span>

        {tasks.length === 0 && (
          <p className="absolute inset-0 grid place-items-center p-6 text-center text-ink-muted">
            Nothing to place yet — capture a task first.
          </p>
        )}

        {tasks.map((task) => {
          const pos = displayPos(task)
          const isSelected = selected?.id === task.id
          return (
            <button
              key={task.id}
              type="button"
              aria-label={`Move "${task.text}" in the matrix`}
              onPointerDown={(e) => beginDrag(e, task)}
              onPointerMove={(e) => moveDrag(e, task)}
              onPointerUp={() => endDrag(task)}
              onPointerCancel={() => endDrag(task)}
              onKeyDown={(e) => nudge(e, task)}
              onClick={() => setSelectedId(task.id)}
              style={{ left: `${pos.urgency}%`, top: `${100 - pos.importance}%` }}
              className={`absolute min-h-11 max-w-32 -translate-x-1/2 -translate-y-1/2 touch-none truncate rounded-pill px-3 py-2 text-xs shadow-card ${
                isSelected
                  ? 'z-10 bg-accent-strong text-accent-ink'
                  : 'bg-surface-overlay text-ink-base'
              } ${drag?.id === task.id ? '' : 'motion-safe:transition-[left,top] motion-safe:duration-enter motion-safe:ease-standard'}`}
            >
              {task.text}
            </button>
          )
        })}
      </div>

      <p className="text-xs text-ink-muted">
        A deadline, a subtask, or a task waiting on this one can pull urgency up on its own.
        Arrow keys move the selected task too.
      </p>
    </div>
  )
}
