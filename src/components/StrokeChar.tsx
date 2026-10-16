import { useEffect, useRef, useState } from 'react'
import { IS_ARTIFACT } from '../env'

// artifact demo: one combined file instead of hundreds of small ones
let allStrokes: Promise<Record<string, never>> | null = null

/** Resolve a theme color to rgb() — hanzi-writer can't parse Tailwind's oklch() values. */
function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (!value) return fallback
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!ctx) return fallback
  ctx.fillStyle = fallback
  ctx.fillStyle = value
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return `rgb(${r}, ${g}, ${b})`
}

/** One character's stroke order: animates on tap, or (quiz) lets you trace it stroke by stroke. */
export function StrokeChar({
  ch,
  quiz,
  size,
  onDone,
  onFail,
}: {
  ch: string
  quiz: boolean
  size?: number
  /** Quiz finished, with the number of wrong strokes. */
  onDone?: (mistakes: number) => void
  /** Stroke data couldn't be loaded (e.g. offline and not cached). */
  onFail?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const writer = useRef<{ animateCharacter: () => void; quiz: (o?: object) => unknown } | null>(null)
  const [failed, setFailed] = useState(false)
  const [done, setDone] = useState(false)
  const [mistakes, setMistakes] = useState(0)

  useEffect(() => {
    let cancelled = false
    const el = ref.current
    if (!el) return
    void import('hanzi-writer').then(({ default: HanziWriter }) => {
      if (cancelled) return
      el.innerHTML = ''
      const px = size ?? (quiz ? 140 : 96)
      const ink = cssVar('--color-slate-800', '#0f172a')
      writer.current = HanziWriter.create(el, ch, {
        width: px,
        height: px,
        padding: 4,
        showOutline: true,
        showCharacter: !quiz,
        strokeColor: ink,
        radicalColor: cssVar('--color-brand-600', '#42805d'),
        highlightColor: cssVar('--color-sky-500', '#4669ad'),
        drawingColor: ink,
        outlineColor: cssVar('--color-slate-200', '#ddd'),
        strokeAnimationSpeed: 1.2,
        delayBetweenStrokes: 150,
        showHintAfterMisses: 2,
        // course characters are served locally (works offline); anything else falls back to the CDN
        charDataLoader: (c, onLoad, onError) => {
          if (IS_ARTIFACT) {
            allStrokes ??= fetch('strokes.json').then((r) => r.json())
            allStrokes.then((all) => (all[c] ? onLoad(all[c]) : onError()), onError)
            return
          }
          fetch(`/strokes/${encodeURIComponent(c)}.json`)
            .then((r) => (r.ok && r.headers.get('content-type')?.includes('json') ? r.json() : fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${c}.json`).then((r2) => r2.json())))
            .then(onLoad, onError)
        },
        onLoadCharDataError: () => {
          setFailed(true)
          onFail?.()
        },
      })
      if (quiz) {
        let slips = 0
        writer.current.quiz({
          onMistake: () => setMistakes(++slips),
          onComplete: () => {
            setDone(true)
            onDone?.(slips)
          },
        })
      }
      else writer.current.animateCharacter()
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ch, quiz, size])

  if (failed) {
    return (
      <div className="grid h-24 w-24 place-items-center rounded-xl border-2 border-dashed border-slate-200">
        <span className="font-han text-6xl">{ch}</span>
      </div>
    )
  }
  if (quiz) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div
          ref={ref}
          className={`rounded-xl border-2 ${done ? 'border-brand-400 bg-brand-50' : 'border-dashed border-slate-300'}`}
          style={{ touchAction: 'none' }}
        />
        <span className="text-xs text-slate-400">{done ? (mistakes ? `${mistakes} slip${mistakes > 1 ? 's' : ''}` : 'Perfect!') : ' '}</span>
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={() => writer.current?.animateCharacter()}
      className="grid h-24 w-24 place-items-center rounded-xl border-2 border-dashed border-slate-200"
      aria-label={`Stroke order for ${ch}`}
    >
      <div ref={ref} />
    </button>
  )
}
