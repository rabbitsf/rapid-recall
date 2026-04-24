import { useState, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, Upload, X, Image } from 'lucide-react'
import { useSets } from '../hooks/useSets.js'

export default function SetEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { sets, saveSet } = useSets()

  const existing = id ? sets.find(s => s.id === id) : null
  const [title, setTitle] = useState(existing?.title || '')
  const [isSpanish, setIsSpanish] = useState(existing?.isSpanish || false)
  const [cards, setCards] = useState(existing?.cards || [{ id: Date.now().toString(), term: '', definition: '' }])
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRefs = useRef({})
  const savedSetIdRef = useRef(null)          // ID of set auto-saved during image upload

  useEffect(() => {
    if (existing) {
      setTitle(existing.title)
      setIsSpanish(existing.isSpanish || false)
      setCards(existing.cards)
    }
  }, [existing?.id])

  const addCard = () => setCards(c => [...c, { id: Date.now().toString(), term: '', definition: '' }])
  const updateCard = (cid, field, val) => setCards(c => c.map(x => x.id === cid ? { ...x, [field]: val } : x))
  const removeCard = (cid) => { if (cards.length > 1) setCards(c => c.filter(x => x.id !== cid)) }

  const processImport = () => {
    const newCards = importText.split('\n').map((line, i) => {
      if (!line.trim()) return null
      const delim = line.includes('\t') ? '\t' : line.includes(',') ? ',' : line.includes('-') ? '-' : ':'
      const parts = line.split(delim)
      if (parts.length < 2) return null
      return { id: `${Date.now()}-${i}`, term: parts[0].trim(), definition: parts.slice(1).join(delim).trim() }
    }).filter(Boolean)

    if (!newCards.length) return alert("No valid pairs found. Use tab, comma, dash, or colon as separator.")
    const existing = cards.filter(c => c.term.trim() || c.definition.trim())
    setCards([...existing, ...newCards])
    setShowImport(false)
    setImportText('')
  }

  const handleImageUpload = async (cardId, file) => {
    const formData = new FormData()
    formData.append('image', file)
    try {
      const res = await fetch(`/api/uploads/cards/${cardId}/image`, { method: 'POST', credentials: 'include', body: formData })
      const data = await res.json()
      if (data.uploadedImageUrl) updateCard(cardId, 'uploadedImageUrl', data.uploadedImageUrl)
      else setError(data.error || 'Image upload failed')
    } catch { setError('Image upload failed') }
  }

  const handleImageButtonClick = async (card, i) => {
    if (card.id.includes('-')) {
      // Already saved — open picker directly
      fileInputRefs.current[card.id]?.click()
      return
    }
    // Unsaved card — auto-save first, then open picker
    if (!title.trim()) { setError('Please enter a title before uploading images.'); return }
    const valid = cards.filter(c => c.term.trim() && c.definition.trim())
    if (valid.length < 2) { setError('Please add at least 2 complete cards before uploading images.'); return }
    setSaving(true)
    setError(null)
    try {
      const savedSet = await saveSet({ id: existing?.id ?? savedSetIdRef.current, title, cards: valid, isSpanish })
      savedSetIdRef.current = savedSet.id
      const validIdx = valid.findIndex(c => c.id === card.id)
      const targetCard = validIdx >= 0 ? savedSet.cards[validIdx] : null
      flushSync(() => setCards(savedSet.cards))  // ensure DOM + refs update before clicking
      if (targetCard) fileInputRefs.current[targetCard.id]?.click()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const handleSave = async () => {
    if (!title.trim()) return setError('Please enter a title.')
    const valid = cards.filter(c => c.term.trim() && c.definition.trim())
    if (valid.length < 2) return setError('Please add at least 2 complete cards.')
    try {
      setSaving(true)
      setError(null)
      await saveSet({ id: existing?.id ?? savedSetIdRef.current, title, cards: valid, isSpanish })
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">{existing ? 'Edit Word Set' : 'Create New Set'}</h2>
        <div className="flex gap-3 w-full sm:w-auto">
          <button onClick={() => navigate('/')} className="flex-1 sm:flex-none px-5 py-3 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors touch-manipulation">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-medium text-white bg-crimson-600 hover:bg-crimson-700 disabled:opacity-60 transition-colors shadow-sm touch-manipulation">{saving ? 'Saving…' : 'Save Set'}</button>
        </div>
      </div>

      {error && <p className="mx-6 mt-4 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

      <div className="p-6 md:p-8 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Set Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Biology Chapter 1, French Verbs"
            className="w-full text-lg px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-crimson-500 focus:border-crimson-500 outline-none transition-all" />
          <label className="mt-3 flex items-center gap-2 cursor-pointer select-none w-fit">
            <input type="checkbox" checked={isSpanish} onChange={e => setIsSpanish(e.target.checked)}
              className="w-4 h-4 accent-crimson-600 rounded" />
            <span className="text-sm text-slate-600">Terms are in Spanish <span className="text-slate-400">(enables Spanish pronunciation)</span></span>
          </label>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">Cards</label>
          {cards.map((card, i) => (
            <div key={card.id} className="group relative flex flex-col md:flex-row gap-4 p-4 rounded-2xl border border-slate-200 bg-white hover:border-crimson-200 transition-colors">
              <div className="absolute -left-3 top-4 bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded-full">{i + 1}</div>
              <input type="text" value={card.term} onChange={e => updateCard(card.id, 'term', e.target.value)} placeholder="Term"
                className="flex-1 font-medium px-4 py-3 bg-slate-50 border-b-2 border-slate-200 focus:border-crimson-500 focus:bg-white outline-none transition-all rounded-t-lg" />
              <input type="text" value={card.definition} onChange={e => updateCard(card.id, 'definition', e.target.value)} placeholder="Definition"
                className="flex-1 px-4 py-3 bg-slate-50 border-b-2 border-slate-200 focus:border-crimson-500 focus:bg-white outline-none transition-all rounded-t-lg" />
              <div className="flex items-center gap-2 shrink-0">
                {card.uploadedImageUrl
                  ? <img src={card.uploadedImageUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" />
                  : null}
                <input type="file" accept="image/*" className="hidden"
                  ref={el => { fileInputRefs.current[card.id] = el }}
                  onChange={e => { const f = e.target.files[0]; if (f) handleImageUpload(card.id, f); e.target.value = '' }} />
                <button type="button" onClick={() => handleImageButtonClick(card, i)}
                  title={card.uploadedImageUrl ? 'Replace image' : 'Upload image'}
                  className="p-2 text-slate-400 hover:text-crimson-600 hover:bg-crimson-50 rounded-lg transition-colors touch-manipulation">
                  <Image size={20} />
                </button>
              </div>
              <button onClick={() => removeCard(card.id)} className="p-4 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors touch-manipulation"><Trash2 size={20} /></button>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={addCard} className="flex-1 py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-medium hover:border-crimson-400 hover:text-crimson-600 hover:bg-crimson-50/50 transition-all flex items-center justify-center gap-2 touch-manipulation">
            <Plus size={20} /> Add Card
          </button>
          <button onClick={() => setShowImport(true)} className="flex-1 py-4 border-2 border-dashed border-crimson-200 bg-crimson-50/30 rounded-2xl text-crimson-600 font-medium hover:border-crimson-400 hover:bg-crimson-50 transition-all flex items-center justify-center gap-2 touch-manipulation">
            <Upload size={20} /> Bulk Import
          </button>
        </div>
      </div>

      {showImport && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 shadow-xl max-w-2xl w-full animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Upload size={20} className="text-crimson-600" /> Bulk Import</h3>
              <button onClick={() => setShowImport(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full touch-manipulation"><X size={24} /></button>
            </div>
            <p className="text-slate-500 mb-4 text-sm">Paste from Excel, Google Sheets, or a text file. One card per line, term and definition separated by <strong>tab, comma, dash, or colon</strong>.</p>
            <textarea value={importText} onChange={e => setImportText(e.target.value)}
              placeholder={"Hola\tHello\nGato\tCat\nPerro\tDog"}
              className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-crimson-500 outline-none mb-4 font-mono text-sm resize-none" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowImport(false)} className="px-5 py-3 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium touch-manipulation">Cancel</button>
              <button onClick={processImport} className="px-6 py-3 rounded-xl text-white bg-crimson-600 hover:bg-crimson-700 font-medium shadow-sm touch-manipulation">Import Cards</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
