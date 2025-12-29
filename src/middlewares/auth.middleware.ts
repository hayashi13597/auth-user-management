import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database.js";
import { ForbiddenError, UnauthorizedError } from "../errors/index.js";
import { type DecodedToken, tokenService } from "../services/token.service.js";
import { tokenBlacklistService } from "../services/token-blacklist.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Extract token from request (cookies, headers, or query params)
 * @param req - Request object
 * @returns Token string or null
 */
const extractToken = (req: Request): string | null => {
	// 1. Check cookies
	if (req.cookies?.accessToken) {
		return req.cookies.accessToken;
	}

	// 2. Check Authorization header
	const authHeader = req.headers.authorization;
	if (authHeader) {
		const token = tokenService.extractTokenFromHeader(authHeader);
		if (token) return token;
	}

	// 3. Check query parameters
	if (req.query.token && typeof req.query.token === "string") {
		return req.query.token;
	}

	return null;
};

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export const authenticate = asyncHandler(
	async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
		// 1. Extract token from request
		const token = extractToken(req);

		if (!token) {
			throw new UnauthorizedError("Token was not provided", "TOKEN_MISSING");
		}

		// 2. Check if access token is blacklisted (immediate revocation check)
		const isBlacklisted =
			await tokenBlacklistService.isAccessTokenBlacklisted(token);
		if (isBlacklisted) {
			throw new UnauthorizedError("Token has been revoked", "TOKEN_REVOKED");
		}

		// 3. Verify token
		let decoded: DecodedToken;
		try {
			decoded = tokenService.verifyAccessToken(token);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Token is invalid";
			throw new UnauthorizedError(message, "TOKEN_INVALID");
		}

		// 4. Find user associated with the token
		const user = await prisma.user.findUnique({
			where: { id: decoded.userId },
			select: {
				id: true,
				email: true,
				role: true,
				isActive: true,
			},
		});

		if (!user) {
			throw new UnauthorizedError("User not found", "USER_NOT_FOUND");
		}

		if (!user.isActive) {
			throw new ForbiddenError(
				"User account has been deactivated",
				"USER_INACTIVE",
			);
		}

		// 4. Attach user info to request object
		req.user = {
			userId: user.id,
			email: user.email,
			role: user.role,
		};

		next();
	},
);

/**
 * Authorization middleware factory
 * Checks if user has required role(s)
 * @param roles - Role(s) required to access the route
 * @returns Middleware function
 */
export const authorize = (...roles: string[]) => {
	return asyncHandler(
		async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
			if (!req.user) {
				throw new UnauthorizedError("Authentication required", "AUTH_REQUIRED");
			}

			if (!roles.includes(req.user.role)) {
				throw new ForbiddenError(
					"You do not have permission to access this resource",
					"INSUFFICIENT_PERMISSIONS",
				);
			}

			next();
		},
	);
};
