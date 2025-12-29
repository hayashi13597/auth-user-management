import jwt, { type JwtPayload } from "jsonwebtoken";
import { redis } from "../config/redis.js";

class TokenBlacklistService {
	private readonly refreshKeyPrefix = "blacklist:refresh:";
	private readonly accessKeyPrefix = "blacklist:access:";
	private readonly graceKeyPrefix = "grace:refresh:";

	// Grace period in seconds for concurrent refresh handling
	private readonly GRACE_PERIOD_SECONDS = 10;

	/**
	 * Add refresh token to blacklist
	 */
	async addRefreshToken(token: string): Promise<void> {
		const ttlSeconds = this.getTtlFromToken(token);
		if (ttlSeconds <= 0) return;

		try {
			await redis.set(this.refreshKeyPrefix + token, "1", "EX", ttlSeconds);
		} catch (error) {
			console.error("Failed to add refresh token to blacklist:", error);
		}
	}

	/**
	 * Add refresh token with grace period (for concurrent refresh handling)
	 * Token is blacklisted but marked as "grace" for a short period
	 */
	async addRefreshTokenWithGrace(token: string): Promise<void> {
		const ttlSeconds = this.getTtlFromToken(token);
		if (ttlSeconds <= 0) return;

		try {
			// Add to blacklist
			await redis.set(this.refreshKeyPrefix + token, "1", "EX", ttlSeconds);
			// Add grace marker (expires quickly)
			await redis.set(
				this.graceKeyPrefix + token,
				"1",
				"EX",
				this.GRACE_PERIOD_SECONDS,
			);
		} catch (error) {
			console.error("Failed to add refresh token with grace:", error);
		}
	}

	/**
	 * Check if refresh token is blacklisted
	 * Returns false if token is in grace period (allows concurrent refresh)
	 */
	async isRefreshTokenBlacklisted(token: string): Promise<boolean> {
		try {
			const [isBlacklisted, isInGrace] = await Promise.all([
				redis.exists(this.refreshKeyPrefix + token),
				redis.exists(this.graceKeyPrefix + token),
			]);

			// If in grace period, don't consider it blacklisted yet
			if (isInGrace === 1) {
				return false;
			}

			return isBlacklisted === 1;
		} catch (error) {
			console.error("Failed to check refresh token blacklist:", error);
			return false;
		}
	}

	/**
	 * Add access token to blacklist (for immediate revocation)
	 */
	async addAccessToken(token: string): Promise<void> {
		const ttlSeconds = this.getTtlFromToken(token);
		if (ttlSeconds <= 0) return;

		try {
			await redis.set(this.accessKeyPrefix + token, "1", "EX", ttlSeconds);
		} catch (error) {
			console.error("Failed to add access token to blacklist:", error);
		}
	}

	/**
	 * Check if access token is blacklisted
	 */
	async isAccessTokenBlacklisted(token: string): Promise<boolean> {
		try {
			const exists = await redis.exists(this.accessKeyPrefix + token);
			return exists === 1;
		} catch (error) {
			console.error("Failed to check access token blacklist:", error);
			return false;
		}
	}

	/**
	 * Blacklist all tokens for a user (both access and refresh)
	 * Used when revoking all sessions
	 */
	async addUserAccessToken(
		userId: string,
		token: string,
		ttlSeconds: number,
	): Promise<void> {
		if (ttlSeconds <= 0) return;

		try {
			await redis.set(this.accessKeyPrefix + token, userId, "EX", ttlSeconds);
		} catch (error) {
			console.error("Failed to add user access token to blacklist:", error);
		}
	}

	// Legacy method names for backward compatibility
	async add(token: string): Promise<void> {
		return this.addRefreshToken(token);
	}

	async isBlacklisted(token: string): Promise<boolean> {
		return this.isRefreshTokenBlacklisted(token);
	}

	private getTtlFromToken(token: string): number {
		const decoded = jwt.decode(token) as JwtPayload | null;
		const exp = decoded?.exp;
		if (!exp) return 0;

		const ttlSeconds = exp - Math.floor(Date.now() / 1000);
		return ttlSeconds > 0 ? ttlSeconds : 0;
	}
}

export const tokenBlacklistService = new TokenBlacklistService();
