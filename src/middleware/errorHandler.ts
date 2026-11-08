import type { ErrorRequestHandler, RequestHandler } from 'express'
import { AppError } from '../utils/errors.ts'
import { getPgError, PG_FOREIGN_KEY_VIOLATION, PG_UNIQUE_VIOLATION } from '../utils/dbErrors.ts'

const constraintMessages: Record<string, string> = {
  users_email_unique: 'Email already in use',
  users_username_unique: 'Username already in use',
  tags_name_unique: 'Tag name already in use',
  habit_tags_tag_id_tags_id_fk: 'One or more tags do not exist',
}

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` })
}

// Express 5 forwards errors thrown in (async) handlers here automatically.
// The 4 parameters are what tells Express this is an error handler.
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err)

  const send = (status: number, error: string) => {
    res.status(status).json({ error })
  }

  if (err instanceof AppError) return send(err.statusCode, err.message)

  // Errors from express.json() (e.g. malformed JSON) carry a safe status.
  if (typeof err?.status === 'number' && err.expose) return send(err.status, err.message)

  const pg = getPgError(err)
  if (pg?.code === PG_UNIQUE_VIOLATION) {
    return send(409, constraintMessages[pg.constraint ?? ''] ?? 'Resource already exists')
  }
  if (pg?.code === PG_FOREIGN_KEY_VIOLATION) {
    return send(400, constraintMessages[pg.constraint ?? ''] ?? 'Referenced resource does not exist')
  }

  // Unexpected: log everything, tell the client nothing internal.
  console.error(`${req.method} ${req.originalUrl} failed:`, err)
  send(500, 'Internal server error')
}
