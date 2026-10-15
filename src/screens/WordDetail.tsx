import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { content, SMD_BASE } from '../content'
import { cardId } from '../data/types'
import { AudioButton } from '../components/AudioButton'
import { Hanzi } from '../components/Hanzi'
import { Card, Icon, SgBadge, StrengthBars } from '../components/ui'
import { hanChars } from '../lib/pinyin'
import { formatInterval, retrievability, strength } from '../lib/srs'
import { IS_ARTIFACT } from '../env'
import { useApp } from '../store/app'

export function WordDetailScreen() {
  const { itemId = '' } = useParams()
  const nav = useNavigate()
  const it = content.items.get(itemId)
  const cards = useApp((st) => st.s.cards)
  const [writing, setWriting] = useState(false)
  if (!it) return <p className="p-6">Word not found.</p>
  const read = cards[cardId(it.id, 'read')]
  const sayCard = cards[cardId(it.id, 'say')]
  const unit = content.units.find((u) => u.id === it.unitId)!
  const lesson = unit.lessons.find((l) => l.items.includes(it.id))!

  return (
    <div>
      <button type="button" onClick={() => nav(-1)} className="mb-4 flex items-center gap-1 font-bold text-slate-400">
        {Icon.back('h-5 w-5')} Back
      </button>
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <Hanzi text={it.hanzi} pinyin={it.pinyin} showPinyin className="text-6xl" />
        <AudioButton text={it.hanzi} />
        <p className="text-2xl font-bold">{it.english}</p>
        <div className="flex items-center gap-2">
          {it.sg && <SgBadge />}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold capitalize text-slate-500">{it.type}</span>
        </div>
      </div>

      {it.standard && (
        <Card className="mb-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">In China / elsewhere</p>
          <div className="flex items-center gap-3">
            <Hanzi text={it.standard.hanzi} pinyin={it.standard.pinyin} showPinyin className="text-2xl" />
            <AudioButton text={it.standard.hanzi} size="sm" slow={false} />
          </div>
        </Card>
      )}
      {it.note && <p className="mb-4 rounded-2xl bg-amber-50 p-4 text-amber-900 dark:text-amber-200">💡 {it.note}</p>}
      {it.example && (
        <Card className="mb-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Example</p>
          <div className="flex items-start justify-between gap-2">
            <Hanzi text={it.example.zh.replace(/ /g, '')} showPinyin className="text-2xl leading-loose" />
            <AudioButton text={it.example.zh.replace(/ /g, '')} size="sm" />
          </div>
          <p className="text-slate-600">{it.example.en}</p>
        </Card>
      )}

      <Card className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {writing ? 'Write it — trace each stroke' : 'Stroke order · tap to replay'}
          </p>
          <button type="button" className="text-sm font-bold text-sky-600" onClick={() => setWriting((w) => !w)} data-testid="toggle-writing">
            {writing ? 'Watch' : '✍️ Practise writing'}
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {hanChars(it.hanzi).map((ch, i) => (
            <StrokeChar key={ch + i + String(writing)} ch={ch} quiz={writing} />
          ))}
        </div>
      </Card>

      <Card className="mb-4 text-sm">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Your memory</p>
        {read ? (
          <div className="space-y-1 text-slate-600">
            <p className="flex items-center gap-2">
              Strength <StrengthBars value={strength(read)} />
            </p>
            <p>Recall chance now: {Math.round(retrievability(read) * 100)}%</p>
            <p>📖 Read card due {read.due <= Date.now() ? 'now' : `in ${formatInterval(read.due - Date.now())}`}</p>
            {sayCard && <p>🗣️ Say card due {sayCard.due <= Date.now() ? 'now' : `in ${formatInterval(sayCard.due - Date.now())}`}</p>}
          </div>
        ) : (
          <p className="text-slate-500">
            Not learned yet — it's in{' '}
            <Link to="/" className="font-bold text-sky-600">
              {unit.title} › {lesson.title}
            </Link>
            .
          </p>
        )}
      </Card>

      <a
        href={it.smd ? `${SMD_BASE}/terms/${it.smd}` : SMD_BASE}
        target="_blank"
        rel="noreferrer"
        className="block text-center text-sm font-bold text-sky-600"
      >
        {it.smd ? 'Read more in the Singaporean Mandarin Database ↗' : 'Browse the Singaporean Mandarin Database ↗'}
      </a>
      {it.verify && <p className="mt-2 text-center text-xs text-slate-400">⚑ This entry is marked for a native-speaker double-check.</p>}
    </div>
  )
}

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

function StrokeChar({ ch, quiz }: { ch: string; quiz: boolean }) {
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
      const size = quiz ? 140 : 96
      const ink = cssVar('--color-slate-800', '#0f172a')
      writer.current = HanziWriter.create(el, ch, {
        width: size,
        height: size,
        padding: 4,
        showOutline: true,
        showCharacter: !quiz,
        strokeColor: ink,
        radicalColor: '#16a34a',
        highlightColor: '#0ea5e9',
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
        onLoadCharDataError: () => setFailed(true),
      })
      if (quiz)
        writer.current.quiz({
          onMistake: () => setMistakes((m) => m + 1),
          onComplete: () => setDone(true),
        })
      else writer.current.animateCharacter()
    })
    return () => {
      cancelled = true
    }
  }, [ch, quiz])

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
        <span className="text-xs text-slate-400">{done ? (mistakes ? `✓ ${mistakes} slip${mistakes > 1 ? 's' : ''}` : '✓ perfect') : ' '}</span>
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
