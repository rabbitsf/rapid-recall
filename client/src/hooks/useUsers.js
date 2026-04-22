import { useState, useEffect, useCallback } from 'react'

export function useUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users', { credentials: 'include' })
      if (res.ok) setUsers(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const createUser = async ({ email, displayName, role }) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, displayName, role }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error)
    }
    await fetchUsers()
  }

  const updateUser = async (id, data) => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error)
    }
    await fetchUsers()
  }

  return { users, loading, createUser, updateUser, refresh: fetchUsers }
}
