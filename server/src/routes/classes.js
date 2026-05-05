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

// GET /api/classes/students — all active students for the pick-from-list feature
router.get('/students', requireTeacher, async (req, res, next) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'student', active: true },
      select: { id: true, email: true, displayName: true, photoUrl: true, gradeGroup: true },
      orderBy: { displayName: 'asc' },
    })
    res.json(students)
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

// POST /api/classes/:id/members — teacher adds a student by email (creates account if displayName provided)
router.post('/:id/members', requireTeacher, async (req, res, next) => {
  try {
    const cls = await prisma.class.findUnique({ where: { id: req.params.id } })
    if (!cls || cls.teacherId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })

    const { email, displayName } = req.body
    if (!email?.trim()) return res.status(400).json({ error: 'Email required' })

    const normalizedEmail = email.trim().toLowerCase()
    let student = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    if (!student) {
      if (!displayName?.trim()) return res.status(404).json({ error: 'No user found with that email. Provide a display name to create an account.' })
      student = await prisma.user.create({
        data: { email: normalizedEmail, displayName: displayName.trim(), role: 'student' },
      })
    }

    if (student.role !== 'student') return res.status(400).json({ error: 'That user is not a student.' })

    await prisma.classMember.upsert({
      where: { classId_studentId: { classId: cls.id, studentId: student.id } },
      update: {},
      create: { classId: cls.id, studentId: student.id },
    })

    res.json({ ok: true, student: { id: student.id, displayName: student.displayName, email: student.email } })
  } catch (err) { next(err) }
})

// POST /api/classes/:id/members/bulk — teacher adds multiple students by email
// Each entry: { email, displayName? } — creates account if displayName provided and account missing
router.post('/:id/members/bulk', requireTeacher, async (req, res, next) => {
  try {
    const cls = await prisma.class.findUnique({ where: { id: req.params.id } })
    if (!cls || cls.teacherId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })

    const { entries } = req.body
    if (!Array.isArray(entries) || entries.length === 0) return res.status(400).json({ error: 'entries array required' })

    const added = [], created = [], notFound = [], notStudent = [], alreadyIn = []

    for (const entry of entries) {
      const email = entry.email?.trim().toLowerCase()
      const displayName = entry.displayName?.trim() || ''
      if (!email) continue

      let student = await prisma.user.findUnique({ where: { email } })

      if (!student) {
        if (!displayName) { notFound.push(email); continue }
        student = await prisma.user.create({
          data: { email, displayName, role: 'student' },
        })
        created.push(email)
      }

      if (student.role !== 'student') { notStudent.push(email); continue }

      const existing = await prisma.classMember.findUnique({
        where: { classId_studentId: { classId: cls.id, studentId: student.id } },
      })
      if (existing) { alreadyIn.push(email); continue }
      await prisma.classMember.create({ data: { classId: cls.id, studentId: student.id } })
      added.push(email)
    }

    res.json({ added, created, notFound, notStudent, alreadyIn })
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
