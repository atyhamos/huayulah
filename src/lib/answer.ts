import { looseKey, rubyFor } from './pinyin'
import { stripPunct } from './exercises'

const DIGITS = '零一二三四五六七八九'

/** 25 → 二十五, 105 → 一百零五. Good enough for prices, times and dates (< 100 000). */
export function numberToChinese(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n >= 100_000) return String(n)
  if (n < 10) return DIGITS[n]
  const units = ['', '十', '百', '千', '万']
  const digits = String(n).split('').map(Number)
  let out = ''
  let zero = false
  digits.forEach((d, i) => {
    const pos = digits.length - 1 - i
    if (d === 0) {
      zero = true
      return
    }
    if (zero && out) out += '零'
    zero = false
    out += (d === 1 && pos === 1 && i === 0 ? '' : DIGITS[d]) + units[pos]
  })
  return out
}

/** Normalise speech-recognition output: drop punctuation/spaces, write numbers in Chinese. */
export function normalizeTranscript(s: string): string {
  return stripPunct(s.replace(/\d+/g, (m) => numberToChinese(Number(m)))).toLowerCase()
}

export function levenshtein<T>(a: ArrayLike<T>, b: ArrayLike<T>): number {
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[n]
}

function similarity<T>(a: ArrayLike<T>, b: ArrayLike<T>): number {
  const max = Math.max(a.length, b.length)
  return max === 0 ? 1 : 1 - levenshtein(a, b) / max
}

const syllablesOf = (text: string) =>
  rubyFor(text)
    .filter((r) => r.py)
    .map((r) => r.py!)

/**
 * How close a spoken transcript is to the target text, 0–1.
 * Pinyin comparison needs the pinyin engine loaded (see loadPinyinEngine); without it, characters only.
 * Takes the better of character match and pinyin match, since the recogniser often
 * picks a homophone (e.g. 他 vs 她) that was pronounced perfectly. Pinyin match is
 * mostly toneless, with a small weight on tones so the right tone still wins ties.
 */
export function speechScore(transcript: string, target: string): number {
  const t = normalizeTranscript(transcript)
  const g = normalizeTranscript(target)
  const charSim = similarity([...t], [...g])
  const ts = syllablesOf(t)
  const gs = syllablesOf(g)
  const pySim = ts.length && gs.length ? 0.9 * similarity(ts.map(looseKey), gs.map(looseKey)) + 0.1 * similarity(ts, gs) : 0
  return Math.max(charSim, pySim)
}

export const SPEECH_PASS = 0.8

/** Best score across the recogniser's alternative transcripts. */
export function bestSpeechScore(alternatives: string[], target: string): { score: number; heard: string } {
  let best = { score: 0, heard: alternatives[0] ?? '' }
  for (const alt of alternatives) {
    const score = speechScore(alt, target)
    if (score > best.score) best = { score, heard: alt }
  }
  return best
}

export function sameTokens(picked: string[], answer: string[]): boolean {
  return picked.join('') === answer.join('')
}
