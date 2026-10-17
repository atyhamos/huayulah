import { describe, expect, it } from 'vitest'
import { content } from '../src/content'
import { scenes } from '../src/content/scenes'

describe('line scenes', () => {
  it('every line has a scene', () => {
    for (const u of content.units) expect(scenes[u.id], u.id).toBeDefined()
  })

  it('hotspots name real course words and stay inside the picture', () => {
    for (const s of Object.values(scenes)) {
      expect(s.hotspots.length, s.unitId).toBeGreaterThanOrEqual(3)
      expect(s.width).toBeGreaterThan(0)
      expect(s.height).toBeGreaterThan(0)
      const ids = new Set<string>()
      for (const h of s.hotspots) {
        expect(content.items.has(h.itemId), `${s.unitId}: ${h.itemId}`).toBe(true)
        expect(ids.has(h.itemId), `${s.unitId}: duplicate ${h.itemId}`).toBe(false)
        ids.add(h.itemId)
        const [x, y, w, hh] = h.box
        expect(x >= 0 && y >= 0 && w > 0 && hh > 0 && x + w <= 100 && y + hh <= 100, `${s.unitId}: ${h.itemId} box`).toBe(true)
      }
      for (const a of s.ambient) expect(a.at.every((v) => v >= 0 && v <= 100), `${s.unitId}: ${a.kind}`).toBe(true)
    }
  })

  it('mostly uses words from its own line', () => {
    for (const s of Object.values(scenes)) {
      const own = s.hotspots.filter((h) => content.items.get(h.itemId)?.unitId === s.unitId).length
      expect(own, s.unitId).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('isLineReached', () => {
  it('colours in the line of the next stop and lines with a stop done, not the rest', async () => {
    const { isLineReached } = await import('../src/data/actions')
    const { emptyState } = await import('../src/data/types')
    const s = emptyState()
    expect(isLineReached(s, 'u01', content)).toBe(true)
    expect(isLineReached(s, 'u03', content)).toBe(false)
    const done = { ...s, lessons: { [content.units[2].lessons[0].id]: { completedAt: 1, bestAccuracy: 1, timesCompleted: 1 } } } as typeof s
    expect(isLineReached(done, 'u03', content)).toBe(true)
  })
})
