export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
  next()
}

// Admin passes all teacher checks
export function requireTeacher(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Teacher access required' })
  }
  next()
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
  next()
}
