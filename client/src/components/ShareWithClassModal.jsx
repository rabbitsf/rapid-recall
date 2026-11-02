import { useState, useEffect } from 'react'
import { Share2, X, Users, Check, UserCheck } from 'lucide-react'

// Student shares one of their own sets, per class: with the whole class or with chosen classmates
export default function ShareWithClassModal({ set, classes, onShareClass, onShareStudents, onUnshare, getClassmates, onClose }) {
  // classId -> 'class' | [studentId, ...]; absent = not shared
  const [shared, setShared] = useState(() => {
    const init = {}
    for (const sh of set.shares ?? []) init[sh.classId] = 'class'
    for (const sh of set.studentShares ?? []) {
      if (init[sh.classId] !== 'class') init[sh.classId] = [...(init[sh.classId] ?? []), sh.student.id]
    }
    return init
  })
  const [pickingId, setPickingId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const run = async (classId, action, next) => {
    setBusyId(classId); setError('')
    try {
      await action()
      setShared(prev => {
        const copy = { ...prev }
        if (next === null) delete copy[classId]; else copy[classId] = next
        return copy
      })
      return true
    } catch (err) { setError(err.message); return false }
    finally { setBusyId(null) }
  }

  const toggleWholeClass = (classId) => shared[classId] === 'class'
    ? run(classId, () => onUnshare(classId, set.id), null)
    : run(classId, () => onShareClass(classId, set.id), 'class')

  const savePicks = async (classId, studentIds) => {
    const ok = await run(classId, () => onShareStudents(classId, set.id, studentIds), studentIds.length ? studentIds : null)
    if (ok) setPickingId(null)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Share2 size={18} className="text-crimson-600" /> Share with Classmates</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X size={18} /></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">Share "{set.title}" with a whole class or just the classmates you pick. Your teacher can see what you share. Only you can edit it.</p>

        <ul className="flex-1 overflow-y-auto space-y-2 mb-4">
          {classes.map(cls => {
            const state = shared[cls.id]
            const busy = busyId === cls.id
            return (
              <li key={cls.id} className="p-3 rounded-xl bg-slate-50">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{cls.name}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {state === 'class' ? 'Shared with the whole class'
                        : Array.isArray(state) ? `Shared with ${state.length} classmate${state.length === 1 ? '' : 's'}`
                        : 'Not shared'}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => toggleWholeClass(cls.id)} disabled={busy}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors touch-manipulation flex items-center gap-1.5 disabled:opacity-60 ${state === 'class' ? 'bg-emerald-50 text-emerald-700 hover:bg-red-50 hover:text-red-600' : 'bg-crimson-50 text-crimson-600 hover:bg-crimson-100'}`}>
                      {state === 'class' ? <><X size={14} /> Unshare</> : <><Users size={14} /> Whole class</>}
                    </button>
                    <button onClick={() => setPickingId(pickingId === cls.id ? null : cls.id)} disabled={busy}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors touch-manipulation flex items-center gap-1.5 disabled:opacity-60 ${Array.isArray(state) ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                      <UserCheck size={14} /> Pick
                    </button>
                  </div>
                </div>
                {pickingId === cls.id && (
                  <ClassmatePicker
                    classId={cls.id}
                    initial={Array.isArray(state) ? state : []}
                    getClassmates={getClassmates}
                    saving={busy}
                    onSave={ids => savePicks(cls.id, ids)}
                    onCancel={() => setPickingId(null)}
                  />
                )}
              </li>
            )
          })}
        </ul>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <button onClick={onClose} className="w-full py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Done</button>
      </div>
    </div>
  )
}

function ClassmatePicker({ classId, initial, getClassmates, saving, onSave, onCancel }) {
  const [classmates, setClassmates] = useState(null)
  const [selected, setSelected] = useState(() => new Set(initial))
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    getClassmates(classId).then(setClassmates).catch(err => setLoadError(err.message))
  }, [classId])

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  if (loadError) return <p className="text-sm text-red-600 mt-3">{loadError}</p>
  if (!classmates) return <p className="text-sm text-slate-400 mt-3">Loading classmates…</p>

  return (
    <div className="mt-3 pt-3 border-t border-slate-200">
      {classmates.length === 0 ? (
        <p className="text-sm text-slate-400">No other students in this class yet.</p>
      ) : (
        <div className="max-h-56 overflow-y-auto space-y-1 mb-3">
          {classmates.map(s => {
            const on = selected.has(s.id)
            return (
              <button key={s.id} onClick={() => toggle(s.id)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${on ? 'bg-crimson-50' : 'hover:bg-white'}`}>
                <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${on ? 'bg-crimson-600 border-crimson-600' : 'border-slate-300 bg-white'}`}>
                  {on && <Check size={13} className="text-white" />}
                </div>
                <span className="text-sm text-slate-800 truncate">{s.displayName}</span>
              </button>
            )
          })}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl">Cancel</button>
        <button onClick={() => onSave([...selected])} disabled={saving || (selected.size === 0 && initial.length === 0)}
          className="flex-1 py-2 text-sm font-medium text-white bg-crimson-600 hover:bg-crimson-700 disabled:opacity-60 rounded-xl">
          {saving ? 'Saving…' : selected.size === 0 ? 'Unshare' : `Share with ${selected.size}`}
        </button>
      </div>
    </div>
  )
}
