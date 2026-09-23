import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import prisma from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.join(__dirname, '../../uploads/cards')
fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
    cb(null, `${req.params.cardId}-${Date.now()}${ext}`)
  },
})

const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype))
  },
})

// Recordings are converted to WAV client-side so every browser (incl. iPad Safari) can play them
const audioUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ['audio/wav', 'audio/x-wav', 'audio/wave'].includes(file.mimetype))
  },
})

const router = Router()

const multerMiddleware = (upload, field, sizeError) => (req, res, next) => {
  upload.single(field)(req, res, err => {
    if (err?.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: sizeError })
    if (err) return next(err)
    next()
  })
}

// Loads the card and checks the requester owns its set. Sends the error response and returns null on failure.
async function loadOwnedCard(req, res) {
  const card = await prisma.card.findUnique({
    where: { id: req.params.cardId },
    include: { set: { select: { ownerId: true } } },
  })
  if (!card) { res.status(404).json({ error: 'Card not found' }); return null }
  if (card.set.ownerId !== req.user.id) { res.status(403).json({ error: 'Forbidden' }); return null }
  return card
}

// Shared set copies point at the same file, so only delete it once no other card references it
async function unlinkIfUnreferenced(field, url, exceptCardId) {
  if (!url) return
  const others = await prisma.card.count({ where: { [field]: url, id: { not: exceptCardId } } })
  if (others === 0) fs.unlink(path.join(__dirname, '../..', url), () => {})
}

router.post('/cards/:cardId/image', requireAuth,
  multerMiddleware(imageUpload, 'image', 'Image must be 5 MB or smaller.'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No valid image file provided (JPEG, PNG, WebP, GIF; max 5 MB)' })

      const card = await loadOwnedCard(req, res)
      if (!card) return

      const uploadedImageUrl = `/uploads/cards/${req.file.filename}`
      await prisma.card.update({ where: { id: card.id }, data: { uploadedImageUrl } })
      await unlinkIfUnreferenced('uploadedImageUrl', card.uploadedImageUrl, card.id)

      res.json({ uploadedImageUrl })
    } catch (err) { next(err) }
  })

const requireTeacher = (req, res, next) => {
  if (!['teacher', 'admin'].includes(req.user?.role)) return res.status(403).json({ error: 'Only teachers can record pronunciations' })
  next()
}

router.post('/cards/:cardId/audio', requireAuth, requireTeacher,
  multerMiddleware(audioUpload, 'audio', 'Recording must be 2 MB or smaller.'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No valid recording provided (WAV; max 2 MB)' })

      const card = await loadOwnedCard(req, res)
      if (!card) { fs.unlink(req.file.path, () => {}); return }

      const uploadedAudioUrl = `/uploads/cards/${req.file.filename}`
      await prisma.card.update({ where: { id: card.id }, data: { uploadedAudioUrl } })
      await unlinkIfUnreferenced('uploadedAudioUrl', card.uploadedAudioUrl, card.id)

      res.json({ uploadedAudioUrl })
    } catch (err) { next(err) }
  })

router.delete('/cards/:cardId/audio', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const card = await loadOwnedCard(req, res)
    if (!card) return

    await prisma.card.update({ where: { id: card.id }, data: { uploadedAudioUrl: null } })
    await unlinkIfUnreferenced('uploadedAudioUrl', card.uploadedAudioUrl, card.id)

    res.json({ uploadedAudioUrl: null })
  } catch (err) { next(err) }
})

export default router
