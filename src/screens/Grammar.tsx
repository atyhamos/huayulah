import { Link, useNavigate } from 'react-router-dom'
import { grammarSections, sectionTopics, topicCode } from '../content/grammar'
import { isGrammarUnlocked, nextGrammarTopic } from '../data/actions'
import { GRAMMAR_COLOR, GRAMMAR_TEXT } from '../components/GrammarRule'
import { Icon } from '../components/icons'
import { OtterArt } from '../components/OtterArt'
import { TrackSwitch } from '../components/TrackSwitch'
import { useApp } from '../store/app'

/** The grammar track: four sections of short topics, opened in order, each section skippable with a test. */
export function GrammarScreen() {
  const s = useApp((st) => st.s)
  const next = nextGrammarTopic(s)
  return (
    <div>
      <TrackSwitch />
      <div className="mt-4 flex items-end gap-3 rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-slate-200">
        <OtterArt mood="think" size={72} className="shrink-0" />
        <div className="min-w-0 pb-1">
          <h1 className="font-display text-xl font-extrabold leading-tight">How Mandarin fits together</h1>
          <p className="text-sm text-slate-500">Short topics in order. Each is a few rules and about ten quick drills that say why.</p>
        </div>
      </div>

      {grammarSections.map((sec, i) => {
        const n = i + 1
        const topics = sectionTopics(n)
        const done = topics.filter((t) => s.lessons[t.id]).length
        return (
          <section key={n} className="mt-8" data-testid={`grammar-section-${n}`}>
            <header className="flex items-center gap-3">
              <span className="grid h-11 min-w-11 place-items-center rounded-2xl px-2 font-display text-lg font-extrabold text-white" style={{ backgroundColor: GRAMMAR_COLOR }}>
                {n}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-extrabold leading-tight">{sec.title}</h2>
                <p className="font-brush text-lg leading-tight text-slate-500">{sec.titleZh}</p>
              </div>
              <span className="text-xs font-bold tabular-nums text-slate-400">
                {done}/{topics.length}
              </span>
            </header>
            <p className="mb-1 mt-2 text-sm text-slate-500">{sec.description}</p>
            {done < topics.length && (
              <Link
                to={`/grammar/test/${n}`}
                className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200"
                data-testid={`gtest-${n}`}
              >
                <Icon name="train" className="h-4 w-4" /> Know this already? Test out
              </Link>
            )}
            <ol>
              {topics.map((t, k) => {
                const progress = s.lessons[t.id]
                const status = progress ? 'done' : isGrammarUnlocked(s, t.id) ? 'open' : 'locked'
                const isNext = t.id === next
                return (
                  <li key={t.id} className="relative flex gap-3">
                    <div className="relative w-12 shrink-0">
                      <span
                        className={`absolute left-1/2 w-2 -translate-x-1/2 ${k === 0 ? 'top-6' : 'top-0'} ${k === topics.length - 1 ? 'h-6' : 'bottom-0'}`}
                        style={{ backgroundColor: GRAMMAR_COLOR, opacity: status === 'locked' ? 0.25 : 1 }}
                      />
                      <span className="absolute left-1/2 top-6 -translate-x-1/2 -translate-y-1/2">
                        {isNext ? (
                          <span className="relative grid h-12 w-12 place-items-end overflow-hidden rounded-full bg-surface ring-[5px]" style={{ ['--tw-ring-color' as string]: GRAMMAR_COLOR }}>
                            <OtterArt size={48} className="-mb-3" />
                          </span>
                        ) : (
                          <span
                            className={`grid h-7 w-7 place-items-center rounded-full ring-[5px] ${status === 'done' ? '' : 'bg-surface'}`}
                            style={{
                              ['--tw-ring-color' as string]: status === 'locked' ? 'var(--color-slate-300)' : GRAMMAR_COLOR,
                              backgroundColor: status === 'done' ? GRAMMAR_COLOR : undefined,
                            }}
                          >
                            {status === 'done' && <Icon name="check" className="h-4 w-4 text-white" strokeWidth={3} />}
                          </span>
                        )}
                      </span>
                    </div>
                    <TopicRow id={t.id} code={topicCode(t)} title={t.title} summary={t.summary} status={status} isNext={isNext} tested={!!progress?.tested && !progress.timesCompleted} />
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
    </div>
  )
}

function TopicRow({ id, code, title, summary, status, isNext, tested }: { id: string; code: string; title: string; summary: string; status: 'done' | 'open' | 'locked'; isNext: boolean; tested: boolean }) {
  const nav = useNavigate()
  return (
    <button
      type="button"
      data-testid={`topic-${id}`}
      data-status={status}
      onClick={() => nav(`/grammar/${id}`)}
      className="my-1.5 flex min-w-0 flex-1 items-center gap-2 rounded-2xl px-3 py-2.5 text-left hover:bg-surface/70"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`rounded-md bg-slate-100 px-1.5 py-0.5 font-display text-[11px] font-extrabold tabular-nums ${status === 'locked' ? 'text-slate-400' : GRAMMAR_TEXT}`}>
            {code}
          </span>
          <span className={`truncate font-display font-bold ${status === 'locked' ? 'text-slate-400' : ''}`}>{title}</span>
        </span>
        <span className={`mt-0.5 block text-xs ${isNext ? 'font-bold text-brand-600' : 'text-slate-500'}`}>
          {isNext ? 'Up next · tap to start' : tested ? 'Cleared by test' : summary}
        </span>
      </span>
      <Icon name={status === 'locked' ? 'lock' : 'next'} className={`h-5 w-5 shrink-0 ${status === 'locked' ? 'text-slate-300' : 'text-slate-400'}`} />
    </button>
  )
}
