import express from 'express'
import authRoutes from './routes/authRoute.ts'
import userRoutes from './routes/userRoutes.ts'
import habitRoutes from './routes/habitRoutes.ts'
import helmet from 'helmet'
import morgan from 'morgan'
import cors from 'cors'
import { isTest } from '../env.ts'
import { errorHandler, notFound } from './middleware/errorHandler.ts'

const app = express()
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev', {
  skip: () => isTest()
}))
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/habits', habitRoutes)

// After all routes
app.use(notFound)
app.use(errorHandler)

export { app }
export default app