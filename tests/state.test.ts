import { describe, expect, it } from 'vitest'
import { content } from '../src/content'
import { completeLesson, completePractice, dueCardIds, isLessonUnlocked, nextLessonId, reviewCard, weakestItems } from '../src/data/actions'
import { hasProgress, mergeStates } from '../src/data/merge'
import { cardId, emptyState, normalizeState } from '../src/data/types'
import { Rating } from '../src/lib/srs'

const day = (d: number, h = 9) => new Date(2026, 2, d, h)
const lesson1 = content.lessonOrder[0]

function finishFirst(now = day(2), mistakes: Record<string, number> = {}) {
  return completeLesson(
    emptyState(),
    { lessonId: lesson1.id, mode: 'learn', mistakesByItem: mistakes, maxCombo: 10, answered: 20, correct: 20 },
    content,
    now,
  )
}

describe('completing a lesson', () => {
  it('awards XP, streak, cards and achievements', () => {
    const r = finishFirst()
    expect(r.info.xp.total).toBe(10 + 5 + 2)
    expect(r.state.stats.xp).toBe(17)
    expect(r.state.stats.streak).toBe(1)
    expect(r.state.days['2026-03-02'].xp).toBe(17)
    expect(r.info.newWords).toBe(lesson1.items.length)
    for (const id of lesson1.items) {
      expect(r.state.cards[cardId(id, 'read')]).toBeDefined()
      expect(r.state.cards[cardId(id, 'say')]).toBeDefined()
    }
    expect(r.info.achievements.map((a) => a.id)).toEqual(expect.arrayContaining(['first-lesson', 'perfect']))
    expect(r.dirty.cards).toHaveLength(lesson1.items.length * 2)
  })

  it('schedules missed words sooner', () => {
    const missed = lesson1.items[0]
    const r = finishFirst(day(2), { [missed]: 2 })
    const a = r.state.cards[cardId(missed, 'read')]
    const b = r.state.cards[cardId(lesson1.items[1], 'read')]
    expect(a.due).toBeLessThan(b.due)
  })

  it('unlocks the next lesson', () => {
    const r = finishFirst()
    expect(isLessonUnlocked(emptyState(), content.lessonOrder[1].id, content)).toBe(false)
    expect(isLessonUnlocked(r.state, content.lessonOrder[1].id, content)).toBe(true)
    expect(nextLessonId(r.state, content)).toBe(content.lessonOrder[1].id)
    // first lesson of every unit is open
    for (const u of content.units) expect(isLessonUnlocked(emptyState(), u.lessons[0].id, content)).toBe(true)
  })
})

describe('reviews', () => {
  it('lists due cards and respects the new-card limit', () => {
    const s = finishFirst().state
    expect(dueCardIds(s, day(2, 10), content).review).toHaveLength(0)
    const later = dueCardIds(s, day(10), content)
    expect(later.review.length).toBe(lesson1.items.length)
    expect(later.fresh.length).toBe(lesson1.items.length)
    const limited = dueCardIds({ ...s, settings: { ...s.settings, newPerDay: 2 } }, day(10), content)
    expect(limited.fresh).toHaveLength(2)
  })

  it('reviewing gives XP and reschedules', () => {
    const s = finishFirst().state
    const id = cardId(lesson1.items[0], 'say')
    const r = reviewCard(s, id, Rating.Good, content, day(3))
    expect(r.state.stats.xp).toBe(s.stats.xp + 1)
    expect(r.state.cards[id].due).toBeGreaterThan(day(3).getTime())
    expect(r.state.days['2026-03-03']).toMatchObject({ reviews: 1, newCards: 1 })
    expect(r.state.stats.streak).toBe(2)
  })
})

describe('guest → account merge', () => {
  it('combines progress without losing anything', () => {
    const guest = finishFirst(day(2)).state
    const account = completeLesson(
      { ...emptyState(), stats: { ...emptyState().stats, onboarded: true } },
      { lessonId: content.lessonOrder[1].id, mode: 'learn', mistakesByItem: {}, maxCombo: 0, answered: 10, correct: 10 },
      content,
      day(1),
    ).state
    const m = mergeStates(account, guest)
    expect(m.stats.xp).toBe(account.stats.xp + guest.stats.xp)
    expect(Object.keys(m.lessons).sort()).toEqual([content.lessonOrder[0].id, content.lessonOrder[1].id].sort())
    expect(Object.keys(m.cards).length).toBe(Object.keys(account.cards).length + Object.keys(guest.cards).length)
    expect(m.stats.lastActiveDate).toBe('2026-03-02')
    expect(m.stats.onboarded).toBe(true)
    expect(hasProgress(m)).toBe(true)
    expect(hasProgress(emptyState())).toBe(false)
  })

  it('normalizes old/partial saved state', () => {
    const s = normalizeState({ stats: { xp: 5 } as never })
    expect(s.stats.xp).toBe(5)
    expect(s.settings.dailyGoal).toBe(20)
    expect(s.cards).toEqual({})
  })
})

describe('weak-word practice', () => {
  it('picks the most-forgotten words and only awards XP', () => {
    const missed = lesson1.items[2]
    const s = finishFirst(day(2), { [missed]: 1 }).state
    const weak = weakestItems(s, 3, day(6), content)
    expect(weak[0]).toBe(missed)
    const r = completePractice(s, { mistakesByItem: {}, maxCombo: 0, answered: 5, correct: 5 }, content, day(6))
    expect(r.state.stats.xp).toBe(s.stats.xp + 10)
    expect(r.state.cards).toBe(s.cards)
    expect(r.state.lessons).toEqual(s.lessons)
  })
})
