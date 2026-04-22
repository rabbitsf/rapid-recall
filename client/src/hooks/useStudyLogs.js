import { useState, useEffect, useCallback } from 'react'

async function apiFetch(path, opts = {}) {
  const res = await fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Request failed') }
  return res.json()
}

export function useStudyLogs() {
  const [logs, setLogs] = useState({}) // { 'YYYY-MM-DD': minutes }
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    try {
      const data = await apiFetch('/api/study-logs?weeks=8')
      const map = {}
      for (const log of data) {
        map[log.date.slice(0, 10)] = log.minutes
      }
      setLogs(map)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const updateLog = async (dateString, minutes) => {
    setLogs(prev => ({ ...prev, [dateString]: minutes }))
    await apiFetch(`/api/study-logs/${dateString}`, { method: 'PUT', body: JSON.stringify({ minutes }) })
  }

  return { logs, loading, updateLog }
}
