import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'
import { launchConfetti } from '../utils/confetti.js'

export default function StudyCalendar({ logs, onUpdateLog }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [editingDay, setEditingDay] = useState(null)
  const [timeInput, setTimeInput] = useState('')

  const days = useMemo(() => {
    const result = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i + weekOffset * 7)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      result.push({ dateString: `${y}-${m}-${day}`, dayName: d.toLocaleDateString('en-US', { weekday: 'short' }), dayNum: d.getDate() })
    }
    return result
  }, [weekOffset])

  const monthData = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + weekOffset * 7)
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const total = Object.entries(logs).filter(([k]) => k.startsWith(prefix)).reduce((s, [, v]) => s + v, 0)
    return { name: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), total }
  }, [logs, weekOffset])

  const openEdit = (day) => { setEditingDay(day); setTimeInput(logs[day.dateString]?.toString() || '') }

  const saveLog = () => {
    const mins = Math.max(0, parseInt(timeInput) || 0)
    const prev = Object.values(logs).filter(m => m > 0).length
    const newLogs = { ...logs, [editingDay.dateString]: mins }
    const next = Object.values(newLogs).filter(m => m > 0).length
    if (mins > 0 && mins > (logs[editingDay.dateString] || 0)) {
      next === 5 && prev < 5 ? launchConfetti(true) : launchConfetti(false)
    }
    onUpdateLog(editingDay.dateString, mins)
    setEditingDay(null)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Calendar size={20} className="text-crimson-600" /> Word Tracker</h3>
        <span className="text-sm font-semibold bg-crimson-50 text-crimson-700 px-4 py-1.5 rounded-full">{monthData.name} Total: {monthData.total} mins</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => setWeekOffset(w => w - 1)} className="p-3 text-slate-400 hover:text-crimson-600 hover:bg-crimson-50 rounded-full transition-colors touch-manipulation"><ChevronLeft size={20} /></button>
        <div className="flex-1 flex justify-between items-center gap-1 overflow-x-auto pb-2">
          {days.map(day => {
            const mins = logs[day.dateString] || 0
            const active = mins > 0
            return (
              <div key={day.dateString} onClick={() => openEdit(day)} className={`flex flex-col items-center min-w-[50px] sm:min-w-[60px] p-2 rounded-xl cursor-pointer transition-all border-2 touch-manipulation select-none ${active ? 'border-crimson-100 bg-crimson-50 hover:border-crimson-200' : 'border-transparent hover:bg-slate-50'}`}>
                <span className="text-xs font-semibold text-slate-400 mb-1">{day.dayName}</span>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-1 ${active ? 'bg-crimson-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}>{day.dayNum}</div>
                <span className={`text-xs font-bold ${active ? 'text-crimson-600' : 'text-slate-400'}`}>{mins > 0 ? `${mins}m` : '-'}</span>
              </div>
            )
          })}
        </div>
        <button onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0} className={`p-3 rounded-full transition-colors touch-manipulation ${weekOffset >= 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-crimson-600 hover:bg-crimson-50'}`}><ChevronRight size={20} /></button>
      </div>

      {editingDay && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-xl max-w-sm w-full animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Log Practice Time</h3>
              <button onClick={() => setEditingDay(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full touch-manipulation"><X size={20} /></button>
            </div>
            <p className="text-slate-500 mb-4 text-sm">Minutes practiced on <strong className="text-slate-700">{editingDay.dayName}, {editingDay.dateString}</strong>?</p>
            <input type="number" value={timeInput} onChange={e => setTimeInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveLog()}
              placeholder="e.g. 30" className="w-full text-lg px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-crimson-500 focus:border-crimson-500 outline-none transition-all mb-6" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setEditingDay(null)} className="flex-1 py-3.5 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors touch-manipulation">Cancel</button>
              <button onClick={saveLog} className="flex-1 py-3.5 rounded-xl font-medium text-white bg-crimson-600 hover:bg-crimson-700 transition-colors shadow-sm touch-manipulation">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
