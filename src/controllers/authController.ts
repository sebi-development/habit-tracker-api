import type { Request, Response } from 'express'
import db from '../db/connection.ts'
import { users, type RegisterInput, type LoginInput } from '../db/schema.ts'
import { generateToken } from '../utils/jwt.ts'
import { comparePasswords, hashPassword } from '../utils/passwords.ts'
import { AppError } from '../utils/errors.ts'
import { eq } from 'drizzle-orm'

export const register = async (req: Request<any, any, RegisterInput>, res: Response) => {
  const { email, username, password, firstName, lastName } = req.body
  const hashedPassword = await hashPassword(password)

  const [user] = await db.insert(users).values({
    email,
    username,
    firstName,
    lastName,
    password: hashedPassword
  }).returning({
    id: users.id,
    email: users.email,
    username: users.username,
    firstName: users.firstName,
    lastName: users.lastName,
    createdAt: users.createdAt
  })

  const token = await generateToken({
    id: user.id,
    email: user.email,
    username: user.username
  })

  res.status(201).json({
    status: 'success',
    message: 'Registration successful',
    user,
    token
  })
}

export const login = async (req: Request<any, any, LoginInput>, res: Response) => {
  const { password } = req.body
  // `in` narrows the union: in each branch TS knows which field exists
  const user = await db.query.users.findFirst({
    where: 'email' in req.body
      ? eq(users.email, req.body.email)
      : eq(users.username, req.body.username)
  })

  // Same error for "no such user" and "wrong password", so the response
  // doesn't reveal which emails/usernames exist.
  if (!user || !(await comparePasswords(password, user.password))) {
    throw new AppError(401, 'Invalid credentials')
  }

  const token = await generateToken({
    id: user.id,
    email: user.email,
    username: user.username
  })

  res.json({
    message: 'Login success',
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt
    },
    token
  })
}
