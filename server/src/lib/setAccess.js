import prisma from '../db.js'
import { isStaff, isSuperAdmin } from './roles.js'

// CANONICAL: which word sets appear in a user's own lists (GET /api/sets) — owned, public, shared with a class
// they belong to or teach, shared with them by a classmate, or shared with their grade by a student in it.
// Teachers also see sets students shared within their classes, and every grade share (to review/remove).
// `user` needs { id, role, gradeGroup } (req.user).
export async function visibleSetWhere(user) {
  const [memberships, taught] = await Promise.all([
    prisma.classMember.findMany({ where: { studentId: user.id }, select: { classId: true } }),
    prisma.class.findMany({ where: { teacherId: user.id }, select: { id: true } }),
  ])
  const taughtIds = taught.map(c => c.id)
  const classIds = [...memberships.map(m => m.classId), ...taughtIds]
  const or = [
    { ownerId: user.id },
    { shares: { some: { classId: { in: classIds } } } },
    { studentShares: { some: { studentId: user.id } } },
    { studentShares: { some: { classId: { in: taughtIds } } } },
    { isPublic: true },
  ]
  if (isStaff(user.role)) or.push({ sharedWithGrade: true })
  else if (user.gradeGroup) or.push(gradeShareWhere(user.gradeGroup))
  return { OR: or }
}

// Grade shares follow the owner's CURRENT grade, so a student moving up takes their shares along
export function gradeShareWhere(gradeGroup) {
  return { sharedWithGrade: true, owner: { role: 'student', gradeGroup } }
}

// Which sets a user may open/study: everything visible to them; a super admin may open any set
export async function accessibleSetWhere(user) {
  return isSuperAdmin(user.role) ? {} : visibleSetWhere(user)
}

// Returns the set if the user may study it, otherwise null
export async function findAccessibleSet(user, setId, include) {
  return prisma.wordSet.findFirst({
    where: { id: setId, ...(await accessibleSetWhere(user)) },
    ...(include && { include }),
  })
}

// CANONICAL: who may edit/delete a set (and its cards' uploads/AI batch) — the owner or a super admin.
// Sharing a set stays owner-only.
export function canEditSet(user, set) {
  return !!set && (set.ownerId === user.id || isSuperAdmin(user.role))
}
