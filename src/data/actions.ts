/* Pure state transitions. The store applies these and persists whatever they mark dirty. */
import type { Content } from '../content/build'
import { newlyUnlocked, type Achievement } from '../lib/achievements'
import { dayKey, weekId } from '../lib/dates'
import { newCard, Rating, retrievability, review, State, type Grade } from '../lib/srs'
import { applyActivity, type StreakUpdate } from '../lib/streak'
import { lessonXp } from '../lib/xp'
import { cardId, parseCardId, type AppState, type DayLog, type StoredCard } from './types'

export interface Dirty {
  root?: boolean
  cards?: string[]
}

export interface Result<T = unknown> {
  state: AppState
  dirty: Dirty
  info: T
}

const emptyDay = (): DayLog => ({ xp: 0, lessons: 0, reviews: 0, newCards: 0 })

function touchDay(s: AppState, today: string, patch: (d: DayLog) => DayLog): AppState {
  return { ...s, days: { ...s.days, [today]: patch(s.days[today] ?? emptyDay()) } }
}

/** Add XP and count today as an active day for the streak. */
export function addXp(s: AppState, amount: number, now: Date): { state: AppState; streak: StreakUpdate } {
  const today = dayKey(now)
  const week = weekId(now)
  const up = applyActivity(s.stats, today)
  let next: AppState = {
    ...s,
    stats: {
      ...s.stats,
      ...up.next,
      xp: s.stats.xp + amount,
      weekId: week,
      weeklyXp: (s.stats.weekId === week ? s.stats.weeklyXp : 0) + amount,
    },
  }
  next = touchDay(next, today, (d) => ({ ...d, xp: d.xp + amount }))
  for (const fd of up.frozenDays) next = touchDay(next, fd, (d) => ({ ...d, frozen: true }))
  return { state: next, streak: up }
}

export interface LessonInput {
  lessonId: string
  mode: 'learn' | 'practice'
  /** Mistakes per item id. */
  mistakesByItem: Record<string, number>
  maxCombo: number
  /** Exercises answered (including retries). */
  answered: number
  correct: number
}

export interface LessonSummary {
  xp: ReturnType<typeof lessonXp>
  accuracy: number
  streak: StreakUpdate
  achievements: Achievement[]
  newWords: number
}

export function completeLesson(s: AppState, input: LessonInput, content: Content, now: Date): Result<LessonSummary> {
  const lesson = content.lessons.get(input.lessonId)
  if (!lesson) throw new Error(`Unknown lesson ${input.lessonId}`)
  const mistakes = Object.values(input.mistakesByItem).reduce((a, b) => a + b, 0)
  const xp = lessonXp({ mode: input.mode, mistakes, maxCombo: input.maxCombo })
  const accuracy = input.answered ? input.correct / input.answered : 1

  const { state: afterXp, streak } = addXp(s, xp.total, now)
  let next = afterXp
  const today = dayKey(now)
  const prev = next.lessons[lesson.id]
  next = {
    ...next,
    lessons: {
      ...next.lessons,
      [lesson.id]: {
        completedAt: now.getTime(),
        timesCompleted: (prev?.timesCompleted ?? 0) + 1,
        bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, accuracy),
      },
    },
  }
  next = touchDay(next, today, (d) => ({ ...d, lessons: d.lessons + 1 }))

  // First time through: the words join the flashcard deck.
  const cards: Record<string, StoredCard> = { ...next.cards }
  const dirtyCards: string[] = []
  let newWords = 0
  const tomorrow = new Date(now)
  tomorrow.setHours(24, 0, 0, 0)
  for (const itemId of lesson.items) {
    const readId = cardId(itemId, 'read')
    if (!cards[readId]) {
      const grade: Grade = (input.mistakesByItem[itemId] ?? 0) > 0 ? Rating.Again : Rating.Good
      cards[readId] = review(newCard(now), grade, now)
      dirtyCards.push(readId)
      newWords++
    }
    const sayId = cardId(itemId, 'say')
    if (!cards[sayId]) {
      cards[sayId] = { ...newCard(now), due: tomorrow.getTime() }
      dirtyCards.push(sayId)
    }
  }
  next = { ...next, cards }

  const achievements = newlyUnlocked(next, { units: content.units, lastLesson: { mistakes } })
  if (achievements.length) {
    next = {
      ...next,
      achievements: { ...next.achievements, ...Object.fromEntries(achievements.map((a) => [a.id, now.getTime()])) },
    }
  }
  return {
    state: next,
    dirty: { root: true, cards: dirtyCards },
    info: { xp, accuracy, streak, achievements, newWords },
  }
}

/** Free practice (e.g. weak words): XP and streak only, no lesson or flashcard changes. */
export function completePractice(
  s: AppState,
  input: Pick<LessonInput, 'mistakesByItem' | 'maxCombo' | 'answered' | 'correct'>,
  content: Content,
  now: Date,
): Result<LessonSummary> {
  const mistakes = Object.values(input.mistakesByItem).reduce((a, b) => a + b, 0)
  const xp = lessonXp({ mode: 'practice', mistakes, maxCombo: input.maxCombo })
  const { state: afterXp, streak } = addXp(s, xp.total, now)
  let next = touchDay(afterXp, dayKey(now), (d) => ({ ...d, lessons: d.lessons + 1 }))
  const achievements = newlyUnlocked(next, { units: content.units, lastLesson: { mistakes } })
  if (achievements.length) {
    next = {
      ...next,
      achievements: { ...next.achievements, ...Object.fromEntries(achievements.map((a) => [a.id, now.getTime()])) },
    }
  }
  return {
    state: next,
    dirty: { root: true },
    info: { xp, accuracy: input.answered ? input.correct / input.answered : 1, streak, achievements, newWords: 0 },
  }
}

