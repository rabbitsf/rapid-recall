import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load .env from server/ regardless of where PM2 starts the process from
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env'), override: true })
