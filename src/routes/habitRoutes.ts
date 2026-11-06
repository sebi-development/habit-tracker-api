import { Router } from "express";
import { validateBody, validateParams } from "../middleware/validation.ts";
import z from "zod";

const createHabitSchema = z.object({
  name: z.string(),
})

const completeParamsSchema = z.object({
  id: z.string()
})

const router = Router()

router.get('/', (req, res) => {
  res.json({

  })
})

router.get('/:id', (req, res) => {

})

router.post('/', (req, res) => {
  res.json({

  })
})

router.delete('/:id', (req, res) => {
  res.json({

  })
})

router.post('/:id/complete', validateParams(completeParamsSchema), validateBody(createHabitSchema),  (req, res) => {
  res.json({

  })
})

export default router