import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'

const store = new Map<string, string>()

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'request-id': 'req_test' } })
}

const message = (text: string, stop_reason = 'end_turn') => ({
  id: 'msg_1',
  type: 'message',
  role: 'assistant',
  model: 'claude-opus-5-5',
  content: [{ type: 'text', text }],
  stop_reason,
  stop_sequence: null,
  usage: { input_tokens: 10, output_tokens: 5 },
})

beforeEach(() => {
  store.clear()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  })
})
afterEach(() => vi.unstubAllGlobals())

const schema = z.object({ ok: z.boolean() })
const ask = async () => {
  const { askJson } = await import('../src/lib/ai')
  return askJson({ system: 'sys', messages: [{ role: 'user', content: 'hi' }], schema })
}

describe('ai', () => {
  it('needs a key first', async () => {
    await expect(ask()).rejects.toMatchObject({ kind: 'no-key' })
  })

  it('sends a structured-output request with the learner’s key and parses the answer', async () => {
    const { setAiKey } = await import('../src/lib/ai')
    setAiKey('  sk-ant-test-123  ')
    const fetch = vi.fn(async () => reply(message('{"ok":true}')))
    vi.stubGlobal('fetch', fetch)
    await expect(ask()).resolves.toEqual({ ok: true })

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(String(url)).toContain('/v1/messages')
    const headers = new Headers(init.headers)
    expect(headers.get('x-api-key')).toBe('sk-ant-test-123')
    expect(headers.get('anthropic-beta')).toContain('server-side-fallback-2026-07-01')
    const body = JSON.parse(String(init.body))
    expect(body).toMatchObject({ model: 'claude-opus-5-5', fallbacks: 'default', system: 'sys', output_config: { effort: 'low', format: { type: 'json_schema' } } })
  })

  it('maps a rejected key and a refusal to friendly errors', async () => {
    const { setAiKey } = await import('../src/lib/ai')
    setAiKey('sk-ant-bad')
    vi.stubGlobal('fetch', vi.fn(async () => reply({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }, 401)))
    await expect(ask()).rejects.toMatchObject({ kind: 'auth' })

    vi.stubGlobal('fetch', vi.fn(async () => reply(message('', 'refusal'))))
    await expect(ask()).rejects.toMatchObject({ kind: 'refusal' })
  })
})
