import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import helmet from 'helmet'
import cors from 'cors'
import passport from './auth.js'

import authRoutes from './routes/auth.js'
import setsRoutes from './routes/sets.js'
import classesRoutes from './routes/classes.js'
import studyLogsRoutes from './routes/studyLogs.js'
import gameResultsRoutes from './routes/gameResults.js'
import progressRoutes from './routes/progress.js'
import usersRoutes from './routes/users.js'
import classroomRoutes from './routes/classroom.js'

const app = express()
const PgSession = connectPgSimple(session)

app.use(helmet({ contentSecurityPolicy: false }))
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

app.use('/auth', authRoutes)
app.use('/api/sets', setsRoutes)
app.use('/api/classes', classesRoutes)
app.use('/api/study-logs', studyLogsRoutes)
app.use('/api/game-results', gameResultsRoutes)
app.use('/api/progress', progressRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/classroom', classroomRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
