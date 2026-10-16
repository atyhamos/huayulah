import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { content, getStory } from '../content'
import type { LessonSummary } from '../data/actions'
import { useSpeak } from '../components/AudioButton'
import { CheckBar } from '../components/exercises/CheckBar'
import { Hanzi } from '../components/Hanzi'
import { Icon, unitMeta } from '../components/icons'
import { OtterArt } from '../components/OtterArt'
import { Avatar, Button, ProgressBar } from '../components/ui'
import { OptionRow } from '../components/exercises/parts'
import { shuffle } from '../lib/random'
import { sfx } from '../lib/sfx'
import { useApp } from '../store/app'
import { LessonComplete } from './LessonComplete'

const PITCH = [1, 1.2, 0.85, 1.1]

/** One character per stock character, for their avatar. */
const NAME_ZH: Record<string, string> = { Auntie: '姨', Boss: '板', Uncle: '叔', Mum: '妈', Grandma: '嫲', Manager: '经', Wife: '妻', Husband: '夫', Colleague: '同' }

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
        <OtterArt mood="sheepish" size={96} className="mx-auto mb-2" />
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
        <div className="relative mb-6 w-full overflow-hidden rounded-3xl p-6 text-white" style={{ background: unit.color }}>
          <div className="peranakan absolute inset-x-0 bottom-0 h-2 opacity-70" />
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-widest">
            <Icon name={unitMeta(unit.id).icon} className="h-4 w-4" /> {unitMeta(unit.id).code} interchange · story
          </span>
          <h1 className="font-display text-3xl font-extrabold">{story.title}</h1>
          <p className="font-brush text-3xl text-white/85">{story.titleZh}</p>
          <div className="mt-4 flex justify-center -space-x-2">
            {speakerKeys.map((k, i) => (
              <span key={k} className="rounded-full ring-4 ring-white/30">
                <SpeakerAvatar name={story.speakers[k].name} seed={i} size={44} />
              </span>
            ))}
          </div>
        </div>
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
      <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-3 bg-page/95 px-4 py-2 backdrop-blur">
        <button type="button" aria-label="Quit story" onClick={() => nav('/', { replace: true })} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100">
          <Icon name="close" className="h-6 w-6" />
        </button>
        <ProgressBar value={progress} color="bg-amber-400" />
        <button
          type="button"
          onClick={() => setPinyin((p) => !p)}
          className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-2 ring-inset ${pinyin ? 'bg-sky-50 text-sky-700 ring-sky-400 dark:text-sky-300' : 'text-slate-400 ring-slate-200'}`}
        >
          拼音
        </button>
        <button
          type="button"
          onClick={() => setEnglish((e) => !e)}
          className={`rounded-full px-2.5 py-1 text-xs font-bold ring-2 ring-inset ${english ? 'bg-sky-50 text-sky-700 ring-sky-400 dark:text-sky-300' : 'text-slate-400 ring-slate-200'}`}
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
                <div className="flex w-12 shrink-0 flex-col items-center gap-0.5">
                  <SpeakerAvatar name={sp.name} seed={speakerKeys.indexOf(line.speaker)} size={40} />
                  <span className="max-w-full truncate text-[10px] font-bold text-slate-400">{sp.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => playLine(i)}
                  className={`max-w-[78%] rounded-3xl px-3.5 py-2 text-left ring-1 ${right ? 'rounded-br-md bg-sky-50 ring-sky-200' : 'rounded-bl-md bg-surface ring-slate-200'}`}
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
    <div className="my-2 flex animate-pop gap-2" data-testid="story-question">
      <OtterArt mood="think" size={52} className="shrink-0 self-end" />
      <div className="flex-1 rounded-3xl rounded-bl-md bg-amber-50 p-4 ring-1 ring-amber-200">
        <p className="mb-3 font-display font-extrabold">{q.prompt}</p>
        <div className="grid gap-2">
          {q.order.map((i) => (
            <OptionRow
              key={i}
              state={locked ? (i === q.answer ? 'right' : i === picked ? 'wrong' : 'idle') : i === picked ? 'picked' : 'idle'}
              disabled={locked}
              data-testid="option"
              data-correct={i === q.answer ? 'true' : undefined}
              onClick={() => onPick?.(i)}
            >
              {q.options[i]}
            </OptionRow>
          ))}
        </div>
      </div>
    </div>
  )
}

function SpeakerAvatar({ name, seed, size }: { name: string; seed: number; size: number }) {
  if (name === 'You') return <Avatar otter size={size} />
  return <Avatar label={NAME_ZH[name] ?? name[0]} seed={seed} size={size} />
}
