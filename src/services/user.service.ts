import bcrypt from "bcrypt";
import { prisma } from "../config/database.js";
import {
	BadRequestError,
	NotFoundError,
	UnauthorizedError,
} from "../errors/index.js";
import type { User } from "../generated/prisma/client.js";
import { authService } from "./auth.service.js";

type UserResponse = Omit<
	User,
	| "password"
	| "failedLoginAttempts"
	| "lockoutUntil"
	| "lastFailedLogin"
	| "emailVerificationToken"
	| "emailVerificationExpires"
>;
type UpdateProfileData = Pick<User, "name" | "email">;
type ChangePasswordData = {
	currentPassword: string;
	newPassword: string;
};

class UserService {
	/**
	 * Get user profile by ID
	 * @param userId User ID
	 * @returns User profile data
	 */
	async getProfile(userId: string): Promise<UserResponse> {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				name: true,
				isActive: true,
				role: true,
				emailVerified: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		if (!user) {
			throw new NotFoundError("User not found", "USER_NOT_FOUND");
		}

		return user;
	}

	/**
	 * Update user profile
	 * @param userId User ID
	 * @param data Update data (name, email)
	 * @param metadata Request metadata for audit logging
	 * @returns Updated user profile
	 */
	async updateProfile(
		userId: string,
		data: Partial<UpdateProfileData>,
		metadata: { ipAddress?: string; userAgent?: string } = {},
	): Promise<UserResponse> {
		// Check if user exists
		const existingUser = await prisma.user.findUnique({
			where: { id: userId },
		});

		if (!existingUser) {
			throw new NotFoundError("User not found", "USER_NOT_FOUND");
		}

		const isEmailChanging = data.email && data.email !== existingUser.email;

		// If email is being updated, check if it's already in use
		if (isEmailChanging) {
			const emailExists = await prisma.user.findUnique({
				where: { email: data.email },
			});

			if (emailExists) {
				throw new BadRequestError("Email is already in use", "EMAIL_IN_USE");
			}
		}

		// Update user (reset emailVerified if email is changing)
		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: {
				...(data.name !== undefined && { name: data.name }),
				...(data.email !== undefined && { email: data.email }),
				...(isEmailChanging && { emailVerified: false }),
			},
			select: {
				id: true,
				email: true,
				name: true,
				isActive: true,
				role: true,
				emailVerified: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		// Send verification email to the new email address
		if (isEmailChanging) {
			await authService.sendVerificationEmail(
				userId,
				updatedUser.email,
				updatedUser.name,
				metadata.ipAddress,
				metadata.userAgent,
			);
		}

		return updatedUser;
	}

	/**
	 * Change user password
	 * @param userId User ID
	 * @param data Current and new password
	 * @returns Success message
	 */
	async changePassword(
		userId: string,
		data: ChangePasswordData,
	): Promise<void> {
		const { currentPassword, newPassword } = data;

		// Get user with password
		const user = await prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new NotFoundError("User not found", "USER_NOT_FOUND");
		}

		// Verify current password
		const isPasswordValid = bcrypt.compareSync(currentPassword, user.password);
		if (!isPasswordValid) {
			throw new UnauthorizedError(
				"Current password is incorrect",
				"INVALID_PASSWORD",
			);
		}

		// check if new password is different from current password
		if (currentPassword === newPassword) {
			throw new BadRequestError(
				"New password must be different from current password",
				"SAME_PASSWORD",
			);
		}

		// Hash new password
		const hashedPassword = bcrypt.hashSync(newPassword, 10);

		// Update password
		await prisma.user.update({
			where: { id: userId },
			data: { password: hashedPassword },
		});

		// Revoke all refresh tokens for security
		await prisma.refreshToken.updateMany({
			where: { userId },
			data: { isRevoked: true },
		});
	}

	/**
	 * Delete user account (soft delete by setting isActive to false)
	 * @param userId User ID
	 * @returns Success message
	 */
	async deleteAccount(userId: string): Promise<void> {
		const user = await prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new NotFoundError("User not found", "USER_NOT_FOUND");
		}

		// Soft delete: set isActive to false
		await prisma.user.update({
			where: { id: userId },
			data: { isActive: false },
		});

		// Revoke all refresh tokens
		await prisma.refreshToken.updateMany({
			where: { userId },
			data: { isRevoked: true },
		});
	}

	/**
	 * Get all users (Admin only)
	 * @returns List of all users
	 */
	async getAllUsers(): Promise<UserResponse[]> {
		const users = await prisma.user.findMany({
			select: {
				id: true,
				email: true,
				name: true,
				isActive: true,
				role: true,
				emailVerified: true,
				createdAt: true,
				updatedAt: true,
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		return users;
	}

	/**
	 * Get user by ID (Admin only)
	 * @param userId User ID
	 * @returns User data
	 */
	async getUserById(userId: string): Promise<UserResponse> {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				name: true,
				isActive: true,
				role: true,
				emailVerified: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		if (!user) {
			throw new NotFoundError("User not found", "USER_NOT_FOUND");
		}

		return user;
	}
}

export const userService = new UserService();
