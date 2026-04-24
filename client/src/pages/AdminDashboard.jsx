import { useState } from 'react'
import { ShieldCheck, Plus, UserCheck, UserX, GraduationCap, BookOpen, X, Trash2, Users } from 'lucide-react'
import { useUsers } from '../hooks/useUsers.js'

const ROLES = ['student', 'teacher', 'admin']
const GRADES = ['K', '1', '2', '3', '4', '5', '6', '7', '8']
const GRADE_LABEL = { K: 'K', '1': '1st', '2': '2nd', '3': '3rd', '4': '4th', '5': '5th', '6': '6th', '7': '7th', '8': '8th' }

const ROLE_BADGE = {
  admin:   'bg-rose-100 text-rose-700',
  teacher: 'bg-amber-100 text-amber-700',
  student: 'bg-crimson-100 text-crimson-700',
}

function BulkAddModal({ onClose, onBulkCreate }) {
  const [text, setText] = useState('')
  const [results, setResults] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const parse = (raw) => raw.split('\n').flatMap(line => {
    const trimmed = line.trim()
    if (!trimmed) return []
    const parts = trimmed.split(',').map(s => s.trim())
    return [{ email: parts[0] || '', displayName: parts[1] || '', role: parts[2]?.toLowerCase() || 'student' }]
  })

  const preview = parse(text)
  const validCount = preview.filter(u => u.email && u.displayName).length

  const handleSubmit = async () => {
    if (!validCount) return
    setSaving(true)
    setError('')
    try {
      const res = await onBulkCreate(preview)
      setResults(res)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Users size={18} className="text-crimson-600" /> Bulk Add Users</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X size={18} /></button>
        </div>

        {!results ? (
          <>
            <p className="text-sm text-slate-500 mb-1">One user per line:</p>
            <p className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-3 text-slate-600">
              email, Display Name, role<br />
              <span className="text-slate-400">john@school.org, John Smith, student<br />
              jane@school.org, Jane Doe, teacher<br />
              (role is optional — defaults to student)</span>
            </p>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={10}
              placeholder={"john@school.org, John Smith\njane@school.org, Jane Doe, teacher"}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-crimson-500 resize-none mb-3" />
            <p className="text-xs text-slate-400 mb-4">
              {preview.length} line{preview.length !== 1 ? 's' : ''} parsed — {validCount} valid
            </p>
            {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-xl mb-3">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl text-sm">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !validCount}
                className="flex-1 py-2.5 bg-crimson-600 hover:bg-crimson-700 disabled:opacity-60 text-white font-medium rounded-xl text-sm">
                {saving ? 'Adding…' : `Add ${validCount} User${validCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3 mb-5">
              {results.created.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-emerald-700 mb-2">{results.created.length} added successfully</p>
                  <ul className="text-xs text-emerald-600 space-y-0.5">{results.created.map(e => <li key={e}>{e}</li>)}</ul>
                </div>
              )}
              {results.skipped.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-amber-700 mb-2">{results.skipped.length} skipped (email already exists)</p>
                  <ul className="text-xs text-amber-600 space-y-0.5">{results.skipped.map(e => <li key={e}>{e}</li>)}</ul>
                </div>
              )}
              {results.failed.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-red-700 mb-2">{results.failed.length} failed</p>
                  <ul className="text-xs text-red-600 space-y-0.5">{results.failed.map(f => <li key={f.email}>{f.email} — {f.reason}</li>)}</ul>
                </div>
              )}
            </div>
            <button onClick={onClose} className="w-full py-2.5 bg-crimson-600 hover:bg-crimson-700 text-white font-medium rounded-xl text-sm">Done</button>
          </>
        )}
      </div>
    </div>
  )
}

function AddUserModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ email: '', displayName: '', role: 'student' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try { await onCreate(form); onClose() }
    catch (err) { setError(err.message) }
    finally { setSaving(false) }
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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-crimson-500 focus:border-crimson-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
            <input type="text" required value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-crimson-500 focus:border-crimson-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-crimson-500 text-sm bg-white">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-xl">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-crimson-600 hover:bg-crimson-700 disabled:opacity-60 text-white font-medium rounded-xl text-sm">
              {saving ? 'Adding…' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { users, loading, createUser, updateUser, batchAction, bulkCreate } = useUsers()
  const [showAdd, setShowAdd] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [gradeFilter, setGradeFilter] = useState(null)   // null = all grades
  const [selected, setSelected] = useState(new Set())
  const [batchGrade, setBatchGrade] = useState('')
  const [batchBusy, setBatchBusy] = useState(false)
  const [batchError, setBatchError] = useState(null)

  // ── Derived stats ──────────────────────────────────────────────
  const counts = { admin: 0, teacher: 0, student: 0, inactive: 0 }
  users.forEach(u => { if (!u.active) counts.inactive++; else counts[u.role] = (counts[u.role] ?? 0) + 1 })

  const gradeCounts = Object.fromEntries(GRADES.map(g => [g, 0]))
  let unassignedStudents = 0
  users.forEach(u => {
    if (u.role === 'student' && u.active) {
      if (u.gradeGroup && gradeCounts[u.gradeGroup] !== undefined) gradeCounts[u.gradeGroup]++
      else unassignedStudents++
    }
  })

  // ── Filtered list ───────────────────────────────────────────────
  const filtered = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (gradeFilter === 'unassigned' && !(u.role === 'student' && !u.gradeGroup)) return false
    if (gradeFilter && gradeFilter !== 'unassigned' && u.gradeGroup !== gradeFilter) return false
    if (search && !u.email.toLowerCase().includes(search.toLowerCase()) &&
        !u.displayName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // ── Selection helpers ───────────────────────────────────────────
  const toggleOne = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allChecked = filtered.length > 0 && filtered.every(u => selected.has(u.id))
  const someChecked = filtered.some(u => selected.has(u.id))
  const toggleAll = () => {
    if (allChecked) setSelected(s => { const n = new Set(s); filtered.forEach(u => n.delete(u.id)); return n })
    else setSelected(s => { const n = new Set(s); filtered.forEach(u => n.add(u.id)); return n })
  }

  const runBatch = async (action, extra = {}) => {
    const ids = [...selected]
    if (!ids.length) return
    if (action === 'delete' && !window.confirm(`Permanently delete ${ids.length} user(s)? This cannot be undone.`)) return
    setBatchBusy(true)
    setBatchError(null)
    try { await batchAction(ids, action, extra); setSelected(new Set()) }
    catch (err) { setBatchError(err.message) }
    finally { setBatchBusy(false) }
  }

  const toggle = (user) => updateUser(user.id, { active: !user.active })
  const changeRole = (user, role) => updateUser(user.id, { role })

  const clearGradeFilter = () => setGradeFilter(null)

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onCreate={createUser} />}
      {showBulk && <BulkAddModal onClose={() => setShowBulk(false)} onBulkCreate={bulkCreate} />}

      <div>
        <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-2"><ShieldCheck className="text-rose-500" size={28} /> Admin Dashboard</h2>
        <p className="text-slate-500 mt-1">Manage all user accounts and roles.</p>
      </div>

      {/* Role stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Admins',   count: counts.admin,    icon: <ShieldCheck size={18} />,   cls: 'text-rose-600 bg-rose-50' },
          { label: 'Teachers', count: counts.teacher,  icon: <GraduationCap size={18} />, cls: 'text-amber-600 bg-amber-50' },
          { label: 'Students', count: counts.student,  icon: <BookOpen size={18} />,      cls: 'text-crimson-600 bg-crimson-50' },
          { label: 'Inactive', count: counts.inactive, icon: <UserX size={18} />,         cls: 'text-slate-500 bg-slate-100' },
        ].map(({ label, count, icon, cls }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-2 ${cls}`}>{icon}</div>
            <p className="text-2xl font-bold text-slate-800">{count}</p>
            <p className="text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Grade groups */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Grade Groups — Active Students</h3>
          {gradeFilter && (
            <button onClick={clearGradeFilter} className="text-xs text-crimson-600 hover:underline flex items-center gap-1">
              <X size={12} /> Clear filter
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {GRADES.map(g => (
            <button key={g} onClick={() => setGradeFilter(gradeFilter === g ? null : g)}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 text-xs font-semibold transition-colors ${
                gradeFilter === g
                  ? 'border-crimson-500 bg-crimson-50 text-crimson-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-crimson-300 hover:bg-crimson-50/50'
              }`}>
              <span className="text-base font-bold">{gradeCounts[g]}</span>
              <span>{GRADE_LABEL[g]}</span>
            </button>
          ))}
          <button onClick={() => setGradeFilter(gradeFilter === 'unassigned' ? null : 'unassigned')}
            className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl border-2 text-xs font-semibold transition-colors ${
              gradeFilter === 'unassigned'
                ? 'border-slate-500 bg-slate-100 text-slate-700'
                : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-400'
            }`}>
            <span className="text-base font-bold">{unassignedStudents}</span>
            <span>None</span>
          </button>
        </div>
      </div>

      {/* User list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex gap-3 items-center">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
              className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-crimson-500 focus:border-crimson-500" />
            <button onClick={() => setShowBulk(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-xl text-sm shadow-sm transition-colors shrink-0">
              <Users size={16} /> Bulk Add
            </button>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-crimson-600 hover:bg-crimson-700 text-white font-medium rounded-xl text-sm shadow-sm transition-colors shrink-0">
              <Plus size={16} /> Add User
            </button>
          </div>
          {/* Role filter pills */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'admin', 'teacher', 'student'].map(r => (
              <button key={r} onClick={() => { setRoleFilter(r); setSelected(new Set()) }}
                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors ${
                  roleFilter === r
                    ? 'bg-crimson-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                {r === 'all' ? 'All Roles' : r}
              </button>
            ))}
          </div>
        </div>

        {/* Batch action bar */}
        {selected.size > 0 && (
          <div className="px-4 py-3 bg-crimson-50 border-b border-crimson-100 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-crimson-700">{selected.size} selected</span>
            <div className="flex flex-wrap gap-2 flex-1">
              <button onClick={() => runBatch('reactivate')} disabled={batchBusy}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors">
                Reactivate
              </button>
              <button onClick={() => runBatch('deactivate')} disabled={batchBusy}
                className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors">
                Deactivate
              </button>
              <div className="flex items-center gap-1">
                <select value={batchGrade} onChange={e => setBatchGrade(e.target.value)}
                  className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-crimson-400">
                  <option value="">Assign grade…</option>
                  {GRADES.map(g => <option key={g} value={g}>{GRADE_LABEL[g]} Grade</option>)}
                  <option value="clear">— Remove grade</option>
                </select>
                <button onClick={() => batchGrade && runBatch('assignGradeGroup', { gradeGroup: batchGrade === 'clear' ? null : batchGrade })}
                  disabled={batchBusy || !batchGrade}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors">
                  Apply
                </button>
              </div>
              <button onClick={() => runBatch('delete')} disabled={batchBusy}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1">
                <Trash2 size={12} /> Delete
              </button>
            </div>
            <button onClick={() => setSelected(new Set())} className="text-crimson-400 hover:text-crimson-600 p-1"><X size={16} /></button>
            {batchError && <p className="w-full text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">{batchError}</p>}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No users found.</div>
        ) : (
          <>
            {/* Select-all header */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
              <input type="checkbox" checked={allChecked} ref={el => { if (el) el.indeterminate = someChecked && !allChecked }}
                onChange={toggleAll} className="w-4 h-4 accent-crimson-600 rounded cursor-pointer" />
              <span className="text-xs text-slate-500 font-medium">Select all ({filtered.length})</span>
            </div>
            <div className="divide-y divide-slate-50">
              {filtered.map(u => (
                <div key={u.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${u.active ? 'hover:bg-slate-50' : 'opacity-50 bg-slate-50'}`}>
                  <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleOne(u.id)}
                    className="w-4 h-4 accent-crimson-600 rounded cursor-pointer shrink-0" />
                  <div className="w-9 h-9 rounded-full bg-crimson-100 flex items-center justify-center text-crimson-700 font-bold text-sm shrink-0">
                    {u.displayName?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{u.displayName}</p>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                  </div>
                  {u.role === 'student' && (
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                      {u.gradeGroup ? GRADE_LABEL[u.gradeGroup] : '—'}
                    </span>
                  )}
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
          </>
        )}
      </div>
    </div>
  )
}
