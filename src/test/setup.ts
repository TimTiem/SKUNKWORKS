// In-memory IndexedDB so tests exercise the real Dexie flow (jsdom has none).
// Must load before anything imports src/db/db.ts.
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// RTL auto-cleanup relies on a global `afterEach`, which we don't enable
// (vitest globals are off) — so register it explicitly.
afterEach(cleanup)
