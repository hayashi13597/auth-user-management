import { Router } from "express";
import { auditController } from "../controllers/audit.controller.js";
import { authController } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
	apiLimiter,
	authLimiter,
	refreshLimiter,
	registerLimiter,
} from "../middlewares/rate-limit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
	createUserSchema,
	loginUserSchema,
	resendVerificationSchema,
	verifyEmailSchema,
} from "../schemas/auth.schema.js";

const router = Router();

// Public routes
/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
	"/register",
	registerLimiter,
	validate(createUserSchema),
	authController.register,
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
	"/login",
	authLimiter,
	validate(loginUserSchema),
	authController.login,
);

/**
 * POST /api/auth/refresh
 * Refresh access and refresh tokens
 */
router.post("/refresh", refreshLimiter, authController.refresh);

/**
 * GET /api/auth/verify-email
 * Verify user email with token
 */
router.get(
	"/verify-email",
	apiLimiter,
	validate(verifyEmailSchema),
	authController.verifyEmail,
);

/**
 * POST /api/auth/resend-verification
 * Resend email verification
 */
router.post(
	"/resend-verification",
	authLimiter,
	validate(resendVerificationSchema),
	authController.resendVerification,
);

// Protected routes
/**
 * POST /api/auth/logout
 * Logout user
 */
router.post("/logout", authenticate, apiLimiter, authController.logout);

/**
 * GET /api/auth/sessions
 * Get user sessions
 */
router.get("/sessions", authenticate, apiLimiter, authController.getSessions);

/**
 * POST /api/auth/revoke-all
 * Revoke all user tokens
 */
router.post(
	"/revoke-all",
	authenticate,
	apiLimiter,
	authController.revokeAllSessions,
);

/**
 * DELETE /api/auth/sessions/:sessionId/revoke
 * Revoke a specific session
 */
router.delete(
	"/sessions/:sessionId/revoke",
	authenticate,
	apiLimiter,
	authController.revokeSession,
);

/**
 * GET /api/auth/audit-logs
 * Get audit logs for the authenticated user
 */
router.get(
	"/audit-logs",
	authenticate,
	apiLimiter,
	auditController.getMyAuditLogs,
);

export default router;
