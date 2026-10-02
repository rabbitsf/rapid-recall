import { useState } from 'react'
import { X, BookOpen, MessageSquareText, Play, RotateCcw, Trophy } from 'lucide-react'

// One pre-game step: which cards to study (when some are mastered) and which side to start on (START_SIDE_GAMES).
// onChoose({ side, scope }) — side: 'term' | 'definition' | null; scope: 'remaining' | 'all'
export default function StudyOptionsModal({ showStartSide, totalCount, remainingCount, onChoose, onReset, onClose }) {
  const masteredCount = totalCount - remainingCount
  const showScope = masteredCount > 0
  const allMastered = showScope && remainingCount === 0
  const [scope, setScope] = useState(allMastered ? 'all' : 'remaining')

  const choose = (side) => onChoose({ side, scope: showScope ? scope : 'all' })

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">{showStartSide ? 'Start With…' : 'Choose Cards'}</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X size={18} /></button>
        </div>

        {showScope && (allMastered ? (
          <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <Trophy size={28} className="mx-auto mb-2 text-emerald-600" />
            <p className="font-semibold text-emerald-800">You've mastered all {totalCount} terms!</p>
            <p className="text-sm text-emerald-700 mt-1">Review them all again, or reset your progress to start fresh.</p>
            <button
              onClick={onReset}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900 touch-manipulation"
            >
              <RotateCcw size={14} /> Reset progress
            </button>
          </div>
        ) : (
          <div className="mb-5">
            <p className="text-sm text-slate-500 mb-2">Which cards?</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'remaining', label: 'Still learning & new', count: remainingCount },
                { id: 'all', label: 'All cards', count: totalCount },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setScope(opt.id)}
                  className={`py-3 px-3 rounded-xl border-2 text-sm font-semibold transition-colors touch-manipulation ${
                    scope === opt.id ? 'border-crimson-500 bg-crimson-50 text-crimson-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {opt.label} <span className="font-normal opacity-75">({opt.count})</span>
                </button>
              ))}
            </div>
            {scope === 'remaining' && (
              <p className="text-xs text-slate-400 mt-2">Skipping {masteredCount} mastered {masteredCount === 1 ? 'term' : 'terms'}.</p>
            )}
          </div>
        ))}

        {showStartSide ? (
          <>
            <p className="text-sm text-slate-500 mb-2">Choose which side of the card you'd like to see first.</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => choose('term')}
                className="flex flex-col items-center gap-2 py-6 px-4 rounded-xl border-2 border-transparent bg-slate-50 hover:bg-blue-50 hover:border-blue-400 transition-colors touch-manipulation"
              >
                <BookOpen size={28} className="text-blue-600" />
                <span className="font-semibold text-slate-800">Terms</span>
              </button>
              <button
                onClick={() => choose('definition')}
                className="flex flex-col items-center gap-2 py-6 px-4 rounded-xl border-2 border-transparent bg-slate-50 hover:bg-crimson-50 hover:border-crimson-400 transition-colors touch-manipulation"
              >
                <MessageSquareText size={28} className="text-crimson-600" />
                <span className="font-semibold text-slate-800">Definitions</span>
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => choose(null)}
            className="w-full py-3 bg-crimson-600 hover:bg-crimson-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 touch-manipulation"
          >
            <Play size={18} /> Start
          </button>
        )}
      </div>
    </div>
  )
}
