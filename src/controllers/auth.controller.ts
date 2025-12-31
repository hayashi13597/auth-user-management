import type { Request, Response } from "express";
import {
	accessTokenCookieOptions,
	clearAccessTokenCookieOptions,
	clearRefreshTokenCookieOptions,
	refreshTokenCookieOptions,
} from "../config/cookies.js";
import { BadRequestError, UnauthorizedError } from "../errors/index.js";
import { authService } from "../services/auth.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendCreated, sendSuccess } from "../utils/response.js";

class AuthController {
	/**
	 * Helper to extract metadata from request
	 */
	private getMetadata(req: Request) {
		return {
			userAgent: req.headers["user-agent"],
			ipAddress: req.ip || req.socket.remoteAddress,
		};
	}

	/**
	 * Create a new user account.
	 * POST /api/auth/register
	 * @param req Request user registration data (email, password, name)
	 * @return void
	 */
	register = asyncHandler(
		async (req: Request, res: Response): Promise<void> => {
			const metadata = this.getMetadata(req);
			const user = await authService.create(req.body, metadata);
			sendCreated(res, { user }, "User registered successfully");
		},
	);

	/**
	 * Login user
	 * POST /api/auth/login
	 * @param req Request user login data (email, password)
	 * @return void
	 */
	login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
		// get metadata from request
		const metadata = this.getMetadata(req);

		const result = await authService.login(req.body, metadata);

		// set HttpOnly cookies
		res.cookie("accessToken", result.accessToken, accessTokenCookieOptions);
		res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions);

		sendSuccess(
			res,
			{
				user: result.user,
			},
			"Login successful",
		);
	});

	/**
	 * refresh tokens
	 * POST /api/auth/refresh
	 * @param req Request containing refresh token
	 */
	refresh = asyncHandler(async (req: Request, res: Response): Promise<void> => {
		const refreshToken = req.cookies.refreshToken;

		if (!refreshToken) {
			throw new BadRequestError("Refresh token is missing");
		}

		const metadata = this.getMetadata(req);
		const result = await authService.refreshTokens(refreshToken, metadata);

		// set new HttpOnly cookies
		res.cookie("accessToken", result.accessToken, accessTokenCookieOptions);
		res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions);

		sendSuccess(res, undefined, "Tokens refreshed successfully");
	});

	/**
	 * logout
	 * POST /api/auth/logout
	 * @param req Request containing refresh token
	 * @return void
	 */
	logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
		const refreshToken = req.cookies.refreshToken;
		const accessToken = req.cookies.accessToken;

		if (!refreshToken) {
			throw new BadRequestError("Refresh token is missing");
		}

		if (!accessToken) {
			throw new BadRequestError("Access token is missing");
		}

		const metadata = this.getMetadata(req);
		const result = await authService.logout(
			refreshToken,
			accessToken,
			metadata,
		);

		// Clear cookies with proper options
		res.clearCookie("accessToken", clearAccessTokenCookieOptions);
		res.clearCookie("refreshToken", clearRefreshTokenCookieOptions);

		sendSuccess(res, undefined, result.message);
	});

	/**
	 * Get user sessions
	 * GET /api/auth/sessions
	 * @param req Request containing user ID
	 * @param res Response with list of user sessions
	 * @return void
	 */
	getSessions = asyncHandler(
		async (req: Request, res: Response): Promise<void> => {
			if (!req.user) {
				throw new UnauthorizedError("Unauthorized");
			}

			const { userId } = req.user;
			if (!userId) {
				throw new BadRequestError("User ID is missing");
			}

			const sessions = await authService.getUserSessions(userId);
			sendSuccess(res, { sessions });
		},
	);

	/**
	 * Revoke all user tokens
	 * POST /api/auth/revoke-all
	 * @param req Request containing user ID
	 * @param res Response with success message
	 * @return void
	 */
	revokeAllSessions = asyncHandler(
		async (req: Request, res: Response): Promise<void> => {
			if (!req.user) {
				throw new UnauthorizedError("Unauthorized");
			}

			const { userId } = req.user;
			if (!userId) {
				throw new BadRequestError("User ID is missing");
			}

			const accessToken = req.cookies.accessToken;

			if (!accessToken) {
				throw new BadRequestError("Access token is missing");
			}

			const metadata = this.getMetadata(req);
			await authService.revokeAllUserTokens(userId, accessToken, metadata);

			// Clear current cookies with proper options
			res.clearCookie("accessToken", clearAccessTokenCookieOptions);
			res.clearCookie("refreshToken", clearRefreshTokenCookieOptions);

			sendSuccess(res, undefined, "Logged out from all devices");
		},
	);

	/**
	 * Revoke a specific session
	 * POST /api/auth/sessions/:sessionId/revoke
	 * @param req Request containing user ID and session ID
	 * @param res Response with success message
	 * @return void
	 */
	revokeSession = asyncHandler(
		async (req: Request, res: Response): Promise<void> => {
			if (!req.user) {
				throw new UnauthorizedError("Unauthorized");
			}

			const { userId } = req.user;
			if (!userId) {
				throw new BadRequestError("User ID is missing");
			}

			const { sessionId } = req.params;
			if (!sessionId) {
				throw new BadRequestError("Session ID is missing");
			}

			const metadata = this.getMetadata(req);
			await authService.revokeSession(userId, sessionId, metadata);
			sendSuccess(res, undefined, "Session has been revoked");
		},
	);

	/**
	 * Verify user email
	 * GET /api/auth/verify-email?token=xxx
	 * @param req Request containing verification token
	 * @param res Response with success message
	 * @return void
	 */
	verifyEmail = asyncHandler(
		async (req: Request, res: Response): Promise<void> => {
			const { token } = req.query;

			if (!token || typeof token !== "string") {
				throw new BadRequestError("Verification token is required");
			}

			const metadata = this.getMetadata(req);
			const result = await authService.verifyEmail(token, metadata);
			sendSuccess(res, undefined, result.message);
		},
	);

	/**
	 * Resend verification email
	 * POST /api/auth/resend-verification
	 * @param req Request containing email
	 * @param res Response with success message
	 * @return void
	 */
	resendVerification = asyncHandler(
		async (req: Request, res: Response): Promise<void> => {
			const { email } = req.body;

			const metadata = this.getMetadata(req);
			const result = await authService.resendVerificationEmail(email, metadata);
			sendSuccess(res, undefined, result.message);
		},
	);
}

export const authController = new AuthController();
