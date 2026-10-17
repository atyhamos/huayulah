import { NavLink } from 'react-router-dom'
import { Icon } from './icons'

/** Learn's two tracks: the line map (words) and grammar. */
export function TrackSwitch({ className = '' }: { className?: string }) {
  const tab = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 font-display text-sm font-bold transition ${
      isActive ? 'bg-surface text-ink shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-ink'
    }`
  return (
    <nav className={`flex gap-1 rounded-full bg-slate-100 p-1 ${className}`} aria-label="Track">
      <NavLink to="/" end className={tab} data-testid="track-lines">
        <Icon name="map" className="h-5 w-5" /> Line map
      </NavLink>
      <NavLink to="/grammar" className={tab} data-testid="track-grammar">
        <Icon name="brush" className="h-5 w-5" /> Grammar
      </NavLink>
    </nav>
  )
}
