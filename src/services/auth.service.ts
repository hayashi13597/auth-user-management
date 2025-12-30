import bcrypt from "bcrypt";
import { prisma } from "../config/database.js";
import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
} from "../errors/index.js";
import type { RefreshToken, User } from "../generated/prisma/client.js";
import { auditService } from "./audit.service.js";
import { emailService } from "./email.service.js";
import { fingerprintService } from "./fingerprint.service.js";
import { tokenService } from "./token.service.js";
import { tokenBlacklistService } from "./token-blacklist.service.js";

interface LoginMetadata {
	userAgent?: string;
	ipAddress?: string;
}

type CreateUserData = Pick<User, "email" | "password" | "name">;
type CreateUserDataResponse = Omit<
	User,
	| "password"
	| "failedLoginAttempts"
	| "lockoutUntil"
	| "lastFailedLogin"
	| "emailVerificationToken"
	| "emailVerificationExpires"
>;
type LoginUserData = Pick<User, "email" | "password">;
type LoginUserDataResponse = {
	user: Omit<
		User,
		| "password"
		| "failedLoginAttempts"
		| "lockoutUntil"
		| "lastFailedLogin"
		| "emailVerificationToken"
		| "emailVerificationExpires"
	>;
	accessToken: string;
	refreshToken: string;
};
type RefreshTokensResponse = {
	accessToken: string;
	refreshToken: string;
};
type SessionResponse = Omit<
	RefreshToken,
	"token" | "isRevoked" | "userId" | "updatedAt" | "fingerprint"
>;
interface MessageResponse {
	message: string;
}

// Account lockout configuration
const LOCKOUT_CONFIG = {
	maxAttempts: 5, // Lock after 5 failed attempts
	lockoutDurationMinutes: 15, // Lock for 15 minutes
	resetWindowMinutes: 30, // Reset failed attempts after 30 minutes of no failures
};

const maskToken = (token: string): string => {
	const start = token.slice(0, 8);
	const end = token.slice(-6);
	return `${start}...${end}`;
};

