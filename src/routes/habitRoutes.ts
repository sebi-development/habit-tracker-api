import { Router } from "express";
import { validateBody, validateParams } from "../middleware/validation.ts";
import { authenticateToken } from "../middleware/auth.ts";
import { createHabit, getUserHabits, updateHabit } from "../controllers/habitController.ts";
import { createHabitSchema, updateHabitSchema, habitParamsSchema } from "../db/schema.ts";

const router = Router()

router.use(authenticateToken)

router.get('/', getUserHabits)

router.get('/:id', (req, res) => {

})

router.post('/', validateBody(createHabitSchema), createHabit)

router.patch('/:id', validateParams(habitParamsSchema), validateBody(updateHabitSchema), updateHabit)

router.delete('/:id', (req, res) => {
  res.json({

  })
})

router.post('/:id/complete', validateParams(habitParamsSchema), validateBody(createHabitSchema), (req, res) => {
  res.json({

  })
})

export default router