import { useApp } from '../store/app'
import { speak, ttsSupported } from '../lib/tts'
import { Icon } from './icons'

export function useSpeak() {
  const settings = useApp((s) => s.s.settings)
  return (text: string, slow = false, pitch?: number) =>
    speak(text, { rate: slow ? Math.max(0.5, settings.ttsRate - 0.35) : settings.ttsRate, voiceURI: settings.voiceURI, pitch })
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
        className={`${dims} grid place-items-center rounded-full bg-sky-500 text-white shadow-[0_8px_16px_-8px_var(--color-sky-700)] transition hover:bg-sky-400 active:scale-95`}
      >
        <Icon name="speaker" className={icon} />
      </button>
      {slow && (
        <button
          type="button"
          aria-label="Play slowly"
          onClick={(e) => {
            e.stopPropagation()
            say(text, true)
          }}
          className={`${size === 'lg' ? 'h-12 w-12' : 'h-9 w-9'} grid place-items-center rounded-full bg-sky-50 text-sky-600 ring-2 ring-inset ring-sky-200 transition active:scale-95`}
        >
          <Icon name="turtle" className={size === 'lg' ? 'h-7 w-7' : 'h-5 w-5'} />
        </button>
      )}
    </span>
  )
}
