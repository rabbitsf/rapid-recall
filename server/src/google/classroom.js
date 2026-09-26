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

// Resolve the Google token for a user: their own first, else fall back to an active admin's.
// Since the 2026-27 school year each course is owned only by its teacher, so the shared
// admin account no longer sees every class — teachers must connect their own account.
async function resolveToken(userId) {
  const own = await prisma.googleToken.findUnique({
    where: { userId },
    include: { user: { select: { displayName: true } } },
  })
  if (own) return { token: own, isOwn: true }

  const admin = await prisma.googleToken.findFirst({
    where: { user: { role: 'admin', active: true } },
    include: { user: { select: { displayName: true } } },
  })
  return admin ? { token: admin, isOwn: false } : null
}

// Build an authenticated Google Classroom client for a user (own token, else admin fallback).
// Returns null if no usable token exists.
export async function getClassroomClient(userId) {
  const resolved = await resolveToken(userId)
  if (!resolved) return null
  const { token } = resolved

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
      data: {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token ?? undefined,
        expiresAt: new Date(credentials.expiry_date),
      },
    })
    auth.setCredentials({ ...credentials, refresh_token: credentials.refresh_token ?? token.refreshToken })
  }

  return google.classroom({ version: 'v1', auth })
}

export async function getConnectionStatus(userId) {
  const resolved = await resolveToken(userId)
  return resolved
    ? { connected: true, isOwn: resolved.isOwn, via: resolved.token.user.displayName }
    : { connected: false, isOwn: false, via: null }
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
