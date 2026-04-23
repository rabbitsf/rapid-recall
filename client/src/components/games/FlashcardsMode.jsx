import { useState, useEffect } from 'react'
import { ArrowLeft, Volume2, Lightbulb, Image } from 'lucide-react'

export default function FlashcardsMode({ set, onBack }) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [shownHint, setShownHint] = useState(false)
  const [hintLoading, setHintLoading] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  // Per-card caches keyed by card id; seeded from already-generated DB values
  const [hints, setHints] = useState({})
  const [images, setImages] = useState({})

  const cards = set.cards

  useEffect(() => {
    const h = {}, im = {}
    for (const c of cards) {
      if (c.hint) h[c.id] = c.hint
      // imageUrl: null = not fetched yet; '' = fetched, none found; 'https://...' = has image
      if (c.imageUrl !== null && c.imageUrl !== undefined) im[c.id] = c.imageUrl
    }
    setHints(h)
    setImages(im)
  }, [set.id])

  const go = (dir) => {
    setFlipped(false)
    setShownHint(false)
    setTimeout(() => setIndex(i => (i + dir + cards.length) % cards.length), 150)
  }

  const card = cards[index]
  const currentHint = hints[card.id]
  // undefined = button shows; '' = no image found (button hidden); 'https://...' = shown
  const currentImage = images[card.id]

  const speakTerm = (e) => {
    e.stopPropagation()
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(card.term))
  }

  const fetchHint = async (e) => {
    e.stopPropagation()
    if (currentHint) { setShownHint(h => !h); return }
    setHintLoading(true)
    try {
      const res = await fetch(`/api/ai/cards/${card.id}/hint`, { method: 'POST', credentials: 'include' })
      const data = await res.json()
      if (data.hint) { setHints(h => ({ ...h, [card.id]: data.hint })); setShownHint(true) }
    } finally { setHintLoading(false) }
  }

  const fetchImage = async (e) => {
    e.stopPropagation()
    if (images[card.id] !== undefined) return
    setImageLoading(true)
    try {
      const res = await fetch(`/api/ai/cards/${card.id}/image`, { method: 'POST', credentials: 'include' })
      const data = await res.json()
      setImages(im => ({ ...im, [card.id]: data.imageUrl ?? '' }))
    } finally { setImageLoading(false) }
  }

  const hasImage = currentImage && currentImage !== ''

  return (
    <section className="max-w-3xl mx-auto flex flex-col items-center animate-in fade-in duration-500 select-none">
      {/* Top bar */}
      <div className="w-full flex justify-between items-center mb-6">
        <button onClick={onBack} className="p-3 bg-white rounded-full shadow-sm text-slate-500 hover:text-crimson-600 transition-colors touch-manipulation">
          <ArrowLeft size={24} />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={speakTerm}
            title="Pronounce term"
            className="p-2.5 bg-white rounded-full shadow-sm text-slate-500 hover:text-crimson-600 transition-colors touch-manipulation"
          >
            <Volume2 size={20} />
          </button>

          <button
            onClick={fetchHint}
            disabled={hintLoading}
            title="Get a hint"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full shadow-sm text-sm font-medium transition-colors touch-manipulation ${
              shownHint && currentHint
                ? 'bg-amber-100 text-amber-700'
                : 'bg-white text-slate-500 hover:text-amber-600'
            } disabled:opacity-50`}
          >
            <Lightbulb size={16} />
            {hintLoading ? 'Loading…' : 'Get a hint'}
          </button>

          {/* Show image button only when image hasn't been fetched yet */}
          {images[card.id] === undefined && (
            <button
              onClick={fetchImage}
              disabled={imageLoading}
              title="Load image"
              className="p-2.5 bg-white rounded-full shadow-sm text-slate-500 hover:text-crimson-600 transition-colors touch-manipulation disabled:opacity-50"
            >
              <Image size={20} />
            </button>
          )}
        </div>

        <span className="bg-white px-5 py-2 rounded-full shadow-sm font-semibold text-slate-600">
          {index + 1} / {cards.length}
        </span>
      </div>

      {/* Card */}
      <div className="w-full aspect-[4/3] sm:aspect-[16/9] max-w-2xl" style={{ perspective: '1000px' }}>
        <div
          onClick={() => setFlipped(f => !f)}
          className="relative w-full h-full transition-transform duration-500 cursor-pointer touch-manipulation"
          style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          {/* Front: term + optional image + optional hint */}
          <div
            className="absolute inset-0 bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden flex"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {/* Term + hint area */}
            <div className={`flex flex-col items-center justify-center p-8 md:p-12 ${hasImage ? 'w-1/2' : 'w-full'}`}>
              <h2 className={`font-bold text-slate-800 text-center break-words ${hasImage ? 'text-3xl md:text-4xl' : 'text-4xl md:text-5xl'}`}>
                {card.term}
              </h2>
              {shownHint && currentHint && (
                <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 animate-in fade-in leading-snug">
                  💡 {currentHint}
                </p>
              )}
            </div>

            {/* Image area */}
            {hasImage && (
              <div className="w-1/2 flex-shrink-0 relative">
                <img src={currentImage} alt="" className="w-full h-full object-cover" />
                <a
                  href="https://www.pexels.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="absolute bottom-1.5 right-2 text-white/50 hover:text-white/80 text-[10px] transition-colors"
                >
                  Pexels
                </a>
              </div>
            )}

            {imageLoading && (
              <div className="w-1/2 flex-shrink-0 flex items-center justify-center bg-slate-50">
                <div className="w-8 h-8 border-2 border-crimson-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-slate-400 font-medium text-xs tracking-widest uppercase whitespace-nowrap">
              Tap to flip
            </p>
          </div>

          {/* Back: definition */}
          <div
            className="absolute inset-0 bg-crimson-600 text-white rounded-3xl shadow-lg flex items-center justify-center p-8 md:p-12"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-2xl md:text-3xl font-medium text-center leading-relaxed break-words overflow-y-auto max-h-full">
              {card.definition}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-8 mt-12">
        <button onClick={() => go(-1)} className="w-16 h-16 flex items-center justify-center bg-white rounded-full shadow-md text-slate-600 hover:text-crimson-600 active:scale-95 transition-all touch-manipulation">
          <ArrowLeft size={28} />
        </button>
        <button onClick={() => go(1)} className="w-16 h-16 flex items-center justify-center bg-white rounded-full shadow-md text-slate-600 hover:text-crimson-600 active:scale-95 transition-all touch-manipulation">
          <ArrowLeft size={28} className="rotate-180" />
        </button>
      </div>
    </section>
  )
}
