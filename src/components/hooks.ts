import { useApp } from '../store/app'
import { cardId } from '../data/types'

/** Pinyin fade: in "auto" mode pinyin hides once a word's memory is stable for a week. */
export const PINYIN_FADE_STABILITY = 7

export function usePinyinVisible() {
  const mode = useApp((s) => s.s.settings.pinyinMode)
  const cards = useApp((s) => s.s.cards)
  return (itemId: string): boolean => {
    if (mode === 'always') return true
    if (mode === 'never') return false
    const c = cards[cardId(itemId, 'read')]
    return !c || c.stability < PINYIN_FADE_STABILITY
  }
}
