import { useCallback, useState } from 'react'
import { getItem } from '../../content'
import { AudioButton } from '../AudioButton'
import { Hanzi } from '../Hanzi'
import { CheckBar } from './CheckBar'
import { OptionRow, optionState, Prompt } from './parts'
import type { ExProps } from './types'

export function ToneChoice({ ex, locked, onSubmit }: ExProps<'tone'>) {
  const it = getItem(ex.itemId)
  const [picked, setPicked] = useState<string | null>(null)
  const check = useCallback(() => picked && onSubmit({ correct: picked === ex.answer }), [picked, ex.answer, onSubmit])
  return (
    <div className="animate-pop">
      <Prompt sub={it.english}>Pick the right pinyin</Prompt>
      <div className="mb-8 flex items-center justify-center gap-4">
        <div className="tile px-5 py-3">
          <Hanzi text={it.hanzi} showPinyin={false} className="text-5xl" />
        </div>
        <AudioButton text={it.hanzi} />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {ex.options.map((p) => (
          <OptionRow
            key={p}
            state={optionState(p, picked, ex.answer, locked)}
            disabled={locked}
            data-testid="option"
            data-correct={p === ex.answer ? 'true' : undefined}
            onClick={() => setPicked(p)}
          >
            <span className="block text-center text-xl">{p}</span>
          </OptionRow>
        ))}
      </div>
      {!locked && <CheckBar disabled={!picked} onCheck={check} />}
    </div>
  )
}
