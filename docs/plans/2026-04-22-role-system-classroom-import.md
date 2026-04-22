# Role System + Classroom Import — Implementation Plan
# Progress: 11/11 tasks complete. DONE.
# Last updated: 2026-04-22
# Project: quizlet (Rapid Recall)

## Tasks
- [x] Task 1: Schema — add GoogleToken, ClassroomSync, ClassroomStudentMapping models; run migration
- [x] Task 2: Remove syncUsers.js; unwire startSyncSchedule from index.js
- [x] Task 3: Update auth.js — drop path-3 unknown-user creation; keep 2-path lookup only
- [x] Task 4: Update middleware/requireAuth.js — add requireAdmin; make requireTeacher pass admin too
- [x] Task 5: New server/src/routes/users.js — admin CRUD (GET /api/users, POST, PUT /:id)
- [x] Task 6: New server/src/routes/classroom.js — GET /connect, GET /callback, GET /courses, POST /sync/:courseId
- [x] Task 7: New server/src/google/classroom.js — API wrappers (listCourses, listStudents)
- [x] Task 8: New server/src/google/sync.js — syncCourse() creates Class + imports students as pre-activated Users
- [x] Task 9: New prisma/seed.js + add "seed" script to package.json
- [x] Task 10: Client — App.jsx /admin route; Layout.jsx admin badge; AdminDashboard, UserManager, ClassroomImport, TeacherDashboard import button
- [x] Task 11: Update .env.example — remove GOOGLE_SHEET_* vars, add CLASSROOM_REDIRECT_URI

---

## Task 1: Schema migration

**Files:** `prisma/schema.prisma`, then `npx prisma migrate dev`

**Changes:**
- Role enum already has `admin` — no change needed there
- Add model `GoogleToken` — stores per-user OAuth tokens for Classroom API
  - Fields: id (uuid), userId (unique FK → User), accessToken, refreshToken (nullable), expiresAt (DateTime nullable), scope, createdAt, updatedAt
- Add model `ClassroomSync` — tracks each course import
  - Fields: id (uuid), courseId (string, unique), courseName, teacherId (FK → User), lastSyncedAt (DateTime nullable), createdAt
- Add model `ClassroomStudentMapping` — links Classroom roster entry to a User
  - Fields: id (uuid), syncId (FK → ClassroomSync), studentEmail (string), userId (nullable FK → User), createdAt
- Add back-relations on User: `googleToken GoogleToken?`, `classroomSyncs ClassroomSync[]`, `classroomStudentMappings ClassroomStudentMapping[]`
- Run: `npx prisma migrate dev --name add_classroom_models`

---

## Task 2: Remove Google Sheet sync

**Files:** `server/src/index.js`, then delete `server/src/syncUsers.js`

**Changes in index.js:**
- Remove `import { startSyncSchedule } from './syncUsers.js'`
- Remove `startSyncSchedule()` call inside `app.listen`
- Delete file `server/src/syncUsers.js`

---

## Task 3: Simplify auth.js — drop path-3

**File:** `server/src/auth.js`

**Current state:** 3 paths — (1) by googleId, (2) by email pre-approved, (3) unknown → create inactive + block

**New behavior (2 paths only):**
- Path 1: found by googleId → update profile; block if inactive
- Path 2: found by email → link googleId, update profile; block if inactive
- Path 3 (unknown): return `done(null, false)` immediately — do NOT create any record
- Comment: unknown users are managed by admin or Classroom import only

---

## Task 4: Update middleware/requireAuth.js

**File:** `server/src/middleware/requireAuth.js`

**Current state:** `requireAuth` and `requireTeacher` (blocks non-teacher, does NOT pass admin)

**Changes:**
- Add `requireAdmin` — checks `req.user.role === 'admin'`
- Fix `requireTeacher` — allow role `teacher` OR `admin` (admins can do everything teachers can)

```js
export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
  next()
}

export function requireTeacher(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
  if (req.user.role !== 'teacher' && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Teacher access required' })
  next()
}
```

---

## Task 5: New server/src/routes/users.js

**File:** `server/src/routes/users.js` (new)

**Endpoints (all require requireAdmin):**
- `GET /api/users` — list all users (id, email, displayName, role, active, createdAt)
- `POST /api/users` — create user: body `{ email, displayName, role }`, active defaults false
- `PUT /api/users/:id` — update role and/or active: body `{ role?, active? }`