/** Finishing a story: XP (more the first time), recorded alongside lessons under its story id. */
export function completeStory(
  s: AppState,
  storyId: string,
  result: { correct: number; total: number },
  content: Content,
  now: Date,
): Result<LessonSummary> {
  const prev = s.lessons[storyId]
  const mistakes = result.total - result.correct
  const xp = lessonXp({ mode: prev ? 'practice' : 'learn', mistakes, maxCombo: 0 })
  const accuracy = result.total ? result.correct / result.total : 1
  const { state: afterXp, streak } = addXp(s, xp.total, now)
  let next: AppState = {
    ...afterXp,
    lessons: {
      ...afterXp.lessons,
      [storyId]: {
        completedAt: now.getTime(),
        timesCompleted: (prev?.timesCompleted ?? 0) + 1,
        bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, accuracy),
      },
    },
  }
  next = touchDay(next, dayKey(now), (d) => ({ ...d, lessons: d.lessons + 1 }))
  const achievements = newlyUnlocked(next, { units: content.units, lastLesson: { mistakes } })
  if (achievements.length) {
    next = {
      ...next,
      achievements: { ...next.achievements, ...Object.fromEntries(achievements.map((a) => [a.id, now.getTime()])) },
    }
  }
  return { state: next, dirty: { root: true }, info: { xp, accuracy, streak, achievements, newWords: 0 } }
}

/** A unit's story opens once you've done half of the unit. */
export const STORY_UNLOCK_LESSONS = 3

export function isStoryUnlocked(s: AppState, unitId: string, content: Content): boolean {
  const unit = content.units.find((u) => u.id === unitId)
  if (!unit) return false
  return unit.lessons.filter((l) => s.lessons[l.id]).length >= Math.min(STORY_UNLOCK_LESSONS, unit.lessons.length)
}

/** Learned items you're most likely to have forgotten. */
export function weakestItems(s: AppState, n: number, now: Date, content: Content): string[] {
  const scored: [string, number][] = []
  for (const [id, c] of Object.entries(s.cards)) {
    const { itemId, dir } = parseCardId(id)
    if (dir !== 'read' || !content.items.has(itemId)) continue
    scored.push([itemId, retrievability(c, now) - c.lapses * 0.05])
  }
  scored.sort((a, b) => a[1] - b[1])
  return scored.slice(0, n).map(([id]) => id)
}

export function reviewCard(
  s: AppState,
  id: string,
  grade: Grade,
  content: Content,
  now: Date,
): Result<{ achievements: Achievement[]; streak: StreakUpdate }> {
  const card = s.cards[id]
  if (!card) throw new Error(`Unknown card ${id}`)
  const wasNew = card.state === State.New
  const { state: afterXp, streak } = addXp(s, 1, now)
  let next: AppState = { ...afterXp, cards: { ...afterXp.cards, [id]: review(card, grade, now) } }
  next = touchDay(next, dayKey(now), (d) => ({ ...d, reviews: d.reviews + 1, newCards: d.newCards + (wasNew ? 1 : 0) }))
  const achievements = newlyUnlocked(next, { units: content.units })
  if (achievements.length) {
    next = {
      ...next,
      achievements: { ...next.achievements, ...Object.fromEntries(achievements.map((a) => [a.id, now.getTime()])) },
    }
  }
  return { state: next, dirty: { root: true, cards: [id] }, info: { achievements, streak } }
}

/** Cards due now: overdue reviews first, then new cards up to today's limit. */
export function dueCardIds(s: AppState, now: Date, content: Content): { review: string[]; fresh: string[] } {
  const t = now.getTime()
  const reviewIds: [string, number][] = []
  const fresh: string[] = []
  for (const [id, c] of Object.entries(s.cards)) {
    if (!content.items.has(parseCardId(id).itemId)) continue // content removed
    if (c.due > t) continue
    if (c.state === State.New) fresh.push(id)
    else reviewIds.push([id, c.due])
  }
  reviewIds.sort((a, b) => a[1] - b[1])
  const usedToday = s.days[dayKey(now)]?.newCards ?? 0
  const allowance = Math.max(0, s.settings.newPerDay - usedToday)
  return { review: reviewIds.map(([id]) => id), fresh: fresh.slice(0, allowance) }
}

/** Lesson unlocked if it's the first in its unit or the previous lesson in the unit is done. */
export function isLessonUnlocked(s: AppState, lessonId: string, content: Content): boolean {
  const l = content.lessons.get(lessonId)
  if (!l) return false
  if (l.index === 0) return true
  const unit = content.units.find((u) => u.id === l.unitId)!
  return !!s.lessons[unit.lessons[l.index - 1].id]
}

/** The next lesson to do: first unfinished lesson in path order. */
export function nextLessonId(s: AppState, content: Content): string | null {
  return content.lessonOrder.find((l) => !s.lessons[l.id])?.id ?? null
}
