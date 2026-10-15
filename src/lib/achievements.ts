import type { Unit } from '../content/schema'
import type { AppState } from '../data/types'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  check: (s: AppState, ctx: AchievementContext) => boolean
}

export interface AchievementContext {
  units: Unit[]
  /** Set when checking right after a lesson. */
  lastLesson?: { mistakes: number }
}

const learnedCount = (s: AppState) => Object.keys(s.cards).filter((k) => k.endsWith('__read')).length
const storiesDone = (s: AppState) => Object.keys(s.lessons).filter((k) => k.startsWith('story-')).length
const totalReviews = (s: AppState) => Object.values(s.days).reduce((n, d) => n + d.reviews, 0)

const UNIT_BADGES: Record<string, [string, string]> = {
  u01: ['Can Read Liao', '📖'],
  u02: ['Money No Enough', '💰'],
  u03: ['Kopi Master', '☕'],
  u04: ['MRT Navigator', '🚇'],
  u05: ['HDB Heartlander', '🏢'],
  u06: ['Family Gathering', '👨‍👩‍👧'],
  u07: ['Adulting Pro', '💼'],
  u08: ['Ah Boy Graduate', '🎓'],
  u09: ['Festive Spirit', '🧧'],
  u10: ['Steady Lah', '😎'],
}

const STATIC: Achievement[] = [
  { id: 'first-lesson', title: 'First Step', description: 'Finish your first lesson', icon: '👣', check: (s) => Object.keys(s.lessons).length >= 1 },
  { id: 'perfect', title: 'Zero Mistakes', description: 'Finish a lesson without a single mistake', icon: '💯', check: (_s, c) => c.lastLesson?.mistakes === 0 },
  { id: 'words-25', title: 'Word Collector', description: 'Learn 25 words', icon: '🧺', check: (s) => learnedCount(s) >= 25 },
  { id: 'words-100', title: 'Century', description: 'Learn 100 words', icon: '💯', check: (s) => learnedCount(s) >= 100 },
  { id: 'words-250', title: 'Walking Dictionary', description: 'Learn 250 words', icon: '📚', check: (s) => learnedCount(s) >= 250 },
  { id: 'streak-3', title: 'Warming Up', description: 'Reach a 3-day streak', icon: '🔥', check: (s) => s.stats.longestStreak >= 3 },
  { id: 'streak-7', title: 'One Week Strong', description: 'Reach a 7-day streak', icon: '🗓️', check: (s) => s.stats.longestStreak >= 7 },
  { id: 'streak-30', title: 'Habit Formed', description: 'Reach a 30-day streak', icon: '🏅', check: (s) => s.stats.longestStreak >= 30 },
  { id: 'streak-100', title: 'Unstoppable', description: 'Reach a 100-day streak', icon: '🏆', check: (s) => s.stats.longestStreak >= 100 },
  { id: 'reviews-100', title: 'Spaced Out', description: 'Do 100 flashcard reviews', icon: '🃏', check: (s) => totalReviews(s) >= 100 },
  { id: 'reviews-1000', title: 'Memory Palace', description: 'Do 1,000 flashcard reviews', icon: '🧠', check: (s) => totalReviews(s) >= 1000 },
  { id: 'story-1', title: 'Story Time', description: 'Finish your first story', icon: '📖', check: (s) => storiesDone(s) >= 1 },
  { id: 'stories-all', title: 'Bookworm', description: 'Finish every story', icon: '🐛', check: (s, c) => storiesDone(s) >= c.units.length },
  { id: 'xp-1000', title: 'Grinder', description: 'Earn 1,000 XP', icon: '⚡', check: (s) => s.stats.xp >= 1000 },
]

export function allAchievements(units: Unit[]): Achievement[] {
  const unitBadges: Achievement[] = units.map((u) => {
    const [title, icon] = UNIT_BADGES[u.id] ?? [`${u.title} Complete`, u.emoji]
    return {
      id: `unit-${u.id}`,
      title,
      description: `Finish every lesson in “${u.title}”`,
      icon,
      check: (s) => u.lessons.every((l) => s.lessons[l.id]),
    }
  })
  return [...STATIC, ...unitBadges]
}

/** Ids of achievements newly earned in this state. */
export function newlyUnlocked(s: AppState, ctx: AchievementContext): Achievement[] {
  return allAchievements(ctx.units).filter((a) => !s.achievements[a.id] && a.check(s, ctx))
}
