/**
 * The Reader: turn real-world Chinese text (a pasted notice, or a photo read by Claude) into lines of
 * words with pinyin and meanings, so any word can be saved to My words.
 */
import * as z from 'zod/v4'
import { content } from '../content'
import type { Item } from '../content/schema'
import { askJson, imageToJpegBase64 } from './ai'
import { hanChars, isHan, rubyFor } from './pinyin'

export interface ReaderWord {
  hanzi: string
  pinyin: string
  english: string
  note?: string
  /** Set when the word is already in the course (or My words). */
  itemId?: string
}

export interface ReaderLine {
  zh: string
  pinyin?: string
  en?: string
  words: ReaderWord[]
}

export interface ReaderResult {
  title?: string
  lines: ReaderLine[]
  source: 'offline' | 'claude'
}

const MAX_WORD = 8

/** Known words by their characters, longest first wins. */
function knownWords(): Map<string, Item> {
  const map = new Map<string, Item>()
  for (const it of content.items.values()) {
    if (hanChars(it.hanzi).length !== [...it.hanzi].length) continue // skip phrases with punctuation
    if (!map.has(it.hanzi)) map.set(it.hanzi, it)
  }
  return map
}

/** Split a run of text into known words (longest match) and unknown stretches. Non-Chinese text is dropped. */
export function segment(text: string, known: Map<string, Item> = knownWords()): { text: string; item?: Item }[] {
  const chars = [...text]
  const out: { text: string; item?: Item }[] = []
  let unknown = ''
  const flush = () => {
    if (unknown) out.push({ text: unknown })
    unknown = ''
  }
  for (let i = 0; i < chars.length; ) {
    if (!isHan(chars[i])) {
      flush()
      i++
      continue
    }
    let hit: Item | undefined
    let len = 0
    for (let n = Math.min(MAX_WORD, chars.length - i); n >= 1; n--) {
      const piece = chars.slice(i, i + n).join('')
      const item = known.get(piece)
      if (item) {
        hit = item
        len = n
        break
      }
    }
    if (hit) {
      flush()
      out.push({ text: hit.hanzi, item: hit })
      i += len
    } else {
      unknown += chars[i]
      // keep unknown stretches short so each can be saved as a word
      if (unknown.length >= 4) flush()
      i++
    }
  }
  flush()
  return out
}

const pinyinOf = (text: string) =>
  rubyFor(text)
    .map((r) => r.py)
    .filter(Boolean)
    .join(' ')

/** Offline reading of pasted text: known words get meanings, everything gets pinyin (load the pinyin engine first). */
export function readText(text: string): ReaderResult {
  const known = knownWords()
  const lines = text
    .split(/[\n。！？!?；;]+/)
    .map((l) => l.trim())
    .filter((l) => hanChars(l).length > 0)
    .map((zh): ReaderLine => ({
      zh,
      pinyin: pinyinOf(zh),
      words: segment(zh, known).map((t) =>
        t.item
          ? { hanzi: t.item.hanzi, pinyin: t.item.pinyin, english: t.item.english, note: t.item.note, itemId: t.item.id }
          : { hanzi: t.text, pinyin: pinyinOf(t.text), english: '' },
      ),
    }))
  return { lines, source: 'offline' }
}

const ReaderSchema = z.object({
  title: z.string().describe('What this is, in a few English words, e.g. "Hawker stall menu" or "HDB lift notice"'),
  lines: z.array(
    z.object({
      zh: z.string().describe('The Chinese text of this line, exactly as written'),
      pinyin: z.string().describe('Hanyu Pinyin with tone marks, one syllable per character, separated by spaces'),
      en: z.string().describe('Natural English translation'),
      words: z.array(
        z.object({
          hanzi: z.string(),
          pinyin: z.string(),
          english: z.string().describe('Short meaning, a few words'),
          note: z.string().describe('Only for Singapore-specific usage, local foods, places or brands; otherwise empty'),
        }),
      ),
    }),
  ),
})

const SYSTEM = `You help a Singaporean adult who speaks some Mandarin but can't read Chinese well.
Read the Chinese text they give you (or that appears in their photo: menus, signs, notices, packaging) from top to bottom.
For each line of Chinese: copy it exactly, give Hanyu Pinyin with tone marks (one syllable per character, spaces between syllables) and a natural English translation.
Split every line into words (as a Chinese speaker would) and give each word's pinyin and a short English meaning.
Use Singapore usage and readings — e.g. 巴刹 market, 德士 taxi, 咖啡乌 kopi-O, 锁匙 suǒ shí — and add a short note for Singapore-specific words, local dishes, places or brands.
Skip prices, numbers-only lines and text that isn't Chinese. If there is no Chinese text, return no lines and describe the image in the title.`

function attachKnown(lines: z.infer<typeof ReaderSchema>['lines']): ReaderLine[] {
  const known = knownWords()
  return lines.map((l) => ({
    zh: l.zh,
    pinyin: l.pinyin,
    en: l.en,
    words: l.words.map((w) => {
      const item = known.get(w.hanzi)
      return { hanzi: w.hanzi, pinyin: w.pinyin, english: w.english, ...(w.note ? { note: w.note } : {}), ...(item ? { itemId: item.id } : {}) }
    }),
  }))
}

/** Read a photo with Claude (needs the learner's API key). */
export async function readPhoto(file: Blob): Promise<ReaderResult> {
  const data = await imageToJpegBase64(file)
  const r = await askJson({
    system: SYSTEM,
    schema: ReaderSchema,
    maxTokens: 8000,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } },
          { type: 'text', text: 'Please read this for me.' },
        ],
      },
    ],
  })
  return { title: r.title, lines: attachKnown(r.lines), source: 'claude' }
}

/** Explain pasted text with Claude: proper word splits and meanings for words outside the course. */
export async function explainText(text: string): Promise<ReaderResult> {
  const r = await askJson({ system: SYSTEM, schema: ReaderSchema, maxTokens: 8000, messages: [{ role: 'user', content: text }] })
  return { title: r.title, lines: attachKnown(r.lines), source: 'claude' }
}
