/* Precompute per-character pinyin for every piece of course text so the app doesn't ship pinyin-pro up front. */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { content, stories } from '../src/content'
import { grammarTopics } from '../src/content/grammar'
import { pinyinTable } from '../src/content/pinyinTable'
import { installPinyinEngine } from '../src/lib/pinyinEngine'

installPinyinEngine([...content.items.values()])
const out = join(import.meta.dirname, '../src/content/pinyin.generated.json')
const table = pinyinTable(content, stories, grammarTopics)
writeFileSync(out, JSON.stringify(table) + '\n')
console.log(`pinyin table: ${Object.keys(table).length} entries → ${out}`)
