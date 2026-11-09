import { createTestUser, createTestHabit, cleanupDatabase } from "./dbHelpers.ts"

describe('Test setup', () => {
  test('should connect to the test db', async () => {
    const {user, token} = await createTestUser()

    expect(user).toBeDefined()
    await cleanupDatabase()
  })
})