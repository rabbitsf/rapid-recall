import { useState } from 'react'
import { ShieldCheck, Plus, UserCheck, UserX, GraduationCap, BookOpen, X } from 'lucide-react'
import { useUsers } from '../hooks/useUsers.js'

const ROLES = ['student', 'teacher', 'admin']

const ROLE_BADGE = {
  admin:   'bg-rose-100 text-rose-700',
  teacher: 'bg-amber-100 text-amber-700',
  student: 'bg-indigo-100 text-indigo-700',
}

function AddUserModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ email: '', displayName: '', role: 'student' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onCreate(form)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-slate-800">Add User</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
            <input type="text" required value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-xl">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-xl text-sm">
              {saving ? 'Adding…' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { users, loading, createUser, updateUser } = useUsers()
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = users.filter(u =>
    u.email.includes(search.toLowerCase()) ||
    u.displayName.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (user) => updateUser(user.id, { active: !user.active })
  const changeRole = (user, role) => updateUser(user.id, { role })

  const counts = { admin: 0, teacher: 0, student: 0, inactive: 0 }
  users.forEach(u => {
    if (!u.active) counts.inactive++
    else counts[u.role] = (counts[u.role] ?? 0) + 1
  })

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onCreate={createUser} />}

      <div>
        <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-2"><ShieldCheck className="text-rose-500" size={28} /> Admin Dashboard</h2>
        <p className="text-slate-500 mt-1">Manage all user accounts and roles.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Admins',   count: counts.admin,    icon: <ShieldCheck size={18} />,    cls: 'text-rose-600 bg-rose-50' },
          { label: 'Teachers', count: counts.teacher,  icon: <GraduationCap size={18} />,  cls: 'text-amber-600 bg-amber-50' },
          { label: 'Students', count: counts.student,  icon: <BookOpen size={18} />,       cls: 'text-indigo-600 bg-indigo-50' },
          { label: 'Inactive', count: counts.inactive, icon: <UserX size={18} />,          cls: 'text-slate-500 bg-slate-100' },
        ].map(({ label, count, icon, cls }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-2 ${cls}`}>{icon}</div>
            <p className="text-2xl font-bold text-slate-800">{count}</p>
            <p className="text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* User list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-3 items-center">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
            className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm shadow-sm transition-colors">
            <Plus size={16} /> Add User
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No users found.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map(u => (
              <div key={u.id} className={`flex items-center gap-4 px-4 py-3 transition-colors ${u.active ? 'hover:bg-slate-50' : 'opacity-50 bg-slate-50'}`}>
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                  {u.displayName?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{u.displayName}</p>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>
                <select value={u.role} onChange={e => changeRole(u, e.target.value)}
                  className={`text-xs font-semibold px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${ROLE_BADGE[u.role]}`}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button onClick={() => toggle(u)} title={u.active ? 'Deactivate' : 'Activate'}
                  className={`p-2 rounded-lg transition-colors ${u.active ? 'text-emerald-600 hover:bg-red-50 hover:text-red-600' : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}>
                  {u.active ? <UserCheck size={17} /> : <UserX size={17} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
