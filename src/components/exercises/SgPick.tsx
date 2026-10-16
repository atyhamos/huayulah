import { useCallback, useState } from 'react'
import { getItem } from '../../content'
import { useApp } from '../../store/app'
import { useSpeak } from '../AudioButton'
import { Hanzi } from '../Hanzi'
import { SgBadge, Tile } from '../ui'
import { CheckBar } from './CheckBar'
import { optionState, Prompt } from './parts'
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
      <Prompt>
        Which would a Singaporean say for “<span className="text-brand-600">{it.english}</span>”?
      </Prompt>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        {ex.options.map((h) => (
          <Tile
            key={h}
            state={optionState(h, picked, ex.answer, locked)}
            disabled={locked}
            data-testid="option"
            data-correct={h === ex.answer ? 'true' : undefined}
            onClick={() => {
              setPicked(h)
              say(h)
            }}
            className="flex min-h-28 flex-col items-center justify-center px-2 py-3"
          >
            <Hanzi text={h} pinyin={h === it.hanzi ? it.pinyin : h === it.standard?.hanzi ? it.standard.pinyin : undefined} showPinyin={always || locked} className="text-3xl" />
            {locked && h === it.standard?.hanzi && <span className="mt-1 text-xs font-bold text-slate-500">China</span>}
          </Tile>
        ))}
      </div>
      {!locked && <CheckBar disabled={!picked} onCheck={check} />}
    </div>
  )
}
