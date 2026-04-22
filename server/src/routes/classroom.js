import { Router } from 'express'
import crypto from 'crypto'
import prisma from '../db.js'
import { requireTeacher, requireAdmin } from '../middleware/requireAuth.js'
import { getAuthUrl, exchangeCode, getAdminClassroomClient, getAdminConnectionStatus, listCourses } from '../google/classroom.js'
import { syncCourse } from '../google/sync.js'

const router = Router()

router.get('/status', requireTeacher, async (_req, res, next) => {
  try {
    res.json(await getAdminConnectionStatus())
  } catch (err) { next(err) }
})

router.get('/connect', requireAdmin, (req, res) => {
  const state = crypto.randomBytes(16).toString('hex')
  req.session.classroomOAuthState = state
  res.redirect(getAuthUrl(state))
})

router.get('/callback', requireAdmin, async (req, res, next) => {
  try {
    const { code, state, error } = req.query
    if (error || state !== req.session.classroomOAuthState) {
      return res.redirect(`${process.env.CLIENT_URL}/teacher/classroom?error=oauth_failed`)
    }
    delete req.session.classroomOAuthState

    const tokens = await exchangeCode(code)
    await prisma.googleToken.upsert({
      where: { userId: req.user.id },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt: new Date(tokens.expiry_date),
      },
      create: {
        userId: req.user.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expiry_date),
      },
    })
    res.redirect(`${process.env.CLIENT_URL}/teacher/classroom`)
  } catch (err) { next(err) }
})

router.delete('/disconnect', requireAdmin, async (req, res, next) => {
  try {
    await prisma.googleToken.deleteMany({ where: { userId: req.user.id } })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

router.get('/courses', requireTeacher, async (req, res, next) => {
  try {
    const client = await getAdminClassroomClient()
    if (!client) return res.status(400).json({ error: 'Google Classroom not connected. Ask an admin to connect.' })

    const courses = await listCourses(client)

    const synced = await prisma.classroomSync.findMany({
      where: { teacherId: req.user.id },
      select: { googleCourseId: true, classId: true, lastSyncedAt: true },
    })
    const syncMap = Object.fromEntries(synced.map(s => [s.googleCourseId, s]))

    res.json(courses.map(c => ({
      id: c.id,
      name: c.name,
      section: c.section ?? null,
      imported: !!syncMap[c.id],
      localClassId: syncMap[c.id]?.classId ?? null,
      lastSyncedAt: syncMap[c.id]?.lastSyncedAt ?? null,
    })))
  } catch (err) { next(err) }
})

router.post('/sync/:courseId', requireTeacher, async (req, res, next) => {
  try {
    const client = await getAdminClassroomClient()
    if (!client) return res.status(400).json({ error: 'Google Classroom not connected' })

    const courses = await listCourses(client)
    const course = courses.find(c => c.id === req.params.courseId)
    if (!course) return res.status(404).json({ error: 'Course not found' })

    const result = await syncCourse(req.user.id, course, client)
    res.json(result)
  } catch (err) { next(err) }
})

export default router
