import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Gamepad2, Trophy, ChevronDown, ChevronUp } from 'lucide-react'

export default function StudentProgress() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    fetch(`/api/progress/class/${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-crimson-600 border-t-transparent rounded-full animate-spin" /></div>
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>
  if (!data) return null

  const sorted = [...data.students].sort((a, b) => b.totalMinutes - a.totalMinutes)

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-crimson-600 font-medium transition-colors touch-manipulation">
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Student Progress</h2>
        <p className="text-slate-500 text-sm">{data.class.name} · {data.students.length} students</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Students', value: data.students.length, icon: Trophy, color: 'crimson' },
          { label: 'Avg Practice Time', value: `${data.students.length ? Math.round(data.students.reduce((s, st) => s + st.totalMinutes, 0) / data.students.length) : 0}m`, icon: Clock, color: 'emerald' },
          { label: 'Total Game Sessions', value: data.students.reduce((s, st) => s + st.gameCount, 0), icon: Gamepad2, color: 'gold' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-center">
            <card.icon size={24} className={`mx-auto mb-2 text-${card.color}-600`} />
            <p className="text-2xl font-bold text-slate-800">{card.value}</p>
            <p className="text-xs text-slate-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Student table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <span>Student</span>
          <span className="text-right">Practice Time</span>
          <span className="text-right">Games Played</span>
          <span />
        </div>
        {sorted.length === 0 ? (
          <p className="text-center py-10 text-slate-400">No data yet.</p>
        ) : sorted.map(student => (
          <div key={student.id}>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-4 border-b border-slate-100 items-center hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                {student.photoUrl
                  ? <img src={student.photoUrl} alt="" className="w-9 h-9 rounded-full shrink-0" />
                  : <div className="w-9 h-9 rounded-full bg-crimson-200 flex items-center justify-center text-crimson-700 font-bold shrink-0">{student.displayName?.[0]}</div>
                }
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{student.displayName}</p>
                  <p className="text-xs text-slate-400 truncate">{student.email}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-full ${student.totalMinutes >= 30 ? 'bg-emerald-100 text-emerald-700' : student.totalMinutes >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                  <Clock size={13} /> {student.totalMinutes}m
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-slate-600">{student.gameCount}</span>
              </div>
              <button onClick={() => setExpanded(expanded === student.id ? null : student.id)} className="p-1.5 text-slate-400 hover:text-crimson-600 hover:bg-crimson-50 rounded-lg transition-colors touch-manipulation">
                {expanded === student.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {expanded === student.id && student.recentResults.length > 0 && (
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent Games</p>
                <div className="space-y-2">
                  {student.recentResults.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{r.set?.title ?? 'Unknown set'} — <span className="capitalize">{r.game}</span></span>
                      <span className="font-semibold text-slate-800">{r.score}/{r.total} <span className="text-slate-400 font-normal">({Math.round(r.score/r.total*100)}%)</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
