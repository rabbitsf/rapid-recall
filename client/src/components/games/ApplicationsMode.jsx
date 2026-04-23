import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Trophy, Layers, RefreshCw, Loader2 } from 'lucide-react'
import { shuffleArray } from '../../utils/shuffleArray.js'
import { launchConfetti } from '../../utils/confetti.js'
import { useGameResults } from '../../hooks/useGameResults.js'

export default function ApplicationsMode({ set, onBack, onCreateMissedSet }) {
  const [sentences, setSentences] = useState(() => {
    const s = {}
    for (const c of set.cards) {
      if (c.exampleSentence) s[c.id] = c.exampleSentence
    }
    return s
  })
  const [sentenceLoading, setSentenceLoading] = useState(false)
  const [questions, setQuestions] = useState([])
  const [index, setIndex] = useState(0)
  const [selectedTerm, setSelectedTerm] = useState(null)
  const [status, setStatus] = useState('answering') // 'answering' | 'correct' | 'incorrect'
  const [score, setScore] = useState(0)
  const [missed, setMissed] = useState([])
  const [termBank, setTermBank] = useState([])
  const [startTime] = useState(Date.now())
  const { saveResult } = useGameResults()
  const fetchingRef = useRef(new Set())

  const init = () => {
    const qs = shuffleArray([...set.cards])
    setQuestions(qs)
    setIndex(0)
    setScore(0)
    setMissed([])
    setSelectedTerm(null)
    setStatus('answering')
    setTermBank(shuffleArray(set.cards.map(c => c.term)))
  }

  useEffect(() => { init() }, [])

  const fetchSentenceLazy = async (cardId) => {
    if (fetchingRef.current.has(cardId)) return
    fetchingRef.current.add(cardId)
    try {
      const res = await fetch(`/api/ai/cards/${cardId}/sentence`, { method: 'POST', credentials: 'include' })
      const data = await res.json()
      if (data.exampleSentence) setSentences(s => ({ ...s, [cardId]: data.exampleSentence }))
    } catch { /* silent: falls back to definition prompt */ }
    finally { fetchingRef.current.delete(cardId) }
  }

  // Fetch current card's sentence; pre-fetch next silently
  useEffect(() => {
    if (!questions.length || index >= questions.length) return
    const current = questions[index]

    if (!sentences[current.id]) {
      setSentenceLoading(true)
      if (!fetchingRef.current.has(current.id)) {
        fetchSentenceLazy(current.id).finally(() => setSentenceLoading(false))
      }
      // else: already being pre-fetched — loading will dismiss via sentences effect below
    } else {
      setSentenceLoading(false)
    }

    // Pre-fetch next card silently
    const next = questions[index + 1]
    if (next && !sentences[next.id]) fetchSentenceLazy(next.id)
  }, [index, questions])

  // Dismiss loading when a pre-fetched sentence arrives
  useEffect(() => {
    if (!questions.length || index >= questions.length) return
    if (sentences[questions[index].id]) setSentenceLoading(false)
  }, [sentences])

  const selectTerm = (term) => {
    if (status !== 'answering') return
    const correct = questions[index].term
    setSelectedTerm(term)

    if (term.trim().toLowerCase() === correct.trim().toLowerCase()) {
      setStatus('correct')
      setScore(s => s + 1)
      setTimeout(() => { setIndex(i => i + 1); setSelectedTerm(null); setStatus('answering') }, 800)
    } else {
      setStatus('incorrect')
      if (!missed.some(c => c.id === questions[index].id)) setMissed(m => [...m, questions[index]])
      setTimeout(() => { setSelectedTerm(null); setStatus('answering') }, 500)
    }
  }

  useEffect(() => {
    if (!questions.length || index < questions.length) return
    launchConfetti(score === questions.length)
    saveResult({ setId: set.id, game: 'applications', score, total: questions.length, timeSpent: Math.floor((Date.now() - startTime) / 1000) })
  }, [index, questions.length])

  if (!questions.length) return null
  const finished = index >= questions.length

  if (finished) {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div className="max-w-lg mx-auto bg-white rounded-3xl p-8 sm:p-12 text-center shadow-sm border border-slate-100 animate-in zoom-in-95">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-purple-100 text-purple-600 mb-6"><Trophy size={48} /></div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Applications Complete!</h2>
        <p className="text-slate-500 mb-4">You scored {score} out of {questions.length}</p>
        <div className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-crimson-500 mb-8">{pct}%</div>
        {missed.length > 0 && (
          <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-3">Needs Practice ({missed.length})</h3>
            <button onClick={() => onCreateMissedSet(missed)} className="w-full py-4 bg-crimson-600 hover:bg-crimson-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 touch-manipulation">
              <Layers size={20} /> Create Practice Set
            </button>
          </div>
        )}
        <div className="flex gap-4">
          <button onClick={onBack} className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 font-bold rounded-xl touch-manipulation">Exit</button>
          <button onClick={init} className="flex-1 px-6 py-4 bg-purple-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 touch-manipulation"><RefreshCw size={20} /> Try Again</button>
        </div>
      </div>
    )
  }

  const q = questions[index]
  const sentence = sentences[q.id] || null
  const parts = sentence ? sentence.split('___') : null

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in">
      {/* Progress bar */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-3 bg-white rounded-full shadow-sm text-slate-500 shrink-0 touch-manipulation"><ArrowLeft size={20} /></button>
        <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${(index / questions.length) * 100}%` }} />
        </div>
        <span className="font-bold text-slate-500 text-sm shrink-0">{index + 1} / {questions.length}</span>
      </div>

      {/* Sentence card */}
      <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-100 mb-8 min-h-[160px] flex flex-col items-center justify-center">
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">Fill in the blank</p>
        {sentenceLoading ? (
          <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
        ) : parts ? (
          <p className="text-xl sm:text-2xl text-slate-800 leading-relaxed text-center">
            {parts[0]}
            <span className="inline-block border-b-2 border-purple-500 min-w-[80px] text-purple-600 font-bold text-center mx-1 px-2">
              {selectedTerm && status === 'correct' ? selectedTerm : '        '}
            </span>
            {parts[1] ?? ''}
          </p>
        ) : (
          <p className="text-xl sm:text-2xl text-slate-800 leading-relaxed text-center">
            Which term means: <span className="italic text-slate-600">"{q.definition}"</span>
          </p>
        )}
      </div>

      {/* Term bank */}
      {!sentenceLoading && (
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">Word Bank</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {termBank.map(term => {
              const isSelected = selectedTerm === term
              return (
                <button
                  key={term}
                  onClick={() => selectTerm(term)}
                  disabled={status === 'correct'}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all touch-manipulation active:scale-95 ${
                    isSelected && status === 'correct'
                      ? 'bg-emerald-100 border-emerald-500 text-emerald-800'
                      : isSelected && status === 'incorrect'
                      ? 'bg-red-100 border-red-500 text-red-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  {term}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
