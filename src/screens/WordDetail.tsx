import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { content, SMD_BASE } from '../content'
import { cardId } from '../data/types'
import { AudioButton } from '../components/AudioButton'
import { Hanzi } from '../components/Hanzi'
import { StrokeChar } from '../components/StrokeChar'
import { CharBreakdown } from '../components/CharParts'
import { charInfo } from '../content/chars'
import { Icon } from '../components/icons'
import { BackButton, Button, Card, SgBadge, StrengthBars } from '../components/ui'
import { isCustomItem } from '../content/custom'
import { hanChars } from '../lib/pinyin'
import { formatInterval, retrievability, strength } from '../lib/srs'
import { useApp } from '../store/app'

export function WordDetailScreen() {
  const { itemId = '' } = useParams()
  const it = content.items.get(itemId)
  const cards = useApp((st) => st.s.cards)
  const [writing, setWriting] = useState(false)
  if (!it) return <p className="p-6">Word not found.</p>
  const read = cards[cardId(it.id, 'read')]
  const sayCard = cards[cardId(it.id, 'say')]
  const unit = content.units.find((u) => u.id === it.unitId)
  const lesson = unit?.lessons.find((l) => l.items.includes(it.id))
  const mine = isCustomItem(it)

  return (
    <div>
      <div className="mb-2">
        <BackButton />
      </div>
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="tile px-7 pb-4 pt-3">
          <Hanzi text={it.hanzi} pinyin={it.pinyin} showPinyin className="text-6xl" />
        </div>
        <p className="font-display text-2xl font-extrabold">{it.english}</p>
        <AudioButton text={it.hanzi} />
        <div className="flex items-center gap-2">
          {it.sg && <SgBadge />}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold capitalize text-slate-500">{it.type}</span>
        </div>
      </div>

      {it.standard && (
        <Card className="mb-4">
          <p className="mb-1 font-display text-sm font-extrabold text-slate-500">In China / elsewhere</p>
          <div className="flex items-center gap-3">
            <Hanzi text={it.standard.hanzi} pinyin={it.standard.pinyin} showPinyin className="text-2xl" />
            <AudioButton text={it.standard.hanzi} size="sm" slow={false} />
          </div>
        </Card>
      )}
      {it.note && (
        <p className="mb-4 flex gap-2 rounded-3xl bg-amber-50 p-4 text-amber-900 dark:text-amber-200">
          <Icon name="bulb" className="h-5 w-5 shrink-0 text-amber-500" />
          {it.note}
        </p>
      )}
      {it.example && (
        <Card className="mb-4">
          <p className="mb-1 font-display text-sm font-extrabold text-slate-500">Example</p>
          <div className="flex items-start justify-between gap-2">
            <Hanzi text={it.example.zh.replace(/ /g, '')} showPinyin className="text-2xl leading-loose" />
            <AudioButton text={it.example.zh.replace(/ /g, '')} size="sm" />
          </div>
          <p className="text-slate-600">{it.example.en}</p>
        </Card>
      )}

      {hanChars(it.hanzi).some((c) => charInfo(c)) && (
        <Card className="mb-4 space-y-4" data-testid="building-blocks">
          <p className="flex items-baseline justify-between font-display text-sm font-extrabold text-slate-500">
            Building blocks <span className="font-han font-normal text-slate-400">部件</span>
          </p>
          {[...new Set(hanChars(it.hanzi))].map((c) => (
            <CharBreakdown key={c} ch={c} />
          ))}
        </Card>
      )}

      <Card className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-display text-sm font-extrabold text-slate-500">
            {writing ? 'Write it — trace each stroke' : 'Stroke order · tap to replay'}
          </p>
          <button type="button" className="inline-flex items-center gap-1 text-sm font-bold text-sky-600" onClick={() => setWriting((w) => !w)} data-testid="toggle-writing">
            {writing ? <><Icon name="play" className="h-4 w-4" /> Watch</> : <><Icon name="brush" className="h-4 w-4" /> Practise writing</>}
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {hanChars(it.hanzi).map((ch, i) => (
            <StrokeChar key={ch + i + String(writing)} ch={ch} quiz={writing} />
          ))}
        </div>
      </Card>

      <Card className="mb-4 text-sm">
        <p className="mb-2 font-display text-sm font-extrabold text-slate-500">Your memory</p>
        {read ? (
          <div className="space-y-1 text-slate-600">
            <p className="flex items-center gap-2">
              Strength <StrengthBars value={strength(read)} />
            </p>
            <p>Recall chance now: {Math.round(retrievability(read) * 100)}%</p>
            <p className="flex items-center gap-1.5">
              <Icon name="eye" className="h-4 w-4 text-sky-500" /> Read card due {read.due <= Date.now() ? 'now' : `in ${formatInterval(read.due - Date.now())}`}
            </p>
            {sayCard && (
              <p className="flex items-center gap-1.5">
                <Icon name="chat" className="h-4 w-4 text-rose-500" /> Say card due {sayCard.due <= Date.now() ? 'now' : `in ${formatInterval(sayCard.due - Date.now())}`}
              </p>
            )}
          </div>
        ) : mine ? (
          <p className="text-slate-500">
            Not practised yet —{' '}
            <Link to="/lesson/mine" className="font-bold text-sky-600">
              practise My words
            </Link>{' '}
            to add it to your flashcards.
          </p>
        ) : (
          <p className="text-slate-500">
            Not learned yet — it's in{' '}
            <Link to="/" className="font-bold text-sky-600">
              {unit?.title} › {lesson?.title}
            </Link>
            .
          </p>
        )}
      </Card>

      {mine && <RemoveMine id={it.id} />}

      <a
        href={it.smd ? `${SMD_BASE}/terms/${it.smd}` : SMD_BASE}
        target="_blank"
        rel="noreferrer"
        className="block text-center text-sm font-bold text-sky-600"
      >
        {it.smd ? 'Read more in the Singaporean Mandarin Database ↗' : 'Browse the Singaporean Mandarin Database ↗'}
      </a>
      {it.verify && <p className="mt-2 text-center text-xs text-slate-400">This entry is marked for a native-speaker double-check.</p>}
    </div>
  )
}

/** My words can be removed (with their flashcards); confirm inline first. */
function RemoveMine({ id }: { id: string }) {
  const remove = useApp((st) => st.removeCustomItem)
  const nav = useNavigate()
  const [confirm, setConfirm] = useState(false)
  return confirm ? (
    <div className="mb-4 rounded-3xl bg-rose-50 p-3 text-center">
      <p className="mb-2 text-sm text-rose-700 dark:text-rose-300">Remove this word and its flashcards?</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => setConfirm(false)}>
          Keep
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            remove(id)
            nav('/words', { replace: true })
          }}
          data-testid="remove-mine-confirm"
        >
          Remove
        </Button>
      </div>
    </div>
  ) : (
    <Button variant="ghost" className="mb-4 w-full text-rose-500" onClick={() => setConfirm(true)} data-testid="remove-mine">
      Remove from My words
    </Button>
  )
}
