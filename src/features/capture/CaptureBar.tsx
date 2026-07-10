import { useRef, useState, type FormEvent } from 'react'
import { addTask } from '../tasks/taskActions'

/**
 * The capture affordance (FR-01/02, P2): always visible, one field, nothing
 * else asked — type, enter, done, and the input keeps focus for the next one.
 * The write is local (Dexie), so capture works identically offline (FR-05).
 */
export function CaptureBar() {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!text.trim()) return
    void addTask(text)
    setText('')
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <label htmlFor="capture" className="sr-only">
        Capture a task
      </label>
      <input
        id="capture"
        ref={inputRef}
        type="text"
        autoFocus
        autoComplete="off"
        enterKeyHint="done"
        placeholder="What's one small thing?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full rounded-control bg-surface-raised px-4 py-3 text-ink-strong shadow-card placeholder:text-ink-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-base"
      />
      <button
        type="submit"
        aria-label="Add task"
        className="grid size-12 shrink-0 place-items-center rounded-control bg-accent-strong text-2xl font-medium text-accent-ink transition-colors duration-enter ease-standard hover:bg-accent-base"
      >
        +
      </button>
    </form>
  )
}
