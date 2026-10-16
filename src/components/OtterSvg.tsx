export type OtterMood = 'idle' | 'wave' | 'happy' | 'cheer' | 'sad' | 'think' | 'sleep'

const FUR = '#8b5a3c'
const FUR_DARK = '#6b4430'
const PAW = '#7a4d33'
const CREAM = '#f3e3c8'
const INK = '#2b1d16'
const CHILLI = '#cf4136'
const BLUSH = '#f29f9f'

/** Ah Tat (阿獭), a smooth-coated otter — Singapore's most famous urban wildlife. */
export function OtterSvg({ mood = 'idle', size = 96, className = '' }: { mood?: OtterMood; size?: number; className?: string }) {
  const armsUp = mood === 'cheer'
  const waving = mood === 'wave'
  const happyFace = mood === 'happy' || mood === 'cheer' || mood === 'wave'
  return (
    <svg
      viewBox="0 0 120 132"
      width={size}
      height={(size * 132) / 120}
      className={`otter ${className}`}
      data-mood={mood}
      aria-hidden
    >
      <g className="o-all">
        <g className="o-tail">
          <path d="M84 112C104 113 116 100 110 84c-3-8-11-6-9 2 2 10-6 18-19 18z" fill={FUR_DARK} />
        </g>
        <g className="o-breathe">
          <ellipse cx="60" cy="96" rx="31" ry="29" fill={FUR} />
          <ellipse cx="60" cy="101" rx="20" ry="20" fill={CREAM} />
          <ellipse cx="46" cy="124" rx="10" ry="5.5" fill={FUR_DARK} />
          <ellipse cx="74" cy="124" rx="10" ry="5.5" fill={FUR_DARK} />

          {/* paws resting on the tummy (raised arms are drawn after the head) */}
          {!armsUp && <ellipse cx="46.5" cy="97" rx="6.2" ry="9" transform="rotate(-30 46.5 97)" fill={PAW} />}
          {!armsUp && !waving && <ellipse cx="73.5" cy="97" rx="6.2" ry="9" transform="rotate(30 73.5 97)" fill={PAW} />}

          {/* Singapore-red scarf */}
          <path d="M37 76q23 13 46 0l-2 8q-21 12-42 0z" fill={CHILLI} />
          <path d="M71 85l6 9 3-10z" fill={CHILLI} />
          <circle cx="47" cy="81.5" r="1.4" fill="#fff" opacity="0.85" />
          <circle cx="52" cy="83.5" r="1" fill="#fff" opacity="0.85" />

          <g className="o-head">
            <circle cx="36" cy="36" r="8.5" fill={FUR} />
            <circle cx="36" cy="36" r="4.2" fill={FUR_DARK} />
            <circle cx="84" cy="36" r="8.5" fill={FUR} />
            <circle cx="84" cy="36" r="4.2" fill={FUR_DARK} />
            <ellipse cx="60" cy="56" rx="30.5" ry="26.5" fill={FUR} />
            <ellipse cx="60" cy="66.5" rx="19.5" ry="13.5" fill={CREAM} />
            <ellipse cx="41.5" cy="67" rx="5" ry="3" fill={BLUSH} opacity="0.6" />
            <ellipse cx="78.5" cy="67" rx="5" ry="3" fill={BLUSH} opacity="0.6" />

            <g className="o-eyes">
              {happyFace ? (
                <path d="M42.5 58q4.5-6 9 0M68.5 58q4.5-6 9 0" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />
              ) : mood === 'sleep' ? (
                <path d="M42.5 56q4.5 4.5 9 0M68.5 56q4.5 4.5 9 0" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
              ) : (
                <>
                  <circle cx={mood === 'think' ? 48.5 : 47} cy={mood === 'think' ? 54 : 56} r="4.8" fill={INK} />
                  <circle cx={mood === 'think' ? 50 : 48.7} cy={mood === 'think' ? 52.3 : 54.3} r="1.7" fill="#fff" />
                  <circle cx={mood === 'think' ? 74.5 : 73} cy={mood === 'think' ? 54 : 56} r="4.8" fill={INK} />
                  <circle cx={mood === 'think' ? 76 : 74.7} cy={mood === 'think' ? 52.3 : 54.3} r="1.7" fill="#fff" />
                </>
              )}
            </g>
            {mood === 'sad' && (
              <>
                <path d="M41 50.5q5-.5 9.5-3.5M79 50.5q-5-.5-9.5-3.5" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
                <path d="M52.5 61.5q-2 3.5 0 4.6 2 -1.1 0 -4.6z" fill="#7fb3e6" />
              </>
            )}

            <path d="M54 62q6-3.5 12 0-2.5 4.5-6 4.5T54 62z" fill={INK} />
            <ellipse cx="58.3" cy="61.6" rx="1.7" ry="0.8" fill="#fff" opacity="0.7" />
            {happyFace ? (
              <>
                <path d="M54.5 69q5.5 9 11 0z" fill="#7a2e2e" />
                <path d="M57 72.4q3 3.4 6 0z" fill="#e57373" />
              </>
            ) : mood === 'sad' ? (
              <path d="M55 73.5q5-4 10 0" stroke={INK} strokeWidth="1.8" strokeLinecap="round" fill="none" />
            ) : (
              <path d="M60 66.5V69M55.5 69.5q2.3 2.7 4.5 0 2.2 2.7 4.5 0" stroke={INK} strokeWidth="1.8" strokeLinecap="round" fill="none" />
            )}
            <path d="M43 68l-12-2M43 71l-11 1.5M77 68l12-2M77 71l11 1.5" stroke={INK} strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />
          </g>
          {armsUp && <ellipse cx="24" cy="76" rx="7" ry="12" transform="rotate(40 24 76)" fill={FUR} />}
          {(armsUp || waving) && (
            <g className="o-wave">
              <ellipse cx="96" cy="76" rx="7" ry="12" transform="rotate(-40 96 76)" fill={FUR} />
              <ellipse cx="101" cy="68" rx="4" ry="3.2" fill={PAW} />
            </g>
          )}
        </g>

        {mood === 'sleep' && (
          <g fill="#7d8f96" fontFamily="var(--font-display)" fontWeight="800">
            <text className="o-z" x="86" y="34" fontSize="12">z</text>
            <text className="o-z" x="94" y="24" fontSize="15">z</text>
            <text className="o-z" x="102" y="14" fontSize="18">z</text>
          </g>
        )}
        {mood === 'cheer' && (
          <g fill="#e8bb42">
            <path className="o-sparkle" d="M14 38l2.4 5.6L22 46l-5.6 2.4L14 54l-2.4-5.6L6 46l5.6-2.4z" />
            <path className="o-sparkle" d="M104 34l2 4.6 4.6 2-4.6 2-2 4.6-2-4.6-4.6-2 4.6-2z" />
            <path className="o-sparkle" d="M24 10l1.6 3.8 3.8 1.6-3.8 1.6L24 20.8l-1.6-3.8-3.8-1.6 3.8-1.6z" />
          </g>
        )}
        {mood === 'think' && (
          <g fill="#c5d2d6">
            <circle cx="92" cy="30" r="3" />
            <circle cx="100" cy="20" r="4.5" />
            <circle cx="108" cy="8" r="6" />
          </g>
        )}
      </g>
    </svg>
  )
}
