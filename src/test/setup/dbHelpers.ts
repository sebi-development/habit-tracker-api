import { randomUUID } from "node:crypto";
import db from "../../db/connection.ts";
import { users, habits, entries, tags, habitTags, type NewUser, type NewHabit } from "../../db/schema.ts";
import { generateToken } from "../../utils/jwt.ts";
import { hashPassword } from "../../utils/passwords.ts"

// Unique per call, so tests never collide on the unique email/username columns.
// (Date.now() + Math.random() could repeat; a UUID can't.)
const uniqueSuffix = () => randomUUID().slice(0, 8)

export const createTestUser = async (userData: Partial<NewUser> = {}) => {
  const suffix = uniqueSuffix()
  const defaultData = {
    email: `test-${suffix}@example.com`,
    username: `test-${suffix}`,
    // Meets the register rules (8+ chars), so it also works for POST /login in tests
    password: 'TestPassword123',
    firstName: 'Test',
    lastName: 'User',
    ...userData
  }

  const hashedPassword = await hashPassword(defaultData.password)
  const [user] = await db
    .insert(users)
    .values({
      ...defaultData,
      password: hashedPassword
    })
    .returning()

  // generateToken is async: without await, `token` would be a Promise
  const token = await generateToken({
    id: user.id,
    email: user.email,
    username: user.username
  })

  // rawPassword = the plain text, because user.password is only the hash
  return { token, user, rawPassword: defaultData.password }
}

// userId is required (a habit belongs to a user); everything else has a default.
export const createTestHabit = async (userId: string, habitData: Partial<NewHabit> = {}) => {
  const defaultData = {
    name: `Test Habit ${uniqueSuffix()}`,
    description: 'A habit created by a test',
    frequency: 'daily',
    targetCount: 1,
    ...habitData
  }

  const [habit] = await db
    .insert(habits)
    .values({
      ...defaultData,
      userId
    })
    .returning()

  return habit
}

// Empties every table but keeps the schema (the global setup creates/drops that).
// Call it in beforeEach/afterEach so tests don't see each other's data.
// Children first, parents last, so foreign keys never block a delete.
export const cleanupDatabase = async () => {
  await db.delete(entries)
  await db.delete(habitTags)
  await db.delete(habits)
  await db.delete(tags)
  await db.delete(users)
}
