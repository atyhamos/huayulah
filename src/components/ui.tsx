import { useId, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon, SgFlag, type IconName } from './icons'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'blue'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-[0_8px_18px_-10px_var(--color-brand-700)] hover:bg-brand-500',
  blue: 'bg-sky-500 text-white shadow-[0_8px_18px_-10px_var(--color-sky-700)] hover:bg-sky-400',
  danger: 'bg-rose-500 text-white shadow-[0_8px_18px_-10px_var(--color-rose-700)] hover:bg-rose-400',
  secondary: 'bg-surface text-ink ring-2 ring-inset ring-slate-200 hover:bg-slate-50',
  ghost: 'bg-transparent text-slate-500 hover:bg-slate-100',
}

/** Pill button. */
export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      className={`inline-flex select-none items-center justify-center gap-2 rounded-full px-6 py-3.5 font-display text-[1.05rem] font-bold tracking-tight transition active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:active:scale-100 ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function ProgressBar({ value, className = '', color = 'bg-brand-500' }: { value: number; className?: string; color?: string }) {
  return (
    <div className={`h-3 w-full overflow-hidden rounded-full bg-slate-200 ${className}`}>
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${clamp01(value) * 100}%` }} />
    </div>
  )
}

export function Card({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div {...rest} className={`rounded-3xl border border-slate-200/80 bg-surface p-4 shadow-[0_10px_28px_-20px_rgb(30_60_45/0.45)] ${className}`}>
      {children}
    </div>
  )
}

export function SgBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-sg ${className}`}>
      <SgFlag /> SG word
    </span>
  )
}

/** 0–4 memory strength as four little beads. */
export function StrengthBars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`strength ${value} of 4`}>
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={`h-2 w-2 rounded-full ${i <= value ? 'bg-brand-500' : 'bg-slate-200'}`} />
      ))}
    </span>
  )
}

export type TileState = 'idle' | 'picked' | 'right' | 'wrong' | 'done'

/** A mahjong tile — ivory face with a jade back. Used for every Chinese answer choice. */
export function Tile({
  state = 'idle',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { state?: TileState }) {
  return (
    <button type="button" {...rest} data-state={state} className={`tile ${className}`}>
      {children}
    </button>
  )
}

/** Daily goal as a cup of kopi that fills up. */
export function KopiCup({ value, size = 44, className = '' }: { value: number; size?: number; className?: string }) {
  const id = useId()
  const v = clamp01(value)
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden>
      <defs>
        <clipPath id={id}>
          <path d="M10 17h24v11.5a12 12 0 0 1-24 0z" />
        </clipPath>
      </defs>
      <path d="M10 17h24v11.5a12 12 0 0 1-24 0z" fill="var(--color-surface)" />
      <rect
        x="9"
        y={17 + 24 * (1 - v)}
        width="26"
        height="26"
        fill="#8b5a3c"
        clipPath={`url(#${id})`}
        style={{ transition: 'y 0.8s ease' }}
      />
      {v > 0.05 && <rect x="9" y={17 + 24 * (1 - v)} width="26" height="1.6" fill="#d9b48a" clipPath={`url(#${id})`} style={{ transition: 'y 0.8s ease' }} />}
      <path d="M10 17h24v11.5a12 12 0 0 1-24 0z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M34 20h2.5a4.5 4.5 0 0 1 0 9H34M5.5 44.5h31" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      {v >= 1 && (
        <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" className="animate-float">
          <path d="M17 4q2.5 3 0 6t0 6" />
          <path d="M25 3q2.5 3 0 6t0 6" />
        </g>
      )}
    </svg>
  )
}

