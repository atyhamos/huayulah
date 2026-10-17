import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { content } from '../content'
import { dueCardIds } from '../data/actions'
import { useApp } from '../store/app'
import { Icon, type IconName } from './icons'
import { Medal } from './ui'

function Tab({ to, icon, label, badge }: { to: string; icon: IconName; label: string; badge?: number }) {
  // the grammar track lives under Learn too
  const path = useLocation().pathname
  const also = to === '/' && path.startsWith('/grammar')
  return (
    <NavLink
      to={to}
      end={to === '/'}
      aria-label={label}
      className={({ isActive }) =>
        `relative flex items-center justify-center gap-1.5 rounded-full py-2.5 font-display text-sm font-bold transition-all duration-300 ${
          isActive || also ? 'flex-[1.6] bg-brand-600 px-4 text-white' : 'flex-1 text-slate-500 hover:text-ink'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative shrink-0">
            <Icon name={icon} className="h-6 w-6" />
            {!!badge && (
              <span
                className="absolute -right-2.5 -top-2 min-w-[18px] rounded-full bg-sg px-1 text-center text-[10px] font-bold leading-[18px] text-white ring-2 ring-surface"
                data-testid="due-badge"
              >
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </span>
          {(isActive || also) && <span className="truncate">{label}</span>}
        </>
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
      {syncError && (
        <div className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-800 dark:text-amber-200">
          <Icon name="warning" className="h-4 w-4 shrink-0" /> {syncError}
        </div>
      )}
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-32 pt-4">
        <Outlet />
      </main>
      <nav className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-10 px-4">
        <div className="pointer-events-auto mx-auto flex max-w-sm gap-1 rounded-full bg-surface/95 p-1.5 shadow-[0_12px_30px_-12px_rgb(20_40_30/0.45)] ring-1 ring-slate-200 backdrop-blur">
          <Tab to="/" icon="map" label="Line map" />
          <Tab to="/review" icon="cards" label="Review" badge={due.review.length + due.fresh.length} />
          <Tab to="/words" icon="book" label="Words" />
          <Tab to="/reader" icon="camera" label="Reader" />
          <Tab to="/profile" icon="otter" label="Me" />
        </div>
      </nav>
    </div>
  )
}

export function Toasts() {
  const toasts = useApp((st) => st.toasts)
  const dismiss = useApp((st) => st.dismissToast)
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className="pointer-events-auto flex w-full max-w-sm animate-pop items-center gap-3 rounded-3xl bg-surface p-3 text-left shadow-[0_16px_40px_-16px_rgb(20_40_30/0.5)] ring-1 ring-slate-200"
        >
          {t.medal ? (
            <Medal char={t.medal} earned colorIndex={t.medalColor ?? 0} size={44} />
          ) : (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
              <Icon name={t.icon ?? 'sparkle'} className="h-6 w-6" />
            </span>
          )}
          <span>
            <span className="block font-display font-bold">{t.title}</span>
            {t.body && <span className="block text-sm text-slate-500">{t.body}</span>}
          </span>
        </button>
      ))}
    </div>
  )
}
