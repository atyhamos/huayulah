import { useState } from 'react'
import { rubyFor } from '../lib/pinyin'

interface Props {
  text: string
  /** Hand-checked pinyin for this exact text (an item's pinyin). */
  pinyin?: string
  showPinyin: boolean
  /** When pinyin is hidden, let the learner tap to peek. */
  revealable?: boolean
  className?: string
}

/** Chinese text with per-character pinyin (ruby) above it. */
export function Hanzi({ text, pinyin, showPinyin, revealable = false, className = '' }: Props) {
  const [peek, setPeek] = useState(false)
  const visible = showPinyin || peek
  const chars = rubyFor(text, pinyin)
  const canPeek = revealable && !showPinyin
  return (
    <span
      className={`font-han inline-block ${canPeek ? 'cursor-pointer' : ''} ${className}`}
      onClick={canPeek ? () => setPeek((p) => !p) : undefined}
      title={canPeek ? 'Tap to show pinyin' : undefined}
      lang="zh-Hans"
    >
      {chars.map((c, i) =>
        c.py ? (
          <ruby key={i}>
            {c.ch}
            <rt className={visible ? '' : 'invisible'}>{c.py}</rt>
          </ruby>
        ) : (
          <span key={i}>{c.ch}</span>
        ),
      )}
    </span>
  )
}
