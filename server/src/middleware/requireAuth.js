import { isAdmin, isStaff, isSuperAdmin } from '../lib/roles.js'

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
  next()
}

// Admins (incl. super admins) pass all teacher checks
export function requireTeacher(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
  if (!isStaff(req.user.role)) return res.status(403).json({ error: 'Teacher access required' })
  next()
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
  if (!isAdmin(req.user.role)) return res.status(403).json({ error: 'Admin access required' })
  next()
}

export function requireSuperAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
  if (!isSuperAdmin(req.user.role)) return res.status(403).json({ error: 'Super admin access required' })
  next()
}
