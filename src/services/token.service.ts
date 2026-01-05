import { createHash, randomUUID } from "node:crypto";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { UnauthorizedError } from "../errors/AppError.js";

interface TokenPayload {
	userId: string;
	email: string;
	role: string;
}

interface DecodedToken extends JwtPayload {
	userId: string;
	email: string;
	role: string;
}

class TokenService {
	private readonly ACCESS_TOKEN_SECRET: string;
	private readonly REFRESH_TOKEN_SECRET: string;

	private readonly ACCESS_TOKEN_EXPIRY = "15m";
	private readonly REFRESH_TOKEN_EXPIRY = "7d";

	constructor() {
		this.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "";
		this.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "";

		if (!this.ACCESS_TOKEN_SECRET || !this.REFRESH_TOKEN_SECRET) {
			throw new Error("JWT secrets are not defined in environment variables");
		}
	}

	/**
	 * Generate ACCESS TOKEN
	 * Access token has a short lifespan (15 minutes)
	 * Used to authenticate API requests
	 * @param payload - User information (userId, email, role)
	 * @return JWT access token string
	 */
	generateAccessToken(payload: TokenPayload): string {
		const options: SignOptions = {
			expiresIn: this.ACCESS_TOKEN_EXPIRY,
			issuer: "auth-service",
			audience: "api-client",
			jwtid: randomUUID(), // ensures every token string stays unique
		};

		const token = jwt.sign(payload, this.ACCESS_TOKEN_SECRET, options);

		return token;
	}

	/**
	 * Generate REFRESH TOKEN
	 * Refresh token has a longer lifespan (7 days)
	 * Used to obtain new access tokens without re-authenticating
	 * @param payload - User information (userId, email, role)
	 * @return JWT refresh token string
	 */
	generateRefreshToken(payload: TokenPayload): string {
		const options: SignOptions = {
			expiresIn: this.REFRESH_TOKEN_EXPIRY,
			issuer: "auth-service",
			audience: "api-client",
			jwtid: randomUUID(), // prevents collisions during concurrent refreshes
		};
		const token = jwt.sign(payload, this.REFRESH_TOKEN_SECRET, options);

		return token;
	}

	/**
	 * Create both Access and Refresh tokens
	 * @param payload - User information (userId, email, role)
	 * @return Object containing both tokens
	 */
	generateTokens(payload: TokenPayload): {
		accessToken: string;
		refreshToken: string;
	} {
		const accessToken = this.generateAccessToken(payload);
		const refreshToken = this.generateRefreshToken(payload);

		return { accessToken, refreshToken };
	}

	/**
	 * Verify Access Token
	 * @param token - JWT access token string
	 * @return Decoded token payload
	 */
	verifyAccessToken(token: string): DecodedToken {
		try {
			const decoded = jwt.verify(
				token,
				this.ACCESS_TOKEN_SECRET,
			) as DecodedToken;

			return decoded;
		} catch (error) {
			if (error instanceof jwt.TokenExpiredError) {
				throw new UnauthorizedError(
					"Access token has expired.",
					"TOKEN_EXPIRED",
				);
			}
			if (error instanceof jwt.JsonWebTokenError) {
				throw new UnauthorizedError(
					"Access token is invalid.",
					"TOKEN_INVALID",
				);
			}
			throw new UnauthorizedError(
				"Verify access token failed.",
				"TOKEN_INVALID",
			);
		}
	}

	/**
	 * Verify Refresh Token
	 * @param token - JWT refresh token string
	 * @return Decoded token payload
	 */
	verifyRefreshToken(token: string): DecodedToken {
		try {
			const decoded = jwt.verify(
				token,
				this.REFRESH_TOKEN_SECRET,
			) as DecodedToken;

			return decoded;
		} catch (error) {
			if (error instanceof jwt.TokenExpiredError) {
				throw new UnauthorizedError(
					"Refresh token has expired.",
					"REFRESH_TOKEN_EXPIRED",
				);
			}
			if (error instanceof jwt.JsonWebTokenError) {
				throw new UnauthorizedError(
					"Refresh token is invalid.",
					"REFRESH_TOKEN_INVALID",
				);
			}
			throw new UnauthorizedError(
				"Verify refresh token failed.",
				"REFRESH_TOKEN_INVALID",
			);
		}
	}

	/**
	 * get access token expiry
	 * @returns access token expiry date (default 15 minutes)
	 */
	getAccessTokenExpiry(): Date {
		const expiryMs = 15 * 60 * 1000; // 15 minutes in milliseconds
		return new Date(Date.now() + expiryMs);
	}

	/**
	 * get refresh token expiry
	 * @returns refresh token expiry date (default 7 days)
	 */
	getRefreshTokenExpiry(): Date {
		const expiryMs = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
		return new Date(Date.now() + expiryMs);
	}

	/**
	 * Extract token from Authorization header
	 * @param authHeader Authorization header string
	 * @returns extracted token or null if not found
	 */
	extractTokenFromHeader(authHeader: string | undefined): string | null {
		if (!authHeader) return null;

		// Format: "Bearer <token>"
		const parts = authHeader.split(" ");

		if (parts.length !== 2 || parts[0] !== "Bearer") {
			return null;
		}

		return parts[1];
	}

	/**
	 * Hash a token for secure storage
	 * Used to store refresh tokens in database without exposing the raw value
	 * @param token - The raw token to hash
	 * @returns SHA-256 hash of the token
	 */
	hashToken(token: string): string {
		return createHash("sha256").update(token).digest("hex");
	}
}

export const tokenService = new TokenService();
export type { DecodedToken, TokenPayload };
