/*
 * Build src/content/chars.generated.json: how each course character is put together (its parts, radical,
 * and what gives its meaning and sound), from the Make Me a Hanzi dictionary (Arphic Public License).
 *
 * Usage: tsx scripts/gen-chars.ts path/to/makemeahanzi/dictionary.txt
 * (download from https://github.com/skishore/makemeahanzi — dictionary.txt). The output is committed,
 * so this only needs re-running when course words change; `validate:content` flags missing characters.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { content } from '../src/content'
import { hanChars } from '../src/lib/pinyin'

interface DictEntry {
  character: string
  definition?: string
  pinyin: string[]
  decomposition: string
  radical: string
  etymology?: { type: string; hint?: string; semantic?: string; phonetic?: string }
}

export interface CharInfo {
  /** Short English definition. */
  d?: string
  /** Main pinyin reading. */
  py?: string
  /** Kangxi radical (the dictionary section it lives in). */
  r: string
  /** Visible parts, in writing order. */
  p: string[]
  /** How it was formed: meaning part (s) + sound part (ph) for picture-sound characters. */
  e?: { t: string; h?: string; s?: string; ph?: string }
}

const path = process.argv[2]
if (!path) {
  console.error('usage: tsx scripts/gen-chars.ts path/to/dictionary.txt')
  process.exit(1)
}

const dict = new Map<string, DictEntry>()
for (const line of readFileSync(path, 'utf8').split('\n')) {
  if (!line.trim()) continue
  const e = JSON.parse(line.replace(/\u00a0/g, ' ')) as DictEntry
  dict.set(e.character, e)
}

/** Leaf components of an ideographic description sequence like ⿰饣反. */
function parts(ids: string): string[] {
  return [...ids].filter((c) => !/[⿰-⿿？]/u.test(c))
}

const course = new Set<string>()
for (const it of content.items.values()) hanChars(it.hanzi).forEach((c) => course.add(c))

const out: Record<string, CharInfo> = {}
const add = (c: string, withParts: boolean) => {
  const e = dict.get(c)
  if (!e || out[c]) return
  const info: CharInfo = { r: e.radical, p: withParts ? parts(e.decomposition).filter((p) => p !== c) : [] }
  if (e.definition) info.d = e.definition.split(';').slice(0, 2).join(';').trim()
  if (e.pinyin[0]) info.py = e.pinyin[0]
  if (withParts && e.etymology) {
    const { type, hint, semantic, phonetic } = e.etymology
    info.e = { t: type, ...(hint ? { h: hint } : {}), ...(semantic ? { s: semantic } : {}), ...(phonetic ? { ph: phonetic } : {}) }
  }
  out[c] = info
}

const missing: string[] = []
for (const c of course) {
  if (!dict.has(c)) missing.push(c)
  add(c, true)
}
// parts and radicals get a short entry too, so their meaning and sound can be shown
for (const c of [...Object.keys(out)]) {
  const info = out[c]
  for (const p of [...info.p, info.r, info.e?.s, info.e?.ph]) if (p) add(p, false)
}

const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)))
writeFileSync(join(import.meta.dirname, '../src/content/chars.generated.json'), JSON.stringify(sorted) + '\n')
console.log(`chars: ${course.size} course characters, ${Object.keys(sorted).length} entries${missing.length ? ` (missing: ${missing.join('')})` : ''}`)
