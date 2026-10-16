import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getStory } from '../content'
import { loadPinyinEngine } from '../content/pinyinLoader'
import type { LessonSummary } from '../data/actions'
import { useSpeak } from '../components/AudioButton'
import { Hanzi } from '../components/Hanzi'
import { OtterArt } from '../components/OtterArt'
import { Icon } from '../components/icons'
import { Button, TrainTrack } from '../components/ui'
import { bestSpeechScore, diffChars, SPEECH_PASS, type CharMark } from '../lib/answer'
import { rubyFor } from '../lib/pinyin'
import { listen, recognitionSupported } from '../lib/speech'
import { sfx } from '../lib/sfx'
import { useApp } from '../store/app'
import { LessonComplete } from './LessonComplete'

const PITCH = [1, 1.2, 0.85, 1.1]

interface Attempt {
  heard: string
  score: number
  marks: CharMark[]
}

/** Shadowing: hear each line of a story, say it back, see which characters came through. */
export function ShadowScreen() {
  const { storyId = '' } = useParams()
  const story = getStory(storyId)
  const nav = useNavigate()
  const settings = useApp((st) => st.s.settings)
  const completePractice = useApp((st) => st.completePractice)
  const say = useSpeak()
  const [idx, setIdx] = useState(0)
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selfCheck, setSelfCheck] = useState(!recognitionSupported)
  const [summary, setSummary] = useState<LessonSummary | null>(null)
  const scores = useRef<number[]>([])
  const stopRef = useRef<() => void>(() => {})
  const startedAt = useRef(Date.now())

  const speakers = story ? Object.keys(story.speakers) : []
  const line = story?.lines[idx]
  const play = useCallback(
    (slow = false) => line && say(line.zh, slow, PITCH[speakers.indexOf(line.speaker)] ?? 1),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [line?.zh],
  )

  useEffect(() => {
    void loadPinyinEngine()
    return () => stopRef.current()
  }, [])
  useEffect(() => {
    const t = setTimeout(() => play(), 300)
    return () => clearTimeout(t)
  }, [play])

  if (!story || !line) {
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
        title="Shadowing complete!"
        onDone={() => nav('/', { replace: true })}
      />
    )
  }

  const record = () => {
    setError(null)
    setInterim('')
    setAttempt(null)
    setListening(true)
    const h = listen({
      onInterim: setInterim,
      onFinal: (alts) => {
        setListening(false)
        if (!alts.length) {
          setError("Didn't catch that — try again.")
          return
        }
        const { score, heard } = bestSpeechScore(alts, line.zh)
        setAttempt({ heard, score, marks: diffChars(heard, line.zh) })
        if (settings.sound) (score >= SPEECH_PASS ? sfx.correct : sfx.wrong)()
      },
      onError: (e) => {
        setListening(false)
        if (e === 'not-allowed' || e === 'service-not-allowed' || e === 'audio-capture' || e === 'network') {
          setError('The microphone isn’t available — listen, repeat out loud, and move on when you’re happy.')
          setSelfCheck(true)
        } else setError("Didn't catch that — try again.")
      },
    })
    stopRef.current = h.stop
  }

  const next = () => {
    scores.current[idx] = attempt?.score ?? scores.current[idx] ?? 0
    setAttempt(null)
    setError(null)
    if (idx + 1 < story.lines.length) {
      setIdx(idx + 1)
      return
    }
    const answered = story.lines.length
    const passed = scores.current.filter((x) => x >= SPEECH_PASS).length
    if (settings.sound) sfx.complete()
    setSummary(completePractice({ mistakesByItem: {}, maxCombo: 0, answered, correct: selfCheck ? answered : passed }))
  }

  const sp = story.speakers[line.speaker]
  const marks = attempt?.marks
  const ruby = rubyFor(line.zh)
  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col px-4 pb-40 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <button type="button" aria-label="Quit" onClick={() => nav(-1)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100">
          <Icon name="close" className="h-6 w-6" />
        </button>
        <TrainTrack value={idx / story.lines.length} />
      </div>
      <p className="mb-1 text-xs font-extrabold uppercase tracking-widest text-amber-600">Shadowing · {story.title}</p>
      <h1 className="mb-6 font-display text-2xl font-extrabold">Listen, then say it back</h1>

      <div className="mb-6 rounded-3xl bg-surface p-5 ring-1 ring-slate-200" data-testid="shadow-line" data-zh={line.zh}>
        <p className="mb-2 text-sm font-bold text-slate-400">{sp.name}</p>
        {marks ? (
          <p className="font-han text-3xl leading-loose" data-testid="shadow-marks">
            {marks.map((m, i) => (
              <ruby key={i} className={m.ok ? 'text-brand-600' : 'text-rose-500 underline decoration-wavy underline-offset-8'}>
                {m.ch}
                <rt>{ruby[i]?.py ?? ''}</rt>
              </ruby>
            ))}
          </p>
        ) : (
          <Hanzi text={line.zh} showPinyin={settings.pinyinMode !== 'never'} revealable className="text-3xl leading-loose" />
        )}
        <p className="mt-1 text-slate-500">{line.en}</p>
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" className="!px-4 !py-2 text-sm" onClick={() => play()}>
            <Icon name="speaker" className="h-5 w-5" /> Again
          </Button>
          <Button variant="secondary" className="!px-4 !py-2 text-sm" onClick={() => play(true)}>
            <Icon name="turtle" className="h-5 w-5" /> Slowly
          </Button>
        </div>
      </div>

      {attempt && (
        <p className={`mb-4 text-center font-display text-xl font-extrabold ${attempt.score >= SPEECH_PASS ? 'text-brand-600' : 'text-rose-500'}`} data-testid="shadow-score">
          {Math.round(attempt.score * 100)}% — {attempt.score >= SPEECH_PASS ? 'sounds right!' : 'the red ones need work'}
        </p>
      )}
      {error && <p className="mb-4 text-center text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      <div className="flex flex-col items-center gap-3">
        {!selfCheck && (
          <button
            type="button"
            data-testid="mic"
            onClick={() => (listening ? stopRef.current() : record())}
            className={`relative grid h-20 w-20 place-items-center rounded-full text-white shadow-[0_12px_24px_-12px_var(--color-sky-700)] transition active:scale-95 ${listening ? 'bg-rose-500' : 'bg-sky-500'}`}
            aria-label={listening ? 'Stop' : 'Say it'}
          >
            {listening && <span className="absolute inset-0 animate-ping-slow rounded-full bg-rose-400/50" />}
            <Icon name="mic" className="relative h-9 w-9" />
          </button>
        )}
        <p className="h-6 text-slate-500">{listening ? interim || 'Listening…' : selfCheck ? 'Say it out loud along with the audio.' : attempt ? '' : 'Tap and say the line'}</p>
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 bg-gradient-to-t from-page via-page to-transparent px-4 pt-6">
        <Button className="mx-auto flex w-full max-w-xl" onClick={next} disabled={!selfCheck && !attempt} data-testid="shadow-next">
          {idx + 1 < story.lines.length ? 'Next line' : 'Finish'}
        </Button>
      </div>
    </div>
  )
}
