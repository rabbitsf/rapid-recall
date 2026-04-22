# Rapid Recall — Full-Stack Build Plan
# Progress: 7/7 tasks complete. DONE.
# Last updated: 2026-04-22
# Project: quizlet (Rapid Recall)

## Tech Stack
- Frontend: React + Vite + Tailwind CSS + Lucide React
- Backend: Node.js + Express
- Database: PostgreSQL (Homebrew, v18)
- ORM: Prisma (schema + migrations)
- Auth: Google OAuth 2.0 via passport-google-oauth20 + express-session
- Session store: connect-pg-simple (sessions in PostgreSQL)

## Data Model (PostgreSQL)
- users: id, google_id, email, display_name, photo_url, role('teacher'|'student'), created_at
- classes: id, name, teacher_id(FK users), created_at
- class_members: class_id(FK), student_id(FK), joined_at — PK(class_id, student_id)
- word_sets: id, title, owner_id(FK users), is_public, created_at
- cards: id, set_id(FK), term, definition, position
- set_class_shares: set_id(FK), class_id(FK) — PK(set_id, class_id)
- study_logs: id, user_id(FK), date(DATE), minutes — UNIQUE(user_id, date)
- game_results: id, user_id(FK), set_id(FK), game, score, total, time_spent(s), completed_at

## Tasks
- [x] Phase 1: Project scaffold (Vite + React, Express server, Prisma + PostgreSQL, Tailwind)
- [x] Phase 2: Auth (Google OAuth 2.0, passport, sessions, user creation in DB)
- [x] Phase 3: API routes + Prisma data layer (sets, classes, logs, game results)
- [x] Phase 4: Teacher features (class management, word set upload+sharing, student progress dashboard)
- [x] Phase 5: Student features (own word sets, class sets access, game results tracking)
- [x] Phase 6: Port game modes from prototype (all 5 games + study time auto-logging)
- [x] Phase 7: Polish (routing, responsive, production security hardening)

---

## Phase 1: Project Scaffold

**Goal:** Monorepo with client/ (Vite React) and server/ (Express), Prisma connected to local PostgreSQL, Tailwind working, both servers running.

**Files:**
- package.json (root — workspace scripts)
- client/ — Vite React app
- server/ — Express app
- prisma/schema.prisma — full data model
- .env.example
- .gitignore

---

## Phase 2: Auth — Google OAuth + Sessions

**Goal:** Users sign in with Google; session persists via PostgreSQL. First-time users auto-created with role 'student'.

**Files:**
- server/src/auth.js — passport strategy + session setup
- server/src/routes/auth.js — /auth/google, /auth/google/callback, /auth/me, /auth/logout
- client/src/context/AuthContext.jsx — fetch /auth/me on load
- client/src/pages/LoginPage.jsx — Google sign-in button

---

## Phase 3: API Routes + Data Layer

**Goal:** All Firestore replaced with Express REST endpoints backed by Prisma/PostgreSQL.

**Server routes:**
- GET/POST/PUT/DELETE /api/sets
- GET/POST /api/classes, POST /api/classes/:id/members, POST /api/classes/:id/shares
- GET/PUT /api/study-logs/:date
- POST /api/game-results
- GET /api/progress/class/:classId (teacher only)

**Client hooks:**
- src/hooks/useSets.js
- src/hooks/useClasses.js
- src/hooks/useStudyLogs.js
- src/hooks/useGameResults.js

---

## Phase 4: Teacher Features

**Files:**
- client/src/pages/TeacherDashboard.jsx
- client/src/pages/ClassManager.jsx
- client/src/pages/StudentProgress.jsx
- client/src/components/SetUploader.jsx
- client/src/components/ClassSelector.jsx

---

## Phase 5: Student Features

**Files:**
- client/src/pages/StudentDashboard.jsx
- client/src/components/MySets.jsx
- client/src/components/ClassSets.jsx
- client/src/components/StudyCalendar.jsx

---

## Phase 6: Port Game Modes

**Files:**
- client/src/components/games/FlashcardsMode.jsx
- client/src/components/games/MatchGame.jsx
- client/src/components/games/QuizGame.jsx
- client/src/components/games/TypeGame.jsx
- client/src/components/games/BubblePopGame.jsx
- client/src/components/StudyMenu.jsx
- client/src/pages/SetEditor.jsx
- client/src/utils/shuffleArray.js
- client/src/utils/confetti.js

---

## Phase 7: Polish

**Files:**
- client/src/components/Layout.jsx (nav bar)
- client/src/App.jsx (finalize routes)
- Responsive audit all pages
- Production hardening (CORS, helmet, rate limiting)
