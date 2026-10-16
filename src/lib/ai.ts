/**
 * Optional AI features (photo reader, role-play) that run on the learner's own Claude API key.
 * The key stays in this browser (localStorage) and is never synced; the SDK is only downloaded
 * the first time an AI feature is used.
 */
import type { BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import type * as z from 'zod/v4'
import { IS_ARTIFACT } from '../env'

export const AI_MODEL = 'claude-opus-5-5'
const STORAGE_KEY = 'huayu-ai-key'
const listeners = new Set<() => void>()

export function getAiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setAiKey(key: string | null) {
  try {
    if (key?.trim()) localStorage.setItem(STORAGE_KEY, key.trim())
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage blocked: the key just won't persist */
  }
  listeners.forEach((l) => l())
}

export function onAiKeyChange(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** AI features are hidden in the guest-only demo build. */
export const aiSupported = !IS_ARTIFACT

export type AiErrorKind = 'no-key' | 'auth' | 'rate' | 'offline' | 'refusal' | 'bad-output' | 'other'

const FRIENDLY: Record<AiErrorKind, string> = {
  'no-key': 'Add your Claude API key in Settings → AI features first.',
  auth: 'Claude rejected the API key. Check it in Settings → AI features.',
  rate: 'Claude is busy or your key hit its limit. Try again in a minute.',
  offline: 'Couldn’t reach Claude. Check your internet connection.',
  refusal: 'Claude declined that one. Try a different photo or message.',
  'bad-output': 'Claude’s answer came back garbled. Try again.',
  other: 'Something went wrong talking to Claude.',
}

export class AiError extends Error {
  readonly kind: AiErrorKind
  constructor(kind: AiErrorKind, detail?: string) {
    super(detail ? `${FRIENDLY[kind]} (${detail})` : FRIENDLY[kind])
    this.kind = kind
  }
}

type Sdk = typeof import('@anthropic-ai/sdk')
let sdk: Promise<[Sdk, typeof import('@anthropic-ai/sdk/helpers/beta/zod')]> | null = null
const loadSdk = () => (sdk ??= Promise.all([import('@anthropic-ai/sdk'), import('@anthropic-ai/sdk/helpers/beta/zod')]))

export interface AskOptions<S extends z.ZodType> {
  system: string
  messages: BetaMessageParam[]
  schema: S
  maxTokens?: number
}

/** One Claude request whose answer must match `schema` (structured outputs). */
export async function askJson<S extends z.ZodType>({ system, messages, schema, maxTokens = 4000 }: AskOptions<S>): Promise<z.infer<S>> {
  const key = getAiKey()
  if (!key) throw new AiError('no-key')
  let Anthropic: Sdk['default']
  let format: ReturnType<typeof import('@anthropic-ai/sdk/helpers/beta/zod').betaZodOutputFormat<S>>
  try {
    const [mod, helpers] = await loadSdk()
    Anthropic = mod.default
    format = helpers.betaZodOutputFormat(schema)
  } catch (e) {
    throw new AiError('offline', e instanceof Error ? e.message : undefined)
  }
  const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 1 })
  try {
    const res = await client.beta.messages.create({
      model: AI_MODEL,
      max_tokens: maxTokens,
      system,
      messages,
      output_config: { effort: 'low', format: { type: format.type, schema: format.schema } },
      // a declined request is re-run on Anthropic's recommended fallback model
      fallbacks: 'default',
      betas: ['server-side-fallback-2026-07-01'],
    })
    // check why it stopped before parsing: a refusal or cut-off answer isn't valid JSON
    if (res.stop_reason === 'refusal') throw new AiError('refusal')
    if (res.stop_reason === 'max_tokens') throw new AiError('bad-output')
    const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
    try {
      return format.parse(text) as z.infer<S>
    } catch {
      throw new AiError('bad-output')
    }
  } catch (e) {
    throw toAiError(e, Anthropic)
  }
}

function toAiError(e: unknown, A: Sdk['default']): AiError {
  if (e instanceof AiError) return e
  if (e instanceof A.AuthenticationError || e instanceof A.PermissionDeniedError) return new AiError('auth')
  if (e instanceof A.RateLimitError || e instanceof A.InternalServerError) return new AiError('rate')
  if (e instanceof A.APIConnectionError) return new AiError('offline')
  if (e instanceof A.APIError) return new AiError('other', e.message)
  if (e instanceof SyntaxError) return new AiError('bad-output')
  return new AiError('other', e instanceof Error ? e.message : String(e))
}

/** Cheapest possible request, to check a pasted key works. */
export async function testAiKey(): Promise<void> {
  const { z: zod } = await import('zod/v4')
  await askJson({
    system: 'Reply with the JSON requested.',
    messages: [{ role: 'user', content: 'Say ok.' }],
    schema: zod.object({ ok: zod.boolean() }),
    maxTokens: 200,
  })
}

/** Shrink a photo so its long side is at most `max` px, as a base64 JPEG (no data: prefix). */
export async function imageToJpegBase64(file: Blob, max = 1568): Promise<string> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
}
