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

// Extension comes from this allowlist, never from the client filename — an uploaded
// .html/.js would be served same-origin and run as whoever opens the link
const EXT_BY_MIME = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif',
  'audio/wav': '.wav', 'audio/x-wav': '.wav', 'audio/wave': '.wav',
}

// Filename uses the DB card id (set by requireOwnedCard), never the raw URL param — blocks path traversal
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${req.card.id}-${Date.now()}${EXT_BY_MIME[file.mimetype]}`),
})

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const AUDIO_TYPES = ['audio/wav', 'audio/x-wav', 'audio/wave']

const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, IMAGE_TYPES.includes(file.mimetype)),
})

// Recordings are converted to WAV client-side so every browser (incl. iPad Safari) can play them
const audioUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, AUDIO_TYPES.includes(file.mimetype)),
})

const router = Router()

const multerMiddleware = (upload, field, sizeError) => (req, res, next) => {
  upload.single(field)(req, res, err => {
    if (err?.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: sizeError })
    if (err) return next(err)
    next()
  })
}

// Loads the card into req.card and checks the requester owns its set. Runs BEFORE multer so nothing
// is written to disk for cards the user doesn't own.
async function requireOwnedCard(req, res, next) {
  try {
    const card = await prisma.card.findUnique({
      where: { id: req.params.cardId },
      include: { set: { select: { ownerId: true } } },
    })
    if (!card) return res.status(404).json({ error: 'Card not found' })
    if (card.set.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })
    req.card = card
    next()
  } catch (err) { next(err) }
}

// Shared set copies point at the same file, so only delete it once no other card references it
async function unlinkIfUnreferenced(field, url, exceptCardId) {
  if (!url) return
  const others = await prisma.card.count({ where: { [field]: url, id: { not: exceptCardId } } })
  if (others === 0) fs.unlink(path.join(__dirname, '../..', url), () => {})
}

router.post('/cards/:cardId/image', requireAuth, requireOwnedCard,
  multerMiddleware(imageUpload, 'image', 'Image must be 5 MB or smaller.'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No valid image file provided (JPEG, PNG, WebP, GIF; max 5 MB)' })

      const { card } = req

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

router.post('/cards/:cardId/audio', requireAuth, requireTeacher, requireOwnedCard,
  multerMiddleware(audioUpload, 'audio', 'Recording must be 2 MB or smaller.'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No valid recording provided (WAV; max 2 MB)' })

      const { card } = req

      const uploadedAudioUrl = `/uploads/cards/${req.file.filename}`
      await prisma.card.update({ where: { id: card.id }, data: { uploadedAudioUrl } })
      await unlinkIfUnreferenced('uploadedAudioUrl', card.uploadedAudioUrl, card.id)

      res.json({ uploadedAudioUrl })
    } catch (err) { next(err) }
  })

router.delete('/cards/:cardId/audio', requireAuth, requireTeacher, requireOwnedCard, async (req, res, next) => {
  try {
    const { card } = req

    await prisma.card.update({ where: { id: card.id }, data: { uploadedAudioUrl: null } })
    await unlinkIfUnreferenced('uploadedAudioUrl', card.uploadedAudioUrl, card.id)

    res.json({ uploadedAudioUrl: null })
  } catch (err) { next(err) }
})

export default router
