import { del, get, set } from 'idb-keyval'
import type { Repo } from './repo'
import { normalizeState, type AppState } from './types'

/** Progress kept in this browser only (IndexedDB). Used for guest mode. */
export class LocalRepo implements Repo {
  constructor(private key = 'huayu-lah:guest') {}

  async load(): Promise<AppState> {
    try {
      return normalizeState(await get<AppState>(this.key))
    } catch {
      return normalizeState(null)
    }
  }

  async save(state: AppState): Promise<void> {
    await set(this.key, state)
  }

  async clear(): Promise<void> {
    await del(this.key)
  }
}
