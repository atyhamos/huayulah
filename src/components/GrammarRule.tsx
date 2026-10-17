import type { GrammarTopic } from '../content/schema'
import { patternParts, patternText, unspaced } from '../lib/grammar'
import { rubyFor } from '../lib/pinyin'
import { AudioButton } from './AudioButton'
import { Hanzi } from './Hanzi'
import { Icon } from './icons'

/** The track's colour: a deep teal, apart from every line colour. */
export const GRAMMAR_COLOR = '#0f5f66'
/** Text in the track's colour, lighter in dark mode. */
export const GRAMMAR_TEXT = 'text-[#0f5f66] dark:text-[#7fd3d8]'

/** A rule's model sentence with pinyin, the part the rule is about highlighted. */
function Pattern({ pattern }: { pattern: string }) {
  const ruby = rubyFor(unspaced(patternText(pattern)))
  let at = 0
  return (
    <span className="font-han inline-block text-2xl leading-loose" lang="zh-Hans" data-testid="rule-pattern">
      {patternParts(pattern).map((p, i) => {
        const chars = ruby.slice(at, (at += [...p.text].length))
        const body = chars.map((c, k) =>
          c.py ? (
            <ruby key={k}>
              {c.ch}
              <rt>{c.py}</rt>
            </ruby>
          ) : (
            <span key={k}>{c.ch}</span>
          ),
        )
        return p.mark ? (
          <mark key={i} className="rounded-md bg-amber-200 px-0.5 text-amber-900">
            {body}
          </mark>
        ) : (
          <span key={i}>{body}</span>
        )
      })}
    </span>
  )
}

/** One rule of a grammar topic: what it says, a model sentence with the key part marked, examples and a tip. */
export function RuleCard({ topic, index }: { topic: GrammarTopic; index: number }) {
  const rule = topic.rules[index]
  return (
    <article className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-slate-200" data-testid="rule-card">
      <p className={`mb-1 text-xs font-bold uppercase tracking-widest ${GRAMMAR_TEXT}`}>
        Rule {index + 1} of {topic.rules.length}
      </p>
      <h3 className="font-display text-xl font-extrabold leading-tight">{rule.title}</h3>
      <p className="mt-2 text-slate-600">{rule.body}</p>

      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-100 px-4 py-2">
        <AudioButton text={unspaced(patternText(rule.pattern))} size="sm" slow={false} />
        <Pattern pattern={rule.pattern} />
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {rule.examples.map((e) => (
          <li key={e.zh} className="flex items-center gap-3">
            <AudioButton text={unspaced(e.zh)} size="sm" slow={false} />
            <span className="min-w-0">
              <Hanzi text={unspaced(e.zh)} showPinyin className="text-xl leading-loose" />
              <span className="block text-sm text-slate-500">{e.en}</span>
            </span>
          </li>
        ))}
      </ul>

      {rule.tip && (
        <p className="mt-4 flex gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-slate-700 ring-1 ring-amber-200">
          <Icon name="bulb" className="h-5 w-5 shrink-0 text-amber-500" />
          {rule.tip}
        </p>
      )}
    </article>
  )
}
