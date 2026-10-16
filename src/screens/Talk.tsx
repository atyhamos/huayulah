import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as z from 'zod/v4'
import { content } from '../content'
import { scenarioFor, type Scenario } from '../content/roleplay'
import { loadPinyinEngine } from '../content/pinyinLoader'
import type { LessonSummary } from '../data/actions'
import { useSpeak } from '../components/AudioButton'
import { Hanzi } from '../components/Hanzi'
import { useAiKey } from '../components/hooks'
import { Icon } from '../components/icons'
import { Avatar, Button, Card } from '../components/ui'
import { AiError, aiSupported, askJson } from '../lib/ai'
import { listen, recognitionSupported } from '../lib/speech'
import { sfx } from '../lib/sfx'
import { useApp } from '../store/app'
import { LessonComplete } from './LessonComplete'

const MAX_TURNS = 8

const ReplySchema = z.object({
  zh: z.string().describe('Your reply in character: simple Singaporean Mandarin, one or two short sentences'),
  en: z.string().describe('English translation of your reply'),
  correction: z
    .string()
    .describe("A natural Chinese way to say what the learner just meant, if they used English, pinyin or made a mistake; otherwise empty"),
  hint: z.string().describe('One short idea for what the learner could say next: Chinese, then pinyin, then English in brackets'),
  done: z.boolean().describe('True once the goal is reached or the chat has run its course; then wrap up politely'),
})

interface Turn {
  who: 'tat' | 'me'
  zh: string
  en?: string
  correction?: string
}

function systemPrompt(sc: Scenario) {
  const unit = content.units.find((u) => u.id === sc.unitId)
  const vocab = unit ? unit.items.slice(0, 60).map((i) => i.hanzi).join('、') : ''
  return `You are role-playing with a Singaporean adult who is learning to speak and read Mandarin. They know some spoken Mandarin but are not fluent.
Scenario: ${sc.setting}
You play: ${sc.role}. Stay in character.
The learner's goal: ${sc.goal}
Speak natural, everyday Singaporean Mandarin, kept simple: one or two short sentences per reply, common words, local terms and particles where natural (啦, 咯, 嘛, 巴刹, 德士, 咖啡乌…). When it fits, use words from what they are learning: ${vocab}.
The learner may answer in Chinese characters, pinyin or English; reply in Chinese either way, and give a natural Chinese version of what they meant in "correction" (leave it empty if their Chinese was already fine).
Keep the conversation moving toward their goal. After about ${MAX_TURNS} exchanges, or once the goal is done, set "done" and close the conversation naturally.`
}

