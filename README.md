# Habit Tracker API

A REST API for tracking daily habits, built with Node.js, Express 5, PostgreSQL and TypeScript. Users register, log in with JWT authentication and manage their own habits and tags.

The focus of the project is a production-style backend: end-to-end type safety, request validation, centralized error handling, rate limiting and an integration test suite that runs against a real database.

## Tech stack

| Area | Choice |
| --- | --- |
| Runtime | Node.js 24 (runs TypeScript directly, no build step) |
| Framework | Express 5 |
| Database | PostgreSQL ([Neon](https://neon.tech)) with [Drizzle ORM](https://orm.drizzle.team) |
| Validation | Zod, with request types inferred from the same schemas |
| Auth | JWT (`jose`, HS256) and bcrypt password hashing |
| Security | Helmet, CORS allow-list, rate limiting |
| Testing | Vitest and Supertest against a separate test database |

## Features

- **Auth:** register and log in with an email or a username. Passwords are hashed with bcrypt, and failed logins return the same error for an unknown user and a wrong password so accounts can't be enumerated.
- **Habits:** create, list, view, update and delete habits, and log completions against them. Habits belong to a user and can be tagged. Every query is scoped to the authenticated user, so one user can never read or change another's data.
- **Validation:** every request body and URL parameter is checked with Zod. Unknown fields are stripped, so a client can't set fields such as `userId`.
- **Error handling:** controllers have no `try/catch`. Express 5 forwards thrown errors to a single handler that maps them to the right status code, including Postgres unique (409) and foreign key (400) violations, and never leaks internals on a 500.
- **Safe writes:** multi-table changes (a habit and its tags) run in a transaction.
- **Privacy:** other users only ever see your `id`, `username` and join date. Email and name are visible to you alone, and the password hash is never selected from the database.
- **Production hardening:** per-IP rate limits (stricter on `/api/auth`), request size limit, CORS allow-list, graceful shutdown on `SIGTERM`, and a database pool that survives dropped connections.

## API

Base path: `/api`. Protected routes need `Authorization: Bearer <token>`.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | no | Liveness check (uptime and timestamp) |
| GET | `/health/ready` | no | Readiness check: 200 if the database is reachable, 503 if not |
| POST | `/api/auth/register` | no | Create an account, returns the user and a token |
| POST | `/api/auth/login` | no | Log in with `email` or `username` plus `password` |
| GET | `/api/habits` | yes | List your habits with their tags |
| POST | `/api/habits` | yes | Create a habit, optionally with `tagIds` |
| GET | `/api/habits/:id` | yes | One habit with its tags and its 30 most recent completions |
| PATCH | `/api/habits/:id` | yes | Update any habit fields; `tagIds` replaces its tags |
| DELETE | `/api/habits/:id` | yes | Delete a habit and its completions (204) |
| POST | `/api/habits/:id/complete` | yes | Log a completion; optional `note` and past `completionDate` |
| GET | `/api/users` | yes | Browse users (`id`, `username` only), paginated with `limit` and `offset` |
| GET | `/api/users/:id` | yes | Your full profile for your own id, public fields for anyone else's |
| PUT | `/api/users/:id` | yes | Update your own profile (403 for anyone else's) |

Example:

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","username":"me","password":"supersecret1"}'

# Create a habit (use the token from the response above)
curl -X POST http://localhost:3000/api/habits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Read 20 pages","frequency":"daily","targetCount":1}'
```

Errors share one shape: `{ "error": "message" }`. Validation errors add `details` with one entry per invalid field.

## Getting started

Requirements: Node.js 24.3 or newer, [pnpm](https://pnpm.io) and a PostgreSQL database.

```bash
git clone https://github.com/sebi-development/habit-tracker-api.git
cd habit-tracker-api
pnpm install

cp .env.example .env     # then fill in DATABASE_URL and JWT_SECRET
pnpm db:push             # create the tables
pnpm db:seed             # optional: demo user (demo@app.com / password)
pnpm dev
```

The API is now running at `http://localhost:3000`.

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string (`postgresql://...`) |
| `JWT_SECRET` | yes | At least 32 characters. Generate with `openssl rand -hex 32` |
| `NODE_ENV` | no | Set to `production` when deployed |
| `PORT` | no | Defaults to `3000` |
| `JWT_EXPIRES_IN` | no | Token lifetime, defaults to `7d` |
| `BCRYPT_ROUNDS` | no | bcrypt cost from 10 to 20, defaults to `12` |
| `ALLOWED_ORIGINS` | no | Comma separated browser origins allowed by CORS. In production, only these are allowed |
| `RATE_LIMIT_WINDOW_MS` | no | Rate limit window, defaults to 15 minutes |
| `RATE_LIMIT_MAX_REQUESTS` | no | Requests per window per IP, defaults to `100` (`/api/auth` is capped at 20) |

Variables are validated with Zod at startup, so the app refuses to boot with a clear message if one is missing or invalid.

### Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Start with auto-reload |
| `pnpm start` | Start for production |
| `pnpm typecheck` | Type-check the whole project |
| `pnpm test` | Run the test suite |
| `pnpm test:coverage` | Run the tests with a coverage report |
| `pnpm db:generate` | Generate a SQL migration from schema changes |
| `pnpm db:migrate` | Apply migrations (use this in production) |
| `pnpm db:push` | Sync the schema straight to the database (development only) |
| `pnpm db:studio` | Browse the data in Drizzle Studio |
| `pnpm db:seed` | Reset the database to demo data (refuses to run in production) |

## Testing

Tests are integration tests: Supertest sends real HTTP requests through the Express app to a real PostgreSQL database.

```bash
cp .env.example .env.test   # point DATABASE_URL at a separate, disposable database
pnpm test
```

`pnpm test` always runs with `APP_STAGE=test`, so it loads `.env.test` and never touches your development data. Before the run, a global setup rebuilds the schema in the test database, and it refuses to run if the stage isn't `test`, because it drops every table. After the run it drops them again.

## Deploying to Render

1. Create a PostgreSQL database for production (a separate one from development) and copy its connection string.
2. Create a **Web Service** from this repository with:
   - **Build command:** `pnpm install --frozen-lockfile --prod=false && pnpm db:migrate`
   - **Start command:** `pnpm start`
   - **Health check path:** `/health` (use this one, not `/health/ready`, which wakes a serverless database on every poll)
3. Add the environment variables: `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, and `ALLOWED_ORIGINS` with your frontend's URL.

The build installs dev dependencies because `drizzle-kit`, which applies the migrations, is one. The `.node-version` file selects Node 24. Migrations run on every deploy and are skipped when there is nothing new.

## Project structure

```
src/
  controllers/   request handlers (auth, habits)
  db/            Drizzle schema, connection and seed script
  middleware/    auth, validation, error handling
  routes/        route definitions
  utils/         JWT, password hashing, error helpers
  test/          integration tests and test database helpers
migrations/      generated SQL migrations
env.ts           validated environment configuration
```

## Design notes

- **One schema, two jobs.** Zod schemas in `src/db/schema.ts` validate requests and, through `z.infer`, provide the TypeScript types used by the controllers, so the two can't drift apart.
- **Ownership in the query.** Updates filter on both the habit id and the authenticated user's id. Someone else's habit simply isn't found, which returns 404 without revealing that it exists.
- **No `catchAsync` wrapper.** Express 5 handles rejected promises in async handlers itself, so a global error handler is all that's needed.
