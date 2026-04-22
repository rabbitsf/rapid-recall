import { Router } from 'express'
import prisma from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

// GET /api/study-logs?weeks=4 — own logs
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const weeks = Math.min(parseInt(req.query.weeks) || 8, 52)
    const since = new Date()
    since.setDate(since.getDate() - weeks * 7)

    const logs = await prisma.studyLog.findMany({
      where: { userId: req.user.id, date: { gte: since } },
      orderBy: { date: 'asc' },
    })
    res.json(logs)
  } catch (err) { next(err) }
})

// PUT /api/study-logs/:date — upsert minutes for a date (YYYY-MM-DD)
router.put('/:date', requireAuth, async (req, res, next) => {
  try {
    const { minutes } = req.body
    if (typeof minutes !== 'number' || minutes < 0) return res.status(400).json({ error: 'minutes must be a non-negative number' })

    const date = new Date(req.params.date)
    if (isNaN(date)) return res.status(400).json({ error: 'Invalid date' })

    const log = await prisma.studyLog.upsert({
      where: { userId_date: { userId: req.user.id, date } },
      update: { minutes },
      create: { userId: req.user.id, date, minutes },
    })
    res.json(log)
  } catch (err) { next(err) }
})

export default router
