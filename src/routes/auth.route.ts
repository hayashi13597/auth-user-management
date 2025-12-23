import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import {
  apiLimiter,
  authLimiter,
  refreshLimiter,
  registerLimiter,
} from "../middlewares/rate-limit.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createUserSchema,
  loginUserSchema,
  refreshTokenSchema,
} from "../schemas/auth.schema";

const router = Router();

// Public routes
router.post(
  "/register",
  registerLimiter,
  validate(createUserSchema),
  authController.register
);
router.post(
  "/login",
  authLimiter,
  validate(loginUserSchema),
  authController.login
);
router.post(
  "/refresh",
  refreshLimiter,
  authController.refresh
);

// Protected routes
router.post("/logout", authenticate, apiLimiter, authController.logout);
router.get("/sessions", authenticate, apiLimiter, authController.getSessions);
router.post(
  "/revoke-all",
  authenticate,
  apiLimiter,
  authController.revokeAllSessions
);
router.delete(
  "/sessions/:sessionId/revoke",
  authenticate,
  apiLimiter,
  authController.revokeSession
);

export default router;
