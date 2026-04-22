async function apiFetch(path, opts = {}) {
  const res = await fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Request failed') }
  return res.json()
}

export function useGameResults() {
  const saveResult = async ({ setId, game, score, total, timeSpent }) => {
    try {
      await apiFetch('/api/game-results', { method: 'POST', body: JSON.stringify({ setId, game, score, total, timeSpent }) })
    } catch (err) { console.error('Failed to save game result:', err) }
  }

  return { saveResult }
}
