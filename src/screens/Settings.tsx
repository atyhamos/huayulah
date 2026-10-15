import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { firebaseEnabled } from '../data/firebase'
import { normalizeState, type AppState, type PinyinMode } from '../data/types'
import { Button, Card, Icon } from '../components/ui'
import { chineseVoices, onVoicesChanged, speak } from '../lib/tts'
import { recognitionSupported } from '../lib/speech'
import { GOAL_OPTIONS } from '../lib/xp'
import { useApp } from '../store/app'

export function SettingsScreen() {
  const s = useApp((st) => st.s)
  const user = useApp((st) => st.user)
  const update = useApp((st) => st.updateSettings)
  const signOut = useApp((st) => st.signOut)
  const signIn = useApp((st) => st.signIn)
  const reset = useApp((st) => st.resetProgress)
  const replace = useApp((st) => st.replaceState)
  const nav = useNavigate()
  const [voices, setVoices] = useState(chineseVoices())
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
      if (!parsed || typeof parsed !== 'object' || !parsed.stats) throw new Error('Not a 华语 Lah! backup file')
      if (!confirm('Replace your current progress with this backup?')) return
      replace(normalizeState(parsed))
      alert('Backup restored.')
    } catch (e) {
      alert(`Import failed: ${e instanceof Error ? e.message : e}`)
    }
  }

  return (
    <div className="space-y-5">
      <button type="button" onClick={() => nav(-1)} className="flex items-center gap-1 font-bold text-slate-400">
        {Icon.back('h-5 w-5')} Back
      </button>
      <h1 className="text-2xl font-extrabold">Settings</h1>

      <Card>
        <Label>Daily goal</Label>
        <div className="grid grid-cols-4 gap-2">
          {GOAL_OPTIONS.map((g) => (
            <Choice key={g.xp} active={set.dailyGoal === g.xp} onClick={() => update({ dailyGoal: g.xp })}>
              <span className="block">{g.label}</span>
              <span className="text-xs opacity-70">{g.xp} XP</span>
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
        <Label>Voice</Label>
        {voices.length === 0 ? (
          <p className="text-sm text-rose-600">
            No Mandarin voice found on this device. On Android, install “Google Speech Services” and add Chinese (Mandarin) in text-to-speech settings.
          </p>
        ) : (
          <select
            value={set.voiceURI ?? ''}
            onChange={(e) => update({ voiceURI: e.target.value || null })}
            className="mb-3 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2"
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
          <button type="button" className="text-sm font-bold text-sky-600" onClick={() => speak('你好，我们去吃鸡饭吧！', { rate: set.ttsRate, voiceURI: set.voiceURI })}>
            Test
          </button>
        </div>
      </Card>

      <Card>
        <Label>Flashcards</Label>
        <div className="flex items-center justify-between">
          <span className="text-sm">New speaking cards per day</span>
          <select
            value={set.newPerDay}
            onChange={(e) => update({ newPerDay: Number(e.target.value) })}
            className="rounded-xl border-2 border-slate-200 bg-white px-3 py-1"
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
      </Card>

      <Card className="space-y-3">
        <Label>Account & data</Label>
        {firebaseEnabled ? (
          user ? (
            <Button variant="secondary" className="w-full" onClick={() => signOut()}>
              Sign out ({user.email})
            </Button>
          ) : (
            <Button variant="blue" className="w-full" onClick={() => signIn().catch((e) => alert(e.message))}>
              Sign in with Google
            </Button>
          )
        ) : (
          <p className="text-sm text-slate-500">Cloud sync isn't configured for this copy of the app — progress is saved in this browser.</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={exportData}>
            Export
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}
          />
        </div>
        <Button
          variant="ghost"
          className="w-full text-rose-500"
          onClick={() => {
            if (confirm('Erase all progress, flashcards and streaks? This cannot be undone.')) void reset()
          }}
        >
          Reset all progress
        </Button>
      </Card>
      <p className="pb-4 text-center text-xs text-slate-400">华语 Lah! · made for practising Singaporean Mandarin</p>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{children}</p>
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 border-b-4 px-2 py-2 text-sm font-bold ${active ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-600'}`}
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
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-6 w-6 accent-brand-500" />
    </label>
  )
}
