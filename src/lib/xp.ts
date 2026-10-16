export const XP = {
  lessonBase: 10,
  practiceBase: 5,
  perfectBonus: 5,
  perReview: 1,
}

export function lessonXp(opts: { mode: 'learn' | 'practice'; mistakes: number; maxCombo: number }): {
  total: number
  base: number
  perfect: number
  combo: number
} {
  const base = opts.mode === 'learn' ? XP.lessonBase : XP.practiceBase
  const perfect = opts.mistakes === 0 ? XP.perfectBonus : 0
  const combo = Math.min(5, Math.floor(opts.maxCombo / 5))
  return { total: base + perfect + combo, base, perfect, combo }
}

/** Level L starts at 25·(L−1)² XP: 0, 25, 100, 225, 400… */
export function levelInfo(xp: number) {
  const level = Math.floor(Math.sqrt(Math.max(0, xp) / 25)) + 1
  const start = 25 * (level - 1) ** 2
  const next = 25 * level ** 2
  return { level, start, next, progress: (xp - start) / (next - start) }
}

export const GOAL_OPTIONS = [
  { xp: 10, label: 'Kopi po', hint: 'Light' },
  { xp: 20, label: 'Kopi', hint: 'Regular' },
  { xp: 30, label: 'Kopi gao', hint: 'Strong' },
  { xp: 50, label: 'Kopi di lo', hint: 'Extra strong' },
]
