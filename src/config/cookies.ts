import type { CookieOptions } from "express";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Access token cookie configuration
 * - Short-lived (15 minutes)
 * - Sent with all API requests
 */
export const accessTokenCookieOptions: CookieOptions = {
	httpOnly: true,
	secure: isProduction,
	sameSite: "strict",
	maxAge: 15 * 60 * 1000, // 15 minutes
	path: "/",
};

/**
 * Refresh token cookie configuration
 * - Long-lived (7 days)
 * - Only sent to auth endpoints (refresh, logout, revoke)
 */
export const refreshTokenCookieOptions: CookieOptions = {
	httpOnly: true,
	secure: isProduction,
	sameSite: "strict",
	maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
	path: "/api/auth", // Sent to all auth endpoints (refresh, logout, revoke-all, sessions)
};

/**
 * Options for clearing cookies
 */
export const clearAccessTokenCookieOptions: CookieOptions = {
	httpOnly: true,
	secure: isProduction,
	sameSite: "strict",
	path: "/",
};

export const clearRefreshTokenCookieOptions: CookieOptions = {
	httpOnly: true,
	secure: isProduction,
	sameSite: "strict",
	path: "/api/auth",
};
