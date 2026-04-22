import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import prisma from './db.js'

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.SERVER_URL}/auth/google/callback`,
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value?.toLowerCase()
      if (!email) return done(new Error('No email from Google'))

      const profileData = {
        displayName: profile.displayName,
        photoUrl: profile.photos?.[0]?.value ?? null,
      }

      // 1. Returning user — already linked to a Google account
      let user = await prisma.user.findUnique({ where: { googleId: profile.id } })
      if (user) {
        const updateData = { ...profileData }
        // Replace classroom import placeholder email with real Google email on first sign-in
        if (user.email.endsWith('@classroom.import') && email) updateData.email = email
        user = await prisma.user.update({ where: { id: user.id }, data: updateData })
        if (!user.active) return done(null, false)
        return done(null, user)
      }

      // 2. Pre-created by admin or classroom import — link their Google account on first sign-in
      user = await prisma.user.findUnique({ where: { email } })
      if (user) {
        user = await prisma.user.update({ where: { id: user.id }, data: { googleId: profile.id, ...profileData } })
        if (!user.active) return done(null, false)
        return done(null, user)
      }

      // 3. Unknown — not in the system, block silently
      return done(null, false)
    } catch (err) {
      done(err)
    }
  }
))

passport.serializeUser((user, done) => done(null, user.id))

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user?.active) return done(null, false)
    done(null, user)
  } catch (err) {
    done(err)
  }
})

export default passport
