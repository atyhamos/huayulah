import type { Content } from './build'
import type { GrammarTopic, Story } from './schema'
import { tokenize } from '../lib/exercises'
import { convert } from '../lib/pinyinEngine'

/**
 * Every string the UI may show with pinyin: example sentences, grammar sentences and their word tiles. Requires the engine.
 * Tile readings are taken from their sentence, so polyphones (只 zhǐ, 还 huán…) keep their in-context reading.
 */
export function pinyinTable(content: Content, stories: Story[] = [], topics: GrammarTopic[] = []): Record<string, string[]> {
  const table: Record<string, string[]> = {}
  for (const st of stories)
    for (const l of st.lines) {
      const r = convert(l.zh)
      if (r.length === [...l.zh].length) table[l.zh] = r.map((c) => c.py ?? '')
    }
  const add = (zh: string) => {
    const sentence = zh.replace(/ /g, '')
    const ruby = convert(sentence)
    if (ruby.length !== [...sentence].length) return
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
  const examples = [...content.items.values()].flatMap((it) => (it.example ? [it.example.zh] : [])).sort()
  for (const zh of examples) add(zh)
  // grammar: rule patterns and examples, every drill sentence (gaps solved), pick options, then lone gap options
  for (const t of topics) {
    for (const r of t.rules) {
      add(r.pattern.replace(/[[\]]/g, ''))
      for (const e of r.examples) add(e.zh)
    }
    for (const d of t.drills) {
      if (d.kind === 'gap') add(d.zh.replace('___', d.answer))
      else if (d.kind === 'order') add(d.zh)
      else d.options.forEach(add)
    }
  }
  for (const t of topics)
    for (const d of t.drills)
      if (d.kind === 'gap')
        for (const o of d.options) if (!table[o]) table[o] = convert(o).map((c) => c.py ?? '')
  return Object.fromEntries(Object.entries(table).sort(([a], [b]) => (a < b ? -1 : 1)))
}
