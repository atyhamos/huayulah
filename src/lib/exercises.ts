import type { Item } from '../content/schema'
import { hanChars, looseKey, setTone, syllables, toneOf } from './pinyin'
import { sample, shuffle, type Rng } from './random'

export type Exercise =
  | { id: string; kind: 'intro'; itemId: string }
  | { id: string; kind: 'zh2en'; itemId: string; options: string[] }
  | { id: string; kind: 'en2zh'; itemId: string; options: string[] }
  | { id: string; kind: 'listen'; itemId: string; options: string[] }
  | { id: string; kind: 'tone'; itemId: string; options: string[]; answer: string }
  | { id: string; kind: 'build'; itemId: string; answer: string[]; tiles: string[] }
  | { id: string; kind: 'match'; itemIds: string[] }
  | { id: string; kind: 'speak'; itemId: string; text: string; en: string }
  | { id: string; kind: 'sgpick'; itemId: string; options: string[]; answer: string }

export type ExerciseKind = Exercise['kind']

export interface GenerateOptions {
  mode: 'learn' | 'practice'
  speaking: boolean
  /** Every item in the course — used for distractors. */
  pool: Item[]
  rng?: Rng
}

const PUNCT = /[，。？！、；：,.?!;:“”"'（）()…]/g

export function tokenize(zh: string): string[] {
  return zh
    .split(' ')
    .map((t) => t.replace(PUNCT, ''))
    .filter(Boolean)
}

export function stripPunct(s: string): string {
  return s.replace(PUNCT, '').replace(/\s/g, '')
}

let counter = 0
const uid = (kind: string, key: string) => `${kind}-${key}-${++counter}`

/** Pick n distractor items, preferring ones that look similar to the target so the choice isn't trivial. */
export function pickDistractors(
  target: Item,
  pool: Item[],
  n: number,
  kind: 'zh2en' | 'en2zh' | 'listen',
  lessonIds: Set<string>,
  rng: Rng,
): Item[] {
  const len = hanChars(target.hanzi).length
  const candidates = pool.filter((c) => {
    if (c.id === target.id || c.hanzi === target.hanzi) return false
    if (c.english === target.english) return false
    if (kind === 'listen' && looseKey(c.pinyin) === looseKey(target.pinyin)) return false
    return true
  })
  const scored = shuffle(candidates, rng).map((c) => {
    let score = rng() * 0.5
    if (lessonIds.has(c.id)) score += 2
    if (c.unitId === target.unitId) score += 1
    if (hanChars(c.hanzi).length === len) score += 1.5
    if (c.type === target.type) score += 0.5
    return { c, score }
  })
  scored.sort((a, b) => b.score - a.score)
  const out: Item[] = []
  for (const { c } of scored) {
    // avoid two options with identical text
    if (out.some((o) => o.hanzi === c.hanzi || o.english === c.english)) continue
    out.push(c)
    if (out.length === n) break
  }
  return out
}

/** Wrong-tone variants of a pinyin string. */
export function toneDistractors(answer: string, n: number, rng: Rng): string[] {
  const syl = syllables(answer)
  const seen = new Set([answer])
  const out: string[] = []
  for (let attempt = 0; attempt < 50 && out.length < n; attempt++) {
    const changed = syl.map((s) => s)
    const changes = syl.length > 1 && rng() < 0.4 ? 2 : 1
    for (let k = 0; k < changes; k++) {
      const i = Math.floor(rng() * syl.length)
      const cur = toneOf(syl[i])
      let t = 1 + Math.floor(rng() * 4)
      if (t === cur) t = (t % 4) + 1
      changed[i] = setTone(syl[i], t)
    }
    const s = changed.join(' ')
    if (!seen.has(s)) {
      seen.add(s)
      out.push(s)
    }
  }
  return out
}

function mc(kind: 'zh2en' | 'en2zh' | 'listen', it: Item, pool: Item[], lessonIds: Set<string>, rng: Rng): Exercise {
  const options = shuffle([it, ...pickDistractors(it, pool, 3, kind, lessonIds, rng)], rng).map((o) => o.id)
  return { id: uid(kind, it.id), kind, itemId: it.id, options }
}

function tone(it: Item, rng: Rng): Exercise | null {
  const n = hanChars(it.hanzi).length
  if (n < 1 || n > 3) return null
  // all-neutral-tone particles (啦, 吗…) make for a meaningless tone quiz
  if (syllables(it.pinyin).every((s) => toneOf(s) === 5)) return null
  const wrong = toneDistractors(it.pinyin, 3, rng)
  if (wrong.length < 2) return null
  return { id: uid('tone', it.id), kind: 'tone', itemId: it.id, answer: it.pinyin, options: shuffle([it.pinyin, ...wrong], rng) }
}

function build(it: Item, pool: Item[], rng: Rng): Exercise | null {
  if (!it.example) return null
  const answer = tokenize(it.example.zh)
  if (answer.length < 3 || answer.length > 9) return null
  const extra = new Set<string>()
  for (const other of shuffle(pool.filter((p) => p.unitId === it.unitId && p.id !== it.id && p.example), rng)) {
    for (const t of tokenize(other.example!.zh)) if (!answer.includes(t)) extra.add(t)
    if (extra.size >= 6) break
  }
  const tiles = shuffle([...answer, ...sample([...extra], 2, rng)], rng)
  return { id: uid('build', it.id), kind: 'build', itemId: it.id, answer, tiles }
}

/** "Which would a Singaporean say?" — the SG term vs the mainland one (plus a decoy). */
function sgPick(it: Item, pool: Item[], rng: Rng): Exercise | null {
  if (!it.sg || !it.standard) return null
  const decoy = shuffle(
    pool.filter((p) => p.id !== it.id && p.hanzi !== it.standard!.hanzi && hanChars(p.hanzi).length === hanChars(it.hanzi).length),
    rng,
  )[0]
  const options = shuffle([it.hanzi, it.standard.hanzi, ...(decoy ? [decoy.hanzi] : [])], rng)
  return { id: uid('sgpick', it.id), kind: 'sgpick', itemId: it.id, options, answer: it.hanzi }
}

function speak(it: Item): Exercise {
  const ex = it.example
  const useSentence = ex && stripPunct(ex.zh).length <= 10
  return {
    id: uid('speak', it.id),
    kind: 'speak',
    itemId: it.id,
    text: useSentence ? ex.zh.replace(/ /g, '') : it.hanzi,
    en: useSentence ? ex.en : it.english,
  }
}

function match(items: Item[], rng: Rng): Exercise {
  return { id: uid('match', items.map((i) => i.id).join('.')), kind: 'match', itemIds: sample(items, 5, rng).map((i) => i.id) }
}

/** One varied recall exercise for an item that's already been introduced. */
function recall(it: Item, pool: Item[], lessonIds: Set<string>, rng: Rng, avoid?: ExerciseKind): Exercise {
  const kinds: ExerciseKind[] = shuffle(['en2zh', 'listen', 'tone', 'zh2en'] as ExerciseKind[], rng).filter((k) => k !== avoid)
  for (const k of kinds) {
    if (k === 'tone') {
      const t = tone(it, rng)
      if (t) return t
      continue
    }
    return mc(k as 'zh2en' | 'en2zh' | 'listen', it, pool, lessonIds, rng)
  }
  return mc('zh2en', it, pool, lessonIds, rng)
}

export function generateLesson(lessonItems: Item[], opts: GenerateOptions): Exercise[] {
  const rng = opts.rng ?? Math.random
  const { pool } = opts
  const lessonIds = new Set(lessonItems.map((i) => i.id))
  const out: Exercise[] = []

  if (opts.mode === 'learn') {
    // Introduce two at a time, each followed by a quick reading check.
    for (let i = 0; i < lessonItems.length; i += 2) {
      const pair = lessonItems.slice(i, i + 2)
      for (const it of pair) out.push({ id: uid('intro', it.id), kind: 'intro', itemId: it.id })
      for (const it of shuffle(pair, rng)) out.push(mc('zh2en', it, pool, lessonIds, rng))
    }
    for (const it of shuffle(lessonItems, rng)) out.push(recall(it, pool, lessonIds, rng, 'zh2en'))
  } else {
    const drills: Exercise[] = []
    for (const it of lessonItems) {
      const first = recall(it, pool, lessonIds, rng)
      drills.push(first, recall(it, pool, lessonIds, rng, first.kind))
    }
    out.push(...shuffle(drills, rng))
  }

  for (const it of lessonItems) {
    const e = sgPick(it, pool, rng)
    if (e && (opts.mode === 'learn' || rng() < 0.5)) out.push(e)
  }

  if (lessonItems.length >= 3) out.push(match(lessonItems, rng))

  const builds = shuffle(lessonItems, rng)
    .map((it) => build(it, pool, rng))
    .filter((e): e is Exercise => !!e)
    .slice(0, 2)
  out.push(...builds)

  if (opts.speaking) {
    for (const it of sample(lessonItems, opts.mode === 'learn' ? 1 : 2, rng)) out.push(speak(it))
  }
  return out
}

/** A fresh copy of an exercise (new id, reshuffled options) to retry at the end of a lesson. */
export function retryOf(ex: Exercise, rng: Rng = Math.random): Exercise {
  const id = uid(ex.kind, 'retry')
  switch (ex.kind) {
    case 'zh2en':
    case 'en2zh':
    case 'listen':
    case 'tone':
    case 'sgpick':
      return { ...ex, id, options: shuffle(ex.options, rng) }
    case 'build':
      return { ...ex, id, tiles: shuffle(ex.tiles, rng) }
    case 'match':
      return { ...ex, id, itemIds: shuffle(ex.itemIds, rng) }
    default:
      return { ...ex, id }
  }
}

/** Items an exercise tests (for mistake tracking). */
export function itemsOf(ex: Exercise): string[] {
  return ex.kind === 'match' ? ex.itemIds : [ex.itemId]
}
