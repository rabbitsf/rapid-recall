import { useState, useEffect, useCallback, useRef } from 'react'
import { termKey } from '../utils/termKey.js'

// CANONICAL (client) mastery rule — mirrors server/src/lib/mastery.js; keep the two identical.
export const MASTERED_STREAK = 2

// Answers are buffered and sent in batches: the API limiter is per-IP and a whole school shares one NAT IP
const FLUSH_EVERY = 20

// Splits cards into { learning, notStudied, mastered } using progress keyed by termKey
export function classifyCards(cards, progress) {
  const groups = { learning: [], notStudied: [], mastered: [] }
  for (const card of cards) {
    const row = progress[termKey(card.term)]
    if (!row) groups.notStudied.push(card)
    else if (row.streak >= MASTERED_STREAK) groups.mastered.push(card)
    else groups.learning.push(card)
  }
  return groups
}

function toMap(rows) {
  const map = {}
  for (const r of rows) map[r.termKey] = r
  return map
}

export function useCardProgress(setId) {
  const [progress, setProgress] = useState({}) // { termKey: { streak, correctCount, incorrectCount, lastStudiedAt } }
  const [loaded, setLoaded] = useState(false)
  const pending = useRef([])

  useEffect(() => {
    setLoaded(false)
    fetch(`/api/card-progress/${setId}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : []))
      .then(rows => setProgress(toMap(rows)))
      .catch(err => console.error('Failed to load card progress:', err))
      .finally(() => setLoaded(true))
  }, [setId])

  // Sends buffered answers; keepalive lets the request finish while the page is closing
  const flush = useCallback(async ({ keepalive = false } = {}) => {
    if (!pending.current.length) return
    const results = pending.current
    pending.current = []
    try {
      const res = await fetch(`/api/card-progress/${setId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results }),
        keepalive,
      })
      if (res.ok) setProgress(toMap(await res.json()))
    } catch (err) { console.error('Failed to save card progress:', err) }
  }, [setId])

  // Games call this once per card answer
  const recordAnswer = useCallback((term, correct) => {
    pending.current.push({ term, correct: !!correct })
    if (pending.current.length >= FLUSH_EVERY) flush()
  }, [flush])

  const resetProgress = useCallback(async () => {
    pending.current = []
    setProgress({})
    try {
      await fetch(`/api/card-progress/${setId}`, { method: 'DELETE', credentials: 'include' })
    } catch (err) { console.error('Failed to reset card progress:', err) }
  }, [setId])

  // Don't lose buffered answers when the tab closes or the study screen unmounts
  useEffect(() => {
    const onHide = () => flush({ keepalive: true })
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      flush({ keepalive: true })
    }
  }, [flush])

  return { progress, loaded, recordAnswer, flush, resetProgress }
}
