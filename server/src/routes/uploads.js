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

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype))
  },
})

const router = Router()

const multerMiddleware = (req, res, next) => {
  upload.single('image')(req, res, err => {
    if (err?.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Image must be 5 MB or smaller.' })
    if (err) return next(err)
    next()
  })
}

router.post('/cards/:cardId/image', requireAuth, multerMiddleware, async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No valid image file provided (JPEG, PNG, WebP, GIF; max 5 MB)' })

    const card = await prisma.card.findUnique({
      where: { id: req.params.cardId },
      include: { set: { select: { ownerId: true } } },
    })
    if (!card) return res.status(404).json({ error: 'Card not found' })
    if (card.set.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })

    // Delete previous uploaded file if replacing
    if (card.uploadedImageUrl) {
      const oldPath = path.join(__dirname, '../..', card.uploadedImageUrl)
      fs.unlink(oldPath, () => {})
    }

    const uploadedImageUrl = `/uploads/cards/${req.file.filename}`
    await prisma.card.update({ where: { id: req.params.cardId }, data: { uploadedImageUrl } })

    res.json({ uploadedImageUrl })
  } catch (err) { next(err) }
})

export default router
