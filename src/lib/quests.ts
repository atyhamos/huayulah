import type { AppState, DayLog } from '../data/types'

export interface Quest {
  id: string
  icon: string
  label: string
  target: number
  progress: number
}

export const QUEST_BONUS_XP = 10

/** Today's three quests, derived from the day log — nothing extra to store. */
export function dailyQuests(s: AppState, today: string): Quest[] {
  const d: DayLog = s.days[today] ?? { xp: 0, lessons: 0, reviews: 0, newCards: 0 }
  // quest XP excludes the bonus itself
  const xp = d.xp - (d.questBonus ? QUEST_BONUS_XP : 0)
  return [
    { id: 'xp', icon: '⚡', label: `Earn ${s.settings.dailyGoal} XP`, target: s.settings.dailyGoal, progress: Math.min(xp, s.settings.dailyGoal) },
    { id: 'lessons', icon: '📘', label: 'Finish 2 lessons or stories', target: 2, progress: Math.min(d.lessons, 2) },
    { id: 'reviews', icon: '🃏', label: 'Review 10 flashcards', target: 10, progress: Math.min(d.reviews, 10) },
  ]
}

export const allQuestsDone = (qs: Quest[]) => qs.every((q) => q.progress >= q.target)
