import express from 'express'
import authRoutes from './routes/authRoute.ts'
import userRoutes from './routes/userRoutes.ts'
import habitRoutes from './routes/habitRoutes.ts'
import helmet from 'helmet'
import morgan from 'morgan'
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
import { env, isProd, isTest } from '../env.ts'
import { errorHandler, notFound } from './middleware/errorHandler.ts'

const app = express()

// Behind a hosting platform's proxy, req.ip would be the proxy's address for
// every client, which breaks per-client rate limiting. Trust one hop in prod.
if (isProd()) app.set('trust proxy', 1)

app.use(helmet())
app.use(cors({
  // Production: only the listed origins. Dev/test: any origin when none is set.
  origin: env.ALLOWED_ORIGINS.length > 0 ? env.ALLOWED_ORIGINS : !isProd()
}))
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))
app.use(morgan(isProd() ? 'combined' : 'dev', {
  skip: () => isTest()
}))

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  skip: () => isTest()
})

// Stricter on login/register: every attempt costs a bcrypt hash, and this is
// the endpoint people brute-force.
const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: Math.min(env.RATE_LIMIT_MAX_REQUESTS, 20),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
  skip: () => isTest()
})

app.use('/api', apiLimiter)
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/habits', habitRoutes)

// After all routes
app.use(notFound)
app.use(errorHandler)

export { app }
export default app
