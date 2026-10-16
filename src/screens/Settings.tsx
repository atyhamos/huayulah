import { useEffect, useRef, useState } from 'react'
import { firebaseEnabled } from '../data/firebase'
import { normalizeState, type AppState, type PinyinMode, type Theme } from '../data/types'
import { Icon, type IconName } from '../components/icons'
import { AiKeyCard } from '../components/AiKeyCard'
import { BackButton, Button, Card, KopiCup } from '../components/ui'
import { sfx } from '../lib/sfx'
import { chineseVoices, onVoicesChanged, speak, voiceHelp, voiceStatus } from '../lib/tts'
import { recognitionSupported } from '../lib/speech'
import { GOAL_OPTIONS } from '../lib/xp'
import { IS_ARTIFACT } from '../env'
import { useApp } from '../store/app'

export function SettingsScreen() {
  const s = useApp((st) => st.s)
  const user = useApp((st) => st.user)
  const update = useApp((st) => st.updateSettings)
  const signOut = useApp((st) => st.signOut)
  const signIn = useApp((st) => st.signIn)
  const reset = useApp((st) => st.resetProgress)
  const replace = useApp((st) => st.replaceState)
  const toast = useApp((st) => st.toast)
  const [confirmReset, setConfirmReset] = useState(false)
  const [voices, setVoices] = useState(chineseVoices())
  const status = voices.length ? 'ok' : voiceStatus()
  const fileRef = useRef<HTMLInputElement>(null)
  const set = s.settings

  useEffect(() => {
    const off = onVoicesChanged(() => setVoices(chineseVoices()))
    return () => {
      off()
    }
  }, [])

  const exportData = () => {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `huayu-lah-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importData = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text()) as Partial<AppState>
      if (!parsed || typeof parsed !== 'object' || !parsed.stats) throw new Error('This isn’t a 华语 Lah! backup file.')
      replace(normalizeState(parsed))
      toast({ icon: 'download', title: 'Backup restored' })
    } catch (e) {
      toast({ icon: 'warning', title: 'Import failed', body: e instanceof Error ? e.message : String(e) })
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <BackButton />
        <h1 className="font-display text-2xl font-extrabold">Settings</h1>
      </div>

      <Card>
        <Label>Daily goal — how strong is your kopi?</Label>
        <div className="grid grid-cols-4 gap-2">
          {GOAL_OPTIONS.map((g, i) => (
            <Choice key={g.xp} active={set.dailyGoal === g.xp} onClick={() => update({ dailyGoal: g.xp })}>
              <KopiCup value={(i + 1) / 4} size={34} className="mx-auto mb-1" />
              <span className="block leading-tight">{g.label}</span>
              <span className="text-xs font-semibold opacity-70">{g.xp} XP</span>
            </Choice>
          ))}
        </div>
      </Card>

      <Card>
        <Label>Pinyin above characters</Label>
        <div className="mb-2 grid grid-cols-3 gap-2">
          {(
            [
              ['always', 'Always'],
              ['auto', 'Fade out'],
              ['never', 'Never'],
            ] as [PinyinMode, string][]
          ).map(([m, label]) => (
            <Choice key={m} active={set.pinyinMode === m} onClick={() => update({ pinyinMode: m })}>
              {label}
            </Choice>
          ))}
        </div>
        <p className="text-sm text-slate-500">
          <b>Fade out</b> hides pinyin on words you know well (stable for a week+), so you learn to read the characters. Tap any hidden word to peek.
        </p>
      </Card>

      <Card>
        <Label>Appearance</Label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ['system', 'System', 'gear'],
              ['light', 'Light', 'sun'],
              ['dark', 'Dark', 'moon'],
            ] as [Theme, string, IconName][]
          ).map(([t, label, icon]) => (
            <Choice key={t} active={set.theme === t} onClick={() => update({ theme: t })}>
              <Icon name={icon} className="mx-auto mb-0.5 h-5 w-5" />
              {label}
            </Choice>
          ))}
        </div>
      </Card>

      <Card>
        <Label>Voice</Label>
        {status === 'none' || status === 'unsupported' ? (
          <div className="mb-3 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700 dark:text-rose-300" data-testid="no-voice">
            <p className="mb-1.5 flex items-center gap-2 font-display font-extrabold">
              <Icon name="mute" className="h-5 w-5 shrink-0" />
              {status === 'unsupported' ? 'This browser can’t speak' : 'No Mandarin voice in this browser'}
            </p>
            <ol className="list-decimal space-y-1 pl-5">
              {voiceHelp().map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </div>
        ) : status === 'loading' ? (
          <p className="mb-3 text-sm text-slate-500">Looking for Mandarin voices…</p>
        ) : (
          <select
            value={set.voiceURI ?? ''}
            onChange={(e) => update({ voiceURI: e.target.value || null })}
            className="mb-3 w-full rounded-2xl bg-surface px-3 py-2.5 ring-2 ring-inset ring-slate-200"
          >
            <option value="">Auto ({voices[0]?.name})</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Speed</span>
          <input
            type="range"
            min={0.5}
            max={1.2}
            step={0.05}
            value={set.ttsRate}
            onChange={(e) => update({ ttsRate: Number(e.target.value) })}
            className="flex-1"
          />
        </div>
        <p className="mb-2 mt-4 font-display text-sm font-extrabold text-slate-500">Sound check</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            className="!px-3 !py-2.5 text-sm"
            data-testid="test-voice"
            onClick={() => speak('你好，我们去吃鸡饭吧！', { rate: set.ttsRate, voiceURI: set.voiceURI })}
          >
            <Icon name="speaker" className="h-5 w-5" /> Test voice
          </Button>
          <Button variant="secondary" className="!px-3 !py-2.5 text-sm" data-testid="test-sfx" onClick={() => sfx.correct()}>
            <Icon name="sparkle" className="h-5 w-5" /> Test sounds
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500" data-testid="voice-count">
          Mandarin voices found: {voices.length}
          {voices.length > 0 && ` — ${voices.slice(0, 3).map((v) => v.name).join(', ')}${voices.length > 3 ? '…' : ''}`}
        </p>
      </Card>

      <Card>
        <Label>Flashcards</Label>
        <div className="flex items-center justify-between">
          <span className="text-sm">New speaking cards per day</span>
          <select
            value={set.newPerDay}
            onChange={(e) => update({ newPerDay: Number(e.target.value) })}
            className="rounded-2xl bg-surface px-3 py-1.5 ring-2 ring-inset ring-slate-200"
          >
            {[5, 10, 15, 20, 30, 50].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="space-y-3">
        <Toggle label="Sound effects" checked={set.sound} onChange={(v) => update({ sound: v })} />
        <Toggle
          label="Speaking exercises"
          hint={recognitionSupported ? 'Uses your microphone (Chrome / Android / Safari).' : 'Speech recognition not supported in this browser — you’ll check yourself.'}
          checked={set.speaking}
          onChange={(v) => update({ speaking: v })}
        />
        <Toggle
          label="Writing exercises"
          hint="Trace characters stroke by stroke in lessons."
          checked={set.writing}
          onChange={(v) => update({ writing: v })}
        />
      </Card>

      <AiKeyCard />

      <Card className="space-y-3">
        <Label>Account & data</Label>
        {firebaseEnabled ? (
          user ? (
            <Button variant="secondary" className="w-full" onClick={() => signOut()}>
              <Icon name="logout" className="h-5 w-5" /> Sign out ({user.email})
            </Button>
          ) : (
            <Button variant="blue" className="w-full" onClick={() => void signIn()}>
              Sign in with Google
            </Button>
          )
        ) : (
          <p className="text-sm text-slate-500">Cloud sync isn't configured for this copy of the app — progress is saved in this browser.</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {!IS_ARTIFACT && (
            <Button variant="secondary" onClick={exportData}>
              <Icon name="upload" className="h-5 w-5" /> Export
            </Button>
          )}
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Icon name="download" className="h-5 w-5" /> Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}
          />
        </div>
        {confirmReset ? (
          <div className="rounded-xl bg-rose-50 p-3 text-center">
            <p className="mb-2 text-sm text-rose-600 dark:text-rose-400">Erase all progress, flashcards and streaks? This can't be undone.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setConfirmReset(false)}>
                Keep
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setConfirmReset(false)
                  void reset().then(() => toast({ icon: 'broom', title: 'Progress reset' }))
                }}
              >
                Erase
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" className="w-full text-rose-500" onClick={() => setConfirmReset(true)}>
            Reset all progress
          </Button>
        )}
      </Card>
      <p className="pb-4 text-center text-xs text-slate-400">华语 Lah! · made for practising Singaporean Mandarin</p>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 font-display text-sm font-extrabold text-slate-500">{children}</p>
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-2 py-2.5 text-sm font-bold ring-2 ring-inset transition active:scale-95 ${active ? 'bg-sky-50 text-sky-700 ring-sky-400 dark:text-sky-300' : 'text-slate-600 ring-slate-200'}`}
    >
      {children}
    </button>
  )
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="relative h-7 w-12 shrink-0 rounded-full bg-slate-200 transition peer-checked:bg-brand-500 peer-focus-visible:ring-2 peer-focus-visible:ring-sky-400 after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
    </label>
  )
}
