import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Library, Search, Play, Edit3, Trash2, Layers, Globe, Users, RefreshCw } from 'lucide-react'
import { useSets } from '../hooks/useSets.js'
import { ROLE_LABEL } from '../utils/roles.js'
import { GRADES, GRADE_LABEL } from '../utils/grades.js'
import StudyMenu from '../components/StudyMenu.jsx'

const ROLE_FILTERS = [
  { key: 'all', label: 'Everyone' },
  { key: 'student', label: 'Students' },
  { key: 'teacher', label: 'Teachers' },
  { key: 'admin', label: 'Admins' },
]

// Super admin: browse, study, edit and delete every set anyone created (server: GET /api/sets/all)
export default function AllSets() {
  const navigate = useNavigate()
  const { fetchAllSets, fetchSet, deleteSet, saveSet } = useSets()
  const [sets, setSets] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [grade, setGrade] = useState('')
  const [activeSet, setActiveSet] = useState(null)
  const [openingId, setOpeningId] = useState(null)

  const load = () => fetchAllSets().then(setSets).catch(err => setError(err.message))
  useEffect(() => { load() }, [])

  const q = search.trim().toLowerCase()
  const filtered = (sets ?? []).filter(s => {
    const role = s.owner.role === 'super_admin' ? 'admin' : s.owner.role
    if (roleFilter !== 'all' && role !== roleFilter) return false
    if (grade && s.owner.gradeGroup !== grade) return false
    if (q && !s.title.toLowerCase().includes(q) && !s.owner.displayName.toLowerCase().includes(q)
        && !s.owner.email.toLowerCase().includes(q)) return false
    return true
  })

  const open = async (id) => {
    setOpeningId(id); setError('')
    try { setActiveSet(await fetchSet(id)) }
    catch (err) { setError(err.message) }
    finally { setOpeningId(null) }
  }

  const remove = async (s) => {
    if (!window.confirm(`Delete "${s.title}" by ${s.owner.displayName}? This cannot be undone.`)) return
    setError('')
    try {
      await deleteSet(s.id)
      setSets(prev => prev.filter(x => x.id !== s.id))
    } catch (err) { setError(err.message) }
  }

  const handleCreateMissedSet = async (missedCards) => {
    const newSet = await saveSet({ title: `${activeSet.title} (Practice)`, cards: missedCards })
    setActiveSet(newSet)
  }

  if (activeSet) return (
    <StudyMenu set={activeSet} onBack={() => setActiveSet(null)} onCreateMissedSet={handleCreateMissedSet} />
  )

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-2"><Library className="text-crimson-600" /> All Sets</h2>
        <p className="text-slate-500 mt-1">Every word set created by anyone at school. You can study, edit or delete any of them.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, owner name or email…"
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-crimson-500 focus:border-crimson-500 text-sm" />
          </div>
          <select value={grade} onChange={e => setGrade(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-crimson-500 text-sm bg-white">
            <option value="">All grades</option>
            {GRADES.map(g => <option key={g} value={g}>{GRADE_LABEL[g]} grade</option>)}
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          {ROLE_FILTERS.map(f => (
            <button key={f.key} onClick={() => setRoleFilter(f.key)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${roleFilter === f.key ? 'bg-crimson-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

      {sets === null ? (
        !error && <div className="flex items-center justify-center py-16 text-slate-400"><RefreshCw className="animate-spin mr-2" size={18} /> Loading…</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-500 font-medium">
            {filtered.length} of {sets.length} sets
          </div>
          {filtered.length === 0 ? (
            <p className="p-10 text-center text-slate-400">No sets match.</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {filtered.map(s => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{s.title}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-slate-500">
                      <span className="truncate max-w-[14rem]">{s.owner.displayName}</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded-full">{ROLE_LABEL[s.owner.role]}</span>
                      {s.owner.role === 'student' && s.owner.gradeGroup && <span className="bg-slate-100 px-2 py-0.5 rounded-full">Gr {s.owner.gradeGroup}</span>}
                      <span className="flex items-center gap-1"><Layers size={12} /> {s._count.cards}</span>
                      {s.isPublic && <span className="flex items-center gap-1 bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full"><Globe size={11} /> Public</span>}
                      {s.sharedWithGrade && <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full"><Users size={11} /> Grade</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => open(s.id)} disabled={openingId === s.id} title="Study"
                      className="p-2 text-slate-400 hover:text-crimson-600 hover:bg-crimson-50 rounded-lg disabled:opacity-50"><Play size={18} /></button>
                    <button onClick={() => navigate(`/sets/${s.id}/edit`)} title="Edit"
                      className="p-2 text-slate-400 hover:text-crimson-600 hover:bg-crimson-50 rounded-lg"><Edit3 size={18} /></button>
                    <button onClick={() => remove(s)} title="Delete"
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
