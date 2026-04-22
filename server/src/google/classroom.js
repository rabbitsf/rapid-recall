import { google } from 'googleapis'
import prisma from '../db.js'

function makeOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.CLASSROOM_REDIRECT_URI,
  )
}

export function getAuthUrl(state) {
  return makeOAuth2Client().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/classroom.courses.readonly',
      'https://www.googleapis.com/auth/classroom.rosters.readonly',
      'https://www.googleapis.com/auth/classroom.profile.emails',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state,
  })
}

export async function exchangeCode(code) {
  const client = makeOAuth2Client()
  const { tokens } = await client.getToken(code)
  return tokens
}

// Build a single authenticated Google Classroom client from the admin's stored token.
// Returns null if no admin has connected Classroom.
export async function getAdminClassroomClient() {
  const token = await prisma.googleToken.findFirst({
    where: { user: { role: 'admin', active: true } },
  })
  if (!token) return null

  const auth = makeOAuth2Client()
  auth.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    expiry_date: token.expiresAt.getTime(),
  })

  // Proactively refresh if expiring within 5 minutes
  if (token.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const { credentials } = await auth.refreshAccessToken()
    await prisma.googleToken.update({
      where: { id: token.id },
      data: { accessToken: credentials.access_token, expiresAt: new Date(credentials.expiry_date) },
    })
    auth.setCredentials(credentials)
  }

  return google.classroom({ version: 'v1', auth })
}

export async function getAdminConnectionStatus() {
  const token = await prisma.googleToken.findFirst({
    where: { user: { role: 'admin', active: true } },
    include: { user: { select: { displayName: true } } },
  })
  return token
    ? { connected: true, via: token.user.displayName }
    : { connected: false, via: null }
}

// Accept the client as a param (like gradebook) so token is fetched only once per request
export async function listCourses(client) {
  const courses = []
  let pageToken

  do {
    const res = await client.courses.list({
      teacherId: 'me',
      courseStates: ['ACTIVE'],
      pageSize: 100,
      pageToken,
    })
    courses.push(...(res.data.courses ?? []))
    pageToken = res.data.nextPageToken ?? undefined
  } while (pageToken)

  return courses
}

export async function listStudents(client, courseId) {
  const students = []
  let pageToken

  do {
    const res = await client.courses.students.list({
      courseId,
      pageSize: 100,
      pageToken,
    })
    students.push(...(res.data.students ?? []))
    pageToken = res.data.nextPageToken ?? undefined
  } while (pageToken)

  return students
}
