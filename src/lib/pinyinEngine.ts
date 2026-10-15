/* Full pinyin conversion via pinyin-pro (~300 kB). Loaded lazily in the app; imported directly by scripts. */
import { customPinyin, pinyin } from 'pinyin-pro'
import type { Item } from '../content/schema'
import { hanChars, setPinyinEngine, type RubyChar } from './pinyin'

/** Context fixes for polyphones pinyin-pro gets wrong in our sentences. */
const PHRASE_FIXES: Record<string, string> = {
  只开: 'zhǐ kāi',
  只收: 'zhǐ shōu',
}

/** Make sentence pinyin use our hand-checked readings for multi-character items (e.g. 巴刹 bā shā). */
export function registerItemPinyin(items: Item[]) {
  const dict: Record<string, string> = { ...PHRASE_FIXES }
  for (const it of items) {
    const chars = hanChars(it.hanzi)
    if (chars.length > 1 && chars.length === it.hanzi.length) dict[it.hanzi] = it.pinyin
  }
  customPinyin(dict)
}

const cache = new Map<string, RubyChar[]>()

export function convert(text: string): RubyChar[] {
  const hit = cache.get(text)
  if (hit) return hit
  const out = pinyin(text, { type: 'all' }).map((x) => ({ ch: x.origin, py: x.isZh ? x.pinyin : null }))
  cache.set(text, out)
  return out
}

export function installPinyinEngine(items: Item[]) {
  registerItemPinyin(items)
  setPinyinEngine(convert)
}
