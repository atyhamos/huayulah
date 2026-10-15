export type PinyinMode = 'always' | 'auto' | 'never'
export type Theme = 'system' | 'light' | 'dark'
export type CardDir = 'read' | 'say'

export interface Settings {
  dailyGoal: number
  pinyinMode: PinyinMode
  ttsRate: number
  voiceURI: string | null
  newPerDay: number
  sound: boolean
  speaking: boolean
  theme: Theme
}

export interface Stats {
  xp: number
  streak: number
  longestStreak: number
  lastActiveDate: string | null
  freezes: number
  weekId: string | null
  weeklyXp: number
  onboarded: boolean
}

/** FSRS card, serialisable (dates as epoch ms). */
export interface StoredCard {
  due: number
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number
  last_review: number | null
}

export interface LessonProgress {
  completedAt: number
  timesCompleted: number
  bestAccuracy: number
}

export interface DayLog {
  xp: number
  lessons: number
  reviews: number
  newCards: number
  frozen?: boolean
  /** Daily-quest chest already claimed. */
  questBonus?: boolean
}

export interface AppState {
  version: 1
  settings: Settings
  stats: Stats
  lessons: Record<string, LessonProgress>
  days: Record<string, DayLog>
  achievements: Record<string, number>
  cards: Record<string, StoredCard>
  friends: string[]
  friendCode: string | null
}

export const DEFAULT_SETTINGS: Settings = {
  dailyGoal: 20,
  pinyinMode: 'auto',
  ttsRate: 0.9,
  voiceURI: null,
  newPerDay: 10,
  sound: true,
  speaking: true,
  theme: 'system',
}

export function emptyState(): AppState {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    stats: {
      xp: 0,
      streak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      freezes: 0,
      weekId: null,
      weeklyXp: 0,
      onboarded: false,
    },
    lessons: {},
    days: {},
    achievements: {},
    cards: {},
    friends: [],
    friendCode: null,
  }
}

/** Fill in any fields missing from older saved state. */
export function normalizeState(s: Partial<AppState> | null | undefined): AppState {
  const base = emptyState()
  if (!s) return base
  return {
    ...base,
    ...s,
    settings: { ...base.settings, ...s.settings },
    stats: { ...base.stats, ...s.stats },
    lessons: s.lessons ?? {},
    days: s.days ?? {},
    achievements: s.achievements ?? {},
    cards: s.cards ?? {},
    friends: s.friends ?? [],
    friendCode: s.friendCode ?? null,
    version: 1,
  }
}

export const cardId = (itemId: string, dir: CardDir) => `${itemId}__${dir}`
export const parseCardId = (id: string) => {
  const [itemId, dir] = id.split('__')
  return { itemId, dir: dir as CardDir }
}
