import {drizzle} from 'drizzle-orm/node-postgres'
import {Pool} from 'pg'
import * as schema from './schema.ts'
import {env, isProd} from '../../env.ts'
import {remember} from '@epic-web/remember'

const createPool = () => {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    // Fail fast instead of hanging if the database is unreachable
    connectionTimeoutMillis: 10_000,
  })

  // Idle connections can be dropped by the server (Neon does this). Without a
  // listener, that 'error' event is unhandled and crashes the whole process.
  pool.on('error', (err) => {
    console.error('Unexpected database pool error', err)
  })

  return pool
}

let client: Pool

if(isProd()) {
  client = createPool()
} else {
  client = remember('dbPool', () => createPool())
}

export const db = drizzle({client, schema})

export default db
