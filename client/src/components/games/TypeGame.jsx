import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Trophy, CheckCircle2, XCircle, Layers, RefreshCw } from 'lucide-react'
import { shuffleArray } from '../../utils/shuffleArray.js'
import { launchConfetti } from '../../utils/confetti.js'
import { useGameResults } from '../../hooks/useGameResults.js'

export default function TypeGame({ set, onBack, onCreateMissedSet }) {
  const [questions, setQuestions] = useState([])
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('typing')
  const [score, setScore] = useState(0)
  const [missed, setMissed] = useState([])
  const [startTime] = useState(Date.now())
  const { saveResult } = useGameResults()

  const init = () => {
    setQuestions(shuffleArray([...set.cards]))
    setIndex(0); setScore(0); setInput(''); setStatus('typing'); setMissed([])
  }
  useEffect(() => { init() }, [set])

  const advance = useCallback(() => {
    setIndex(i => i + 1)
    setInput('')
    setStatus('typing')
  }, [])

  // Auto-advance 2s after showing wrong answer — button click skips the wait
  useEffect(() => {
    if (status !== 'incorrect') return
    const timer = setTimeout(advance, 2000)
    return () => clearTimeout(timer)
  }, [status, advance])

  // Save result once all questions are answered
  useEffect(() => {
    if (!questions.length || index < questions.length) return
    launchConfetti(score === questions.length)
    saveResult({ setId: set.id, game: 'type', score, total: questions.length, timeSpent: Math.floor((Date.now() - startTime) / 1000) })
  }, [index, questions.length])

  if (!questions.length) return null
  const finished = index >= questions.length

  if (finished) {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div className="max-w-lg mx-auto bg-white rounded-3xl p-8 sm:p-12 text-center shadow-sm border border-slate-100 animate-in zoom-in-95">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-orange-100 text-orange-600 mb-6"><Trophy size={48} /></div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Practice Complete!</h2>
        <p className="text-slate-500 mb-4">You scored {score} out of {questions.length}</p>
        <div className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-500 mb-8">{pct}%</div>
        {missed.length > 0 && (
          <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-2">Needs Practice ({missed.length})</h3>
            <button onClick={() => onCreateMissedSet(missed)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 touch-manipulation"><Layers size={20} /> Create Practice Set</button>
          </div>
        )}
        <div className="flex gap-4">
          <button onClick={onBack} className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 font-bold rounded-xl touch-manipulation">Exit</button>
          <button onClick={init} className="flex-1 px-6 py-4 bg-orange-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 touch-manipulation"><RefreshCw size={20} /> Try Again</button>
        </div>
      </div>
    )
  }

  const q = questions[index]

  const submit = (e) => {
    e.preventDefault()
    if (status !== 'typing' || !input.trim()) return
    if (input.trim().toLowerCase() === q.term.trim().toLowerCase()) {
      setStatus('correct')
      setScore(s => s + 1)
      setTimeout(() => { setIndex(i => i + 1); setInput(''); setStatus('typing') }, 1000)
    } else {
      setStatus('incorrect')
      if (!missed.some(c => c.id === q.id)) setMissed(p => [...p, q])
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-3 bg-white rounded-full shadow-sm text-slate-500 shrink-0 touch-manipulation"><ArrowLeft size={20} /></button>
        <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${(index / questions.length) * 100}%` }} />
        </div>
        <span className="font-bold text-slate-500 text-sm shrink-0">{index + 1} / {questions.length}</span>
      </div>

      <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-100 mb-8 flex flex-col items-center justify-center min-h-[200px] select-none">
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Definition</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 text-center break-words">{q.definition}</h2>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="relative">
          <input
            type="text" value={input} onChange={e => setInput(e.target.value)} disabled={status !== 'typing'}
            placeholder="Type the exact term..." autoFocus autoCapitalize="none" autoCorrect="off" spellCheck="false" autoComplete="off"
            className={`w-full text-[16px] sm:text-xl p-5 sm:p-6 rounded-2xl border-2 outline-none transition-all ${
              status === 'typing'    ? 'bg-white border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-slate-800'
            : status === 'correct'  ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
            :                         'bg-red-50 border-red-500 text-red-800 shake'}`}
          />
          {status === 'correct'   && <CheckCircle2 className="absolute right-6 top-1/2 -translate-y-1/2 text-emerald-500" size={28} />}
          {status === 'incorrect' && <XCircle      className="absolute right-6 top-1/2 -translate-y-1/2 text-red-500"     size={28} />}
        </div>
        {status === 'typing' && (
          <button type="submit" disabled={!input.trim()} className="w-full mt-4 py-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-lg rounded-2xl shadow-sm transition-colors touch-manipulation">
            Check Answer
          </button>
        )}
      </form>

      {status === 'incorrect' && (
        <div className="mt-6 p-6 bg-white rounded-2xl border border-red-100 shadow-sm animate-in slide-in-from-bottom-4">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Correct Answer</p>
          <p className="text-2xl font-bold text-emerald-600 mb-6">{q.term}</p>
          <button onClick={advance} className="w-full py-5 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-lg rounded-xl transition-colors touch-manipulation">
            Continue →
          </button>
        </div>
      )}
    </div>
  )
}
