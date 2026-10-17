import { sectionTopics } from '../content/grammar'
import type { Drill, GrammarTopic } from '../content/schema'
import { tokenize } from './exercises'
import { sample, shuffle, type Rng } from './random'

/** One screen of a grammar session: a rule card, or a drill with its choices shuffled. */
export type GrammarStep =
  | { id: string; kind: 'rule'; topicId: string; rule: number }
  | { id: string; kind: 'gap'; topicId: string; drill: Extract<Drill, { kind: 'gap' }>; options: string[] }
  | { id: string; kind: 'order'; topicId: string; drill: Extract<Drill, { kind: 'order' }>; answer: string[]; tiles: string[] }
  | { id: string; kind: 'pick'; topicId: string; drill: Extract<Drill, { kind: 'pick' }>; order: number[] }

export const GRAMMAR_TEST_SIZE = 12

let counter = 0
const uid = (kind: string, key: string) => `${kind}-${key}-${++counter}`

/** A drill, ready to show. Tiles to put in order never start out already in order. */
export function drillStep(topicId: string, drill: Drill, rng: Rng = Math.random): GrammarStep {
  const id = uid(drill.kind, topicId)
  switch (drill.kind) {
    case 'gap':
      return { id, kind: 'gap', topicId, drill, options: shuffle(drill.options, rng) }
    case 'pick':
      return { id, kind: 'pick', topicId, drill, order: shuffle(drill.options.map((_, i) => i), rng) }
    case 'order': {
      const answer = tokenize(drill.zh)
      let tiles = shuffle(answer, rng)
      for (let i = 0; i < 5 && tiles.join(' ') === answer.join(' '); i++) tiles = shuffle(answer, rng)
      return { id, kind: 'order', topicId, drill, answer, tiles }
    }
  }
}

/** A topic: its rule cards first, then every drill in a random order. */
export function generateGrammarLesson(topic: GrammarTopic, rng: Rng = Math.random): GrammarStep[] {
  return [
    ...topic.rules.map((_, i): GrammarStep => ({ id: uid('rule', topic.id), kind: 'rule', topicId: topic.id, rule: i })),
    ...shuffle(topic.drills, rng).map((d) => drillStep(topic.id, d, rng)),
  ]
}

/** A section test: drills sampled across the section's topics, no rule cards. */
export function generateGrammarTest(section: number, rng: Rng = Math.random, n = GRAMMAR_TEST_SIZE): GrammarStep[] {
  const pool = sectionTopics(section).flatMap((t) => t.drills.map((d) => ({ topicId: t.id, d })))
  return sample(pool, n, rng).map(({ topicId, d }) => drillStep(topicId, d, rng))
}

/** A fresh copy of a missed drill to try again at the end. */
export function retryStep(step: GrammarStep, rng: Rng = Math.random): GrammarStep {
  return step.kind === 'rule' ? step : drillStep(step.topicId, step.drill, rng)
}

/** Tokenized course text as it is shown and spoken: without the spaces between words. */
export const unspaced = (zh: string) => zh.replace(/ /g, '')

/** The drill's sentence with its answer filled in (tokenized; what to show and say after answering). */
export function solvedSentence(step: Exclude<GrammarStep, { kind: 'rule' }>): string {
  switch (step.kind) {
    case 'gap':
      return step.drill.zh.replace('___', step.drill.answer)
    case 'pick':
      return step.drill.options[step.drill.answer]
    case 'order':
      return step.drill.zh
  }
}

/** Splits a rule pattern into plain and [highlighted] parts, without the spaces between words. */
export function patternParts(pattern: string): { text: string; mark: boolean }[] {
  return pattern
    .split(/(\[[^\]]+\])/)
    .filter(Boolean)
    .map((p) => (p.startsWith('[') ? { text: unspaced(p.slice(1, -1)), mark: true } : { text: unspaced(p), mark: false }))
    .filter((p) => p.text)
}

/** A rule pattern as tokenized text, brackets removed. */
export const patternText = (pattern: string) => pattern.replace(/[[\]]/g, '')
