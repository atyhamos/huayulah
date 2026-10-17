import { Link, useNavigate, useParams } from 'react-router-dom'
import { content } from '../content'
import { getTopic, grammarSections, grammarTopics, topicCode } from '../content/grammar'
import { isGrammarUnlocked } from '../data/actions'
import { GRAMMAR_COLOR, RuleCard } from '../components/GrammarRule'
import { Icon, unitMeta } from '../components/icons'
import { OtterArt } from '../components/OtterArt'
import { BackButton, Button } from '../components/ui'
import { useApp } from '../store/app'

/** A grammar topic: its rules (always readable, as a reference) and the way into its drills. */
export function GrammarTopicScreen() {
  const { topicId = '' } = useParams()
  const nav = useNavigate()
  const s = useApp((st) => st.s)
  const topic = getTopic(topicId)
  if (!topic) {
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
  const progress = s.lessons[topic.id]
  const status = progress ? 'done' : isGrammarUnlocked(s, topic.id) ? 'open' : 'locked'
  const before = grammarTopics[grammarTopics.indexOf(topic) - 1]
  const section = grammarSections[topic.section - 1]
  const lines = topic.lines.map((id) => content.units.find((u) => u.id === id)!).filter(Boolean)

  return (
    <div data-testid="grammar-topic" data-status={status}>
      <div className="mb-4 flex items-center gap-3">
        <BackButton />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Grammar · {section.title}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-3xl p-5 text-white" style={{ background: GRAMMAR_COLOR }}>
        <div className="peranakan-band absolute inset-x-0 bottom-0 opacity-70" />
        <span className="mb-2 inline-flex rounded-full bg-white/20 px-3 py-1 font-display text-xs font-extrabold">{topicCode(topic)}</span>
        <h1 className="font-display text-3xl font-extrabold leading-tight">{topic.title}</h1>
        <p className="font-brush text-2xl text-white/85">{topic.titleZh}</p>
        <p className="mb-4 mt-2 text-white/90">{topic.summary}</p>
      </div>

      <div className="mt-4">
        {status === 'locked' ? (
          <p className="flex items-start gap-2 rounded-2xl bg-surface p-4 text-sm text-slate-600 ring-1 ring-slate-200" data-testid="topic-locked">
            <Icon name="lock" className="h-5 w-5 shrink-0 text-slate-400" />
            <span>
              Finish{' '}
              <Link to={`/grammar/${before.id}`} className="font-bold underline">
                {topicCode(before)} {before.title}
              </Link>{' '}
              first, or{' '}
              <Link to={`/grammar/test/${topic.section}`} className="font-bold underline">
                test out of {section.title}
              </Link>
              . The rules below are yours to read already.
            </span>
          </p>
        ) : (
          <Button className="w-full" data-testid="start-grammar" onClick={() => nav(`/grammar/${topic.id}/play`)}>
            <Icon name="brush" className="h-5 w-5" />
            {status === 'done' ? 'Practise again · +5 XP' : `Start · ${topic.drills.length} drills · +10 XP`}
          </Button>
        )}
      </div>

      {lines.length > 0 && (
        <p className="mt-4 flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-500">
          Used on
          {lines.map((u) => (
            <span key={u.id} className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 ring-1 ring-slate-200">
              <span className="rounded px-1 text-[10px] font-extrabold text-white" style={{ backgroundColor: u.color }}>
                {unitMeta(u.id).code}
              </span>
              {u.title}
            </span>
          ))}
        </p>
      )}

      <h2 className="mb-2 mt-6 font-display text-sm font-bold uppercase tracking-widest text-slate-400">The rules</h2>
      <div className="flex flex-col gap-3">
        {topic.rules.map((_, i) => (
          <RuleCard key={i} topic={topic} index={i} />
        ))}
      </div>
    </div>
  )
}
