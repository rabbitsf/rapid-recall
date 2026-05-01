import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

function audioSubdir(filename) {
  if (filename.startsWith('bix')) return 'bix'
  if (filename.startsWith('gg')) return 'gg'
  if (/^\d/.test(filename)) return 'number'
  return filename[0]
}

// GET /api/pronunciation/spanish?word=hola
// Looks up the word in MW Spanish Dictionary, proxies the audio file back.
// Returns 404 if the word has no audio entry (caller should fall back to browser TTS).
router.get('/spanish', requireAuth, async (req, res) => {
  const { word } = req.query
  if (!word) return res.status(400).json({ error: 'word required' })

  const key = process.env.MW_SPANISH_KEY
  if (!key) return res.status(500).json({ error: 'MW_SPANISH_KEY not configured' })

  try {
    const mwRes = await fetch(
      `https://www.dictionaryapi.com/api/v3/references/spanish/json/${encodeURIComponent(word)}?key=${key}`
    )
    const data = await mwRes.json()

    // MW returns an array of strings (suggestions) when the word isn't found
    if (!Array.isArray(data) || !data.length || typeof data[0] === 'string') {
      return res.status(404).json({ error: 'not found' })
    }

    // Find first entry with a pronunciation audio file
    let audioFile = null
    for (const entry of data) {
      const prs = entry?.hwi?.prs
      if (Array.isArray(prs)) {
        for (const pr of prs) {
          if (pr?.sound?.audio) { audioFile = pr.sound.audio; break }
        }
      }
      if (audioFile) break
    }

    if (!audioFile) return res.status(404).json({ error: 'no audio' })

    const subdir = audioSubdir(audioFile)
    const audioUrl = `https://media.merriam-webster.com/audio/prons/es/me/mp3/${subdir}/${audioFile}.mp3`

    const audioRes = await fetch(audioUrl)
    if (!audioRes.ok) return res.status(404).json({ error: 'audio fetch failed' })

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    const buf = await audioRes.arrayBuffer()
    res.send(Buffer.from(buf))
  } catch (err) {
    console.error('MW pronunciation error:', err)
    res.status(500).json({ error: 'pronunciation lookup failed' })
  }
})

export default router
