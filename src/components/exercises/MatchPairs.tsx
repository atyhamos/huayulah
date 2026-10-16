import { useEffect, useMemo, useRef, useState } from 'react'
import { getItem } from '../../content'
import { shuffle } from '../../lib/random'
import { sfx } from '../../lib/sfx'
import { useApp } from '../../store/app'
import { useSpeak } from '../AudioButton'
import { Hanzi } from '../Hanzi'
import { usePinyinVisible } from '../hooks'
import type { TileState } from '../ui'
import { Prompt } from './parts'
import type { ExProps } from './types'

type Side = 'zh' | 'en'

export function MatchPairs({ ex, locked, onSubmit }: ExProps<'match'>) {
  const left = useMemo(() => shuffle(ex.itemIds), [ex.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const right = useMemo(() => shuffle(ex.itemIds), [ex.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const [sel, setSel] = useState<{ side: Side; id: string } | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())
  const [bad, setBad] = useState<string | null>(null)
  const wrong = useRef(new Set<string>())
  const showPinyin = usePinyinVisible()
  const sound = useApp((s) => s.s.settings.sound)
  const say = useSpeak()

  useEffect(() => {
    if (!locked && done.size === ex.itemIds.length) {
      const t = setTimeout(() => onSubmit({ correct: wrong.current.size === 0, wrongItemIds: [...wrong.current] }), 300)
      return () => clearTimeout(t)
    }
  }, [done, ex.itemIds.length, locked, onSubmit])

  const tap = (side: Side, id: string) => {
    if (done.has(id) || locked) return
    if (side === 'zh') say(getItem(id).hanzi)
    if (!sel || sel.side === side) {
      setSel({ side, id })
      return
    }
    if (sel.id === id) {
      setDone(new Set([...done, id]))
      if (sound) sfx.tap()
    } else {
      wrong.current.add(sel.side === 'zh' ? sel.id : id)
      setBad(`${side}:${id}`)
      setTimeout(() => setBad(null), 400)
    }
    setSel(null)
  }

  const cell = (side: Side, id: string) => {
    const it = getItem(id)
    const isDone = done.has(id)
    const state: TileState = isDone ? 'done' : bad === `${side}:${id}` ? 'wrong' : sel?.side === side && sel.id === id ? 'picked' : 'idle'
    const common = { type: 'button' as const, 'data-testid': `match-${side}`, 'data-id': id, 'data-state': state, onClick: () => tap(side, id), disabled: isDone }
    return side === 'zh' ? (
      <button key={side + id} {...common} className="tile flex min-h-16 items-center justify-center px-2 py-2">
        <Hanzi text={it.hanzi} pinyin={it.pinyin} showPinyin={showPinyin(id) && !isDone} className="text-2xl" />
      </button>
    ) : (
      <button
        key={side + id}
        {...common}
        className={`flex min-h-16 items-center rounded-2xl px-3 py-2 text-left text-sm font-semibold ring-2 ring-inset transition sm:text-base ${
          state === 'done'
            ? 'bg-surface text-slate-300 ring-slate-100'
            : state === 'wrong'
              ? 'animate-shake bg-rose-50 ring-rose-400'
              : state === 'picked'
                ? 'bg-sky-50 ring-sky-400'
                : 'bg-surface ring-slate-200'
        }`}
      >
        <span className={`mr-2 h-2 w-2 shrink-0 rounded-full ${isDone ? 'bg-brand-400' : 'bg-slate-300'}`} />
        {it.english}
      </button>
    )
  }

  return (
    <div className="animate-pop">
      <Prompt sub="Tap a tile, then its meaning">Match the pairs</Prompt>
      <div className="grid grid-cols-[2fr_3fr] gap-3">
        <div className="flex flex-col gap-3">{left.map((id) => cell('zh', id))}</div>
        <div className="flex flex-col gap-3">{right.map((id) => cell('en', id))}</div>
      </div>
    </div>
  )
}
