import { Router } from 'express'
import prisma from '../db.js'
import { requireAuth, requireTeacher } from '../middleware/requireAuth.js'

const router = Router()

// GET /api/classes — teacher gets their classes; student gets classes they belong to
router.get('/', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === 'teacher' || req.user.role === 'admin') {
      const classes = await prisma.class.findMany({
        where: { teacherId: req.user.id },
        include: { members: { include: { student: { select: { id: true, displayName: true, email: true, photoUrl: true } } } } },
        orderBy: { createdAt: 'desc' },
      })
      return res.json(classes)
    }

    const memberships = await prisma.classMember.findMany({
      where: { studentId: req.user.id },
      include: { class: { include: { teacher: { select: { displayName: true } } } } },
    })
    res.json(memberships.map(m => m.class))
  } catch (err) { next(err) }
})

// POST /api/classes — teacher creates a class
router.post('/', requireTeacher, async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Class name required' })
    if (name.length > 200) return res.status(400).json({ error: 'Class name must be 200 characters or fewer' })

    const cls = await prisma.class.create({
      data: { name: name.trim(), teacherId: req.user.id },
    })
    res.status(201).json(cls)
  } catch (err) { next(err) }
})

// PUT /api/classes/:id — rename a class
router.put('/:id', requireTeacher, async (req, res, next) => {
  try {
    const cls = await prisma.class.findUnique({ where: { id: req.params.id } })
    if (!cls) return res.status(404).json({ error: 'Class not found' })
    if (cls.teacherId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })

    const { name } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' })
    if (name.length > 200) return res.status(400).json({ error: 'Class name must be 200 characters or fewer' })

    const updated = await prisma.class.update({
      where: { id: req.params.id },
      data: { name: name.trim() },
    })
    res.json(updated)
  } catch (err) { next(err) }
})

// DELETE /api/classes/:id — teacher deletes their class
router.delete('/:id', requireTeacher, async (req, res, next) => {
  try {
    const cls = await prisma.class.findUnique({ where: { id: req.params.id } })
    if (!cls) return res.status(404).json({ error: 'Class not found' })
    if (cls.teacherId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })

    await prisma.class.delete({ where: { id: cls.id } })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// POST /api/classes/:id/members — teacher adds a student by email
router.post('/:id/members', requireTeacher, async (req, res, next) => {
  try {
    const cls = await prisma.class.findUnique({ where: { id: req.params.id } })
    if (!cls || cls.teacherId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })

    const { email } = req.body
    if (!email?.trim()) return res.status(400).json({ error: 'Email required' })

    const student = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
    if (!student) return res.status(404).json({ error: 'No user found with that email. They must sign in first.' })
    if (student.role !== 'student') return res.status(400).json({ error: 'That user is not a student.' })

    await prisma.classMember.upsert({
      where: { classId_studentId: { classId: cls.id, studentId: student.id } },
      update: {},
      create: { classId: cls.id, studentId: student.id },
    })

    res.json({ ok: true, student: { id: student.id, displayName: student.displayName, email: student.email } })
  } catch (err) { next(err) }
})

// DELETE /api/classes/:id/members/:studentId — teacher removes a student
router.delete('/:id/members/:studentId', requireTeacher, async (req, res, next) => {
  try {
    const cls = await prisma.class.findUnique({ where: { id: req.params.id } })
    if (!cls || cls.teacherId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })

    await prisma.classMember.deleteMany({
      where: { classId: cls.id, studentId: req.params.studentId },
    })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// POST /api/classes/:id/shares — teacher shares a set with this class
router.post('/:id/shares', requireTeacher, async (req, res, next) => {
  try {
    const cls = await prisma.class.findUnique({ where: { id: req.params.id } })
    if (!cls || cls.teacherId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })

    const { setId } = req.body
    const set = await prisma.wordSet.findUnique({ where: { id: setId } })
    if (!set || set.ownerId !== req.user.id) return res.status(403).json({ error: 'You do not own that set.' })

    await prisma.setClassShare.upsert({
      where: { setId_classId: { setId, classId: cls.id } },
      update: {},
      create: { setId, classId: cls.id },
    })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// DELETE /api/classes/:id/shares/:setId — teacher unshares a set
router.delete('/:id/shares/:setId', requireTeacher, async (req, res, next) => {
  try {
    const cls = await prisma.class.findUnique({ where: { id: req.params.id } })
    if (!cls || cls.teacherId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })

    await prisma.setClassShare.deleteMany({
      where: { classId: cls.id, setId: req.params.setId },
    })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

export default router
