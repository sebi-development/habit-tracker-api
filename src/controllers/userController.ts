import type { Response } from 'express'
import type { AuthenticatedRequest } from '../middleware/auth.ts'
import db from '../db/connection.ts'
import {
  users,
  type ListUsersQuery,
  type UpdateUserInput,
  type UserParams,
} from '../db/schema.ts'
import { count, eq } from 'drizzle-orm'
import { AppError } from '../utils/errors.ts'

// What anyone logged in may see about a user.
const publicColumns = {
  id: users.id,
  username: users.username,
  createdAt: users.createdAt,
} as const

// What a user sees about themselves. The password hash is never selected.
const profileColumns = {
  ...publicColumns,
  email: users.email,
  firstName: users.firstName,
  lastName: users.lastName,
  updatedAt: users.updatedAt,
} as const

export const listUsers = async (req: AuthenticatedRequest, res: Response) => {
  // Express types req.query as loose strings and can't know validateQuery has
  // already replaced it with the coerced, defaulted ListUsersQuery.
  const { limit, offset } = req.query as unknown as ListUsersQuery

  const [list, [{ total }]] = await Promise.all([
    db.select(publicColumns).from(users).orderBy(users.username).limit(limit).offset(offset),
    db.select({ total: count() }).from(users),
  ])

  res.json({
    users: list,
    pagination: { limit, offset, total }
  })
}

export const getUser = async (
  req: AuthenticatedRequest<UserParams>,
  res: Response
) => {
  const { id } = req.params
  const isSelf = id === req.user!.id

  const [user] = await db
    .select(isSelf ? profileColumns : publicColumns)
    .from(users)
    .where(eq(users.id, id))

  if (!user) throw new AppError(404, 'User not found')

  res.json({ user })
}

export const updateUser = async (
  req: AuthenticatedRequest<UserParams, any, UpdateUserInput>,
  res: Response
) => {
  const { id } = req.params

  if (id !== req.user!.id) {
    throw new AppError(403, 'You can only update your own profile')
  }

  // Taken email/username (unique violation) becomes a 409 in errorHandler.
  const [user] = await db
    .update(users)
    .set({ ...req.body, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning(profileColumns)

  // The token can outlive the account
  if (!user) throw new AppError(404, 'User not found')

  res.json({
    message: 'Profile updated',
    user
  })
}
