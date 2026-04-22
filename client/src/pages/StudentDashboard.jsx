import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Play, Edit3, Trash2, Layers, BookOpen, GraduationCap } from 'lucide-react'
import { useSets } from '../hooks/useSets.js'
import { useStudyLogs } from '../hooks/useStudyLogs.js'
import { useClasses } from '../hooks/useClasses.js'
import { useAuth } from '../context/AuthContext.jsx'
import StudyCalendar from '../components/StudyCalendar.jsx'
import StudyMenu from '../components/StudyMenu.jsx'

export default function StudentDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { sets, loading, saveSet, deleteSet } = useSets()
  const { logs, updateLog } = useStudyLogs()
  const { classes } = useClasses()
  const [tab, setTab] = useState('my') // 'my' | 'class'
  const [activeSet, setActiveSet] = useState(null)

  const mySets = sets.filter(s => s.ownerId === user.id)
  const classSets = sets.filter(s => s.ownerId !== user.id)

  const handleDelete = async (id, e) => {
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <StudyCalendar logs={logs} onUpdateLog={updateLog} />

      {classes.length > 0 && (
        <div className="flex gap-2 bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm w-fit">
          <button onClick={() => setTab('my')} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors flex items-center gap-2 ${tab === 'my' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <BookOpen size={16} /> My Sets
          </button>
          <button onClick={() => setTab('class')} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors flex items-center gap-2 ${tab === 'class' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <GraduationCap size={16} /> Class Sets {classSets.length > 0 && <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{classSets.length}</span>}
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">{tab === 'my' ? 'My Word Sets' : 'Class Word Sets'}</h2>
          <p className="text-slate-500 mt-1">{tab === 'my' ? 'Create and practice your own sets.' : 'Sets shared by your teacher.'}</p>
        </div>
        {tab === 'my' && (
          <button onClick={() => navigate('/sets/new')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-medium flex items-center gap-2 shadow-sm transition-all hover:shadow-md active:scale-95 touch-manipulation">
            <Plus size={20} /> Create New Set
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <SetGrid
          sets={tab === 'my' ? mySets : classSets}
          ownerId={user.id}
          onPlay={setActiveSet}
          onEdit={(id) => navigate(`/sets/${id}/edit`)}
          onDelete={handleDelete}
          emptyMsg={tab === 'my' ? 'No sets yet — create your first one!' : 'No class sets yet. Ask your teacher to share some.'}
          onCreateNew={tab === 'my' ? () => navigate('/sets/new') : null}
        />
      )}
    </div>
  )
}

function SetGrid({ sets, ownerId, onPlay, onEdit, onDelete, emptyMsg, onCreateNew }) {
  if (!sets.length) return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
      <Layers className="mx-auto h-12 w-12 text-slate-300 mb-4" />
      <p className="text-slate-500 mb-4">{emptyMsg}</p>
      {onCreateNew && <button onClick={onCreateNew} className="text-indigo-600 font-medium hover:text-indigo-700 touch-manipulation">Create one now →</button>}
    </div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sets.map(set => (
        <div key={set.id} onClick={() => onPlay(set)} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group flex flex-col touch-manipulation">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2">{set.title}</h3>
            {set.ownerId === ownerId && (
              <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                <button onClick={e => { e.stopPropagation(); onEdit(set.id) }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg touch-manipulation"><Edit3 size={18} /></button>
                <button onClick={e => onDelete(set.id, e)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg touch-manipulation"><Trash2 size={18} /></button>
              </div>
            )}
          </div>
          {set.owner && set.ownerId !== ownerId && (
            <p className="text-xs text-slate-400 mb-2">by {set.owner.displayName}</p>
          )}
          <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1.5"><Layers size={14} /> {set.cards.length} Cards</span>
            <span className="text-indigo-600 font-medium text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform">Play <Play size={16} /></span>
          </div>
        </div>
      ))}
    </div>
  )
}
