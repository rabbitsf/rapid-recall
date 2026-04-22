import { useState, useEffect, useCallback } from 'react'

async function apiFetch(path, opts = {}) {
  const res = await fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Request failed') }
  return res.json()
}

export function useSets() {
  const [sets, setSets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSets = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiFetch('/api/sets')
      setSets(data)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSets() }, [fetchSets])

  const saveSet = async ({ id, title, cards, isPublic = false }) => {
    const body = JSON.stringify({ title, cards, isPublic })
    const data = id
      ? await apiFetch(`/api/sets/${id}`, { method: 'PUT', body })
      : await apiFetch('/api/sets', { method: 'POST', body })
    setSets(prev => {
      const exists = prev.find(s => s.id === data.id)
      return exists ? prev.map(s => s.id === data.id ? data : s) : [data, ...prev]
    })
    return data
  }

  const deleteSet = async (id) => {
    await apiFetch(`/api/sets/${id}`, { method: 'DELETE' })
    setSets(prev => prev.filter(s => s.id !== id))
  }

  return { sets, loading, error, saveSet, deleteSet, refetch: fetchSets }
}
