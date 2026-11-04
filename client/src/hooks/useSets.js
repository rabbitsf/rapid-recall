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

  // isPublic is only sent when given, so saving an edit never un-publishes a set
  const saveSet = async ({ id, title, cards, isPublic, isSpanish = false }) => {
    const body = JSON.stringify({ title, cards, isPublic, isSpanish })
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

  // One set by id (incl. sets outside the user's list that they may still open, e.g. super admin)
  const fetchSet = (id) => apiFetch(`/api/sets/${id}`)

  // Super admin: every set anyone created (no cards — open one with fetchSet)
  const fetchAllSets = () => apiFetch('/api/sets/all')

  // Student shares their own set with their whole grade; owner or any teacher/admin can stop it
  const setGradeShare = async (id, on) => {
    await apiFetch(`/api/sets/${id}/grade-share`, { method: on ? 'PUT' : 'DELETE' })
    setSets(prev => prev.map(s => s.id === id ? { ...s, sharedWithGrade: on } : s))
  }

  const shareSet = async (id, teacherId) => {
    return apiFetch(`/api/sets/${id}/share`, { method: 'POST', body: JSON.stringify({ teacherId }) })
  }

  return { sets, loading, error, saveSet, deleteSet, shareSet, fetchSet, fetchAllSets, setGradeShare, refetch: fetchSets }
}
