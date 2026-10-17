/* Pure state transitions. The store applies these and persists whatever they mark dirty. */
import type { Content } from '../content/build'
import { grammarTopics, sectionTopics } from '../content/grammar'
import { newlyUnlocked, type Achievement } from '../lib/achievements'
import { dayKey, weekId } from '../lib/dates'
import { newCard, Rating, retrievability, review, State, type Grade } from '../lib/srs'
import { allQuestsDone, dailyQuests, QUEST_BONUS_XP } from '../lib/quests'
import { applyActivity, type StreakUpdate } from '../lib/streak'
import { lessonXp } from '../lib/xp'
import { cardId, parseCardId, type AppState, type CustomItem, type DayLog, type StoredCard } from './types'

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
  const added = addItemCards(next.cards, lesson.items, input.mistakesByItem, now)
  const dirtyCards = added.dirty
  const newWords = added.newWords
  next = { ...next, cards: added.cards }

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

/**
 * Words studied for the first time join the deck: a read card graded by how the lesson went, and a
 * say card due tomorrow.
 */
export function addItemCards(
  current: Record<string, StoredCard>,
  itemIds: string[],
  mistakesByItem: Record<string, number>,
  now: Date,
): { cards: Record<string, StoredCard>; dirty: string[]; newWords: number } {
  const cards = { ...current }
  const dirty: string[] = []
  let newWords = 0
  const tomorrow = new Date(now)
  tomorrow.setHours(24, 0, 0, 0)
  for (const itemId of itemIds) {
    const readId = cardId(itemId, 'read')
    if (!cards[readId]) {
      const grade: Grade = (mistakesByItem[itemId] ?? 0) > 0 ? Rating.Again : Rating.Good
      cards[readId] = review(newCard(now), grade, now)
      dirty.push(readId)
      newWords++
    }
    const sayId = cardId(itemId, 'say')
    if (!cards[sayId]) {
      cards[sayId] = { ...newCard(now), due: tomorrow.getTime() }
      dirty.push(sayId)
    }
  }
  return { cards, dirty, newWords }
}

/** Save a word the learner found (e.g. in the Reader) to My words. */
export function addCustomItem(s: AppState, item: CustomItem): Result<null> {
  return { state: { ...s, customItems: { ...s.customItems, [item.id]: item } }, dirty: { root: true }, info: null }
}

/** Remove one of My words, with its flashcards. */
export function removeCustomItem(s: AppState, id: string): Result<null> {
  const { [id]: _gone, ...customItems } = s.customItems
  const cards = { ...s.cards }
  const dirty = [cardId(id, 'read'), cardId(id, 'say')].filter((c) => c in cards)
  for (const c of dirty) delete cards[c]
  return { state: { ...s, customItems, cards }, dirty: { root: true, cards: dirty }, info: null }
}

/** A My-words session: practice XP, and flashcards for the words studied for the first time. */
export function completeMyWords(
  s: AppState,
  input: Pick<LessonInput, 'mistakesByItem' | 'maxCombo' | 'answered' | 'correct'> & { itemIds: string[] },
  content: Content,
  now: Date,
): Result<LessonSummary> {
  const r = completePractice(s, input, content, now)
  const added = addItemCards(r.state.cards, input.itemIds, input.mistakesByItem, now)
  return {
    state: { ...r.state, cards: added.cards },
    dirty: { root: true, cards: added.dirty },
    info: { ...r.info, newWords: added.newWords },
  }
}

export const EXPRESS_PASS = 0.85
export const EXPRESS_XP = { pass: 20, fail: 5 }

/**
 * Express train result. Passing marks every unfinished stop on the line as done (tested) and adds
 * its words to the deck as already known, so reviews confirm them over the next days.
 */
export function completeExpress(
  s: AppState,
  unitId: string,
  result: { correct: number; total: number },
  content: Content,
  now: Date,
): Result<LessonSummary & { passed: boolean }> {
  const unit = content.units.find((u) => u.id === unitId)
  if (!unit) throw new Error(`Unknown unit ${unitId}`)
  const accuracy = result.total ? result.correct / result.total : 0
  const passed = accuracy >= EXPRESS_PASS
  const amount = passed ? EXPRESS_XP.pass : EXPRESS_XP.fail
  const { state: afterXp, streak } = addXp(s, amount, now)
  let next = touchDay(afterXp, dayKey(now), (d) => ({ ...d, lessons: d.lessons + 1 }))
  const dirty: Dirty = { root: true, cards: [] }
  let newWords = 0
  if (passed) {
    const lessons = { ...next.lessons }
    const itemIds: string[] = []
    for (const l of unit.lessons) {
      if (lessons[l.id]) continue
      lessons[l.id] = { completedAt: now.getTime(), timesCompleted: 0, bestAccuracy: accuracy, tested: true }
      itemIds.push(...l.items)
    }
    const added = addItemCards(next.cards, itemIds, {}, now)
    next = { ...next, lessons, cards: added.cards }
    dirty.cards = added.dirty
    newWords = added.newWords
  }
  const achievements = newlyUnlocked(next, { units: content.units })
  if (achievements.length) {
    next = {
      ...next,
      achievements: { ...next.achievements, ...Object.fromEntries(achievements.map((a) => [a.id, now.getTime()])) },
    }
  }
  return {
    state: next,
    dirty,
    info: { xp: { total: amount, base: amount, perfect: 0, combo: 0 }, accuracy, streak, achievements, newWords, passed },
  }
}

