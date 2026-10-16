import type { CustomItem } from '../data/types'
import { content } from './index'
import type { Item } from './schema'

/** Pseudo-unit id for the learner's own words (not shown on the line map). */
export const MY_UNIT = 'mine'

export const isCustomItem = (it: Pick<Item, 'unitId'>) => it.unitId === MY_UNIT

/** Stable id for a word the learner adds, e.g. 炒粿条 → "my-…". */
export function customItemId(hanzi: string): string {
  let h = 2166136261
  for (const ch of hanzi) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619)
  return `my-${(h >>> 0).toString(36)}`
}

export function toItem(c: CustomItem): Item {
  return { id: c.id, hanzi: c.hanzi, pinyin: c.pinyin, english: c.english, note: c.note, type: 'word', unitId: MY_UNIT }
}

/**
 * Keep the shared item map in step with the learner's own words, so flashcards, word pages and
 * lessons treat them like course words.
 */
export function syncCustomItems(custom: Record<string, CustomItem>) {
  for (const [id, it] of content.items) if (isCustomItem(it) && !custom[id]) content.items.delete(id)
  for (const c of Object.values(custom)) content.items.set(c.id, toItem(c))
}
