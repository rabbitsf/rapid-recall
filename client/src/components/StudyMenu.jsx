import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, BookOpen, Zap, CheckCircle2, Keyboard, Timer, Layers, PenLine, RotateCcw } from 'lucide-react'
import { useStudyLogs } from '../hooks/useStudyLogs.js'
import { useCardProgress, classifyCards } from '../hooks/useCardProgress.js'
import FlashcardsMode from './games/FlashcardsMode.jsx'
import StudyOptionsModal from './StudyOptionsModal.jsx'
import MatchGame from './games/MatchGame.jsx'
import QuizGame from './games/QuizGame.jsx'
import TypeGame from './games/TypeGame.jsx'
import BubblePopGame from './games/BubblePopGame.jsx'
import ApplicationsMode from './games/ApplicationsMode.jsx'

const START_SIDE_GAMES = ['flashcards', 'type', 'bubble-pop']

const GAMES = [
  { id: 'flashcards', title: 'Flashcards', icon: BookOpen, color: 'blue', desc: 'Review at your own pace.' },
  { id: 'match', title: 'Match Game', icon: Zap, color: 'emerald', desc: 'Race to match terms with definitions.' },
  { id: 'quiz', title: 'Practice Quiz', icon: CheckCircle2, color: 'gold', desc: 'Multiple choice questions.' },
  { id: 'type', title: 'Type It', icon: Keyboard, color: 'orange', desc: 'Read one side, type the other.' },
  { id: 'bubble-pop', title: 'Bubble Pop', icon: Timer, color: 'cyan', desc: 'Type before the bubble pops!' },
  { id: 'applications', title: 'Applications', icon: PenLine, color: 'purple', desc: 'Fill in the blank from an AI-generated sentence.' },
]

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function StudyMenu({ set, onBack, onCreateMissedSet }) {
  const [game, setGame] = useState(null)
  const [startSide, setStartSide] = useState('term')
  const [pendingGame, setPendingGame] = useState(null) // game id awaiting the study-options choice
  const [studySet, setStudySet] = useState(set) // set passed to the game; cards filtered when skipping mastered
  const startRef = useRef(null)
  const { updateLog, logs } = useStudyLogs()
  const { progress, loaded, recordAnswer, flush, resetProgress } = useCardProgress(set.id)
  const groups = classifyCards(set.cards, progress)
  const remainingCards = set.cards.filter(c => !groups.mastered.includes(c))

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

  const handleBack = () => { flush(); setGame(null) }

  const launch = (gameId, { side, scope }) => {
    if (side) setStartSide(side)
    setStudySet(scope === 'remaining' ? { ...set, cards: remainingCards } : set)
    setGame(gameId)
  }

  const handleReset = async () => {
    if (!window.confirm('Reset your progress for this set? All terms will go back to Not studied.')) return
    await resetProgress()
  }

  const handleCreateMissedSet = (missed) => {
    flush()
    onCreateMissedSet(missed)
    setGame(null)
  }

  // Games get the (possibly filtered) studySet plus the full card list for distractors / term banks
  const gameProps = { set: studySet, allCards: set.cards, onBack: handleBack, onAnswer: recordAnswer }
  if (game === 'flashcards') return <FlashcardsMode {...gameProps} startSide={startSide} />
  if (game === 'match') return <MatchGame {...gameProps} onCreateMissedSet={handleCreateMissedSet} />
  if (game === 'quiz') return <QuizGame {...gameProps} onCreateMissedSet={handleCreateMissedSet} />
  if (game === 'type') return <TypeGame {...gameProps} onCreateMissedSet={handleCreateMissedSet} startSide={startSide} />
  if (game === 'bubble-pop') return <BubblePopGame {...gameProps} onCreateMissedSet={handleCreateMissedSet} startSide={startSide} />
  if (game === 'applications') return <ApplicationsMode {...gameProps} onCreateMissedSet={handleCreateMissedSet} />

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-crimson-600 mb-6 font-medium transition-colors w-fit p-2 touch-manipulation">
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
          const handlePlay = () => {
            if (START_SIDE_GAMES.includes(g.id) || groups.mastered.length > 0) setPendingGame(g.id)
            else launch(g.id, { side: null, scope: 'all' })
          }
          return (
            <div key={g.id} onClick={handlePlay} className={`bg-white rounded-3xl p-6 border-2 border-transparent hover:border-${g.color}-500 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group text-center flex flex-col items-center touch-manipulation select-none`}>
              <div className={`w-16 h-16 rounded-2xl bg-${g.color}-100 text-${g.color}-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}><Icon size={32} /></div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">{g.title}</h4>
              <p className="text-slate-500 text-sm mb-6 flex-grow">{g.desc}</p>
              <span className={`text-${g.color}-600 font-semibold bg-${g.color}-50 px-4 py-2 rounded-full w-full`}>Play →</span>
            </div>
          )
        })}
      </div>

      {loaded && <TermsInSet groups={groups} total={set.cards.length} onReset={handleReset} />}

      {pendingGame && (
        <StudyOptionsModal
          showStartSide={START_SIDE_GAMES.includes(pendingGame)}
          totalCount={set.cards.length}
          remainingCount={remainingCards.length}
          onClose={() => setPendingGame(null)}
          onReset={handleReset}
          onChoose={(choice) => {
            launch(pendingGame, choice)
            setPendingGame(null)
          }}
        />
      )}
    </div>
  )
}

const TERM_GROUPS = [
  { key: 'learning', title: 'Still learning', color: 'text-orange-500', blurb: "You've started learning these terms. Keep it up!" },
  { key: 'notStudied', title: 'Not studied', color: 'text-blue-600', blurb: "You haven't studied these terms yet!" },
  { key: 'mastered', title: 'Mastered', color: 'text-emerald-600', blurb: "You've answered these correctly twice in a row." },
]

function TermsInSet({ groups, total, onReset }) {
  const hasProgress = groups.learning.length + groups.mastered.length > 0
  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="text-xl font-bold text-slate-800">Terms in this set ({total})</h3>
        {hasProgress && (
          <button onClick={onReset} className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-crimson-600 px-3 py-2 rounded-full touch-manipulation">
            <RotateCcw size={14} /> Reset progress
          </button>
        )}
      </div>
      <div className="bg-slate-100 rounded-3xl p-4 sm:p-6 space-y-8">
        {TERM_GROUPS.filter(g => groups[g.key].length > 0).map(g => (
          <section key={g.key}>
            <h4 className={`text-lg font-bold ${g.color}`}>{g.title} ({groups[g.key].length})</h4>
            <p className="text-sm text-slate-600 mb-3">{g.blurb}</p>
            <div className="space-y-2">
              {groups[g.key].map(card => (
                <div key={card.id} className="bg-white rounded-2xl shadow-sm px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-6">
                  <p className="text-slate-800 font-medium break-words">{card.term}</p>
                  <p className="text-slate-600 break-words sm:border-l sm:border-slate-200 sm:pl-6">{card.definition}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
