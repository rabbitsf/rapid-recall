import { PrismaClient } from '../server/node_modules/.prisma/client/index.js'

const prisma = new PrismaClient()

const ADMIN_EMAIL = process.env.ADMIN_EMAIL
if (!ADMIN_EMAIL) {
  console.error('Set ADMIN_EMAIL env var before running seed. Example:')
  console.error('  ADMIN_EMAIL=you@school.edu npm run db:seed')
  process.exit(1)
}

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } })
  if (existing) {
    await prisma.user.update({ where: { email: ADMIN_EMAIL }, data: { role: 'admin', active: true } })
    console.log(`Updated existing user ${ADMIN_EMAIL} → admin`)
  } else {
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        displayName: ADMIN_EMAIL.split('@')[0],
        role: 'admin',
        active: true,
      },
    })
    console.log(`Created admin account for ${ADMIN_EMAIL}`)
  }
  console.log('Sign in with Google using that email to activate the account.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
