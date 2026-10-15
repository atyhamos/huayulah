import type { Exercise } from '../../lib/exercises'

export interface ExerciseResult {
  correct: boolean
  /** Items the learner got wrong (defaults to the exercise's item when incorrect). */
  wrongItemIds?: string[]
  /** For speaking: what the recogniser heard and how close it was. */
  heard?: string
  score?: number
  /** Learner chose to skip (e.g. can't speak now) — not counted either way. */
  skipped?: boolean
}

export interface ExProps<K extends Exercise['kind']> {
  ex: Extract<Exercise, { kind: K }>
  locked: boolean
  onSubmit: (r: ExerciseResult) => void
}
