import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { content, getStory } from '../content'
import type { LessonSummary } from '../data/actions'
import { useSpeak } from '../components/AudioButton'
import { CheckBar } from '../components/exercises/CheckBar'
import { Hanzi } from '../components/Hanzi'
import { Button, Icon, ProgressBar } from '../components/ui'
import { shuffle } from '../lib/random'
import { sfx } from '../lib/sfx'
import { useApp } from '../store/app'
import { LessonComplete } from './LessonComplete'

const PITCH = [1, 1.2, 0.85, 1.1]

export function StoryScreen() {
  const { storyId = '' } = useParams()
  const story = getStory(storyId)
  const nav = useNavigate()
  const settings = useApp((st) => st.s.settings)
  const completeStory = useApp((st) => st.completeStory)
  const say = useSpeak()

  const [started, setStarted] = useState(false)
  const [shown, setShown] = useState(0) // lines visible
  const [answers, setAnswers] = useState<Record<number, number>>({}) // question index → picked option
  const [picked, setPicked] = useState<number | null>(null)
  const [pinyin, setPinyin] = useState(settings.pinyinMode !== 'never')
  const [english, setEnglish] = useState(false)
  const [summary, setSummary] = useState<LessonSummary | null>(null)
  const startedAt = useRef(Date.now())
  const bottomRef = useRef<HTMLDivElement>(null)

  const speakerKeys = useMemo(() => (story ? Object.keys(story.speakers) : []), [story])
  // shuffle each question's options once
  const questions = useMemo(
    () =>
      story?.questions.map((q) => {
        const order = shuffle(q.options.map((_, i) => i))
        return { ...q, order }
      }) ?? [],
    [story],
  )

  const playLine = useCallback(
    (i: number) => {
      if (!story) return
      const line = story.lines[i]
      say(line.zh, false, PITCH[speakerKeys.indexOf(line.speaker)] ?? 1)
    },
    [story, say, speakerKeys],
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [shown, answers, picked])

  if (!story) {
    return (
      <div className="p-8 text-center">
        <p className="mb-4">Story not found.</p>
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
        seconds={Math.round((Date.now() - startedAt.current) / 1000)}
        mode="practice"
        title="Story complete!"
        onDone={() => nav('/', { replace: true })}
      />
    )
  }

  const unit = content.units.find((u) => u.id === story.unitId)!
  // the question due now: placed after the last visible line and not yet answered
  const qIndex = questions.findIndex((q, i) => q.after === shown - 1 && answers[i] === undefined)
  const pending = qIndex >= 0 ? questions[qIndex] : null
  const finished = shown >= story.lines.length && !pending
  const progress = (shown + Object.keys(answers).length) / (story.lines.length + questions.length)

  const next = () => {
    if (shown < story.lines.length) {
      playLine(shown)
      setShown(shown + 1)
    } else {
      const correct = questions.filter((q, i) => answers[i] === q.answer).length
      if (settings.sound) sfx.complete()
      setSummary(completeStory(story.id, { correct, total: questions.length }))
    }
  }

  const check = () => {
    if (picked === null || !pending) return
    const ok = picked === pending.answer
    if (settings.sound) (ok ? sfx.correct : sfx.wrong)()
    setAnswers({ ...answers, [qIndex]: picked })
    setPicked(null)
  }

  if (!started) {
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 text-7xl">{story.emoji}</div>
        <p className="mb-1 text-sm font-bold uppercase tracking-wider" style={{ color: unit.color }}>
          Story · {unit.title}
        </p>
        <h1 className="text-3xl font-extrabold">{story.title}</h1>
        <p className="mb-6 font-han text-2xl text-slate-500">{story.titleZh}</p>
        <p className="mb-8 text-slate-500">Listen to the conversation and answer a few questions along the way.</p>
        <Button
          className="w-full"
          data-testid="start-story"
          onClick={() => {
            setStarted(true)
            playLine(0)
            setShown(1)
          }}
        >
          Start story
        </Button>
        <button type="button" className="mt-4 text-sm font-bold text-slate-400" onClick={() => nav(-1)}>
          Not now
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col px-4 pb-48 pt-4">
      <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-3 bg-surface px-4 py-2">
        <button type="button" aria-label="Quit story" onClick={() => nav('/', { replace: true })} className="text-slate-400">
          {Icon.close()}
        </button>
        <ProgressBar value={progress} color="bg-amber-400" />
        <button
          type="button"
          onClick={() => setPinyin((p) => !p)}
          className={`whitespace-nowrap rounded-lg border-2 px-2 py-0.5 text-xs font-bold ${pinyin ? 'border-sky-400 bg-sky-50 text-sky-700 dark:text-sky-300' : 'border-slate-200 text-slate-400'}`}
        >
          拼音
        </button>
        <button
          type="button"
          onClick={() => setEnglish((e) => !e)}
          className={`rounded-lg border-2 px-2 py-0.5 text-xs font-bold ${english ? 'border-sky-400 bg-sky-50 text-sky-700 dark:text-sky-300' : 'border-slate-200 text-slate-400'}`}
        >
          EN
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {story.lines.slice(0, shown).map((line, i) => {
          const sp = story.speakers[line.speaker]
          const right = speakerKeys.indexOf(line.speaker) % 2 === 1
          const q = questions.findIndex((qq) => qq.after === i)
          return (
            <div key={i} className="flex flex-col gap-3">
              <div className={`flex animate-pop items-end gap-2 ${right ? 'flex-row-reverse' : ''}`} data-testid="story-line">
                <div className="flex flex-col items-center">
                  <span className="text-3xl">{sp.emoji}</span>
                  <span className="text-[10px] font-bold text-slate-400">{sp.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => playLine(i)}
                  className={`max-w-[80%] rounded-2xl border-2 px-3 py-2 text-left ${right ? 'rounded-br-sm border-sky-200 bg-sky-50' : 'rounded-bl-sm border-slate-200 bg-surface'}`}
                >
                  <Hanzi text={line.zh} showPinyin={pinyin} revealable className="text-xl leading-loose" />
                  {english && <span className="block text-sm text-slate-500">{line.en}</span>}
                </button>
              </div>
              {q >= 0 && answers[q] !== undefined && <QuestionCard q={questions[q]} picked={answers[q]} locked />}
            </div>
          )
        })}
        {pending && <QuestionCard q={pending} picked={picked} onPick={setPicked} />}
        <div ref={bottomRef} />
      </div>

      {pending ? (
        <CheckBar disabled={picked === null} onCheck={check} />
      ) : (
        <CheckBar disabled={false} onCheck={next} label={finished ? 'Finish' : 'Continue'} />
      )}
    </div>
  )
}

interface Q {
  prompt: string
  options: string[]
  answer: number
  order: number[]
}

function QuestionCard({ q, picked, onPick, locked = false }: { q: Q; picked: number | null; onPick?: (i: number) => void; locked?: boolean }) {
  return (
    <div className="my-2 animate-pop rounded-2xl border-2 border-amber-300 bg-amber-50 p-4" data-testid="story-question">
      <p className="mb-3 font-bold">❓ {q.prompt}</p>
      <div className="grid gap-2">
        {q.order.map((i) => {
          const state = locked ? (i === q.answer ? 'right' : i === picked ? 'wrong' : 'idle') : i === picked ? 'picked' : 'idle'
          const cls = {
            idle: 'border-slate-200 bg-surface',
            picked: 'border-sky-400 bg-sky-50',
            right: 'border-brand-500 bg-brand-50',
            wrong: 'border-rose-400 bg-rose-50',
          }[state]
          return (
            <button
              key={i}
              type="button"
              disabled={locked}
              data-testid="option"
              data-correct={i === q.answer ? 'true' : undefined}
              onClick={() => onPick?.(i)}
              className={`rounded-xl border-2 border-b-4 px-3 py-2 text-left font-semibold ${cls}`}
            >
              {q.options[i]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
