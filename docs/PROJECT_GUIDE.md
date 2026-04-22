# PROJECT_GUIDE.md — AI External Memory

> This file is the **living system map** for AI assistance.
> Update it whenever the system structure or behavior changes.

---

## 1. Project Overview

**Rapid Recall** — a full-stack Quizlet-like educational web app.

Monorepo root: `/Users/fung/Claude Projects/quizlet/`

Users:
- **Teachers**: create classes, upload/share word sets, view per-student progress
- **Students**: study from class sets or their own sets, play 5 game modes, track study time

Tech stack:
- Vite + React + Tailwind CSS + Lucide icons (frontend, `client/`)
- Node.js + Express (backend, `server/`)
- PostgreSQL (v18, Homebrew) via Prisma ORM
- Google OAuth 2.0 via passport-google-oauth20 + express-session
- Session store: connect-pg-simple (sessions in PostgreSQL)

---

## 2. High-Level Architecture

```
quizlet/                          — monorepo root
  prisma/
    schema.prisma                 — CANONICAL: full data model + Prisma generator config
  server/
    src/
      index.js                   — Express entry point (mounts all routes)
      db.js                      — CANONICAL: PrismaClient singleton (single import point)
      auth.js                    — CANONICAL: passport strategy + session setup
      middleware/
        requireAuth.js           — auth guard middleware (requireAuth, requireTeacher, requireAdmin)
      routes/
        auth.js                  — /auth/google, /callback, /auth/me, /auth/logout
        sets.js                  — GET/POST/PUT/DELETE /api/sets
        classes.js               — GET/POST /api/classes + members + shares
        studyLogs.js             — GET/PUT /api/study-logs/:date
        gameResults.js           — POST /api/game-results
        progress.js              — GET /api/progress/class/:classId (teacher only)
        users.js                 — GET/POST/PUT /api/users (admin only)
        classroom.js             — GET /classroom/connect|callback|courses; POST /classroom/sync/:courseId
      google/
        classroom.js             — CANONICAL: Classroom API wrappers (listCourses, listStudents)
        sync.js                  — CANONICAL: syncCourse() — upserts Class + imports students
  client/
    src/
      main.jsx                   — entry point
      App.jsx                    — router + AuthProvider wrapper
      context/
        AuthContext.jsx          — CANONICAL: auth state, Google sign-in, sign-out, userRole
      hooks/
        useSets.js               — CANONICAL: REST CRUD for word sets
        useClasses.js            — CANONICAL: REST CRUD for classes
        useStudyLogs.js          — CANONICAL: read/write study minutes via API
        useGameResults.js        — CANONICAL: save/read game results via API
        useUsers.js              — CANONICAL: admin user management (calls /api/users)
      pages/
        LoginPage.jsx            — Google sign-in screen
        TeacherDashboard.jsx     — teacher landing (class mgmt + progress links + Classroom import button)
        StudentDashboard.jsx     — student landing (my sets + class sets tabs)
        ClassManager.jsx         — create classes, add students, share sets
        StudentProgress.jsx      — per-student progress table for teachers
        SetEditor.jsx            — card editor
        AdminDashboard.jsx       — admin-only: user list, add, toggle active, change role
        ClassroomImport.jsx      — teacher: OAuth connect + course list + sync UI
      components/
        Layout.jsx               — shared nav bar (logo, user, role badge, sign-out)
        StudyCalendar.jsx        — weekly study time heatmap
        StudyMenu.jsx            — game picker + session timer (auto-logs on exit)
        games/
          FlashcardsMode.jsx
          MatchGame.jsx
          QuizGame.jsx
          TypeGame.jsx
          BubblePopGame.jsx
      utils/
        shuffleArray.js          — CANONICAL: Fisher-Yates shuffle (all games import from here)
        confetti.js              — CANONICAL: launchConfetti() (all games import from here)
```

---

## 3. End-to-End Workflows

### Teacher flow
1. Sign in with Google → `/auth/google` → passport creates/finds user in PostgreSQL with `role: 'student'` default
2. Role promoted to `'teacher'` manually via DB or admin script
3. Teacher routed to `/teacher` → `TeacherDashboard`
4. Create a class in `ClassManager` → POST `/api/classes`
5. Upload word set via `SetEditor` (CSV or manual) → POST `/api/sets`
6. Share set with class → POST `/api/classes/:id/shares`
7. View student progress → `StudentProgress` → GET `/api/progress/class/:classId`

### Student flow
1. Sign in with Google → routed to `/` → `StudentDashboard`
2. "Class Sets" tab → `useSets` fetches sets shared with student's classes
3. "My Sets" tab → manage own sets
4. Play a game → `StudyMenu` starts timer → game component runs → on completion: POST `/api/game-results`
5. `StudyMenu` on unmount: PUT `/api/study-logs/:date` called automatically

### Auth flow
- `AuthContext` wraps entire app; fetches `/auth/me` on load
- Unauthenticated users redirected to `/login`
- Role-based routing: `'teacher'` → `/teacher`, `'student'` → `/`

---

## 4. Canonical Implementations (Single Source of Truth)

