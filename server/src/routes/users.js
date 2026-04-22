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
      select: { id: true, email: true, displayName: true, photoUrl: true, role: true, active: true, createdAt: true },
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

// Update user (role, active, displayName)
router.put('/:id', async (req, res, next) => {
  try {
    const { displayName, role, active } = req.body
    const data = {}
    if (displayName !== undefined) data.displayName = displayName.trim()
    if (role !== undefined) data.role = role
    if (active !== undefined) data.active = active

    // Prevent admin from deactivating their own account
    if (req.params.id === req.user.id && active === false) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' })
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, displayName: true, role: true, active: true },
    })
    res.json(user)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' })
    next(err)
  }
})

export default router
