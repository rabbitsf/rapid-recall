import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const dir = dirname(fileURLToPath(import.meta.url))
// Load root .env first (GOOGLE_CLIENT_ID, DATABASE_URL, SESSION_SECRET, etc.)
dotenv.config({ path: join(dir, '../../.env') })
// Load server/.env second — API keys override root if duplicated
dotenv.config({ path: join(dir, '../.env'), override: true })
