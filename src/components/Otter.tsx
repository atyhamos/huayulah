import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store/app'
import { speak } from '../lib/tts'
import { OtterSvg, type OtterMood } from './OtterSvg'

export type { OtterMood }

const TAP_LINES = [
  { zh: '加油！', en: 'You can do it!' },
  { zh: '你好！', en: 'Hello!' },
  { zh: '吃饱了吗？', en: 'Eaten yet?' },
  { zh: '慢慢来。', en: 'Take your time.' },
  { zh: '好棒！', en: 'Well done!' },
  { zh: '我是阿獭！', en: "I'm Ah Tat!" },
  { zh: '好热啊！', en: 'So hot!' },
  { zh: '去喝咖啡吧！', en: "Let's go for kopi!" },
]

/**
 * The mascot, with tap-to-react: a hop, a line in Mandarin (spoken aloud) and its translation.
 * `say` shows a fixed speech bubble instead.
 */
export function Otter({
  mood = 'idle',
  size = 96,
  interactive = true,
  say,
  bubbleSide = 'right',
  className = '',
}: {
  mood?: OtterMood
  size?: number
  interactive?: boolean
  say?: { zh?: string; en?: string } | null
  bubbleSide?: 'right' | 'left' | 'top'
  className?: string
}) {
  const settings = useApp((s) => s.s.settings)
  const [reaction, setReaction] = useState<{ zh: string; en: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const tap = () => {
    if (!interactive) return
    const line = TAP_LINES[Math.floor(Math.random() * TAP_LINES.length)]
    setReaction(line)
    if (settings.sound) speak(line.zh, { rate: settings.ttsRate, voiceURI: settings.voiceURI, pitch: 1.35 })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setReaction(null), 2200)
  }

  const bubble = reaction ?? say
  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={tap}
        disabled={!interactive}
        aria-label={interactive ? 'Tap Ah Tat the otter' : 'Ah Tat the otter'}
        className="block disabled:cursor-default"
        data-testid="otter"
      >
        <OtterSvg mood={reaction ? 'happy' : mood} size={size} key={reaction ? reaction.zh : mood} />
      </button>
      {bubble && (bubble.zh || bubble.en) && (
        <div
          className={`pointer-events-none absolute z-10 w-max max-w-44 animate-pop rounded-2xl border-2 border-slate-200 bg-surface px-3 py-1.5 text-left shadow-sm ${
            bubbleSide === 'top' ? 'bottom-full left-1/2 mb-1 -translate-x-1/2' : bubbleSide === 'left' ? 'right-[80%] top-0' : 'left-[85%] top-1'
          }`}
        >
          {bubble.zh && <span className="font-han block text-base font-bold leading-tight">{bubble.zh}</span>}
          {bubble.en && <span className="block text-xs text-slate-500">{bubble.en}</span>}
        </div>
      )}
    </div>
  )
}