/** If today's quests are all done and the chest isn't claimed, add the bonus. */
export function claimQuestBonus(s: AppState, now: Date): { state: AppState; claimed: boolean } {
  const today = dayKey(now)
  if (s.days[today]?.questBonus || !allQuestsDone(dailyQuests(s, today))) return { state: s, claimed: false }
  const { state } = addXp(s, QUEST_BONUS_XP, now)
  return { state: touchDay(state, today, (d) => ({ ...d, questBonus: true })), claimed: true }
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

/** A grammar topic, played through: XP, streak and the daily count, like a story. */
export function completeGrammar(
  s: AppState,
  topicId: string,
  result: { correct: number; total: number; maxCombo: number },
  content: Content,
  now: Date,
): Result<LessonSummary> {
  const prev = s.lessons[topicId]
  const mistakes = result.total - result.correct
  const xp = lessonXp({ mode: prev?.timesCompleted ? 'practice' : 'learn', mistakes, maxCombo: result.maxCombo })
  const accuracy = result.total ? result.correct / result.total : 1
  const { state: afterXp, streak } = addXp(s, xp.total, now)
  let next: AppState = {
    ...afterXp,
    lessons: {
      ...afterXp.lessons,
      [topicId]: {
        completedAt: now.getTime(),
        timesCompleted: (prev?.timesCompleted ?? 0) + 1,
        bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, accuracy),
      },
    },
  }
  next = touchDay(next, dayKey(now), (d) => ({ ...d, lessons: d.lessons + 1 }))
  const achievements = newlyUnlocked(next, { units: content.units, lastLesson: { mistakes } })
  next = withAchievements(next, achievements, now)
  return { state: next, dirty: { root: true }, info: { xp, accuracy, streak, achievements, newWords: 0 } }
}

/** A grammar section test. Passing marks every unfinished topic in the section as done (tested). */
export function completeGrammarTest(
  s: AppState,
  section: number,
  result: { correct: number; total: number },
  content: Content,
  now: Date,
): Result<LessonSummary & { passed: boolean }> {
  const topics = sectionTopics(section)
  if (!topics.length) throw new Error(`Unknown grammar section ${section}`)
  const accuracy = result.total ? result.correct / result.total : 0
  const passed = accuracy >= EXPRESS_PASS
  const amount = passed ? EXPRESS_XP.pass : EXPRESS_XP.fail
  const { state: afterXp, streak } = addXp(s, amount, now)
  let next = touchDay(afterXp, dayKey(now), (d) => ({ ...d, lessons: d.lessons + 1 }))
  if (passed) {
    const lessons = { ...next.lessons }
    for (const t of topics) if (!lessons[t.id]) lessons[t.id] = { completedAt: now.getTime(), timesCompleted: 0, bestAccuracy: accuracy, tested: true }
    next = { ...next, lessons }
  }
  const achievements = newlyUnlocked(next, { units: content.units })
  next = withAchievements(next, achievements, now)
  return {
    state: next,
    dirty: { root: true },
    info: { xp: { total: amount, base: amount, perfect: 0, combo: 0 }, accuracy, streak, achievements, newWords: 0, passed },
  }
}

/** Topics open in order: the first is always open, the rest once the one before is done. */
export function isGrammarUnlocked(s: AppState, topicId: string): boolean {
  const i = grammarTopics.findIndex((t) => t.id === topicId)
  if (i < 0) return false
  return i === 0 || !!s.lessons[topicId] || !!s.lessons[grammarTopics[i - 1].id]
}

/** The first topic not done yet (null when the track is finished). */
export function nextGrammarTopic(s: AppState): string | null {
  return grammarTopics.find((t) => !s.lessons[t.id])?.id ?? null
}

function withAchievements(s: AppState, got: Achievement[], now: Date): AppState {
  return got.length ? { ...s, achievements: { ...s.achievements, ...Object.fromEntries(got.map((a) => [a.id, now.getTime()])) } } : s
}

/** A unit's story opens once you've done half of the unit. */
export const STORY_UNLOCK_LESSONS = 3

export function isStoryUnlocked(s: AppState, unitId: string, content: Content): boolean {
  const unit = content.units.find((u) => u.id === unitId)
  if (!unit) return false
  return unit.lessons.filter((l) => s.lessons[l.id]).length >= Math.min(STORY_UNLOCK_LESSONS, unit.lessons.length)
}

/** A My-words session: words not practised yet first (oldest first), then the weakest learned ones. */
export function myWordsLessonItems(s: AppState, n: number, now: Date): string[] {
  const all = Object.values(s.customItems)
  const fresh = all.filter((c) => !s.cards[cardId(c.id, 'read')]).sort((a, b) => a.addedAt - b.addedAt)
  const learned = all
    .filter((c) => s.cards[cardId(c.id, 'read')])
    .map((c) => [c.id, retrievability(s.cards[cardId(c.id, 'read')], now)] as const)
    .sort((a, b) => a[1] - b[1])
  return [...fresh.map((c) => c.id), ...learned.map(([id]) => id)].slice(0, n)
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

/** A line is "boarded" once any of its stops is done, or when the next stop in path order is on it. */
export function isLineReached(s: AppState, unitId: string, content: Content): boolean {
  const unit = content.units.find((u) => u.id === unitId)
  if (!unit) return false
  const next = nextLessonId(s, content)
  return unit.lessons.some((l) => !!s.lessons[l.id] || l.id === next)
}

/** The next lesson to do: first unfinished lesson in path order. */
export function nextLessonId(s: AppState, content: Content): string | null {
  return content.lessonOrder.find((l) => !s.lessons[l.id])?.id ?? null
}
