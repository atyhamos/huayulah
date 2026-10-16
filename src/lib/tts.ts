/** Text-to-speech via the browser's built-in voices (free, works offline on most phones). */

export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

let voices: SpeechSynthesisVoice[] = []
let voicesSettled = false
const listeners = new Set<() => void>()
const missingListeners = new Set<() => void>()

export function refreshVoices() {
  if (!ttsSupported) return
  voices = window.speechSynthesis.getVoices()
  if (voices.length) voicesSettled = true
  listeners.forEach((l) => l())
}

if (ttsSupported) {
  refreshVoices()
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    voicesSettled = true
    refreshVoices()
  })
  // some browsers never fire voiceschanged when the list is (and stays) empty
  setTimeout(() => {
    voicesSettled = true
    refreshVoices()
  }, 1500)
}

export function onVoicesChanged(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Called when something should have been spoken but this browser has no Mandarin voice. */
export function onMissingVoice(fn: () => void) {
  missingListeners.add(fn)
  return () => missingListeners.delete(fn)
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

/** Mandarin voices, best first (Cantonese voices are left out). */
export function chineseVoices(): SpeechSynthesisVoice[] {
  return voices
    .filter(isChinese)
    .filter((v) => rank(v) > -40)
    .sort((a, b) => rank(b) - rank(a))
}

export function pickVoice(voiceURI: string | null): SpeechSynthesisVoice | undefined {
  const list = chineseVoices()
  return list.find((v) => v.voiceURI === voiceURI) ?? list[0]
}

export type VoiceStatus = 'unsupported' | 'loading' | 'none' | 'ok'

export function voiceStatus(): VoiceStatus {
  if (!ttsSupported) return 'unsupported'
  if (chineseVoices().length) return 'ok'
  return voicesSettled ? 'none' : 'loading'
}

export interface SpeakOptions {
  rate?: number
  pitch?: number
  voiceURI?: string | null
  onEnd?: () => void
}

// Chrome garbage-collects in-flight utterances (and then never fires onend) unless something holds them.
let current: SpeechSynthesisUtterance | null = null

export function speak(text: string, opts: SpeakOptions = {}) {
  if (!ttsSupported) return
  if (!voices.length) refreshVoices()
  const voice = pickVoice(opts.voiceURI ?? null)
  if (!voice && voicesSettled) {
    // An English voice would skip the characters and play silence — say why instead.
    missingListeners.forEach((l) => l())
    return
  }
  const synth = window.speechSynthesis
  const u = new SpeechSynthesisUtterance(text)
  if (voice) u.voice = voice
  u.lang = voice?.lang ?? 'zh-CN'
  u.rate = opts.rate ?? 0.9
  if (opts.pitch) u.pitch = opts.pitch
  u.onend = () => {
    if (current === u) current = null
    opts.onEnd?.()
  }
  current = u
  const go = () => {
    synth.resume() // Chrome can get stuck in a paused state
    synth.speak(u)
  }
  if (synth.speaking || synth.pending) {
    synth.cancel()
    setTimeout(go, 0) // speaking straight after cancel() can drop the new utterance
  } else go()
}

export function stopSpeaking() {
  if (ttsSupported) window.speechSynthesis.cancel()
}

/** Where to get a Mandarin voice on this device. */
export function voiceHelp(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent): string[] {
  if (/android/i.test(ua))
    return ['Install “Speech Services by Google” from the Play Store.', 'Then in Android Settings → Text-to-speech, add Chinese (Mandarin).']
  if (/iphone|ipad|ipod/i.test(ua))
    return ['Open Settings → Accessibility → Spoken Content → Voices.', 'Add a Chinese (China mainland) voice, then reopen the app.']
  if (/windows/i.test(ua) && /firefox/i.test(ua))
    return [
      'Firefox-based browsers (Firefox, Zen…) can only use voices installed in Windows.',
      'Windows Settings → Time & language → Language & region → Add a language → Chinese (Simplified, China). Make sure “Text-to-speech” is ticked (the display language can be skipped).',
      'Fully close and reopen the browser.',
      'Still nothing? Edge and Chrome on the same PC come with Mandarin voices built in.',
    ]
  if (/windows/i.test(ua))
    return ['Windows Settings → Time & language → Speech → Add voices → Chinese (Simplified, China).', 'Then fully close and reopen the browser.']
  if (/macintosh/i.test(ua))
    return ['System Settings → Accessibility → Spoken Content → System voice → Manage voices → add a Chinese (China mainland) voice.', 'Then reopen the browser.']
  return ['Your browser has no Mandarin text-to-speech voice. Chrome and Edge include one.']
}