**Wire up:** add `import usersRoutes from './routes/users.js'` and `app.use('/api/users', usersRoutes)` in index.js

---

## Task 6: New server/src/routes/classroom.js

**File:** `server/src/routes/classroom.js` (new)

**Endpoints (all require requireTeacher):**
- `GET /classroom/connect` — redirect to Google OAuth for Classroom scope
  - Scopes: `https://www.googleapis.com/auth/classroom.courses.readonly`, `https://www.googleapis.com/auth/classroom.rosters.readonly`
  - Store state = userId; redirect_uri = CLASSROOM_REDIRECT_URI
- `GET /classroom/callback` — exchange code for tokens; upsert GoogleToken for req.user; redirect to client /teacher
- `GET /classroom/courses` — call `listCourses(accessToken)`; return array
- `POST /classroom/sync/:courseId` — call `syncCourse(user, courseId)`; return `{ created, linked, skipped }`

**Wire up:** add `import classroomRoutes from './routes/classroom.js'` and `app.use('/classroom', classroomRoutes)` in index.js

---

## Task 7: New server/src/google/classroom.js

**File:** `server/src/google/classroom.js` (new)

**Functions:**
- `listCourses(accessToken)` — GET `https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE`; return array of `{ id, name, section }`
- `listStudents(accessToken, courseId)` — GET `https://classroom.googleapis.com/v1/courses/{courseId}/students`; return array of `{ userId, profile: { emailAddress, name: { fullName } } }`

Use native `fetch` (Node 18+). Throw on non-2xx with message from response body.

---

## Task 8: New server/src/google/sync.js

**File:** `server/src/google/sync.js` (new)

**Function: `syncCourse(teacher, courseId)`**

Steps:
1. Fetch GoogleToken for teacher; refresh if expired (use googleapis OAuth2 client)
2. Call `listStudents(accessToken, courseId)` and `listCourses` to get course name
3. Upsert `ClassroomSync` for courseId (set lastSyncedAt = now, courseName, teacherId)
4. Upsert `Class` for this course (name = courseName, teacherId = teacher.id); reuse existing if courseId already linked
5. For each student in roster:
   a. Look up User by email
   b. If found: ensure active = true, ensure ClassMember row exists → count as `linked`
   c. If not found: create User (email, displayName from profile, active = true, role = 'student', googleId = null) + ClassMember → count as `created`
   d. Upsert `ClassroomStudentMapping` row
6. Return `{ created, linked, skipped: 0 }`

---

## Task 9: Seed script

**Files:** `prisma/seed.js` (new), `server/package.json`

**prisma/seed.js:**
- Reads `SEED_ADMIN_EMAIL` and `SEED_ADMIN_NAME` from env (or defaults to fung@hamlin.org / "Admin")
- Upserts a User with role = 'admin', active = true, googleId = null
- Logs: `Seeded admin: <email>`

**package.json addition (in `"prisma"` key or scripts):**
```json
"prisma": {
  "seed": "node prisma/seed.js"
}
```

Run with: `npx prisma db seed`

---

## Task 10: Client-side changes

**Files:**
- `client/src/App.jsx` — add `/admin` route (lazy import AdminDashboard, wrapped in PrivateRoute checking role === 'admin')
- `client/src/components/Layout.jsx` — show "Admin" badge/link in nav when user.role === 'admin'
- `client/src/pages/AdminDashboard.jsx` (new) — tab layout with "Users" tab and future tabs
- `client/src/components/UserManager.jsx` (new) — table of all users; inline role/active toggles via PUT /api/users/:id; "Add user" form via POST /api/users
- `client/src/components/ClassroomImport.jsx` (new) — "Connect Google Classroom" button → GET /classroom/connect; if connected, shows course list from GET /classroom/courses; "Import" button per course → POST /classroom/sync/:courseId; shows result toast
- `client/src/pages/TeacherDashboard.jsx` — add "Import from Classroom" button that renders or links to ClassroomImport

**AuthContext.jsx:** no change needed — role is already returned from /auth/me

---

## Task 11: Update .env.example

**File:** `.env.example` (or `.env` directly if no example file exists)

**Remove:**
- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` (or equivalent)

**Add:**
- `CLASSROOM_REDIRECT_URI=http://localhost:3001/classroom/callback`
- `SEED_ADMIN_EMAIL=you@school.org`
- `SEED_ADMIN_NAME=Admin`

Note: existing `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are reused for Classroom OAuth — no new credentials needed if the same Google Cloud project has Classroom API enabled.
