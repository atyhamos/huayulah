/** Text-to-speech via the browser's built-in voices (free, works offline on most phones). */

export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

let voices: SpeechSynthesisVoice[] = []
const listeners = new Set<() => void>()

function refresh() {
  voices = window.speechSynthesis.getVoices()
  listeners.forEach((l) => l())
}

if (ttsSupported) {
  refresh()
  window.speechSynthesis.addEventListener?.('voiceschanged', refresh)
}

export function onVoicesChanged(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

const isChinese = (v: SpeechSynthesisVoice) => /^(zh|cmn)/i.test(v.lang)

function rank(v: SpeechSynthesisVoice): number {
  const lang = v.lang.toLowerCase().replace('_', '-')
  let r = 0
  if (lang === 'zh-sg') r += 50
  else if (lang === 'zh-cn' || lang.startsWith('cmn')) r += 40
  else if (lang === 'zh-tw') r += 10
  else if (lang === 'zh-hk' || lang.startsWith('yue')) r -= 50 // Cantonese
  if (/google|natural|neural|online/i.test(v.name)) r += 5
  return r
}

/** Mandarin voices, best first. */
export function chineseVoices(): SpeechSynthesisVoice[] {
  return voices.filter(isChinese).sort((a, b) => rank(b) - rank(a))
}

export function pickVoice(voiceURI: string | null): SpeechSynthesisVoice | undefined {
  const list = chineseVoices()
  return list.find((v) => v.voiceURI === voiceURI) ?? list[0]
}

export interface SpeakOptions {
  rate?: number
  pitch?: number
  voiceURI?: string | null
  onEnd?: () => void
}

export function speak(text: string, opts: SpeakOptions = {}) {
  if (!ttsSupported) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voice = pickVoice(opts.voiceURI ?? null)
  if (voice) u.voice = voice
  u.lang = voice?.lang ?? 'zh-CN'
  u.rate = opts.rate ?? 0.9
  if (opts.pitch) u.pitch = opts.pitch
  if (opts.onEnd) u.onend = opts.onEnd
  synth.speak(u)
}

export function stopSpeaking() {
  if (ttsSupported) window.speechSynthesis.cancel()
}
