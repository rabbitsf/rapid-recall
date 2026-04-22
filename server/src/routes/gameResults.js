import { Router } from 'express'
import prisma from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

// POST /api/game-results — save a completed game session
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { setId, game, score, total, timeSpent } = req.body
    if (!setId || !game || score == null || !total || timeSpent == null) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Verify the user has access to this set (owns it, it's shared with their class, or public)
    const userId = req.user.id
    const memberships = await prisma.classMember.findMany({ where: { studentId: userId }, select: { classId: true } })
    const classIds = memberships.map(m => m.classId)
    const set = await prisma.wordSet.findFirst({
      where: {
        id: setId,
        OR: [
          { ownerId: userId },
          { isPublic: true },
          { shares: { some: { classId: { in: classIds } } } },
        ],
      },
    })
    if (!set) return res.status(403).json({ error: 'Forbidden' })

    const result = await prisma.gameResult.create({
      data: { userId, setId, game, score, total, timeSpent },
    })
    res.status(201).json(result)
  } catch (err) { next(err) }
})

// GET /api/game-results — own results
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const results = await prisma.gameResult.findMany({
      where: { userId: req.user.id },
      include: { set: { select: { title: true } } },
      orderBy: { completedAt: 'desc' },
      take: 100,
    })
    res.json(results)
  } catch (err) { next(err) }
})

export default router
