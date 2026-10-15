import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { content, getItem } from '../content'
import type { LessonSummary } from '../data/actions'
import { ExerciseView, type ExerciseResult } from '../components/exercises'
import { AudioButton } from '../components/AudioButton'
import { Hanzi } from '../components/Hanzi'
import { Button, Icon, ProgressBar } from '../components/ui'
import { generateLesson, itemsOf, retryOf, type Exercise } from '../lib/exercises'
import { weakestItems } from '../data/actions'
import { sfx } from '../lib/sfx'
import { useApp } from '../store/app'
import { LessonComplete } from './LessonComplete'

export const WEAK_LESSON = 'weak'

const PRAISE = ['好棒！', '太好了！', 'Steady!', '厉害！', 'Power lah!', '对了！', 'Shiok!']

interface Feedback extends ExerciseResult {
  ex: Exercise
}

export function LessonScreen() {
  const { lessonId = '' } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const s = useApp((st) => st.s)
  const completeLesson = useApp((st) => st.completeLesson)
  const completePractice = useApp((st) => st.completePractice)
  // "weak" is a virtual lesson built from the words you're most likely to have forgotten
  const isWeak = lessonId === WEAK_LESSON
  const [lesson] = useState(() =>
    isWeak ? { id: WEAK_LESSON, items: weakestItems(s, 6, new Date(), content) } : content.lessons.get(lessonId),
  )

  const [mode] = useState<'learn' | 'practice'>(() =>
    isWeak || params.get('mode') === 'practice' || s.lessons[lessonId] ? 'practice' : 'learn',
  )
  // Speaking works everywhere: browsers without recognition fall back to self-checking.
  const speaking = s.settings.speaking

  const initial = useMemo(
    () =>
      lesson
        ? generateLesson(
            lesson.items.map(getItem),
            { mode, speaking, pool: [...content.items.values()] },
          )
        : [],
    // generate once per lesson visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lessonId],
  )

  const [queue, setQueue] = useState<Exercise[]>(initial)
  const [idx, setIdx] = useState(0)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [summary, setSummary] = useState<LessonSummary | null>(null)
  const [skipSpeaking, setSkipSpeaking] = useState(false)
  const [confirmQuit, setConfirmQuit] = useState(false)
  const stats = useRef({ combo: 0, maxCombo: 0, answered: 0, correct: 0, mistakes: {} as Record<string, number>, retried: new Set<string>() })
  const started = useRef(Date.now())

  const ex = queue[idx]
  const graded = queue.filter((q) => q.kind !== 'intro').length
  const doneGraded = queue.slice(0, idx).filter((q) => q.kind !== 'intro').length + (feedback && feedback.ex.kind !== 'intro' ? 1 : 0)

  const finish = useCallback(() => {
    const st = stats.current
    const result = { mistakesByItem: st.mistakes, maxCombo: st.maxCombo, answered: st.answered, correct: st.correct }
    const r = isWeak ? completePractice(result) : completeLesson({ lessonId, mode, ...result })
    if (s.settings.sound) sfx.complete()
    setSummary(r)
  }, [completeLesson, completePractice, isWeak, lessonId, mode, s.settings.sound])

  const advance = useCallback(() => {
    setFeedback(null)
    let next = idx + 1
    // drop remaining speaking exercises after "can't speak now"
    while (skipSpeaking && queue[next]?.kind === 'speak') next++
    if (next >= queue.length) finish()
    else setIdx(next)
  }, [idx, queue, finish, skipSpeaking])

  const onSubmit = useCallback(
    (r: ExerciseResult) => {
      if (!ex) return
      if (ex.kind === 'intro') {
        advance()
        return
      }
      if (r.skipped) {
        setSkipSpeaking(true)
        setFeedback(null)
        let next = idx + 1
        while (queue[next]?.kind === 'speak') next++
        if (next >= queue.length) finish()
        else setIdx(next)
        return
      }
      const st = stats.current
      st.answered++
      if (r.correct) {
        st.correct++
        st.combo++
        st.maxCombo = Math.max(st.maxCombo, st.combo)
        if (s.settings.sound) sfx.correct()
      } else {
        st.combo = 0
        const wrong = r.wrongItemIds?.length ? r.wrongItemIds : itemsOf(ex)
        for (const id of wrong) st.mistakes[id] = (st.mistakes[id] ?? 0) + 1
        if (s.settings.sound) sfx.wrong()
        // try it again at the end (once per exercise; matching already self-corrects)
        if (ex.kind !== 'match' && ex.kind !== 'speak' && !st.retried.has(ex.id)) {
          const again = retryOf(ex)
          st.retried.add(again.id)
          setQueue((q) => [...q, again])
        }
      }
      setFeedback({ ...r, ex })
    },
    [ex, advance, idx, queue, finish, s.settings.sound],
  )

  useEffect(() => {
    if (!feedback) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        advance()
      }
    }
    // register after the Enter that submitted the answer has finished
    const t = setTimeout(() => window.addEventListener('keydown', h), 50)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', h)
    }
  }, [feedback, advance])

  if (!lesson || lesson.items.length < 3) {
    return (
      <div className="p-8 text-center">
        <p className="mb-4">{isWeak ? 'Learn a few more words first!' : 'Lesson not found.'}</p>
        <Link to="/" className="text-sky-600 underline">
          Back home
        </Link>
      </div>
    )
  }

  if (summary) {
    return (
      <LessonComplete
        summary={summary}
        seconds={Math.round((Date.now() - started.current) / 1000)}
        mode={mode}
        onDone={() => nav('/', { replace: true })}
      />
    )
  }

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col px-4 pb-48 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <button type="button" aria-label="Quit lesson" onClick={() => setConfirmQuit(true)} className="text-slate-400 hover:text-slate-600">
          {Icon.close()}
        </button>
        <ProgressBar value={graded ? doneGraded / graded : 0} />
        {stats.current.combo >= 3 && <span className="whitespace-nowrap text-sm font-bold text-amber-500">🔥 {stats.current.combo}</span>}
      </div>

      {ex && <ExerciseView key={ex.id} ex={ex} locked={!!feedback} onSubmit={onSubmit} />}

      {feedback && <FeedbackSheet fb={feedback} onContinue={advance} />}

      {confirmQuit && (
        <div className="fixed inset-0 z-20 grid place-items-end bg-black/40 sm:place-items-center" onClick={() => setConfirmQuit(false)}>
          <div className="safe-bottom w-full max-w-md animate-slide-up rounded-t-3xl bg-surface p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-2 text-xl font-bold">Quit this lesson?</p>
            <p className="mb-6 text-slate-500">You'll lose your progress in this lesson.</p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => setConfirmQuit(false)}>Keep learning</Button>
              <Button variant="ghost" className="text-rose-500" onClick={() => nav('/', { replace: true })}>
                End lesson
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FeedbackSheet({ fb, onContinue }: { fb: Feedback; onContinue: () => void }) {
  const { ex, correct } = fb
  const [praise] = useState(() => PRAISE[Math.floor(Math.random() * PRAISE.length)])
  const it = ex.kind === 'match' ? null : getItem(ex.itemId)
  const sentence = ex.kind === 'build' ? it?.example : null
  return (
    <div
      className={`safe-bottom fixed inset-x-0 bottom-0 z-10 animate-slide-up px-4 pt-4 ${correct ? 'bg-brand-100' : 'bg-rose-100'}`}
      data-testid="feedback"
      data-correct={correct}
    >
      <div className="mx-auto max-w-xl">
        <p className={`mb-2 text-2xl font-extrabold ${correct ? 'text-brand-700 dark:text-brand-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {correct ? praise : ex.kind === 'match' ? 'Keep practising!' : 'Correct answer:'}
        </p>
        {ex.kind === 'speak' && fb.heard !== undefined && (
          <p className="mb-2 text-sm text-slate-600">
            Heard: <span className="font-han text-base">{fb.heard || '—'}</span>
            {fb.score !== undefined && <> · {Math.round(fb.score * 100)}% match</>}
          </p>
        )}
        {it && ex.kind === 'sgpick' && it.note && <p className="mb-2 text-sm text-slate-700">💡 {it.note}</p>}
        {it && (!correct || ex.kind === 'build' || ex.kind === 'speak') && (
          <div className="mb-3 flex items-center gap-3">
            {sentence ? (
              <>
                <AudioButton text={sentence.zh.replace(/ /g, '')} size="sm" slow={false} />
                <div>
                  <Hanzi text={sentence.zh.replace(/ /g, '')} showPinyin className="text-xl leading-loose" />
                  <p className="text-slate-600">{sentence.en}</p>
                </div>
              </>
            ) : (
              <>
                <AudioButton text={ex.kind === 'speak' ? ex.text : it.hanzi} size="sm" slow={false} />
                <div>
                  <Hanzi
                    text={ex.kind === 'speak' ? ex.text : it.hanzi}
                    pinyin={ex.kind === 'speak' && ex.text !== it.hanzi ? undefined : it.pinyin}
                    showPinyin
                    className="text-2xl"
                  />
                  <p className="text-slate-600">{ex.kind === 'speak' ? ex.en : it.english}</p>
                </div>
              </>
            )}
          </div>
        )}
        <Button variant={correct ? 'primary' : 'danger'} className="mb-1 w-full" onClick={onContinue} data-testid="continue">
          Continue
        </Button>
      </div>
    </div>
  )
}
