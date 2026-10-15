import { useEffect, useMemo, useRef, useState } from 'react'
import { getItem } from '../../content'
import { shuffle } from '../../lib/random'
import { sfx } from '../../lib/sfx'
import { useApp } from '../../store/app'
import { useSpeak } from '../AudioButton'
import { Hanzi } from '../Hanzi'
import { usePinyinVisible } from '../hooks'
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
    const isSel = sel?.side === side && sel.id === id
    const isDone = done.has(id)
    const isBad = bad === `${side}:${id}`
    return (
      <button
        key={side + id}
        type="button"
        data-testid={`match-${side}`}
        data-id={id}
        onClick={() => tap(side, id)}
        disabled={isDone}
        className={`min-h-16 rounded-2xl border-2 border-b-4 px-2 py-2 transition ${
          isDone
            ? 'border-slate-100 bg-slate-50 text-slate-300'
            : isBad
              ? 'animate-shake border-rose-400 bg-rose-50'
              : isSel
                ? 'border-sky-400 bg-sky-50'
                : 'border-slate-200 bg-white'
        }`}
      >
        {side === 'zh' ? (
          <Hanzi text={it.hanzi} pinyin={it.pinyin} showPinyin={showPinyin(id) && !isDone} className="text-2xl" />
        ) : (
          <span className="text-sm font-semibold sm:text-base">{it.english}</span>
        )}
      </button>
    )
  }

  return (
    <div className="animate-pop">
      <h2 className="mb-6 text-2xl font-bold">Tap the matching pairs</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3">{left.map((id) => cell('zh', id))}</div>
        <div className="flex flex-col gap-3">{right.map((id) => cell('en', id))}</div>
      </div>
    </div>
  )
}
