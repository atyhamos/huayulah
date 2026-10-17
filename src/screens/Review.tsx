import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { content, getItem } from '../content'
import { dueCardIds } from '../data/actions'
import { parseCardId } from '../data/types'
import { AudioButton, useSpeak } from '../components/AudioButton'
import { Hanzi } from '../components/Hanzi'
import { Icon } from '../components/icons'
import { Otter } from '../components/Otter'
import { Button, ProgressBar, SgBadge } from '../components/ui'
import { formatInterval, previewIntervals, Rating, type Grade } from '../lib/srs'
import { sfx } from '../lib/sfx'
import { useApp } from '../store/app'
import { celebrate } from './LessonComplete'

const SESSION_SIZE = 20

export function ReviewScreen() {
  const s = useApp((st) => st.s)
  const [session, setSession] = useState<string[] | null>(null)
  const due = dueCardIds(s, new Date(), content)
  const total = due.review.length + due.fresh.length

  if (session) return <ReviewSession ids={session} onExit={() => setSession(null)} />

  const nextDue = Object.values(s.cards)
    .map((c) => c.due)
    .filter((d) => d > Date.now())
    .sort((a, b) => a - b)[0]
  const learned = Object.keys(s.cards).filter((k) => k.endsWith('__read')).length

  const start = () => {
    // interleave: mostly reviews, sprinkle new cards
    const reviews = due.review.slice(0, SESSION_SIZE)
    const fresh = due.fresh.slice(0, Math.max(0, SESSION_SIZE - reviews.length))
    const out: string[] = []
    let r = 0
    let f = 0
    while (r < reviews.length || f < fresh.length) {
      for (let k = 0; k < 3 && r < reviews.length; k++) out.push(reviews[r++])
      if (f < fresh.length) out.push(fresh[f++])
    }
    setSession(out)
  }

  return (
    <div className="flex flex-col pt-2">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Review</h1>
      <p className="mb-5 font-han text-slate-400">温故知新</p>

      {/* the deck */}
      <div className="relative mb-6">
        <div className="absolute inset-x-6 -bottom-3 h-full rotate-2 rounded-3xl bg-sky-100" />
        <div className="absolute inset-x-3 -bottom-1.5 h-full -rotate-1 rounded-3xl bg-sky-200/70" />
        <div className="relative overflow-hidden rounded-3xl bg-sky-500 p-5 text-white shadow-[0_16px_30px_-18px_var(--color-sky-700)]">
          <div className="peranakan-band absolute inset-x-0 top-0 opacity-80" />
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/70">Flashcards due</p>
              <p className="font-display text-6xl font-extrabold leading-none tabular-nums">{total}</p>
              {learned > 0 && total > 0 && (
                <p className="mt-2 text-sm text-white/80">
                  {due.review.length > 0 && <>{due.review.length} to review</>}
                  {due.review.length > 0 && due.fresh.length > 0 && ' · '}
                  {due.fresh.length > 0 && <>{due.fresh.length} new to say</>}
                </p>
              )}
            </div>
            <Otter mood={learned === 0 ? 'think' : total > 0 ? 'determined' : 'sleep'} size={92} interactive />
          </div>
        </div>
      </div>

      {learned === 0 ? (
        <div className="text-center">
          <p className="mb-4 text-slate-500">Words you learn in lessons show up here, timed so you review them just before you'd forget.</p>
          <Link to="/" className="font-display font-bold text-sky-600">
            Board your first train →
          </Link>
        </div>
      ) : total > 0 ? (
        <Button variant="blue" className="w-full" onClick={start} data-testid="start-review">
          <Icon name="cards" className="h-5 w-5" /> Deal {Math.min(total, SESSION_SIZE)} cards
        </Button>
      ) : (
        <div className="text-center">
          <p className="mb-1 font-display text-xl font-extrabold text-brand-600">All caught up!</p>
          <p className="text-slate-500">{nextDue ? `Ah Tat is napping. Next card due in ${formatInterval(nextDue - Date.now())}.` : ''}</p>
        </div>
      )}
      {learned >= 4 && (
        <Link
          to="/lesson/weak"
          className="mt-6 flex w-full items-center gap-3 rounded-3xl bg-surface p-4 text-left ring-1 ring-slate-200 transition active:scale-[0.99]"
          data-testid="practice-weak"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-500">
            <Icon name="target" className="h-6 w-6" />
          </span>
          <span className="flex-1">
            <span className="block font-display font-extrabold">Practise weak words</span>
            <span className="text-sm text-slate-500">A quick ride with the words you're most likely to forget</span>
          </span>
          <Icon name="next" className="h-5 w-5 text-slate-400" />
        </Link>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 text-left text-sm text-slate-600">
        <div className="rounded-3xl bg-surface p-4 ring-1 ring-slate-200">
          <Icon name="eye" className="mb-2 h-6 w-6 text-sky-500" />
          <p className="font-display font-extrabold text-ink">Read cards</p>
          <p>See the characters, recall the sound and meaning.</p>
        </div>
        <div className="rounded-3xl bg-surface p-4 ring-1 ring-slate-200">
          <Icon name="chat" className="mb-2 h-6 w-6 text-rose-500" />
          <p className="font-display font-extrabold text-ink">Say cards</p>
          <p>See English, say it out loud in Mandarin, then check.</p>
        </div>
      </div>
    </div>
  )
}

interface QueueEntry {
  id: string
  repeat: boolean
}

function ReviewSession({ ids, onExit }: { ids: string[]; onExit: () => void }) {
  const reviewCard = useApp((st) => st.reviewCard)
  const cards = useApp((st) => st.s.cards)
  const sound = useApp((st) => st.s.settings.sound)
  const [queue, setQueue] = useState<QueueEntry[]>(() => ids.map((id) => ({ id, repeat: false })))
  const [i, setI] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const say = useSpeak()

  const entry = queue[i]
  const { itemId, dir } = entry ? parseCardId(entry.id) : { itemId: '', dir: 'read' as const }
  const it = entry ? getItem(itemId) : null
  const card = entry ? cards[entry.id] : null
  // preview against the card as it was when shown
  const intervals = useMemo(() => (card && !entry.repeat ? previewIntervals(card) : null), [entry?.id, entry?.repeat]) // eslint-disable-line react-hooks/exhaustive-deps

  const reveal = useCallback(() => {
    if (!it) return
    setRevealed(true)
    say(it.hanzi)
  }, [it, say])

  const next = useCallback(() => {
    setRevealed(false)
    setI((x) => x + 1)
  }, [])

  const rate = useCallback(
    (g: Grade) => {
      if (!entry) return
      if (!entry.repeat) {
        reviewCard(entry.id, g)
        setReviewed((n) => n + 1)
        if (g === Rating.Again) setQueue((q) => [...q, { id: entry.id, repeat: true }])
        if (sound) (g === Rating.Again ? sfx.wrong : sfx.tap)()
      }
      next()
    },
    [entry, reviewCard, next, sound],
  )

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        reveal()
      } else if (revealed && entry?.repeat && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        next()
      } else if (revealed && !entry?.repeat && ['1', '2', '3', '4'].includes(e.key)) rate(Number(e.key) as Grade)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [revealed, reveal, rate, next, entry])

  const finished = i >= queue.length
  useEffect(() => {
    if (finished && reviewed > 0) {
      celebrate()
      if (sound) sfx.complete()
    }
  }, [finished]) // eslint-disable-line react-hooks/exhaustive-deps

  if (finished || !it) {
    return (
      <div className="flex flex-col items-center pt-10 text-center" data-testid="review-done">
        <Otter mood="cheer" size={120} />
        <h1 className="mb-2 mt-2 font-display text-3xl font-extrabold">Review done!</h1>
        <p className="mb-8 text-slate-500">
          {reviewed} cards · +{reviewed} XP
        </p>
        <Button onClick={onExit}>Done</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="mb-6 flex items-center gap-3">
        <button type="button" aria-label="End review" onClick={onExit} className="grid h-10 w-10 place-items-center rounded-full text-slate-400 hover:bg-slate-100">
          <Icon name="close" className="h-6 w-6" />
        </button>
        <ProgressBar value={i / queue.length} color="bg-sky-500" />
        <span className="text-sm font-bold text-slate-400">
          {i + 1}/{queue.length}
        </span>
      </div>

      <div
        className={`relative mb-6 flex min-h-80 cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl p-6 text-center shadow-[0_16px_30px_-22px_rgb(30_60_45/0.7)] ring-1 transition ${
          revealed ? 'bg-surface ring-slate-200' : dir === 'read' ? 'bg-ivory-50 ring-ivory-300' : 'bg-sky-50 ring-sky-200'
        }`}
        onClick={() => !revealed && reveal()}
        data-testid="flashcard"
      >
        <span className={`absolute inset-x-0 top-0 h-1.5 ${dir === 'read' ? 'bg-sky-500' : 'bg-rose-500'}`} />
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Icon name={dir === 'read' ? 'eye' : 'chat'} className="h-4 w-4" />
          {dir === 'read' ? 'What does this say?' : 'Say it in Mandarin'}
          {entry.repeat && ' · again'}
        </span>
        {dir === 'read' ? (
          <Hanzi text={it.hanzi} pinyin={it.pinyin} showPinyin={revealed} className="text-6xl" />
        ) : (
          <p className="font-display text-3xl font-extrabold">{it.english}</p>
        )}
        {revealed ? (
          <div className="flex animate-pop flex-col items-center gap-3">
            {dir === 'read' ? (
              <p className="font-display text-2xl font-extrabold">{it.english}</p>
            ) : (
              <Hanzi text={it.hanzi} pinyin={it.pinyin} showPinyin className="text-5xl" />
            )}
            <AudioButton text={it.hanzi} size="sm" />
            {it.sg && <SgBadge />}
            {it.example && (
              <div className="mt-2 text-left">
                <Hanzi text={it.example.zh.replace(/ /g, '')} showPinyin={false} revealable className="text-xl leading-loose" />
                <p className="text-sm text-slate-500">{it.example.en}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">{dir === 'say' ? 'Say it out loud, then tap to check' : 'Tap to reveal'}</p>
        )}
      </div>

      {revealed &&
        (entry.repeat ? (
          <Button onClick={next}>Continue</Button>
        ) : (
          <div className="grid grid-cols-4 gap-2" data-testid="ratings">
            {(
              [
                [Rating.Again, 'Again', 'bg-rose-50 text-rose-600 ring-rose-200 dark:text-rose-300'],
                [Rating.Hard, 'Hard', 'bg-amber-50 text-amber-700 ring-amber-200 dark:text-amber-300'],
                [Rating.Good, 'Good', 'bg-brand-50 text-brand-700 ring-brand-200 dark:text-brand-300'],
                [Rating.Easy, 'Easy', 'bg-sky-50 text-sky-600 ring-sky-200 dark:text-sky-300'],
              ] as const
            ).map(([g, label, cls]) => (
              <button
                key={g}
                type="button"
                onClick={() => rate(g)}
                data-testid={`rate-${label.toLowerCase()}`}
                className={`rounded-2xl py-2.5 font-display font-extrabold ring-2 ring-inset transition active:scale-95 ${cls}`}
              >
                <span className="block">{label}</span>
                <span className="block text-xs font-semibold opacity-75">{intervals?.[g]}</span>
              </button>
            ))}
          </div>
        ))}
    </div>
  )
}
