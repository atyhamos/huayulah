import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getTopic, grammarSections } from '../content/grammar'
import { EXPRESS_PASS, type LessonSummary } from '../data/actions'
import { AudioButton, useSpeak } from '../components/AudioButton'
import { CheckBar } from '../components/exercises/CheckBar'
import { OptionRow, Prompt } from '../components/exercises/parts'
import { RuleCard } from '../components/GrammarRule'
import { Icon } from '../components/icons'
import { OtterArt } from '../components/OtterArt'
import { Button, Tile, TrainTrack, type TileState } from '../components/ui'
import { sameTokens } from '../lib/answer'
import { generateGrammarLesson, generateGrammarTest, retryStep, solvedSentence, unspaced, type GrammarStep } from '../lib/grammar'
import { rubyFor } from '../lib/pinyin'
import { Hanzi } from '../components/Hanzi'
import { sfx } from '../lib/sfx'
import { useApp } from '../store/app'
import { LessonComplete } from './LessonComplete'

const PRAISE = ['Bagus!', 'Syabas!', 'Betul!', 'Steady lah!', 'Pandai!']
const OOPS = ['Alamak, almost!', 'Not quite lah', 'Hampir!']

type Drill = Exclude<GrammarStep, { kind: 'rule' }>
interface Feedback {
  step: Drill
  correct: boolean
}

/** Plays a grammar topic (`/grammar/g06/play`) or a section test (`/grammar/test/2`). */
export function GrammarLessonScreen() {
  const { topicId = '', section: sectionParam } = useParams()
  const nav = useNavigate()
  const sound = useApp((st) => st.s.settings.sound)
  const completeGrammar = useApp((st) => st.completeGrammar)
  const completeGrammarTest = useApp((st) => st.completeGrammarTest)
  const section = sectionParam ? Number(sectionParam) : null
  const isTest = section !== null
  const topic = isTest ? undefined : getTopic(topicId)
  const valid = isTest ? !!grammarSections[section - 1] : !!topic
  const back = topic ? `/grammar/${topic.id}` : '/grammar'

  const initial = useMemo(
    () => (!valid ? [] : isTest ? generateGrammarTest(section) : generateGrammarLesson(topic!)),
    // generate once per visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topicId, sectionParam],
  )
  const [queue, setQueue] = useState<GrammarStep[]>(initial)
  const [idx, setIdx] = useState(0)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [summary, setSummary] = useState<(LessonSummary & { passed?: boolean }) | null>(null)
  const stats = useRef({ answered: 0, correct: 0, combo: 0, maxCombo: 0, retried: new Set<string>() })
  const started = useRef(Date.now())

  const step = queue[idx]
  const graded = queue.filter((q) => q.kind !== 'rule').length
  const doneGraded = queue.slice(0, idx).filter((q) => q.kind !== 'rule').length + (feedback ? 1 : 0)

  const finish = useCallback(() => {
    const st = stats.current
    const r = isTest
      ? completeGrammarTest(section, { correct: st.correct, total: st.answered })
      : completeGrammar(topicId, { correct: st.correct, total: st.answered, maxCombo: st.maxCombo })
    if (sound) sfx.complete()
    setSummary(r)
  }, [isTest, section, topicId, completeGrammar, completeGrammarTest, sound])

  const advance = useCallback(() => {
    setFeedback(null)
    if (idx + 1 >= queue.length) finish()
    else setIdx(idx + 1)
  }, [idx, queue.length, finish])

  const answer = useCallback(
    (correct: boolean) => {
      if (!step || step.kind === 'rule') return
      const st = stats.current
      st.answered++
      if (correct) {
        st.correct++
        st.combo++
        st.maxCombo = Math.max(st.maxCombo, st.combo)
        if (sound) sfx.correct()
      } else {
        st.combo = 0
        if (sound) sfx.wrong()
        // try it again at the end, once
        if (!isTest && !st.retried.has(step.id)) {
          const again = retryStep(step)
          st.retried.add(again.id)
          setQueue((q) => [...q, again])
        }
      }
      setFeedback({ step, correct })
    },
    [step, sound, isTest],
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

  if (!valid) {
    return (
      <div className="p-8 text-center">
        <OtterArt mood="sheepish" size={96} className="mx-auto mb-2" />
        <p className="mb-4">Topic not found.</p>
        <Link to="/grammar" className="text-sky-600 underline">
          Back to grammar
        </Link>
      </div>
    )
  }

  if (summary) {
    const passed = summary.passed
    return (
      <LessonComplete
        summary={summary}
        seconds={Math.round((Date.now() - started.current) / 1000)}
        mode="learn"
        title={isTest ? (passed ? 'Section cleared!' : 'Not this time') : 'Topic done!'}
        mood={passed === false ? 'reassuring' : passed ? 'cheer' : undefined}
        note={
          isTest
            ? passed
              ? `Every topic in ${grammarSections[section - 1].title} is marked done. Their rules stay in the Grammar tab.`
              : `You need ${Math.round(EXPRESS_PASS * 100)}% to skip a section. Go through it topic by topic instead.`
            : undefined
        }
        onDone={() => nav(isTest ? '/grammar' : back, { replace: true })}
      />
    )
  }

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col px-4 pb-48 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          aria-label="Quit"
          onClick={() => nav(back, { replace: true })}
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

      {step && (
        <div key={step.id} data-kind={step.kind} className="animate-pop">
          {step.kind === 'rule' ? (
            <>
              <div className="mb-4 flex items-end gap-2">
                <OtterArt mood="think" size={64} className="shrink-0" />
                <p className="mb-2 font-display text-lg font-extrabold leading-tight">{topic!.title}</p>
              </div>
              <RuleCard topic={topic!} index={step.rule} />
              <CheckBar disabled={false} onCheck={advance} label="Continue" />
            </>
          ) : step.kind === 'gap' ? (
            <GapDrill step={step} locked={!!feedback} onAnswer={answer} />
          ) : step.kind === 'order' ? (
            <OrderDrill step={step} locked={!!feedback} onAnswer={answer} />
          ) : (
            <PickDrill step={step} locked={!!feedback} onAnswer={answer} />
          )}
        </div>
      )}

      {feedback && <GrammarFeedback fb={feedback} onContinue={advance} />}
    </div>
  )
}

