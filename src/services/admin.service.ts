import { prisma } from "../config/database.js";
import { NotFoundError } from "../errors/index.js";
import { auditService } from "./audit.service.js";

interface AdminMetadata {
	adminId: string;
	ipAddress?: string;
	userAgent?: string;
}

interface UserLockStatus {
	id: string;
	email: string;
	isLocked: boolean;
	lockoutUntil: Date | null;
	failedLoginAttempts: number;
	lastFailedLogin: Date | null;
}

class AdminService {
	/**
	 * Unlock a user account
	 * @param userId The user ID to unlock
	 * @param metadata Admin metadata for audit logging
	 */
	async unlockAccount(
		userId: string,
		metadata: AdminMetadata,
	): Promise<{ message: string }> {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				lockoutUntil: true,
			},
		});

		if (!user) {
			throw new NotFoundError("User not found", "USER_NOT_FOUND");
		}

		// Reset lockout fields
		await prisma.user.update({
			where: { id: userId },
			data: {
				failedLoginAttempts: 0,
				lockoutUntil: null,
				lastFailedLogin: null,
			},
		});

		// Log the unlock action
		await auditService.logAccountUnlocked(
			userId,
			metadata.adminId,
			metadata.ipAddress,
			metadata.userAgent,
		);

		return { message: `Account ${user.email} has been unlocked` };
	}

	/**
	 * Get user's lock status
	 * @param userId The user ID to check
	 */
	async getUserLockStatus(userId: string): Promise<UserLockStatus> {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				lockoutUntil: true,
				failedLoginAttempts: true,
				lastFailedLogin: true,
			},
		});

		if (!user) {
			throw new NotFoundError("User not found", "USER_NOT_FOUND");
		}

		const isLocked = user.lockoutUntil ? user.lockoutUntil > new Date() : false;

		return {
			id: user.id,
			email: user.email,
			isLocked,
			lockoutUntil: user.lockoutUntil,
			failedLoginAttempts: user.failedLoginAttempts,
			lastFailedLogin: user.lastFailedLogin,
		};
	}

	/**
	 * Get all locked accounts
	 */
	async getLockedAccounts(): Promise<UserLockStatus[]> {
		const now = new Date();

		const users = await prisma.user.findMany({
			where: {
				lockoutUntil: {
					gt: now,
				},
			},
			select: {
				id: true,
				email: true,
				lockoutUntil: true,
				failedLoginAttempts: true,
				lastFailedLogin: true,
			},
			orderBy: {
				lockoutUntil: "desc",
			},
		});

		return users.map((user) => ({
			id: user.id,
			email: user.email,
			isLocked: true,
			lockoutUntil: user.lockoutUntil,
			failedLoginAttempts: user.failedLoginAttempts,
			lastFailedLogin: user.lastFailedLogin,
		}));
	}
}

export const adminService = new AdminService();
