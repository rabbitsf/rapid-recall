import { Router } from 'express'
import prisma from '../db.js'
import { requireTeacher } from '../middleware/requireAuth.js'
import { countMastery } from '../lib/mastery.js'

const router = Router()

// GET /api/progress/class/:classId — teacher view of all students' progress
router.get('/class/:classId', requireTeacher, async (req, res, next) => {
  try {
    const cls = await prisma.class.findUnique({
      where: { id: req.params.classId },
      include: { members: { include: { student: true } } },
    })
    if (!cls) return res.status(404).json({ error: 'Class not found' })
    if (cls.teacherId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })

    const studentIds = cls.members.map(m => m.studentId)

    const shares = await prisma.setClassShare.findMany({
      where: { classId: cls.id },
      include: { set: { select: { id: true, title: true, cards: { select: { term: true } } } } },
    })
    const sharedSets = shares.map(s => s.set)

    const [logs, results, progressRows] = await Promise.all([
      prisma.studyLog.findMany({ where: { userId: { in: studentIds } } }),
      prisma.gameResult.findMany({
        where: { userId: { in: studentIds } },
        include: { set: { select: { title: true } } },
        orderBy: { completedAt: 'desc' },
      }),
      prisma.cardProgress.findMany({
        where: { userId: { in: studentIds }, setId: { in: sharedSets.map(s => s.id) } },
        select: { userId: true, setId: true, termKey: true, streak: true },
      }),
    ])

    const studentMap = {}
    for (const m of cls.members) {
      const { id, displayName, email, photoUrl } = m.student
      studentMap[id] = { id, displayName, email, photoUrl, totalMinutes: 0, gameCount: 0, recentResults: [] }
    }
    for (const log of logs) {
      if (studentMap[log.userId]) studentMap[log.userId].totalMinutes += log.minutes
    }
    for (const r of results) {
      if (studentMap[r.userId]) {
        studentMap[r.userId].gameCount += 1
        if (studentMap[r.userId].recentResults.length < 5) studentMap[r.userId].recentResults.push(r)
      }
    }

    // Per student × shared set: mastered / learning / notStudied counts against the set's current terms
    const rowsByStudentSet = {}
    for (const r of progressRows) (rowsByStudentSet[`${r.userId}:${r.setId}`] ??= []).push(r)
    for (const student of Object.values(studentMap)) {
      student.setMastery = sharedSets.map(set => {
        const counts = countMastery(set.cards, rowsByStudentSet[`${student.id}:${set.id}`] ?? [])
        return { setId: set.id, title: set.title, ...counts, total: counts.mastered + counts.learning + counts.notStudied }
      })
    }

    res.json({ class: { id: cls.id, name: cls.name }, students: Object.values(studentMap) })
  } catch (err) { next(err) }
})

export default router
