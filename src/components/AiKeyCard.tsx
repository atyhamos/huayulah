import { useState } from 'react'
import { AiError, aiSupported, setAiKey, testAiKey } from '../lib/ai'
import { useApp } from '../store/app'
import { useAiKey } from './hooks'
import { Icon } from './icons'
import { Button, Card } from './ui'

/** Settings card for the optional bring-your-own-key AI features. */
export function AiKeyCard() {
  const key = useAiKey()
  const toast = useApp((st) => st.toast)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  if (!aiSupported) return null

  const test = async () => {
    setBusy(true)
    try {
      await testAiKey()
      toast({ icon: 'check', title: 'Key works', body: 'Photo reading and role-play are switched on.' })
    } catch (e) {
      toast({ icon: 'warning', title: 'Key test failed', body: e instanceof AiError ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card data-testid="ai-card">
      <p className="mb-1 flex items-center gap-2 font-display text-sm font-extrabold text-slate-500">
        <Icon name="sparkle" className="h-5 w-5 text-nyonya-500" /> AI features (optional)
      </p>
      <p className="mb-3 text-sm text-slate-500">
        Read photos of menus and signs, and role-play with Ah Tat. These use your own Claude API key — usage (about 1–3¢ a photo or chat turn) is billed to
        you by Anthropic. Get a key at <span className="font-semibold text-ink">console.anthropic.com</span>.
      </p>
      {key ? (
        <>
          <p className="mb-3 flex items-center gap-2 rounded-2xl bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 dark:text-brand-300">
            <Icon name="check" className="h-5 w-5" /> Key saved on this device ({key.slice(0, 10)}…{key.slice(-4)})
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="!px-3 !py-2.5 text-sm" onClick={test} disabled={busy} data-testid="ai-test">
              {busy ? 'Testing…' : 'Test key'}
            </Button>
            <Button variant="ghost" className="!px-3 !py-2.5 text-sm text-rose-500" onClick={() => setAiKey(null)} data-testid="ai-remove">
              Remove key
            </Button>
          </div>
        </>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!draft.trim()) return
            setAiKey(draft)
            setDraft('')
            void test()
          }}
        >
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="sk-ant-…"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-full bg-surface px-4 py-2 font-mono text-sm outline-none ring-2 ring-inset ring-slate-200 focus:ring-sky-400"
            data-testid="ai-key-input"
          />
          <Button type="submit" className="!px-4 !py-2.5 text-sm" disabled={!draft.trim()}>
            Save
          </Button>
        </form>
      )}
      <p className="mt-3 text-xs text-slate-400">
        The key stays in this browser only — it isn’t synced to your account. Don’t save it on a shared computer.
      </p>
    </Card>
  )
}