/** Role-play with Ah Tat playing someone from the line's theme (needs the learner's Claude key). */
export function TalkScreen() {
  const { unitId = '' } = useParams()
  const sc = scenarioFor(unitId)
  const key = useAiKey()
  const nav = useNavigate()
  const settings = useApp((st) => st.s.settings)
  const completePractice = useApp((st) => st.completePractice)
  const say = useSpeak()
  const [turns, setTurns] = useState<Turn[]>(() => (sc ? [{ who: 'tat', zh: sc.opener.zh, en: sc.opener.en }] : []))
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [done, setDone] = useState(false)
  const [pinyin, setPinyin] = useState(settings.pinyinMode !== 'never')
  const [english, setEnglish] = useState(false)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<LessonSummary | null>(null)
  const startedAt = useRef(Date.now())
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void loadPinyinEngine()
    if (sc) setTimeout(() => say(sc.opener.zh), 400)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // block body: newer Chrome returns a Promise from scrollIntoView, which React would take as a cleanup function
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns, busy])

  if (!sc) {
    return (
      <div className="p-8 text-center">
        <p className="mb-4">No role-play for this line yet.</p>
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
        title="Chat complete!"
        onDone={() => nav('/', { replace: true })}
      />
    )
  }

  if (!aiSupported || !key) {
    return (
      <div className="mx-auto max-w-md px-6 pt-16 text-center">
        <Avatar label={sc.avatar} size={72} />
        <h1 className="mb-2 mt-4 font-display text-2xl font-extrabold">{sc.title}</h1>
        <p className="mb-6 text-slate-500">Role-play chats run on your own Claude API key. Add one in Settings → AI features to start.</p>
        <Link to="/settings">
          <Button className="w-full">Open Settings</Button>
        </Link>
        <button type="button" className="mt-4 text-sm font-bold text-slate-400" onClick={() => nav(-1)}>
          Not now
        </button>
      </div>
    )
  }

  const myTurns = turns.filter((t) => t.who === 'me').length

  const send = async (text: string) => {
    const said = text.trim()
    if (!said || busy) return
    setDraft('')
    setShowHint(false)
    setError(null)
    const history: Turn[] = [...turns, { who: 'me', zh: said }]
    setTurns(history)
    setBusy(true)
    try {
      const r = await askJson({
        system: systemPrompt(sc),
        schema: ReplySchema,
        maxTokens: 2000,
        messages: [
          { role: 'user', content: '(The role-play starts. Open the conversation.)' },
          ...history.map((t) => ({ role: t.who === 'tat' ? ('assistant' as const) : ('user' as const), content: t.zh })),
        ],
      })
      const withCorrection = history.map((t, i) => (i === history.length - 1 && r.correction ? { ...t, correction: r.correction } : t))
      setTurns([...withCorrection, { who: 'tat', zh: r.zh, en: r.en }])
      setHint(r.hint || null)
      say(r.zh)
      if (r.done || myTurns + 1 >= MAX_TURNS) setDone(true)
    } catch (e) {
      setTurns(turns) // let them try again
      setDraft(said)
      setError(e instanceof AiError ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const speakIn = () => {
    setListening(true)
    listen({
      onInterim: setDraft,
      onFinal: (alts) => {
        setListening(false)
        if (alts[0]) setDraft(alts[0])
      },
      onError: () => setListening(false),
    })
  }

  const finish = () => {
    if (settings.sound) sfx.complete()
    const corrections = turns.filter((t) => t.correction).length
    setSummary(completePractice({ mistakesByItem: {}, maxCombo: 0, answered: Math.max(1, myTurns), correct: Math.max(0, myTurns - corrections) }))
  }

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col px-4 pb-48 pt-4" data-testid="talk">
      <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-3 bg-page/95 px-4 py-2 backdrop-blur">
        <button type="button" aria-label="Quit" onClick={() => nav(-1)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100">
          <Icon name="close" className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-extrabold">{sc.title}</p>
          <p className="truncate text-xs text-slate-500">{sc.goal}</p>
        </div>
        <button type="button" onClick={() => setPinyin((p) => !p)} className={`rounded-full px-2.5 py-1 text-xs font-bold ring-2 ring-inset ${pinyin ? 'bg-sky-50 text-sky-700 ring-sky-400 dark:text-sky-300' : 'text-slate-400 ring-slate-200'}`}>
          拼音
        </button>
        <button type="button" onClick={() => setEnglish((e) => !e)} className={`rounded-full px-2.5 py-1 text-xs font-bold ring-2 ring-inset ${english ? 'bg-sky-50 text-sky-700 ring-sky-400 dark:text-sky-300' : 'text-slate-400 ring-slate-200'}`}>
          EN
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {turns.map((t, i) => (
          <div key={i} className={`flex items-end gap-2 ${t.who === 'me' ? 'flex-row-reverse' : ''}`} data-testid={t.who === 'tat' ? 'talk-tat' : 'talk-me'}>
            {t.who === 'tat' ? <Avatar label={sc.avatar} size={40} seed={1} /> : <Avatar otter size={40} />}
            <div className={`max-w-[78%] ${t.who === 'me' ? 'text-right' : ''}`}>
              <button
                type="button"
                onClick={() => say(t.zh)}
                className={`rounded-3xl px-3.5 py-2 text-left ring-1 ${t.who === 'me' ? 'rounded-br-md bg-sky-50 ring-sky-200' : 'rounded-bl-md bg-surface ring-slate-200'}`}
              >
                <Hanzi text={t.zh} showPinyin={pinyin} revealable className="text-xl leading-loose" />
                {english && t.en && <span className="block text-sm text-slate-500">{t.en}</span>}
              </button>
              {t.correction && (
                <p className="mt-1 inline-flex items-start gap-1.5 rounded-2xl bg-amber-50 px-3 py-1.5 text-left text-sm text-amber-900 dark:text-amber-200" data-testid="talk-correction">
                  <Icon name="bulb" className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>
                    Try: <Hanzi text={t.correction} showPinyin={pinyin} className="text-base" />
                  </span>
                </p>
              )}
            </div>
          </div>
        ))}
        {busy && <p className="pl-12 text-slate-400">…</p>}
        {done && (
          <Card className="mt-2 text-center" data-testid="talk-done">
            <p className="font-display text-lg font-extrabold">Nicely done!</p>
            <p className="mb-3 text-sm text-slate-500">
              {myTurns} things said · {turns.filter((t) => t.correction).length} tips to look at above
            </p>
            <Button className="w-full" onClick={finish} data-testid="talk-finish">
              Finish
            </Button>
          </Card>
        )}
        <div ref={bottom} />
      </div>

      {!done && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 bg-gradient-to-t from-page via-page to-transparent px-4 pt-6">
          <div className="mx-auto max-w-xl">
            {error && <p className="mb-2 text-center text-sm text-rose-600 dark:text-rose-400">{error}</p>}
            {hint && (
              <p className="mb-2 text-center text-sm">
                {showHint ? (
                  <span className="text-slate-600">{hint}</span>
                ) : (
                  <button type="button" className="font-bold text-sky-600" onClick={() => setShowHint(true)} data-testid="talk-hint">
                    Need a hint?
                  </button>
                )}
              </p>
            )}
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void send(draft)
              }}
            >
              {recognitionSupported && (
                <button
                  type="button"
                  onClick={speakIn}
                  disabled={busy || listening}
                  aria-label="Speak"
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-white ${listening ? 'bg-rose-500' : 'bg-sky-500'}`}
                >
                  <Icon name="mic" className="h-6 w-6" />
                </button>
              )}
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Reply in 中文, pinyin or English"
                className="min-w-0 flex-1 rounded-full bg-surface px-4 py-3 outline-none ring-2 ring-inset ring-slate-200 focus:ring-sky-400"
                data-testid="talk-input"
              />
              <Button type="submit" className="!px-4" disabled={busy || !draft.trim()} data-testid="talk-send">
                <Icon name="next" className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
