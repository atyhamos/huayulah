import { customPinyin, pinyin } from 'pinyin-pro'
import type { Item } from '../content/schema'

const TONE_MARKS: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
}
const MARK_TO_BASE: Record<string, [string, number]> = {}
for (const [base, marks] of Object.entries(TONE_MARKS)) {
  marks.forEach((m, i) => (MARK_TO_BASE[m] = [base, i + 1]))
}

export const isHan = (ch: string) => /\p{Script=Han}/u.test(ch)
export const hanChars = (s: string) => [...s].filter(isHan)

export function syllables(p: string): string[] {
  return p.trim().split(/\s+/).filter(Boolean)
}

/** Tone number 1–4, or 5 for neutral. */
export function toneOf(syl: string): number {
  for (const ch of syl) if (MARK_TO_BASE[ch]) return MARK_TO_BASE[ch][1]
  return 5
}

/** Remove tone marks: "nǚ" → "nü". */
export function stripTone(syl: string): string {
  return [...syl].map((ch) => (MARK_TO_BASE[ch] ? MARK_TO_BASE[ch][0] : ch)).join('')
}

/** Lowercase, toneless, no spaces — used for lenient comparisons. */
export function looseKey(p: string): string {
  return stripTone(p.toLowerCase()).replace(/[^a-zü]/g, '').replace(/ü/g, 'v')
}

/** Put a tone mark on a toneless syllable following standard placement rules. */
export function setTone(syl: string, tone: number): string {
  const base = stripTone(syl)
  if (tone < 1 || tone > 4) return base
  let idx = base.search(/[ae]/)
  if (idx < 0) idx = base.indexOf('ou')
  if (idx < 0) {
    // last vowel
    for (let i = base.length - 1; i >= 0; i--) {
      if ('iouü'.includes(base[i])) {
        idx = i
        break
      }
    }
  }
  if (idx < 0) return base
  const v = base[idx]
  return base.slice(0, idx) + TONE_MARKS[v][tone - 1] + base.slice(idx + 1)
}

/** Make sentence pinyin use our hand-checked readings for multi-character items (e.g. 巴刹 bā shā). */
export function registerItemPinyin(items: Item[]) {
  const dict: Record<string, string> = {}
  for (const it of items) {
    const chars = hanChars(it.hanzi)
    if (chars.length > 1 && chars.length === it.hanzi.length) dict[it.hanzi] = it.pinyin
  }
  customPinyin(dict)
}

export interface RubyChar {
  ch: string
  py: string | null
}

const cache = new Map<string, RubyChar[]>()

/** Per-character pinyin for any text. Non-Chinese characters get null. */
export function rubyFor(text: string, known?: string): RubyChar[] {
  if (known) {
    const syl = syllables(known)
    const chars = [...text]
    if (hanChars(text).length === syl.length) {
      let i = 0
      return chars.map((ch) => ({ ch, py: isHan(ch) ? syl[i++] : null }))
    }
  }
  const hit = cache.get(text)
  if (hit) return hit
  const out = pinyin(text, { type: 'all' }).map((x) => ({
    ch: x.origin,
    py: x.isZh ? x.pinyin : null,
  }))
  cache.set(text, out)
  return out
}

export function sentencePinyin(text: string): string {
  return rubyFor(text)
    .map((r) => r.py)
    .filter(Boolean)
    .join(' ')
}
