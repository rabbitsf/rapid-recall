import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'

export default function FlashcardsMode({ set, onBack }) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const cards = set.cards

  const go = (dir) => { setFlipped(false); setTimeout(() => setIndex(i => (i + dir + cards.length) % cards.length), 150) }

  return (
    <section className="max-w-3xl mx-auto flex flex-col items-center animate-in fade-in duration-500 select-none">
      <div className="w-full flex justify-between items-center mb-8">
        <button onClick={onBack} className="p-3 bg-white rounded-full shadow-sm text-slate-500 hover:text-crimson-600 transition-colors touch-manipulation"><ArrowLeft size={24} /></button>
        <span className="bg-white px-5 py-2 rounded-full shadow-sm font-semibold text-slate-600">{index + 1} / {cards.length}</span>
        <div className="w-12" />
      </div>

      <div className="w-full aspect-[4/3] sm:aspect-[16/9] max-w-2xl" style={{ perspective: '1000px' }}>
        <div onClick={() => setFlipped(f => !f)} className="relative w-full h-full transition-transform duration-500 cursor-pointer touch-manipulation" style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
          <div className="absolute inset-0 bg-white rounded-3xl shadow-lg border border-slate-100 flex items-center justify-center p-8 md:p-12" style={{ backfaceVisibility: 'hidden' }}>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-800 text-center break-words">{cards[index].term}</h2>
            <p className="absolute bottom-6 text-slate-400 font-medium text-sm tracking-widest uppercase">Tap to flip</p>
          </div>
          <div className="absolute inset-0 bg-crimson-600 text-white rounded-3xl shadow-lg flex items-center justify-center p-8 md:p-12" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <p className="text-2xl md:text-3xl font-medium text-center leading-relaxed break-words overflow-y-auto max-h-full">{cards[index].definition}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-8 mt-12">
        <button onClick={() => go(-1)} className="w-16 h-16 flex items-center justify-center bg-white rounded-full shadow-md text-slate-600 hover:text-crimson-600 active:scale-95 transition-all touch-manipulation"><ArrowLeft size={28} /></button>
        <button onClick={() => go(1)} className="w-16 h-16 flex items-center justify-center bg-white rounded-full shadow-md text-slate-600 hover:text-crimson-600 active:scale-95 transition-all touch-manipulation"><ArrowLeft size={28} className="rotate-180" /></button>
      </div>
    </section>
  )
}
