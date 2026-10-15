import type { Content } from './build'
import { tokenize } from '../lib/exercises'
import { convert } from '../lib/pinyinEngine'

/**
 * Every string the UI may show with pinyin: example sentences and their word tiles. Requires the engine.
 * Tile readings are taken from their sentence, so polyphones (只 zhǐ, 还 huán…) keep their in-context reading.
 */
export function pinyinTable(content: Content): Record<string, string[]> {
  const table: Record<string, string[]> = {}
  const examples = [...content.items.values()].flatMap((it) => (it.example ? [it.example.zh] : [])).sort()
  for (const zh of examples) {
    const sentence = zh.replace(/ /g, '')
    const ruby = convert(sentence)
    if (ruby.length !== [...sentence].length) continue
    table[sentence] = ruby.map((c) => c.py ?? '')
    // walk the tokens through the sentence to pick up their in-context readings
    let pos = 0
    const chars = [...sentence]
    for (const tok of tokenize(zh)) {
      const len = [...tok].length
      while (pos < chars.length && chars.slice(pos, pos + len).join('') !== tok) pos++
      if (pos >= chars.length) break
      if (!table[tok]) table[tok] = ruby.slice(pos, pos + len).map((c) => c.py ?? '')
      pos += len
    }
  }
  return Object.fromEntries(Object.entries(table).sort(([a], [b]) => (a < b ? -1 : 1)))
}
