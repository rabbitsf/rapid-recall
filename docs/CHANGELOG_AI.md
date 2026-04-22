# CHANGELOG_AI.md — Rapid Recall

Append-only audit log of all AI-assisted changes.

---

## [2026-04-22] - Full-Stack App Build (All 7 Phases)

### Changes
- Phase 1: Monorepo scaffold — Vite + React client, Express server, Prisma + PostgreSQL, Tailwind CSS, root workspace scripts
- Phase 2: Google OAuth auth — passport-google-oauth20, express-session with connect-pg-simple, AuthContext, LoginPage
- Phase 3: REST API routes + Prisma data layer — sets, classes, study-logs, game-results, progress endpoints; client hooks (useSets, useClasses, useStudyLogs, useGameResults)
- Phase 4: Teacher features — TeacherDashboard, ClassManager, StudentProgress, SetEditor
- Phase 5: Student features — StudentDashboard, StudyCalendar
- Phase 6: All 5 game modes ported — FlashcardsMode, MatchGame, QuizGame, TypeGame, BubblePopGame; StudyMenu with auto-log on unmount
- Phase 7: Server boots, client builds cleanly; Layout nav bar, App.jsx routing finalized
- Fix: `prisma/schema.prisma` generator output set to `../server/node_modules/.prisma/client` so the Express server resolves the generated Prisma runtime correctly

### Files Affected
- `prisma/schema.prisma`
- `server/src/index.js`
- `server/src/db.js`
- `server/src/auth.js`
- `server/src/middleware/requireAuth.js`
- `server/src/routes/auth.js`
- `server/src/routes/sets.js`
- `server/src/routes/classes.js`
- `server/src/routes/studyLogs.js`
- `server/src/routes/gameResults.js`
- `server/src/routes/progress.js`
- `client/src/main.jsx`
- `client/src/App.jsx`
- `client/src/context/AuthContext.jsx`
- `client/src/hooks/useSets.js`
- `client/src/hooks/useClasses.js`
- `client/src/hooks/useStudyLogs.js`
- `client/src/hooks/useGameResults.js`
- `client/src/pages/LoginPage.jsx`
- `client/src/pages/TeacherDashboard.jsx`
- `client/src/pages/StudentDashboard.jsx`
- `client/src/pages/ClassManager.jsx`
- `client/src/pages/StudentProgress.jsx`
- `client/src/pages/SetEditor.jsx`
- `client/src/components/Layout.jsx`
- `client/src/components/StudyCalendar.jsx`
- `client/src/components/StudyMenu.jsx`
- `client/src/components/games/FlashcardsMode.jsx`
- `client/src/components/games/MatchGame.jsx`
- `client/src/components/games/QuizGame.jsx`
- `client/src/components/games/TypeGame.jsx`
- `client/src/components/games/BubblePopGame.jsx`
- `client/src/utils/shuffleArray.js`
- `client/src/utils/confetti.js`
- `client/vite.config.js`
- `client/tailwind.config.js`

### Canonical Implementations
- Prisma data model: `prisma/schema.prisma`
- PrismaClient singleton: `server/src/db.js`
- Passport/session setup: `server/src/auth.js`
- Auth state + Google sign-in: `client/src/context/AuthContext.jsx`
- Word set CRUD: `client/src/hooks/useSets.js`
- Class CRUD: `client/src/hooks/useClasses.js`
- Study log read/write: `client/src/hooks/useStudyLogs.js`
- Game result save/read: `client/src/hooks/useGameResults.js`
- Array shuffle: `client/src/utils/shuffleArray.js`
- Confetti animation: `client/src/utils/confetti.js`
- Study session timer + auto-log: `client/src/components/StudyMenu.jsx`

---

## [2026-04-22] - Role System + Google Classroom Import

### Changes
- Schema: added `admin` to Role enum; added GoogleToken, ClassroomSync, ClassroomStudentMapping models; schema pushed with `db push`
- Removed syncUsers.js (Google Sheet sync); cleaned up server/src/index.js (removed import/call, added usersRoutes + classroomRoutes)
- auth.js: dropped path-3 (unknown user creation); unknown OAuth users now silently blocked with `done(null, false)`
- middleware/requireAuth.js: added `requireAdmin`; `requireTeacher` now also passes `admin` role
- New server/src/routes/users.js: admin-only CRUD — GET/POST/PUT /api/users
- New server/src/google/classroom.js: Classroom API wrappers — getAuthUrl, exchangeCode, listCourses, listStudents
- New server/src/google/sync.js: syncCourse() — upserts ClassroomSync + Class, imports students as active Users with ClassMember enrollments
- New server/src/routes/classroom.js: GET /status, /connect, /callback, /courses; POST /sync/:courseId
- New prisma/seed.js: seeds first admin via SEED_ADMIN_EMAIL env var; package.json got db:seed script
- client/src/App.jsx: added /admin and /teacher/classroom routes with role-gated PrivateRoute
- client/src/pages/LoginPage.jsx: updated error message for unknown accounts
- client/src/components/Layout.jsx: admin role badge (rose/ShieldCheck); ROLE_STYLES map
- New client/src/hooks/useUsers.js: admin user management hook (calls /api/users)
- New client/src/pages/AdminDashboard.jsx: full user management UI (list, add, toggle active, change role)
- New client/src/pages/ClassroomImport.jsx: connect flow + course list + sync/re-sync UI
- client/src/pages/TeacherDashboard.jsx: added "Import from Google Classroom" button
- .env + .env.example: added CLASSROOM_REDIRECT_URI; removed sheet vars from example

### Files Affected
- `prisma/schema.prisma`
- `prisma/seed.js`
- `server/src/index.js`
- `server/src/auth.js`
- `server/src/middleware/requireAuth.js`
- `server/src/routes/users.js`
- `server/src/routes/classroom.js`
- `server/src/google/classroom.js`
- `server/src/google/sync.js`
- `client/src/App.jsx`
- `client/src/components/Layout.jsx`
- `client/src/hooks/useUsers.js`
- `client/src/pages/AdminDashboard.jsx`
- `client/src/pages/ClassroomImport.jsx`
- `client/src/pages/TeacherDashboard.jsx`
- `client/src/pages/LoginPage.jsx`
- `.env`
- `.env.example`

### Canonical Implementations
- Admin user CRUD: `server/src/routes/users.js` (requireAdmin)
- Classroom OAuth + sync trigger: `server/src/routes/classroom.js`
- Classroom API wrappers: `server/src/google/classroom.js`
- Course sync logic: `server/src/google/sync.js:syncCourse`
- Admin dashboard UI: `client/src/pages/AdminDashboard.jsx`
- Classroom import UI: `client/src/pages/ClassroomImport.jsx`
- Admin user hook: `client/src/hooks/useUsers.js`

### Key Decisions
- requireTeacher passes admin role — admins inherit all teacher permissions
- Unknown OAuth users: silently blocked, no DB record created
- Classroom OAuth reuses GOOGLE_CLIENT_ID/SECRET; separate CLASSROOM_REDIRECT_URI env var
- Students imported pre-activated (active=true), googleId null until first sign-in
- Seed script: `SEED_ADMIN_EMAIL=email npm run db:seed` promotes or creates admin

---
