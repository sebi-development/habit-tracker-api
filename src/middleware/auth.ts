import type { Request, Response, NextFunction } from 'express'
import { verifyToken, type JwtPayload } from '../utils/jwt.ts'
import { AppError } from '../utils/errors.ts'

// Same generics as express's Request, so controllers can type params and body:
// AuthenticatedRequest<HabitParams, any, UpdateHabitInput>
export interface AuthenticatedRequest<
  P = Record<string, string>,
  ResBody = any,
  ReqBody = any,
> extends Request<P, ResBody, ReqBody> {
  user?: JwtPayload
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ').at(1)

  if (!token) throw new AppError(401, 'Missing token')

  req.user = await verifyToken(token).catch(() => {
    throw new AppError(403, 'Forbidden')
  })
  next()
}