interface DrillProps<K extends Drill['kind']> {
  step: Extract<Drill, { kind: K }>
  locked: boolean
  onAnswer: (correct: boolean) => void
}

function English({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-100 text-sky-600">
        <Icon name="chat" className="h-6 w-6" />
      </span>
      <p className="relative rounded-2xl rounded-tl-sm bg-surface px-4 py-3 text-lg ring-1 ring-slate-200">{children}</p>
    </div>
  )
}

function tileState(option: string, picked: string | null, answer: string, locked: boolean): TileState {
  if (locked) return option === answer ? 'right' : option === picked ? 'wrong' : 'idle'
  return option === picked ? 'picked' : 'idle'
}

/** Pinyin hints: on when the learner always wants pinyin, otherwise a toggle (as in the sentence builder). */
function usePinyinHint() {
  const always = useApp((s) => s.s.settings.pinyinMode === 'always')
  const [hint, setHint] = useState(always)
  const toggle = always ? null : (
    <div className="mt-6 text-center">
      <button type="button" onClick={() => setHint((h) => !h)} className="text-sm font-semibold text-sky-600">
        {hint ? 'Hide pinyin' : 'Show pinyin hints'}
      </button>
    </div>
  )
  return { hint, toggle }
}

const pinyinOf = (word: string) =>
  rubyFor(word)
    .map((r) => r.py)
    .filter(Boolean)
    .join(' ')

