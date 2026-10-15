import { useApp } from '../store/app'
import { speak, ttsSupported } from '../lib/tts'
import { Icon } from './ui'

export function useSpeak() {
  const settings = useApp((s) => s.s.settings)
  return (text: string, slow = false) =>
    speak(text, { rate: slow ? Math.max(0.5, settings.ttsRate - 0.35) : settings.ttsRate, voiceURI: settings.voiceURI })
}

export function AudioButton({ text, size = 'md', slow = true }: { text: string; size?: 'sm' | 'md' | 'lg'; slow?: boolean }) {
  const say = useSpeak()
  if (!ttsSupported) return null
  const dims = size === 'lg' ? 'h-20 w-20' : size === 'md' ? 'h-12 w-12' : 'h-9 w-9'
  const icon = size === 'lg' ? 'h-10 w-10' : size === 'md' ? 'h-6 w-6' : 'h-5 w-5'
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        aria-label="Play audio"
        onClick={(e) => {
          e.stopPropagation()
          say(text)
        }}
        className={`${dims} grid place-items-center rounded-2xl border-b-4 border-sky-700 bg-sky-500 text-white transition active:translate-y-0.5 active:border-b-2`}
      >
        {Icon.speaker(icon)}
      </button>
      {slow && (
        <button
          type="button"
          aria-label="Play slowly"
          onClick={(e) => {
            e.stopPropagation()
            say(text, true)
          }}
          className={`${size === 'lg' ? 'h-12 w-12 text-2xl' : 'h-9 w-9 text-lg'} grid place-items-center rounded-xl border-2 border-b-4 border-slate-200 bg-white transition active:translate-y-0.5 active:border-b-2`}
        >
          🐢
        </button>
      )}
    </span>
  )
}
