import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, BarChart2, Play, Edit3, Trash2, Layers, GraduationCap, Download, Check, X } from 'lucide-react'
import { useSets } from '../hooks/useSets.js'
import { useClasses } from '../hooks/useClasses.js'
import { useAuth } from '../context/AuthContext.jsx'
import StudyMenu from '../components/StudyMenu.jsx'

export default function TeacherDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { sets, loading: setsLoading, saveSet, deleteSet } = useSets()
  const { classes, loading: classesLoading, createClass, renameClass, deleteClass } = useClasses()
  const [newClassName, setNewClassName] = useState('')
  const [creating, setCreating] = useState(false)
  const [activeSet, setActiveSet] = useState(null)
  const [editingClassId, setEditingClassId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const editInputRef = useRef(null)

  const startEdit = (cls) => {
    setEditingClassId(cls.id)
    setEditingName(cls.name)
    setTimeout(() => editInputRef.current?.select(), 0)
  }

  const cancelEdit = () => { setEditingClassId(null); setEditingName('') }

  const commitEdit = async (id) => {
    if (!editingName.trim()) return cancelEdit()
    await renameClass(id, editingName)
    cancelEdit()
  }

  const mySets = sets.filter(s => s.ownerId === user.id)

  const handleCreateClass = async (e) => {
    e.preventDefault()
    if (!newClassName.trim()) return
    try {
      setCreating(true)
      await createClass(newClassName)
      setNewClassName('')
    } finally { setCreating(false) }
  }

  const handleDeleteSet = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('Delete this set?')) return
    await deleteSet(id)
  }

  const handleCreateMissedSet = async (missedCards) => {
    const newSet = await saveSet({ title: `${activeSet.title} (Practice)`, cards: missedCards })
    setActiveSet(newSet)
  }

  if (activeSet) return (
    <StudyMenu set={activeSet} onBack={() => setActiveSet(null)} onCreateMissedSet={handleCreateMissedSet} />
  )

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">Teacher Dashboard</h2>
        <p className="text-slate-500 mt-1">Manage your classes and word sets.</p>
      </div>

      {/* Classes */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Users size={20} className="text-crimson-600" /> My Classes</h3>
          <button onClick={() => navigate('/teacher/classroom')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-crimson-600 bg-crimson-50 hover:bg-crimson-100 rounded-xl transition-colors">
            <Download size={15} /> Import from Google Classroom
          </button>
        </div>

        <form onSubmit={handleCreateClass} className="flex gap-3 mb-6">
          <input value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="New class name…"
            className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-crimson-500 focus:border-crimson-500 outline-none transition-all" />
          <button type="submit" disabled={creating || !newClassName.trim()} className="px-5 py-3 bg-crimson-600 hover:bg-crimson-700 disabled:opacity-60 text-white font-medium rounded-xl flex items-center gap-2 shadow-sm transition-all touch-manipulation">
            <Plus size={18} /> Create
          </button>
        </form>

        {classesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <GraduationCap className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <p className="text-slate-500">No classes yet — create one above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map(cls => (
              <div key={cls.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-crimson-200 transition-all">
                <div className="flex justify-between items-start mb-3">
                  {editingClassId === cls.id ? (
                    <div className="flex items-center gap-1.5 flex-1 mr-2">
                      <input
                        ref={editInputRef}
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(cls.id); if (e.key === 'Escape') cancelEdit() }}
                        className="flex-1 font-bold text-slate-800 text-lg px-2 py-0.5 border border-crimson-400 rounded-lg outline-none focus:ring-2 focus:ring-crimson-500/20"
                      />
                      <button onClick={() => commitEdit(cls.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Check size={16} /></button>
                      <button onClick={cancelEdit} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><X size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(cls)} className="font-bold text-slate-800 text-lg text-left hover:text-crimson-600 transition-colors group flex items-center gap-1.5">
                      {cls.name}
                      <Edit3 size={13} className="opacity-0 group-hover:opacity-40 transition-opacity shrink-0" />
                    </button>
                  )}
                  {editingClassId !== cls.id && (
                    <button onClick={() => deleteClass(cls.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors touch-manipulation shrink-0"><Trash2 size={16} /></button>
                  )}
                </div>
                <p className="text-sm text-slate-500 mb-4">{cls.members?.length ?? 0} students</p>
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/classes/${cls.id}`)} className="flex-1 py-2 text-sm font-medium text-crimson-600 bg-crimson-50 hover:bg-crimson-100 rounded-xl flex items-center justify-center gap-1.5 transition-colors touch-manipulation">
                    <Users size={15} /> Manage
                  </button>
                  <button onClick={() => navigate(`/classes/${cls.id}/progress`)} className="flex-1 py-2 text-sm font-medium text-gold-600 bg-gold-50 hover:bg-gold-100 rounded-xl flex items-center justify-center gap-1.5 transition-colors touch-manipulation">
                    <BarChart2 size={15} /> Progress
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Word Sets */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Layers size={20} className="text-crimson-600" /> My Word Sets</h3>
          <button onClick={() => navigate('/sets/new')} className="bg-crimson-600 hover:bg-crimson-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-sm transition-all active:scale-95 touch-manipulation text-sm">
            <Plus size={18} /> Create Set
          </button>
        </div>

        {setsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-40 bg-slate-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : mySets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <Layers className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-500 mb-4">No sets yet.</p>
            <button onClick={() => navigate('/sets/new')} className="text-crimson-600 font-medium hover:text-crimson-700 touch-manipulation">Create one now →</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mySets.map(set => (
              <div key={set.id} onClick={() => setActiveSet(set)} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-crimson-200 transition-all cursor-pointer group flex flex-col touch-manipulation">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-slate-800 group-hover:text-crimson-600 transition-colors line-clamp-2">{set.title}</h3>
                  <div className="flex gap-1">
                    <button onClick={e => { e.stopPropagation(); navigate(`/sets/${set.id}/edit`) }} className="p-2 text-slate-400 hover:text-crimson-600 hover:bg-crimson-50 rounded-lg touch-manipulation"><Edit3 size={18} /></button>
                    <button onClick={e => handleDeleteSet(set.id, e)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg touch-manipulation"><Trash2 size={18} /></button>
                  </div>
                </div>
                {set.shares?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {set.shares.map(sh => <span key={sh.classId} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{sh.class.name}</span>)}
                  </div>
                )}
                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1.5"><Layers size={14} /> {set.cards.length} Cards</span>
                  <span className="text-crimson-600 font-medium text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform">Play <Play size={16} /></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
