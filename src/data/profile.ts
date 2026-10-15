import { weekId } from '../lib/dates'

export interface PublicProfile {
  uid: string
  displayName: string
  photoURL: string | null
  friendCode: string
  weeklyXp: number
  weekId: string | null
  streak: number
  xp: number
  updatedAt: number
}

/** Weekly XP that counts for the current week's leaderboard. */
export function thisWeekXp(p: PublicProfile, now: Date = new Date()): number {
  return p.weekId === weekId(now) ? p.weeklyXp : 0
}
