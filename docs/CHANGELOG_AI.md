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

## [2026-04-22] - Simplified Classroom Integration (Shared Admin Token)

### Changes
- server/src/google/classroom.js: replaced per-user `getAuthedClient(userId)` with `getAdminClient()` (shared admin token); added `getAdminConnectionStatus()` helper; `listCourses()` and `listStudents(courseId)` both use shared admin token
- server/src/google/sync.js: `listStudents(courseId)` call — removed userId arg to match new signature
- server/src/routes/classroom.js: `/connect` and `/disconnect` require `requireAdmin`; `/status`, `/courses`, `/sync/:courseId` require `requireTeacher`; all Classroom API calls use shared admin token
- client/src/pages/ClassroomImport.jsx: Connect/Disconnect buttons shown to admins only; teachers see "ask admin to set up" message; connection banner shows "Connected via [admin name]"

### Files Affected
- `server/src/google/classroom.js`
- `server/src/google/sync.js`
- `server/src/routes/classroom.js`
- `client/src/pages/ClassroomImport.jsx`

### Canonical Implementations
- Classroom API (shared admin token): `server/src/google/classroom.js:getAdminClient`
- Classroom admin connection status: `server/src/google/classroom.js:getAdminConnectionStatus`

### Key Decisions
- Google Classroom token: one shared admin connection per school; connect/disconnect is admin-only; teachers can still import courses

---

## [2026-04-22] - Initial Commit, GitHub Push, Production Deployment, Security Hardening, and Rebrand

### Changes

**Initial commit + GitHub**
- Initialized git repo; 64-file first commit pushed to git@github.com:rabbitsf/rapid-recall.git

**Production deployment (Ubuntu 22 / Apache / PM2)**
- PostgreSQL setup with dedicated `rapidrecall` system user and database
- PM2 process management; Apache VirtualHost as reverse proxy
- Let's Encrypt SSL via Certbot (`rapid-recall.hamlin.org`)
- Seed script run on server to promote first admin via `SEED_ADMIN_EMAIL`

**Bug fixes during deployment**
- `prisma/seed.js`: added `require('dotenv').config()` — plain `node` does not auto-load .env the way Prisma CLI does
- Added migration `20260422200000_add_admin_role_and_classroom_tables` to capture schema changes (admin Role value, google_tokens, classroom_syncs, classroom_student_mappings tables) that had only been applied via `db push` on dev; migration applied on prod with `prisma migrate deploy`
- `server/src/index.js`: added `app.set('trust proxy', 1)` — required for secure session cookies behind Apache reverse proxy
- Apache VirtualHost: added `RequestHeader set X-Forwarded-Proto "https"` — required for Express to detect HTTPS via `req.secure`
- Google Cloud Console: added production redirect URIs for OAuth login and Classroom OAuth

**Login page redesign (Hamlin style)**
- `client/src/pages/LoginPage.jsx`: dark red radial gradient background, white card, gold accent bar, Hamlin school logo, crimson sign-in button

**Full site theme rebrand (Hamlin crimson/gold)**
- `client/tailwind.config.js`: added `crimson` and `gold` color scales
- Global color replace across all 16 JSX files: indigo → crimson, purple → gold
- `client/src/components/Layout.jsx`: dark crimson header bar (`#8B1A1A`), crimson-to-gold gradient accent line, Hamlin logo (brightness-0 invert = white), white nav text and controls

**Security hardening**
- `server/src/index.js`: bound Express to `127.0.0.1` only (port 3004 no longer internet-accessible)
- Added `express-rate-limit`: auth routes 20 req/15 min, API routes 100 req/15 min
- Helmet CSP enabled (was disabled): `script-src 'self'`, `style-src 'unsafe-inline'`, img-src whitelisted domains, `frameAncestors 'none'`
- HSTS enabled via Helmet
- SESSION_SECRET length check at startup — server exits if secret is < 32 characters
- `server/src/routes/gameResults.js`: POST validates that the requested set is accessible to the requesting user
- Input length limits added: card term ≤ 500 chars, definition ≤ 2000 chars, set title ≤ 200 chars, class name ≤ 200 chars; card type validation; max 500 cards per set
- Apache security headers: `X-Frame-Options DENY`, `X-Content-Type-Options nosniff`, `Referrer-Policy`, `Permissions-Policy`, CSP
- UFW firewall: ports 80/443/22 open; port 3004 blocked

