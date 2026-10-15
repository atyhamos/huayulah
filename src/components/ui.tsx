import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'blue'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-500 text-white border-brand-700 hover:bg-brand-400',
  blue: 'bg-sky-500 text-white border-sky-700 hover:bg-sky-400',
  danger: 'bg-rose-500 text-white border-rose-700 hover:bg-rose-400',
  secondary: 'bg-surface text-slate-700 border-slate-300 border-2 hover:bg-slate-50',
  ghost: 'bg-transparent text-slate-500 border-transparent hover:bg-slate-100',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      className={`select-none rounded-2xl border-b-4 px-5 py-3 font-bold uppercase tracking-wide transition active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400 disabled:active:translate-y-0 ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function ProgressBar({ value, className = '', color = 'bg-brand-500' }: { value: number; className?: string; color?: string }) {
  return (
    <div className={`h-4 w-full overflow-hidden rounded-full bg-slate-200 ${className}`}>
      <div
        className={`h-full rounded-full ${color} transition-all duration-500`}
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      >
        <div className="mx-2 mt-1 h-1 rounded-full bg-surface/30" />
      </div>
    </div>
  )
}

export function Ring({ value, size = 36, stroke = 4, children, color = '#f59e0b' }: { value: number; size?: number; stroke?: number; children?: ReactNode; color?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-slate-200)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-xs font-bold">{children}</div>
    </div>
  )
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl border-2 border-slate-200 bg-surface p-4 ${className}`}>{children}</div>
}

export function SgBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-sg/10 px-2 py-0.5 text-xs font-bold text-sg ${className}`}>
      🇸🇬 SG
    </span>
  )
}

export function StrengthBars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-end gap-0.5" aria-label={`strength ${value} of 4`}>
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={`w-1.5 rounded-sm ${i <= value ? 'bg-brand-500' : 'bg-slate-200'}`} style={{ height: 4 + i * 3 }} />
      ))}
    </span>
  )
}

export const Icon = {
  speaker: (cls = 'h-6 w-6') => (
    <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden>
      <path d="M3 10v4a1 1 0 0 0 1 1h3l4.3 3.6A1 1 0 0 0 13 17.8V6.2a1 1 0 0 0-1.7-.8L7 9H4a1 1 0 0 0-1 1Z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M19 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  ),
  close: (cls = 'h-6 w-6') => (
    <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  mic: (cls = 'h-6 w-6') => (
    <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  ),
  back: (cls = 'h-6 w-6') => (
    <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  ),
}
