/** How characters are built: parts, radicals and families (from Make Me a Hanzi; see scripts/gen-chars.ts). */
import { hanChars } from '../lib/pinyin'
import charsJson from './chars.generated.json'
import componentsJson from './components.json'
import { content } from './index'
import { MY_UNIT } from './custom'

export interface CharInfo {
  d?: string
  py?: string
  r: string
  p: string[]
  e?: { t: string; h?: string; s?: string; ph?: string }
}

const chars = charsJson as Record<string, CharInfo>
const components = componentsJson as Record<string, { n: string; m?: string }>

export const charInfo = (c: string): CharInfo | undefined => chars[c]

/** Short English name for a part, e.g. 饣 → "food", falling back to the character's own meaning. */
export function partName(p: string): string | undefined {
  return components[p]?.n ?? chars[p]?.d?.split(/[;,]/)[0]?.trim()
}
export const partMnemonic = (p: string): string | undefined => components[p]?.m

/** Hand-named parts that carry a meaning (the ones with a mnemonic), for quiz options. */
export const meaningParts = (): string[] => Object.keys(components).filter((k) => components[k].m)
export const componentName = (p: string): string | undefined => components[p]?.n

/** Parts worth showing (a character "made of" only one stroke radical isn't helpful). */
export function shownParts(c: string): string[] {
  const info = chars[c]
  if (!info) return []
  return info.p.length >= 2 ? info.p : []
}

let familyIndex: Map<string, string[]> | null = null

/** Course characters grouped by the parts they contain (a part's "family"), biggest first. */
export function families(): Map<string, string[]> {
  if (familyIndex) return familyIndex
  const map = new Map<string, string[]>()
  const seen = new Set<string>()
  for (const it of content.items.values()) {
    if (it.unitId === MY_UNIT) continue
    for (const c of hanChars(it.hanzi)) {
      if (seen.has(c)) continue
      seen.add(c)
      for (const p of new Set(shownParts(c))) {
        const list = map.get(p) ?? []
        list.push(c)
        map.set(p, list)
      }
    }
  }
  familyIndex = new Map([...map].filter(([, l]) => l.length >= 2).sort((a, b) => b[1].length - a[1].length))
  return familyIndex
}

export const familyOf = (radical: string): string[] => families().get(radical) ?? []

/** Course items that use a character, course order. */
export function itemsWithChar(c: string) {
  return [...content.items.values()].filter((it) => it.unitId !== MY_UNIT && it.hanzi.includes(c))
}
