import request from "supertest";
import app from "../server.ts";

describe('Health Endpoints', () => {
  it('GET /health should report liveness without authentication', async () => {
    const response = await request(app).get('/health').expect(200)

    expect(response.body.status).toBe('ok')
    expect(typeof response.body.uptime).toBe('number')
    expect(response.body.timestamp).toBeDefined()
  })

  it('GET /health/ready should confirm the database is reachable', async () => {
    const response = await request(app).get('/health/ready').expect(200)

    expect(response.body).toMatchObject({ status: 'ok', database: 'up' })
  })
})
