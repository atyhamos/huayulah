import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { content, getItem } from '../content'
import type { LessonSummary } from '../data/actions'
import { cardId } from '../data/types'
import { ExerciseView, type ExerciseResult } from '../components/exercises'
import { partMnemonic } from '../content/chars'
import { AudioButton } from '../components/AudioButton'
import { Hanzi } from '../components/Hanzi'
import { Icon } from '../components/icons'
import { OtterSvg } from '../components/OtterSvg'
import { Button, TrainTrack } from '../components/ui'
import { generateLesson, itemsOf, retryOf, type Exercise } from '../lib/exercises'
import { myWordsLessonItems, weakestItems } from '../data/actions'
import { sfx } from '../lib/sfx'
import { useApp } from '../store/app'
import { LessonComplete } from './LessonComplete'

export const WEAK_LESSON = 'weak'
export const MINE_LESSON = 'mine'

const PRAISE = ['好棒！', '太好了！', 'Steady lah!', '厉害！', 'Power!', '对了！', 'Shiok!']
const OOPS = ['Aiyo, almost!', '差一点！', 'Not quite lah', 'Close!']

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
  const completeMyWords = useApp((st) => st.completeMyWords)
  // virtual lessons: "weak" (words you're most likely to have forgotten) and "mine" (My words)
  const isWeak = lessonId === WEAK_LESSON
  const isMine = lessonId === MINE_LESSON
  const [lesson] = useState(() =>
    isWeak
      ? { id: WEAK_LESSON, items: weakestItems(s, 6, new Date(), content) }
      : isMine
        ? { id: MINE_LESSON, items: myWordsLessonItems(s, 6, new Date()) }
        : content.lessons.get(lessonId),
  )

  const [mode] = useState<'learn' | 'practice'>(() => {
    if (isMine) return lesson?.items.some((id) => !s.cards[cardId(id, 'read')]) ? 'learn' : 'practice'
    return isWeak || params.get('mode') === 'practice' || s.lessons[lessonId] ? 'practice' : 'learn'
  })
  // Speaking works everywhere: browsers without recognition fall back to self-checking.
  const speaking = s.settings.speaking

  const initial = useMemo(
    () =>
      lesson
        ? generateLesson(
            lesson.items.map(getItem),
            { mode, speaking, writing: s.settings.writing, pool: [...content.items.values()] },
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
    const r = isMine
      ? completeMyWords({ ...result, itemIds: lesson!.items })
      : isWeak
        ? completePractice(result)
        : completeLesson({ lessonId, mode, ...result })
    if (s.settings.sound) sfx.complete()
    setSummary(r)
  }, [completeLesson, completePractice, completeMyWords, isWeak, isMine, lesson, lessonId, mode, s.settings.sound])

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
        // "can't speak/write now": drop the rest of that kind of exercise for this lesson
        if (ex.kind === 'speak') setSkipSpeaking(true)
        setFeedback(null)
        let next = idx + 1
        while (queue[next]?.kind === ex.kind) next++
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
        if (ex.kind !== 'match' && ex.kind !== 'speak' && ex.kind !== 'write' && !st.retried.has(ex.id)) {
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
        <p className="mb-4">{isWeak ? 'Learn a few more words first!' : isMine ? 'Save at least 3 words in the Reader first!' : 'Lesson not found.'}</p>
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
        <button
          type="button"
          aria-label="Quit lesson"
          onClick={() => setConfirmQuit(true)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-ink"
        >
          <Icon name="close" className="h-6 w-6" />
        </button>
        <TrainTrack value={graded ? doneGraded / graded : 0} />
        {stats.current.combo >= 3 && (
          <span className="flex items-center gap-0.5 whitespace-nowrap font-display font-extrabold text-orange-500" title="Combo">
            <Icon name="lantern" className="h-5 w-5 animate-glow" />
            {stats.current.combo}
          </span>
        )}
      </div>

      {ex && (
        <div data-kind={ex.kind}>
          <ExerciseView key={ex.id} ex={ex} locked={!!feedback} onSubmit={onSubmit} />
        </div>
      )}

      {feedback && <FeedbackSheet fb={feedback} onContinue={advance} />}

      {confirmQuit && (
        <div className="fixed inset-0 z-20 grid place-items-end bg-black/40 sm:place-items-center" onClick={() => setConfirmQuit(false)}>
          <div className="safe-bottom w-full max-w-md animate-slide-up rounded-t-[2rem] bg-surface p-6 text-center sm:rounded-[2rem]" onClick={(e) => e.stopPropagation()}>
            <OtterSvg mood="sad" size={88} className="mx-auto" />
            <p className="mb-1 mt-2 font-display text-xl font-extrabold">Alighting already?</p>
            <p className="mb-6 text-slate-500">You'll lose your progress on this ride.</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setConfirmQuit(false)}>Stay on the train</Button>
              <Button variant="ghost" className="text-rose-500" onClick={() => nav('/', { replace: true })}>
                Alight here
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
  const [praise] = useState(() => (correct ? PRAISE : OOPS)[Math.floor(Math.random() * (correct ? PRAISE : OOPS).length)])
  const it = ex.kind === 'match' ? null : getItem(ex.itemId)
  const sentence = ex.kind === 'build' || ex.kind === 'hear' ? it?.example : null
  const showAnswer = it && ex.kind !== 'parts' && (!correct || ex.kind === 'build' || ex.kind === 'speak' || ex.kind === 'hear')
  return (
    <div
      className="safe-bottom fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-page via-page to-transparent px-4 pt-6"
      data-testid="feedback"
      data-correct={correct}
    >
      <div className="mx-auto max-w-xl animate-slide-up">
        <div className="flex items-end gap-1">
          <OtterSvg mood={correct ? 'happy' : 'sad'} size={84} className="-mb-1 shrink-0" />
          <div
            className={`relative mb-4 min-w-0 flex-1 rounded-3xl p-4 shadow-[0_16px_32px_-20px_rgb(20_40_30/0.5)] ring-1 ${
              correct ? 'bg-brand-50 ring-brand-200' : 'bg-rose-50 ring-rose-200'
            }`}
          >
            <span
              className={`absolute -left-1.5 bottom-6 h-4 w-4 rotate-45 ring-1 ${correct ? 'bg-brand-50 ring-brand-200' : 'bg-rose-50 ring-rose-200'}`}
              style={{ clipPath: 'polygon(0 0, 0 100%, 100% 100%)' }}
            />
            <p className={`font-display text-xl font-extrabold ${correct ? 'text-brand-700 dark:text-brand-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {correct ? praise : ex.kind === 'match' ? 'Keep practising!' : praise}
            </p>
            {ex.kind === 'speak' && fb.heard !== undefined && (
              <p className="mt-1 text-sm text-slate-600">
                Heard: <span className="font-han text-base">{fb.heard || '—'}</span>
                {fb.score !== undefined && <> · {Math.round(fb.score * 100)}% match</>}
              </p>
            )}
            {ex.kind === 'parts' && (
              <p className="mt-1 text-sm text-slate-700">
                <span className="font-han text-base">{ex.part}</span> means <b>{ex.answer}</b>
                {partMnemonic(ex.part) && <> — {partMnemonic(ex.part)}</>}
              </p>
            )}
            {it && ex.kind === 'sgpick' && it.note && (
              <p className="mt-1 flex gap-1.5 text-sm text-slate-700">
                <Icon name="bulb" className="h-5 w-5 shrink-0 text-amber-500" /> {it.note}
              </p>
            )}
            {showAnswer && (
              <div className="mt-2 flex items-center gap-3">
                {!correct && !sentence && <span className="sr-only">Correct answer:</span>}
                {sentence ? (
                  <>
                    <AudioButton text={sentence.zh.replace(/ /g, '')} size="sm" slow={false} />
                    <div className="min-w-0">
                      <Hanzi text={sentence.zh.replace(/ /g, '')} showPinyin className="text-xl leading-loose" />
                      <p className="text-sm text-slate-600">{sentence.en}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <AudioButton text={ex.kind === 'speak' ? ex.text : it.hanzi} size="sm" slow={false} />
                    <div className="min-w-0">
                      <Hanzi
                        text={ex.kind === 'speak' ? ex.text : it.hanzi}
                        pinyin={ex.kind === 'speak' && ex.text !== it.hanzi ? undefined : it.pinyin}
                        showPinyin
                        className="text-2xl"
                      />
                      <p className="text-sm text-slate-600">{ex.kind === 'speak' ? ex.en : it.english}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <Button variant={correct ? 'primary' : 'danger'} className="mb-1 w-full" onClick={onContinue} data-testid="continue">
          Continue
        </Button>
      </div>
    </div>
  )
}
