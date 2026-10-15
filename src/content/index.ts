import { buildContent } from './build'
import { registerItemPinyin } from '../lib/pinyin'
import u01 from './units/u01.json'
import u02 from './units/u02.json'
import u03 from './units/u03.json'
import u04 from './units/u04.json'
import u05 from './units/u05.json'
import u06 from './units/u06.json'
import u07 from './units/u07.json'
import u08 from './units/u08.json'
import u09 from './units/u09.json'
import u10 from './units/u10.json'

export const content = buildContent([u01, u02, u03, u04, u05, u06, u07, u08, u09, u10])
registerItemPinyin([...content.items.values()])

export const { units, items, lessons, lessonOrder } = content

export function getItem(id: string) {
  const it = items.get(id)
  if (!it) throw new Error(`Unknown item ${id}`)
  return it
}

export const SMD_BASE =
  'https://www.languagecouncils.sg/mandarin/en/learning-resources/singaporean-mandarin-database'
