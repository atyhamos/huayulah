import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs'
import type { StoredCard } from '../data/types'

export { Rating, State }
export type { Grade }

// Lessons already drill new words within the session, so skip FSRS's minute-level
// learning steps and schedule straight in days.
const scheduler = fsrs(
  generatorParameters({
    request_retention: 0.9,
    maximum_interval: 365 * 2,
    enable_fuzz: true,
    enable_short_term: false,
    learning_steps: [],
    relearning_steps: [],
  }),
)

export function toCard(s: StoredCard): Card {
  return {
    ...s,
    due: new Date(s.due),
    state: s.state as State,
    last_review: s.last_review == null ? undefined : new Date(s.last_review),
  }
}

export function fromCard(c: Card): StoredCard {
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review ? c.last_review.getTime() : null,
  }
}

export function newCard(now: Date = new Date()): StoredCard {
  return fromCard(createEmptyCard(now))
}

export function review(s: StoredCard, grade: Grade, now: Date = new Date()): StoredCard {
  return fromCard(scheduler.next(toCard(s), now, grade).card)
}

/** Human-readable next interval for each grade, e.g. { 1: "1d", 3: "3d" }. */
export function previewIntervals(s: StoredCard, now: Date = new Date()): Record<Grade, string> {
  const rec = scheduler.repeat(toCard(s), now)
  const out = {} as Record<Grade, string>
  for (const g of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[]) {
    out[g] = formatInterval(rec[g].card.due.getTime() - now.getTime())
  }
  return out
}

export function formatInterval(ms: number): string {
  const min = ms / 60_000
  if (min < 60) return `${Math.max(1, Math.round(min))}m`
  const h = min / 60
  if (h < 24) return `${Math.round(h)}h`
  const d = h / 24
  if (d < 30) return `${Math.round(d)}d`
  if (d < 365) return `${Math.round(d / 30)}mo`
  return `${(d / 365).toFixed(1)}y`
}

export function isDue(s: StoredCard, now: number = Date.now()): boolean {
  return s.due <= now
}

/** Probability (0–1) of recalling the card now. New cards → 0. */
export function retrievability(s: StoredCard, now: Date = new Date()): number {
  if (s.state === State.New) return 0
  return scheduler.get_retrievability(toCard(s), now, false)
}

/** 0–4 bars for the word bank. */
export function strength(s: StoredCard | undefined): number {
  if (!s || s.state === State.New) return 0
  if (s.stability < 2) return 1
  if (s.stability < 7) return 2
  if (s.stability < 30) return 3
  return 4
}
