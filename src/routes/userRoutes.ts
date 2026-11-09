import { Router } from "express";
import { authenticateToken } from "../middleware/auth.ts";
import { validateBody, validateParams, validateQuery } from "../middleware/validation.ts";
import { getUser, listUsers, updateUser } from "../controllers/userController.ts";
import { listUsersQuerySchema, updateUserSchema, userParamsSchema } from "../db/schema.ts";

const router = Router()

router.use(authenticateToken)

router.get('/', validateQuery(listUsersQuerySchema), listUsers)
router.get('/:id', validateParams(userParamsSchema), getUser)
router.put('/:id', validateParams(userParamsSchema), validateBody(updateUserSchema), updateUser)

export default router
