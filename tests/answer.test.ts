import { describe, expect, it } from 'vitest'
import { content } from '../src/content'
import { installPinyinEngine } from '../src/lib/pinyinEngine'
import { bestSpeechScore, normalizeTranscript, numberToChinese, sameTokens, speechScore, SPEECH_PASS } from '../src/lib/answer'
import { looseKey, setTone, stripTone, toneOf } from '../src/lib/pinyin'

installPinyinEngine([...content.items.values()])

describe('pinyin helpers', () => {
  it('reads and sets tones', () => {
    expect(toneOf('nǐ')).toBe(3)
    expect(toneOf('men')).toBe(5)
    expect(stripTone('lǜ')).toBe('lü')
    expect(setTone('hao', 3)).toBe('hǎo')
    expect(setTone('dou', 1)).toBe('dōu')
    expect(setTone('gui', 4)).toBe('guì')
    expect(setTone('lü', 4)).toBe('lǜ')
    expect(looseKey('Kā fēi wū')).toBe('kafeiwu')
  })
})

describe('speech scoring', () => {
  it('writes numbers in Chinese', () => {
    expect(numberToChinese(5)).toBe('五')
    expect(numberToChinese(12)).toBe('十二')
    expect(numberToChinese(20)).toBe('二十')
    expect(numberToChinese(105)).toBe('一百零五')
    expect(numberToChinese(2000)).toBe('二千')
    expect(normalizeTranscript('我要 2 杯。')).toBe('我要二杯')
  })

  it('accepts exact and homophone transcripts', () => {
    expect(speechScore('他是我的朋友', '他是我的朋友。')).toBe(1)
    // recogniser picks 她 instead of 他 — same sound, should pass
    expect(speechScore('她是我的朋友', '他是我的朋友。')).toBeGreaterThanOrEqual(SPEECH_PASS)
  })

  it('rejects something else', () => {
    expect(speechScore('今天天气很好', '我要一杯咖啡乌')).toBeLessThan(SPEECH_PASS)
    expect(speechScore('', '你好')).toBe(0)
  })

  it('picks the best alternative', () => {
    const r = bestSpeechScore(['你号', '你好'], '你好')
    expect(r.heard).toBe('你好')
    expect(r.score).toBe(1)
  })

  it('compares built sentences by joined text', () => {
    expect(sameTokens(['我', '要', '一杯'], ['我', '要', '一杯'])).toBe(true)
    expect(sameTokens(['我要', '一杯'], ['我', '要', '一杯'])).toBe(true)
    expect(sameTokens(['要', '我', '一杯'], ['我', '要', '一杯'])).toBe(false)
  })
})
