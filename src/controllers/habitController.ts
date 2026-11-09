import type { Response } from 'express'
import type { AuthenticatedRequest } from '../middleware/auth.ts'
import db from '../db/connection.ts'
import {
  habits,
  habitTags,
  entries,
  type CreateHabitInput,
  type UpdateHabitInput,
  type CompleteHabitInput,
  type HabitParams,
} from '../db/schema.ts'
import { and, desc, eq } from 'drizzle-orm'
import { AppError } from '../utils/errors.ts'


// The same tag sent twice would create two identical habit_tags rows.
const uniqueTagLinks = (habitId: string, tagIds: string[]) =>
  [...new Set(tagIds)].map((tagId) => ({ habitId, tagId }))

// Habits come back from the relational query with `habitTags` join rows; the
// API exposes them as a plain `tags` array instead.
const flattenTags = <T extends { habitTags: { tag: unknown }[] }>(
  { habitTags: links, ...habit }: T
) => ({
  ...habit,
  tags: links.map((link) => link.tag)
})

// Only match habits the authenticated user owns. For anyone else's habit the
// query finds nothing, so callers answer 404 and don't reveal it exists.
const ownedBy = (habitId: string, userId: string) =>
  and(eq(habits.id, habitId), eq(habits.userId, userId))

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

  res.json({
    habits: userHabitsWithTags.map(flattenTags)
  })
}

export const updateHabit = async (
  req: AuthenticatedRequest<HabitParams, any, UpdateHabitInput>,
  res: Response
) => {
  const { id } = req.params
  const { tagIds, ...updates } = req.body

  const habit = await db.transaction(async (tx) => {
    const [updatedHabit] = await tx
      .update(habits)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(ownedBy(id, req.user!.id))
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

export const getHabit = async (
  req: AuthenticatedRequest<HabitParams>,
  res: Response
) => {
  const habit = await db.query.habits.findFirst({
    where: ownedBy(req.params.id, req.user!.id),
    with: {
      habitTags: { with: { tag: true } },
      // Most recent completions only, so the response stays small
      entries: { orderBy: [desc(entries.completionDate)], limit: 30 }
    }
  })

  if (!habit) throw new AppError(404, 'Habit not found')

  res.json({ habit: flattenTags(habit) })
}

export const deleteHabit = async (
  req: AuthenticatedRequest<HabitParams>,
  res: Response
) => {
  // habit_tags and entries are removed by the database (ON DELETE CASCADE)
  const [deleted] = await db
    .delete(habits)
    .where(ownedBy(req.params.id, req.user!.id))
    .returning({ id: habits.id })

  if (!deleted) throw new AppError(404, 'Habit not found')

  res.status(204).send()
}

export const completeHabit = async (
  req: AuthenticatedRequest<HabitParams, any, CompleteHabitInput>,
  res: Response
) => {
  const { id } = req.params

  const habit = await db.query.habits.findFirst({
    where: ownedBy(id, req.user!.id),
    columns: { id: true }
  })

  if (!habit) throw new AppError(404, 'Habit not found')

  const [entry] = await db
    .insert(entries)
    .values({ ...req.body, habitId: id })
    .returning()

  res.status(201).json({
    message: 'Habit completed',
    entry
  })
}
