import env from "../env.ts";
import app from "./server.ts";
import db from "./db/connection.ts";

const server = app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT} (${env.APP_STAGE})`)
})

// Hosting platforms send SIGTERM on every deploy/restart. Stop taking new
// connections, let in-flight requests finish, then close the database pool.
const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down`)

  // Safety net: don't hang forever on a stuck connection
  setTimeout(() => process.exit(1), 10_000).unref()

  server.close(async () => {
    await db.$client.end()
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
