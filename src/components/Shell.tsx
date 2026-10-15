import { NavLink, Outlet } from 'react-router-dom'
import { content } from '../content'
import { dueCardIds } from '../data/actions'
import { dayKey } from '../lib/dates'
import { currentStreak } from '../lib/streak'
import { levelInfo } from '../lib/xp'
import { useApp } from '../store/app'
import { Ring } from './ui'

export function TopBar() {
  const s = useApp((st) => st.s)
  const today = dayKey()
  const st = currentStreak(s.stats, today)
  const todayXp = s.days[today]?.xp ?? 0
  const lvl = levelInfo(s.stats.xp)
  return (
    <header className="sticky top-0 z-10 border-b-2 border-slate-100 bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-2">
        <span className="font-han text-xl font-black text-brand-600">
          华语 <span className="font-sans text-sg">Lah!</span>
        </span>
        <div className="flex items-center gap-4 text-sm font-bold">
          <span className={st.doneToday ? 'text-orange-500' : 'text-slate-400'} title={st.atRisk ? 'Do a lesson today to keep your streak!' : 'Day streak'} data-testid="streak">
            🔥 {st.streak}
          </span>
          {s.stats.freezes > 0 && (
            <span className="text-sky-500" title="Streak freezes">
              🧊 {s.stats.freezes}
            </span>
          )}
          <span className="text-amber-500" title={`Level ${lvl.level} · ${s.stats.xp} XP`} data-testid="xp">
            ⚡ {s.stats.xp}
          </span>
          <Ring value={todayXp / s.settings.dailyGoal} size={34} color={todayXp >= s.settings.dailyGoal ? '#22c55e' : '#f59e0b'}>
            <span className="text-[10px]">{Math.min(todayXp, 999)}</span>
          </Ring>
        </div>
      </div>
    </header>
  )
}

function Tab({ to, icon, label, badge }: { to: string; icon: string; label: string; badge?: number }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-xs font-bold ${isActive ? 'bg-sky-50 text-sky-600' : 'text-slate-400'}`
      }
    >
      <span className="text-2xl leading-none">{icon}</span>
      {label}
      {!!badge && (
        <span className="absolute right-[22%] top-0 min-w-5 rounded-full bg-sg px-1 text-[10px] leading-5 text-white" data-testid="due-badge">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  )
}

export function Shell() {
  const s = useApp((st) => st.s)
  const due = dueCardIds(s, new Date(), content)
  const syncError = useApp((st) => st.syncError)
  return (
    <div className="flex min-h-full flex-col">
      <TopBar />
      {syncError && <div className="bg-amber-100 px-4 py-1 text-center text-xs text-amber-800 dark:text-amber-200">⚠️ {syncError}</div>}
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-28 pt-4">
        <Outlet />
      </main>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-10 border-t-2 border-slate-100 bg-surface px-2 pt-1.5">
        <div className="mx-auto flex max-w-xl gap-1">
          <Tab to="/" icon="🏠" label="Learn" />
          <Tab to="/review" icon="🃏" label="Review" badge={due.review.length + due.fresh.length} />
          <Tab to="/words" icon="📚" label="Words" />
          <Tab to="/profile" icon="👤" label="Me" />
        </div>
      </nav>
    </div>
  )
}

export function Toasts() {
  const toasts = useApp((st) => st.toasts)
  const dismiss = useApp((st) => st.dismissToast)
  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className="pointer-events-auto flex w-full max-w-sm animate-pop items-center gap-3 rounded-2xl border-2 border-slate-200 bg-surface p-3 text-left shadow-lg"
        >
          <span className="text-3xl">{t.icon}</span>
          <span>
            <span className="block font-bold">{t.title}</span>
            {t.body && <span className="block text-sm text-slate-500">{t.body}</span>}
          </span>
        </button>
      ))}
    </div>
  )
}
