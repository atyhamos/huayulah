import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { content } from '../content'
import { cardId } from '../data/types'
import { Hanzi } from '../components/Hanzi'
import { SgBadge, StrengthBars } from '../components/ui'
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
      <h1 className="mb-1 text-2xl font-extrabold">Word bank</h1>
      <p className="mb-4 text-slate-500">
        {learnedCount} of {all.length} words learned
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search 汉字, pinyin or English"
        className="mb-3 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-sky-400"
        data-testid="word-search"
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['learned', 'Learned'],
            ['weak', 'Weak'],
            ['sg', '🇸🇬 SG words'],
            ['all', 'All'],
          ] as const
        ).map(([f, label]) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border-2 px-3 py-1 text-sm font-bold ${filter === f ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-500'}`}
          >
            {label}
          </button>
        ))}
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="rounded-full border-2 border-slate-200 bg-white px-3 py-1 text-sm font-bold text-slate-500"
        >
          <option value="all">All units</option>
          {content.units.map((u, i) => (
            <option key={u.id} value={u.id}>
              {i + 1}. {u.title}
            </option>
          ))}
        </select>
      </div>
      {list.length === 0 && (
        <p className="py-10 text-center text-slate-400">{filter === 'learned' && !q ? 'Finish a lesson to start your collection.' : 'Nothing matches.'}</p>
      )}
      <ul className="divide-y-2 divide-slate-100">
        {list.map((it) => {
          const card = cards[cardId(it.id, 'read')]
          return (
            <li key={it.id}>
              <Link to={`/words/${it.id}`} className={`flex items-center gap-3 py-3 ${card ? '' : 'opacity-50'}`} data-testid="word-row">
                <Hanzi text={it.hanzi} pinyin={it.pinyin} showPinyin={false} className="min-w-20 text-3xl" />
                <span className="flex-1">
                  <span className="block font-semibold">{it.english}</span>
                  <span className="text-sm text-slate-400">{it.pinyin}</span>
                </span>
                {it.sg && <SgBadge />}
                {card ? <StrengthBars value={strength(card)} /> : <span className="text-xs text-slate-400">🔒</span>}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
