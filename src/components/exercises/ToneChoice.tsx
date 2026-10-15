import { useCallback, useState } from 'react'
import { getItem } from '../../content'
import { AudioButton } from '../AudioButton'
import { Hanzi } from '../Hanzi'
import { CheckBar } from './CheckBar'
import type { ExProps } from './types'

export function ToneChoice({ ex, locked, onSubmit }: ExProps<'tone'>) {
  const it = getItem(ex.itemId)
  const [picked, setPicked] = useState<string | null>(null)
  const check = useCallback(() => picked && onSubmit({ correct: picked === ex.answer }), [picked, ex.answer, onSubmit])
  return (
    <div className="animate-pop">
      <h2 className="mb-6 text-2xl font-bold">Pick the right pinyin</h2>
      <div className="mb-8 flex flex-col items-center gap-3">
        <Hanzi text={it.hanzi} showPinyin={false} className="text-6xl" />
        <p className="text-slate-500">{it.english}</p>
        <AudioButton text={it.hanzi} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {ex.options.map((p) => {
          const state = locked ? (p === ex.answer ? 'right' : p === picked ? 'wrong' : 'idle') : p === picked ? 'picked' : 'idle'
          const cls = {
            idle: 'border-slate-200',
            picked: 'border-sky-400 bg-sky-50',
            right: 'border-brand-500 bg-brand-50',
            wrong: 'border-rose-400 bg-rose-50 animate-shake',
          }[state]
          return (
            <button
              key={p}
              type="button"
              disabled={locked}
              data-testid="option"
              data-correct={p === ex.answer ? 'true' : undefined}
              onClick={() => setPicked(p)}
              className={`rounded-2xl border-2 border-b-4 px-3 py-4 text-xl font-semibold transition ${cls}`}
            >
              {p}
            </button>
          )
        })}
      </div>
      {!locked && <CheckBar disabled={!picked} onCheck={check} />}
    </div>
  )
}
