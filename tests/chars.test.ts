import { describe, expect, it } from 'vitest'
import { content } from '../src/content'
import { charInfo, familyOf, families, partName, shownParts } from '../src/content/chars'
import { generateLesson } from '../src/lib/exercises'
import { hanChars } from '../src/lib/pinyin'
import { seeded } from '../src/lib/random'

describe('building blocks', () => {
  it('has parts data for (almost) every course character', () => {
    const missing = new Set<string>()
    for (const it of content.items.values()) for (const c of hanChars(it.hanzi)) if (!charInfo(c)) missing.add(c)
    expect([...missing].length).toBeLessThanOrEqual(3)
  })

  it('explains picture-sound characters and groups families', () => {
    expect(shownParts('饭')).toEqual(['饣', '反'])
    expect(partName('饣')).toBe('food')
    expect(charInfo('饭')?.e).toMatchObject({ s: '饣', ph: '反' })
    expect(familyOf('饣')).toEqual(expect.arrayContaining(['饭', '饮']))
    // biggest families first, only real families
    const sizes = [...families().values()].map((f) => f.length)
    expect(sizes.every((n) => n >= 2)).toBe(true)
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a))
  })

  it('adds a part-meaning question and (optionally) a tracing exercise to lessons', () => {
    const pool = [...content.items.values()]
    const lesson = content.lessonOrder.find((l) => l.items.some((id) => content.items.get(id)!.hanzi.includes('饭'))) ?? content.lessonOrder[0]
    const items = lesson.items.map((id) => content.items.get(id)!)
    const ex = generateLesson(items, { mode: 'learn', speaking: false, writing: true, pool, rng: seeded(3) })
    const parts = ex.find((e) => e.kind === 'parts')
    expect(parts).toBeTruthy()
    if (parts?.kind === 'parts') {
      expect(parts.options).toContain(parts.answer)
      expect(new Set(parts.options).size).toBe(parts.options.length)
      expect(parts.peers.length).toBeGreaterThan(0)
    }
    expect(ex.some((e) => e.kind === 'write')).toBe(true)
    const off = generateLesson(items, { mode: 'learn', speaking: false, writing: false, pool, rng: seeded(3) })
    expect(off.some((e) => e.kind === 'write')).toBe(false)
  })
})
