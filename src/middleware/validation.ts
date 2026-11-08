import type { Request, Response, NextFunction } from 'express'
import type { ZodType } from 'zod'

type Source = 'body' | 'params' | 'query'

const errorLabels: Record<Source, string> = {
  body: 'Validation failed',
  params: 'Invalid params',
  query: 'Invalid query params',
}

// safeParse returns a result instead of throwing, so no try/catch needed.
const validate = (source: Source) => (schema: ZodType) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source])

    if (!result.success) {
      res.status(400).json({
        error: errorLabels[source],
        details: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      })
      return
    }

    // Replace the body with zod's output: unknown keys stripped, values trimmed.
    // (req.query is read-only in Express 5, so only the body is replaced.)
    if (source === 'body') req.body = result.data
    next()
  }

export const validateBody = validate('body')
export const validateParams = validate('params')
export const validateQuery = validate('query')
