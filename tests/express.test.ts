import { describe, expect, it } from 'vitest'
import { content } from '../src/content'
import { completeExpress, dueCardIds, isLessonUnlocked, nextLessonId } from '../src/data/actions'
import { cardId, emptyState } from '../src/data/types'
import { generateExpress } from '../src/lib/exercises'
import { seeded } from '../src/lib/random'
import { googleCalendarUrl, reminderIcs } from '../src/lib/reminder'

const u02 = content.units.find((u) => u.id === 'u02')!
const now = new Date(2026, 4, 4, 9)

describe('express train', () => {
  it('builds a 12-question reading test from the line', () => {
    const ex = generateExpress(u02.items, [...content.items.values()], 12, seeded(1))
    expect(ex).toHaveLength(12)
    expect(ex.every((e) => e.kind !== 'intro')).toBe(true)
    expect(ex.every((e) => 'itemId' in e && u02.items.some((i) => i.id === e.itemId))).toBe(true)
  })

  it('passing clears the line and adds its words as known; failing changes nothing but XP', () => {
    const pass = completeExpress(emptyState(), 'u02', { correct: 11, total: 12 }, content, now)
    expect(pass.info.passed).toBe(true)
    expect(u02.lessons.every((l) => pass.state.lessons[l.id]?.tested)).toBe(true)
    expect(pass.info.newWords).toBe(u02.items.length)
    // words are due for confirmation in a few days, not right now
    expect(dueCardIds(pass.state, now, content).review).not.toContain(cardId(u02.items[0].id, 'read'))
    expect(pass.state.stats.xp).toBe(20)
    // the line map moves on, and the next line's first stop is open
    expect(nextLessonId(pass.state, content)).toBe(content.lessonOrder[0].id)
    expect(isLessonUnlocked(pass.state, u02.lessons[5].id, content)).toBe(true)

    const fail = completeExpress(emptyState(), 'u02', { correct: 9, total: 12 }, content, now)
    expect(fail.info.passed).toBe(false)
    expect(Object.keys(fail.state.lessons)).toHaveLength(0)
    expect(Object.keys(fail.state.cards)).toHaveLength(0)
    expect(fail.state.stats.xp).toBe(5)
  })
})

describe('daily reminder', () => {
  it('makes a repeating calendar event at the chosen time', () => {
    const ics = reminderIcs('20:30', 'https://huayu-lah.web.app', new Date(2026, 9, 16, 21, 0))
    expect(ics).toContain('RRULE:FREQ=DAILY')
    expect(ics).toContain('DTSTART:20261017T203000') // already past today → tomorrow
    expect(ics).toContain('BEGIN:VALARM')
    expect(ics.split('\r\n').length).toBeGreaterThan(10)
    const g = new URL(googleCalendarUrl('07:15', 'https://huayu-lah.web.app', new Date(2026, 9, 16, 6, 0)))
    expect(g.searchParams.get('dates')).toBe('20261016T071500/20261016T072500')
    expect(g.searchParams.get('recur')).toBe('RRULE:FREQ=DAILY')
  })
})
