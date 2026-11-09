import request from "supertest";
import app from "../server.ts";
import { cleanupDatabase, createTestUser } from './setup/dbHelpers.ts'

describe('Authentication Endpoints', () => {
  afterEach(async () => {
    await cleanupDatabase()
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        email: 'testemail@test.com',
        username: 'testuser',
        password: 'test1234'
      }
      const response = await request(app).post('/api/auth/register').send(userData).expect(201)

      expect(response.body).toHaveProperty('user')
      expect(response.body).toHaveProperty('token')
      expect(response.body.user).not.toHaveProperty('password')
    })

    it('should reject a duplicate email with 409', async () => {
      const { user } = await createTestUser()

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: user.email, username: 'someone-else', password: 'test1234' })
        .expect(409)

      expect(response.body.error).toBe('Email already in use')
    })

    it('should reject invalid data with 400', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', username: 'a', password: 'short' })
        .expect(400)

      expect(response.body.details).toHaveLength(3)
    })
  })

  describe('POST /api/auth/login', () => {
    it('should log in with valid credentials', async () => {
      const testUser = await createTestUser()
      const credentials = {
        email: testUser.user.email,
        password: testUser.rawPassword
      }

      const response = await request(app).post('/api/auth/login').send(credentials).expect(200)

      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('token')
      expect(response.body).toHaveProperty('user')
      // the password hash must never be sent back
      expect(response.body.user).not.toHaveProperty('password')
    })

    it('should log in with a username instead of an email', async () => {
      const testUser = await createTestUser()

      await request(app)
        .post('/api/auth/login')
        .send({ username: testUser.user.username, password: testUser.rawPassword })
        .expect(200)
    })

    it('should reject a wrong password and an unknown user with the same 401', async () => {
      const testUser = await createTestUser()

      const wrongPassword = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.user.email, password: 'wrong-password' })
        .expect(401)

      const unknownUser = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'wrong-password' })
        .expect(401)

      // identical responses = the API doesn't reveal which emails exist
      expect(wrongPassword.body).toEqual(unknownUser.body)
    })
  })
})
