import { Router } from 'express'
import OpenAI from 'openai'
import prisma from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function callAI(prompt) {
  const chat = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  })
  return chat.choices[0].message.content.trim()
}

function isRateLimit(err) {
  return err.status === 429
}

function sentencePrompt(term, definition, isSpanish) {
  if (isSpanish) {
    return (
      `Write one simple Spanish sentence for a 1st or 2nd grade student (under age 13) that uses the word "${term}" (meaning: "${definition}"). ` +
      `Use only very common, everyday Spanish words — short sentence, easy vocabulary, child-appropriate topic. ` +
      `Replace "${term}" in the sentence with "___". ` +
      `Return only the sentence, no quotes or extra text.`
    )
  }
  return (
    `Write one simple sentence for a student under age 13 that uses the vocabulary word "${term}" (meaning: "${definition}"). ` +
    `Keep the vocabulary and topic age-appropriate for children. ` +
    `Replace the word "${term}" in the sentence with "___". ` +
    `Return only the sentence, no quotes or extra text.`
  )
}

// POST /api/ai/cards/:cardId/hint
router.post('/cards/:cardId/hint', requireAuth, async (req, res, next) => {
  try {
    const card = await prisma.card.findUnique({ where: { id: req.params.cardId } })
    if (!card) return res.status(404).json({ error: 'Card not found' })
    if (card.hint) return res.json({ hint: card.hint })

    const hint = await callAI(
      `Generate a one-sentence hint for the vocabulary word "${card.term}" which means "${card.definition}". ` +
      `The hint should help a student recall the word without directly stating its definition or using the word itself. ` +
      `Return only the hint sentence, no quotes or extra text.`
    )
    await prisma.card.update({ where: { id: card.id }, data: { hint } })
    res.json({ hint })
  } catch (err) {
    if (isRateLimit(err)) return res.status(429).json({ error: 'rate_limit' })
    next(err)
  }
})

// POST /api/ai/cards/:cardId/image
// imageUrl: null = not yet fetched; '' = fetched but none found; 'https://...' = has image.
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

// POST /api/ai/cards/:cardId/sentence
// Generates (and caches) one fill-in-the-blank sentence for a single card.
router.post('/cards/:cardId/sentence', requireAuth, async (req, res, next) => {
  try {
    const card = await prisma.card.findUnique({
      where: { id: req.params.cardId },
      include: { set: { select: { isSpanish: true } } },
    })
    if (!card) return res.status(404).json({ error: 'Card not found' })
    if (card.exampleSentence) return res.json({ exampleSentence: card.exampleSentence })

    const exampleSentence = await callAI(sentencePrompt(card.term, card.definition, card.set.isSpanish))
    await prisma.card.update({ where: { id: card.id }, data: { exampleSentence } })
    res.json({ exampleSentence })
  } catch (err) {
    if (isRateLimit(err)) return res.status(429).json({ error: 'rate_limit' })
    next(err)
  }
})

// POST /api/ai/sets/:setId/sentences
// Batch-generates sentences for all cards missing one. Continues on per-card failures.
router.post('/sets/:setId/sentences', requireAuth, async (req, res, next) => {
  try {
    const [set, allCards] = await Promise.all([
      prisma.wordSet.findUnique({ where: { id: req.params.setId }, select: { isSpanish: true } }),
      prisma.card.findMany({
        where: { setId: req.params.setId },
        select: { id: true, term: true, definition: true, exampleSentence: true },
      }),
    ])
    if (!allCards.length) return res.status(404).json({ error: 'Set not found or empty' })

    const missing = allCards.filter(c => !c.exampleSentence)
    for (const card of missing) {
      try {
        const exampleSentence = await callAI(sentencePrompt(card.term, card.definition, set?.isSpanish))
        await prisma.card.update({ where: { id: card.id }, data: { exampleSentence } })
        card.exampleSentence = exampleSentence
      } catch (err) {
        console.error(`Sentence generation failed for card ${card.id}: ${err.message}`)
      }
    }

    res.json({
      generated: missing.filter(c => c.exampleSentence).length,
      cards: allCards.map(c => ({ id: c.id, exampleSentence: c.exampleSentence })),
    })
  } catch (err) { next(err) }
})

export default router
