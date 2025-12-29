import { Router } from "express";
import { adminController } from "../controllers/admin.controller.js";
import { auditController } from "../controllers/audit.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { apiLimiter } from "../middlewares/rate-limit.middleware.js";

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(authorize("ADMIN"));
router.use(apiLimiter);

/**
 * GET /api/admin/security-events
 * Get recent security events (failed logins, token reuse, account lockouts)
 */
router.get("/security-events", auditController.getSecurityEvents);

/**
 * GET /api/admin/locked-accounts
 * Get all currently locked accounts
 */
router.get("/locked-accounts", adminController.getLockedAccounts);

/**
 * GET /api/admin/users/:userId/audit-logs
 * Get audit logs for a specific user
 */
router.get("/users/:userId/audit-logs", auditController.getUserAuditLogs);

/**
 * GET /api/admin/users/:userId/lock-status
 * Get lock status for a specific user
 */
router.get("/users/:userId/lock-status", adminController.getUserLockStatus);

/**
 * POST /api/admin/users/:userId/unlock
 * Unlock a user account
 */
router.post("/users/:userId/unlock", adminController.unlockAccount);

/**
 * GET /api/admin/users
 * Get all users
 */
router.get("/users", adminController.getAllUsers);

/**
 * GET /api/admin/users/:userId
 * Get user by ID
 */
router.get("/users/:userId", adminController.getUserById);

export default router;
