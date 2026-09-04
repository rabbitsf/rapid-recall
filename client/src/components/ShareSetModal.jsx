import { useState, useEffect } from 'react'
import { Share2, X, Search, Check } from 'lucide-react'

export default function ShareSetModal({ setTitle, onClose, onShare }) {
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/classes/teachers', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setAll(data); setLoading(false) })
      .catch(() => { setError('Failed to load teachers'); setLoading(false) })
  }, [])

  const filtered = all.filter(t =>
    t.displayName.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleShare = async () => {
    if (!selectedId) return
    setSharing(true); setError('')
    try { await onShare(selectedId); onClose() }
    catch (err) { setError(err.message) }
    finally { setSharing(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Share2 size={18} className="text-crimson-600" /> Share with a Teacher</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X size={18} /></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">Sends a copy of "{setTitle}" to another teacher's own sets.</p>

        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-crimson-500" />
        </div>

        {loading ? (
          <p className="text-sm text-slate-400 text-center py-8">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No other teachers found.</p>
        ) : (
          <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1 mb-4">
            {filtered.map(t => {
              const active = selectedId === t.id
              return (
                <button key={t.id} onClick={() => setSelectedId(t.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors ${active ? 'bg-crimson-50 border border-crimson-300' : 'border border-transparent hover:bg-slate-50'}`}>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${active ? 'bg-crimson-600 border-crimson-600' : 'border-slate-300'}`}>
                    {active && <Check size={13} className="text-white" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{t.displayName}</p>
                    <p className="text-xs text-slate-400 truncate">{t.email}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
          <button onClick={handleShare} disabled={!selectedId || sharing}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-crimson-600 hover:bg-crimson-700 disabled:opacity-60 rounded-xl transition-colors flex items-center justify-center gap-1.5">
            <Share2 size={15} /> {sharing ? 'Sharing…' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  )
}
