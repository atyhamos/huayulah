import type { ReactNode } from 'react'
import type { TileState } from '../ui'

/** Exercise heading. */
export function Prompt({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight">{children}</h2>
      {sub && <p className="mt-1 text-slate-500">{sub}</p>}
    </div>
  )
}

const ROW_STATE: Record<TileState, string> = {
  idle: 'bg-surface ring-slate-200 hover:ring-slate-300',
  picked: 'bg-sky-50 ring-sky-400 -translate-y-0.5',
  right: 'bg-brand-50 ring-brand-400',
  wrong: 'bg-rose-50 ring-rose-400 animate-shake',
  done: 'bg-surface ring-slate-100 opacity-40',
}

/** An English answer choice, lettered like a kopitiam order number. */
export function OptionRow({
  letter,
  state,
  children,
  ...rest
}: { letter?: string; state: TileState; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      data-state={state}
      className={`flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-3 text-left ring-2 ring-inset transition ${ROW_STATE[state]}`}
    >
      {letter && (
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-sm font-extrabold ${
            state === 'picked' ? 'bg-sky-500 text-white' : state === 'right' ? 'bg-brand-600 text-white' : state === 'wrong' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {letter}
        </span>
      )}
      <span className="min-w-0 flex-1 font-semibold">{children}</span>
    </button>
  )
}

export function optionState(id: string, picked: string | null, answer: string, locked: boolean): TileState {
  if (locked) return id === answer ? 'right' : id === picked ? 'wrong' : 'idle'
  return id === picked ? 'picked' : 'idle'
}
