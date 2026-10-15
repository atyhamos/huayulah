import type { AppState, StoredCard } from './types'

function pickCard(a: StoredCard, b: StoredCard): StoredCard {
  if (a.reps !== b.reps) return a.reps > b.reps ? a : b
  return (a.last_review ?? 0) >= (b.last_review ?? 0) ? a : b
}

/** Combine guest progress into an account's progress (used once, on first sign-in). */
export function mergeStates(account: AppState, guest: AppState): AppState {
  const cards = { ...account.cards }
  for (const [id, c] of Object.entries(guest.cards)) cards[id] = cards[id] ? pickCard(cards[id], c) : c

  const lessons = { ...account.lessons }
  for (const [id, l] of Object.entries(guest.lessons)) {
    const a = lessons[id]
    lessons[id] = a
      ? {
          completedAt: Math.max(a.completedAt, l.completedAt),
          timesCompleted: a.timesCompleted + l.timesCompleted,
          bestAccuracy: Math.max(a.bestAccuracy, l.bestAccuracy),
        }
      : l
  }

  const days = { ...account.days }
  for (const [k, d] of Object.entries(guest.days)) {
    const a = days[k]
    days[k] = a
      ? {
          xp: a.xp + d.xp,
          lessons: a.lessons + d.lessons,
          reviews: a.reviews + d.reviews,
          newCards: a.newCards + d.newCards,
          ...(a.frozen || d.frozen ? { frozen: true } : {}),
        }
      : d
  }

  const achievements = { ...account.achievements }
  for (const [id, t] of Object.entries(guest.achievements)) achievements[id] = Math.min(achievements[id] ?? t, t)

  const A = account.stats
  const G = guest.stats
  const later = (G.lastActiveDate ?? '') > (A.lastActiveDate ?? '') ? G : A
  const sameWeek = A.weekId === G.weekId
  const week = (G.weekId ?? '') > (A.weekId ?? '') ? G : A

  return {
    ...account,
    settings: A.onboarded ? account.settings : guest.settings,
    stats: {
      xp: A.xp + G.xp,
      streak: A.lastActiveDate === G.lastActiveDate ? Math.max(A.streak, G.streak) : later.streak,
      longestStreak: Math.max(A.longestStreak, G.longestStreak),
      lastActiveDate: later.lastActiveDate,
      freezes: Math.max(A.freezes, G.freezes),
      weekId: week.weekId,
      weeklyXp: sameWeek ? A.weeklyXp + G.weeklyXp : week.weeklyXp,
      onboarded: A.onboarded || G.onboarded,
    },
    lessons,
    days,
    achievements,
    cards,
    friends: [...new Set([...account.friends, ...guest.friends])],
    friendCode: account.friendCode ?? guest.friendCode,
  }
}

export function hasProgress(s: AppState): boolean {
  return s.stats.xp > 0 || Object.keys(s.cards).length > 0
}
