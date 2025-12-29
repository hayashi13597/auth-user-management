import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { apiLimiter } from "../middlewares/rate-limit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
	changePasswordSchema,
	updateProfileSchema,
} from "../schemas/user.schema.js";

const router = Router();

// All user routes require authentication and rate limiting
router.use(authenticate);
router.use(apiLimiter);

// User routes (authenticated users)
/**
 * GET /api/users/profile
 * Get current user's profile
 */
router.get("/profile", userController.getProfile);

/**
 * PUT /api/users/profile
 * Update current user's profile
 */
router.put(
	"/profile",
	validate(updateProfileSchema),
	userController.updateProfile,
);

/**
 * PUT /api/users/change-password
 * Change current user's password
 */
router.put(
	"/change-password",
	validate(changePasswordSchema),
	userController.changePassword,
);

/**
 * DELETE /api/users/account
 * Delete current user's account
 */
router.delete("/account", userController.deleteAccount);

export default router;
