import { useCallback, useState } from 'react'
import { charInfo } from '../../content/chars'
import { useSpeak } from '../AudioButton'
import { CheckBar } from './CheckBar'
import { OptionRow, optionState, Prompt } from './parts'
import type { ExProps } from './types'

/** Building blocks: characters that share a part, and what that part means. */
export function PartsQuiz({ ex, locked, onSubmit }: ExProps<'parts'>) {
  const [picked, setPicked] = useState<string | null>(null)
  const say = useSpeak()
  const check = useCallback(() => picked && onSubmit({ correct: picked === ex.answer }), [picked, ex.answer, onSubmit])
  const chars = [ex.char, ...ex.peers]
  return (
    <div className="animate-pop">
      <Prompt sub="Characters that share a part often share a meaning.">What is this part about?</Prompt>
      <div className="mb-4 flex justify-center gap-3">
        {chars.map((c) => (
          <button key={c} type="button" className="tile px-4 pb-2 pt-1.5" onClick={() => say(c)}>
            <span className="block text-xs text-slate-500">{charInfo(c)?.py}</span>
            <span className="font-han text-4xl">{c}</span>
          </button>
        ))}
      </div>
      <p className="mb-6 text-center text-slate-500">
        They all contain{' '}
        <span className="mx-1 inline-grid h-11 w-11 place-items-center rounded-xl bg-brand-600 align-middle font-han text-2xl text-white" data-testid="shared-part">
          {ex.part}
        </span>
      </p>
      <div className="flex flex-col gap-2.5">
        {ex.options.map((o, i) => (
          <OptionRow
            key={o}
            letter={'ABCD'[i]}
            state={optionState(o, picked, ex.answer, locked)}
            disabled={locked}
            data-testid="option"
            data-correct={o === ex.answer ? 'true' : undefined}
            onClick={() => setPicked(o)}
          >
            {o}
          </OptionRow>
        ))}
      </div>
      {!locked && <CheckBar disabled={!picked} onCheck={check} />}
    </div>
  )
}
