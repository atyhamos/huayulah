import type { Item, Lesson, Unit, UnitInput } from './schema'

export interface Content {
  units: Unit[]
  items: Map<string, Item>
  lessons: Map<string, Lesson>
  /** All lessons in path order. */
  lessonOrder: Lesson[]
}

/**
 * Assemble unit JSON into typed content and check cross-references.
 * Schema validation (zod) runs in the validator and tests, not in the app bundle.
 */
export function buildContent(raw: UnitInput[]): Content {
  const units: Unit[] = []
  const items = new Map<string, Item>()
  const lessons = new Map<string, Lesson>()
  const lessonOrder: Lesson[] = []

  for (const u of raw) {
    const unitItems: Item[] = u.items.map((it) => ({ ...it, type: it.type ?? 'word', unitId: u.id }))
    for (const it of unitItems) {
      if (items.has(it.id)) throw new Error(`Duplicate item id "${it.id}" in ${u.id}`)
      items.set(it.id, it)
    }
    const unitLessons: Lesson[] = u.lessons.map((l, index) => {
      if (lessons.has(l.id)) throw new Error(`Duplicate lesson id "${l.id}"`)
      for (const id of l.items) {
        const it = items.get(id)
        if (!it || it.unitId !== u.id) throw new Error(`Lesson ${l.id} references unknown item "${id}"`)
      }
      return { ...l, unitId: u.id, index }
    })
    for (const l of unitLessons) {
      lessons.set(l.id, l)
      lessonOrder.push(l)
    }
    units.push({ ...u, items: unitItems, lessons: unitLessons })
  }
  return { units, items, lessons, lessonOrder }
}