| Behavior | Canonical Location | Notes |
|----------|-------------------|-------|
| Prisma data model | `prisma/schema.prisma` | Generator output: `../server/node_modules/.prisma/client` |
| PrismaClient singleton | `server/src/db.js` | All server routes import `prisma` from here only |
| Passport strategy + session | `server/src/auth.js` | google-oauth20, connect-pg-simple session store |
| Auth routes | `server/src/routes/auth.js` | `/auth/google`, `/auth/google/callback`, `/auth/me`, `/auth/logout` |
| Auth state + Google sign-in | `client/src/context/AuthContext.jsx` | `signInWithGoogle`, `signOut`, `currentUser`, `userRole` |
| Word set CRUD | `client/src/hooks/useSets.js` | Calls REST `/api/sets` |
| Class CRUD | `client/src/hooks/useClasses.js` | Calls REST `/api/classes` |
| Study log read/write | `client/src/hooks/useStudyLogs.js` | `updateStudyLog(dateString, minutes)` → PUT `/api/study-logs/:date` |
| Game result save/read | `client/src/hooks/useGameResults.js` | `saveGameResult({setId, game, score, timeSpent})` → POST `/api/game-results` |
| Array shuffle | `client/src/utils/shuffleArray.js` | Fisher-Yates; all game components import from here |
| Confetti animation | `client/src/utils/confetti.js` | `launchConfetti(isBig)`; all game components import from here |
| Study session timer + auto-log | `client/src/components/StudyMenu.jsx` | Starts on mount, writes log on unmount via `useStudyLogs` |
| Auth guard (server) | `server/src/middleware/requireAuth.js` | `requireAuth`, `requireTeacher` (teacher or admin), `requireAdmin` (admin only) |
| Admin user CRUD | `server/src/routes/users.js` | GET/POST/PUT `/api/users`; requires `requireAdmin` |
| Classroom OAuth + sync trigger | `server/src/routes/classroom.js` | GET `/classroom/connect`, `/callback`, `/courses`; POST `/classroom/sync/:courseId` |
| Classroom API wrappers | `server/src/google/classroom.js` | `getAuthUrl`, `exchangeCode`, `listCourses`, `listStudents` |
| Course sync logic | `server/src/google/sync.js` | `syncCourse(teacher, courseId)` — upserts Class, imports students as active Users |
| Admin dashboard UI | `client/src/pages/AdminDashboard.jsx` | User management UI (list, add, toggle active, change role) |
| Classroom import UI | `client/src/pages/ClassroomImport.jsx` | Connect flow + course list + sync/re-sync UI |
| Admin user hook | `client/src/hooks/useUsers.js` | Calls `/api/users`; used by AdminDashboard |

---

## 5. Generated Artifacts vs. Canonical Sources

| Artifact | Generator/Template | Regenerate Command |
|----------|-------------------|-------------------|
| `server/node_modules/.prisma/client` | `prisma/schema.prisma` | `cd server && npx prisma generate` (run from monorepo root: `npm run prisma:generate`) |
| Tailwind CSS output | `client/tailwind.config.js` + PostCSS | Automatic via Vite dev server |

---

## 6. Duplication Hotspots

- **PrismaClient**: Risk of instantiating a new `PrismaClient()` per route file. Rule: only `server/src/db.js` calls `new PrismaClient()`. All route files import `prisma` from `../db.js`.
- **Prisma client path**: `prisma/schema.prisma` generator output is `../server/node_modules/.prisma/client`. Do NOT change this — it is required for `server/` to resolve the generated client at runtime.
- **Shuffle logic**: All 5 game components must import `shuffleArray` from `client/src/utils/shuffleArray.js`. Never re-implement inline.
- **Confetti**: All game components import `launchConfetti` from `client/src/utils/confetti.js`. Never re-implement inline.
- **Study time logging**: Only `StudyMenu.jsx` writes to study logs via `useStudyLogs`. Game components call `saveGameResult()` only.
- **API base URL**: Client hooks call relative `/api/...` paths; Vite proxy config in `client/vite.config.js` forwards to `http://localhost:3001`.

---

## 7. Safe Change Playbook

### Adding a new game mode
1. Create `client/src/components/games/NewGame.jsx`
2. Import `shuffleArray` from `client/src/utils/shuffleArray.js` (do NOT re-implement)
3. Import `launchConfetti` from `client/src/utils/confetti.js`
4. On game completion: call `saveGameResult()` from `useGameResults` (passed as prop from `StudyMenu`)
5. Add the new game to `StudyMenu.jsx` game picker
6. Update Section 4 of this file

### Changing the Prisma data model
1. Edit `prisma/schema.prisma`
2. Run `npm run prisma:migrate` (creates and applies migration)
3. Run `npm run prisma:generate` (regenerates client into `server/node_modules/.prisma/client`)
4. Update affected server route in `server/src/routes/`
5. Update affected client hook in `client/src/hooks/`
6. Update Section 3 and Section 4 of this file

### Adding a new API route
1. Create `server/src/routes/<name>.js`; import `prisma` from `../db.js`
2. Mount in `server/src/index.js`
3. Apply `requireAuth` middleware
4. Add a corresponding hook in `client/src/hooks/use<Name>.js`
5. Register canonical location in Section 4 of this file

### Promoting a student to teacher
- Run SQL: `UPDATE users SET role = 'teacher' WHERE email = '...'`
- Or via psql: `\c rapidrecall` then update
- `AuthContext` picks up the new role on next sign-in via `/auth/me`
