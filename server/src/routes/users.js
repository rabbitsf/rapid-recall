import { Router } from 'express'
import prisma from '../db.js'
import { requireAdmin } from '../middleware/requireAuth.js'

const router = Router()
router.use(requireAdmin)

// List all users
router.get('/', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { displayName: 'asc' }],
      select: { id: true, email: true, displayName: true, photoUrl: true, role: true, active: true, gradeGroup: true, createdAt: true },
    })
    res.json(users)
  } catch (err) { next(err) }
})

// Create user
router.post('/', async (req, res, next) => {
  try {
    const { email, displayName, role = 'student' } = req.body
    if (!email || !displayName) return res.status(400).json({ error: 'email and displayName required' })
    const user = await prisma.user.create({
      data: { email: email.toLowerCase().trim(), displayName: displayName.trim(), role, active: true },
      select: { id: true, email: true, displayName: true, role: true, active: true, createdAt: true },
    })
    res.status(201).json(user)
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email already exists' })
    next(err)
  }
})

// Batch operations: deactivate / reactivate / assignGradeGroup / delete
router.post('/batch', async (req, res, next) => {
  try {
    const { action, ids, gradeGroup } = req.body
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids required' })
    const safeIds = ids.filter(id => id !== req.user.id)   // never act on own account

    if (action === 'deactivate') {
      await prisma.user.updateMany({ where: { id: { in: safeIds } }, data: { active: false } })
    } else if (action === 'reactivate') {
      await prisma.user.updateMany({ where: { id: { in: safeIds } }, data: { active: true } })
    } else if (action === 'assignGradeGroup') {
      const valid = ['K','1','2','3','4','5','6','7','8', null]
      if (!valid.includes(gradeGroup)) return res.status(400).json({ error: 'Invalid grade group' })
      await prisma.user.updateMany({ where: { id: { in: safeIds } }, data: { gradeGroup: gradeGroup ?? null } })
    } else if (action === 'delete') {
      await prisma.$transaction(async tx => {
        await tx.class.deleteMany({ where: { teacherId: { in: safeIds } } })
        await tx.wordSet.deleteMany({ where: { ownerId: { in: safeIds } } })
        await tx.studyLog.deleteMany({ where: { userId: { in: safeIds } } })
        await tx.gameResult.deleteMany({ where: { userId: { in: safeIds } } })
        await tx.user.deleteMany({ where: { id: { in: safeIds } } })
      })
    } else {
      return res.status(400).json({ error: 'Unknown action' })
    }
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// Update user (role, active, displayName, gradeGroup)
router.put('/:id', async (req, res, next) => {
  try {
    const { displayName, role, active, gradeGroup } = req.body
    const data = {}
    if (displayName !== undefined) data.displayName = displayName.trim()
    if (role !== undefined) data.role = role
    if (active !== undefined) data.active = active
    if (gradeGroup !== undefined) data.gradeGroup = gradeGroup

    // Prevent admin from deactivating their own account
    if (req.params.id === req.user.id && active === false) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' })
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, displayName: true, role: true, active: true, gradeGroup: true },
    })
    res.json(user)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' })
    next(err)
  }
})

export default router
