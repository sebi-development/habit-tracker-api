import request from "supertest";
import app from "../server.ts";
import { cleanupDatabase, createTestHabit, createTestUser } from './setup/dbHelpers.ts'

const auth = (token: string) => ({ Authorization: `Bearer ${token}` })
const MISSING_ID = '00000000-0000-0000-0000-000000000000'

describe('Habit Endpoints', () => {
  afterEach(async () => {
    await cleanupDatabase()
  })

  describe('authentication', () => {
    it('should reject requests without a token', async () => {
      const response = await request(app).get('/api/habits').expect(401)
      expect(response.body.error).toBe('Missing token')
    })

    it('should reject an invalid token', async () => {
      await request(app).get('/api/habits').set(auth('garbage')).expect(403)
    })
  })

  describe('GET /api/habits', () => {
    it('should list only the current user\'s habits', async () => {
      const me = await createTestUser()
      const other = await createTestUser()
      await createTestHabit(me.user.id, { name: 'Mine' })
      await createTestHabit(other.user.id, { name: 'Not mine' })

      const response = await request(app).get('/api/habits').set(auth(me.token)).expect(200)

      expect(response.body.habits).toHaveLength(1)
      expect(response.body.habits[0].name).toBe('Mine')
      expect(response.body.habits[0].tags).toEqual([])
      expect(response.body.habits[0]).not.toHaveProperty('habitTags')
    })
  })

  describe('POST /api/habits', () => {
    it('should create a habit owned by the current user', async () => {
      const { token, user } = await createTestUser()

      const response = await request(app)
        .post('/api/habits')
        .set(auth(token))
        .send({ name: 'Read', frequency: 'daily', targetCount: 2 })
        .expect(201)

      expect(response.body.habit).toMatchObject({ name: 'Read', targetCount: 2, userId: user.id })
    })

    it('should ignore a userId sent by the client', async () => {
      const me = await createTestUser()
      const other = await createTestUser()

      const response = await request(app)
        .post('/api/habits')
        .set(auth(me.token))
        .send({ name: 'Read', frequency: 'daily', userId: other.user.id })
        .expect(201)

      expect(response.body.habit.userId).toBe(me.user.id)
    })

    it('should reject invalid data with 400', async () => {
      const { token } = await createTestUser()

      await request(app)
        .post('/api/habits')
        .set(auth(token))
        .send({ name: '', frequency: 'daily', targetCount: 'three' })
        .expect(400)
    })

    it('should reject an unknown tag with 400', async () => {
      const { token } = await createTestUser()

      const response = await request(app)
        .post('/api/habits')
        .set(auth(token))
        .send({ name: 'Read', frequency: 'daily', tagIds: [MISSING_ID] })
        .expect(400)

      expect(response.body.error).toBe('One or more tags do not exist')
    })
  })

  describe('GET /api/habits/:id', () => {
    it('should return the habit with tags and recent entries', async () => {
      const { token, user } = await createTestUser()
      const habit = await createTestHabit(user.id, { name: 'Run' })
      await request(app).post(`/api/habits/${habit.id}/complete`).set(auth(token)).expect(201)

      const response = await request(app).get(`/api/habits/${habit.id}`).set(auth(token)).expect(200)

      expect(response.body.habit.name).toBe('Run')
      expect(response.body.habit.tags).toEqual([])
      expect(response.body.habit.entries).toHaveLength(1)
    })

    it('should return 404 for another user\'s habit', async () => {
      const me = await createTestUser()
      const other = await createTestUser()
      const habit = await createTestHabit(other.user.id)

      await request(app).get(`/api/habits/${habit.id}`).set(auth(me.token)).expect(404)
    })

    it('should return 400 for an id that is not a UUID', async () => {
      const { token } = await createTestUser()
      await request(app).get('/api/habits/abc').set(auth(token)).expect(400)
    })
  })

  describe('PATCH /api/habits/:id', () => {
    it('should update the given fields only', async () => {
      const { token, user } = await createTestUser()
      const habit = await createTestHabit(user.id, { name: 'Old', frequency: 'daily' })

      const response = await request(app)
        .patch(`/api/habits/${habit.id}`)
        .set(auth(token))
        .send({ name: 'New' })
        .expect(200)

      expect(response.body.habit).toMatchObject({ name: 'New', frequency: 'daily' })
    })

    it('should reject an empty body', async () => {
      const { token, user } = await createTestUser()
      const habit = await createTestHabit(user.id)

      await request(app).patch(`/api/habits/${habit.id}`).set(auth(token)).send({}).expect(400)
    })

    it('should return 404 for another user\'s habit and leave it unchanged', async () => {
      const me = await createTestUser()
      const other = await createTestUser()
      const habit = await createTestHabit(other.user.id, { name: 'Untouched' })

      await request(app)
        .patch(`/api/habits/${habit.id}`)
        .set(auth(me.token))
        .send({ name: 'Hacked' })
        .expect(404)

      const response = await request(app).get(`/api/habits/${habit.id}`).set(auth(other.token)).expect(200)
      expect(response.body.habit.name).toBe('Untouched')
    })
  })

  describe('DELETE /api/habits/:id', () => {
    it('should delete the habit', async () => {
      const { token, user } = await createTestUser()
      const habit = await createTestHabit(user.id)

      await request(app).delete(`/api/habits/${habit.id}`).set(auth(token)).expect(204)
      await request(app).get(`/api/habits/${habit.id}`).set(auth(token)).expect(404)
    })

    it('should return 404 for another user\'s habit and not delete it', async () => {
      const me = await createTestUser()
      const other = await createTestUser()
      const habit = await createTestHabit(other.user.id)

      await request(app).delete(`/api/habits/${habit.id}`).set(auth(me.token)).expect(404)
      await request(app).get(`/api/habits/${habit.id}`).set(auth(other.token)).expect(200)
    })
  })

  describe('POST /api/habits/:id/complete', () => {
    it('should record a completion with no body', async () => {
      const { token, user } = await createTestUser()
      const habit = await createTestHabit(user.id)

      const response = await request(app)
        .post(`/api/habits/${habit.id}/complete`)
        .set(auth(token))
        .expect(201)

      expect(response.body.entry.habitId).toBe(habit.id)
      expect(response.body.entry.completionDate).toBeDefined()
    })

    it('should accept a note and an earlier completion date', async () => {
      const { token, user } = await createTestUser()
      const habit = await createTestHabit(user.id)

      const response = await request(app)
        .post(`/api/habits/${habit.id}/complete`)
        .set(auth(token))
        .send({ note: 'Felt great', completionDate: '2026-01-15T12:00:00.000Z' })
        .expect(201)

      expect(response.body.entry.note).toBe('Felt great')
      expect(response.body.entry.completionDate).toBe('2026-01-15T12:00:00.000Z')
    })

    it('should reject a completion date in the future', async () => {
      const { token, user } = await createTestUser()
      const habit = await createTestHabit(user.id)

      await request(app)
        .post(`/api/habits/${habit.id}/complete`)
        .set(auth(token))
        .send({ completionDate: '2999-01-01T00:00:00.000Z' })
        .expect(400)
    })

    it('should return 404 for another user\'s habit', async () => {
      const me = await createTestUser()
      const other = await createTestUser()
      const habit = await createTestHabit(other.user.id)

      await request(app).post(`/api/habits/${habit.id}/complete`).set(auth(me.token)).expect(404)
    })
  })
})
