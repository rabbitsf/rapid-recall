import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, BookOpen, Zap, CheckCircle2, Keyboard, Timer, Layers } from 'lucide-react'
import { useStudyLogs } from '../hooks/useStudyLogs.js'
import FlashcardsMode from './games/FlashcardsMode.jsx'
import MatchGame from './games/MatchGame.jsx'
import QuizGame from './games/QuizGame.jsx'
import TypeGame from './games/TypeGame.jsx'
import BubblePopGame from './games/BubblePopGame.jsx'

const GAMES = [
  { id: 'flashcards', title: 'Flashcards', icon: BookOpen, color: 'blue', desc: 'Review at your own pace.' },
  { id: 'match', title: 'Match Game', icon: Zap, color: 'emerald', desc: 'Race to match terms with definitions.' },
  { id: 'quiz', title: 'Practice Quiz', icon: CheckCircle2, color: 'purple', desc: 'Multiple choice questions.' },
  { id: 'type', title: 'Type It', icon: Keyboard, color: 'orange', desc: 'Read the definition, type the term.' },
  { id: 'bubble-pop', title: 'Bubble Pop', icon: Timer, color: 'cyan', desc: 'Type before the bubble pops!' },
]

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function StudyMenu({ set, onBack, onCreateMissedSet }) {
  const [game, setGame] = useState(null)
  const startRef = useRef(null)
  const { updateLog, logs } = useStudyLogs()

  // Start timer when a game launches
  useEffect(() => {
    if (game) startRef.current = Date.now()
    else if (startRef.current) {
      const mins = Math.round((Date.now() - startRef.current) / 60000)
      if (mins >= 1) {
        const dateStr = today()
        const prev = logs[dateStr] || 0
        updateLog(dateStr, prev + mins)
      }
      startRef.current = null
    }
  }, [game])

  const handleBack = () => { setGame(null) }

  const handleCreateMissedSet = (missed) => {
    onCreateMissedSet(missed)
    setGame(null)
  }

  if (game === 'flashcards') return <FlashcardsMode set={set} onBack={handleBack} />
  if (game === 'match') return <MatchGame set={set} onBack={handleBack} onCreateMissedSet={handleCreateMissedSet} />
  if (game === 'quiz') return <QuizGame set={set} onBack={handleBack} onCreateMissedSet={handleCreateMissedSet} />
  if (game === 'type') return <TypeGame set={set} onBack={handleBack} onCreateMissedSet={handleCreateMissedSet} />
  if (game === 'bubble-pop') return <BubblePopGame set={set} onBack={handleBack} onCreateMissedSet={handleCreateMissedSet} />

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-6 font-medium transition-colors w-fit p-2 touch-manipulation">
        <ArrowLeft size={20} /> Back
      </button>
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mb-8 text-center select-none">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">{set.title}</h2>
        <p className="text-slate-500 font-medium flex items-center justify-center gap-2"><Layers size={18} /> {set.cards.length} Terms</p>
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-6 px-2">Choose a Study Mode</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {GAMES.map(g => {
          const Icon = g.icon
          return (
            <div key={g.id} onClick={() => setGame(g.id)} className={`bg-white rounded-3xl p-6 border-2 border-transparent hover:border-${g.color}-500 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group text-center flex flex-col items-center touch-manipulation select-none`}>
              <div className={`w-16 h-16 rounded-2xl bg-${g.color}-100 text-${g.color}-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}><Icon size={32} /></div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">{g.title}</h4>
              <p className="text-slate-500 text-sm mb-6 flex-grow">{g.desc}</p>
              <span className={`text-${g.color}-600 font-semibold bg-${g.color}-50 px-4 py-2 rounded-full w-full`}>Play →</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
