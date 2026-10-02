import { Router } from 'express'
import prisma from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { findAccessibleSet } from '../lib/setAccess.js'
import { termKey } from '../lib/termKey.js'

const router = Router()

const progressSelect = { termKey: true, streak: true, correctCount: true, incorrectCount: true, lastStudiedAt: true }

// GET /api/card-progress/:setId — own per-term progress for a set
router.get('/:setId', requireAuth, async (req, res, next) => {
  try {
    const set = await findAccessibleSet(req.user.id, req.params.setId)
    if (!set) return res.status(403).json({ error: 'Forbidden' })
    const rows = await prisma.cardProgress.findMany({
      where: { userId: req.user.id, setId: set.id },
      select: progressSelect,
    })
    res.json(rows)
  } catch (err) { next(err) }
})

// POST /api/card-progress/:setId — record answers: { results: [{ term, correct }] }, applied in order
router.post('/:setId', requireAuth, async (req, res, next) => {
  try {
    const { results } = req.body
    if (!Array.isArray(results) || results.length === 0 || results.length > 1000) {
      return res.status(400).json({ error: 'results must be a non-empty array (max 1000)' })
    }
    const userId = req.user.id
    const set = await findAccessibleSet(userId, req.params.setId, { cards: { select: { term: true } } })
    if (!set) return res.status(403).json({ error: 'Forbidden' })

    const validKeys = new Set(set.cards.map(c => termKey(c.term)))
    const ops = results
      .filter(r => r && typeof r.term === 'string' && validKeys.has(termKey(r.term)))
      .map(r => {
        const key = termKey(r.term)
        const now = new Date()
        return prisma.cardProgress.upsert({
          where: { userId_setId_termKey: { userId, setId: set.id, termKey: key } },
          create: r.correct
            ? { userId, setId: set.id, termKey: key, streak: 1, correctCount: 1, lastStudiedAt: now }
            : { userId, setId: set.id, termKey: key, streak: 0, incorrectCount: 1, lastStudiedAt: now },
          update: r.correct
            ? { streak: { increment: 1 }, correctCount: { increment: 1 }, lastStudiedAt: now }
            : { streak: 0, incorrectCount: { increment: 1 }, lastStudiedAt: now },
        })
      })
    if (ops.length) await prisma.$transaction(ops)

    const rows = await prisma.cardProgress.findMany({ where: { userId, setId: set.id }, select: progressSelect })
    res.json(rows)
  } catch (err) { next(err) }
})

// DELETE /api/card-progress/:setId — reset own progress for a set
router.delete('/:setId', requireAuth, async (req, res, next) => {
  try {
    await prisma.cardProgress.deleteMany({ where: { userId: req.user.id, setId: req.params.setId } })
    res.json([])
  } catch (err) { next(err) }
})

export default router
