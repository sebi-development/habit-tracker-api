import { Router } from "express";

const router = Router()

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