/* Copy stroke-order data for every character in the course into public/strokes/ so writing practice works offline. */
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { content, stories } from '../src/content'
import { hanChars } from '../src/lib/pinyin'

const require = createRequire(import.meta.url)
const src = dirname(require.resolve('hanzi-writer-data/package.json'))
const out = join(import.meta.dirname, '../public/strokes')

const chars = new Set<string>()
for (const it of content.items.values()) {
  hanChars(it.hanzi).forEach((c) => chars.add(c))
  if (it.standard) hanChars(it.standard.hanzi).forEach((c) => chars.add(c))
}
for (const st of stories) for (const l of st.lines) hanChars(l.zh).forEach((c) => chars.add(c))

if (existsSync(out)) rmSync(out, { recursive: true })
mkdirSync(out, { recursive: true })
const missing: string[] = []
for (const c of chars) {
  const f = join(src, `${c}.json`)
  if (existsSync(f)) copyFileSync(f, join(out, `${c}.json`))
  else missing.push(c)
}
copyFileSync(join(src, 'ARPHICPL.TXT'), join(out, 'ARPHICPL.TXT'))
console.log(`strokes: ${readdirSync(out).length - 1} characters → public/strokes${missing.length ? ` (missing: ${missing.join('')})` : ''}`)
