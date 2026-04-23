import { Router } from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai'
import prisma from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

// POST /api/ai/cards/:cardId/hint
// Returns (and caches) an AI-generated hint for the term.
router.post('/cards/:cardId/hint', requireAuth, async (req, res, next) => {
  try {
    const card = await prisma.card.findUnique({ where: { id: req.params.cardId } })
    if (!card) return res.status(404).json({ error: 'Card not found' })

    if (card.hint) return res.json({ hint: card.hint })

    const result = await model.generateContent(
      `Generate a one-sentence hint for the vocabulary word "${card.term}" which means "${card.definition}". ` +
      `The hint should help a student recall the word without directly stating its definition or using the word itself. ` +
      `Return only the hint sentence, no quotes or extra text.`
    )
    const hint = result.response.text().trim()

    await prisma.card.update({ where: { id: card.id }, data: { hint } })
    res.json({ hint })
  } catch (err) { next(err) }
})

// POST /api/ai/cards/:cardId/image
// Fetches (and caches) an image URL from Pexels for the term.
// imageUrl: null = not yet fetched; '' = fetched but no image found; 'https://...' = has image.
router.post('/cards/:cardId/image', requireAuth, async (req, res, next) => {
  try {
    const card = await prisma.card.findUnique({ where: { id: req.params.cardId } })
    if (!card) return res.status(404).json({ error: 'Card not found' })

    if (card.imageUrl !== null) return res.json({ imageUrl: card.imageUrl })

    const query = encodeURIComponent(card.term)
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${query}&per_page=1&orientation=landscape`,
      { headers: { Authorization: process.env.PEXELS_API_KEY } }
    )

    if (!response.ok) return res.status(502).json({ error: 'Image search failed' })

    const data = await response.json()
    const imageUrl = data.photos?.[0]?.src?.medium ?? ''

    await prisma.card.update({ where: { id: card.id }, data: { imageUrl } })
    res.json({ imageUrl })
  } catch (err) { next(err) }
})

// POST /api/ai/sets/:setId/sentences
// Batch-generates example sentences for all cards in a set that don't have one yet.
// Returns the complete {id, exampleSentence} list for all cards so the client can merge.
router.post('/sets/:setId/sentences', requireAuth, async (req, res, next) => {
  try {
    const allCards = await prisma.card.findMany({
      where: { setId: req.params.setId },
      select: { id: true, term: true, definition: true, exampleSentence: true },
    })
    if (!allCards.length) return res.status(404).json({ error: 'Set not found or empty' })

    const missing = allCards.filter(c => !c.exampleSentence)

    for (const card of missing) {
      const result = await model.generateContent(
        `Write one natural sentence that uses the vocabulary word "${card.term}" (meaning: "${card.definition}"). ` +
        `Replace the word "${card.term}" in the sentence with "___". ` +
        `Return only the sentence, no quotes or extra text.`
      )
      const exampleSentence = result.response.text().trim()
      await prisma.card.update({ where: { id: card.id }, data: { exampleSentence } })
      card.exampleSentence = exampleSentence
    }

    res.json({
      generated: missing.length,
      cards: allCards.map(c => ({ id: c.id, exampleSentence: c.exampleSentence })),
    })
  } catch (err) { next(err) }
})

export default router
