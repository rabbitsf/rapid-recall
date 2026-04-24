# Rapid Recall

A full-stack vocabulary study app for K–8 classrooms. Teachers create word sets, share them with classes, and track student progress. Students study through five game modes with audio, images, and AI-generated hints.

---

## Features

### For Teachers
- Create and manage classes; add students individually or in bulk (creates accounts on the fly)
- Import classes and students from Google Classroom
- Build word sets manually or by CSV import; attach images per card (upload or AI-powered Pexels search)
- Share sets with one or more classes
- View per-student study time and game scores
- Spanish-language flag per set (switches TTS to `es-ES`)

### For Students
- Five game modes: Flashcards, Match, Quiz, Type, Bubble Pop, and Applications (fill-in-the-blank)
- AI hints, example sentences, and images per card
- Weekly study calendar and per-set progress tracking

### For Admins
- Manage all user accounts: add, deactivate/reactivate, assign grade groups (K–8), delete
- Bulk add users via CSV-style modal (`email, Display Name, role` per line)
- Connect the school's shared Google Classroom OAuth token for all teachers

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React + Tailwind CSS + Lucide icons |
| Backend | Node.js + Express |
| Database | PostgreSQL via Prisma ORM |
| Auth | Google OAuth 2.0 (passport-google-oauth20 + express-session) |
| Session store | connect-pg-simple |
| AI | OpenAI gpt-4o-mini (hints, sentences) + Pexels API (images) |
| Production | Ubuntu 22, Apache reverse proxy, PM2, Let's Encrypt SSL |

---

## Project Structure

```
quizlet/
  prisma/
    schema.prisma        — data model
    migrations/          — committed migration files
    seed.js              — seeds first admin account
  server/
    src/
      index.js           — Express entry point
      db.js              — PrismaClient singleton
      auth.js            — Passport strategy + session
      middleware/
        requireAuth.js   — requireAuth / requireTeacher / requireAdmin
      routes/            — API route handlers
      google/
        classroom.js     — Google Classroom API wrappers
        sync.js          — syncCourse() upsert logic
  client/
    src/
      App.jsx            — router + AuthProvider
      context/
        AuthContext.jsx  — auth state, sign-in, sign-out
      hooks/             — REST hooks (useSets, useClasses, etc.)
      pages/             — page components
      components/        — Layout, StudyMenu, games/
```

---

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL (create a database named `rapid_recall`)
- A Google Cloud project with OAuth credentials and the Classroom API enabled

### 1. Clone and install

```bash
git clone git@github.com:rabbitsf/rapid-recall.git
cd rapid-recall
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 2. Configure environment

Create `server/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/rapid_recall"
SESSION_SECRET="at-least-32-random-characters"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
CALLBACK_URL="http://localhost:5173/auth/google/callback"
OPENAI_API_KEY="sk-..."
PEXELS_API_KEY="your-pexels-key"
```

### 3. Set up the database

```bash
# From repo root
npx prisma migrate deploy --schema prisma/schema.prisma
npx prisma generate --schema prisma/schema.prisma

# Seed the first admin account
SEED_ADMIN_EMAIL=you@school.org node prisma/seed.js
```

### 4. Start dev servers

```bash
# Terminal 1 — backend (port 3001)
cd server && npm run dev

# Terminal 2 — frontend (port 5173, proxies /api/* to :3001)
cd client && npm run dev
```

Open http://localhost:5173.

### 5. Promote a user to teacher

After signing in at least once, run:

```sql
UPDATE users SET role = 'teacher' WHERE email = 'teacher@school.org';
```

---

## Production Deployment

The app runs on Ubuntu 22 behind Apache with PM2.

### Full deploy (after a git push)

```bash
cd /var/www/rapid-recall
git pull
cd client && npm run build && cd ..
pm2 restart rapid-recall
```

### First-time server setup

1. Install Node 18+, PostgreSQL, Apache, PM2, Certbot.
2. Clone the repo to `/var/www/rapid-recall`.
3. Create `server/.env` with production values.
4. Run migrations: `npx prisma migrate deploy --schema prisma/schema.prisma`
5. Build the client: `cd client && npm run build`
6. Start with PM2: `pm2 start server/src/index.js --name rapid-recall`
7. Configure Apache to proxy `/api/`, `/auth/`, and `/uploads/` to Node, and serve `client/dist/` as the document root.

### Required Apache proxy rules

```apache
ProxyPass /api/ http://localhost:3001/api/
ProxyPassReverse /api/ http://localhost:3001/api/
ProxyPass /auth/ http://localhost:3001/auth/
ProxyPassReverse /auth/ http://localhost:3001/auth/
ProxyPass /uploads/ http://localhost:3001/uploads/
ProxyPassReverse /uploads/ http://localhost:3001/uploads/
```

> **Note:** The `/uploads/` proxy is not in any config file in this repo — it must be added manually to the Apache vhost on each server.

### Schema changes on production

```bash
# On the production server, from repo root
npx prisma migrate deploy --schema prisma/schema.prisma
pm2 restart rapid-recall
```

Never run `prisma db push` on production.

---

## Google Classroom Integration

1. An admin visits the Classroom Import page and clicks **Connect as Admin**.
2. This completes a one-time OAuth flow storing the school's token server-side.
3. All teachers can then import their courses without individual OAuth.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Min 32 chars — server exits on startup if too short |
| `GOOGLE_CLIENT_ID` | Yes | OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | OAuth 2.0 client secret |
| `CALLBACK_URL` | Yes | OAuth callback URL |
| `OPENAI_API_KEY` | Yes | gpt-4o-mini for hints and sentences |
| `PEXELS_API_KEY` | Yes | Image search for cards |
| `SEED_ADMIN_EMAIL` | Seed only | Email of the first admin account |

---

## License

MIT License — see [LICENSE](LICENSE).
