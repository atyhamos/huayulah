import { buildContent } from './build'
import { registerItemPinyin } from '../lib/pinyin'
import u01 from './units/u01.json'
import u02 from './units/u02.json'
import u03 from './units/u03.json'

export const content = buildContent([u01, u02, u03])
registerItemPinyin([...content.items.values()])

export const { units, items, lessons, lessonOrder } = content

export function getItem(id: string) {
  const it = items.get(id)
  if (!it) throw new Error(`Unknown item ${id}`)
  return it
}

export const SMD_BASE =
  'https://www.languagecouncils.sg/mandarin/en/learning-resources/singaporean-mandarin-database'
