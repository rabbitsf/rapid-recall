import { Router } from 'express'
import prisma from '../db.js'
import { requireAuth, requireSuperAdmin } from '../middleware/requireAuth.js'
import { visibleSetWhere, findAccessibleSet, canEditSet } from '../lib/setAccess.js'
import { isStaff, STAFF_ROLES } from '../lib/roles.js'
import { termKey } from '../lib/termKey.js'

const router = Router()

const SET_INCLUDE = {
  cards: { orderBy: { position: 'asc' } },
  owner: { select: { id: true, displayName: true, role: true, gradeGroup: true } },
  shares: { include: { class: { select: { id: true, name: true } } } },
  studentShares: { select: { classId: true, student: { select: { id: true, displayName: true } } } },
  copiedFrom: { select: { id: true, title: true, owner: { select: { displayName: true } } } },
}

// GET /api/sets — own sets + sets shared with the user (class, classmate, grade, public)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const sets = await prisma.wordSet.findMany({
      where: await visibleSetWhere(req.user),
      include: SET_INCLUDE,
      orderBy: { createdAt: 'desc' },
    })
    res.json(sets)
  } catch (err) { next(err) }
})

// GET /api/sets/all — super admin: every set anyone created (no cards; open one via GET /api/sets/:id)
router.get('/all', requireSuperAdmin, async (_req, res, next) => {
  try {
    const sets = await prisma.wordSet.findMany({
      select: {
        id: true, title: true, ownerId: true, isPublic: true, sharedWithGrade: true, createdAt: true,
        owner: { select: { id: true, displayName: true, email: true, role: true, gradeGroup: true } },
        _count: { select: { cards: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(sets)
  } catch (err) { next(err) }
})

// GET /api/sets/:id — one set the user may open (super admin: any set)
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const set = await findAccessibleSet(req.user, req.params.id, SET_INCLUDE)
    if (!set) return res.status(404).json({ error: 'Set not found' })
    res.json(set)
  } catch (err) { next(err) }
})

// PUT /api/sets/:id/grade-share — a student shares a set they own with everyone in their grade
// (visible to students whose grade matches the owner's current grade, and to all teachers)
router.put('/:id/grade-share', requireAuth, async (req, res, next) => {
  try {
    const set = await prisma.wordSet.findUnique({ where: { id: req.params.id } })
    if (!set || set.ownerId !== req.user.id) return res.status(403).json({ error: 'You do not own that set.' })
    if (req.user.role !== 'student') return res.status(400).json({ error: 'Only students can share with their grade.' })
    if (!req.user.gradeGroup) return res.status(400).json({ error: 'You have not been assigned a grade yet. Ask an admin.' })
    await prisma.wordSet.update({ where: { id: set.id }, data: { sharedWithGrade: true } })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// DELETE /api/sets/:id/grade-share — the owner, or any teacher/admin, stops a grade share
router.delete('/:id/grade-share', requireAuth, async (req, res, next) => {
  try {
    const set = await prisma.wordSet.findUnique({ where: { id: req.params.id } })
    if (!set) return res.status(404).json({ error: 'Set not found' })
    if (set.ownerId !== req.user.id && !isStaff(req.user.role)) return res.status(403).json({ error: 'Forbidden' })
    await prisma.wordSet.update({ where: { id: set.id }, data: { sharedWithGrade: false } })
    res.json({ ok: true })
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
    const { title, cards = [], isPublic = false, isSpanish = false } = req.body
    if (!title?.trim()) return res.status(400).json({ error: 'Title required' })
    if (title.length > 200) return res.status(400).json({ error: 'Title must be 200 characters or fewer' })
    const cardError = validateCards(cards)
    if (cardError) return res.status(400).json({ error: cardError })

    const set = await prisma.wordSet.create({
      data: {
        title: title.trim(),
        ownerId: req.user.id,
        isPublic,
        isSpanish,
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

// PUT /api/sets/:id — update title + replace cards (owner or super admin)
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const set = await prisma.wordSet.findUnique({ where: { id: req.params.id } })
    if (!set) return res.status(404).json({ error: 'Set not found' })
    if (!canEditSet(req.user, set)) return res.status(403).json({ error: 'Forbidden' })

    const { title, cards = [], isPublic, isSpanish } = req.body
    if (title !== undefined && title.length > 200) return res.status(400).json({ error: 'Title must be 200 characters or fewer' })
    const cardError = validateCards(cards)
    if (cardError) return res.status(400).json({ error: cardError })

    // Carry over cached AI fields for cards whose term is unchanged
    const existingCards = await prisma.card.findMany({ where: { setId: set.id } })
    const aiByTerm = {}
    for (const c of existingCards) {
      aiByTerm[termKey(c.term)] = {
        hint: c.hint,
        imageUrl: c.imageUrl,
        exampleSentence: c.exampleSentence,
        uploadedImageUrl: c.uploadedImageUrl,
        uploadedAudioUrl: c.uploadedAudioUrl,
      }
    }

    await prisma.card.deleteMany({ where: { setId: set.id } })

    const updated = await prisma.wordSet.update({
      where: { id: set.id },
      data: {
        title: title?.trim() ?? set.title,
        isPublic: isPublic ?? set.isPublic,
        isSpanish: isSpanish ?? set.isSpanish,
        cards: {
          create: cards.map((c, i) => {
            const ai = aiByTerm[termKey(c.term)] ?? {}
            return {
              term: c.term.trim(),
              definition: c.definition.trim(),
              position: i,
              hint: ai.hint ?? null,
              imageUrl: ai.imageUrl ?? null,
              exampleSentence: ai.exampleSentence ?? null,
              uploadedImageUrl: ai.uploadedImageUrl ?? null,
              uploadedAudioUrl: ai.uploadedAudioUrl ?? null,
            }
          }),
        },
      },
      include: { cards: { orderBy: { position: 'asc' } } },
    })

    res.json(updated)
  } catch (err) { next(err) }
})

// POST /api/sets/:id/share — copy a set into another teacher's own sets (owner-only on the source)
router.post('/:id/share', requireAuth, async (req, res, next) => {
  try {
    const source = await prisma.wordSet.findUnique({
      where: { id: req.params.id },
      include: { cards: { orderBy: { position: 'asc' } } },
    })
    if (!source) return res.status(404).json({ error: 'Set not found' })
    if (source.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })

    const { teacherId } = req.body
    if (!teacherId) return res.status(400).json({ error: 'teacherId required' })
    if (teacherId === req.user.id) return res.status(400).json({ error: 'Cannot share a set with yourself' })

    const target = await prisma.user.findUnique({ where: { id: teacherId } })
    if (!target || !target.active || !STAFF_ROLES.includes(target.role)) {
      return res.status(400).json({ error: 'Target must be an active teacher' })
    }

    const copy = await prisma.wordSet.create({
      data: {
        title: source.title,
        ownerId: teacherId,
        isPublic: false,
        isSpanish: source.isSpanish,
        copiedFromSetId: source.id,
        cards: {
          create: source.cards.map(c => ({
            term: c.term,
            definition: c.definition,
            position: c.position,
            hint: c.hint,
            imageUrl: c.imageUrl,
            exampleSentence: c.exampleSentence,
            uploadedImageUrl: c.uploadedImageUrl,
            uploadedAudioUrl: c.uploadedAudioUrl,
          })),
        },
      },
      include: { cards: { orderBy: { position: 'asc' } } },
    })

    res.status(201).json(copy)
  } catch (err) { next(err) }
})

// DELETE /api/sets/:id (owner or super admin)
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const set = await prisma.wordSet.findUnique({ where: { id: req.params.id } })
    if (!set) return res.status(404).json({ error: 'Set not found' })
    if (!canEditSet(req.user, set)) return res.status(403).json({ error: 'Forbidden' })

    // game_results.set_id is ON DELETE RESTRICT, so a set anyone has played needs its results removed first
    await prisma.$transaction([
      prisma.gameResult.deleteMany({ where: { setId: set.id } }),
      prisma.wordSet.delete({ where: { id: set.id } }),
    ])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

export default router
