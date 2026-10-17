import { describe, expect, it } from 'vitest'
import { content } from '../src/content'
import { getTopic, grammarTopics, sectionTopics, topicsForLine } from '../src/content/grammar'
import { completeGrammar, completeGrammarTest, isGrammarUnlocked, nextGrammarTopic } from '../src/data/actions'
import { emptyState } from '../src/data/types'
import pinyinTable from '../src/content/pinyin.generated.json'
import { tokenize } from '../src/lib/exercises'
import { drillStep, generateGrammarLesson, generateGrammarTest, patternParts, patternText, retryStep, solvedSentence, unspaced } from '../src/lib/grammar'
import { seeded } from '../src/lib/random'

const now = new Date(2026, 4, 4, 9)
const g06 = getTopic('g06')!

describe('grammar track', () => {
  it('a topic starts with its rule cards, then every drill once', () => {
    const steps = generateGrammarLesson(g06, seeded(3))
    const rules = g06.rules.length
    expect(steps.slice(0, rules).every((s) => s.kind === 'rule')).toBe(true)
    const drills = steps.slice(rules)
    expect(drills).toHaveLength(g06.drills.length)
    expect(new Set(drills.map((d) => d.kind !== 'rule' && d.drill)).size).toBe(g06.drills.length)
  })

  it('order drills never start in order, and the solved sentence fills the gap', () => {
    const order = g06.drills.find((d) => d.kind === 'order')!
    for (let i = 0; i < 20; i++) {
      const s = drillStep('g06', order, seeded(i))
      if (s.kind === 'order') expect(s.tiles.join(' ')).not.toBe(s.answer.join(' '))
    }
    const gap = drillStep('g06', g06.drills.find((d) => d.kind === 'gap')!, seeded(1))
    expect(gap.kind === 'gap' && solvedSentence(gap)).toBe('我 昨天 没 去 学校。')
    expect(retryStep(gap).id).not.toBe(gap.id)
  })

  it('a section test samples drills from that section only', () => {
    const steps = generateGrammarTest(3, seeded(2))
    expect(steps).toHaveLength(12)
    const ids = new Set(sectionTopics(3).map((t) => t.id))
    expect(steps.every((s) => s.kind !== 'rule' && ids.has(s.topicId))).toBe(true)
  })

  it('topics open in order', () => {
    let s = emptyState()
    expect(isGrammarUnlocked(s, 'g01')).toBe(true)
    expect(isGrammarUnlocked(s, 'g02')).toBe(false)
    expect(nextGrammarTopic(s)).toBe('g01')
    s = completeGrammar(s, 'g01', { correct: 9, total: 10, maxCombo: 6 }, content, now).state
    expect(isGrammarUnlocked(s, 'g02')).toBe(true)
    expect(isGrammarUnlocked(s, 'g03')).toBe(false)
    expect(nextGrammarTopic(s)).toBe('g02')
  })

  it('finishing a topic earns lesson XP and counts for the streak; replaying earns practice XP', () => {
    const first = completeGrammar(emptyState(), 'g01', { correct: 10, total: 10, maxCombo: 10 }, content, now)
    expect(first.state.stats.xp).toBe(first.info.xp.total)
    expect(first.info.streak.extended).toBe(true)
    expect(first.state.lessons.g01.timesCompleted).toBe(1)
    const again = completeGrammar(first.state, 'g01', { correct: 10, total: 10, maxCombo: 10 }, content, now)
    expect(again.info.xp.base).toBeLessThan(first.info.xp.base)
  })

  it('passing a section test marks its topics done and opens the next section', () => {
    const pass = completeGrammarTest(emptyState(), 1, { correct: 11, total: 12 }, content, now)
    expect(pass.info.passed).toBe(true)
    expect(sectionTopics(1).every((t) => pass.state.lessons[t.id]?.tested)).toBe(true)
    expect(nextGrammarTopic(pass.state)).toBe(sectionTopics(2)[0].id)
    expect(pass.state.achievements['grammar-s1']).toBeDefined()
    const fail = completeGrammarTest(emptyState(), 1, { correct: 6, total: 12 }, content, now)
    expect(fail.info.passed).toBe(false)
    expect(Object.keys(fail.state.lessons)).toHaveLength(0)
  })

  it('lines link to the topics they lean on, and patterns mark their key part', () => {
    expect(topicsForLine('u10').map((t) => t.id)).toContain('g06')
    expect(grammarTopics.every((t) => t.lines.every((u) => content.units.some((x) => x.id === u)))).toBe(true)
    expect(patternParts('我 [不] 吃 辣。')).toEqual([
      { text: '我', mark: false },
      { text: '不', mark: true },
      { text: '吃辣。', mark: false },
    ])
  })

  it('every grammar sentence, tile and option has pinyin in the generated table', () => {
    const table = pinyinTable as Record<string, string[]>
    const missing: string[] = []
    const need = (zh: string) => {
      if (!table[unspaced(zh)]) missing.push(unspaced(zh))
    }
    for (const t of grammarTopics) {
      for (const r of t.rules) {
        need(patternText(r.pattern))
        r.examples.forEach((e) => need(e.zh))
      }
      for (const d of t.drills) {
        if (d.kind === 'gap') {
          need(d.zh.replace('___', d.answer))
          d.options.forEach(need)
        } else if (d.kind === 'order') {
          need(d.zh)
          tokenize(d.zh).forEach(need)
        } else d.options.forEach(need)
      }
    }
    expect(missing).toEqual([])
  })
})
