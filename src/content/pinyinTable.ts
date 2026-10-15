import type { Content } from './build'
import { tokenize } from '../lib/exercises'
import { convert } from '../lib/pinyinEngine'

/** Every string the UI may show with pinyin: example sentences and their word tiles. Requires the engine. */
export function pinyinTable(content: Content): Record<string, string[]> {
  const texts = new Set<string>()
  for (const it of content.items.values()) {
    if (!it.example) continue
    texts.add(it.example.zh.replace(/ /g, ''))
    for (const t of tokenize(it.example.zh)) texts.add(t)
  }
  const table: Record<string, string[]> = {}
  for (const t of [...texts].sort()) {
    const r = convert(t)
    if (r.length === [...t].length && r.some((c) => c.py)) table[t] = r.map((c) => c.py ?? '')
  }
  return table
}
