import { Router } from "express";
import { login, register } from "../controllers/authController.ts";
import { validateBody } from "../middleware/validation.ts";
import { insertUserSchema, loginSchema } from "../db/schema.ts";

const router = Router()

router.post('/register', validateBody(insertUserSchema), register)
router.post('/login', validateBody(loginSchema), login)

export default router