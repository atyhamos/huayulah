import { useCallback, useState } from 'react'
import { getItem } from '../../content'
import { useApp } from '../../store/app'
import { useSpeak } from '../AudioButton'
import { Hanzi } from '../Hanzi'
import { SgBadge } from '../ui'
import { CheckBar } from './CheckBar'
import type { ExProps } from './types'

export function SgPick({ ex, locked, onSubmit }: ExProps<'sgpick'>) {
  const it = getItem(ex.itemId)
  const [picked, setPicked] = useState<string | null>(null)
  const always = useApp((s) => s.s.settings.pinyinMode === 'always')
  const say = useSpeak()
  const check = useCallback(() => picked && onSubmit({ correct: picked === ex.answer }), [picked, ex.answer, onSubmit])
  return (
    <div className="animate-pop">
      <SgBadge className="mb-3" />
      <h2 className="mb-8 text-2xl font-bold">
        Which would a Singaporean say for “<span className="text-brand-600">{it.english}</span>”?
      </h2>
      <div className="grid gap-3">
        {ex.options.map((h) => {
          const state = locked ? (h === ex.answer ? 'right' : h === picked ? 'wrong' : 'idle') : h === picked ? 'picked' : 'idle'
          const cls = {
            idle: 'border-slate-200',
            picked: 'border-sky-400 bg-sky-50',
            right: 'border-brand-500 bg-brand-50',
            wrong: 'border-rose-400 bg-rose-50 animate-shake',
          }[state]
          return (
            <button
              key={h}
              type="button"
              disabled={locked}
              data-testid="option"
              data-correct={h === ex.answer ? 'true' : undefined}
              onClick={() => {
                setPicked(h)
                say(h)
              }}
              className={`rounded-2xl border-2 border-b-4 px-3 py-4 transition ${cls}`}
            >
              <Hanzi text={h} pinyin={h === it.hanzi ? it.pinyin : h === it.standard?.hanzi ? it.standard.pinyin : undefined} showPinyin={always || locked} className="text-3xl" />
              {locked && h === it.standard?.hanzi && <span className="ml-2 text-sm text-slate-500">(China)</span>}
            </button>
          )
        })}
      </div>
      {!locked && <CheckBar disabled={!picked} onCheck={check} />}
    </div>
  )
}
