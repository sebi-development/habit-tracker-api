import { Router } from "express";
import { validateBody, validateParams } from "../middleware/validation.ts";
import { authenticateToken } from "../middleware/auth.ts";
import {
  completeHabit,
  createHabit,
  deleteHabit,
  getHabit,
  getUserHabits,
  updateHabit
} from "../controllers/habitController.ts";
import {
  completeHabitSchema,
  createHabitSchema,
  habitParamsSchema,
  updateHabitSchema
} from "../db/schema.ts";

const router = Router()

router.use(authenticateToken)

router.get('/', getUserHabits)
router.post('/', validateBody(createHabitSchema), createHabit)

router.get('/:id', validateParams(habitParamsSchema), getHabit)
router.patch('/:id', validateParams(habitParamsSchema), validateBody(updateHabitSchema), updateHabit)
router.delete('/:id', validateParams(habitParamsSchema), deleteHabit)

router.post('/:id/complete', validateParams(habitParamsSchema), validateBody(completeHabitSchema), completeHabit)

export default router
