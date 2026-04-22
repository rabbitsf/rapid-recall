import { useState, useEffect } from 'react'
import { ArrowLeft, Clock, Layers, Trophy, RefreshCw } from 'lucide-react'
import { shuffleArray } from '../../utils/shuffleArray.js'
import { launchConfetti } from '../../utils/confetti.js'
import { useGameResults } from '../../hooks/useGameResults.js'

export default function MatchGame({ set, onBack, onCreateMissedSet }) {
  const [tiles, setTiles] = useState([])
  const [selected, setSelected] = useState([])
  const [matched, setMatched] = useState([])
  const [moves, setMoves] = useState(0)
  const [startTime, setStartTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [won, setWon] = useState(false)
  const [missed, setMissed] = useState([])
  const { saveResult } = useGameResults()

  const init = () => {
    const t = set.cards.flatMap(c => [
      { id: `${c.id}-t`, pairId: c.id, text: c.term, type: 't' },
      { id: `${c.id}-d`, pairId: c.id, text: c.definition, type: 'd' },
    ])
    setTiles(shuffleArray(t)); setMatched([]); setSelected([]); setMissed([]); setMoves(0); setStartTime(Date.now()); setWon(false)
  }

  useEffect(() => { init() }, [set])
  useEffect(() => {
    if (!startTime || won) return
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000)
    return () => clearInterval(id)
  }, [startTime, won])

  useEffect(() => {
    if (selected.length !== 2) return
    const [t1, t2] = selected.map(id => tiles.find(t => t.id === id))
    if (t1.pairId === t2.pairId && t1.type !== t2.type) {
      const newMatched = [...matched, t1.id, t2.id]
      setMatched(newMatched)
      setSelected([])
      if (newMatched.length === tiles.length) {
        setWon(true)
        launchConfetti(missed.length === 0)
        saveResult({ setId: set.id, game: 'match', score: set.cards.length - missed.length, total: set.cards.length, timeSpent: elapsed })
      }
    } else {
      setMissed(prev => {
        const m = [...prev]
        for (const t of [t1, t2]) {
          const card = set.cards.find(c => c.id === t.pairId)
          if (card && !m.find(c => c.id === card.id)) m.push(card)
        }
        return m
      })
      const id = setTimeout(() => setSelected([]), 800)
      return () => clearTimeout(id)
    }
  }, [selected])

  const click = (id) => {
    if (selected.length === 2 || matched.includes(id) || selected.includes(id)) return
    setSelected(p => [...p, id])
    if (selected.length === 1) setMoves(m => m + 1)
  }

  if (won) return (
    <div className="max-w-2xl mx-auto text-center bg-white p-12 rounded-3xl shadow-sm border border-emerald-100 animate-in zoom-in-95">
      <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"><Trophy size={48} /></div>
      <h2 className="text-4xl font-bold text-slate-800 mb-4">You Did It!</h2>
      <p className="text-xl text-slate-600 mb-8">Cleared in <span className="font-bold text-crimson-600">{elapsed}s</span> with <span className="font-bold text-crimson-600">{moves}</span> moves.</p>
      {missed.length > 0 && (
        <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-2">Needs Practice ({missed.length})</h3>
          <button onClick={() => onCreateMissedSet(missed)} className="w-full py-4 bg-crimson-600 hover:bg-crimson-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 touch-manipulation"><Layers size={20} /> Create Practice Set</button>
        </div>
      )}
      <div className="flex gap-4">
        <button onClick={onBack} className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 font-bold rounded-xl touch-manipulation">Exit</button>
        <button onClick={init} className="flex-1 px-6 py-4 bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 touch-manipulation"><RefreshCw size={20} /> Play Again</button>
      </div>
    </div>
  )

  return (
    <section className="max-w-5xl mx-auto animate-in fade-in select-none">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className="p-3 bg-white rounded-full shadow-sm text-slate-500 touch-manipulation"><ArrowLeft size={24} /></button>
        <div className="flex gap-4">
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 font-medium text-slate-700 border border-slate-100"><Clock size={18} className="text-crimson-500" /> {elapsed}s</div>
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 font-medium text-slate-700 border border-slate-100"><Layers size={18} className="text-crimson-500" /> {moves}</div>
        </div>
      </div>
      <div className={`grid gap-3 sm:gap-4 ${tiles.length <= 8 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5'}`}>
        {tiles.map(tile => {
          const isSelected = selected.includes(tile.id)
          const isMatched = matched.includes(tile.id)
          const isError = selected.length === 2 && isSelected && !isMatched
          let cls = 'bg-white border-2 border-slate-200 text-slate-700 hover:border-crimson-300 hover:bg-slate-50'
          if (isMatched) cls = 'bg-emerald-50 border-emerald-200 text-emerald-700 opacity-0 pointer-events-none scale-95'
          else if (isError) cls = 'bg-red-50 border-red-400 text-red-700 shake'
          else if (isSelected) cls = 'bg-crimson-50 border-crimson-500 text-crimson-700 scale-[1.02] shadow-md'
          return (
            <div key={tile.id} onClick={() => click(tile.id)} className={`flex items-center justify-center p-4 min-h-[110px] sm:min-h-[130px] rounded-2xl cursor-pointer transition-all duration-300 select-none touch-manipulation ${cls}`}>
              <span className={`text-center font-medium ${tile.type === 't' ? 'text-lg sm:text-xl font-bold' : 'text-sm sm:text-base'}`}>{tile.text}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
