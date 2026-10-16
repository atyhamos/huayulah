import { afterEach, describe, expect, it, vi } from 'vitest'

type FakeVoice = { name: string; lang: string; voiceURI: string }
const v = (name: string, lang: string): FakeVoice => ({ name, lang, voiceURI: name })

/** Load a fresh copy of the tts module against a fake speechSynthesis with these voices. */
async function loadTts(voices: FakeVoice[]) {
  vi.resetModules()
  const synth = {
    getVoices: () => voices,
    addEventListener: vi.fn(),
    speak: vi.fn(),
    cancel: vi.fn(),
    resume: vi.fn(),
    speaking: false,
    pending: false,
  }
  vi.stubGlobal('window', { speechSynthesis: synth })
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string
      voice?: FakeVoice
      lang = ''
      rate = 1
      pitch = 1
      onend: (() => void) | null = null
      constructor(text: string) {
        this.text = text
      }
    },
  )
  const tts = await import('../src/lib/tts')
  return { tts, synth }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('tts', () => {
  it('prefers Singapore, then mainland Mandarin, and leaves out Cantonese', async () => {
    const { tts } = await loadTts([v('Cantonese', 'zh-HK'), v('Taiwan', 'zh-TW'), v('Mainland', 'zh-CN'), v('Lion City', 'zh-SG'), v('David', 'en-US')])
    expect(tts.chineseVoices().map((x) => x.name)).toEqual(['Lion City', 'Mainland', 'Taiwan'])
    expect(tts.voiceStatus()).toBe('ok')
  })

  it('speaks with the chosen Mandarin voice', async () => {
    const { tts, synth } = await loadTts([v('Mainland', 'zh-CN'), v('Lion City', 'zh-SG')])
    tts.speak('你好', { voiceURI: 'Mainland' })
    expect(synth.speak).toHaveBeenCalledOnce()
    const u = synth.speak.mock.calls[0][0]
    expect(u.voice.name).toBe('Mainland')
    expect(u.lang).toBe('zh-CN')
  })

  it('reports a missing voice instead of reading Chinese with an English voice', async () => {
    const { tts, synth } = await loadTts([v('David', 'en-US'), v('Zira', 'en-US')])
    const missing = vi.fn()
    tts.onMissingVoice(missing)
    expect(tts.voiceStatus()).toBe('none')
    tts.speak('你好')
    expect(missing).toHaveBeenCalledOnce()
    expect(synth.speak).not.toHaveBeenCalled()
  })

  it('waits for the voice list before giving up', async () => {
    vi.useFakeTimers()
    const { tts, synth } = await loadTts([])
    expect(tts.voiceStatus()).toBe('loading')
    tts.speak('你好') // still loading: try anyway with lang zh-CN
    expect(synth.speak).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(1600)
    expect(tts.voiceStatus()).toBe('none')
  })

  it('gives Firefox-on-Windows specific help', async () => {
    const { tts } = await loadTts([])
    const zen = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0 Zen/1.0'
    expect(tts.voiceHelp(zen).join(' ')).toMatch(/Chinese \(Simplified, China\)/)
    expect(tts.voiceHelp(zen).join(' ')).toMatch(/Edge and Chrome/)
  })
})
