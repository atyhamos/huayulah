import { describe, expect, it } from 'vitest'
import { content, getItem } from '../src/content'
import { generateLesson, itemsOf, pickDistractors, retryOf, tokenize, toneDistractors } from '../src/lib/exercises'
import { seeded } from '../src/lib/random'

const pool = [...content.items.values()]

describe('lesson generation', () => {
  it('introduces every item in learn mode and keeps options valid', () => {
    for (const lesson of content.lessonOrder) {
      const items = lesson.items.map(getItem)
      const ex = generateLesson(items, { mode: 'learn', speaking: true, pool, rng: seeded(lesson.index + 1) })
      const intros = ex.filter((e) => e.kind === 'intro').map((e) => itemsOf(e)[0])
      expect(new Set(intros)).toEqual(new Set(lesson.items))
      for (const e of ex) {
        if ('options' in e) {
          expect(new Set(e.options).size).toBe(e.options.length)
          expect(e.options.length).toBeGreaterThanOrEqual(3)
          if (e.kind === 'tone' || e.kind === 'sgpick') expect(e.options).toContain(e.answer)
          else expect(e.options).toContain(e.itemId)
          if (e.kind === 'sgpick') expect(e.options).toContain(getItem(e.itemId).standard!.hanzi)
          if (e.kind === 'hear') for (const o of e.options) expect(getItem(o).example).toBeDefined()
        }
        if (e.kind === 'build') {
          for (const t of e.answer) expect(e.tiles).toContain(t)
        }
      }
      // every new word is tested at least once after its intro
      for (const id of lesson.items) {
        expect(ex.filter((e) => e.kind !== 'intro' && itemsOf(e).includes(id)).length).toBeGreaterThan(0)
      }
    }
  })

  it('practice mode has no intros', () => {
    const l = content.lessonOrder[0]
    const ex = generateLesson(l.items.map(getItem), { mode: 'practice', speaking: false, pool, rng: seeded(3) })
    expect(ex.some((e) => e.kind === 'intro')).toBe(false)
    expect(ex.some((e) => e.kind === 'speak')).toBe(false)
  })

  it('never offers a homophone as a listening distractor', () => {
    const he = getItem('ta-he')
    const ds = pickDistractors(he, pool, 3, 'listen', new Set(['ta-she']), seeded(1))
    expect(ds.map((d) => d.id)).not.toContain('ta-she')
  })

  it('makes distinct wrong-tone variants', () => {
    const out = toneDistractors('kā fēi wū', 3, seeded(7))
    expect(out).toHaveLength(3)
    expect(out).not.toContain('kā fēi wū')
    expect(new Set(out).size).toBe(3)
  })

  it('tokenizes example sentences and strips punctuation', () => {
    expect(tokenize('你好， 你 叫 什么 名字？')).toEqual(['你好', '你', '叫', '什么', '名字'])
  })

  it('retry keeps the same answer', () => {
    const l = content.lessonOrder[0]
    const ex = generateLesson(l.items.map(getItem), { mode: 'learn', speaking: false, pool, rng: seeded(9) })
    const mc = ex.find((e) => e.kind === 'zh2en')!
    const again = retryOf(mc, seeded(2))
    expect(again.id).not.toBe(mc.id)
    expect(itemsOf(again)).toEqual(itemsOf(mc))
  })
})

describe('content', () => {
  it('passes the schema', async () => {
    const { UnitSchema } = await import('../src/content/schema')
    const { rawUnits } = await import('../src/content')
    for (const u of rawUnits) expect(() => UnitSchema.parse(u)).not.toThrow()
    const { StorySchema } = await import('../src/content/schema')
    const { stories } = await import('../src/content')
    expect(stories).toHaveLength(content.units.length)
    for (const st of stories) expect(() => StorySchema.parse(st)).not.toThrow()
  })

  it('has an up-to-date pinyin table covering every example and tile', async () => {
    const [{ pinyinTable }, { installPinyinEngine }, gen] = await Promise.all([
      import('../src/content/pinyinTable'),
      import('../src/lib/pinyinEngine'),
      import('../src/content/pinyin.generated.json'),
    ])
    installPinyinEngine(pool)
    const { stories } = await import('../src/content')
    expect(pinyinTable(content, stories)).toEqual(gen.default)
  })
})
