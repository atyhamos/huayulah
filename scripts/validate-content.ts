/* Validates content JSON: schema, ids, lesson refs, pinyin syllable counts, and cross-checks pinyin with pinyin-pro. */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pinyin } from 'pinyin-pro'
import { isDeepStrictEqual } from 'node:util'
import { buildContent } from '../src/content/build'
import { pinyinTable } from '../src/content/pinyinTable'
import { GrammarSchema, StorySchema, UnitSchema } from '../src/content/schema'
import { tokenize } from '../src/lib/exercises'
import { hanChars, looseKey, syllables } from '../src/lib/pinyin'
import { installPinyinEngine } from '../src/lib/pinyinEngine'

const dir = join(import.meta.dirname, '../src/content/units')
const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
const raw = files.map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))

const errors: string[] = []
const warnings: string[] = []
let content
try {
  content = buildContent(raw.map((r, i) => {
    const res = UnitSchema.safeParse(r)
    if (!res.success) throw new Error(`${files[i]}: ${res.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join('; ')}`)
    return r
  }))
} catch (e) {
  console.error('✗ Schema/reference error:', e instanceof Error ? e.message : e)
  process.exit(1)
}

const inLesson = new Map<string, number>()
for (const l of content.lessonOrder) for (const id of l.items) inLesson.set(id, (inLesson.get(id) ?? 0) + 1)

for (const it of content.items.values()) {
  const where = `${it.unitId}/${it.id} (${it.hanzi})`
  const n = hanChars(it.hanzi).length
  const syl = syllables(it.pinyin)
  if (n !== syl.length) errors.push(`${where}: ${n} characters but ${syl.length} pinyin syllables "${it.pinyin}"`)
  if (it.standard && hanChars(it.standard.hanzi).length !== syllables(it.standard.pinyin).length)
    errors.push(`${where}: standard term syllable count mismatch`)
  const count = inLesson.get(it.id) ?? 0
  if (count === 0) errors.push(`${where}: not used in any lesson`)
  if (count > 1) errors.push(`${where}: used in ${count} lessons`)

  const auto = pinyin(it.hanzi, { toneSandhi: false })
  if (looseKey(auto) !== looseKey(it.pinyin))
    warnings.push(`${where}: pinyin "${it.pinyin}" differs from pinyin-pro "${auto}"${it.verify ? ' [verify]' : ''}`)

  if (it.example) {
    const joined = it.example.zh.replace(/\s/g, '')
    if (!joined.includes(it.hanzi)) warnings.push(`${where}: example doesn't contain the item`)
  } else warnings.push(`${where}: no example sentence`)
}

const storiesRaw = JSON.parse(readFileSync(join(import.meta.dirname, '../src/content/stories.json'), 'utf8')) as unknown[]
const stories = storiesRaw.flatMap((r, i) => {
  const res = StorySchema.safeParse(r)
  if (!res.success) {
    errors.push(`stories[${i}]: ${res.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join('; ')}`)
    return []
  }
  if (!content.units.some((u) => u.id === res.data.unitId)) errors.push(`${res.data.id}: unknown unit ${res.data.unitId}`)
  return [res.data]
})

installPinyinEngine([...content.items.values()])
// character building blocks: every course character should have parts data (re-run scripts/gen-chars.ts)
{
  const chars = JSON.parse(readFileSync(join(import.meta.dirname, '../src/content/chars.generated.json'), 'utf8')) as Record<string, unknown>
  const missing = new Set<string>()
  for (const it of content.items.values()) for (const c of hanChars(it.hanzi)) if (!chars[c]) missing.add(c)
  if (missing.size) warnings.push(`no building-blocks data for: ${[...missing].join('')} (scripts/gen-chars.ts)`)
}

const grammarRes = GrammarSchema.safeParse(JSON.parse(readFileSync(join(import.meta.dirname, '../src/content/grammar.json'), 'utf8')))
const topics = grammarRes.success ? grammarRes.data.topics : []
if (!grammarRes.success) errors.push(`grammar.json: ${grammarRes.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join('; ')}`)
else {
  const { sections } = grammarRes.data
  topics.forEach((t, i) => {
    const want = `g${String(i + 1).padStart(2, '0')}`
    if (t.id !== want) errors.push(`grammar ${t.id}: expected id ${want} (topics are numbered in order)`)
    if (t.section > sections.length) errors.push(`${t.id}: no section ${t.section}`)
    if (i && t.section < topics[i - 1].section) errors.push(`${t.id}: sections must not go backwards`)
    for (const u of t.lines) if (!content.units.some((x) => x.id === u)) errors.push(`${t.id}: unknown line ${u}`)
    for (const r of t.rules) {
      if (!/\[[^\]]+\]/.test(r.pattern)) errors.push(`${t.id} "${r.title}": pattern has no [highlighted] part`)
      if (/\[[^\]]*\[|\][^[]*\]/.test(r.pattern)) errors.push(`${t.id} "${r.title}": unbalanced brackets in pattern`)
    }
    t.drills.forEach((d, k) => {
      const where = `${t.id} drill ${k + 1}`
      if (d.kind === 'gap') {
        if (d.zh.split(' ').filter((w) => w.replace(/[，。？！]/g, '') === '___').length !== 1) errors.push(`${where}: a gap needs exactly one ___ word`)
        if (!d.options.includes(d.answer)) errors.push(`${where}: answer "${d.answer}" is not an option`)
        if (new Set(d.options).size !== d.options.length) errors.push(`${where}: duplicate options`)
      } else if (d.kind === 'pick') {
        if (d.answer >= d.options.length) errors.push(`${where}: answer out of range`)
        if (new Set(d.options).size !== d.options.length) errors.push(`${where}: duplicate options`)
      } else if (tokenize(d.zh).length < 3) warnings.push(`${where}: very short sentence to put in order`)
    })
  })
  sections.forEach((_, i) => {
    if (!topics.some((t) => t.section === i + 1)) errors.push(`grammar section ${i + 1} has no topics`)
  })
}

const genPath = join(import.meta.dirname, '../src/content/pinyin.generated.json')
if (!isDeepStrictEqual(JSON.parse(readFileSync(genPath, 'utf8')), pinyinTable(content, stories, topics)))
  errors.push('src/content/pinyin.generated.json is stale — run `npm run gen:pinyin`')

const verify = [...content.items.values()].filter((i) => i.verify)
console.log(
  `Units: ${content.units.length}  Lessons: ${content.lessonOrder.length}  Items: ${content.items.size}  SG-specific: ${
    [...content.items.values()].filter((i) => i.sg).length
  }  Stories: ${stories.length}  Grammar topics: ${topics.length}  Flagged for review: ${verify.length} words, ${
    topics.filter((t) => t.verify).length
  } grammar`,
)
for (const w of warnings) console.log('  ⚠', w)
for (const e of errors) console.log('  ✗', e)
if (errors.length) {
  console.error(`\n${errors.length} error(s).`)
  process.exit(1)
}
console.log('✓ Content OK')
