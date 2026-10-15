import { addDays, daysBetween } from './dates'

export const MAX_FREEZES = 2

export interface StreakState {
  streak: number
  longestStreak: number
  lastActiveDate: string | null
  freezes: number
}

export interface StreakUpdate {
  next: StreakState
  /** Missed days covered by streak freezes. */
  frozenDays: string[]
  extended: boolean
  earnedFreeze: boolean
}

/** Call when the learner finishes something on `today`. */
export function applyActivity(s: StreakState, today: string): StreakUpdate {
  const last = s.lastActiveDate
  if (last === today) return { next: s, frozenDays: [], extended: false, earnedFreeze: false }

  let streak = 1
  let freezes = s.freezes
  const frozenDays: string[] = []
  if (last) {
    const gap = daysBetween(last, today) - 1 // missed days
    if (gap <= 0) streak = s.streak + 1
    else if (gap <= freezes) {
      freezes -= gap
      for (let i = 1; i <= gap; i++) frozenDays.push(addDays(last, i))
      streak = s.streak + 1
    }
  }
  let earnedFreeze = false
  if (streak % 7 === 0 && freezes < MAX_FREEZES) {
    freezes += 1
    earnedFreeze = true
  }
  return {
    next: { streak, longestStreak: Math.max(s.longestStreak, streak), lastActiveDate: today, freezes },
    frozenDays,
    extended: true,
    earnedFreeze,
  }
}

/** The streak to show right now (it may have lapsed since the last activity). */
export function currentStreak(s: StreakState, today: string): { streak: number; doneToday: boolean; atRisk: boolean } {
  if (!s.lastActiveDate) return { streak: 0, doneToday: false, atRisk: false }
  const gap = daysBetween(s.lastActiveDate, today) - 1
  if (gap < 0) return { streak: s.streak, doneToday: true, atRisk: false }
  if (gap === 0) return { streak: s.streak, doneToday: false, atRisk: true }
  if (gap <= s.freezes) return { streak: s.streak, doneToday: false, atRisk: true }
  return { streak: 0, doneToday: false, atRisk: false }
}
