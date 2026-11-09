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

    // Hand the controller zod's output instead of the raw input: unknown keys
    // stripped, values trimmed/coerced, defaults applied.
    if (source === 'query') {
      // `req.query` is a getter in Express 5 and can't be assigned, but an own
      // property on the request overrides it.
      Object.defineProperty(req, 'query', { value: result.data, writable: true, configurable: true, enumerable: true })
    } else {
      req[source] = result.data
    }
    next()
  }

export const validateBody = validate('body')
export const validateParams = validate('params')
export const validateQuery = validate('query')