class AuthService {
	/**
	 * create a new user.
	 * @param data User registration data (email, password, name)
	 * @param metadata Additional metadata (IP address, user agent)
	 * @returns Created user data
	 */
	async create(
		data: CreateUserData,
		metadata: LoginMetadata = {},
	): Promise<CreateUserDataResponse> {
		const { email, password, name } = data;
		const { ipAddress, userAgent } = metadata;

		// check if user already exists
		const existingUser = await prisma.user.findUnique({ where: { email } });
		if (existingUser) {
			throw new ConflictError(
				"User with this email already exists.",
				"USER_EXISTS",
			);
		}

		// hash password
		const hashedPassword = bcrypt.hashSync(password, 12); // Increased from 10 to 12 rounds

		// create user
		const user = await prisma.user.create({
			data: {
				email,
				password: hashedPassword,
				name,
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

		// Log registration
		await auditService.logRegister(user.id, email, ipAddress, userAgent);

		// Send verification email
		await this.sendVerificationEmail(
			user.id,
			email,
			name,
			ipAddress,
			userAgent,
		);

		// return created user without password
		return user;
	}

	/**
	 * login a user.
	 * @param data User login data (email, password)
	 * @param metadata Additional login metadata (IP address, user agent)
	 * @returns Logged in user data
	 */
	async login(
		data: LoginUserData,
		metadata: LoginMetadata = {},
	): Promise<LoginUserDataResponse> {
		const { email, password } = data;
		const { ipAddress, userAgent } = metadata;

		// check if user exists
		const user = await prisma.user.findUnique({ where: { email } });
		if (!user) {
			await auditService.logLoginFailed(
				email,
				"User not found",
				ipAddress,
				userAgent,
			);
			throw new UnauthorizedError(
				"Invalid email or password.",
				"INVALID_CREDENTIALS",
			);
		}

		// Check if account is locked
		if (user.lockoutUntil && user.lockoutUntil > new Date()) {
			const remainingMinutes = Math.ceil(
				(user.lockoutUntil.getTime() - Date.now()) / 60000,
			);
			await auditService.logLoginFailed(
				email,
				"Account locked",
				ipAddress,
				userAgent,
				user.id,
			);
			throw new ForbiddenError(
				`Account is locked. Try again in ${remainingMinutes} minutes.`,
				"ACCOUNT_LOCKED",
			);
		}

		// check password
		const isPasswordValid = bcrypt.compareSync(password, user.password);
		if (!isPasswordValid) {
			// Handle failed login attempt
			await this.handleFailedLogin(user, ipAddress, userAgent);
			throw new UnauthorizedError(
				"Invalid email or password.",
				"INVALID_CREDENTIALS",
			);
		}

		// check if user is active
		if (!user.isActive) {
			await auditService.logLoginFailed(
				email,
				"Account inactive",
				ipAddress,
				userAgent,
				user.id,
			);
			throw new UnauthorizedError(
				"User account is inactive.",
				"ACCOUNT_INACTIVE",
			);
		}

		// Reset failed login attempts on successful login
		if (user.failedLoginAttempts > 0) {
			await prisma.user.update({
				where: { id: user.id },
				data: {
					failedLoginAttempts: 0,
					lockoutUntil: null,
					lastFailedLogin: null,
				},
			});
		}

		// Generate device fingerprint
		const fingerprint = fingerprintService.generate({ userAgent, ipAddress });

		// create access and refresh tokens
		const payload = {
			userId: user.id,
			email: user.email,
			role: user.role,
		};

		const { accessToken, refreshToken } = tokenService.generateTokens(payload);

		// save refresh token to database with fingerprint
		await prisma.refreshToken.create({
			data: {
				userId: user.id,
				token: refreshToken,
				expiresAt: tokenService.getRefreshTokenExpiry(),
				ipAddress: ipAddress || null,
				userAgent: userAgent || null,
				fingerprint,
			},
		});

		// Log successful login
		await auditService.logLoginSuccess(user.id, ipAddress, userAgent);

		const {
			password: _,
			failedLoginAttempts: __,
			lockoutUntil: ___,
			lastFailedLogin: ____,
			emailVerificationToken: _____,
			emailVerificationExpires: ______,
			...userWithoutSensitiveData
		} = user;

		// return user data along with tokens
		return {
			user: userWithoutSensitiveData,
			accessToken,
			refreshToken,
		};
	}

	/**
	 * Handle failed login attempt - increment counter and potentially lock account
	 */
	private async handleFailedLogin(
		user: User,
		ipAddress?: string,
		userAgent?: string,
	): Promise<void> {
		const now = new Date();
		let failedAttempts = user.failedLoginAttempts;

		// Reset counter if last failure was outside the window
		if (user.lastFailedLogin) {
			const timeSinceLastFailure =
				(now.getTime() - user.lastFailedLogin.getTime()) / 60000;
			if (timeSinceLastFailure > LOCKOUT_CONFIG.resetWindowMinutes) {
				failedAttempts = 0;
			}
		}

		failedAttempts += 1;

		const updateData: {
			failedLoginAttempts: number;
			lastFailedLogin: Date;
			lockoutUntil?: Date;
		} = {
			failedLoginAttempts: failedAttempts,
			lastFailedLogin: now,
		};

		// Lock account if max attempts reached
		if (failedAttempts >= LOCKOUT_CONFIG.maxAttempts) {
			updateData.lockoutUntil = new Date(
				now.getTime() + LOCKOUT_CONFIG.lockoutDurationMinutes * 60000,
			);
			await auditService.logAccountLocked(
				user.id,
				"Max failed attempts reached",
				LOCKOUT_CONFIG.lockoutDurationMinutes,
				ipAddress,
				userAgent,
			);
			console.warn(
				`[SECURITY] Account locked for user=${user.id} after ${failedAttempts} failed attempts`,
			);
		}

		await prisma.user.update({
			where: { id: user.id },
			data: updateData,
		});

		await auditService.logLoginFailed(
			user.email,
			"Invalid password",
			ipAddress,
			userAgent,
			user.id,
		);
	}

	/**
	 * Refresh tokens for a user.
	 * @param refreshToken Refresh token string
	 * @return Object containing new access and refresh tokens
	 */
	async refreshTokens(refreshToken: string): Promise<RefreshTokensResponse> {
		// verify refresh token first to get user info for potential revocation
		const decoded = tokenService.verifyRefreshToken(refreshToken);
		if (!decoded) {
			throw new UnauthorizedError("Invalid refresh token.", "INVALID_TOKEN");
		}

		const isBlacklisted =
			await tokenBlacklistService.isBlacklisted(refreshToken);
		if (isBlacklisted) {
			console.warn(
				`[SECURITY] Refresh token reuse detected (blacklisted). user=${
					decoded.userId
				} token=${maskToken(refreshToken)}`,
			);
			// SECURITY: Revoke ALL tokens for this user - potential token theft
			await this.revokeAllUserTokens(decoded.userId);
			await auditService.logTokenReuseDetected(decoded.userId);
			throw new UnauthorizedError(
				"Session compromised. All sessions have been revoked. Please login again.",
				"TOKEN_REUSE_DETECTED",
			);
		}

		// check if refresh token exists in database and is not revoked
		const storedToken = await prisma.refreshToken.findUnique({
			where: { token: refreshToken },
		});
		if (!storedToken || storedToken.isRevoked) {
			await tokenBlacklistService.add(refreshToken);
			console.warn(
				`[SECURITY] Refresh token reuse detected (revoked/unknown). user=${
					decoded.userId
				} token=${maskToken(refreshToken)}`,
			);
			// SECURITY: Revoke ALL tokens for this user - potential token theft
			await this.revokeAllUserTokens(decoded.userId);
			await auditService.logTokenReuseDetected(decoded.userId);
			throw new UnauthorizedError(
				"Session compromised. All sessions have been revoked. Please login again.",
				"TOKEN_REUSE_DETECTED",
			);
		}

		// generate new tokens
		const payload = {
			userId: decoded.userId,
			email: decoded.email,
			role: decoded.role,
		};
		const { accessToken, refreshToken: newRefreshToken } =
			tokenService.generateTokens(payload);

		// revoke old refresh token with grace period (allows concurrent refresh)
		await prisma.refreshToken.update({
			where: { token: refreshToken },
			data: { isRevoked: true },
		});
		await tokenBlacklistService.addRefreshTokenWithGrace(refreshToken);

		// store new refresh token with fingerprint
		await prisma.refreshToken.create({
			data: {
				token: newRefreshToken,
				userId: decoded.userId,
				expiresAt: tokenService.getRefreshTokenExpiry(),
				ipAddress: storedToken.ipAddress || null,
				userAgent: storedToken.userAgent || null,
				fingerprint: storedToken.fingerprint || null,
			},
		});

		// Log token refresh
		await auditService.logTokenRefresh(
			decoded.userId,
			storedToken.ipAddress || undefined,
			storedToken.userAgent || undefined,
		);

		return { accessToken, refreshToken: newRefreshToken };
	}

	/**
	 * logout a user.
	 * @param refreshToken Refresh token string (optional)
	 * @param metadata Request metadata for audit logging
	 */
	async logout(
		refreshToken: string,
		metadata: LoginMetadata = {},
	): Promise<MessageResponse> {
		const { ipAddress, userAgent } = metadata;

		// find the refresh token in database
		const token = await prisma.refreshToken.findUnique({
			where: { token: refreshToken },
		});

		// if token not found, throw error
		if (!token) {
			throw new NotFoundError("Token is invalid", "TOKEN_NOT_FOUND");
		}

		// revoke the refresh token
		await prisma.refreshToken.update({
			where: { token: refreshToken },
			data: { isRevoked: true },
		});
		await tokenBlacklistService.add(refreshToken);

		// Log logout
		await auditService.logLogout(token.userId, ipAddress, userAgent);

		return { message: "Logged out successfully" };
	}

	/**
	 * Logout from all devices.
	 * remove all refresh tokens for the user.
	 * @param userId User ID
	 * @param metadata Request metadata for audit logging
	 * @return success message
	 */
	async revokeAllUserTokens(
		userId: string,
		metadata: LoginMetadata = {},
	): Promise<MessageResponse> {
		const { ipAddress, userAgent } = metadata;

		const activeTokens = await prisma.refreshToken.findMany({
			where: {
				userId,
				isRevoked: false,
			},
			select: {
				token: true,
			},
		});

		await prisma.refreshToken.updateMany({
			where: {
				userId,
				isRevoked: false,
			},
			data: {
				isRevoked: true,
			},
		});

		await Promise.all(
			activeTokens.map(async ({ token }) => {
				await tokenBlacklistService.add(token);
			}),
		);

		// Log all sessions revoked (only if called with metadata - i.e., user-initiated)
		if (ipAddress || userAgent) {
			await auditService.logAllSessionsRevoked(userId, ipAddress, userAgent);
		}

		return { message: "All user tokens have been revoked" };
	}

	/**
	 * Get user sessions.
	 * @param userId User ID
	 * @return List of active sessions
	 */
	async getUserSessions(userId: string): Promise<SessionResponse[]> {
		const sessions = await prisma.refreshToken.findMany({
			where: {
				userId,
				isRevoked: false,
				expiresAt: {
					gte: new Date(), // only active sessions
				},
			},
			select: {
				id: true,
				userAgent: true,
				ipAddress: true,
				createdAt: true,
				expiresAt: true,
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		return sessions;
	}

	/**
	 * Get revoke a specific session.
	 * @param userId User ID
	 * @param sessionId Session ID
	 * @param metadata Request metadata for audit logging
	 * @return success message
	 */
	async revokeSession(
		userId: string,
		sessionId: string,
		metadata: LoginMetadata = {},
	): Promise<MessageResponse> {
		const { ipAddress, userAgent } = metadata;

		const session = await prisma.refreshToken.findFirst({
			where: {
				id: sessionId,
				userId,
			},
		});
		if (!session) {
			throw new NotFoundError("Session does not exist", "SESSION_NOT_FOUND");
		}

		await prisma.refreshToken.update({
			where: { id: sessionId },
			data: { isRevoked: true },
		});
		await tokenBlacklistService.add(session.token);

		// Log session revoked
		await auditService.logSessionRevoked(
			userId,
			sessionId,
			ipAddress,
			userAgent,
		);

		return { message: "Session has been revoked" };
	}

	/**
	 * Send verification email to a user
	 * @param userId User ID
	 * @param email User email
	 * @param name User name (optional)
	 * @param ipAddress IP address
	 * @param userAgent User agent
	 */
	async sendVerificationEmail(
		userId: string,
		email: string,
		name?: string | null,
		ipAddress?: string,
		userAgent?: string,
	): Promise<void> {
		// Generate verification token and expiry
		const token = emailService.generateVerificationToken();
		const expires = emailService.getVerificationTokenExpiry();

		// Update user with verification token
		await prisma.user.update({
			where: { id: userId },
			data: {
				emailVerificationToken: token,
				emailVerificationExpires: expires,
			},
		});

		// Send verification email
		const emailSent = await emailService.sendVerificationEmail(
			email,
			token,
			name || undefined,
		);

		if (emailSent) {
			await auditService.log({
				userId,
				action: "EMAIL_VERIFICATION_SENT",
				details: { email },
				ipAddress,
				userAgent,
			});
		}
	}

	/**
	 * Verify user email with token
	 * @param token Verification token
	 * @param metadata Request metadata
	 * @returns Success message
	 */
	async verifyEmail(
		token: string,
		metadata: LoginMetadata = {},
	): Promise<MessageResponse> {
		const { ipAddress, userAgent } = metadata;

		// Find user with this verification token
		const user = await prisma.user.findUnique({
			where: { emailVerificationToken: token },
		});

		if (!user) {
			throw new BadRequestError(
				"Invalid or expired verification token.",
				"INVALID_VERIFICATION_TOKEN",
			);
		}

		// Check if token is expired
		if (
			user.emailVerificationExpires &&
			user.emailVerificationExpires < new Date()
		) {
			throw new BadRequestError(
				"Verification token has expired. Please request a new one.",
				"VERIFICATION_TOKEN_EXPIRED",
			);
		}

		// Check if already verified
		if (user.emailVerified) {
			return { message: "Email is already verified." };
		}

		// Update user - mark email as verified and clear token
		await prisma.user.update({
			where: { id: user.id },
			data: {
				emailVerified: true,
				emailVerificationToken: null,
				emailVerificationExpires: null,
			},
		});

		// Log verification
		await auditService.log({
			userId: user.id,
			action: "EMAIL_VERIFIED",
			details: { email: user.email },
			ipAddress,
			userAgent,
		});

		return { message: "Email verified successfully." };
	}

	/**
	 * Resend verification email
	 * @param email User email
	 * @param metadata Request metadata
	 * @returns Success message
	 */
	async resendVerificationEmail(
		email: string,
		metadata: LoginMetadata = {},
	): Promise<MessageResponse> {
		const { ipAddress, userAgent } = metadata;

		// Find user by email
		const user = await prisma.user.findUnique({
			where: { email },
		});

		// Don't reveal if user exists or not
		if (!user) {
			return {
				message:
					"If an account with that email exists, a verification email has been sent.",
			};
		}

		// Check if already verified
		if (user.emailVerified) {
			return {
				message:
					"If an account with that email exists, a verification email has been sent.",
			};
		}

		// Check if user is active
		if (!user.isActive) {
			return {
				message:
					"If an account with that email exists, a verification email has been sent.",
			};
		}

		// Send new verification email
		await this.sendVerificationEmail(
			user.id,
			user.email,
			user.name,
			ipAddress,
			userAgent,
		);

		return {
			message:
				"If an account with that email exists, a verification email has been sent.",
		};
	}
}

export const authService = new AuthService();
