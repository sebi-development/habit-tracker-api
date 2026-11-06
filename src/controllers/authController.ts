import type { Request, Response } from 'express'
import db from '../db/connection.ts'
import { users, type NewUser, type User } from '../db/schema.ts'
import { generateToken } from '../utils/jwt.ts'
import { hashPassword } from '../utils/passwords.ts'

export const register = async (req: Request<any, any, NewUser>, res: Response) => {
  try {
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

    return res.status(201).json({
      status: 'success',
      message: 'Registration successful',
      user,
      token
    })

  } catch (e: any) {
    if ((e?.cause?.code ?? e?.code) === '23505') {
      return res.status(409).json({ error: 'Email or username already in use' })
    }
    console.error('Registration error', e);
    res.status(500).json({ error: 'Failed to create user' })
  }
}

export const login = (req: Request<any, any, User>, res: Response) => {

}