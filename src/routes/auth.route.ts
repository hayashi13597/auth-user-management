import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createUserSchema,
  loginUserSchema,
  refreshTokenSchema,
} from "../schemas/auth.schema";

const router = Router();

// Public routes
router.post("/register", validate(createUserSchema), authController.register);
router.post("/login", validate(loginUserSchema), authController.login);
router.post("/refresh", validate(refreshTokenSchema), authController.refresh);

// Protected routes
router.post("/logout", authenticate, authController.logout);
router.get("/sessions", authenticate, authController.getSessions);
router.post("/revoke-all", authenticate, authController.revokeAllSessions);
router.delete(
  "/sessions/:sessionId/revoke",
  authenticate,
  authController.revokeSession
);

export default router;
