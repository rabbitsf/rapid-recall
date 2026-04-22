import { Router } from 'express'
import passport from 'passport'

const router = Router()

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL}/login?error=unauthorized` }),
  (_req, res) => res.redirect(process.env.CLIENT_URL)
)

router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ user: null })
  const { id, email, displayName, photoUrl, role } = req.user
  res.json({ user: { id, email, displayName, photoUrl, role } })
})

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err)
    res.json({ ok: true })
  })
})

export default router
