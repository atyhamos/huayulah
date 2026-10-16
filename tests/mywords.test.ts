import { describe, expect, it } from 'vitest'
import { content } from '../src/content'
import { customItemId, syncCustomItems } from '../src/content/custom'
import { addCustomItem, completeMyWords, dueCardIds, myWordsLessonItems, removeCustomItem } from '../src/data/actions'
import { mergeStates } from '../src/data/merge'
import { cardId, emptyState, normalizeState, type CustomItem } from '../src/data/types'
import { installPinyinEngine } from '../src/lib/pinyinEngine'
import { readText, segment } from '../src/lib/reader'

const word = (hanzi: string, english: string, addedAt = 1): CustomItem => ({ id: customItemId(hanzi), hanzi, pinyin: 'x', english, addedAt })

describe('reader', () => {
  it('splits text into the longest known words, keeping unknown stretches short', () => {
    const toks = segment('我要咖啡乌，谢谢')
    expect(toks.map((t) => t.text)).toContain('咖啡乌')
    expect(toks.find((t) => t.text === '咖啡乌')?.item?.english).toMatch(/kopi/i)
    // punctuation is dropped, unknown text is kept in ≤4-character pieces
    expect(toks.every((t) => !t.text.includes('，'))).toBe(true)
    const unknown = segment('龘龘龘龘龘龘')
    expect(unknown.map((t) => t.text)).toEqual(['龘龘龘龘', '龘龘'])
  })

  it('reads pasted text offline into lines with pinyin', () => {
    installPinyinEngine([...content.items.values()])
    const r = readText('本店星期一休息。\n请勿吸烟')
    expect(r.source).toBe('offline')
    expect(r.lines.map((l) => l.zh)).toEqual(['本店星期一休息', '请勿吸烟'])
    expect(r.lines[0].pinyin).toMatch(/xiū xi/)
    expect(r.lines[0].words.some((w) => w.itemId)).toBe(true)
  })
})

describe('my words', () => {
  it('adds, studies and removes a word with its flashcards', () => {
    const w = word('卤面', 'lor mee')
    let s = addCustomItem(emptyState(), w).state
    syncCustomItems(s.customItems)
    expect(content.items.get(w.id)?.english).toBe('lor mee')
    expect(myWordsLessonItems(s, 6, new Date())).toEqual([w.id])

    const r = completeMyWords(s, { itemIds: [w.id], mistakesByItem: {}, maxCombo: 3, answered: 4, correct: 4 }, content, new Date(2026, 3, 1))
    s = r.state
    expect(r.info.newWords).toBe(1)
    expect(s.cards[cardId(w.id, 'read')]).toBeTruthy()
    expect(r.dirty.cards).toContain(cardId(w.id, 'say'))
    expect(dueCardIds(s, new Date(2026, 3, 9), content).review).toContain(cardId(w.id, 'read'))

    const gone = removeCustomItem(s, w.id)
    expect(gone.state.customItems[w.id]).toBeUndefined()
    expect(gone.state.cards[cardId(w.id, 'read')]).toBeUndefined()
    expect(gone.dirty.cards).toEqual([cardId(w.id, 'read'), cardId(w.id, 'say')])
    syncCustomItems(gone.state.customItems)
    expect(content.items.has(w.id)).toBe(false)
  })

  it('survives old saves and merges guest words into an account', () => {
    expect(normalizeState({ stats: emptyState().stats }).customItems).toEqual({})
    const a = word('罗惹', 'rojak')
    const b = word('薄饼', 'popiah')
    const account = addCustomItem(emptyState(), a).state
    const guest = addCustomItem(emptyState(), b).state
    expect(Object.keys(mergeStates(account, guest).customItems).sort()).toEqual([a.id, b.id].sort())
  })
})
