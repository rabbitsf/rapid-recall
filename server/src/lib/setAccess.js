import prisma from '../db.js'

// CANONICAL: which word sets a user may study — owned, public, or shared with a class they belong to
export async function accessibleSetWhere(userId) {
  const memberships = await prisma.classMember.findMany({ where: { studentId: userId }, select: { classId: true } })
  const classIds = memberships.map(m => m.classId)
  return {
    OR: [
      { ownerId: userId },
      { shares: { some: { classId: { in: classIds } } } },
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
