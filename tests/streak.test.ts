import { describe, expect, it } from 'vitest'
import { applyActivity, currentStreak, MAX_FREEZES, type StreakState } from '../src/lib/streak'
import { addDays, daysBetween, weekId } from '../src/lib/dates'

const base: StreakState = { streak: 0, longestStreak: 0, lastActiveDate: null, freezes: 0 }

describe('streak', () => {
  it('starts and extends day by day', () => {
    let s = applyActivity(base, '2026-01-01').next
    expect(s.streak).toBe(1)
    s = applyActivity(s, '2026-01-01').next
    expect(s.streak).toBe(1)
    s = applyActivity(s, '2026-01-02').next
    expect(s.streak).toBe(2)
    expect(s.longestStreak).toBe(2)
  })

  it('resets after a missed day without freezes', () => {
    const s = applyActivity({ ...base, streak: 5, longestStreak: 5, lastActiveDate: '2026-01-01' }, '2026-01-03').next
    expect(s.streak).toBe(1)
    expect(s.longestStreak).toBe(5)
  })

  it('uses freezes to cover missed days', () => {
    const r = applyActivity({ ...base, streak: 5, longestStreak: 5, lastActiveDate: '2026-01-01', freezes: 2 }, '2026-01-04')
    expect(r.next.streak).toBe(6)
    expect(r.next.freezes).toBe(0)
    expect(r.frozenDays).toEqual(['2026-01-02', '2026-01-03'])
  })

  it('earns a freeze every 7 days, capped', () => {
    let s: StreakState = base
    let d = '2026-01-01'
    let earned = 0
    for (let i = 0; i < 28; i++) {
      const r = applyActivity(s, d)
      if (r.earnedFreeze) earned++
      s = r.next
      d = addDays(d, 1)
    }
    expect(s.streak).toBe(28)
    expect(earned).toBe(MAX_FREEZES)
    expect(s.freezes).toBe(MAX_FREEZES)
  })

  it('shows a lapsed streak as 0', () => {
    const s = { ...base, streak: 9, lastActiveDate: '2026-01-01' }
    expect(currentStreak(s, '2026-01-01')).toMatchObject({ streak: 9, doneToday: true })
    expect(currentStreak(s, '2026-01-02')).toMatchObject({ streak: 9, atRisk: true })
    expect(currentStreak(s, '2026-01-03').streak).toBe(0)
    expect(currentStreak({ ...s, freezes: 1 }, '2026-01-03').streak).toBe(9)
  })

  it('handles month/year boundaries and ISO weeks', () => {
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1)
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
    expect(weekId(new Date(2026, 0, 1))).toBe('2026-W01')
    expect(weekId(new Date(2027, 0, 1))).toBe('2026-W53')
  })
})
