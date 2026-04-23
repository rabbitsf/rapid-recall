import { Router } from 'express'
import prisma from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

// GET /api/sets — return own sets + sets shared with user's classes
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id

    // Classes the user belongs to (as student)
    const memberships = await prisma.classMember.findMany({ where: { studentId: userId } })
    const classIds = memberships.map(m => m.classId)

    const sets = await prisma.wordSet.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { shares: { some: { classId: { in: classIds } } } },
          { isPublic: true },
        ],
      },
      include: {
        cards: { orderBy: { position: 'asc' } },
        owner: { select: { id: true, displayName: true, role: true } },
        shares: { include: { class: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(sets)
  } catch (err) { next(err) }
})

function validateCards(cards) {
  if (!Array.isArray(cards) || cards.length < 2) return 'At least 2 cards required'
  if (cards.length > 500) return 'Maximum 500 cards per set'
  for (const c of cards) {
    if (typeof c.term !== 'string' || typeof c.definition !== 'string') return 'Each card must have a string term and definition'
    if (!c.term.trim() || !c.definition.trim()) return 'Card term and definition cannot be blank'
    if (c.term.length > 500) return 'Card term must be 500 characters or fewer'
    if (c.definition.length > 2000) return 'Card definition must be 2000 characters or fewer'
  }
  return null
}

// POST /api/sets — create a set (owner = current user)
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { title, cards = [], isPublic = false } = req.body
    if (!title?.trim()) return res.status(400).json({ error: 'Title required' })
    if (title.length > 200) return res.status(400).json({ error: 'Title must be 200 characters or fewer' })
    const cardError = validateCards(cards)
    if (cardError) return res.status(400).json({ error: cardError })

    const set = await prisma.wordSet.create({
      data: {
        title: title.trim(),
        ownerId: req.user.id,
        isPublic,
        cards: {
          create: cards.map((c, i) => ({
            term: c.term.trim(),
            definition: c.definition.trim(),
            position: i,
          })),
        },
      },
      include: { cards: { orderBy: { position: 'asc' } } },
    })

    res.status(201).json(set)
  } catch (err) { next(err) }
})

// PUT /api/sets/:id — update title + replace cards (owner only)
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const set = await prisma.wordSet.findUnique({ where: { id: req.params.id } })
    if (!set) return res.status(404).json({ error: 'Set not found' })
    if (set.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })

    const { title, cards = [], isPublic } = req.body
    if (title !== undefined && title.length > 200) return res.status(400).json({ error: 'Title must be 200 characters or fewer' })
    const cardError = validateCards(cards)
    if (cardError) return res.status(400).json({ error: cardError })

    // Carry over cached AI fields for cards whose term is unchanged
    const existingCards = await prisma.card.findMany({ where: { setId: set.id } })
    const aiByTerm = {}
    for (const c of existingCards) {
      aiByTerm[c.term.trim().toLowerCase()] = {
        hint: c.hint,
        imageUrl: c.imageUrl,
        exampleSentence: c.exampleSentence,
      }
    }

    await prisma.card.deleteMany({ where: { setId: set.id } })

    const updated = await prisma.wordSet.update({
      where: { id: set.id },
      data: {
        title: title?.trim() ?? set.title,
        isPublic: isPublic ?? set.isPublic,
        cards: {
          create: cards.map((c, i) => {
            const ai = aiByTerm[c.term.trim().toLowerCase()] ?? {}
            return {
              term: c.term.trim(),
              definition: c.definition.trim(),
              position: i,
              hint: ai.hint ?? null,
              imageUrl: ai.imageUrl ?? null,
              exampleSentence: ai.exampleSentence ?? null,
            }
          }),
        },
      },
      include: { cards: { orderBy: { position: 'asc' } } },
    })

    res.json(updated)
  } catch (err) { next(err) }
})

// DELETE /api/sets/:id (owner only)
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const set = await prisma.wordSet.findUnique({ where: { id: req.params.id } })
    if (!set) return res.status(404).json({ error: 'Set not found' })
    if (set.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })

    await prisma.wordSet.delete({ where: { id: set.id } })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

export default router
