import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { content } from '../content'
import { cardId } from '../data/types'
import { Hanzi } from '../components/Hanzi'
import { Icon, SgFlag, unitMeta } from '../components/icons'
import { StrengthBars } from '../components/ui'
import { looseKey } from '../lib/pinyin'
import { strength } from '../lib/srs'
import { useApp } from '../store/app'

type Filter = 'learned' | 'all' | 'sg' | 'weak'

export function WordsScreen() {
  const cards = useApp((st) => st.s.cards)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('learned')
  const [unit, setUnit] = useState('all')

  const all = useMemo(() => [...content.items.values()], [])
  const learnedCount = all.filter((i) => cards[cardId(i.id, 'read')]).length

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const key = looseKey(needle)
    return all.filter((it) => {
      const card = cards[cardId(it.id, 'read')]
      if (unit !== 'all' && it.unitId !== unit) return false
      if (filter === 'learned' && !card) return false
      if (filter === 'sg' && !it.sg) return false
      if (filter === 'weak' && (!card || strength(card) > 1)) return false
      if (!needle) return true
      return it.hanzi.includes(needle) || it.english.toLowerCase().includes(needle) || (key && looseKey(it.pinyin).includes(key))
    })
  }, [all, cards, q, filter, unit])

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Words</h1>
          <p className="font-han text-slate-400">字典</p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-extrabold tabular-nums text-brand-600">
            {learnedCount}
            <span className="text-base text-slate-400">/{all.length}</span>
          </p>
          <p className="text-xs text-slate-500">words collected</p>
        </div>
      </div>
      <div className="relative mb-3">
        <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search 汉字, pinyin or English"
          className="w-full rounded-full bg-surface py-3 pl-11 pr-4 outline-none ring-2 ring-inset ring-slate-200 focus:ring-sky-400"
          data-testid="word-search"
        />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['learned', 'Learned'],
            ['weak', 'Weak'],
            ['sg', 'SG words'],
            ['all', 'All'],
          ] as const
        ).map(([f, label]) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold transition ${filter === f ? 'bg-ink text-page' : 'bg-surface text-slate-500 ring-1 ring-slate-200'}`}
          >
            {f === 'sg' && <SgFlag />}
            {label}
          </button>
        ))}
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="rounded-full bg-surface px-3 py-1 text-sm font-bold text-slate-500 ring-1 ring-slate-200"
        >
          <option value="all">All units</option>
          {content.units.map((u) => (
            <option key={u.id} value={u.id}>
              {unitMeta(u.id).code} · {u.title}
            </option>
          ))}
        </select>
      </div>
      {list.length === 0 && (
        <p className="py-10 text-center text-slate-400">{filter === 'learned' && !q ? 'Finish a lesson to start your collection.' : 'Nothing matches.'}</p>
      )}
      <ul className="space-y-2">
        {list.map((it) => {
          const card = cards[cardId(it.id, 'read')]
          return (
            <li key={it.id}>
              <Link
                to={`/words/${it.id}`}
                className={`flex items-center gap-3 rounded-3xl bg-surface p-2 pr-4 ring-1 ring-slate-200 transition active:scale-[0.99] ${card ? '' : 'opacity-55'}`}
                data-testid="word-row"
              >
                <span className="tile grid min-h-14 min-w-14 place-items-center px-2 py-1">
                  <Hanzi text={it.hanzi} pinyin={it.pinyin} showPinyin={false} className="text-2xl" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="truncate">{it.english}</span>
                    {it.sg && <SgFlag className="h-3 w-4 shrink-0" />}
                  </span>
                  <span className="text-sm text-slate-400">{it.pinyin}</span>
                </span>
                {card ? <StrengthBars value={strength(card)} /> : <Icon name="lock" className="h-4 w-4 text-slate-400" />}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
