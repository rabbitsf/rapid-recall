import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import passport from './auth.js'

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.error('FATAL: SESSION_SECRET must be at least 32 characters')
  process.exit(1)
}

import authRoutes from './routes/auth.js'
import setsRoutes from './routes/sets.js'
import classesRoutes from './routes/classes.js'
import studyLogsRoutes from './routes/studyLogs.js'
import gameResultsRoutes from './routes/gameResults.js'
import progressRoutes from './routes/progress.js'
import usersRoutes from './routes/users.js'
import classroomRoutes from './routes/classroom.js'
import aiRoutes from './routes/ai.js'

const app = express()
app.set('trust proxy', 1) // required when running behind Apache/nginx reverse proxy
const PgSession = connectPgSimple(session)

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'https://hamlin.org', 'https://lh3.googleusercontent.com', 'https://images.pexels.com', 'data:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}))
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.json())

app.use(session({
  store: new PgSession({ conString: process.env.DATABASE_URL, tableName: 'sessions', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
}))

app.use(passport.initialize())
app.use(passport.session())

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false })
const apiLimiter  = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false })

app.use('/auth', authLimiter, authRoutes)
app.use('/api/sets', apiLimiter, setsRoutes)
app.use('/api/classes', apiLimiter, classesRoutes)
app.use('/api/study-logs', apiLimiter, studyLogsRoutes)
app.use('/api/game-results', apiLimiter, gameResultsRoutes)
app.use('/api/progress', apiLimiter, progressRoutes)
app.use('/api/users', apiLimiter, usersRoutes)
app.use('/api/classroom', apiLimiter, classroomRoutes)
app.use('/api/ai', apiLimiter, aiRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
