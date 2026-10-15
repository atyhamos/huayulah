import { UnitSchema, type Item, type Lesson, type Unit } from './schema'

export interface Content {
  units: Unit[]
  items: Map<string, Item>
  lessons: Map<string, Lesson>
  /** All lessons in path order. */
  lessonOrder: Lesson[]
}

/** Parse raw unit JSON into typed content. Throws on schema or reference errors. */
export function buildContent(raw: unknown[]): Content {
  const units: Unit[] = []
  const items = new Map<string, Item>()
  const lessons = new Map<string, Lesson>()
  const lessonOrder: Lesson[] = []

  for (const r of raw) {
    const u = UnitSchema.parse(r)
    const unitItems: Item[] = u.items.map((it) => ({ ...it, unitId: u.id }))
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
