import { describe, expect, it } from 'vitest'
import { newCard, previewIntervals, Rating, review, State, strength } from '../src/lib/srs'

const now = new Date('2026-03-02T09:00:00')

describe('srs', () => {
  it('schedules a new card in days, not minutes', () => {
    const good = review(newCard(now), Rating.Good, now)
    expect(good.state).toBe(State.Review)
    expect((good.due - now.getTime()) / 864e5).toBeGreaterThanOrEqual(1)
    const again = review(newCard(now), Rating.Again, now)
    expect(again.due).toBeLessThan(good.due)
  })

  it('grows intervals with successful reviews', () => {
    let c = review(newCard(now), Rating.Good, now)
    const first = c.due - now.getTime()
    const t2 = new Date(c.due)
    c = review(c, Rating.Good, t2)
    expect(c.due - t2.getTime()).toBeGreaterThan(first)
    expect(strength(c)).toBeGreaterThan(1)
  })

  it('previews intervals ordered Again < Hard < Good < Easy', () => {
    const c = review(newCard(now), Rating.Good, now)
    const t = new Date(c.due)
    const p = previewIntervals(c, t)
    const days = (s: string) => parseFloat(s) * (s.endsWith('mo') ? 30 : s.endsWith('y') ? 365 : 1)
    expect(days(p[Rating.Again])).toBeLessThanOrEqual(days(p[Rating.Hard]))
    expect(days(p[Rating.Hard])).toBeLessThanOrEqual(days(p[Rating.Good]))
    expect(days(p[Rating.Good])).toBeLessThanOrEqual(days(p[Rating.Easy]))
  })

  it('round-trips through plain JSON', () => {
    const c = review(newCard(now), Rating.Good, now)
    expect(JSON.parse(JSON.stringify(c))).toEqual(c)
  })
})