**iPad / touch fixes**
- `client/index.html`: removed `user-scalable=no, maximum-scale=1.0` from viewport meta (restores pinch-zoom on iPad)
- All JSX pages: removed `lg:opacity-0 lg:group-hover:opacity-100` pattern on edit/delete buttons (hover-only pattern unreachable on touch screens)

### Files Affected
- `prisma/seed.js`
- `prisma/migrations/20260422200000_add_admin_role_and_classroom_tables/migration.sql`
- `server/src/index.js`
- `server/src/routes/gameResults.js`
- `server/src/routes/sets.js`
- `server/src/routes/classes.js`
- `client/index.html`
- `client/tailwind.config.js`
- `client/src/pages/LoginPage.jsx`
- `client/src/pages/TeacherDashboard.jsx`
- `client/src/pages/StudentDashboard.jsx`
- `client/src/pages/ClassManager.jsx`
- `client/src/pages/StudentProgress.jsx`
- `client/src/pages/SetEditor.jsx`
- `client/src/pages/AdminDashboard.jsx`
- `client/src/pages/ClassroomImport.jsx`
- `client/src/components/Layout.jsx`
- `client/src/components/StudyCalendar.jsx`
- `client/src/components/StudyMenu.jsx`
- `client/src/components/games/FlashcardsMode.jsx`
- `client/src/components/games/MatchGame.jsx`
- `client/src/components/games/QuizGame.jsx`
- `client/src/components/games/TypeGame.jsx`
- `client/src/components/games/BubblePopGame.jsx`
- Apache VirtualHost config (server-side, not in repo)

### Canonical Implementations
- Express entry point + security config: `server/src/index.js` (trust proxy, rate limiters, Helmet CSP, HSTS, 127.0.0.1 binding)
- Login page visual design: `client/src/pages/LoginPage.jsx`
- Site-wide color theme: `client/tailwind.config.js` (crimson + gold scales)
- Global nav bar design: `client/src/components/Layout.jsx`

### Key Decisions
- Production server binds to 127.0.0.1 only; Apache proxies public traffic
- `trust proxy 1` required when running behind Apache; omitting it breaks secure cookies
- Migration file created retroactively to capture `db push` schema changes; `prisma migrate deploy` used on prod (never `db push` on production)
- Hamlin branding colors defined once in tailwind.config.js `extend.colors`; all UI uses Tailwind classes, never inline hex except Layout header `style=` override
- iPad compatibility: never use hover-only Tailwind patterns (`lg:opacity-0 lg:group-hover:opacity-100`) for interactive buttons

---

## [2026-04-23] - Image Upload Debugging (Production Fixes)

### Changes
- `client/src/pages/SetEditor.jsx`: changed bulk-import temp card ID separator from `-` to `_` (dash triggered the unsaved-card detection check, bypassing auto-save before upload); replaced `pendingUploadCardId` state + useEffect with `flushSync(() => setCards(savedSet.cards))` to guarantee refs exist before clicking file input
- `server/src/routes/uploads.js`: wrapped `upload.single` in custom middleware to catch `MulterError` with code `LIMIT_FILE_SIZE` and return 400 instead of propagating to generic 500 handler
- Apache VirtualHost (production only, not in git): added `ProxyPass /uploads/ http://localhost:3004/uploads/` and `ProxyPassReverse` — without this Apache served /uploads/ from client/dist/ and all uploaded thumbnails 404'd

### Files Affected
- `client/src/pages/SetEditor.jsx`
- `server/src/routes/uploads.js`
- Apache VirtualHost config (production server only, not in repo)

### Canonical Implementations
- Per-card image upload (multer + LIMIT_FILE_SIZE → 400): `server/src/routes/uploads.js`
- Uploaded image serving (/uploads/ static + Apache proxy): `server/src/index.js`
- Spanish TTS flag (isSpanish → es-ES): `client/src/components/games/FlashcardsMode.jsx:speakTerm`

### Key Decisions
- Unsaved card detection: `card.id.includes('-')` is the guard — temp IDs MUST use `_` separator, never `-`
- Apache /uploads/ proxy is NOT in git; must be manually added to vhost on every new server deployment
- flushSync required when reading DOM refs immediately after a React state update (file input .click())
- MulterError LIMIT_FILE_SIZE must be caught in route middleware, not the global error handler, to return 400

---
