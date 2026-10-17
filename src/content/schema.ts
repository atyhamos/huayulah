import { z } from 'zod'

/** A sentence written with spaces between words, e.g. "我 要 一杯 咖啡乌。" */
const tokenized = z
  .string()
  .min(1)
  .refine((s) => s.trim() === s && !/\s{2,}/.test(s), 'no leading/trailing/double spaces')

export const ExampleSchema = z.object({
  zh: tokenized,
  en: z.string().min(1),
})

export const ItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  hanzi: z.string().min(1),
  /** Pinyin with tone marks, one syllable per Chinese character, separated by spaces. */
  pinyin: z.string().min(1),
  english: z.string().min(1),
  type: z.enum(['word', 'phrase', 'sentence']).default('word'),
  /** Uniquely or characteristically Singaporean usage. */
  sg: z.boolean().optional(),
  /** Equivalent term in standard (mainland) Mandarin, where it differs. */
  standard: z.object({ hanzi: z.string(), pinyin: z.string() }).optional(),
  note: z.string().optional(),
  /** Slug of the Singaporean Mandarin Database entry, if known. */
  smd: z.string().optional(),
  example: ExampleSchema.optional(),
  /** Content the author is less sure about — flagged for a human check. */
  verify: z.boolean().optional(),
})

export const LessonSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  items: z.array(z.string()).min(3).max(8),
})

export const UnitSchema = z.object({
  id: z.string().regex(/^u\d{2}$/),
  title: z.string(),
  titleZh: z.string(),
  description: z.string(),
  emoji: z.string(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  items: z.array(ItemSchema).min(1),
  lessons: z.array(LessonSchema).min(1),
})

export const StorySchema = z
  .object({
    id: z.string().regex(/^story-[a-z0-9-]+$/),
    unitId: z.string().regex(/^u\d{2}$/),
    title: z.string(),
    titleZh: z.string(),
    emoji: z.string(),
    speakers: z.record(z.string(), z.object({ name: z.string(), emoji: z.string() })),
    lines: z.array(z.object({ speaker: z.string(), zh: z.string().min(1), en: z.string().min(1) })).min(3),
    questions: z.array(
      z.object({
        /** Index of the line after which the question appears. */
        after: z.number().int().min(0),
        prompt: z.string(),
        options: z.array(z.string()).min(2).max(4),
        answer: z.number().int().min(0),
      }),
    ),
  })
  .superRefine((st, ctx) => {
    st.lines.forEach((l, i) => {
      if (!st.speakers[l.speaker]) ctx.addIssue({ code: 'custom', message: `line ${i}: unknown speaker ${l.speaker}` })
    })
    st.questions.forEach((q, i) => {
      if (q.after >= st.lines.length) ctx.addIssue({ code: 'custom', message: `question ${i}: after is past the last line` })
      if (q.answer >= q.options.length) ctx.addIssue({ code: 'custom', message: `question ${i}: answer out of range` })
    })
  })

/** A grammar drill: fill the gap, put a sentence in order, or pick the right sentence. Each says why. Chinese is tokenized. */
export const DrillSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('gap'),
    /** The sentence with one "___" token where the answer goes. */
    zh: tokenized,
    en: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(4),
    answer: z.string().min(1),
    why: z.string().min(1),
  }),
  z.object({ kind: z.literal('order'), zh: tokenized, en: z.string().min(1), why: z.string().min(1) }),
  z.object({
    kind: z.literal('pick'),
    en: z.string().min(1),
    options: z.array(tokenized).min(2).max(4),
    answer: z.number().int().min(0),
    why: z.string().min(1),
  }),
])

export const GrammarTopicSchema = z.object({
  id: z.string().regex(/^g\d{2}$/),
  /** 1-based section number. */
  section: z.number().int().min(1),
  title: z.string().min(1),
  titleZh: z.string().min(1),
  summary: z.string().min(1),
  /** Lines (unit ids) that lean on this topic; they link to it. */
  lines: z.array(z.string().regex(/^u\d{2}$/)).default([]),
  rules: z
    .array(
      z.object({
        title: z.string().min(1),
        body: z.string().min(1),
        /** A tokenized model sentence; [brackets] mark the part the rule is about. */
        pattern: z.string().min(1),
        examples: z.array(ExampleSchema).min(1),
        tip: z.string().optional(),
      }),
    )
    .min(1)
    .max(4),
  drills: z.array(DrillSchema).min(6),
  verify: z.boolean().optional(),
})

export const GrammarSchema = z.object({
  sections: z.array(z.object({ title: z.string().min(1), titleZh: z.string().min(1), description: z.string().min(1) })).min(1),
  topics: z.array(GrammarTopicSchema).min(1),
})

export type Drill = z.infer<typeof DrillSchema>
export type GrammarTopic = z.infer<typeof GrammarTopicSchema>
export type GrammarSection = z.infer<typeof GrammarSchema>['sections'][number]
export type Story = z.infer<typeof StorySchema>
export type Example = z.infer<typeof ExampleSchema>
export type Item = z.infer<typeof ItemSchema> & { unitId: string }
export type Lesson = z.infer<typeof LessonSchema> & { unitId: string; index: number }
export type UnitInput = z.input<typeof UnitSchema>
export type Unit = Omit<z.infer<typeof UnitSchema>, 'items' | 'lessons'> & {
  items: Item[]
  lessons: Lesson[]
}
