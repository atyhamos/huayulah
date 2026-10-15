import type { Exercise } from '../../lib/exercises'
import { Intro } from './Intro'
import { MatchPairs } from './MatchPairs'
import { MultipleChoice } from './MultipleChoice'
import { SentenceBuilder } from './SentenceBuilder'
import { SgPick } from './SgPick'
import { Speak } from './Speak'
import { ToneChoice } from './ToneChoice'
import type { ExerciseResult } from './types'

export type { ExerciseResult }

export function ExerciseView({ ex, locked, onSubmit }: { ex: Exercise; locked: boolean; onSubmit: (r: ExerciseResult) => void }) {
  switch (ex.kind) {
    case 'intro':
      return <Intro ex={ex} locked={locked} onSubmit={onSubmit} />
    case 'zh2en':
    case 'en2zh':
    case 'listen':
      return <MultipleChoice ex={ex} locked={locked} onSubmit={onSubmit} />
    case 'tone':
      return <ToneChoice ex={ex} locked={locked} onSubmit={onSubmit} />
    case 'build':
      return <SentenceBuilder ex={ex} locked={locked} onSubmit={onSubmit} />
    case 'match':
      return <MatchPairs ex={ex} locked={locked} onSubmit={onSubmit} />
    case 'speak':
      return <Speak ex={ex} locked={locked} onSubmit={onSubmit} />
    case 'sgpick':
      return <SgPick ex={ex} locked={locked} onSubmit={onSubmit} />
  }
}
