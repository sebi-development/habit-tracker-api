import type { Response } from 'express'
import type { AuthenticatedRequest } from '../middleware/auth.ts'
import db from '../db/connection.ts'
import {
  habits,
  habitTags,
  type CreateHabitInput,
  type UpdateHabitInput,
  type HabitParams,
} from '../db/schema.ts'
import { and, desc, eq } from 'drizzle-orm'
import { AppError } from '../utils/errors.ts'


// The same tag sent twice would create two identical habit_tags rows.
const uniqueTagLinks = (habitId: string, tagIds: string[]) =>
  [...new Set(tagIds)].map((tagId) => ({ habitId, tagId }))

export const createHabit = async (
  req: AuthenticatedRequest<{}, any, CreateHabitInput>,
  res: Response
) => {
  const { tagIds, ...habitData } = req.body

  const habit = await db.transaction(async (tx) => {
    const [newHabit] = await tx.insert(habits).values({
      ...habitData,
      // `!` = "trust me, it's set": authenticateToken runs before this route
      userId: req.user!.id,
    }).returning()

    if (tagIds && tagIds.length > 0) {
      await tx.insert(habitTags).values(uniqueTagLinks(newHabit.id, tagIds))
    }

    return newHabit
  })

  res.status(201).json({
    message: 'Habit created',
    habit
  })
}

export const getUserHabits = async (req: AuthenticatedRequest, res: Response) => {
  const userHabitsWithTags = await db.query.habits.findMany({
    where: eq(habits.userId, req.user!.id),
    with: {
      habitTags: {
        with: {
          tag: true
        }
      }
    },
    orderBy: [desc(habits.createdAt)]
  })

  // Pull `habitTags` out of each habit and keep the rest; the join rows are
  // flattened into a plain `tags` array.
  const habitsWithTags = userHabitsWithTags.map(({ habitTags: links, ...habit }) => ({
    ...habit,
    tags: links.map((link) => link.tag)
  }))

  res.json({
    habits: habitsWithTags
  })
}

export const updateHabit = async (
  req: AuthenticatedRequest<HabitParams, any, UpdateHabitInput>,
  res: Response
) => {
  const { id } = req.params
  const { tagIds, ...updates } = req.body

  const habit = await db.transaction(async (tx) => {
    // Filtering on userId too means you can only update your own habits;
    // someone else's id simply matches nothing.
    const [updatedHabit] = await tx
      .update(habits)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(and(eq(habits.id, id), eq(habits.userId, req.user!.id)))
      .returning()

    // Throwing inside the transaction also rolls it back.
    if (!updatedHabit) throw new AppError(404, 'Habit not found')

    // undefined = leave tags alone, [] = remove all, [...] = replace
    if (tagIds !== undefined) {
      await tx.delete(habitTags).where(eq(habitTags.habitId, id))

      if (tagIds.length > 0) {
        await tx.insert(habitTags).values(uniqueTagLinks(id, tagIds))
      }
    }

    return updatedHabit
  })

  // Respond only after the transaction committed.
  res.json({
    message: 'Habit was updated',
    habit
  })
}
