import request from "supertest";
import app from "../server.ts";
import { cleanupDatabase, createTestUser } from './setup/dbHelpers.ts'

const auth = (token: string) => ({ Authorization: `Bearer ${token}` })
const MISSING_ID = '00000000-0000-0000-0000-000000000000'

describe('User Endpoints', () => {
  afterEach(async () => {
    await cleanupDatabase()
  })

  describe('GET /api/users', () => {
    it('should require authentication', async () => {
      await request(app).get('/api/users').expect(401)
    })

    it('should list users with public fields only', async () => {
      const me = await createTestUser()
      await createTestUser()

      const response = await request(app).get('/api/users').set(auth(me.token)).expect(200)

      expect(response.body.users).toHaveLength(2)
      for (const user of response.body.users) {
        expect(Object.keys(user).sort()).toEqual(['createdAt', 'id', 'username'])
      }
      expect(response.body.pagination).toEqual({ limit: 20, offset: 0, total: 2 })
    })

    it('should paginate with limit and offset', async () => {
      const me = await createTestUser({ username: 'aaa-first' })
      await createTestUser({ username: 'bbb-second' })
      await createTestUser({ username: 'ccc-third' })

      const response = await request(app)
        .get('/api/users?limit=1&offset=1')
        .set(auth(me.token))
        .expect(200)

      expect(response.body.users).toHaveLength(1)
      expect(response.body.users[0].username).toBe('bbb-second')
      expect(response.body.pagination).toEqual({ limit: 1, offset: 1, total: 3 })
    })

    it('should reject invalid pagination with 400', async () => {
      const me = await createTestUser()

      await request(app).get('/api/users?limit=0').set(auth(me.token)).expect(400)
      await request(app).get('/api/users?limit=1000').set(auth(me.token)).expect(400)
      await request(app).get('/api/users?offset=abc').set(auth(me.token)).expect(400)
    })
  })

  describe('GET /api/users/:id', () => {
    it('should return the full profile for yourself, without the password', async () => {
      const me = await createTestUser()

      const response = await request(app)
        .get(`/api/users/${me.user.id}`)
        .set(auth(me.token))
        .expect(200)

      expect(response.body.user.email).toBe(me.user.email)
      expect(response.body.user).not.toHaveProperty('password')
    })

    it('should return only public fields for someone else', async () => {
      const me = await createTestUser()
      const other = await createTestUser()

      const response = await request(app)
        .get(`/api/users/${other.user.id}`)
        .set(auth(me.token))
        .expect(200)

      expect(Object.keys(response.body.user).sort()).toEqual(['createdAt', 'id', 'username'])
    })

    it('should return 404 for an unknown user and 400 for a bad id', async () => {
      const me = await createTestUser()

      await request(app).get(`/api/users/${MISSING_ID}`).set(auth(me.token)).expect(404)
      await request(app).get('/api/users/abc').set(auth(me.token)).expect(400)
    })
  })

  describe('PUT /api/users/:id', () => {
    it('should update your own profile', async () => {
      const me = await createTestUser()

      const response = await request(app)
        .put(`/api/users/${me.user.id}`)
        .set(auth(me.token))
        .send({ firstName: 'Renamed', username: 'renamed-user' })
        .expect(200)

      expect(response.body.user).toMatchObject({ firstName: 'Renamed', username: 'renamed-user' })
      expect(response.body.user).not.toHaveProperty('password')
    })

    it('should ignore a password sent in the body', async () => {
      const me = await createTestUser()

      await request(app)
        .put(`/api/users/${me.user.id}`)
        .set(auth(me.token))
        .send({ firstName: 'Renamed', password: 'hacked-password-1' })
        .expect(200)

      await request(app)
        .post('/api/auth/login')
        .send({ email: me.user.email, password: me.rawPassword })
        .expect(200)
    })

    it('should return 403 for another user\'s profile and leave it unchanged', async () => {
      const me = await createTestUser()
      const other = await createTestUser({ firstName: 'Original' })

      await request(app)
        .put(`/api/users/${other.user.id}`)
        .set(auth(me.token))
        .send({ firstName: 'Hacked' })
        .expect(403)

      const response = await request(app)
        .get(`/api/users/${other.user.id}`)
        .set(auth(other.token))
        .expect(200)
      expect(response.body.user.firstName).toBe('Original')
    })

    it('should return 409 when the email is already taken', async () => {
      const me = await createTestUser()
      const other = await createTestUser()

      const response = await request(app)
        .put(`/api/users/${me.user.id}`)
        .set(auth(me.token))
        .send({ email: other.user.email })
        .expect(409)

      expect(response.body.error).toBe('Email already in use')
    })

    it('should reject an empty body and an invalid email with 400', async () => {
      const me = await createTestUser()

      await request(app).put(`/api/users/${me.user.id}`).set(auth(me.token)).send({}).expect(400)
      await request(app)
        .put(`/api/users/${me.user.id}`)
        .set(auth(me.token))
        .send({ email: 'not-an-email' })
        .expect(400)
    })
  })
})
