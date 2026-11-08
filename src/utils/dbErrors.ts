// Postgres error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
export const PG_UNIQUE_VIOLATION = '23505'
export const PG_FOREIGN_KEY_VIOLATION = '23503'

export interface PgErrorInfo {
  code: string
  constraint?: string
}

// Drizzle wraps the pg error, so the details can sit on `cause`.
export const getPgError = (e: unknown): PgErrorInfo | undefined => {
  if (typeof e !== 'object' || e === null) return undefined
  type Raw = { code?: string; constraint?: string }
  const err = e as Raw & { cause?: Raw }
  const source = err.cause?.code ? err.cause : err
  if (!source.code) return undefined
  return { code: source.code, constraint: source.constraint }
}
