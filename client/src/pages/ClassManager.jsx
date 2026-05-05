import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus, UserMinus, Share2, X, CheckCircle2, Users, Search } from 'lucide-react'
import { useClasses } from '../hooks/useClasses.js'
import { useSets } from '../hooks/useSets.js'
import { useAuth } from '../context/AuthContext.jsx'

function BulkAddStudentsModal({ onClose, onBulkAdd }) {
  const [text, setText] = useState('')
  const [results, setResults] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const entries = text.split('\n').map(line => {
    const [rawEmail, ...nameParts] = line.split(',')
    return { email: rawEmail?.trim(), displayName: nameParts.join(',').trim() }
  }).filter(e => e.email)

  const handleSubmit = async () => {
    if (!entries.length) return
    setSaving(true); setError('')
    try { setResults(await onBulkAdd(entries)) }
    catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Users size={18} className="text-crimson-600" /> Bulk Add Students</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X size={18} /></button>
        </div>

        {!results ? (
          <>
            <p className="text-sm text-slate-500 mb-1">One student per line: <span className="font-mono text-slate-700">email, Display Name</span></p>
            <p className="text-xs text-slate-400 mb-3">Each email is checked for an existing account. If found, the student is enrolled. If not found, a new account is created with the display name provided.</p>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={10}
              placeholder={"alice@school.org, Alice Smith\nbob@school.org, Bob Jones\ncarol@school.org, Carol Lee"}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-crimson-500 resize-none mb-2" />
            <p className="text-xs text-slate-400 mb-4">{entries.length} student{entries.length !== 1 ? 's' : ''} entered</p>
            {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-xl mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl text-sm">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !entries.length}
                className="flex-1 py-2.5 bg-crimson-600 hover:bg-crimson-700 disabled:opacity-60 text-white font-medium rounded-xl text-sm">
                {saving ? 'Adding…' : `Add ${entries.length} Student${entries.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3 mb-5">
              {results.created?.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-blue-700 mb-2">{results.created.length} new account{results.created.length !== 1 ? 's' : ''} created &amp; enrolled</p>
                  <ul className="text-xs text-blue-600 space-y-0.5">{results.created.map(e => <li key={e}>{e}</li>)}</ul>
                </div>
              )}
              {results.added.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-emerald-700 mb-2">{results.added.length} added successfully</p>
                  <ul className="text-xs text-emerald-600 space-y-0.5">{results.added.map(e => <li key={e}>{e}</li>)}</ul>
                </div>
              )}
              {results.alreadyIn.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-slate-600 mb-2">{results.alreadyIn.length} already enrolled</p>
                  <ul className="text-xs text-slate-500 space-y-0.5">{results.alreadyIn.map(e => <li key={e}>{e}</li>)}</ul>
                </div>
              )}
              {results.notFound.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-amber-700 mb-2">{results.notFound.length} not found — add a display name to create</p>
                  <ul className="text-xs text-amber-600 space-y-0.5">{results.notFound.map(e => <li key={e}>{e}</li>)}</ul>
                </div>
              )}
              {results.notStudent.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-red-700 mb-2">{results.notStudent.length} skipped — not a student account</p>
                  <ul className="text-xs text-red-600 space-y-0.5">{results.notStudent.map(e => <li key={e}>{e}</li>)}</ul>
                </div>
              )}
            </div>
            <button onClick={() => { onClose(); }} className="w-full py-2.5 bg-crimson-600 hover:bg-crimson-700 text-white font-medium rounded-xl text-sm">Done</button>
          </>
        )}
      </div>
    </div>
  )
}

function PickStudentsModal({ enrolledIds, onClose, onBulkAdd }) {
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState(null) // null = all
  const [selected, setSelected] = useState(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/classes/students', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setAll(data); setLoading(false) })
      .catch(() => { setError('Failed to load students'); setLoading(false) })
  }, [])

  const GRADES = ['K', '1', '2', '3', '4', '5', '6', '7', '8']
  const unenrolled = all.filter(s => !enrolledIds.has(s.id))
  const filtered = unenrolled.filter(s => {
    if (gradeFilter === 'none' && s.gradeGroup != null) return false
    if (gradeFilter && gradeFilter !== 'none' && s.gradeGroup !== gradeFilter) return false
    return s.displayName.toLowerCase().includes(search.toLowerCase()) ||
           s.email.toLowerCase().includes(search.toLowerCase())
  })

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(s => s.id)))
  }

  const handleAdd = async () => {
    const entries = all.filter(s => selected.has(s.id)).map(s => ({ email: s.email, displayName: s.displayName }))
    setSaving(true); setError('')
    try { await onBulkAdd(entries); onClose() }
    catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Users size={18} className="text-crimson-600" /> Pick from Student List</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X size={18} /></button>
        </div>

        <div className="relative mb-2">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-crimson-500" />
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {[null, ...GRADES, 'none'].map(g => {
            const label = g === null ? 'All' : g === 'none' ? 'No grade' : `Gr ${g}`
            const active = gradeFilter === g
            return (
              <button key={String(g)} onClick={() => setGradeFilter(g)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${active ? 'bg-crimson-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {label}
              </button>
            )
          })}
        </div>

        {loading ? (
          <p className="text-sm text-slate-400 text-center py-8">Loading…</p>
        ) : unenrolled.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">All students are already enrolled.</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs text-slate-400">{filtered.length} student{filtered.length !== 1 ? 's' : ''} shown</span>
              {filtered.length > 0 && (
                <button onClick={toggleAll} className="text-xs text-crimson-600 font-medium hover:underline">
                  {selected.size === filtered.length ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>
            <ul className="overflow-y-auto flex-1 space-y-1 mb-4">
              {filtered.map(s => (
                <li key={s.id} onClick={() => toggle(s.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${selected.has(s.id) ? 'bg-crimson-50 border border-crimson-200' : 'hover:bg-slate-50 border border-transparent'}`}>
                  <input type="checkbox" readOnly checked={selected.has(s.id)} className="accent-crimson-600 w-4 h-4 shrink-0" />
                  {s.photoUrl
                    ? <img src={s.photoUrl} alt="" className="w-7 h-7 rounded-full shrink-0" />
                    : <div className="w-7 h-7 rounded-full bg-crimson-200 flex items-center justify-center text-crimson-700 font-bold text-xs shrink-0">{s.displayName?.[0]}</div>
                  }
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 text-sm truncate">{s.displayName}</p>
                    <p className="text-xs text-slate-400 truncate">{s.email}</p>
                  </div>
                  {s.gradeGroup && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0">Gr {s.gradeGroup}</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl text-sm">Cancel</button>
          <button onClick={handleAdd} disabled={saving || selected.size === 0}
            className="flex-1 py-2.5 bg-crimson-600 hover:bg-crimson-700 disabled:opacity-60 text-white font-medium rounded-xl text-sm">
            {saving ? 'Adding…' : `Add ${selected.size || ''} Student${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ClassManager() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { classes, addStudent, bulkAddStudents, removeStudent, shareSet, unshareSet, refetch } = useClasses()
  const { sets, refetch: refetchSets } = useSets()

  const cls = classes.find(c => c.id === id)
  const mySets = sets.filter(s => s.ownerId === user.id)

  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [addMsg, setAddMsg] = useState(null)
  const [addError, setAddError] = useState(null)
  const [adding, setAdding] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [showPick, setShowPick] = useState(false)

  if (!cls) return (
    <div className="text-center py-20 text-slate-500">
      <p>Class not found.</p>
      <button onClick={() => navigate('/')} className="mt-4 text-crimson-600 font-medium">← Back to dashboard</button>
    </div>
  )

  const sharedSetIds = new Set(
    mySets.filter(s => s.shares?.some(sh => sh.classId === id)).map(s => s.id)
  )

  const handleAddStudent = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    try {
      setAdding(true); setAddMsg(null); setAddError(null)
      const res = await addStudent(id, email.trim(), displayName.trim())
      setAddMsg(`Added ${res.student.displayName} successfully.`)
      setEmail(''); setDisplayName('')
      refetch()
    } catch (err) {
      setAddError(err.message)
    } finally { setAdding(false) }
  }

  const handleRemove = async (studentId) => {
    if (!window.confirm('Remove this student?')) return
    await removeStudent(id, studentId)
    refetch()
  }

  const handleToggleShare = async (setId) => {
    if (sharedSetIds.has(setId)) await unshareSet(id, setId)
    else await shareSet(id, setId)
    refetch()
    refetchSets()
  }

  const handleBulkAdd = async (entries) => {
    const result = await bulkAddStudents(id, entries)
    refetch()
    return result
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
      {showBulk && <BulkAddStudentsModal onClose={() => setShowBulk(false)} onBulkAdd={handleBulkAdd} />}
      {showPick && <PickStudentsModal enrolledIds={new Set(cls.members?.map(m => m.studentId))} onClose={() => { setShowPick(false); refetch() }} onBulkAdd={handleBulkAdd} />}
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-crimson-600 font-medium transition-colors touch-manipulation">
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-1">{cls.name}</h2>
        <p className="text-slate-500 text-sm">{cls.members?.length ?? 0} students enrolled</p>
      </div>

      {/* Add Student */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><UserPlus size={20} className="text-crimson-600" /> Add Students</h3>
          <div className="flex gap-2">
            <button onClick={() => setShowPick(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition-colors touch-manipulation">
              <Search size={15} /> Pick from List
            </button>
            <button onClick={() => setShowBulk(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition-colors touch-manipulation">
              <Users size={15} /> Bulk Add
            </button>
          </div>
        </div>
        <form onSubmit={handleAddStudent} className="space-y-3">
          <div className="flex gap-3">
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="student@school.edu"
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-crimson-500 focus:border-crimson-500 outline-none transition-all" />
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} type="text" placeholder="Display Name"
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-crimson-500 focus:border-crimson-500 outline-none transition-all" />
            <button type="submit" disabled={adding || !email.trim() || !displayName.trim()} className="px-5 py-3 bg-crimson-600 hover:bg-crimson-700 disabled:opacity-60 text-white font-medium rounded-xl flex items-center gap-2 shadow-sm transition-all touch-manipulation">
              <UserPlus size={18} /> Add
            </button>
          </div>
        </form>
        {addMsg && <p className="mt-3 text-sm text-emerald-600 flex items-center gap-2"><CheckCircle2 size={16} /> {addMsg}</p>}
        {addError && <p className="mt-3 text-sm text-red-600">{addError}</p>}
        <p className="mt-3 text-xs text-slate-400">Enter email and display name. If the student already has an account, they will be enrolled. Otherwise a new account is created.</p>
      </section>

      {/* Student List */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><UserPlus size={20} className="text-crimson-600" /> Enrolled Students</h3>
        {!cls.members?.length ? (
          <p className="text-slate-400 text-sm">No students yet.</p>
        ) : (
          <ul className="space-y-3">
            {cls.members.map(m => (
              <li key={m.studentId} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  {m.student.photoUrl
                    ? <img src={m.student.photoUrl} alt="" className="w-8 h-8 rounded-full" />
                    : <div className="w-8 h-8 rounded-full bg-crimson-200 flex items-center justify-center text-crimson-700 font-bold text-sm">{m.student.displayName?.[0]}</div>
                  }
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{m.student.displayName}</p>
                    <p className="text-xs text-slate-400">{m.student.email}</p>
                  </div>
                </div>
                <button onClick={() => handleRemove(m.studentId)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors touch-manipulation">
                  <UserMinus size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Share Sets */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Share2 size={20} className="text-crimson-600" /> Share Word Sets with This Class</h3>
        {!mySets.length ? (
          <p className="text-slate-400 text-sm">You have no word sets yet. <button onClick={() => navigate('/sets/new')} className="text-crimson-600 underline">Create one</button>.</p>
        ) : (
          <ul className="space-y-3">
            {mySets.map(set => {
              const shared = sharedSetIds.has(set.id)
              return (
                <li key={set.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{set.title}</p>
                    <p className="text-xs text-slate-400">{set.cards.length} cards</p>
                  </div>
                  <button onClick={() => handleToggleShare(set.id)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors touch-manipulation flex items-center gap-2 ${shared ? 'bg-emerald-50 text-emerald-700 hover:bg-red-50 hover:text-red-600' : 'bg-crimson-50 text-crimson-600 hover:bg-crimson-100'}`}>
                    {shared ? <><X size={14} /> Unshare</> : <><Share2 size={14} /> Share</>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
