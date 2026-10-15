import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { content, getItem } from '../content'
import { dueCardIds } from '../data/actions'
import { parseCardId } from '../data/types'
import { AudioButton, useSpeak } from '../components/AudioButton'
import { Hanzi } from '../components/Hanzi'
import { Button, Icon, ProgressBar, SgBadge } from '../components/ui'
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
    <div className="flex flex-col items-center pt-6 text-center">
      <div className="mb-4 text-6xl">🃏</div>
      <h1 className="mb-2 text-2xl font-extrabold">Flashcard review</h1>
      {learned === 0 ? (
        <>
          <p className="mb-6 text-slate-500">Words you learn in lessons show up here, timed so you review them just before you'd forget.</p>
          <Link to="/" className="font-bold text-sky-600">
            Start your first lesson →
          </Link>
        </>
      ) : total > 0 ? (
        <>
          <p className="mb-6 text-slate-500">
            {due.review.length > 0 && <>{due.review.length} due for review</>}
            {due.review.length > 0 && due.fresh.length > 0 && ' · '}
            {due.fresh.length > 0 && <>{due.fresh.length} new speaking cards</>}
          </p>
          <Button className="w-full max-w-xs" onClick={start} data-testid="start-review">
            Start ({Math.min(total, SESSION_SIZE)} cards)
          </Button>
        </>
      ) : (
        <>
          <p className="mb-2 text-lg font-bold text-brand-600">All caught up! 🎉</p>
          <p className="text-slate-500">{nextDue ? `Next card due in ${formatInterval(nextDue - Date.now())}.` : ''}</p>
        </>
      )}
      {learned >= 4 && (
        <Link
          to="/lesson/weak"
          className="mt-8 flex w-full items-center gap-3 rounded-2xl border-2 border-b-4 border-slate-200 p-4 text-left"
          data-testid="practice-weak"
        >
          <span className="text-3xl">💪</span>
          <span className="flex-1">
            <span className="block font-bold">Practise weak words</span>
            <span className="text-sm text-slate-500">A quick lesson with the words you're most likely to forget</span>
          </span>
          <span className="text-slate-400">→</span>
        </Link>
      )}
      <div className="mt-6 w-full rounded-2xl bg-slate-50 p-4 text-left text-sm text-slate-600">
        <p className="mb-1 font-bold">Two kinds of cards</p>
        <p>
          <b>📖 Read</b> — see the characters, recall the sound and meaning.
          <br />
          <b>🗣️ Say</b> — see English, say it out loud in Mandarin, then check.
        </p>
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
        <div className="mb-4 text-6xl">✅</div>
        <h1 className="mb-2 text-2xl font-extrabold">Review done!</h1>
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
        <button type="button" aria-label="End review" onClick={onExit} className="text-slate-400">
          {Icon.close()}
        </button>
        <ProgressBar value={i / queue.length} color="bg-sky-500" />
        <span className="text-sm font-bold text-slate-400">
          {i + 1}/{queue.length}
        </span>
      </div>

      <div
        className="mb-6 flex min-h-80 cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-b-4 border-slate-200 p-6 text-center"
        onClick={() => !revealed && reveal()}
        data-testid="flashcard"
      >
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {dir === 'read' ? '📖 What does this say?' : '🗣️ Say it in Mandarin'}
          {entry.repeat && ' · again'}
        </span>
        {dir === 'read' ? (
          <Hanzi text={it.hanzi} pinyin={it.pinyin} showPinyin={revealed} className="text-6xl" />
        ) : (
          <p className="text-3xl font-bold">{it.english}</p>
        )}
        {revealed ? (
          <div className="flex animate-pop flex-col items-center gap-3">
            {dir === 'read' ? (
              <p className="text-2xl font-bold">{it.english}</p>
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
                [Rating.Again, 'Again', 'bg-rose-500 border-rose-700'],
                [Rating.Hard, 'Hard', 'bg-amber-500 border-amber-700'],
                [Rating.Good, 'Good', 'bg-brand-500 border-brand-700'],
                [Rating.Easy, 'Easy', 'bg-sky-500 border-sky-700'],
              ] as const
            ).map(([g, label, cls]) => (
              <button
                key={g}
                type="button"
                onClick={() => rate(g)}
                data-testid={`rate-${label.toLowerCase()}`}
                className={`rounded-2xl border-b-4 py-2 font-bold text-white transition active:translate-y-0.5 ${cls}`}
              >
                <span className="block">{label}</span>
                <span className="block text-xs opacity-80">{intervals?.[g]}</span>
              </button>
            ))}
          </div>
        ))}
    </div>
  )
}
