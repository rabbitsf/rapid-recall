import prisma from '../db.js'
import { listStudents } from './classroom.js'

// client is the googleapis Classroom client — built once by the route and passed in
export async function syncCourse(teacherId, course, client) {
  const { id: googleCourseId, name } = course

  // Upsert Class + ClassroomSync record
  let sync = await prisma.classroomSync.findFirst({
    where: { googleCourseId, teacherId },
  })

  let classId
  if (sync) {
    await prisma.class.update({ where: { id: sync.classId }, data: { name } })
    classId = sync.classId
  } else {
    const cls = await prisma.class.create({ data: { name, teacherId } })
    sync = await prisma.classroomSync.create({
      data: { googleCourseId, classId: cls.id, teacherId },
    })
    classId = cls.id
  }

  const students = await listStudents(client, googleCourseId)
  let created = 0, linked = 0

  for (const student of students) {
    const googleUserId = student.userId
    if (!googleUserId) continue

    const displayName = student.profile?.name?.fullName ?? 'Student'
    const email = student.profile?.emailAddress?.toLowerCase() ?? null

    // Existing mapping — student already imported before
    const existingMapping = await prisma.classroomStudentMapping.findUnique({
      where: { googleUserId },
    })

    let userId
    if (existingMapping) {
      userId = existingMapping.userId
      linked++
    } else {
      // Find existing user by email or by googleId (if they already signed in)
      let user = email
        ? await prisma.user.findUnique({ where: { email } })
        : null
      if (!user) {
        user = await prisma.user.findUnique({ where: { googleId: googleUserId } })
      }

      if (!user) {
        // Create new user — set googleId immediately so sign-in works even if email scope is missing
        user = await prisma.user.create({
          data: {
            email: email ?? `gc-${googleUserId}@classroom.import`,
            displayName,
            role: 'student',
            active: true,
            googleId: googleUserId,
          },
        })
        created++
      } else {
        if (!user.active) {
          await prisma.user.update({ where: { id: user.id }, data: { active: true } })
        }
        linked++
      }

      userId = user.id
      await prisma.classroomStudentMapping.create({ data: { googleUserId, userId } })
    }

    await prisma.classMember.upsert({
      where: { classId_studentId: { classId, studentId: userId } },
      update: {},
      create: { classId, studentId: userId },
    })
  }

  await prisma.classroomSync.update({
    where: { id: sync.id },
    data: { lastSyncedAt: new Date() },
  })

  return { classId, className: name, studentsCreated: created, studentsLinked: linked }
}
