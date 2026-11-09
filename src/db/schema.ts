import { pgTable, uuid, varchar, timestamp, text, boolean, integer } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 50 }),
  lastName: varchar('last_name', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export const habits = pgTable('habits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  frequency: varchar('frequency', { length: 20 }).notNull(),
  targetCount: integer('target_count').default(1),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export const entries = pgTable('entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  habitId: uuid('habit_id').references(() => habits.id, {
    onDelete: 'cascade'
  }).notNull(),
  completionDate: timestamp('completion_date').defaultNow().notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  color: varchar('color', { length: 7 }).default('#6b7280'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export const habitTags = pgTable('habit_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  habitId: uuid('habit_id').references(() => habits.id, {
    onDelete: 'cascade'
  }).notNull(),
  tagId: uuid('tag_id').references(() => tags.id, {
    onDelete: 'cascade'
  }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const userRelations = relations(users, ({ many }) => ({
  habits: many(habits),
}))

export const habitsRelations = relations(habits, ({ one, many }) => ({
  user: one(users, {
    fields: [habits.userId],
    references: [users.id],
  }),
  entries: many(entries),
  habitTags: many(habitTags)
}))

export const entriesRelations = relations(entries, ({ one }) => ({
  habit: one(habits, {
    fields: [entries.habitId],
    references: [habits.id]
  }),
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  habitTags: many(habitTags),
}))

export const habitTagsRelations = relations(habitTags, ({ one }) => ({
  habit: one(habits, {
    fields: [habitTags.habitId],
    references: [habits.id]
  }),
  tag: one(tags, {
    fields: [habitTags.tagId],
    references: [tags.id]
  }),
}))

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Habit = typeof habits.$inferSelect
export type NewHabit = typeof habits.$inferInsert
export type Entries = typeof entries.$inferSelect
export type Tag = typeof tags.$inferSelect
export type HabitTag = typeof habitTags.$inferSelect


// Only the fields a client may send; id/timestamps are set by the db.
export const insertUserSchema = z.object({
  email: z.email().max(255),
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(72), // bcrypt ignores bytes past 72
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
})
export type RegisterInput = z.infer<typeof insertUserSchema>
export const selectUserSchema = createSelectSchema(users)

// Login: (email OR username) + password. No length rules on the password here;
// those are for choosing one, not for checking one.
const password = z.string().min(1, 'Password is required')
export const loginSchema = z.union([
  z.object({ email: z.email('Invalid email'), password }),
  z.object({ username: z.string().min(1, 'Username is required'), password }),
])
export type LoginInput = z.infer<typeof loginSchema>
// = { email: string; password: string } | { username: string; password: string }

// ---- Habits ----
export const createHabitSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(1000).optional(),
  frequency: z.string().trim().min(1).max(20),
  targetCount: z.number().int().positive().optional(),
  tagIds: z.array(z.uuid()).optional(),
})
export type CreateHabitInput = z.infer<typeof createHabitSchema>

// Every field optional (PATCH), but an empty body is rejected.
export const updateHabitSchema = createHabitSchema
  .extend({ isActive: z.boolean().optional() })
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'Provide at least one field to update')
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>

export const habitParamsSchema = z.object({ id: z.uuid('Invalid habit id') })
export type HabitParams = z.infer<typeof habitParamsSchema>
