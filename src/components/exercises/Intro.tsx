import { useEffect } from 'react'
import { getItem } from '../../content'
import { AudioButton, useSpeak } from '../AudioButton'
import { Hanzi } from '../Hanzi'
import { Icon } from '../icons'
import { SgBadge } from '../ui'
import { CheckBar } from './CheckBar'
import type { ExProps } from './types'

export function Intro({ ex, locked, onSubmit }: ExProps<'intro'>) {
  const it = getItem(ex.itemId)
  const say = useSpeak()
  useEffect(() => {
    const t = setTimeout(() => say(it.hanzi), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [it.id])
  const example = it.example?.zh.replace(/ /g, '')
  return (
    <div className="animate-pop">
      <p className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-amber-800">
        <Icon name="sparkle" className="h-4 w-4" /> New word
      </p>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="tile px-7 pb-4 pt-3">
          <Hanzi text={it.hanzi} pinyin={it.pinyin} showPinyin className="text-6xl sm:text-7xl" />
        </div>
        <div className="flex items-center gap-3">
          <AudioButton text={it.hanzi} />
          <p className="font-display text-2xl font-extrabold">{it.english}</p>
        </div>
        {it.sg && <SgBadge />}
        {it.standard && (
          <p className="text-sm text-slate-500">
            Elsewhere: <Hanzi text={it.standard.hanzi} pinyin={it.standard.pinyin} showPinyin={false} className="text-base" /> ({it.standard.pinyin})
          </p>
        )}
        {it.note && (
          <p className="flex max-w-md gap-2 rounded-2xl bg-amber-50 p-3 text-left text-sm text-amber-900 dark:text-amber-200">
            <Icon name="bulb" className="h-5 w-5 shrink-0 text-amber-500" />
            {it.note}
          </p>
        )}
        {it.example && example && (
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-surface text-left ring-1 ring-slate-200">
            <div className="peranakan h-2" />
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <Hanzi text={example} showPinyin className="text-2xl leading-loose" />
                <AudioButton text={example} size="sm" slow={false} />
              </div>
              <p className="mt-1 text-slate-600">{it.example.en}</p>
            </div>
          </div>
        )}
      </div>
      {!locked && <CheckBar disabled={false} label="Continue" onCheck={() => onSubmit({ correct: true })} />}
    </div>
  )
}