function GapDrill({ step, locked, onAnswer }: DrillProps<'gap'>) {
  const [picked, setPicked] = useState<string | null>(null)
  const { hint, toggle } = usePinyinHint()
  // the solved sentence gives every character its reading; the gap's own characters stay hidden
  const solved = rubyFor(unspaced(step.drill.zh.replace('___', step.drill.answer)))
  const start = [...unspaced(step.drill.zh.split('___')[0])].length
  const end = start + [...step.drill.answer].length
  const ruby = (cs: typeof solved) =>
    cs.map((c, k) =>
      c.py ? (
        <ruby key={k}>
          {c.ch}
          <rt className={hint ? '' : 'invisible'}>{c.py}</rt>
        </ruby>
      ) : (
        <span key={k}>{c.ch}</span>
      ),
    )
  const wrong = locked && picked !== step.drill.answer
  return (
    <div>
      <Prompt>Fill the gap</Prompt>
      <English>{step.drill.en}</English>
      <p className="font-han mb-8 text-center text-3xl leading-loose" lang="zh-Hans" data-testid="gap-sentence">
        {ruby(solved.slice(0, start))}
        <span
          className={`mx-1 inline-block min-w-12 rounded-lg border-b-4 px-1.5 align-baseline ${
            !picked ? 'border-slate-300 text-transparent' : wrong ? 'border-rose-500 bg-rose-50 text-rose-600 line-through' : 'border-brand-500 bg-brand-50 text-brand-700'
          }`}
        >
          {picked ?? '？'}
        </span>
        {ruby(solved.slice(end))}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {step.options.map((o) => (
          <Tile
            key={o}
            state={tileState(o, picked, step.drill.answer, locked)}
            disabled={locked}
            data-testid="option"
            data-correct={o === step.drill.answer ? 'true' : undefined}
            onClick={() => setPicked(o)}
            className="font-han flex flex-col items-center px-5 py-2 text-3xl"
          >
            {hint && <span className="font-sans text-xs text-[#6f7d75]">{pinyinOf(o)}</span>}
            {o}
          </Tile>
        ))}
      </div>
      {!locked && toggle}
      {!locked && <CheckBar disabled={!picked} onCheck={() => picked && onAnswer(picked === step.drill.answer)} />}
    </div>
  )
}

function OrderDrill({ step, locked, onAnswer }: DrillProps<'order'>) {
  const [picked, setPicked] = useState<number[]>([])
  const { hint, toggle } = usePinyinHint()
  const say = useSpeak()
  // position of each tile in the answer; used by end-to-end tests
  const pos = useMemo(() => {
    const used = new Set<number>()
    return step.tiles.map((t) => {
      const i = step.answer.findIndex((a, k) => a === t && !used.has(k))
      if (i >= 0) used.add(i)
      return i
    })
  }, [step])

  const tile = (i: number, inAnswer: boolean) => (
    <button
      key={i}
      type="button"
      disabled={locked}
      data-testid={inAnswer ? 'answer-tile' : 'tile'}
      data-pos={pos[i]}
      onClick={() => {
        if (inAnswer) setPicked((p) => p.filter((x) => x !== i))
        else {
          setPicked((p) => [...p, i])
          say(step.tiles[i])
        }
      }}
      className="tile font-han flex flex-col items-center px-3 py-1.5 text-2xl"
    >
      {hint && <span className="font-sans text-xs text-[#6f7d75]">{pinyinOf(step.tiles[i])}</span>}
      {step.tiles[i]}
    </button>
  )

  return (
    <div>
      <Prompt>Put it in order</Prompt>
      <English>{step.drill.en}</English>
      <div className="mb-6 flex min-h-24 flex-wrap content-start gap-x-2 gap-y-3 rounded-3xl bg-brand-700 p-3 pb-4 shadow-[inset_0_2px_10px_rgb(0_0_0/0.25)]" data-testid="answer-area">
        {picked.length === 0 && <span className="m-auto text-sm font-semibold text-white/60">Tap tiles to place them here</span>}
        {picked.map((i) => tile(i, true))}
      </div>
      <div className="flex flex-wrap justify-center gap-x-2 gap-y-3">
        {step.tiles.map((t, i) =>
          picked.includes(i) ? (
            <span key={i} className="font-han rounded-xl bg-slate-200 px-3 py-1.5 text-2xl text-transparent">
              {t}
            </span>
          ) : (
            tile(i, false)
          ),
        )}
      </div>
      {!locked && toggle}
      {!locked && (
        <CheckBar
          disabled={picked.length < step.tiles.length}
          onCheck={() => onAnswer(sameTokens(picked.map((i) => step.tiles[i]), step.answer))}
        />
      )}
    </div>
  )
}

