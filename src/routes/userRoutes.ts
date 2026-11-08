import { Router } from "express";
import { authenticateToken } from "../middleware/auth.ts";

const router = Router()

router.use(authenticateToken)

router.get('/', (req, res) => {
  res.json({

  })
})

router.get('/:id', (req, res) => {
  res.json({
    message: ''
  })
})

router.put('/:id', (req, res) => {
  res.json()
})

export default router