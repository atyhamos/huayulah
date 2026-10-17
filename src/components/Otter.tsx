import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../store/app'
import { speak } from '../lib/tts'
import { OtterArt, type OtterMood } from './OtterArt'
import { useBubblePosition } from './useBubblePosition'

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
 * The mascot, with tap-to-react: a hop, a happy clip, a line in Mandarin (spoken aloud) and its translation.
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
  const [pokes, setPokes] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const tap = () => {
    if (!interactive) return
    const line = TAP_LINES[Math.floor(Math.random() * TAP_LINES.length)]
    setReaction(line)
    setPokes((n) => n + 1)
    if (settings.sound) speak(line.zh, { rate: settings.ttsRate, voiceURI: settings.voiceURI, pitch: 1.35 })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setReaction(null), 2200)
  }

  const bubble = reaction ?? say
  const shown = bubble && (bubble.zh || bubble.en) ? bubble : null
  const anchor = useRef<HTMLButtonElement>(null)
  const pos = useBubblePosition(anchor, shown ? `${shown.zh ?? ''}|${shown.en ?? ''}` : '', bubbleSide)
  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={anchor}
        type="button"
        onClick={tap}
        disabled={!interactive}
        aria-label={interactive ? 'Tap Ah Tat the otter' : 'Ah Tat the otter'}
        className="block disabled:cursor-default"
        data-testid="otter"
      >
        <OtterArt mood={mood} size={size} poke={pokes} />
      </button>
      {shown &&
        // portalled + fixed so a parent's overflow-hidden (cards) can't clip it
        createPortal(
          <div
            ref={pos.ref}
            data-testid="otter-bubble"
            style={{ position: 'fixed', left: pos.left, top: pos.top, visibility: pos.ready ? 'visible' : 'hidden' }}
            className="pointer-events-none z-[60] w-max max-w-44 animate-pop rounded-2xl border-2 border-slate-200 bg-surface px-3 py-1.5 text-left shadow-sm"
          >
            {shown.zh && <span className="font-han block text-base font-bold leading-tight">{shown.zh}</span>}
            {shown.en && <span className="block text-xs text-slate-500">{shown.en}</span>}
          </div>,
          document.body,
        )}
    </div>
  )
}