/** Lesson progress: an MRT train moving along the line, station ticks every quarter. */
export function TrainTrack({ value }: { value: number }) {
  const v = clamp01(value)
  return (
    <div className="relative h-8 flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)}>
      <div className="absolute inset-x-1 top-1/2 h-2 -translate-y-1/2 rounded-full bg-slate-200" />
      <div
        className="absolute left-1 top-1/2 h-2 -translate-y-1/2 rounded-full bg-brand-500 transition-[width] duration-500"
        style={{ width: `calc(${v * 100}% - ${v * 8}px)` }}
      />
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <span
          key={s}
          className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] bg-surface ${v >= s ? 'border-brand-500' : 'border-slate-300'}`}
          style={{ left: `calc(${s * 100}% - ${s * 8 - 4}px)` }}
        />
      ))}
      <span
        className="absolute top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl bg-surface text-brand-700 shadow-sm ring-2 ring-brand-500 transition-[left] duration-500"
        style={{ left: `calc(${v * 100}% - ${v * 8 - 4}px)` }}
      >
        <Icon name="train" className="h-5 w-5" />
      </span>
    </div>
  )
}

/** A stat with a custom icon, e.g. the streak lantern or XP coins. */
export function StatChip({ icon, value, label, tone, testId, glow = false }: { icon: IconName; value: ReactNode; label: string; tone: string; testId?: string; glow?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={label}>
      <Icon name={icon} className={`h-6 w-6 ${tone} ${glow ? 'animate-glow' : ''}`} />
      <span className="font-display text-lg font-extrabold tabular-nums" data-testid={testId}>
        {value}
      </span>
    </span>
  )
}

const MEDAL_COLORS = ['#cf5145', '#4669ad', '#42805d', '#d5a32b', '#d8708f', '#8b5a3c']

/** An achievement medal: a scalloped badge with one character in brush script. */
export function Medal({ char, earned, colorIndex = 0, size = 64 }: { char: string; earned: boolean; colorIndex?: number; size?: number }) {
  const color = earned ? MEDAL_COLORS[colorIndex % MEDAL_COLORS.length] : 'var(--color-slate-300)'
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <circle cx="32" cy="32" r="26" fill={color} />
      <circle cx="32" cy="32" r="28.5" fill="none" stroke={color} strokeWidth="5" strokeDasharray="0 7.46" strokeLinecap="round" />
      <circle cx="32" cy="32" r="21" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="3 3" />
      <text x="32" y="42" textAnchor="middle" fontSize="27" fill="#fff" fontFamily="var(--font-brush)">
        {char}
      </text>
    </svg>
  )
}

/** The app's name, set in the display face: "Huayu" in pandan green, "lah" in chilli red. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display font-extrabold tracking-tight ${className}`}>
      <span className="text-brand-700">Huayu</span>
      <span className="text-sg">lah</span>
    </span>
  )
}

const AVATAR_COLORS = ['bg-sky-500', 'bg-rose-500', 'bg-amber-500', 'bg-brand-600', 'bg-nyonya-500']

/** Round avatar showing a character (e.g. 板 for the boss), or Ah Tat for "you". */
export function Avatar({ label, otter = false, size = 40, seed = 0 }: { label?: string; otter?: boolean; size?: number; seed?: number }) {
  if (otter) {
    return (
      <span className="block shrink-0 overflow-hidden rounded-full bg-brand-100" style={{ width: size, height: size }}>
        <img src={`${import.meta.env.BASE_URL}otter/avatar.webp`} alt="" className="h-full w-full" draggable={false} />
      </span>
    )
  }
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full text-white ${/[\u3400-\u9fff]/.test(label ?? '') ? 'font-brush' : 'font-display font-extrabold'} ${AVATAR_COLORS[seed % AVATAR_COLORS.length]}`}
      style={{ width: size, height: size, fontSize: size * 0.48 }}
    >
      {label}
    </span>
  )
}

/** An ink stamp, as on a kopitiam loyalty card. */
export function Stamp({ value, label, tone, delay = 0, rotate = -8 }: { value: ReactNode; label: string; tone: string; delay?: number; rotate?: number }) {
  return (
    <div
      className={`grid aspect-square w-full max-w-28 animate-stamp place-items-center rounded-full border-[3px] border-double p-1 text-center ${tone}`}
      style={{ animationDelay: `${delay}ms`, ['--r' as string]: `${rotate}deg` }}
    >
      <div>
        <div className="font-display text-2xl font-extrabold leading-none tabular-nums">{value}</div>
        <div className="mt-1 text-[10px] font-bold uppercase tracking-widest">{label}</div>
      </div>
    </div>
  )
}

/** Round back button for sub-pages. */
export function BackButton({ label = 'Back' }: { label?: string }) {
  const nav = useNavigate()
  return (
    <button
      type="button"
      onClick={() => nav(-1)}
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-full bg-surface text-slate-500 shadow-sm ring-1 ring-slate-200 transition active:scale-95"
    >
      <Icon name="back" className="h-5 w-5" />
    </button>
  )
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v))
}
