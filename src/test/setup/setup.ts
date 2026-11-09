import { sql } from 'drizzle-orm'
import { execSync } from 'node:child_process'
import db from '../../db/connection.ts'
import { users, habits, entries, tags, habitTags } from '../../db/schema.ts'
import { env } from '../../../env.ts'

// Every table in schema.ts. CASCADE handles foreign keys, so order doesn't matter.
const tables = [entries, habitTags, habits, tags, users]

const dropAllTables = async () => {
  for (const table of tables) {
    await db.execute(sql`DROP TABLE IF EXISTS ${table} CASCADE`)
  }
}

// Vitest globalSetup: runs once before all test files; the returned function
// runs once after all of them.
export default async function setup() {
  // This wipes the database. If tests were ever started without APP_STAGE=test,
  // env.ts would load .env (your dev DB), so refuse instead.
  if (env.APP_STAGE !== 'test') {
    throw new Error(`Refusing to reset the DB: APP_STAGE is "${env.APP_STAGE}", expected "test"`)
  }

  console.log('Setting up the test db')
  await dropAllTables()

  execSync('pnpm exec drizzle-kit push --force', {
    stdio: 'inherit',
    env: { ...process.env, APP_STAGE: 'test' },
  })
  console.log('Test DB ready')

  return async () => {
    await dropAllTables()
    // Close the pool so the process can exit on its own (no process.exit needed).
    await db.$client.end()
  }
}
