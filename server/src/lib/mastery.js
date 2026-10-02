import { termKey } from './termKey.js'

// CANONICAL (server): a term is mastered after this many correct answers in a row; any miss resets the streak.
// Mirrored on the client in client/src/hooks/useCardProgress.js — keep the two identical.
export const MASTERED_STREAK = 2

// Counts a set's current terms by status. Rows for terms no longer in the set are ignored.
export function countMastery(cards, progressRows) {
  const streakByKey = new Map(progressRows.map(r => [r.termKey, r.streak]))
  const counts = { mastered: 0, learning: 0, notStudied: 0 }
  for (const key of new Set(cards.map(c => termKey(c.term)))) {
    if (!streakByKey.has(key)) counts.notStudied++
    else if (streakByKey.get(key) >= MASTERED_STREAK) counts.mastered++
    else counts.learning++
  }
  return counts
}
