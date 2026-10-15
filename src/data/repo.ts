import type { Dirty } from './actions'
import type { AppState } from './types'

export interface Repo {
  load(): Promise<AppState>
  save(state: AppState, dirty: Dirty): Promise<void>
  clear(): Promise<void>
}
