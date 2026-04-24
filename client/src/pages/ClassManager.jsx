import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus, UserMinus, Share2, X, CheckCircle2, Users } from 'lucide-react'
import { useClasses } from '../hooks/useClasses.js'
import { useSets } from '../hooks/useSets.js'
import { useAuth } from '../context/AuthContext.jsx'

function BulkAddStudentsModal({ onClose, onBulkAdd }) {
  const [text, setText] = useState('')
  const [results, setResults] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const emails = text.split('\n').map(l => l.trim()).filter(Boolean)

  const handleSubmit = async () => {
    if (!emails.length) return
    setSaving(true); setError('')
    try { setResults(await onBulkAdd(emails)) }
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
            <p className="text-sm text-slate-500 mb-3">One student email per line. Students must have signed in to the app at least once.</p>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={10}
              placeholder={"alice@school.org\nbob@school.org\ncarol@school.org"}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-crimson-500 resize-none mb-2" />
            <p className="text-xs text-slate-400 mb-4">{emails.length} email{emails.length !== 1 ? 's' : ''} entered</p>
            {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-xl mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl text-sm">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !emails.length}
                className="flex-1 py-2.5 bg-crimson-600 hover:bg-crimson-700 disabled:opacity-60 text-white font-medium rounded-xl text-sm">
                {saving ? 'Adding…' : `Add ${emails.length} Student${emails.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3 mb-5">
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
                  <p className="text-sm font-semibold text-amber-700 mb-2">{results.notFound.length} not found — haven't signed in yet</p>
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

export default function ClassManager() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { classes, addStudent, bulkAddStudents, removeStudent, shareSet, unshareSet, refetch } = useClasses()
  const { sets, refetch: refetchSets } = useSets()

  const cls = classes.find(c => c.id === id)
  const mySets = sets.filter(s => s.ownerId === user.id)

  const [email, setEmail] = useState('')
  const [addMsg, setAddMsg] = useState(null)
  const [addError, setAddError] = useState(null)
  const [adding, setAdding] = useState(false)
  const [showBulk, setShowBulk] = useState(false)

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
      const res = await addStudent(id, email.trim())
      setAddMsg(`Added ${res.student.displayName} successfully.`)
      setEmail('')
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

  const handleBulkAdd = async (emails) => {
    const result = await bulkAddStudents(id, emails)
    refetch()
    return result
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
      {showBulk && <BulkAddStudentsModal onClose={() => setShowBulk(false)} onBulkAdd={handleBulkAdd} />}
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
          <button onClick={() => setShowBulk(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition-colors touch-manipulation">
            <Users size={15} /> Bulk Add
          </button>
        </div>
        <form onSubmit={handleAddStudent} className="flex gap-3">
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="student@school.edu"
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-crimson-500 focus:border-crimson-500 outline-none transition-all" />
          <button type="submit" disabled={adding || !email.trim()} className="px-5 py-3 bg-crimson-600 hover:bg-crimson-700 disabled:opacity-60 text-white font-medium rounded-xl flex items-center gap-2 shadow-sm transition-all touch-manipulation">
            <UserPlus size={18} /> Add
          </button>
        </form>
        {addMsg && <p className="mt-3 text-sm text-emerald-600 flex items-center gap-2"><CheckCircle2 size={16} /> {addMsg}</p>}
        {addError && <p className="mt-3 text-sm text-red-600">{addError}</p>}
        <p className="mt-3 text-xs text-slate-400">Students must have signed in to the app at least once before you can add them.</p>
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
