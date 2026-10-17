/* Full pinyin conversion via pinyin-pro (~300 kB). Loaded lazily in the app; imported directly by scripts. */
import { customPinyin, pinyin } from 'pinyin-pro'
import type { Item } from '../content/schema'
import { hanChars, setPinyinEngine, type RubyChar } from './pinyin'

/** Context fixes for polyphones pinyin-pro gets wrong in our sentences. */
const PHRASE_FIXES: Record<string, string> = {
  只开: 'zhǐ kāi',
  只收: 'zhǐ shōu',
  捞得: 'lāo de',
  好啦: 'hǎo la',
  长大: 'zhǎng dà',
  打扮得: 'dǎ ban de',
  拿锁匙: 'ná suǒ shí',
  说得: 'shuō de',
  跑得: 'pǎo de',
  唱得: 'chàng de',
  起得: 'qǐ de',
  看得: 'kàn de',
}

/** Sentence-final particles are toneless (pinyin-pro reads 咯 as gē, 啦 as lā…). */
const PARTICLES: Record<string, string> = { 啦: 'la', 咯: 'lo', 嘛: 'ma', 哦: 'o', 吧: 'ba', 呢: 'ne', 啊: 'a', 呀: 'ya' }

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
  out.forEach((r, i) => {
    const next = out[i + 1]
    if (PARTICLES[r.ch] && (!next || !next.py)) r.py = PARTICLES[r.ch]
  })
  cache.set(text, out)
  return out
}

export function installPinyinEngine(items: Item[]) {
  registerItemPinyin(items)
  setPinyinEngine(convert)
}
