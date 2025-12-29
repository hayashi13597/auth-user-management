import type { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../errors/index.js";
import { authService } from "../services/auth.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendCreated, sendSuccess } from "../utils/response.js";

class AuthController {
	/**
	 * Create a new user account.
	 * POST /api/auth/register
	 * @param req Request user registration data (email, password, name)
	 * @return void
	 */
	register = asyncHandler(
		async (req: Request, res: Response): Promise<void> => {
			const user = await authService.create(req.body);
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
		const metadata = {
			userAgent: req.headers["user-agent"],
			ipAddress: req.ip || req.socket.remoteAddress,
		};

		const result = await authService.login(req.body, metadata);

		// set HttpOnly cookies
		res.cookie("accessToken", result.accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production", // HTTPS only in production
			sameSite: "strict",
			maxAge: 15 * 60 * 1000, // 15 minutes
		});

		res.cookie("refreshToken", result.refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
		});

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

		const result = await authService.refreshTokens(refreshToken);

		// set new HttpOnly cookies
		res.cookie("accessToken", result.accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production", // HTTPS only in production
			sameSite: "strict",
			maxAge: 15 * 60 * 1000, // 15 minutes
		});

		res.cookie("refreshToken", result.refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
		});

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

		if (!refreshToken) {
			throw new BadRequestError("Refresh token is missing");
		}

		const result = await authService.logout(refreshToken);

		// Clear cookies
		res.clearCookie("accessToken");
		res.clearCookie("refreshToken");

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

			await authService.revokeAllUserTokens(userId);

			// Clear current cookies
			res.clearCookie("accessToken");
			res.clearCookie("refreshToken");

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

			await authService.revokeSession(userId, sessionId);
			sendSuccess(res, undefined, "Session has been revoked");
		},
	);
}

export const authController = new AuthController();
