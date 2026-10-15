/** Speech recognition via the Web Speech API (Chrome / Android / Edge / Safari). */

interface RecognitionAlternative {
  transcript: string
  confidence: number
}
interface RecognitionResult {
  isFinal: boolean
  length: number
  [i: number]: RecognitionAlternative
}
interface RecognitionEvent {
  resultIndex: number
  results: { length: number; [i: number]: RecognitionResult }
}
interface Recognition {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

type Ctor = new () => Recognition

function ctor(): Ctor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const recognitionSupported = ctor() !== null

export interface ListenHandlers {
  onInterim?: (text: string) => void
  onFinal: (alternatives: string[]) => void
  onError?: (error: string) => void
  onEnd?: () => void
}

export function listen(h: ListenHandlers): { stop: () => void } {
  const C = ctor()
  if (!C) {
    h.onError?.('not-supported')
    return { stop: () => {} }
  }
  const r = new C()
  r.lang = 'zh-CN'
  r.interimResults = true
  r.maxAlternatives = 5
  r.continuous = false
  let done = false
  r.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i]
      if (res.isFinal) {
        done = true
        const alts: string[] = []
        for (let j = 0; j < res.length; j++) alts.push(res[j].transcript)
        h.onFinal(alts)
      } else h.onInterim?.(res[0].transcript)
    }
  }
  r.onerror = (e) => h.onError?.(e.error)
  r.onend = () => {
    if (!done) h.onFinal([])
    h.onEnd?.()
  }
  r.start()
  return { stop: () => r.stop() }
}