function PickDrill({ step, locked, onAnswer }: DrillProps<'pick'>) {
  const [picked, setPicked] = useState<number | null>(null)
  const { hint, toggle } = usePinyinHint()
  const right = step.drill.answer
  return (
    <div>
      <Prompt>Which one says it?</Prompt>
      <English>{step.drill.en}</English>
      <div className="flex flex-col gap-2.5">
        {step.order.map((i, k) => (
          <OptionRow
            key={i}
            letter={'ABCD'[k]}
            state={locked ? (i === right ? 'right' : i === picked ? 'wrong' : 'idle') : i === picked ? 'picked' : 'idle'}
            disabled={locked}
            data-testid="option"
            data-correct={i === right ? 'true' : undefined}
            onClick={() => setPicked(i)}
          >
            <Hanzi text={unspaced(step.drill.options[i])} showPinyin={hint || locked} className="text-xl leading-loose" />
          </OptionRow>
        ))}
      </div>
      {!locked && toggle}
      {!locked && <CheckBar disabled={picked === null} onCheck={() => picked !== null && onAnswer(picked === right)} />}
    </div>
  )
}

function GrammarFeedback({ fb, onContinue }: { fb: Feedback; onContinue: () => void }) {
  const { step, correct } = fb
  const [praise] = useState(() => (correct ? PRAISE : OOPS)[Math.floor(Math.random() * (correct ? PRAISE : OOPS).length)])
  const sentence = unspaced(solvedSentence(step))
  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-page via-page to-transparent px-4 pt-6" data-testid="feedback" data-correct={correct}>
      <div className="mx-auto max-w-xl animate-slide-up">
        <div className="flex items-end gap-1">
          <OtterArt mood={correct ? 'happy' : 'sad'} size={84} className="-mb-1 shrink-0" />
          <div
            className={`relative mb-4 min-w-0 flex-1 rounded-3xl p-4 shadow-[0_16px_32px_-20px_rgb(20_40_30/0.5)] ring-1 ${
              correct ? 'bg-brand-50 ring-brand-200' : 'bg-rose-50 ring-rose-200'
            }`}
          >
            <p className={`font-display text-xl font-extrabold ${correct ? 'text-brand-700 dark:text-brand-400' : 'text-rose-600 dark:text-rose-400'}`}>{praise}</p>
            <div className="mt-2 flex items-center gap-3">
              <AudioButton text={sentence} size="sm" slow={false} />
              <div className="min-w-0">
                <Hanzi text={sentence} showPinyin className="text-xl leading-loose" />
                <p className="text-sm text-slate-600">{step.drill.en}</p>
              </div>
            </div>
            <p className="mt-2 flex gap-1.5 text-sm text-slate-700" data-testid="why">
              <Icon name="bulb" className="h-5 w-5 shrink-0 text-amber-500" /> {step.drill.why}
            </p>
          </div>
        </div>
        <Button variant={correct ? 'primary' : 'danger'} className="mb-1 w-full" onClick={onContinue} data-testid="continue">
          Continue
        </Button>
      </div>
    </div>
  )
}
