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

export type Story = z.infer<typeof StorySchema>
export type Example = z.infer<typeof ExampleSchema>
export type Item = z.infer<typeof ItemSchema> & { unitId: string }
export type Lesson = z.infer<typeof LessonSchema> & { unitId: string; index: number }
export type UnitInput = z.input<typeof UnitSchema>
export type Unit = Omit<z.infer<typeof UnitSchema>, 'items' | 'lessons'> & {
  items: Item[]
  lessons: Lesson[]
}
