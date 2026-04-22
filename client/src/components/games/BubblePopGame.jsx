import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Trophy, CheckCircle2, Layers, RefreshCw, Timer } from 'lucide-react'
import { shuffleArray } from '../../utils/shuffleArray.js'
import { launchConfetti } from '../../utils/confetti.js'
import { useGameResults } from '../../hooks/useGameResults.js'

const TIME_LIMIT = 10

export default function BubblePopGame({ set, onBack, onCreateMissedSet }) {
  const [questions, setQuestions] = useState([])
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('playing')
  const [score, setScore] = useState(0)
  const [missed, setMissed] = useState([])
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [startTime] = useState(Date.now())
  const { saveResult } = useGameResults()

  const init = () => { setQuestions(shuffleArray([...set.cards])); setIndex(0); setScore(0); setMissed([]); setInput(''); setTimeLeft(TIME_LIMIT); setStatus('playing') }
  useEffect(() => { init() }, [set])

  useEffect(() => {
    if (status !== 'playing' || !questions.length) return
    if (timeLeft <= 0) {
      setStatus('popped')
      setMissed(prev => { const c = questions[index]; return prev.find(x => x.id === c.id) ? prev : [...prev, c] })
      return
    }
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(id)
  }, [timeLeft, status, questions, index])

  const advance = useCallback(() => {
    setIndex(i => i + 1)
    setInput('')
    setStatus('playing')
    setTimeLeft(TIME_LIMIT)
  }, [])

  // Auto-advance 2.5s after bubble pops — button click skips the wait
  useEffect(() => {
    if (status !== 'popped') return
    const timer = setTimeout(advance, 2500)
    return () => clearTimeout(timer)
  }, [status, advance])

  // Save result once all questions are answered
  useEffect(() => {
    if (!questions.length || index < questions.length) return
    launchConfetti(score === questions.length)
    saveResult({ setId: set.id, game: 'bubble-pop', score, total: questions.length, timeSpent: Math.floor((Date.now() - startTime) / 1000) })
  }, [index, questions.length])

  if (!questions.length) return null
  const finished = index >= questions.length

  if (finished) {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div className="max-w-lg mx-auto bg-white rounded-3xl p-8 sm:p-12 text-center shadow-sm border border-slate-100 animate-in zoom-in-95">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-cyan-100 text-cyan-600 mb-6"><Timer size={48} /></div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Bubble Pop Complete!</h2>
        <p className="text-slate-500 mb-4">You recalled {score} words out of {questions.length}</p>
        <div className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-blue-500 mb-8">{pct}%</div>
        {missed.length > 0 && (
          <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-2">Needs Practice ({missed.length})</h3>
            <button onClick={() => onCreateMissedSet(missed)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 touch-manipulation"><Layers size={20} /> Create Practice Set</button>
          </div>
        )}
        <div className="flex gap-4">
          <button onClick={onBack} className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 font-bold rounded-xl touch-manipulation">Exit</button>
          <button onClick={init} className="flex-1 px-6 py-4 bg-cyan-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 touch-manipulation"><RefreshCw size={20} /> Try Again</button>
        </div>
      </div>
    )
  }

  const q = questions[index]

  const handleInput = (e) => {
    if (status !== 'playing') return
    setInput(e.target.value)
    if (e.target.value.trim().toLowerCase() === q.term.trim().toLowerCase()) {
      setStatus('correct'); setScore(s => s + 1)
      setTimeout(advance, 800)
    }
  }

  const bubbleScale = status === 'playing' ? 1 + ((TIME_LIMIT - timeLeft) / TIME_LIMIT) * 0.3 : undefined
  const bubbleCls = status === 'correct'
    ? 'bg-emerald-100 border-emerald-400 text-emerald-800 scale-95 opacity-0'
    : status === 'popped'
    ? 'bg-red-100 border-red-500 text-red-900 scale-[1.15] opacity-0'
    : 'bg-cyan-100 border-cyan-300 text-cyan-900'

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in flex flex-col min-h-[70vh]">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-3 bg-white rounded-full shadow-sm text-slate-500 shrink-0 touch-manipulation"><ArrowLeft size={20} /></button>
        <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${(index / questions.length) * 100}%` }} />
        </div>
        <span className="font-bold text-slate-500 text-sm shrink-0 flex items-center gap-1.5"><Timer size={16} /> {timeLeft}s</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden py-10 select-none">
        <div className={`w-64 h-64 sm:w-80 sm:h-80 rounded-full border-4 flex flex-col items-center justify-center p-8 text-center shadow-lg transition-all duration-[800ms] ease-out z-10 ${bubbleCls}`} style={{ transform: bubbleScale ? `scale(${bubbleScale})` : undefined }}>
          {status === 'playing' ? (<><span className="text-xs font-bold uppercase tracking-wider text-cyan-600/70 mb-2">Pop in {timeLeft}s</span><h2 className="text-xl sm:text-2xl font-bold break-words">{q.definition}</h2></>)
            : status === 'correct' ? <CheckCircle2 size={64} className="text-emerald-500" />
            : <h2 className="text-3xl font-black text-red-600 uppercase italic tracking-widest shake">Popped!</h2>}
        </div>

        {status === 'popped' && (
          <div className="absolute inset-0 flex items-center justify-center z-20 animate-in fade-in">
            <div className="bg-white/95 backdrop-blur-sm p-8 rounded-3xl shadow-2xl border border-red-100 text-center w-full max-w-sm">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">The word was</p>
              <p className="text-3xl font-black text-emerald-600 mb-8">{q.term}</p>
              <button onClick={advance} autoFocus className="w-full py-5 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-lg rounded-xl transition-colors touch-manipulation">Next Word →</button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto pt-6 relative z-30">
        <input
          type="text" value={input} onChange={handleInput} disabled={status !== 'playing'}
          placeholder="Type fast to save the bubble..." autoFocus autoCapitalize="none" autoCorrect="off" spellCheck="false" autoComplete="off"
          className={`w-full text-[16px] sm:text-xl p-5 sm:p-6 rounded-2xl border-2 outline-none transition-all ${status === 'playing' ? 'bg-white border-slate-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 text-slate-800 shadow-sm' : status === 'correct' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-red-50 border-red-500 text-red-800 opacity-50 cursor-not-allowed'}`}
        />
      </div>
    </div>
  )
}
