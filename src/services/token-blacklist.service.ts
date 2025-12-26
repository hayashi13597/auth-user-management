import jwt, { type JwtPayload } from "jsonwebtoken";
import { redis } from "../config/redis";

class TokenBlacklistService {
	private readonly keyPrefix = "blacklist:refresh:";

	async add(token: string): Promise<void> {
		const ttlSeconds = this.getTtlFromToken(token);
		if (ttlSeconds <= 0) return;

		try {
			await redis.set(this.keyPrefix + token, "1", "EX", ttlSeconds);
		} catch (error) {
			console.error("Failed to add refresh token to blacklist:", error);
		}
	}

	async isBlacklisted(token: string): Promise<boolean> {
		try {
			const exists = await redis.exists(this.keyPrefix + token);
			return exists === 1;
		} catch (error) {
			console.error("Failed to check refresh token blacklist:", error);
			return false;
		}
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
