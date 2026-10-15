import { useEffect } from 'react'
import { getItem } from '../../content'
import { AudioButton, useSpeak } from '../AudioButton'
import { Hanzi } from '../Hanzi'
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
  return (
    <div className="animate-pop">
      <p className="mb-6 text-sm font-bold uppercase tracking-wider text-brand-600">New word</p>
      <div className="flex flex-col items-center gap-4 text-center">
        <Hanzi text={it.hanzi} pinyin={it.pinyin} showPinyin className="text-6xl sm:text-7xl" />
        <AudioButton text={it.hanzi} />
        <p className="text-2xl font-bold">{it.english}</p>
        {it.sg && <SgBadge />}
        {it.standard && (
          <p className="text-sm text-slate-500">
            Elsewhere: <Hanzi text={it.standard.hanzi} pinyin={it.standard.pinyin} showPinyin={false} className="text-base" /> ({it.standard.pinyin})
          </p>
        )}
        {it.note && <p className="max-w-md rounded-xl bg-amber-50 p-3 text-left text-sm text-amber-900 dark:text-amber-200">💡 {it.note}</p>}
        {it.example && (
          <div className="w-full max-w-md rounded-2xl border-2 border-slate-200 p-4 text-left">
            <div className="flex items-start justify-between gap-2">
              <Hanzi text={it.example.zh.replace(/ /g, '')} showPinyin className="text-2xl leading-loose" />
              <AudioButton text={it.example.zh.replace(/ /g, '')} size="sm" slow={false} />
            </div>
            <p className="mt-1 text-slate-600">{it.example.en}</p>
          </div>
        )}
      </div>
      {!locked && <CheckBar disabled={false} label="Continue" onCheck={() => onSubmit({ correct: true })} />}
    </div>
  )
}
