import prisma from '../db.js'

// CANONICAL: which word sets a user may study — owned, public, shared with a class they belong to or teach,
// or shared with them by a classmate. Teachers also see sets students shared within their classes (to review/remove).
export async function accessibleSetWhere(userId) {
  const [memberships, taught] = await Promise.all([
    prisma.classMember.findMany({ where: { studentId: userId }, select: { classId: true } }),
    prisma.class.findMany({ where: { teacherId: userId }, select: { id: true } }),
  ])
  const taughtIds = taught.map(c => c.id)
  const classIds = [...memberships.map(m => m.classId), ...taughtIds]
  return {
    OR: [
      { ownerId: userId },
      { shares: { some: { classId: { in: classIds } } } },
      { studentShares: { some: { studentId: userId } } },
      { studentShares: { some: { classId: { in: taughtIds } } } },
      { isPublic: true },
    ],
  }
}

// Returns the set if the user may study it, otherwise null
export async function findAccessibleSet(userId, setId, include) {
  return prisma.wordSet.findFirst({
    where: { id: setId, ...(await accessibleSetWhere(userId)) },
    ...(include && { include }),
  })
}
