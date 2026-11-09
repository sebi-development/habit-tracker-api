import type { Request, Response } from 'express'
import { sql } from 'drizzle-orm'
import db from '../db/connection.ts'
import { AppError } from '../utils/errors.ts'

// Liveness: is the process up? No dependencies, so it's cheap enough for a
// platform to poll every few seconds.
export const liveness = (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  })
}

// Readiness: can it actually serve requests, i.e. is the database reachable?
// Kept separate because it wakes up a serverless database (Neon) every time.
export const readiness = async (req: Request, res: Response) => {
  await db.execute(sql`select 1`).catch(() => {
    throw new AppError(503, 'Database unavailable')
  })

  res.json({
    status: 'ok',
    database: 'up',
    timestamp: new Date().toISOString()
  })
}
