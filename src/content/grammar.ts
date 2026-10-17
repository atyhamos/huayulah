import grammarJson from './grammar.json'
import type { GrammarSection, GrammarTopic } from './schema'

/** The grammar track: sections of topics, each a few rule cards and drills. Progress lives in `s.lessons[gNN]`. */
const grammar = grammarJson as { sections: GrammarSection[]; topics: GrammarTopic[] }

export const grammarSections = grammar.sections
export const grammarTopics = grammar.topics

export const getTopic = (id: string) => grammarTopics.find((t) => t.id === id)
export const sectionTopics = (n: number) => grammarTopics.filter((t) => t.section === n)
/** The topics a line leans on (from each topic's `lines`). */
export const topicsForLine = (unitId: string) => grammarTopics.filter((t) => t.lines.includes(unitId))
/** "G6" for g06. */
export const topicCode = (t: GrammarTopic) => `G${Number(t.id.slice(1))}`
