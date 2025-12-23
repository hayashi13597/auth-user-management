import type { Request, Response } from "express";
import { BadRequestError } from "../errors";
import { userService } from "../services/user.service";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";

class UserController {
	/**
	 * Get current user profile
	 * GET /api/users/profile
	 * @param req Request with authenticated user
	 * @return void
	 */
	getProfile = asyncHandler(
		async (req: Request, res: Response): Promise<void> => {
			if (!req.user?.userId) {
				throw new BadRequestError("User ID not found in request");
			}

			const user = await userService.getProfile(req.user.userId);
			sendSuccess(res, { user }, "Profile retrieved successfully");
		},
	);

	/**
	 * Update user profile
	 * PUT /api/users/profile
	 * @param req Request with user update data
	 * @return void
	 */
	updateProfile = asyncHandler(
		async (req: Request, res: Response): Promise<void> => {
			if (!req.user?.userId) {
				throw new BadRequestError("User ID not found in request");
			}

			const user = await userService.updateProfile(req.user.userId, req.body);
			sendSuccess(res, { user }, "Profile updated successfully");
		},
	);

	/**
	 * Change user password
	 * PUT /api/users/change-password
	 * @param req Request with password change data
	 * @return void
	 */
	changePassword = asyncHandler(
		async (req: Request, res: Response): Promise<void> => {
			if (!req.user?.userId) {
				throw new BadRequestError("User ID not found in request");
			}

			await userService.changePassword(req.user.userId, req.body);
			sendSuccess(res, undefined, "Password changed successfully");
		},
	);

	/**
	 * Delete user account
	 * DELETE /api/users/account
	 * @param req Request with authenticated user
	 * @return void
	 */
	deleteAccount = asyncHandler(
		async (req: Request, res: Response): Promise<void> => {
			if (!req.user?.userId) {
				throw new BadRequestError("User ID not found in request");
			}

			await userService.deleteAccount(req.user.userId);
			sendSuccess(res, undefined, "Account deleted successfully");
		},
	);

	/**
	 * Get all users (Admin only)
	 * GET /api/users
	 * @param req Request
	 * @return void
	 */
	getAllUsers = asyncHandler(
		async (_req: Request, res: Response): Promise<void> => {
			const users = await userService.getAllUsers();
			sendSuccess(
				res,
				{ users, count: users.length },
				"Users retrieved successfully",
			);
		},
	);

	/**
	 * Get user by ID (Admin only)
	 * GET /api/users/:id
	 * @param req Request with user ID parameter
	 * @return void
	 */
	getUserById = asyncHandler(
		async (req: Request, res: Response): Promise<void> => {
			const userId = req.params.id;

			if (!userId) {
				throw new BadRequestError("User ID is required");
			}

			const user = await userService.getUserById(userId);
			sendSuccess(res, { user }, "User retrieved successfully");
		},
	);
}

export const userController = new UserController();
