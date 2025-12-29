import type { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../errors/index.js";
import { adminService } from "../services/admin.service.js";
import { userService } from "../services/user.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

class AdminController {
	/**
	 * Helper to extract metadata from request
	 */
	private getMetadata(req: Request) {
		return {
			adminId: req.user?.userId || "",
			userAgent: req.headers["user-agent"],
			ipAddress: req.ip || req.socket.remoteAddress,
		};
	}

	/**
	 * Unlock a user account
	 * POST /api/admin/users/:userId/unlock
	 */
	unlockAccount = asyncHandler(
		async (req: Request, res: Response): Promise<void> => {
			if (!req.user) {
				throw new UnauthorizedError("Unauthorized");
			}

			const { userId } = req.params;
			if (!userId) {
				throw new BadRequestError("User ID is required");
			}

			const metadata = this.getMetadata(req);
			const result = await adminService.unlockAccount(userId, metadata);

			sendSuccess(res, undefined, result.message);
		},
	);

	/**
	 * Get user's lock status
	 * GET /api/admin/users/:userId/lock-status
	 */
	getUserLockStatus = asyncHandler(
		async (req: Request, res: Response): Promise<void> => {
			if (!req.user) {
				throw new UnauthorizedError("Unauthorized");
			}

			const { userId } = req.params;
			if (!userId) {
				throw new BadRequestError("User ID is required");
			}

			const status = await adminService.getUserLockStatus(userId);
			sendSuccess(res, { status });
		},
	);

	/**
	 * Get all locked accounts
	 * GET /api/admin/locked-accounts
	 */
	getLockedAccounts = asyncHandler(
		async (req: Request, res: Response): Promise<void> => {
			if (!req.user) {
				throw new UnauthorizedError("Unauthorized");
			}

			const accounts = await adminService.getLockedAccounts();
			sendSuccess(res, { accounts, count: accounts.length });
		},
	);

	/**
	 * Get all users
	 * GET /api/admin/users
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
	 * Get user by ID
	 * GET /api/admin/users/:userId
	 * @param req Request with user ID parameter
	 * @return void
	 */
	getUserById = asyncHandler(
		async (req: Request, res: Response): Promise<void> => {
			const { userId } = req.params;

			if (!userId) {
				throw new BadRequestError("User ID is required");
			}

			const user = await userService.getUserById(userId);
			sendSuccess(res, { user }, "User retrieved successfully");
		},
	);
}

export const adminController = new AdminController();
