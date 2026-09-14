import { X, BookOpen, MessageSquareText } from 'lucide-react'

export default function StartSideModal({ onChoose, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-lg font-bold text-slate-800">Start With…</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X size={18} /></button>
        </div>
        <p className="text-sm text-slate-500 mb-5">Choose which side of the card you'd like to see first.</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onChoose('term')}
            className="flex flex-col items-center gap-2 py-6 px-4 rounded-xl border-2 border-transparent bg-slate-50 hover:bg-blue-50 hover:border-blue-400 transition-colors touch-manipulation"
          >
            <BookOpen size={28} className="text-blue-600" />
            <span className="font-semibold text-slate-800">Terms</span>
          </button>
          <button
            onClick={() => onChoose('definition')}
            className="flex flex-col items-center gap-2 py-6 px-4 rounded-xl border-2 border-transparent bg-slate-50 hover:bg-crimson-50 hover:border-crimson-400 transition-colors touch-manipulation"
          >
            <MessageSquareText size={28} className="text-crimson-600" />
            <span className="font-semibold text-slate-800">Definitions</span>
          </button>
        </div>
      </div>
    </div>
  )
}
