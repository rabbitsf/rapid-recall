import { useState, useEffect, useCallback } from 'react'

async function apiFetch(path, opts = {}) {
  const res = await fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Request failed') }
  return res.json()
}

export function useClasses() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchClasses = useCallback(async () => {
    try { setClasses(await apiFetch('/api/classes')) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchClasses() }, [fetchClasses])

  const createClass = async (name) => {
    const cls = await apiFetch('/api/classes', { method: 'POST', body: JSON.stringify({ name }) })
    setClasses(prev => [cls, ...prev])
    return cls
  }

  const renameClass = async (id, name) => {
    const updated = await apiFetch(`/api/classes/${id}`, { method: 'PUT', body: JSON.stringify({ name }) })
    setClasses(prev => prev.map(c => c.id === id ? { ...c, name: updated.name } : c))
  }

  const deleteClass = async (id) => {
    await apiFetch(`/api/classes/${id}`, { method: 'DELETE' })
    setClasses(prev => prev.filter(c => c.id !== id))
  }

  const addStudent = async (classId, email) => {
    return apiFetch(`/api/classes/${classId}/members`, { method: 'POST', body: JSON.stringify({ email }) })
  }

  const removeStudent = async (classId, studentId) => {
    await apiFetch(`/api/classes/${classId}/members/${studentId}`, { method: 'DELETE' })
  }

  const shareSet = async (classId, setId) => {
    return apiFetch(`/api/classes/${classId}/shares`, { method: 'POST', body: JSON.stringify({ setId }) })
  }

  const unshareSet = async (classId, setId) => {
    return apiFetch(`/api/classes/${classId}/shares/${setId}`, { method: 'DELETE' })
  }

  return { classes, loading, createClass, renameClass, deleteClass, addStudent, removeStudent, shareSet, unshareSet, refetch: fetchClasses }
}
