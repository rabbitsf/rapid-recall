import { useState, useEffect } from 'react'
import { ArrowLeft, Trophy, CheckCircle2, XCircle, Layers, RefreshCw } from 'lucide-react'
import { shuffleArray } from '../../utils/shuffleArray.js'
import { launchConfetti } from '../../utils/confetti.js'
import { useGameResults } from '../../hooks/useGameResults.js'

export default function QuizGame({ set, onBack, onCreateMissedSet }) {
  const [questions, setQuestions] = useState([])
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [missed, setMissed] = useState([])
  const [finished, setFinished] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [checked, setChecked] = useState(false)
  const [startTime] = useState(Date.now())
  const { saveResult } = useGameResults()

  const init = () => {
    const qs = shuffleArray([...set.cards]).map(card => {
      const others = shuffleArray(set.cards.filter(c => c.id !== card.id)).slice(0, 3)
      return {
        term: card.term,
        originalCard: card,
        options: shuffleArray([
          { id: card.id, text: card.definition, correct: true },
          ...others.map(c => ({ id: c.id, text: c.definition, correct: false })),
        ]),
      }
    })
    setQuestions(qs); setIndex(0); setScore(0); setMissed([]); setFinished(false); setSelectedId(null); setChecked(false)
  }

  useEffect(() => { init() }, [set])

  const check = () => {
    if (!selectedId) return
    setChecked(true)
    const q = questions[index]
    const correct = q.options.find(o => o.id === selectedId)?.correct
    const newScore = correct ? score + 1 : score
    if (correct) setScore(newScore)
    else if (!missed.some(c => c.id === q.originalCard.id)) setMissed(p => [...p, q.originalCard])

    setTimeout(() => {
      if (index + 1 < questions.length) { setIndex(i => i + 1); setSelectedId(null); setChecked(false) }
      else {
        setFinished(true)
        launchConfetti(newScore === questions.length)
        saveResult({ setId: set.id, game: 'quiz', score: newScore, total: questions.length, timeSpent: Math.floor((Date.now() - startTime) / 1000) })
      }
    }, 1500)
  }

  if (!questions.length) return null

  if (finished) {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div className="max-w-lg mx-auto bg-white rounded-3xl p-8 sm:p-12 text-center shadow-sm border border-slate-100 animate-in zoom-in-95">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-purple-100 text-purple-600 mb-6"><Trophy size={48} /></div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Quiz Complete!</h2>
        <p className="text-slate-500 mb-4">You scored {score} out of {questions.length}</p>
        <div className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500 mb-8">{pct}%</div>
        {missed.length > 0 && (
          <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-2">Needs Practice ({missed.length})</h3>
            <button onClick={() => onCreateMissedSet(missed)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 touch-manipulation"><Layers size={20} /> Create Practice Set</button>
          </div>
        )}
        <div className="flex gap-4">
          <button onClick={onBack} className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 font-bold rounded-xl touch-manipulation">Exit</button>
          <button onClick={init} className="flex-1 px-6 py-4 bg-purple-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 touch-manipulation"><RefreshCw size={20} /> Try Again</button>
        </div>
      </div>
    )
  }

  const q = questions[index]
  return (
    <section className="max-w-2xl mx-auto animate-in fade-in select-none">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-3 bg-white rounded-full shadow-sm text-slate-500 shrink-0 touch-manipulation"><ArrowLeft size={20} /></button>
        <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${(index / questions.length) * 100}%` }} />
        </div>
        <span className="font-bold text-slate-500 text-sm shrink-0">{index + 1} / {questions.length}</span>
      </div>
      <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-100 mb-8 flex items-center justify-center min-h-[200px]">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 text-center break-words">{q.term}</h2>
      </div>
      <div className="space-y-4">
        {q.options.map(opt => {
          const sel = selectedId === opt.id
          let cls = 'bg-white border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700'
          let Icon = null
          if (checked) {
            if (opt.correct) { cls = 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-md'; Icon = CheckCircle2 }
            else if (sel) { cls = 'bg-red-50 border-red-500 text-red-800'; Icon = XCircle }
            else cls = 'bg-white border-slate-200 text-slate-400 opacity-50'
          } else if (sel) { cls = 'bg-indigo-50 border-indigo-500 text-indigo-800 shadow-sm scale-[1.01]' }
          return (
            <button key={opt.id} onClick={() => !checked && setSelectedId(opt.id)} disabled={checked} className={`w-full p-6 rounded-2xl text-left font-medium transition-all flex items-center justify-between text-base sm:text-lg touch-manipulation ${cls}`}>
              <span className="break-words flex-1 pr-4">{opt.text}</span>
              {Icon && <Icon className={opt.correct ? 'text-emerald-500' : 'text-red-500'} size={24} />}
            </button>
          )
        })}
      </div>
      {!checked && selectedId && (
        <button onClick={check} className="w-full mt-8 py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-2xl shadow-md transition-colors touch-manipulation">Check Answer</button>
      )}
    </section>
  )
}
