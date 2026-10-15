import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { content, SMD_BASE } from '../content'
import { cardId } from '../data/types'
import { AudioButton } from '../components/AudioButton'
import { Hanzi } from '../components/Hanzi'
import { Card, Icon, SgBadge, StrengthBars } from '../components/ui'
import { hanChars } from '../lib/pinyin'
import { formatInterval, retrievability, strength } from '../lib/srs'
import { useApp } from '../store/app'

export function WordDetailScreen() {
  const { itemId = '' } = useParams()
  const nav = useNavigate()
  const it = content.items.get(itemId)
  const cards = useApp((st) => st.s.cards)
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
      {it.note && <p className="mb-4 rounded-2xl bg-amber-50 p-4 text-amber-900">💡 {it.note}</p>}
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
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Stroke order · tap to replay</p>
        <div className="flex flex-wrap gap-3">
          {hanChars(it.hanzi).map((ch, i) => (
            <StrokeChar key={ch + i} ch={ch} />
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

function StrokeChar({ ch }: { ch: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const writer = useRef<{ animateCharacter: () => void } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const el = ref.current
    if (!el) return
    void import('hanzi-writer').then(({ default: HanziWriter }) => {
      if (cancelled) return
      el.innerHTML = ''
      writer.current = HanziWriter.create(el, ch, {
        width: 96,
        height: 96,
        padding: 4,
        showOutline: true,
        strokeColor: '#0f172a',
        radicalColor: '#16a34a',
        strokeAnimationSpeed: 1.2,
        delayBetweenStrokes: 150,
        onLoadCharDataError: () => setFailed(true),
      })
      writer.current.animateCharacter()
    })
    return () => {
      cancelled = true
    }
  }, [ch])

  return (
    <button
      type="button"
      onClick={() => writer.current?.animateCharacter()}
      className="grid h-24 w-24 place-items-center rounded-xl border-2 border-dashed border-slate-200"
      aria-label={`Stroke order for ${ch}`}
    >
      {failed ? <span className="font-han text-6xl">{ch}</span> : <div ref={ref} />}
    </button>
  )
}
