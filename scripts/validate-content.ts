/* Validates content JSON: schema, ids, lesson refs, pinyin syllable counts, and cross-checks pinyin with pinyin-pro. */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pinyin } from 'pinyin-pro'
import { buildContent } from '../src/content/build'
import { hanChars, looseKey, syllables } from '../src/lib/pinyin'

const dir = join(import.meta.dirname, '../src/content/units')
const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
const raw = files.map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))

const errors: string[] = []
const warnings: string[] = []
let content
try {
  content = buildContent(raw)
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

const verify = [...content.items.values()].filter((i) => i.verify)
console.log(
  `Units: ${content.units.length}  Lessons: ${content.lessonOrder.length}  Items: ${content.items.size}  SG-specific: ${
    [...content.items.values()].filter((i) => i.sg).length
  }  Flagged for review: ${verify.length}`,
)
for (const w of warnings) console.log('  ⚠', w)
for (const e of errors) console.log('  ✗', e)
if (errors.length) {
  console.error(`\n${errors.length} error(s).`)
  process.exit(1)
}
console.log('✓ Content OK')
