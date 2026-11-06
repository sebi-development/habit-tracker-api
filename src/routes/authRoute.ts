import { Router } from "express";
import { register } from "../controllers/authController.ts";
import { validateBody } from "../middleware/validation.ts";
import { insertUserSchema } from "../db/schema.ts";

const router = Router()

router.post('/register', validateBody(insertUserSchema), register)

router.post('/login', (req, res) => {
  res.status(201).json({

  })
})

export default router